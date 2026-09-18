// GET /api/catalog - devuelve catálogo público (productos, categorías, ingredientes, tamaños, promociones, config)
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

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
        sizes,
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
