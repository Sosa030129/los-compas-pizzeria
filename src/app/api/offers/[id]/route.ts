// DELETE /api/offers/[id] - elimina una oferta (solo admin)
// PATCH /api/offers/[id] - shortcut para cambiar status (solo admin)
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/server-auth';

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.type !== 'employee' || session.employee.role !== 'admin') {
    return null;
  }
  return session;
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 });
    }
    const { id } = await params;
    const existing = await db.offer.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ ok: false, error: 'Oferta no encontrada' }, { status: 404 });
    }

    await db.offer.delete({ where: { id } });

    await db.activityLog.create({
      data: {
        userId: session.userId,
        userName: session.employee.name,
        action: 'Oferta eliminada',
        detail: existing.name,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('Error eliminando oferta:', e);
    return NextResponse.json({ ok: false, error: 'Error' }, { status: 500 });
  }
}

// PATCH - shortcut para cambiar status (ej: PATCH /api/offers/abc123 {status: 'PUBLISHED'})
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 });
    }
    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    const existing = await db.offer.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ ok: false, error: 'Oferta no encontrada' }, { status: 404 });
    }

    const validTransitions: Record<string, string[]> = {
      'DRAFT': ['PREVIEW', 'PUBLISHED', 'ARCHIVED'],
      'PREVIEW': ['DRAFT', 'PUBLISHED', 'ARCHIVED'],
      'PUBLISHED': ['ARCHIVED'],
      'ARCHIVED': ['DRAFT'],
    };
    const allowed = validTransitions[existing.status] || [];
    if (!allowed.includes(status)) {
      return NextResponse.json({ ok: false, error: `Transición inválida: ${existing.status} → ${status}` }, { status: 400 });
    }

    const data: any = { status };
    if (status === 'PUBLISHED' && !existing.publishedAt) {
      data.publishedAt = new Date();
    }

    const offer = await db.offer.update({ where: { id }, data });

    await db.activityLog.create({
      data: {
        userId: session.userId,
        userName: session.employee.name,
        action: `Oferta ${status.toLowerCase()}`,
        detail: offer.name,
      },
    });

    return NextResponse.json({
      ok: true,
      offer: { ...offer, includedIngredients: JSON.parse(offer.includedIngredients || '[]') },
    });
  } catch (e: any) {
    console.error('Error actualizando estado de oferta:', e);
    return NextResponse.json({ ok: false, error: 'Error' }, { status: 500 });
  }
}
