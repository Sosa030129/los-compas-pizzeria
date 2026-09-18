// GET /api/catalog - devuelve catálogo público (productos, categorías, ingredientes, tamaños, promociones, config)
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// FASE 3 fix: borderDelta hardcoded por tamaño porque el schema Prisma no tiene esa columna.
// Estos valores vienen directamente de la spec del negocio y deben coincidir con los de
// src/lib/seed.ts. Si en el futuro se agrega la columna a Prisma, se puede eliminar este map.
const BORDER_DELTAS: Record<string, number> = {
  'pequena_20': 150,
  'mediana_25': 150,
  'grande_30': 150,
  'rect_30x20': 150,
  'rect_35x40': 300,
  'familiar_42x30': 500,
  'extra_46x36': 550,
};

export async function GET() {
  try {
    const [
      categories, products, ingredients, sizes, promotions,
      whatsappNumbers, config,
    ] = await Promise.all([
      db.category.findMany({ orderBy: { order: 'asc' } }),
      db.product.findMany({ orderBy: { name: 'asc' } }),
      db.ingredient.findMany(),
      db.sizeOption.findMany({ orderBy: { order: 'asc' } }),
      db.promotion.findMany({ orderBy: { createdAt: 'desc' } }),
      db.whatsAppNumber.findMany(),
      db.businessConfig.findUnique({ where: { id: '1' } }),
    ]);

    // Parsear JSON embebido en cada item y mapear categoryId → category para compatibilidad con el frontend
    const parsedProducts = products.map((p) => ({
      ...p,
      category: p.categoryId, // Mapear categoryId → category (el frontend usa p.category)
      defaultIngredients: p.defaultIngredients ? JSON.parse(p.defaultIngredients) : undefined,
      comboItems: p.comboItems ? JSON.parse(p.comboItems) : undefined,
    }));
    // FASE 3 fix: priceBySize defensivo — si viene null o inválido, usar {} para que
    // el helper getIngredientPrice del frontend pueda hacer fallback al grupo small/family
    const parsedIngredients = ingredients.map((i) => {
      let pbs: any = {};
      try {
        pbs = i.priceBySize ? JSON.parse(i.priceBySize) : {};
      } catch {
        pbs = {};
      }
      // Asegurar que sea un objeto
      if (!pbs || typeof pbs !== 'object' || Array.isArray(pbs)) pbs = {};
      return { ...i, priceBySize: pbs };
    });
    // FASE 3 fix: inyectar borderDelta desde constante hardcoded (no está en BD)
    const parsedSizes = sizes.map((s) => ({
      ...s,
      borderDelta: BORDER_DELTAS[s.sizeId] ?? 0,
    }));
    const parsedConfig = config ? {
      ...config,
      transferSurcharge: config.transferSurcharge,
    } : null;

    return NextResponse.json({
      ok: true,
      catalog: {
        categories,
        products: parsedProducts,
        ingredients: parsedIngredients,
        sizes: parsedSizes,
        promotions,
        whatsappNumbers,
        config: parsedConfig,
      },
    });
  } catch (e: any) {
    console.error('Error en /api/catalog:', e);
    return NextResponse.json({ ok: false, error: 'Error' }, { status: 500 });
  }
}
