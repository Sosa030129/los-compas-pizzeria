// Utilidades LOS COMPAS PIZZERÍA

// Bug #45: Helper compartido para cálculo de totales del carrito (DRY)
export function calculateCartTotals(cart: any[]) {
  let subtotal = 0;
  let extras = 0;
  for (const item of cart) {
    subtotal += (item.unitPrice || 0) * (item.qty || 1);
    extras += (item.extrasTotal || 0) * (item.qty || 1);
  }
  const delivery = cart.length > 0 && cart.some((i) => !i.isCombo) ? null : 0;
  const base = subtotal + extras;
  const total = delivery === null ? base : base + delivery;
  return { subtotal, extras, delivery, total };
}

export function formatCUP(amount: number): string {
  const value = Math.round(amount);
  return `${value.toLocaleString('es-CU')} CUP`;
}

export function uid(prefix = ''): string {
  const id =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return prefix ? `${prefix}_${id}` : id;
}

export function shortCode(): string {
  const n = Math.floor(Math.random() * 9000 + 1000);
  return `LC-${n}`;
}

export function ingredientQtyMultiplier(qty: 'normal' | 'doble' | 'triple'): number {
  if (qty === 'doble') return 2;
  if (qty === 'triple') return 3;
  return 1;
}

export function ingredientQtyLabel(qty: 'normal' | 'doble' | 'triple'): string {
  if (qty === 'doble') return 'Doble';
  if (qty === 'triple') return 'Triple';
  return 'Normal';
}

export function getStateInfo(state: string) {
  const map: Record<string, { label: string; emoji: string; color: string }> = {
    recibido: { label: 'Recibido', emoji: '📋', color: '#8a7a5a' },
    confirmado: { label: 'Confirmado', emoji: '✅', color: '#c4a060' },
    preparando: { label: 'Preparando', emoji: '👨‍🍳', color: '#d49050' },
    listo: { label: 'Listo', emoji: '📦', color: '#7ab860' },
    camino: { label: 'En camino', emoji: '🛵', color: '#5a9ab8' },
    entregado: { label: 'Entregado', emoji: '🎉', color: '#7a1f2b' },
    cancelado: { label: 'Cancelado', emoji: '❌', color: '#7a1f1f' },
  };
  return map[state] || map.recibido;
}

export function getOrderProgress(state: string): number {
  const order = ['recibido', 'confirmado', 'preparando', 'listo', 'camino', 'entregado'];
  const idx = order.indexOf(state);
  if (idx < 0) return 0;
  return ((idx + 1) / order.length) * 100;
}

export function formatDateTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString('es-CU', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

export function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('es-CU', { hour: '2-digit', minute: '2-digit' });
}

// Verifica si la hora actual está dentro del horario de pedidos
export function checkOrderTime(slot: 'manana' | 'tarde', config: {
  morningStart: string; morningEnd: string;
  afternoonStart: string; afternoonEnd: string;
}): boolean {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const parse = (s: string) => {
    const [h, m] = s.split(':').map(Number);
    return h * 60 + m;
  };
  if (slot === 'manana') {
    return minutes >= parse(config.morningStart) && minutes <= parse(config.morningEnd);
  }
  return minutes >= parse(config.afternoonStart) && minutes <= parse(config.afternoonEnd);
}

export function isAnyOrderSlotOpen(config: {
  morningStart: string; morningEnd: string;
  afternoonStart: string; afternoonEnd: string;
}): boolean {
  return checkOrderTime('manana', config) || checkOrderTime('tarde', config);
}

export function nextAvailableSlotLabel(config: {
  morningStart: string; morningEnd: string;
  afternoonStart: string; afternoonEnd: string;
  morningDelivery: string; afternoonDelivery: string;
}): { slot: 'manana' | 'tarde'; delivery: string } {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const parse = (s: string) => {
    const [h, m] = s.split(':').map(Number);
    return h * 60 + m;
  };
  if (minutes < parse(config.morningStart)) {
    return { slot: 'manana', delivery: config.morningDelivery };
  }
  if (minutes < parse(config.afternoonStart)) {
    return { slot: 'tarde', delivery: config.afternoonDelivery };
  }
  // Después del horario de la tarde → próximo turno mañana
  return { slot: 'manana', delivery: config.morningDelivery };
}

// Genera un link de WhatsApp con mensaje
export function whatsappLink(phone: string, message: string): string {
  const clean = phone.replace(/[^\d]/g, '');
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}

// ===== Cálculo de promociones =====

import type { CartItem, Promotion, Product, Ingredient, PizzaSize } from './types';

// FASE 3 fix: Tamaños "pequeños" (usan precio pequeño) y "familiares" (precio familiar).
// Definidos según spec del negocio.
export const SMALL_SIZES: PizzaSize[] = ['pequena_20', 'mediana_25', 'grande_30', 'rect_30x20'];
export const FAMILY_SIZES: PizzaSize[] = ['rect_35x40', 'familiar_42x30', 'extra_46x36'];

// FASE 3 fix: Helper para obtener el precio de un ingrediente para un tamaño dado.
// Tiene múltiples fallbacks para ser robusto frente a datos legacy/null en BD.
export function getIngredientPrice(
  ing: Ingredient,
  size: PizzaSize | undefined | null,
): number {
  if (!size) return 0;

  const pbs = ing.priceBySize;
  // 1. Caso normal: priceBySize[size] existe y es > 0
  if (pbs && typeof pbs === 'object') {
    const direct = (pbs as any)[size];
    if (typeof direct === 'number' && direct > 0) return direct;
  }

  // 2. Derivar desde cualquier otro tamaño del MISMO grupo (small vs family)
  const isFamily = FAMILY_SIZES.includes(size);
  const sameGroup = isFamily ? FAMILY_SIZES : SMALL_SIZES;
  if (pbs && typeof pbs === 'object') {
    for (const s of sameGroup) {
      const p = (pbs as any)[s];
      if (typeof p === 'number' && p > 0) return p;
    }
  }

  // 3. Último recurso: cualquier precio > 0 en priceBySize
  if (pbs && typeof pbs === 'object') {
    const anyPrice = Object.values(pbs).find((v) => typeof v === 'number' && v > 0);
    if (typeof anyPrice === 'number') return anyPrice;
  }

  return 0;
}

// Valida teléfono (formatos Cuba + internacional)
// Acepta: +53 5 1234567, +5351234567, 55123456, +53 55000000, etc.
export function isValidPhone(phone: string): boolean {
  const clean = phone.replace(/[\s-]/g, '');
  // Con código de país (+XX) y al menos 6 dígitos
  if (/^\+\d{1,3}\d{6,12}$/.test(clean)) return true;
  // Sin código de país, al menos 6 dígitos
  if (/^\d{6,12}$/.test(clean)) return true;
  return false;
}

// Verifica si una promoción está vigente (fecha activa)
export function isPromotionActive(p: Promotion, now = Date.now()): boolean {
  return p.active && p.validFrom <= now && p.validTo >= now;
}

// Filtra solo promociones activas vigentes
export function activePromotions(promotions: Promotion[], now = Date.now()): Promotion[] {
  return promotions.filter((p) => isPromotionActive(p, now));
}

// Valida un código promocional: devuelve la promoción si aplica
export function findPromotionByCode(promotions: Promotion[], code: string, now = Date.now()): Promotion | null {
  if (!code) return null;
  const upper = code.trim().toUpperCase();
  return (
    activePromotions(promotions, now).find((p) => p.code?.toUpperCase() === upper) || null
  );
}

// Verifica si una promoción aplica a un item (según appliesTo)
export function promotionAppliesToItem(p: Promotion, item: CartItem, products: Product[]): boolean {
  // Bug #24: Excluir combos de promociones bundle (doble descuento no intencionado)
  if (item.isCombo && p.type === 'bundle') return false;

  switch (p.appliesTo) {
    case 'all':
      return true;
    case 'category':
      if (!p.categoryId) return false;
      const prod = products.find((pr) => pr.id === item.productId);
      return prod?.category === p.categoryId;
    case 'product':
      return item.productId === p.productId;
    default:
      return false;
  }
}

export interface PromotionResult {
  promotion: Promotion;
  discount: number;            // monto descontado en CUP
  description: string;         // texto amigable: "-15% = -X CUP"
  freeItem?: CartItem;         // si la promo agrega un producto gratis
}

// Aplica promociones al carrito. Devuelve todas las que aplicaron.
// - bundle: por cada `bundleBuyQty` items de la categoría, regala `bundleGetQty` (descuenta el unitPrice)
// - percent: descuento porcentual sobre subtotal+extras de los items aplicables
// - fixed: descuento fijo si hay item aplicable
// - free_product: si supera `value`, agrega un producto gratis
export function applyPromotions(
  cart: CartItem[],
  promotions: Promotion[],
  products: Product[],
  appliedCode: string | null,
  now = Date.now(),
): { results: PromotionResult[]; totalDiscount: number; freeItems: CartItem[] } {
  const results: PromotionResult[] = [];
  let totalDiscount = 0;
  const freeItems: CartItem[] = [];

  const subtotal = cart.reduce((s, i) => s + i.unitPrice * i.qty, 0);
  const extras = cart.reduce((s, i) => s + i.extrasTotal * i.qty, 0);
  const grandTotal = subtotal + extras;

  // 1. Promociones automáticas (sin código) que aplican al carrito
  const automatic = activePromotions(promotions, now).filter((p) => !p.code);

  for (const p of automatic) {
    const r = computeSinglePromotion(p, cart, products, grandTotal, now);
    if (r && r.discount > 0) {
      results.push(r);
      totalDiscount += r.discount;
    } else if (r && r.freeItem) {
      results.push(r);
      freeItems.push(r.freeItem);
    }
  }

  // 2. Promoción por código (solo una a la vez)
  if (appliedCode) {
    const p = findPromotionByCode(promotions, appliedCode, now);
    if (p) {
      const r = computeSinglePromotion(p, cart, products, grandTotal, now);
      if (r && (r.discount > 0 || r.freeItem)) {
        results.push(r);
        if (r.discount > 0) totalDiscount += r.discount;
        if (r.freeItem) freeItems.push(r.freeItem);
      }
    }
  }

  return { results, totalDiscount, freeItems };
}

function computeSinglePromotion(
  p: Promotion,
  cart: CartItem[],
  products: Product[],
  grandTotal: number,
  _now: number,
): PromotionResult | null {
  switch (p.type) {
    case 'percent': {
      // Solo aplica a items que correspondan (all/category/product)
      const applicable = cart.filter((i) => promotionAppliesToItem(p, i, products));
      if (applicable.length === 0) return null;
      const subtotal = applicable.reduce(
        (s, i) => s + (i.unitPrice + i.extrasTotal) * i.qty,
        0,
      );
      const discount = Math.round((subtotal * p.value) / 100);
      return {
        promotion: p,
        discount,
        description: `-${p.value}% (${p.name}): -${discount.toLocaleString('es-CU')} CUP`,
      };
    }
    case 'fixed': {
      // Solo si hay items aplicables
      const applicable = cart.filter((i) => promotionAppliesToItem(p, i, products));
      if (applicable.length === 0) return null;
      const discount = p.value;
      return {
        promotion: p,
        discount,
        description: `-${discount.toLocaleString('es-CU')} CUP (${p.name})`,
      };
    }
    case 'free_product': {
      // Si el total supera el umbral, regalar el producto
      if (grandTotal < p.value) return null;
      if (!p.freeProductId) return null;
      const prod = products.find((pr) => pr.id === p.freeProductId);
      if (!prod) return null;
      const freeItem: CartItem = {
        id: `free_${p.id}_${Date.now()}`,
        productId: prod.id,
        name: `${prod.name} (GRATIS)`,
        emoji: prod.emoji,
        unitPrice: 0,
        qty: 1,
        extrasTotal: 0,
        notes: `Promo: ${p.name}`,
      };
      return {
        promotion: p,
        discount: 0,
        description: `${prod.name} GRATIS (${p.name})`,
        freeItem,
      };
    }
    case 'bundle': {
      // Promo bundle tipo "compra N, llévate M (N+M totales, pagas N, M gratis)".
      // Ejemplo clásico 2x1: bundleBuyQty=1 (paga 1), bundleGetQty=1 (1 gratis)
      // → por cada 2 items en el carrito, 1 es gratis.
      const applicable = cart.filter((i) => promotionAppliesToItem(p, i, products));
      if (applicable.length === 0) return null;
      const totalQty = applicable.reduce((s, i) => s + i.qty, 0);
      const buyQty = p.bundleBuyQty || 1;
      const getQty = p.bundleGetQty || 1;
      // Necesitas tener (buyQty + getQty) items para activar 1 set
      const sets = Math.floor(totalQty / (buyQty + getQty));
      if (sets === 0) return null;
      // Precio unitario promedio (ponderado por cantidad)
      const totalValue = applicable.reduce(
        (s, i) => s + (i.unitPrice + i.extrasTotal) * i.qty,
        0,
      );
      const avgUnitPrice = totalValue / totalQty;
      const discount = Math.round(avgUnitPrice * sets * getQty);
      return {
        promotion: p,
        discount,
        description: `${buyQty}+${getQty} gratis (${p.name}): -${discount.toLocaleString('es-CU')} CUP × ${sets} set(s)`,
      };
    }
    default:
      return null;
  }
}
