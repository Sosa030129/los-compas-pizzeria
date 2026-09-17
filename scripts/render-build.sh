#!/bin/bash
# Script de build para Render.com
# Cambia el provider de Prisma a postgresql y ejecuta todo

set -e

echo "🔥 Build para Render.com..."

# Cambiar provider de SQLite a PostgreSQL en el schema
sed -i 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma
echo "✅ Provider cambiado a postgresql"

# Instalar dependencias con npm (Render no tiene bun)
npm install

# Generar cliente Prisma
npx prisma generate

# Crear tablas en PostgreSQL
npx prisma db push --accept-data-loss

# Ejecutar seed
node scripts/seed-backend.js || npx tsx scripts/seed-backend.ts || echo "Seed omitido (ya existe)"

# Construir Next.js
npm run build

echo "✅ Build completado!"
