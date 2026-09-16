// Servicio de WhatsApp - envía mensajes automáticos en eventos
import { db } from './db';

// Formatea un número de teléfono: "+53 5 1234567" → "+5351234567"
function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, '');
}

// Reemplaza placeholders en una plantilla de mensaje
// Placeholders: {cliente}, {codigo}, {total}, {domicilio}, {horario}
function fillTemplate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    return vars[key] !== undefined ? String(vars[key]) : `{${key}}`;
  });
}

// Obtiene la plantilla para un evento
async function getTemplate(event: string): Promise<string | null> {
  const tpl = await db.whatsAppTemplate.findUnique({ where: { event } });
  if (!tpl || !tpl.active) return null;
  return tpl.template;
}

// Obtiene los números activos que coinciden con una función
async function getNumbersForFunction(func: 'pedidos' | 'cocina' | 'reparto' | 'todos'): Promise<string[]> {
  const all = await db.whatsAppNumber.findMany({ where: { active: true } });
  return all
    .filter((n) => n.function === func || n.function === 'todos')
    .map((n) => normalizePhone(n.number));
}

// Genera un link de WhatsApp (wa.me) - en producción real esto requeriría
// integración con WhatsApp Business API o un bot que envíe el mensaje automáticamente.
// Para esta demostración, registramos el "envío" en WhatsAppLog para auditoría.
// El repartidor o admin puede hacer click en el link generado para enviar manualmente
// desde su propio WhatsApp, o en producción se conectaría a la API de Meta.
async function sendWhatsApp(
  toPhone: string,
  message: string,
  event: string,
  orderId?: string
): Promise<{ success: boolean; link?: string; error?: string }> {
  try {
    const normalizedTo = normalizePhone(toPhone);
    if (!normalizedTo) {
      throw new Error('Número de destino inválido');
    }

    // Generar link wa.me (esto abre WhatsApp Web/App con el mensaje pre-escrito)
    const link = `https://wa.me/${normalizedTo.replace('+', '')}?text=${encodeURIComponent(message)}`;

    // Registrar el envío en el log para auditoría
    await db.whatsAppLog.create({
      data: {
        orderId,
        toNumber: normalizedTo,
        message,
        event,
        status: 'sent',
      },
    });

    return { success: true, link };
  } catch (e: any) {
    // Registrar el error
    await db.whatsAppLog.create({
      data: {
        orderId,
        toNumber: toPhone,
        message,
        event,
        status: 'failed',
        error: e?.message || 'Unknown error',
      },
    }).catch(() => {});
    return { success: false, error: e?.message || 'Error enviando WhatsApp' };
  }
}

// ===== Eventos que disparan WhatsApp =====

// Evento 1: NUEVO PEDIDO - notifica al admin y números de pedidos
export async function notifyNewOrder(order: {
  id: string;
  code: string;
  customerName: string;
  customerPhone: string;
  total: number;
  scheduledTime: string;
}): Promise<void> {
  const template = await getTemplate('nuevo_pedido');
  if (!template) return;

  const message = fillTemplate(template, {
    cliente: order.customerName,
    codigo: order.code,
    total: `${order.total.toLocaleString('es-CU')} CUP`,
    horario: order.scheduledTime,
  });

  // Enviar a todos los números de pedidos
  const numbers = await getNumbersForFunction('pedidos');
  await Promise.all(
    numbers.map((n) => sendWhatsApp(n, message, 'nuevo_pedido', order.id))
  );
}

// Evento 2: PEDIDO CONFIRMADO - notifica al cliente
export async function notifyOrderConfirmed(order: {
  id: string;
  code: string;
  customerName: string;
  customerPhone: string;
  delivery: number | null;
  total: number;
  scheduledTime: string;
}): Promise<void> {
  const template = await getTemplate('pedido_confirmado');
  if (!template) return;

  const message = fillTemplate(template, {
    cliente: order.customerName,
    codigo: order.code,
    domicilio: order.delivery === null
      ? 'pendiente de confirmar'
      : order.delivery === 0
        ? 'Recogida en tienda / sin costo'
        : `${order.delivery.toLocaleString('es-CU')} CUP`,
    total: `${order.total.toLocaleString('es-CU')} CUP`,
    horario: order.scheduledTime,
  });

  await sendWhatsApp(order.customerPhone, message, 'pedido_confirmado', order.id);
}

// Evento 3: PEDIDO LISTO - notifica al cliente
export async function notifyOrderReady(order: {
  id: string;
  code: string;
  customerName: string;
  customerPhone: string;
}): Promise<void> {
  const template = await getTemplate('pedido_listo');
  if (!template) return;

  const message = fillTemplate(template, {
    cliente: order.customerName,
    codigo: order.code,
  });

  await sendWhatsApp(order.customerPhone, message, 'pedido_listo', order.id);
}

// Evento 4: PEDIDO ENTREGADO - notifica al cliente
export async function notifyOrderDelivered(order: {
  id: string;
  code: string;
  customerName: string;
  customerPhone: string;
}): Promise<void> {
  const template = await getTemplate('pedido_entregado');
  if (!template) return;

  const message = fillTemplate(template, {
    cliente: order.customerName,
    codigo: order.code,
  });

  await sendWhatsApp(order.customerPhone, message, 'pedido_entregado', order.id);
}

// Función para obtener todos los links de WhatsApp generados para un pedido
// (útil para que el admin vea qué se envió)
export async function getWhatsAppLogsForOrder(orderId: string) {
  return db.whatsAppLog.findMany({
    where: { orderId },
    orderBy: { createdAt: 'desc' },
  });
}
