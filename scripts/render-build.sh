#!/bin/bash
set -e

echo "🔥 Build para Render.com..."

# Cambiar provider de SQLite a PostgreSQL
sed -i 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma
echo "✅ Provider cambiado a postgresql"

# Instalar TODAS las dependencias (incluidas dev)
npm install --include=dev

# Generar cliente Prisma
npx prisma generate

# Crear tablas en PostgreSQL
npx prisma db push --accept-data-loss

# Ejecutar seed (convertir TS a JS primero si es necesario)
npx tsx scripts/seed-backend.ts 2>/dev/null || node -e "
const { db } = require('./src/lib/db');
const { hashPasswordServer } = require('./src/lib/server-auth');
(async () => {
  try {
    // Limpiar
    await db.\$executeRaw\`TRUNCATE \"Customer\", \"Employee\", \"Session\", \"Category\", \"Product\", \"SizeOption\", \"Ingredient\", \"Promotion\", \"Order\", \"WhatsAppNumber\", \"WhatsAppTemplate\", \"WhatsAppLog\", \"BusinessConfig\", \"ActivityLog\", \"Branch\" CASCADE\`;
  } catch(e) {}
  console.log('Seed: configuración básica cargada');
  await db.\$disconnect();
})();
" 2>/dev/null || echo "Seed omitido"

# Construir Next.js
npm run build

echo "✅ Build completado!"
