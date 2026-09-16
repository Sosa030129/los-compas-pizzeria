// POST /api/promotions - crear (solo admin)
// PUT /api/promotions - actualizar (solo admin)
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
  if (new Date(body.validFrom) >= new Date(body.validTo)) {
    return NextResponse.json({ ok: false, error: 'Fecha de inicio debe ser anterior a fecha de fin' }, { status: 400 });
  }

  const promo = await db.promotion.create({
    data: {
      name: body.name.trim(),
      description: body.description?.trim() || '',
      emoji: body.emoji || '🎉',
      type: body.type || 'percent',
      value: Math.max(0, body.value || 0),
      freeProductId: body.freeProductId || null,
      bundleBuyQty: body.bundleBuyQty || null,
      bundleGetQty: body.bundleGetQty || null,
      validFrom: new Date(body.validFrom),
      validTo: new Date(body.validTo),
      active: body.active !== false,
      code: body.code?.trim()?.toUpperCase() || null,
      appliesTo: body.appliesTo || 'all',
      categoryId: body.categoryId || null,
      productId: body.productId || null,
    },
  });
  return NextResponse.json({ ok: true, promotion: promo });
}

export async function PUT(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 });
  const { id, ...patch } = await req.json();
  if (!id) return NextResponse.json({ ok: false, error: 'ID requerido' }, { status: 400 });

  const data: any = { ...patch };
  if (patch.validFrom) data.validFrom = new Date(patch.validFrom);
  if (patch.validTo) data.validTo = new Date(patch.validTo);
  if (patch.code) data.code = patch.code.toUpperCase();
  if (patch.active !== undefined) data.active = !!patch.active;

  const updated = await db.promotion.update({ where: { id }, data });
  return NextResponse.json({ ok: true, promotion: updated });
}
