// POST /api/auth/customer/login
// Body: { phone, password }
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSession, verifyPasswordServer } from '@/lib/server-auth';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 30 * 1000;
const attempts = new Map<string, { count: number; lockedUntil: number }>();

export async function POST(req: NextRequest) {
  try {
    const { phone, password } = await req.json();

    if (!phone || !password) {
      return NextResponse.json({ ok: false, error: 'Teléfono y contraseña son obligatorios' }, { status: 400 });
    }

    // Rate limiting
    const entry = attempts.get(phone);
    if (entry && entry.lockedUntil > Date.now()) {
      const remaining = Math.ceil((entry.lockedUntil - Date.now()) / 1000);
      return NextResponse.json(
        { ok: false, error: `Demasiados intentos. Espera ${remaining}s.` },
        { status: 429 }
      );
    }

    const customer = await db.customer.findUnique({ where: { phone } });

    if (!customer || !verifyPasswordServer(password, customer.passwordHash)) {
      const current = attempts.get(phone) || { count: 0, lockedUntil: 0 };
      current.count += 1;
      if (current.count >= MAX_ATTEMPTS) {
        current.lockedUntil = Date.now() + LOCKOUT_MS;
        current.count = 0;
      }
      attempts.set(phone, current);
      return NextResponse.json({ ok: false, error: 'Teléfono o contraseña incorrectos' }, { status: 401 });
    }

    attempts.delete(phone);
    await createSession('customer', customer.id);

    await db.activityLog.create({
      data: {
        userId: customer.id,
        userName: customer.name,
        action: 'Inicio de sesión de cliente',
        detail: '',
      },
    });

    const { passwordHash, ...safeCustomer } = customer;
    return NextResponse.json({ ok: true, customer: safeCustomer });
  } catch (e: any) {
    console.error('Error en login de cliente:', e);
    return NextResponse.json({ ok: false, error: 'Error interno del servidor' }, { status: 500 });
  }
}
