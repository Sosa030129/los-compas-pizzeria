#!/bin/bash
# Script de inicialización para producción (Render.com)
# Se ejecuta automáticamente en el primer deploy
# Crea las tablas y llena con datos semilla

set -e

echo "🚀 Inicializando LOS COMPAS PIZZERÍA en producción..."

# Generar cliente Prisma
bun run db:generate

# Crear tablas (migración inicial)
bunx prisma db push --accept-data-loss

# Ejecutar seed del backend
bun scripts/seed-backend.ts

echo "✅ Inicialización completada!"
echo "   Cuentas demo:"
echo "   - admin / admin123"
echo "   - cocina / cocina123"
echo "   - reparto / reparto123"
