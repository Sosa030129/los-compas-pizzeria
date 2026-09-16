// #6 Notificaciones Push Web - Service Worker push handler
// Este archivo se agrega al service worker para manejar notificaciones push

// NOTA: Para que las push notifications funcionen en producción necesitas:
// 1. Generar VAPID keys: npx web-push generate-vapid-keys
// 2. Setear VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY en .env
// 3. El cliente se suscribe con navigator.serviceWorker.pushManager.subscribe()
// 4. El servidor envía notificaciones con web-push library

// Por ahora, este es un stub que muestra cómo implementarlo:

export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null;
}

export function isPushConfigured(): boolean {
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

// Helper para enviar push notification a un cliente
// En producción usaría la librería web-push:
// import webpush from 'web-push';
// webpush.setVapidDetails('mailto:admin@loscompas.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
// await webpush.sendNotification(subscription, JSON.stringify({ title, body }));
export async function sendPushNotification(
  subscriptionJson: string | null,
  title: string,
  body: string
): Promise<boolean> {
  if (!subscriptionJson || !isPushConfigured()) {
    return false; // Push no configurado o cliente no suscrito
  }

  try {
    // En producción real:
    // const subscription = JSON.parse(subscriptionJson);
    // const payload = JSON.stringify({ title, body, icon: '/icon-192.png', badge: '/favicon.png' });
    // await webpush.sendNotification(subscription, payload);

    // Por ahora: solo log
    console.log(`[Push] ${title}: ${body} (would send to ${subscriptionJson.substring(0, 50)}...)`);
    return true;
  } catch (e) {
    console.error('[Push] Error:', e);
    return false;
  }
}

// API route para suscribirse a push: POST /api/push/subscribe
// Body: { subscription: PushSubscription }
// Guarda la suscripción en Customer.pushSubscription
