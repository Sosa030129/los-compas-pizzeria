// POST /api/orders - crea nuevo pedido con recálculo server-side de totales
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/server-auth';
import { notifyNewOrder } from '@/lib/whatsapp-cloud';
import { applyPromotions } from '@/lib/los-compas';
import { randomBytes } from 'crypto';

function generateOrderCode(): string {
  // 3 bytes = 16M combinaciones (bug #16: era 2 bytes = 65k)
  return `LC-${randomBytes(3).toString('hex').toUpperCase().substring(0, 6)}`;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 });
    }

    if (session.type === 'employee') {
      const orders = await db.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 200,
      });
      return NextResponse.json({ ok: true, orders });
    }

    if (session.type === 'customer') {
      const orders = await db.order.findMany({
        where: { customerId: session.userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      return NextResponse.json({ ok: true, orders });
    }

    return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 });
  } catch (e: any) {
    console.error('Error listando pedidos:', e);
    return NextResponse.json({ ok: false, error: 'Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      customerName, customerPhone, customerAddress, reference,
      items, delivery, discount, surcharge, total,
      paymentMethod, timeSlot, deliveryMode, scheduledTime, notes,
      // customerId del body se IGNORA (bug #6: no confiar en el cliente)
    } = body;

    // Validaciones básicas
    if (!customerName?.trim()) {
      return NextResponse.json({ ok: false, error: 'Nombre es obligatorio' }, { status: 400 });
    }
    if (!customerPhone?.trim()) {
      return NextResponse.json({ ok: false, error: 'Teléfono es obligatorio' }, { status: 400 });
    }
    if (deliveryMode === 'domicilio' && !customerAddress?.trim()) {
      return NextResponse.json({ ok: false, error: 'Dirección es obligatoria para domicilio' }, { status: 400 });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ ok: false, error: 'El carrito está vacío' }, { status: 400 });
    }

    // ===== RECÁLCULO SERVER-SIDE DE TOTALES (bug #5, #12, #21) =====
    // No confiar en los totales enviados por el cliente
    let serverSubtotal = 0;
    let serverExtras = 0;
    // Validar también que los items correspondan a productos existentes y disponibles
    const validatedItems: any[] = [];

    // FASE I: Cargar tamaños, ingredientes y ofertas PUBLISHED para recalcular server-side
    const [allSizes, allIngredients, allPublishedOffers] = await Promise.all([
      db.sizeOption.findMany(),
      db.ingredient.findMany(),
      db.offer.findMany({ where: { status: 'PUBLISHED' } }),
    ]);
    // Mapa de sizeId → { basePrice, borderDelta (default 0 si no está en BD) }
    const BORDER_DELTAS_SERVER: Record<string, number> = {
      'pequena_20': 150, 'mediana_25': 150, 'grande_30': 150, 'rect_30x20': 150,
      'rect_35x40': 300, 'familiar_42x30': 500, 'extra_46x36': 550,
    };
    const SMALL_SIZES = ['pequena_20', 'mediana_25', 'grande_30', 'rect_30x20'];
    const FAMILY_SIZES = ['rect_35x40', 'familiar_42x30', 'extra_46x36'];
    const getIngredientPriceServer = (priceBySize: any, size: string): number => {
      try {
        const pbs = typeof priceBySize === 'string' ? JSON.parse(priceBySize || '{}') : (priceBySize || {});
        if (pbs && typeof pbs === 'object') {
          const direct = pbs[size];
          if (typeof direct === 'number' && direct > 0) return direct;
          const isFamily = FAMILY_SIZES.includes(size);
          const sameGroup = isFamily ? FAMILY_SIZES : SMALL_SIZES;
          for (const s of sameGroup) {
            const p = pbs[s];
            if (typeof p === 'number' && p > 0) return p;
          }
          const anyPrice = Object.values(pbs).find((v) => typeof v === 'number' && (v as number) > 0);
          if (typeof anyPrice === 'number') return anyPrice;
        }
      } catch {}
      return 0;
    };

    for (const item of items) {
      // Si el item tiene productId, validar contra BD (disponibilidad + precio)
      let serverUnitPrice = Math.max(0, Number(item.unitPrice) || 0);
      let serverExtrasPerUnit = 0; // FASE I: recalcular desde BD
      const qty = Math.max(1, Math.floor(Number(item.qty) || 1));

      if (item.productId) {
        const product = await db.product.findUnique({ where: { id: String(item.productId) } });
        if (!product) {
          return NextResponse.json(
            { ok: false, error: `Producto no encontrado: ${item.productId}` },
            { status: 400 },
          );
        }
        if (!product.available) {
          return NextResponse.json(
            { ok: false, error: `Producto agotado: ${product.name}` },
            { status: 400 },
          );
        }

        if (!product.isPizza) {
          serverUnitPrice = product.price;
        } else {
          // FASE I: Para pizzas, recalcular precio base + borderDelta desde BD
          const sizeId = String(item.size || product.defaultSize || '');
          const size = allSizes.find((s) => s.sizeId === sizeId);
          if (!size) {
            return NextResponse.json(
              { ok: false, error: `Tamaño inválido: ${sizeId}` },
              { status: 400 },
            );
          }
          const borderDelta = BORDER_DELTAS_SERVER[sizeId] ?? 0;
          const hasBorder = Boolean(item.borderCheese);
          serverUnitPrice = size.basePrice + (hasBorder ? borderDelta : 0);

          // FASE I: recalcular extrasTotal server-side
          // defaultIngredients del producto (1 porción gratis)
          let defaultIds: Set<string>;
          try {
            defaultIds = new Set(JSON.parse(product.defaultIngredients || '[]'));
          } catch { defaultIds = new Set(); }

          // FASE I: Si el item proviene de una oferta, validar includedIngredients obligatorios
          if (item.notes && item.notes.startsWith('Oferta:')) {
            // Buscar la oferta por nombre en notes (formato: "Oferta: <name> (-X%)")
            const offerMatch = allPublishedOffers.find((o) => {
              const includedIngs: string[] = (() => {
                try { return JSON.parse(o.includedIngredients || '[]'); } catch { return []; }
              })();
              // Validar que TODOS los includedIngredients estén en item.ingredients
              const itemIngIds = (item.ingredients || []).map((ci: any) => ci.ingredientId);
              return includedIngs.every((id) => itemIngIds.includes(id));
            });
            // Aunque no encontremos la oferta exacta, validamos que los defaults (que vinieron
            // de la oferta como includedIngredients pre-cargados) NO puedan ser eliminados por el cliente.
            // El cliente NO puede enviar un item.ingredients sin los defaults del producto → trampa.
            // Re-agregar defaults faltantes:
            const itemIngIds = (item.ingredients || []).map((ci: any) => ci.ingredientId);
            const missing = Array.from(defaultIds).filter((id) => !itemIngIds.includes(id));
            if (missing.length > 0) {
              // El cliente intentó quitar ingredientes incluidos → re-agregarlos server-side
              const patchedIngs = [...(item.ingredients || [])];
              for (const missingId of missing) {
                patchedIngs.push({ ingredientId: missingId, qty: 'normal' });
              }
              item.ingredients = patchedIngs;
            }
          }

          // Calcular extras reales
          const itemIngs = Array.isArray(item.ingredients) ? item.ingredients : [];
          serverExtrasPerUnit = itemIngs.reduce((sum: number, ci: any) => {
            const ing = allIngredients.find((i) => i.id === ci.ingredientId);
            if (!ing) return sum;
            const price = getIngredientPriceServer(ing.priceBySize, sizeId);
            const mult = ci.qty === 'doble' ? 2 : ci.qty === 'triple' ? 3 : 1;
            const freePortions = defaultIds.has(ci.ingredientId) ? 1 : 0;
            return sum + price * Math.max(0, mult - freePortions);
          }, 0);
        }
      }

      serverSubtotal += serverUnitPrice * qty;
      serverExtras += serverExtrasPerUnit * qty;
      validatedItems.push({ ...item, unitPrice: serverUnitPrice, extrasTotal: serverExtrasPerUnit, qty });
    }

    // ===== REVALIDACIÓN SERVER-SIDE DE PROMOCIONES (CRÍTICO #4) =====
    // Recalcular el descuento real aplicando las promociones vigentes desde BD.
    // Nunca confiar en el `discount` enviado por el cliente.
    const [allProducts, allPromotions] = await Promise.all([
      db.product.findMany(),
      db.promotion.findMany(),
    ]);

    // Mapear productos de BD a tipo Product esperado por applyPromotions
    const productsForPromo = allProducts.map((p: any) => ({
      id: p.id,
      name: p.name,
      description: p.description || '',
      category: p.categoryId,
      emoji: p.emoji || '🍕',
      price: p.price,
      available: p.available,
      isPizza: p.isPizza || false,
      defaultSize: p.defaultSize || undefined,
      defaultIngredients: (() => {
        try { return JSON.parse(p.defaultIngredients || '[]'); } catch { return []; }
      })(),
      isCombo: p.isCombo || false,
      comboItems: (() => {
        try { return JSON.parse(p.comboItems || '[]'); } catch { return []; }
      })(),
    }));

    // Mapear promociones de BD al tipo Promotion
    const promotionsForPromo = allPromotions.map((p: any) => ({
      id: p.id,
      name: p.name,
      description: p.description || '',
      emoji: p.emoji || '🎉',
      type: p.type,
      value: p.value,
      freeProductId: p.freeProductId || undefined,
      bundleBuyQty: p.bundleBuyQty || undefined,
      bundleGetQty: p.bundleGetQty || undefined,
      validFrom: p.validFrom ? Number(p.validFrom) : 0,
      validTo: p.validTo ? Number(p.validTo) : 0,
      active: p.active,
      code: p.code || undefined,
      appliesTo: p.appliesTo,
      categoryId: p.categoryId || undefined,
      productId: p.productId || undefined,
    }));

    // Construir cart con la estructura que applyPromotions espera
    const cartForPromo = validatedItems.map((item) => ({
      id: item.id || `item_${Math.random().toString(36).slice(2)}`,
      productId: item.productId,
      name: item.name || '',
      emoji: item.emoji || '🍕',
      unitPrice: item.unitPrice,
      qty: item.qty,
      size: item.size,
      extrasTotal: item.extrasTotal,
      ingredients: item.ingredients,
      isCombo: item.isCombo,
      notes: item.notes,
    }));

    // El código promocional puede venir del body o estar vacío
    const promoCode = typeof body.appliedPromoCode === 'string' ? body.appliedPromoCode : null;
    const promoResult = applyPromotions(
      cartForPromo,
      promotionsForPromo,
      productsForPromo,
      promoCode,
    );
    const serverDiscount = promoResult.totalDiscount;

    // Recargo por transferencia: calcular server-side
    const base = serverSubtotal + serverExtras;
    const config = await db.businessConfig.findUnique({ where: { id: '1' } });
    const serverSurcharge = paymentMethod === 'transferencia' && config
      ? Math.round((base - serverDiscount) * config.transferSurcharge)
      : 0;

    // Delivery: respetar lo que el cliente envía si es 0 (combo con envío gratis),
    // si no, null = pendiente de confirmar por admin
    const serverDelivery = deliveryMode === 'recogida'
      ? 0
      : (delivery === 0 ? 0 : null);

    const serverTotal = Math.max(0, base - serverDiscount + serverSurcharge);

    // Generar código único
    let code = generateOrderCode();
    for (let i = 0; i < 20; i++) {
      const existing = await db.order.findUnique({ where: { code } }).catch(() => null);
      if (!existing) break;
      code = generateOrderCode();
    }

    // customerId: solo de la sesión, NUNCA del body (bug #6)
    let resolvedCustomerId: string | null = null;
    const session = await getSession();
    if (session?.type === 'customer') {
      resolvedCustomerId = session.userId;
    }

    // Agregar items gratis de promociones free_product al carrito antes de guardar
    const finalItems = [...validatedItems];
    if (promoResult.freeItems.length > 0) {
      for (const freeItem of promoResult.freeItems) {
        finalItems.push({
          ...freeItem,
          qty: freeItem.qty || 1,
        });
      }
    }

    const order = await db.order.create({
      data: {
        code,
        customerId: resolvedCustomerId,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerAddress: deliveryMode === 'domicilio'
          ? customerAddress.trim()
          : 'Recogida en tienda',
        reference: reference?.trim() || null,
        items: JSON.stringify(finalItems.map(({ id, ...rest }: any) => rest)), // bug #43: quitar id interno
        subtotal: serverSubtotal,
        extras: serverExtras,
        delivery: serverDelivery,
        discount: serverDiscount,
        surcharge: serverSurcharge,
        total: serverTotal,
        paymentMethod,
        timeSlot,
        deliveryMode,
        scheduledTime,
        notes: notes?.trim() || null,
        state: 'recibido',
      },
    });

    await db.activityLog.create({
      data: {
        userName: customerName.trim(),
        action: 'Nuevo pedido',
        detail: `Código ${code} - Total ${serverTotal} CUP`,
      },
    });

    // WhatsApp: fire-and-forget (bug #19: no bloquear la respuesta)
    notifyNewOrder({
      id: order.id,
      code: order.code,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      total: order.total,
      scheduledTime: order.scheduledTime,
    }).catch(() => {});

    return NextResponse.json({ ok: true, order });
  } catch (e: any) {
    console.error('Error creando pedido:', e);
    return NextResponse.json({ ok: false, error: 'Error al crear pedido' }, { status: 500 });
  }
}
