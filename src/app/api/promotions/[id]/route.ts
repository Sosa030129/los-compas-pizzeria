// DELETE /api/promotions/[id] (solo admin)
// PATCH /api/promotions/[id] - toggle active (solo admin)
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/server-auth';

async function requireAdmin() {
  const s = await getSession();
  if (!s || s.type !== 'employee' || s.employee.role !== 'admin') return null;
  return s;
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 });
  const { id } = await params;
  await db.promotion.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 });
  const { id } = await params;
  const promo = await db.promotion.findUnique({ where: { id } });
  if (!promo) return NextResponse.json({ ok: false, error: 'No encontrada' }, { status: 404 });
  const updated = await db.promotion.update({ where: { id }, data: { active: !promo.active } });
  return NextResponse.json({ ok: true, promotion: updated });
}
