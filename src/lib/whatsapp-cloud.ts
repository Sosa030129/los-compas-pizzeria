// Servicio de WhatsApp Cloud API - Envío real de mensajes vía Meta Business API
// Requiere configurar WHATSAPP_TOKEN y WHATSAPP_PHONE_NUMBER_ID en .env
// Si no están configurados, cae al modo demo (genera links wa.me)

import { db } from './db';

const WA_TOKEN = process.env.WHATSAPP_TOKEN || '';
const WA_PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
const WA_API_VERSION = process.env.WHATSAPP_API_VERSION || 'v21.0';

// Verifica si el envío real está configurado
export function isWhatsAppConfigured(): boolean {
  return WA_TOKEN.length > 0 && WA_PHONE_ID.length > 0;
}

// Envía un mensaje real vía WhatsApp Cloud API
// Si no está configurado, genera un link wa.me como fallback
async function sendWhatsAppMessage(
  toPhone: string,
  message: string,
  event: string,
  orderId?: string
): Promise<{ success: boolean; link?: string; error?: string }> {
  try {
    // Normalizar teléfono (sin +, sin espacios)
    const normalizedTo = toPhone.replace(/[^\d]/g, '');
    if (!normalizedTo) {
      throw new Error('Número de destino inválido');
    }

    if (isWhatsAppConfigured()) {
      // ===== ENVÍO REAL vía Meta Cloud API =====
      const url = `https://graph.facebook.com/${WA_API_VERSION}/${WA_PHONE_ID}/messages`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WA_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: normalizedTo,
          type: 'text',
          text: { body: message },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error?.message || `HTTP ${response.status}`);
      }

      // Registrar en log
      await db.whatsAppLog.create({
        data: {
          orderId,
          toNumber: normalizedTo,
          message,
          event,
          status: 'sent',
        },
      });

      return { success: true };
    } else {
      // ===== MODO DEMO: generar link wa.me =====
      const link = `https://wa.me/${normalizedTo}?text=${encodeURIComponent(message)}`;

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
    }
  } catch (e: any) {
    // Registrar error
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

// Reemplaza placeholders en plantilla
function fillTemplate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    return vars[key] !== undefined ? String(vars[key]) : `{${key}}`;
  });
}

async function getTemplate(event: string): Promise<string | null> {
  const tpl = await db.whatsAppTemplate.findUnique({ where: { event } });
  if (!tpl || !tpl.active) return null;
  return tpl.template;
}

async function getNumbersForFunction(func: 'pedidos' | 'cocina' | 'reparto' | 'todos'): Promise<string[]> {
  const all = await db.whatsAppNumber.findMany({ where: { active: true } });
  return all
    .filter((n) => n.function === func || n.function === 'todos')
    .map((n) => n.number.replace(/[^\d+]/g, ''));
}

// ===== Eventos =====

export async function notifyNewOrder(order: {
  id: string; code: string; customerName: string;
  customerPhone: string; total: number; scheduledTime: string;
}): Promise<void> {
  const template = await getTemplate('nuevo_pedido');
  if (!template) return;
  const message = fillTemplate(template, {
    cliente: order.customerName, codigo: order.code,
    total: `${order.total.toLocaleString('es-CU')} CUP`, horario: order.scheduledTime,
  });
  const numbers = await getNumbersForFunction('pedidos');
  await Promise.all(numbers.map((n) => sendWhatsAppMessage(n, message, 'nuevo_pedido', order.id)));
}

export async function notifyOrderConfirmed(order: {
  id: string; code: string; customerName: string; customerPhone: string;
  delivery: number | null; total: number; scheduledTime: string;
}): Promise<void> {
  const template = await getTemplate('pedido_confirmado');
  if (!template) return;
  const message = fillTemplate(template, {
    cliente: order.customerName, codigo: order.code,
    domicilio: order.delivery === null ? 'pendiente de confirmar'
      : order.delivery === 0 ? 'Recogida en tienda / sin costo'
      : `${order.delivery.toLocaleString('es-CU')} CUP`,
    total: `${order.total.toLocaleString('es-CU')} CUP`, horario: order.scheduledTime,
  });
  await sendWhatsAppMessage(order.customerPhone, message, 'pedido_confirmado', order.id);
}

export async function notifyOrderReady(order: {
  id: string; code: string; customerName: string; customerPhone: string;
}): Promise<void> {
  const template = await getTemplate('pedido_listo');
  if (!template) return;
  const message = fillTemplate(template, { cliente: order.customerName, codigo: order.code });
  await sendWhatsAppMessage(order.customerPhone, message, 'pedido_listo', order.id);
}

export async function notifyOrderDelivered(order: {
  id: string; code: string; customerName: string; customerPhone: string;
}): Promise<void> {
  const template = await getTemplate('pedido_entregado');
  if (!template) return;
  const message = fillTemplate(template, { cliente: order.customerName, codigo: order.code });
  await sendWhatsAppMessage(order.customerPhone, message, 'pedido_entregado', order.id);
}

export async function getWhatsAppLogsForOrder(orderId: string) {
  return db.whatsAppLog.findMany({ where: { orderId }, orderBy: { createdAt: 'desc' } });
}
