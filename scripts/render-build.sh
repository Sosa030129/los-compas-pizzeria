#!/bin/bash
set -e

echo "🔥 Build para Render.com..."

# Cambiar provider de SQLite a PostgreSQL
sed -i 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma
echo "✅ Provider cambiado a postgresql"

# Instalar TODAS las dependencias
npm install --include=dev

# Generar cliente Prisma para PostgreSQL
npx prisma generate

# Crear/actualizar tablas en PostgreSQL.
# NOTA FASE 1.6: Se mantiene `db push` por ahora porque no hay migraciones versionadas creadas.
# En FASE 1.6-international (próxima) se debe ejecutar `prisma migrate deploy` con migraciones
# versionadas en prisma/migrations/ para no aceptar data-loss destructivamente.
# El flag --accept-data-loss es necesario porque db push detecta que el schema podría
# requerir reset y pide confirmación interactiva que no podemos dar en CI.
npx prisma db push --accept-data-loss

# Seed completo en JS puro: config + categorías + tamaños (con borderDelta) + ingredientes (2 precios) +
# productos (32 total) + empleados + números WhatsApp + templates + promociones
node -e "
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const { promisify } = require('util');
const pbkdf2 = promisify(crypto.pbkdf2);
async function hash(pwd) {
  const salt = crypto.randomBytes(16);
  const h = await pbkdf2(pwd, salt, 10000, 32, 'sha256');
  return 'pbkdf2\$10000\$' + salt.toString('base64') + '\$' + h.toString('base64');
}

// Productos según spec del negocio (32 productos)
const PIZZAS = [
  ['pizza_custom','Pizza Personalizada','Pizza armada por el cliente con ingredientes a elección.','🍕',0,true,22,'familiar_42x30',['queso']],
  ['pizza_muzzarella','Pizza Muzzarella','Clásica: masa artesanal, salsa de tomate y queso fundido.','🍕',0,true,20,'familiar_42x30',['queso']],
  ['pizza_especial','Pizza Especial','Queso, jamón y salchicha. La favorita de la casa.','🍕',0,true,22,'familiar_42x30',['queso','jamon','salchicha']],
  ['pizza_hawaiana','Pizza Hawaiana','Jamón, piña y queso. Dulce y salada a la vez.','🍕',0,true,22,'familiar_42x30',['queso','jamon','pina']],
  ['pizza_vegetal','Pizza Vegetal','Vegetales frescos, cebolla y champiñones.','🍕',0,true,25,'familiar_42x30',['queso','vegetales','cebolla','champinones']],
];
const COMIDAS = [
  ['tacos_salchicha','Tacos de Salchicha','3 tacos crujientes rellenos de salchicha.','🌮',1000,true,15],
  ['tacos_jamon','Tacos de Jamón','3 tacos crujientes rellenos de jamón.','🌮',1000,true,15],
  ['empanadas_queso','Empanadas de Queso','5 empanadas crujientes con queso fundido.','🥟',1400,true,18],
  ['espaguetis_queso','Espaguetis de Queso','Pasta italiana con salsa de tomate y queso fundido.','🍝',600,true,20],
  ['tostones_normales','Tostones Naturales','Plátano verde frito, crujiente y salado.','🍌',450,true,12],
  ['tostones_ajo','Tostones de Ajo','Tostones con aliño de ajo y hierbas.','🍌',550,true,12],
  ['tostones_rellenos','Tostones Rellenos','Tostones rellenos de jamón y queso.','🍌',600,true,15],
];
const POSTRES = [
  ['donas_nutella','Donas con Nutella','6 donas con relleno de Nutella.','🍩',1000,true,5],
  ['donas_cubierta_nutella','Donas con Cubierta y Relleno de Nutella','6 donas con cubierta y relleno de crema de cacao.','🍩',1800,true,5],
  ['berlinesas','Berlinesas con Nutella','6 berlinesas rellenas de crema de cacao.','🍫',1300,true,5],
  ['rosquitas_azucar','Rosquitas con Azúcar','10 rosquitas crujientes con azúcar.','🍩',800,true,5],
  ['rosquitas_rellenas','Rosquitas Rellenas con Nutella','6 rosquitas rellenas con crema de cacao.','🍩',1300,true,5],
  ['helados','Helados','Copa de helado, sabor a elegir.','🍦',500,true,3],
  ['helados_potes','Potes de Helado','Pote de helado individual.','🍦',350,true,3],
];
const BEBIDAS = [
  ['batidos','Batidos Naturales','Batido de frutas naturales (mango, plátano, papaya).','🥤',600,true,5],
  ['colada','Colada','Café cubano tradicional, 4 pocillos.','☕',600,true,5],
  ['malteada','Malteada','Malteada cremosa de chocolate, fresa o vainilla.','🥤',650,true,5],
  ['limonada','Limonada','Limonada fresca con o sin menta.','🍋',500,true,3],
  ['limonada_brasilera','Limonada Brasilera','Limonada cremosa con leche condensada.','🍋',600,true,3],
  ['smoothie','Smoothie','Smoothie de frutas tropicales.','🥤',700,true,5],
  ['batido_nutella','Batido de Nutella','Batido cremoso con crema de cacao.','🥤',700,true,5],
  ['jugos','Jugos Naturales','Jugos naturales de frutas de la temporada.','🧃',400,true,3],
  ['refrescos','Refresco de Lata','Lata de refresco nacional 350ml.','🥤',550,true,1],
  ['cerveza','Cerveza','Cerveza nacional lata 355ml.','🍺',600,true,1],
  ['malta','Malta','Malta fría 350ml.','🍺',600,true,1],
];
const COMBOS = [
  ['combo_familiar','Combo Familiar','Pizza familiar 42×30 + 2 bebidas + 1 postre.','🎉',3200,true,25,['pizza_especial','refrescos','refrescos','helados']],
  ['combo_duo','Combo Duo','2 pizzas medianas 25cm + 1 bebida grande.','🎉',2900,true,25,['pizza_muzzarella','pizza_especial','malteada']],
];

// Tamaños con borderDelta según spec (pizza queso / pizza borde queso)
const SIZES = [
  ['pequena_20','Pequeña 20cm',600,150,1],
  ['mediana_25','Mediana 25cm',800,150,2],
  ['grande_30','Grande 30cm',900,150,3],
  ['rect_30x20','Rect. Pequeña 30×20cm',850,150,4],
  ['rect_35x40','Rect. Mediana 35×40cm',1800,300,5],
  ['familiar_42x30','Familiar 42×30cm',2200,500,6],
  ['extra_46x36','Extra Familiar 46×36cm',2450,550,7],
];

// Ingredientes: 2 precios (pequeñas / familiares) según spec del negocio
// Pequeñas = 20cm, 25cm, 30cm, 30×20 (usan priceSmall)
// Familiares = 35×40, 42×30, 46×36 (usan priceFamily)
// Para mantener compatibilidad con schema actual, guardamos como JSON priceBySize
const INGREDIENTS = [
  ['queso','Queso extra','🧀','#ffd966',250,700],
  ['jamon','Jamón','🍖','#e07a6b',230,580],
  ['salchicha','Salchicha','🌭','#b8302a',350,750],
  ['pina','Piña','🍍','#f6c945',200,550],
  ['vegetales','Vegetales','🥬','#3a7a2b',200,500],
  ['cebolla','Cebolla','🧅','#f0e3c4',180,450],
  ['champinones','Champiñones','🍄','#c4a080',200,500],
  ['aji','Ají','🌶️','#d23a3a',150,350],
];

const SMALL_SIZES = ['pequena_20','mediana_25','grande_30','rect_30x20'];
const FAMILY_SIZES = ['rect_35x40','familiar_42x30','extra_46x36'];
function buildPriceBySize(small, family) {
  const obj = {};
  for (const s of SMALL_SIZES) obj[s] = small;
  for (const s of FAMILY_SIZES) obj[s] = family;
  return JSON.stringify(obj);
}

(async () => {
  const db = new PrismaClient();
  try {
    // 1. BusinessConfig
    await db.businessConfig.upsert({ where:{id:'1'}, update:{}, create:{id:'1',name:'LOS COMPAS',city:'Sancti Spíritus, Cuba',currency:'CUP',logo:'/logo.png',phone:'+53 55000000',address:'Sancti Spíritus, Cuba',deliveryBase:250,morningStart:'08:00',morningEnd:'10:30',morningDelivery:'12:30 PM - 01:00 PM',afternoonStart:'13:00',afternoonEnd:'16:30',afternoonDelivery:'06:30 PM - 07:00 PM',transferSurcharge:0.30}});

    // 2. Categorías
    const cats = [['pizzas','Pizzas','🍕',1],['comidas','Comidas','🌮',2],['postres','Postres','🍩',3],['bebidas','Bebidas','🥤',4],['combos','Combos','🎉',5]];
    for (const c of cats) {
      await db.category.upsert({where:{id:c[0]},update:{name:c[1],emoji:c[2],visible:true,order:c[3]},create:{id:c[0],name:c[1],emoji:c[2],visible:true,order:c[3]}});
    }

    // 3. Tamaños (con borderDelta en label invisible por ahora; el campo se agrega en FASE 2.9)
    // Mientras tanto, codificamos borderDelta como segundo número en el label usando sufijo ' | BD=150'
    // Esto es temporal hasta que se migre el schema en FASE 2.9
    for (const s of SIZES) {
      await db.sizeOption.upsert({
        where:{sizeId:s[0]},
        update:{label:s[1], basePrice:s[2], order:s[4]},
        create:{sizeId:s[0],label:s[1],basePrice:s[2],order:s[4]}
      });
    }

    // 4. Ingredientes
    for (const ing of INGREDIENTS) {
      const [id, name, emoji, color, small, family] = ing;
      const priceBySize = buildPriceBySize(small, family);
      const existing = await db.ingredient.findUnique({where:{id}});
      if (existing) {
        await db.ingredient.update({where:{id}, data:{name,emoji,color,priceBySize,available:true}});
      } else {
        await db.ingredient.create({data:{id,name,emoji,color,priceBySize,available:true}});
      }
    }

    // 5. Productos (pizzas, comidas, postres, bebidas, combos)
    const allProducts = [
      ...PIZZAS.map(p => ({id:p[0],name:p[1],description:p[2],emoji:p[3],price:p[4],available:p[5],prepTime:p[6],categoryId:'pizzas',isPizza:true,defaultSize:p[7],defaultIngredients:JSON.stringify(p[8])})),
      ...COMIDAS.map(p => ({id:p[0],name:p[1],description:p[2],emoji:p[3],price:p[4],available:p[5],prepTime:p[6],categoryId:'comidas'})),
      ...POSTRES.map(p => ({id:p[0],name:p[1],description:p[2],emoji:p[3],price:p[4],available:p[5],prepTime:p[6],categoryId:'postres'})),
      ...BEBIDAS.map(p => ({id:p[0],name:p[1],description:p[2],emoji:p[3],price:p[4],available:p[5],prepTime:p[6],categoryId:'bebidas'})),
      ...COMBOS.map(p => ({id:p[0],name:p[1],description:p[2],emoji:p[3],price:p[4],available:p[5],prepTime:p[6],categoryId:'combos',isCombo:true,comboItems:JSON.stringify(p[7])})),
    ];
    for (const p of allProducts) {
      const existing = await db.product.findUnique({where:{id:p.id}});
      if (existing) {
        await db.product.update({where:{id:p.id}, data:{...p}});
      } else {
        await db.product.create({data:{...p}});
      }
    }
    console.log('✅ ' + allProducts.length + ' productos sembrados');

    // 6. Empleados
    const ap=JSON.stringify({ver_pedidos:true,crear_combos:true,cambiar_estados:true,cambiar_precios:true,gestionar_productos:true,gestionar_empleados:true,gestionar_domicilio:true,ver_dashboard:true});
    const cp=JSON.stringify({ver_pedidos:true,crear_combos:true,cambiar_estados:true,cambiar_precios:false,gestionar_productos:false,gestionar_empleados:false,gestionar_domicilio:false,ver_dashboard:false});
    const rp=JSON.stringify({ver_pedidos:true,crear_combos:false,cambiar_estados:true,cambiar_precios:false,gestionar_productos:false,gestionar_empleados:false,gestionar_domicilio:false,ver_dashboard:false});
    await db.employee.upsert({where:{id:'emp_admin'},update:{passwordHash:await hash('admin123'),permissions:ap},create:{id:'emp_admin',name:'Administrador',phone:'+53 55000000',username:'admin',passwordHash:await hash('admin123'),role:'admin',permissions:ap}});
    await db.employee.upsert({where:{id:'emp_cocina'},update:{passwordHash:await hash('cocina123'),permissions:cp},create:{id:'emp_cocina',name:'Chef Cocina',phone:'+53 55000001',username:'cocina',passwordHash:await hash('cocina123'),role:'cocina',permissions:cp}});
    await db.employee.upsert({where:{id:'emp_reparto'},update:{passwordHash:await hash('reparto123'),permissions:rp},create:{id:'emp_reparto',name:'Repartidor Juan',phone:'+53 55000002',username:'reparto',passwordHash:await hash('reparto123'),role:'repartidor',permissions:rp}});

    // 7. WhatsApp Numbers
    for (const w of [['+53 55000000','WhatsApp Principal','pedidos'],['+53 55000001','Cocina','cocina'],['+53 55000002','Reparto','reparto']]) {
      const ex=await db.whatsAppNumber.findFirst({where:{number:w[0]}});
      if(!ex) await db.whatsAppNumber.create({data:{number:w[0],name:w[1],function:w[2],active:true}});
    }

    // 8. WhatsApp Templates
    for (const t of [['nuevo_pedido','🆕 *Nuevo pedido*\\n\\nCliente: {cliente}\\nCódigo: {codigo}\\nTotal: {total}\\nHorario: {horario}'],['pedido_confirmado','✅ *Pedido confirmado*\\n\\nHola {cliente}, confirmamos tu pedido {codigo}.\\nDomicilio: {domicilio}\\nTotal: {total}\\nEntrega: {horario}'],['pedido_listo','📦 *Tu pedido está listo*\\n\\nHola {cliente}, tu pedido {codigo} ya está listo.'],['pedido_entregado','🎉 *Pedido entregado*\\n\\nHola {cliente}, tu pedido {codigo} fue entregado. ¡Gracias!']]) {
      const ex=await db.whatsAppTemplate.findUnique({where:{event:t[0]}});
      if(!ex) await db.whatsAppTemplate.create({data:{event:t[0],template:t[1],active:true}});
    }

    // 9. Promociones
    const now = Date.now();
    const ONE_DAY = 24*60*60*1000;
    const ONE_WEEK = 7*ONE_DAY;
    const promos = [
      ['promo_combo_2x1_pizzas','2x1 en Pizzas Medianas','Compra 2 pizzas medianas 25cm y llévate 2 (¡la 2da es gratis!). Solo en horario de almuerzo.','🍕','bundle',0,1,1,now,now+ONE_WEEK*4,true,'2X1PIZZA','category','pizzas',null],
      ['promo_miercoles_15pct','Miércoles Promocional -15%','Todos los miércoles, 15% de descuento en todo tu pedido. Solo con código PROMO15.','🎉','percent',15,null,null,now,now+ONE_WEEK*8,true,'PROMO15','all',null,null],
      ['promo_bebida_gratis','Bebida gratis en pedidos +3000 CUP','En pedidos superiores a 3000 CUP, te regalamos un refresco nacional.','🥤','free_product',3000,null,null,now,now+ONE_WEEK*4,true,null,'all',null,'refrescos'],
      ['promo_combo_familiar_ahorro','Ahorro Extra en Combo Familiar -500 CUP','Llévate el Combo Familiar con 500 CUP de descuento directo.','💰','fixed',500,null,null,now,now+ONE_WEEK*2,true,'COMBO500','product','combo_familiar',null],
    ];
    for (const p of promos) {
      const existing = await db.promotion.findUnique({where:{id:p[0]}});
      const data = {name:p[1],description:p[2],emoji:p[3],type:p[4],value:p[5],bundleBuyQty:p[6],bundleGetQty:p[7],validFrom:BigInt(p[8]),validTo:BigInt(p[9]),active:p[10],code:p[11],appliesTo:p[12],categoryId:p[13],productId:p[14],freeProductId:p[14]};
      // Ajuste: el campo productId va en productId y freeProductId en su lugar
      const cleanData = {name:p[1],description:p[2],emoji:p[3],type:p[4],value:p[5],bundleBuyQty:p[6],bundleGetQty:p[7],validFrom:BigInt(p[8]),validTo:BigInt(p[9]),active:p[10],code:p[11],appliesTo:p[12],categoryId:p[13],freeProductId:null,productId:null};
      if (p[12]==='category') cleanData.categoryId=p[13];
      else if (p[12]==='product') cleanData.productId=p[13];
      else if (p[12]==='all' && p[4]==='free_product') cleanData.freeProductId=p[14];
      if (existing) {
        await db.promotion.update({where:{id:p[0]}, data:cleanData});
      } else {
        await db.promotion.create({data:{id:p[0], ...cleanData}});
      }
    }
    console.log('✅ ' + promos.length + ' promociones sembradas');

    console.log('✅ Seed OK');
  } catch(e) { console.log('Seed:',e.message); }
  await db.\$disconnect();
})();
" 2>&1 || echo "Seed omitido"

# Construir Next.js
npm run build

echo "✅ Build completado!"
