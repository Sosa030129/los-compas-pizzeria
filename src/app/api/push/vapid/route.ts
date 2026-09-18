// GET /api/push/vapid - devuelve VAPID_PUBLIC_KEY pública para que el cliente
// pueda suscribirse con navigator.serviceWorker.pushManager.subscribe()
import { NextResponse } from 'next/server';
import { getVapidPublicKey } from '@/lib/push-notifications';

export async function GET() {
  const publicKey = getVapidPublicKey();
  if (!publicKey) {
    return NextResponse.json({ ok: false, error: 'Push no configurado' }, { status: 503 });
  }
  return NextResponse.json({ ok: true, publicKey });
}
