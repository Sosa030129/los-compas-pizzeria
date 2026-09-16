// DELETE /api/employees/[id] - eliminar (solo admin)
// PATCH /api/employees/[id] - toggle active (solo admin)
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/server-auth';

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.type !== 'employee' || session.employee.role !== 'admin') return null;
  return session;
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 });

  const { id } = await params;
  const emp = await db.employee.findUnique({ where: { id } });
  if (!emp) return NextResponse.json({ ok: false, error: 'No encontrado' }, { status: 404 });
  if (emp.role === 'admin') return NextResponse.json({ ok: false, error: 'No se puede eliminar al admin principal' }, { status: 400 });

  await db.employee.delete({ where: { id } });
  await db.activityLog.create({
    data: { userId: session.userId, userName: session.employee.name, action: 'Empleado eliminado', detail: emp.name },
  });
  return NextResponse.json({ ok: true });
}

export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 });

  const { id } = await params;
  // Prevenir que el admin se desactive a sí mismo
  if (id === session.userId) {
    return NextResponse.json({ ok: false, error: 'No puedes desactivarte a ti mismo' }, { status: 400 });
  }
  const emp = await db.employee.findUnique({ where: { id } });
  if (!emp) return NextResponse.json({ ok: false, error: 'No encontrado' }, { status: 404 });

  const updated = await db.employee.update({ where: { id }, data: { active: !emp.active } });
  return NextResponse.json({ ok: true, employee: { ...updated, permissions: JSON.parse(updated.permissions) } });
}
