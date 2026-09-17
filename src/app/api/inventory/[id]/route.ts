// PATCH /api/inventory/[id] - Actualizar stock y minStock de ingrediente (solo admin)
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/server-auth';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.type !== 'employee' || session.employee.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 });
  }
  const { id } = await params;
  const { stock, minStock } = await req.json();
  const data: any = {};
  if (stock !== undefined) data.stock = Math.max(0, Math.floor(stock));
  if (minStock !== undefined) data.minStock = Math.max(0, Math.floor(minStock));
  const updated = await db.ingredient.update({ where: { id }, data });
  return NextResponse.json({ ok: true, ingredient: { ...updated, priceBySize: JSON.parse(updated.priceBySize) } });
}
