// DELETE /api/categories/[id] (solo admin)
// PATCH /api/categories/[id] - toggle visible (solo admin)
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
  await db.category.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 });
  const { id } = await params;
  const cat = await db.category.findUnique({ where: { id } });
  if (!cat) return NextResponse.json({ ok: false, error: 'No encontrado' }, { status: 404 });
  const updated = await db.category.update({ where: { id }, data: { visible: !cat.visible } });
  return NextResponse.json({ ok: true, category: updated });
}
