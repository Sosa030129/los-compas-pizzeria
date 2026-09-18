// POST/PUT/DELETE /api/products - CRUD de productos (solo admin)
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

// POST - crear producto
export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 });
    }

    const body = await req.json();
    const {
      id, name, description, categoryId, emoji, price,
      isPizza, isCombo, defaultSize, defaultIngredients, comboItems, available,
    } = body;

    if (!name?.trim()) {
      return NextResponse.json({ ok: false, error: 'Nombre obligatorio' }, { status: 400 });
    }

    const product = await db.product.create({
      data: {
        id: id || undefined,
        name: name.trim(),
        description: description?.trim() || '',
        categoryId: categoryId || 'pizzas',
        emoji: emoji || '🍕',
        price: Math.max(0, Number(price) || 0),
        isPizza: isPizza || false,
        isCombo: isCombo || false,
        defaultSize: defaultSize || null,
        defaultIngredients: defaultIngredients ? JSON.stringify(defaultIngredients) : null,
        comboItems: comboItems ? JSON.stringify(comboItems) : null,
        available: available !== false,
      },
    });

    await db.activityLog.create({
      data: {
        userId: session.userId,
        userName: session.employee.name,
        action: 'Producto creado',
        detail: name.trim(),
      },
    });

    return NextResponse.json({ ok: true, product });
  } catch (e: any) {
    console.error('Error creando producto:', e);
    return NextResponse.json({ ok: false, error: 'Error' }, { status: 500 });
  }
}

// PUT - actualizar producto (con id en query)
export async function PUT(req: NextRequest) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 });
    }

    const body = await req.json();
    const { id, ...patch } = body;

    if (!id) {
      return NextResponse.json({ ok: false, error: 'ID requerido' }, { status: 400 });
    }

    // Prevenir degradar al admin principal... (no aplica a productos)
    // Serializar arrays si vienen
    const data: any = { ...patch };
    if (patch.defaultIngredients) data.defaultIngredients = JSON.stringify(patch.defaultIngredients);
    if (patch.comboItems) data.comboItems = JSON.stringify(patch.comboItems);
    if (patch.price !== undefined) data.price = Math.max(0, Math.floor(Number(patch.price) || 0));

    const product = await db.product.update({
      where: { id },
      data,
    });

    await db.activityLog.create({
      data: {
        userId: session.userId,
        userName: session.employee.name,
        action: 'Producto actualizado',
        detail: product.name,
      },
    });

    return NextResponse.json({ ok: true, product });
  } catch (e: any) {
    console.error('Error actualizando producto:', e);
    return NextResponse.json({ ok: false, error: 'Error' }, { status: 500 });
  }
}
