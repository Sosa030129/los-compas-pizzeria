// GET /api/offers - lista todas las ofertas (admin ve todas, clientes solo PUBLISHED)
// POST /api/offers - crea una nueva oferta en estado DRAFT (solo admin)
// PUT /api/offers - actualiza una oferta existente (solo admin)
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

// Cliente: solo PUBLISHED. Admin: todas.
export async function GET() {
  try {
    const session = await getSession();
    const isAdmin = session?.type === 'employee' && session.employee.role === 'admin';

    const offers = isAdmin
      ? await db.offer.findMany({ orderBy: { createdAt: 'desc' } })
      : await db.offer.findMany({ where: { status: 'PUBLISHED' }, orderBy: { publishedAt: 'desc' } });

    const parsed = offers.map((o) => ({
      ...o,
      includedIngredients: JSON.parse(o.includedIngredients || '[]'),
    }));

    return NextResponse.json({ ok: true, offers: parsed });
  } catch (e: any) {
    console.error('Error listando ofertas:', e);
    return NextResponse.json({ ok: false, error: 'Error' }, { status: 500 });
  }
}

// POST - crear oferta en estado DRAFT
export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 });
    }

    const body = await req.json();
    const { name, description, emoji, productId, includedIngredients, discountPercent } = body;

    if (!name?.trim()) {
      return NextResponse.json({ ok: false, error: 'Nombre obligatorio' }, { status: 400 });
    }
    if (!productId) {
      return NextResponse.json({ ok: false, error: 'Debe seleccionar una pizza' }, { status: 400 });
    }

    // Validar que el producto exista y sea pizza
    const product = await db.product.findUnique({ where: { id: productId } });
    if (!product) {
      return NextResponse.json({ ok: false, error: 'Producto no encontrado' }, { status: 400 });
    }
    if (!product.isPizza) {
      return NextResponse.json({ ok: false, error: 'El producto debe ser una pizza' }, { status: 400 });
    }

    // Validar que los ingredientes existan y estén disponibles
    const includedArr: string[] = Array.isArray(includedIngredients) ? includedIngredients : [];
    if (includedArr.length === 0) {
      return NextResponse.json({ ok: false, error: 'Debe incluir al menos 1 ingrediente obligatorio' }, { status: 400 });
    }
    const ingredients = await db.ingredient.findMany({ where: { id: { in: includedArr } } });
    if (ingredients.length !== includedArr.length) {
      return NextResponse.json({ ok: false, error: 'Uno o más ingredientes no existen' }, { status: 400 });
    }
    const unavailable = ingredients.filter((i) => !i.available);
    if (unavailable.length > 0) {
      return NextResponse.json({ ok: false, error: `Ingredientes no disponibles: ${unavailable.map((i) => i.name).join(', ')}` }, { status: 400 });
    }

    // Validar discountPercent
    const dp = Math.max(0, Math.min(100, Number(discountPercent) || 0));

    const offer = await db.offer.create({
      data: {
        name: name.trim(),
        description: description?.trim() || '',
        emoji: emoji || '🍕',
        productId,
        includedIngredients: JSON.stringify(includedArr),
        status: 'DRAFT',
        discountPercent: dp,
      },
    });

    await db.activityLog.create({
      data: {
        userId: session.userId,
        userName: session.employee.name,
        action: 'Oferta creada (borrador)',
        detail: `${name} - ${includedArr.length} ingredientes obligatorios`,
      },
    });

    return NextResponse.json({
      ok: true,
      offer: { ...offer, includedIngredients: includedArr },
    });
  } catch (e: any) {
    console.error('Error creando oferta:', e);
    return NextResponse.json({ ok: false, error: 'Error' }, { status: 500 });
  }
}

// PUT - actualizar oferta (solo admin)
export async function PUT(req: NextRequest) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 });
    }

    const body = await req.json();
    const { id, name, description, emoji, productId, includedIngredients, discountPercent, status } = body;

    if (!id) {
      return NextResponse.json({ ok: false, error: 'ID requerido' }, { status: 400 });
    }

    const existing = await db.offer.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ ok: false, error: 'Oferta no encontrada' }, { status: 404 });
    }

    const data: any = {};
    if (name !== undefined) data.name = String(name).trim();
    if (description !== undefined) data.description = String(description).trim();
    if (emoji !== undefined) data.emoji = String(emoji);
    if (discountPercent !== undefined) data.discountPercent = Math.max(0, Math.min(100, Number(discountPercent) || 0));
    if (productId !== undefined) {
      const product = await db.product.findUnique({ where: { id: productId } });
      if (!product || !product.isPizza) {
        return NextResponse.json({ ok: false, error: 'Producto inválido' }, { status: 400 });
      }
      data.productId = productId;
    }
    if (includedIngredients !== undefined) {
      const arr: string[] = Array.isArray(includedIngredients) ? includedIngredients : [];
      if (arr.length === 0) {
        return NextResponse.json({ ok: false, error: 'Mínimo 1 ingrediente obligatorio' }, { status: 400 });
      }
      const ings = await db.ingredient.findMany({ where: { id: { in: arr } } });
      if (ings.length !== arr.length) {
        return NextResponse.json({ ok: false, error: 'Ingrediente(s) inválido(s)' }, { status: 400 });
      }
      data.includedIngredients = JSON.stringify(arr);
    }
    if (status !== undefined) {
      // Validar transiciones válidas
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
      data.status = status;
      if (status === 'PUBLISHED' && !existing.publishedAt) {
        data.publishedAt = new Date();
      }
    }

    const offer = await db.offer.update({ where: { id }, data });

    await db.activityLog.create({
      data: {
        userId: session.userId,
        userName: session.employee.name,
        action: 'Oferta actualizada',
        detail: `${offer.name} - status=${offer.status}`,
      },
    });

    return NextResponse.json({
      ok: true,
      offer: { ...offer, includedIngredients: JSON.parse(offer.includedIngredients || '[]') },
    });
  } catch (e: any) {
    console.error('Error actualizando oferta:', e);
    return NextResponse.json({ ok: false, error: 'Error' }, { status: 500 });
  }
}
