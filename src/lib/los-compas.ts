// Utilidades LOS COMPAS PIZZERÍA

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
