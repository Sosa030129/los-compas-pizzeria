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

# Crear tablas en PostgreSQL
npx prisma db push --accept-data-loss

# Seed en JS puro
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
(async () => {
  const db = new PrismaClient();
  try {
    await db.businessConfig.upsert({ where:{id:'1'}, update:{}, create:{id:'1',name:'LOS COMPAS',city:'Sancti Spíritus, Cuba',currency:'CUP',logo:'/logo.png',phone:'+53 55000000',address:'Sancti Spíritus, Cuba',deliveryBase:250,morningStart:'08:00',morningEnd:'10:30',morningDelivery:'12:30 PM - 01:00 PM',afternoonStart:'13:00',afternoonEnd:'16:30',afternoonDelivery:'06:30 PM - 07:00 PM',transferSurcharge:0.30}});
    for (const c of [['pizzas','Pizzas','🍕',1],['comidas','Comidas','🌮',2],['postres','Postres','🍩',3],['bebidas','Bebidas','🥤',4],['combos','Combos','🎉',5]]) {
      await db.category.upsert({where:{id:c[0]},update:{},create:{id:c[0],name:c[1],emoji:c[2],visible:true,order:c[3]}});
    }
    const sizes=[['pequena_20','Pequeña 20cm',800,1],['mediana_25','Mediana 25cm',1200,2],['grande_30','Grande 30cm',1600,3],['rect_30x20','Rect. Pequeña 30×20cm',1400,4],['rect_35x40','Rect. Mediana 35×40cm',2000,5],['familiar_42x30','Familiar 42×30cm',2200,6],['extra_46x36','Extra Familiar 46×36cm',2600,7]];
    for (const s of sizes) { await db.sizeOption.upsert({where:{sizeId:s[0]},update:{basePrice:s[2]},create:{sizeId:s[0],label:s[1],basePrice:s[2],order:s[3]}}); }
    const ap=JSON.stringify({ver_pedidos:true,crear_combos:true,cambiar_estados:true,cambiar_precios:true,gestionar_productos:true,gestionar_empleados:true,gestionar_domicilio:true,ver_dashboard:true});
    await db.employee.upsert({where:{id:'emp_admin'},update:{passwordHash:await hash('admin123')},create:{id:'emp_admin',name:'Administrador',phone:'+53 55000000',username:'admin',passwordHash:await hash('admin123'),role:'admin',permissions:ap}});
    await db.employee.upsert({where:{id:'emp_cocina'},update:{passwordHash:await hash('cocina123')},create:{id:'emp_cocina',name:'Chef Cocina',phone:'+53 55000001',username:'cocina',passwordHash:await hash('cocina123'),role:'cocina',permissions:JSON.stringify({ver_pedidos:true,crear_combos:true,cambiar_estados:true,cambiar_precios:false,gestionar_productos:false,gestionar_empleados:false,gestionar_domicilio:false,ver_dashboard:false})}});
    await db.employee.upsert({where:{id:'emp_reparto'},update:{passwordHash:await hash('reparto123')},create:{id:'emp_reparto',name:'Repartidor Juan',phone:'+53 55000002',username:'reparto',passwordHash:await hash('reparto123'),role:'repartidor',permissions:JSON.stringify({ver_pedidos:true,crear_combos:false,cambiar_estados:true,cambiar_precios:false,gestionar_productos:false,gestionar_empleados:false,gestionar_domicilio:false,ver_dashboard:false})}});
    for (const w of [['+53 55000000','WhatsApp Principal','pedidos'],['+53 55000001','Cocina','cocina'],['+53 55000002','Reparto','reparto']]) {
      const ex=await db.whatsAppNumber.findFirst({where:{number:w[0]}});
      if(!ex) await db.whatsAppNumber.create({data:{number:w[0],name:w[1],function:w[2],active:true}});
    }
    for (const t of [['nuevo_pedido','🆕 *Nuevo pedido*\\n\\nCliente: {cliente}\\nCódigo: {codigo}\\nTotal: {total}\\nHorario: {horario}'],['pedido_confirmado','✅ *Pedido confirmado*\\n\\nHola {cliente}, confirmamos tu pedido {codigo}.\\nDomicilio: {domicilio}\\nTotal: {total}\\nEntrega: {horario}'],['pedido_listo','📦 *Tu pedido está listo*\\n\\nHola {cliente}, tu pedido {codigo} ya está listo.'],['pedido_entregado','🎉 *Pedido entregado*\\n\\nHola {cliente}, tu pedido {codigo} fue entregado. ¡Gracias!']]) {
      const ex=await db.whatsAppTemplate.findUnique({where:{event:t[0]}});
      if(!ex) await db.whatsAppTemplate.create({data:{event:t[0],template:t[1],active:true}});
    }
    console.log('✅ Seed OK');
  } catch(e) { console.log('Seed:',e.message); }
  await db.\$disconnect();
})();
" 2>&1 || echo "Seed omitido"

# Construir Next.js (sin standalone - usa next start)
npm run build

echo "✅ Build completado!"
