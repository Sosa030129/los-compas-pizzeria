// POST /api/orders - crea nuevo pedido con recálculo server-side de totales
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/server-auth';
import { notifyNewOrder } from '@/lib/whatsapp-cloud';
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
    for (const item of items) {
      const unitPrice = Math.max(0, Number(item.unitPrice) || 0);
      const extrasTotal = Math.max(0, Number(item.extrasTotal) || 0);
      const qty = Math.max(1, Math.floor(Number(item.qty) || 1));
      serverSubtotal += unitPrice * qty;
      serverExtras += extrasTotal * qty;
    }

    // Descuento: el servidor NO revalida promociones aquí (será una mejora futura).
    // Por seguridad, limitamos el descuento al máximo posible (base + extras).
    const base = serverSubtotal + serverExtras;
    const safeDiscount = Math.min(Math.max(0, Number(discount) || 0), base);

    // Recargo por transferencia: calcular server-side
    const config = await db.businessConfig.findUnique({ where: { id: '1' } });
    const serverSurcharge = paymentMethod === 'transferencia' && config
      ? Math.round((base - safeDiscount) * config.transferSurcharge)
      : 0;

    // Delivery: respetar lo que el cliente envía si es 0 (combo con envío gratis),
    // si no, null = pendiente de confirmar por admin
    const serverDelivery = deliveryMode === 'recogida'
      ? 0
      : (delivery === 0 ? 0 : null);

    const serverTotal = Math.max(0, base - safeDiscount + serverSurcharge);

    // Generar código único
    let code = generateOrderCode();
    for (let i = 0; i < 20; i++) {
      const existing = await db.order.findUnique({ where: { code } }).catch(() => null);
      if (!existing) break;
      code = generateOrderCode();
    }

    // customerId: solo de la sesión, NUNCA del body (bug #6)
    let resolvedCustomerId = null;
    const session = await getSession();
    if (session?.type === 'customer') {
      resolvedCustomerId = session.userId;
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
        items: JSON.stringify(items.map(({ id, ...rest }: any) => rest)), // bug #43: quitar id interno
        subtotal: serverSubtotal,
        extras: serverExtras,
        delivery: serverDelivery,
        discount: safeDiscount,
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
