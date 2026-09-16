// POST /api/ingredients - crear (solo admin)
// PUT /api/ingredients - actualizar (solo admin)
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/server-auth';

async function requireAdmin() {
  const s = await getSession();
  if (!s || s.type !== 'employee' || s.employee.role !== 'admin') return null;
  return s;
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 });

  const body = await req.json();
  if (!body.name?.trim()) return NextResponse.json({ ok: false, error: 'Nombre obligatorio' }, { status: 400 });

  const ing = await db.ingredient.create({
    data: {
      name: body.name.trim(),
      emoji: body.emoji || '🧀',
      color: body.color || '#ffd966',
      priceBySize: JSON.stringify(body.priceBySize || {}),
      available: body.available !== false,
    },
  });

  await db.activityLog.create({
    data: { userId: session.userId, userName: session.employee.name, action: 'Ingrediente creado', detail: body.name.trim() },
  });

  return NextResponse.json({ ok: true, ingredient: { ...ing, priceBySize: JSON.parse(ing.priceBySize) } });
}

export async function PUT(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 });

  const body = await req.json();
  const { id, ...patch } = body;
  if (!id) return NextResponse.json({ ok: false, error: 'ID requerido' }, { status: 400 });

  const data: any = {};
  if (patch.name) data.name = patch.name.trim();
  if (patch.emoji) data.emoji = patch.emoji;
  if (patch.color) data.color = patch.color;
  if (patch.priceBySize) data.priceBySize = JSON.stringify(patch.priceBySize);
  if (patch.available !== undefined) data.available = !!patch.available;

  const updated = await db.ingredient.update({ where: { id }, data });
  return NextResponse.json({ ok: true, ingredient: { ...updated, priceBySize: JSON.parse(updated.priceBySize) } });
}
