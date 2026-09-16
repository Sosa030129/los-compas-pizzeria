// POST /api/categories - crear (solo admin)
// PUT /api/categories - actualizar (solo admin)
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
  const { name, emoji, visible, order } = await req.json();
  if (!name?.trim()) return NextResponse.json({ ok: false, error: 'Nombre obligatorio' }, { status: 400 });

  const count = await db.category.count();
  const cat = await db.category.create({
    data: { name: name.trim(), emoji: emoji || '🍕', visible: visible !== false, order: order ?? count + 1 },
  });
  return NextResponse.json({ ok: true, category: cat });
}

export async function PUT(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 });
  const { id, ...patch } = await req.json();
  if (!id) return NextResponse.json({ ok: false, error: 'ID requerido' }, { status: 400 });
  const updated = await db.category.update({ where: { id }, data: patch });
  return NextResponse.json({ ok: true, category: updated });
}
