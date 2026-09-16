// GET /api/inventory - Lista ingredientes con stock y alertas (solo admin)
// PATCH /api/inventory/[id] - Actualizar stock de ingrediente
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/server-auth';

async function requireAdmin() {
  const s = await getSession();
  if (!s || s.type !== 'employee' || s.employee.role !== 'admin') return null;
  return s;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 });
  const ingredients = await db.ingredient.findMany();
  const result = ingredients.map(i => ({
    ...i,
    priceBySize: JSON.parse(i.priceBySize),
    lowStock: i.stock < i.minStock,
  }));
  return NextResponse.json({ ok: true, ingredients: result });
}
