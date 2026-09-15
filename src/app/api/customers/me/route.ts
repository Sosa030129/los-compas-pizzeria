// GET /api/customers/me - devuelve perfil del cliente autenticado con sus pedidos
// PUT /api/customers/me - actualiza perfil (nombre, email)
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/server-auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.type !== 'customer') {
      return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 });
    }

    const customer = await db.customer.findUnique({
      where: { id: session.userId },
      include: {
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ ok: false, error: 'Cliente no encontrado' }, { status: 404 });
    }

    const { passwordHash, ...safe } = customer;
    // Parsear JSON embebido
    const profile = {
      ...safe,
      addresses: JSON.parse(safe.addresses || '[]'),
      favorites: JSON.parse(safe.favorites || '[]'),
      orders: safe.orders.map((o) => ({
        ...o,
        items: typeof o.items === 'string' ? JSON.parse(o.items) : o.items,
        createdAt: o.createdAt instanceof Date ? o.createdAt.getTime() : o.createdAt,
        confirmedAt: o.confirmedAt instanceof Date ? o.confirmedAt.getTime() : o.confirmedAt,
        deliveredAt: o.deliveredAt instanceof Date ? o.deliveredAt.getTime() : o.deliveredAt,
      })),
    };

    return NextResponse.json({ ok: true, customer: profile });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: 'Error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.type !== 'customer') {
      return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const patch: any = {};
    if (body.name?.trim()) patch.name = body.name.trim();
    if (body.email !== undefined) patch.email = body.email?.trim() || null;

    const updated = await db.customer.update({
      where: { id: session.userId },
      data: patch,
    });

    const { passwordHash, ...safe } = updated;
    return NextResponse.json({
      ok: true,
      customer: {
        ...safe,
        addresses: JSON.parse(safe.addresses || '[]'),
        favorites: JSON.parse(safe.favorites || '[]'),
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: 'Error' }, { status: 500 });
  }
}
