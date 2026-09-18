// Seed inicial del backend - llena la BD con datos demo
import { db } from '../src/lib/db';
import { hashPasswordServer } from '../src/lib/server-auth';

async function main() {
  console.log('🌱 Iniciando seed del backend...');

  // Limpiar tablas (orden inverso para respetar FKs)
  await db.whatsAppLog.deleteMany();
  await db.whatsAppTemplate.deleteMany();
  await db.whatsAppNumber.deleteMany();
  await db.activityLog.deleteMany();
  await db.session.deleteMany();
  await db.order.deleteMany();
  await db.promotion.deleteMany();
  await db.ingredient.deleteMany();
  await db.sizeOption.deleteMany();
  await db.product.deleteMany();
  await db.category.deleteMany();
  await db.employee.deleteMany();
  await db.customer.deleteMany();
  await db.businessConfig.deleteMany();

  // 1. Configuración del negocio
  await db.businessConfig.create({
    data: {
      id: '1',
      name: 'LOS COMPAS',
      city: 'Sancti Spíritus, Cuba',
      currency: 'CUP',
      logo: '/logo.png',
      phone: '+53 55000000',
      address: 'Sancti Spíritus, Cuba',
      deliveryBase: 250,
      morningStart: '08:00',
      morningEnd: '10:30',
      morningDelivery: '12:30 PM - 01:00 PM',
      afternoonStart: '13:00',
      afternoonEnd: '16:30',
      afternoonDelivery: '06:30 PM - 07:00 PM',
      transferSurcharge: 0.30,
    },
  });
  console.log('✓ Configuración del negocio');

  // 2. Categorías
  const categories = await Promise.all([
    db.category.create({ data: { id: 'pizzas', name: 'Pizzas', emoji: '🍕', visible: true, order: 1 } }),
    db.category.create({ data: { id: 'comidas', name: 'Comidas', emoji: '🌮', visible: true, order: 2 } }),
    db.category.create({ data: { id: 'postres', name: 'Postres', emoji: '🍩', visible: true, order: 3 } }),
    db.category.create({ data: { id: 'bebidas', name: 'Bebidas', emoji: '🥤', visible: true, order: 4 } }),
    db.category.create({ data: { id: 'combos', name: 'Combos', emoji: '🎉', visible: true, order: 5 } }),
  ]);
  console.log(`✓ ${categories.length} categorías`);

  // 3. Tamaños de pizza (con borderDelta según spec del negocio)
  const sizes = [
    { sizeId: 'pequena_20', label: 'Pequeña 20cm', basePrice: 600, order: 1 },
    { sizeId: 'mediana_25', label: 'Mediana 25cm', basePrice: 800, order: 2 },
    { sizeId: 'grande_30', label: 'Grande 30cm', basePrice: 900, order: 3 },
    { sizeId: 'rect_30x20', label: 'Rect. Pequeña 30×20cm', basePrice: 850, order: 4 },
    { sizeId: 'rect_35x40', label: 'Rect. Mediana 35×40cm', basePrice: 1800, order: 5 },
    { sizeId: 'familiar_42x30', label: 'Familiar 42×30cm', basePrice: 2200, order: 6 },
    { sizeId: 'extra_46x36', label: 'Extra Familiar 46×36cm', basePrice: 2450, order: 7 },
  ];
  await Promise.all(sizes.map((s) => db.sizeOption.create({ data: s })));
  console.log(`✓ ${sizes.length} tamaños de pizza`);

  // 4. Ingredientes — 2 precios (pequeñas / familiares) según spec del negocio.
  // Pequeñas = 20cm, 25cm, 30cm, 30×20 (usan priceSmall)
  // Familiares = 35×40, 42×30, 46×36 (usan priceFamily)
  const SMALL_SIZES = ['pequena_20', 'mediana_25', 'grande_30', 'rect_30x20'];
  const FAMILY_SIZES = ['rect_35x40', 'familiar_42x30', 'extra_46x36'];
  const buildPriceBySize = (small: number, family: number) => {
    const obj: Record<string, number> = {};
    for (const s of SMALL_SIZES) obj[s] = small;
    for (const s of FAMILY_SIZES) obj[s] = family;
    return JSON.stringify(obj);
  };
  const ingredients = [
    { id: 'queso', name: 'Queso extra', emoji: '🧀', color: '#ffd966', priceBySize: buildPriceBySize(250, 700) },
    { id: 'jamon', name: 'Jamón', emoji: '🍖', color: '#e07a6b', priceBySize: buildPriceBySize(230, 580) },
    { id: 'salchicha', name: 'Salchicha', emoji: '🌭', color: '#b8302a', priceBySize: buildPriceBySize(350, 750) },
    { id: 'pina', name: 'Piña', emoji: '🍍', color: '#f6c945', priceBySize: buildPriceBySize(200, 550) },
    { id: 'cebolla', name: 'Cebolla', emoji: '🧅', color: '#f0e3c4', priceBySize: buildPriceBySize(180, 450) },
    { id: 'vegetales', name: 'Vegetales', emoji: '🥬', color: '#3a7a2b', priceBySize: buildPriceBySize(200, 500) },
    { id: 'champinones', name: 'Champiñones', emoji: '🍄', color: '#c4a080', priceBySize: buildPriceBySize(200, 500) },
    { id: 'aji', name: 'Ají', emoji: '🌶️', color: '#d23a3a', priceBySize: buildPriceBySize(150, 350) },
  ];
  await Promise.all(ingredients.map((i) => db.ingredient.create({ data: i })));
  console.log(`✓ ${ingredients.length} ingredientes`);

  // 5. Productos según spec del negocio (32 total: 5 pizzas + 7 comidas + 7 postres + 11 bebidas + 2 combos)
  const products = [
    // PIZZAS
    { id: 'pizza_custom', name: 'Pizza Personalizada', description: 'Pizza armada por el cliente con ingredientes a elección.', categoryId: 'pizzas', emoji: '🍕', price: 0, prepTime: 22, isPizza: true, defaultSize: 'familiar_42x30', defaultIngredients: JSON.stringify(['queso']) },
    { id: 'pizza_muzzarella', name: 'Pizza Muzzarella', description: 'Clásica: masa artesanal, salsa de tomate y queso fundido.', categoryId: 'pizzas', emoji: '🍕', price: 0, prepTime: 20, isPizza: true, defaultSize: 'familiar_42x30', defaultIngredients: JSON.stringify(['queso']) },
    { id: 'pizza_especial', name: 'Pizza Especial', description: 'Queso, jamón y salchicha. La favorita de la casa.', categoryId: 'pizzas', emoji: '🍕', price: 0, prepTime: 22, isPizza: true, defaultSize: 'familiar_42x30', defaultIngredients: JSON.stringify(['queso', 'jamon', 'salchicha']) },
    { id: 'pizza_hawaiana', name: 'Pizza Hawaiana', description: 'Jamón, piña y queso. Dulce y salada a la vez.', categoryId: 'pizzas', emoji: '🍕', price: 0, prepTime: 22, isPizza: true, defaultSize: 'familiar_42x30', defaultIngredients: JSON.stringify(['queso', 'jamon', 'pina']) },
    { id: 'pizza_vegetal', name: 'Pizza Vegetal', description: 'Vegetales frescos, cebolla y champiñones.', categoryId: 'pizzas', emoji: '🍕', price: 0, prepTime: 25, isPizza: true, defaultSize: 'familiar_42x30', defaultIngredients: JSON.stringify(['queso', 'vegetales', 'cebolla', 'champinones']) },
    // COMIDAS
    { id: 'tacos_salchicha', name: 'Tacos de Salchicha', description: '3 tacos crujientes rellenos de salchicha.', categoryId: 'comidas', emoji: '🌮', price: 1000, prepTime: 15 },
    { id: 'tacos_jamon', name: 'Tacos de Jamón', description: '3 tacos crujientes rellenos de jamón.', categoryId: 'comidas', emoji: '🌮', price: 1000, prepTime: 15 },
    { id: 'empanadas_queso', name: 'Empanadas de Queso', description: '5 empanadas crujientes con queso fundido.', categoryId: 'comidas', emoji: '🥟', price: 1400, prepTime: 18 },
    { id: 'espaguetis_queso', name: 'Espaguetis de Queso', description: 'Pasta italiana con salsa de tomate y queso fundido.', categoryId: 'comidas', emoji: '🍝', price: 600, prepTime: 20 },
    { id: 'tostones_normales', name: 'Tostones Naturales', description: 'Plátano verde frito, crujiente y salado.', categoryId: 'comidas', emoji: '🍌', price: 450, prepTime: 12 },
    { id: 'tostones_ajo', name: 'Tostones de Ajo', description: 'Tostones con aliño de ajo y hierbas.', categoryId: 'comidas', emoji: '🍌', price: 550, prepTime: 12 },
    { id: 'tostones_rellenos', name: 'Tostones Rellenos', description: 'Tostones rellenos de jamón y queso.', categoryId: 'comidas', emoji: '🍌', price: 600, prepTime: 15 },
    // POSTRES
    { id: 'donas_nutella', name: 'Donas con Nutella', description: '6 donas con relleno de Nutella.', categoryId: 'postres', emoji: '🍩', price: 1000, prepTime: 5 },
    { id: 'donas_cubierta_nutella', name: 'Donas con Cubierta y Relleno de Nutella', description: '6 donas con cubierta y relleno de crema de cacao.', categoryId: 'postres', emoji: '🍩', price: 1800, prepTime: 5 },
    { id: 'berlinesas', name: 'Berlinesas con Nutella', description: '6 berlinesas rellenas de crema de cacao.', categoryId: 'postres', emoji: '🍫', price: 1300, prepTime: 5 },
    { id: 'rosquitas_azucar', name: 'Rosquitas con Azúcar', description: '10 rosquitas crujientes con azúcar.', categoryId: 'postres', emoji: '🍩', price: 800, prepTime: 5 },
    { id: 'rosquitas_rellenas', name: 'Rosquitas Rellenas con Nutella', description: '6 rosquitas rellenas con crema de cacao.', categoryId: 'postres', emoji: '🍩', price: 1300, prepTime: 5 },
    { id: 'helados', name: 'Helados', description: 'Copa de helado, sabor a elegir.', categoryId: 'postres', emoji: '🍦', price: 500, prepTime: 3 },
    { id: 'helados_potes', name: 'Potes de Helado', description: 'Pote de helado individual.', categoryId: 'postres', emoji: '🍦', price: 350, prepTime: 3 },
    // BEBIDAS
    { id: 'batidos', name: 'Batidos Naturales', description: 'Batido de frutas naturales (mango, plátano, papaya).', categoryId: 'bebidas', emoji: '🥤', price: 600, prepTime: 5 },
    { id: 'colada', name: 'Colada', description: 'Café cubano tradicional, 4 pocillos.', categoryId: 'bebidas', emoji: '☕', price: 600, prepTime: 5 },
    { id: 'malteada', name: 'Malteada', description: 'Malteada cremosa de chocolate, fresa o vainilla.', categoryId: 'bebidas', emoji: '🥤', price: 650, prepTime: 5 },
    { id: 'limonada', name: 'Limonada', description: 'Limonada fresca con o sin menta.', categoryId: 'bebidas', emoji: '🍋', price: 500, prepTime: 3 },
    { id: 'limonada_brasilera', name: 'Limonada Brasilera', description: 'Limonada cremosa con leche condensada.', categoryId: 'bebidas', emoji: '🍋', price: 600, prepTime: 3 },
    { id: 'smoothie', name: 'Smoothie', description: 'Smoothie de frutas tropicales.', categoryId: 'bebidas', emoji: '🥤', price: 700, prepTime: 5 },
    { id: 'batido_nutella', name: 'Batido de Nutella', description: 'Batido cremoso con crema de cacao.', categoryId: 'bebidas', emoji: '🥤', price: 700, prepTime: 5 },
    { id: 'jugos', name: 'Jugos Naturales', description: 'Jugos naturales de frutas de la temporada.', categoryId: 'bebidas', emoji: '🧃', price: 400, prepTime: 3 },
    { id: 'refrescos', name: 'Refresco de Lata', description: 'Lata de refresco nacional 350ml.', categoryId: 'bebidas', emoji: '🥤', price: 550, prepTime: 1 },
    { id: 'cerveza', name: 'Cerveza', description: 'Cerveza nacional lata 355ml.', categoryId: 'bebidas', emoji: '🍺', price: 600, prepTime: 1 },
    { id: 'malta', name: 'Malta', description: 'Malta fría 350ml.', categoryId: 'bebidas', emoji: '🍺', price: 600, prepTime: 1 },
    // COMBOS
    { id: 'combo_familiar', name: 'Combo Familiar', description: 'Pizza familiar 42×30 + 2 bebidas + 1 postre.', categoryId: 'combos', emoji: '🎉', price: 3200, prepTime: 25, isCombo: true, comboItems: JSON.stringify(['pizza_especial', 'refrescos', 'refrescos', 'helados']) },
    { id: 'combo_duo', name: 'Combo Duo', description: '2 pizzas medianas 25cm + 1 bebida grande.', categoryId: 'combos', emoji: '🎉', price: 2900, prepTime: 25, isCombo: true, comboItems: JSON.stringify(['pizza_muzzarella', 'pizza_especial', 'malteada']) },
  ];

  // Generar IDs estables a partir del campo id (que ya viene como slug explícito)
  for (const p of products) {
    await db.product.create({ data: p });
  }
  console.log(`✓ ${products.length} productos`);

  // 6. Empleados (con passwords hasheadas)
  const adminPerms = JSON.stringify({
    ver_pedidos: true, crear_combos: true, cambiar_estados: true,
    cambiar_precios: true, gestionar_productos: true, gestionar_empleados: true,
    gestionar_domicilio: true, ver_dashboard: true,
  });
  const cocinaPerms = JSON.stringify({
    ver_pedidos: true, crear_combos: true, cambiar_estados: true,
    cambiar_precios: false, gestionar_productos: false, gestionar_empleados: false,
    gestionar_domicilio: false, ver_dashboard: false,
  });
  const repartoPerms = JSON.stringify({
    ver_pedidos: true, crear_combos: false, cambiar_estados: true,
    cambiar_precios: false, gestionar_productos: false, gestionar_empleados: false,
    gestionar_domicilio: false, ver_dashboard: false,
  });

  await db.employee.create({
    data: {
      id: 'emp_admin',
      name: 'Administrador',
      phone: '+53 55000000',
      username: 'admin',
      passwordHash: hashPasswordServer('admin123'),
      role: 'admin',
      active: true,
      permissions: adminPerms,
    },
  });
  await db.employee.create({
    data: {
      id: 'emp_cocina',
      name: 'Chef Cocina',
      phone: '+53 55000001',
      username: 'cocina',
      passwordHash: hashPasswordServer('cocina123'),
      role: 'cocina',
      active: true,
      permissions: cocinaPerms,
    },
  });
  await db.employee.create({
    data: {
      id: 'emp_reparto',
      name: 'Repartidor Juan',
      phone: '+53 55000002',
      username: 'reparto',
      passwordHash: hashPasswordServer('reparto123'),
      role: 'repartidor',
      active: true,
      permissions: repartoPerms,
    },
  });
  console.log('✓ 3 empleados (admin, cocina, reparto)');

  // 7. Números de WhatsApp
  await db.whatsAppNumber.create({ data: { number: '+53 55000000', name: 'WhatsApp Principal', function: 'pedidos', active: true } });
  await db.whatsAppNumber.create({ data: { number: '+53 55000001', name: 'Cocina', function: 'cocina', active: true } });
  await db.whatsAppNumber.create({ data: { number: '+53 55000002', name: 'Reparto', function: 'reparto', active: true } });
  console.log('✓ 3 números de WhatsApp');

  // 8. Plantillas de mensajes automáticos
  const now = Date.now();
  const oneWeek = 7 * 24 * 60 * 60 * 1000;
  await db.whatsAppTemplate.create({
    data: {
      event: 'nuevo_pedido',
      template: '🆕 *Nuevo pedido recibido*\n\nCliente: {cliente}\nCódigo: {codigo}\nTotal: {total}\nHorario: {horario}',
      active: true,
    },
  });
  await db.whatsAppTemplate.create({
    data: {
      event: 'pedido_confirmado',
      template: '✅ *Tu pedido ha sido confirmado*\n\nHola {cliente}, confirmamos tu pedido {codigo}.\nCosto domicilio: {domicilio}\nTotal a pagar: {total}\nEntrega estimada: {horario}',
      active: true,
    },
  });
  await db.whatsAppTemplate.create({
    data: {
      event: 'pedido_listo',
      template: '📦 *Tu pedido está listo*\n\nHola {cliente}, tu pedido {codigo} ya está listo para entrega/recogida.',
      active: true,
    },
  });
  await db.whatsAppTemplate.create({
    data: {
      event: 'pedido_entregado',
      template: '🎉 *Pedido entregado*\n\nHola {cliente}, tu pedido {codigo} fue entregado correctamente. ¡Gracias por comprar en LOS COMPAS!',
      active: true,
    },
  });
  console.log('✓ 4 plantillas de mensajes WhatsApp');

  // 9. Promociones semilla
  await db.promotion.create({
    data: {
      id: 'promo_2x1_pizzas',
      name: '2x1 en Pizzas Medianas',
      description: 'Compra 2 pizzas medianas 25cm y llévate 2 (¡la 2da es gratis!).',
      emoji: '🍕',
      type: 'bundle',
      value: 0,
      bundleBuyQty: 1,
      bundleGetQty: 1,
      validFrom: new Date(now),
      validTo: new Date(now + oneWeek * 4),
      active: true,
      code: '2X1PIZZA',
      appliesTo: 'category',
      categoryId: 'pizzas',
    },
  });
  await db.promotion.create({
    data: {
      id: 'promo_miercoles_15',
      name: 'Miércoles Promocional -15%',
      description: '15% de descuento en todo tu pedido. Solo con código PROMO15.',
      emoji: '🎉',
      type: 'percent',
      value: 15,
      validFrom: new Date(now),
      validTo: new Date(now + oneWeek * 8),
      active: true,
      code: 'PROMO15',
      appliesTo: 'all',
    },
  });
  await db.promotion.create({
    data: {
      id: 'promo_bebida_gratis',
      name: 'Bebida gratis en pedidos +3000 CUP',
      description: 'En pedidos superiores a 3000 CUP, te regalamos un refresco.',
      emoji: '🥤',
      type: 'free_product',
      value: 3000,
      freeProductId: 'refrescos',
      validFrom: new Date(now),
      validTo: new Date(now + oneWeek * 4),
      active: true,
      appliesTo: 'all',
    },
  });
  console.log('✓ 3 promociones semilla');

  console.log('\n✅ Seed del backend completo!');
  console.log('   Cuentas demo:');
  console.log('   - admin / admin123 (panel admin)');
  console.log('   - cocina / cocina123 (panel cocina)');
  console.log('   - reparto / reparto123 (panel reparto)');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
