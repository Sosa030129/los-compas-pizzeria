// POST /api/push/subscribe - Guardar suscripción de push notifications del cliente
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/server-auth';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.type !== 'customer') {
    return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 });
  }
  const { subscription } = await req.json();
  if (!subscription) {
    return NextResponse.json({ ok: false, error: 'Suscripción requerida' }, { status: 400 });
  }
  await db.customer.update({
    where: { id: session.userId },
    data: { pushSubscription: JSON.stringify(subscription) },
  });
  return NextResponse.json({ ok: true });
}
