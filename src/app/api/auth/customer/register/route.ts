// POST /api/auth/customer/register
// Body: { name, phone, email?, password }
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSession, hashPasswordServer } from '@/lib/server-auth';

function isValidPhone(phone: string): boolean {
  const clean = phone.replace(/[\s-]/g, '');
  return /^\+\d{1,3}\d{6,12}$/.test(clean) || /^\d{6,12}$/.test(clean);
}

export async function POST(req: NextRequest) {
  try {
    const { name, phone, email, password } = await req.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ ok: false, error: 'El nombre es obligatorio' }, { status: 400 });
    }
    if (!phone || !isValidPhone(phone)) {
      return NextResponse.json({ ok: false, error: 'Teléfono inválido (usa +53 5 1234567)' }, { status: 400 });
    }
    if (!password || password.length < 4) {
      return NextResponse.json({ ok: false, error: 'La contraseña debe tener al menos 4 caracteres' }, { status: 400 });
    }

    // Verificar teléfono único
    const existing = await db.customer.findUnique({ where: { phone } });
    if (existing) {
      return NextResponse.json({ ok: false, error: 'Ya existe una cuenta con este teléfono' }, { status: 409 });
    }

    const customer = await db.customer.create({
      data: {
        name: name.trim(),
        phone,
        email: email?.trim() || null,
        passwordHash: hashPasswordServer(password),
      },
    });

    await createSession('customer', customer.id);

    await db.activityLog.create({
      data: {
        userId: customer.id,
        userName: customer.name,
        action: 'Registro de cliente',
        detail: `Teléfono: ${customer.phone}`,
      },
    });

    const { passwordHash, ...safeCustomer } = customer;
    return NextResponse.json({ ok: true, customer: safeCustomer });
  } catch (e: any) {
    console.error('Error en registro de cliente:', e);
    return NextResponse.json({ ok: false, error: 'Error interno del servidor' }, { status: 500 });
  }
}
