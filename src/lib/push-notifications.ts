// FASE 3.6: Notificaciones Push Web (RFC 8030) usando web-push library
// Stack 100% gratuito:
// - web-push usa el protocolo Web Push estándar (RFC 8030) directamente con FCM (Chrome/Android),
//   Mozilla Push (Firefox) y APNs (Safari iOS 16.4+) sin servicios externos.
// - VAPID keys generadas localmente con `npx web-push generate-vapid-keys` (no requiere cuenta).
// - Solo se necesita que el usuario acepte el permiso de notificaciones del navegador.

import webpush from 'web-push';

let vapidInitialized = false;

function ensureVapidInit() {
  if (vapidInitialized) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return; // Push no configurado
  webpush.setVapidDetails('mailto:loscompas@example.com', publicKey, privateKey);
  vapidInitialized = true;
}

export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null;
}

export function isPushConfigured(): boolean {
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

// Enviar push notification a un cliente suscrito.
// subscriptionJson: string JSON guardado en Customer.pushSubscription (formato: PushSubscription.toJSON())
// title: título visible
// body: cuerpo visible
// data?: datos extra (ej: { url: '/?view=tracking' } para abrir tracking al tocar)
export async function sendPushNotification(
  subscriptionJson: string | null,
  title: string,
  body: string,
  data?: { url?: string }
): Promise<boolean> {
  if (!subscriptionJson || !isPushConfigured()) {
    return false; // Push no configurado o cliente no suscrito
  }

  try {
    ensureVapidInit();
    const subscription = JSON.parse(subscriptionJson);
    const payload = JSON.stringify({
      title,
      body,
      icon: '/icon-192.png',
      badge: '/favicon.png',
      vibrate: [200, 100, 200],
      data: data || { url: '/?view=tracking' },
      tag: 'los-compas-pedido', // agrupa notificaciones del mismo pedido
      requireInteraction: false,
    });
    await webpush.sendNotification(subscription, payload, {
      urgency: 'high',
      topic: 'los-compas-pedido',
    });
    return true;
  } catch (e: any) {
    // 410 Gone: suscripción expiró o fue cancelada → debería limpiarse
    if (e?.statusCode === 410 || e?.statusCode === 404) {
      console.warn('[Push] Suscripción expirada/cancelada (410/404). Debería limpiarse de la BD.');
      return false;
    }
    console.error('[Push] Error enviando:', e?.message || e);
    return false;
  }
}

// Helper para enviar push a un customer específico desde BD
import { db } from './db';

export async function sendPushToCustomer(
  customerId: string,
  title: string,
  body: string,
  data?: { url?: string }
): Promise<boolean> {
  try {
    const customer = await db.customer.findUnique({ where: { id: customerId } });
    if (!customer?.pushSubscription) return false;
    return sendPushNotification(customer.pushSubscription, title, body, data);
  } catch (e) {
    console.error('[Push] Error buscando customer:', e);
    return false;
  }
}

// Helper para enviar push al creador de un pedido
import type { Order } from './types';

export async function notifyOrderPush(
  order: { customerId?: string | null; code: string; customerName: string; },
  title: string,
  body: string
): Promise<boolean> {
  if (!order.customerId) return false;
  return sendPushToCustomer(order.customerId, title, body, { url: `/?view=tracking` });
}
