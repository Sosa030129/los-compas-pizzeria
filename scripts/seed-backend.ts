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

  // 3. Tamaños de pizza
  const sizes = [
    { sizeId: 'pequena_20', label: 'Pequeña 20cm', basePrice: 800, order: 1 },
    { sizeId: 'mediana_25', label: 'Mediana 25cm', basePrice: 1200, order: 2 },
    { sizeId: 'grande_30', label: 'Grande 30cm', basePrice: 1600, order: 3 },
    { sizeId: 'rect_30x20', label: 'Rect. Pequeña 30×20cm', basePrice: 1400, order: 4 },
    { sizeId: 'rect_35x40', label: 'Rect. Mediana 35×40cm', basePrice: 2000, order: 5 },
    { sizeId: 'familiar_42x30', label: 'Familiar 42×30cm', basePrice: 2200, order: 6 },
    { sizeId: 'extra_46x36', label: 'Extra Familiar 46×36cm', basePrice: 2600, order: 7 },
  ];
  await Promise.all(sizes.map((s) => db.sizeOption.create({ data: s })));
  console.log(`✓ ${sizes.length} tamaños de pizza`);

  // 4. Ingredientes
  const ingredients = [
    { name: 'Queso extra', emoji: '🧀', color: '#ffd966', priceBySize: JSON.stringify({ pequena_20: 250, mediana_25: 350, grande_30: 450, rect_30x20: 400, rect_35x40: 550, familiar_42x30: 700, extra_46x36: 800 }) },
    { name: 'Jamón', emoji: '🍖', color: '#e07a6b', priceBySize: JSON.stringify({ pequena_20: 220, mediana_25: 320, grande_30: 420, rect_30x20: 380, rect_35x40: 520, familiar_42x30: 580, extra_46x36: 680 }) },
    { name: 'Salchicha', emoji: '🌭', color: '#b8302a', priceBySize: JSON.stringify({ pequena_20: 230, mediana_25: 330, grande_30: 430, rect_30x20: 390, rect_35x40: 540, familiar_42x30: 600, extra_46x36: 700 }) },
    { name: 'Piña', emoji: '🍍', color: '#f6c945', priceBySize: JSON.stringify({ pequena_20: 200, mediana_25: 280, grande_30: 360, rect_30x20: 320, rect_35x40: 440, familiar_42x30: 500, extra_46x36: 580 }) },
    { name: 'Cebolla', emoji: '🧅', color: '#f0e3c4', priceBySize: JSON.stringify({ pequena_20: 150, mediana_25: 200, grande_30: 250, rect_30x20: 220, rect_35x40: 300, familiar_42x30: 350, extra_46x36: 400 }) },
    { name: 'Vegetales', emoji: '🥬', color: '#3a7a2b', priceBySize: JSON.stringify({ pequena_20: 180, mediana_25: 240, grande_30: 300, rect_30x20: 280, rect_35x40: 380, familiar_42x30: 450, extra_46x36: 520 }) },
    { name: 'Champiñones', emoji: '🍄', color: '#c4a080', priceBySize: JSON.stringify({ pequena_20: 200, mediana_25: 280, grande_30: 360, rect_30x20: 320, rect_35x40: 440, familiar_42x30: 500, extra_46x36: 580 }) },
    { name: 'Ají', emoji: '🌶️', color: '#d23a3a', priceBySize: JSON.stringify({ pequena_20: 150, mediana_25: 200, grande_30: 250, rect_30x20: 220, rect_35x40: 300, familiar_42x30: 350, extra_46x36: 400 }) },
  ];
  await Promise.all(ingredients.map((i) => db.ingredient.create({ data: i })));
  console.log(`✓ ${ingredients.length} ingredientes`);

  // 5. Productos (incluyendo pizzas y combos)
  const products = [
    // PIZZAS
    { name: 'Pizza Personalizada', description: 'Pizza armada por el cliente con ingredientes a elección.', categoryId: 'pizzas', emoji: '🍕', price: 0, prepTime: 22, isPizza: true, defaultSize: 'familiar_42x30', defaultIngredients: JSON.stringify(['queso']) },
    { name: 'Pizza Muzzarella', description: 'Clásica: masa artesanal, salsa de tomate y queso fundido.', categoryId: 'pizzas', emoji: '🍕', price: 0, prepTime: 20, isPizza: true, defaultSize: 'familiar_42x30', defaultIngredients: JSON.stringify(['queso']) },
    { name: 'Pizza Especial', description: 'Queso, jamón y salchicha. La favorita de la casa.', categoryId: 'pizzas', emoji: '🍕', price: 0, prepTime: 22, isPizza: true, defaultSize: 'familiar_42x30', defaultIngredients: JSON.stringify(['queso', 'jamon', 'salchicha']) },
    { name: 'Pizza Hawaiana', description: 'Jamón, piña y queso. Dulce y salada a la vez.', categoryId: 'pizzas', emoji: '🍕', price: 0, prepTime: 22, isPizza: true, defaultSize: 'familiar_42x30', defaultIngredients: JSON.stringify(['queso', 'jamon', 'pina']) },
    { name: 'Pizza Vegetal', description: 'Vegetales frescos, cebolla y champiñones.', categoryId: 'pizzas', emoji: '🍕', price: 0, prepTime: 25, isPizza: true, defaultSize: 'familiar_42x30', defaultIngredients: JSON.stringify(['queso', 'vegetales', 'cebolla', 'champinones']) },
    // COMIDAS
    { name: 'Tacos de Salchicha', description: '4 tacos crujientes rellenos de salchicha.', categoryId: 'comidas', emoji: '🌮', price: 750, prepTime: 15 },
    { name: 'Tacos de Jamón', description: '4 tacos crujientes rellenos de jamón.', categoryId: 'comidas', emoji: '🌮', price: 750, prepTime: 15 },
    { name: 'Empanadas de Queso', description: '6 empanadas crujientes con queso fundido.', categoryId: 'comidas', emoji: '🥟', price: 700, prepTime: 18 },
    { name: 'Espaguetis', description: 'Pasta italiana con salsa de tomate y queso.', categoryId: 'comidas', emoji: '🍝', price: 1100, prepTime: 20 },
    { name: 'Tostones Normales', description: 'Plátano verde frito, crujiente y salado.', categoryId: 'comidas', emoji: '🍌', price: 350, prepTime: 12 },
    { name: 'Tostones de Ajo', description: 'Tostones con aliño de ajo y hierbas.', categoryId: 'comidas', emoji: '🍌', price: 450, prepTime: 12 },
    { name: 'Tostones Rellenos', description: 'Tostones rellenos de jamón y queso.', categoryId: 'comidas', emoji: '🍌', price: 650, prepTime: 15 },
    // POSTRES
    { name: 'Donas', description: '2 donas glaseadas, suaves y esponjosas.', categoryId: 'postres', emoji: '🍩', price: 400, prepTime: 5 },
    { name: 'Berlinesas con Nutella', description: '2 berlinesas rellenas de crema de cacao.', categoryId: 'postres', emoji: '🍫', price: 550, prepTime: 5 },
    { name: 'Rosquitas', description: '6 rosquitas crujientes tradicionales.', categoryId: 'postres', emoji: '🍩', price: 350, prepTime: 5 },
    { name: 'Helados', description: 'Copa de helado, sabor a elegir.', categoryId: 'postres', emoji: '🍦', price: 500, prepTime: 3 },
    // BEBIDAS
    { name: 'Batidos', description: 'Batido de frutas naturales (mango, plátano, papaya).', categoryId: 'bebidas', emoji: '🥤', price: 350, prepTime: 5 },
    { name: 'Coladas', description: 'Café cubano tradicional, 4 pocillos.', categoryId: 'bebidas', emoji: '☕', price: 200, prepTime: 5 },
    { name: 'Malteadas', description: 'Malteada cremosa de chocolate, fresa o vainilla.', categoryId: 'bebidas', emoji: '🥤', price: 450, prepTime: 5 },
    { name: 'Limonadas', description: 'Limonada fresca con o sin menta.', categoryId: 'bebidas', emoji: '🍋', price: 250, prepTime: 3 },
    { name: 'Smoothies', description: 'Smoothie de frutas tropicales.', categoryId: 'bebidas', emoji: '🥤', price: 400, prepTime: 5 },
    { name: 'Jugos Naturales', description: 'Jugos naturales de frutas de la temporada.', categoryId: 'bebidas', emoji: '🧃', price: 250, prepTime: 3 },
    { name: 'Refrescos', description: 'Lata de refresco nacional 350ml.', categoryId: 'bebidas', emoji: '🥤', price: 200, prepTime: 1 },
    { name: 'Malta', description: 'Malta fría 350ml.', categoryId: 'bebidas', emoji: '🍺', price: 250, prepTime: 1 },
    { name: 'Cerveza', description: 'Cerveza nacional lata 355ml.', categoryId: 'bebidas', emoji: '🍺', price: 350, prepTime: 1 },
    // COMBOS
    { name: 'Combo Familiar', description: 'Pizza familiar 42×30 + 2 bebidas + 1 postre.', categoryId: 'combos', emoji: '🎉', price: 3200, prepTime: 25, isCombo: true, comboItems: JSON.stringify(['pizza_especial', 'refrescos', 'refrescos', 'helados']) },
    { name: 'Combo Duo', description: '2 pizzas medianas 25cm + 1 bebida grande.', categoryId: 'combos', emoji: '🎉', price: 2900, prepTime: 25, isCombo: true, comboItems: JSON.stringify(['pizza_muzzarella', 'pizza_especial', 'malteadas']) },
  ];

  // Generar IDs estables basados en nombre para que las promociones funcionen
  // (usamos el slug como ID)
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  for (const p of products) {
    const id = slug(p.name);
    await db.product.create({ data: { id, ...p } });
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
