// PUT /api/sizes - actualizar precio de tamaño (solo admin)
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/server-auth';

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session || session.type !== 'employee' || session.employee.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 });
  }
  const { id, basePrice } = await req.json();
  if (!id) return NextResponse.json({ ok: false, error: 'ID requerido' }, { status: 400 });
  const safePrice = Math.max(0, Math.floor(Number(basePrice) || 0));
  const updated = await db.sizeOption.update({ where: { sizeId: id }, data: { basePrice: safePrice } });
  return NextResponse.json({ ok: true, size: updated });
}
