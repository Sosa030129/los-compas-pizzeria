// DELETE /api/products/[id] - eliminar producto (solo admin)
// PATCH /api/products/[id] - toggle disponible
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 });
    }

    const { id } = await params;
    const product = await db.product.delete({ where: { id } });

    await db.activityLog.create({
      data: {
        userId: session.userId,
        userName: session.employee.name,
        action: 'Producto eliminado',
        detail: product.name,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: 'Error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const patch: any = {};
    if (body.available !== undefined) patch.available = !!body.available;
    if (body.price !== undefined) patch.price = Math.max(0, Math.floor(Number(body.price) || 0));

    const product = await db.product.update({ where: { id }, data: patch });

    return NextResponse.json({ ok: true, product });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: 'Error' }, { status: 500 });
  }
}
