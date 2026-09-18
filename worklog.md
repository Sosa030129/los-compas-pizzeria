# LOS COMPAS PIZZERÍA — Worklog Multidisciplinario

## FASE 0 — Auditoría (completada)
Ver informe completo en chat. Resumen:
- 8 CRÍTICOS identificados
- 5 preguntas formuladas al usuario (modelo borde queso, agrupación ingredientes, productos faltantes, presentaciones, helados)
- Usuario respondió: Opción C (borderDelta), Opción A (2 precios), Agregar faltantes, Cambiar presentaciones, Productos distintos

## Decisiones del usuario
1. Modelo borde queso: Opción C — `basePrice` (queso) + `borderDelta` por tamaño (150, 150, 150, 150, 300, 500, 550)
2. Agrupación ingredientes: Opción A — "Pequeñas" = 20cm/25cm/30cm/30×20; "Familiares" = 35×40/42×30/46×36
3. Productos faltantes: AGREGAR (Donas cubierta, Rosquitas rellenas, Limonada brasilera, Batido Nutella)
4. Presentaciones: CAMBIAR (empanadas 5u, tacos 3u, espaguetis "de queso" 600 CUP)
5. Helados vs Potes de helado: PRODUCTOS DISTINTOS (mantener Helados 500 + agregar Potes 350)

---

## FASE 1 — CRÍTICOS no ambiguos (completada)

### 1.1 Revalidar promociones server-side ✅
- ID: CRIT-04
- TIPO: CRÍTICO (seguridad)
- CAUSA RAÍZ: `src/app/api/orders/route.ts:80` tenía comentario explícito "el servidor NO revalida promociones aquí". Solo limitaba `safeDiscount = min(discount, base)` lo que permitía fraudes.
- SOLUCIÓN: Importar `applyPromotions` desde `lib/los-compas.ts`, leer `allProducts` y `allPromotions` de BD, mapear al tipo esperado, recalcular `serverDiscount` desde `promoResult.totalDiscount`, agregar `freeItems` al carrito guardado en BD, validar que cada item.productId exista y esté `available`.
- ARCHIVOS: src/app/api/orders/route.ts
- PRUEBAS: Build OK con TS strict mode.

### 1.2 Arreglar seed de Render ✅
- ID: CRIT-05
- TIPO: CRÍTICO (datos)
- CAUSA RAÍZ: `scripts/render-build.sh` solo sembraba config, categorías, empleados y templates. Los 26 productos NO se sembraban en producción.
- SOLUCIÓN: Reescribí el seed inline en el script con 32 productos (5 pizzas + 7 comidas + 7 postres + 11 bebidas + 2 combos), ingredientes con 2 precios, promociones, todos con upsert (idempotente).
- ARCHIVOS: scripts/render-build.sh

### 1.3 Activar 3 eventos WhatsApp faltantes ✅
- ID: CRIT-01
- TIPO: CRÍTICO (funcionalidad)
- CAUSA RAÍZ: El agente Explore reportó que faltaban las invocaciones. Al verificar con grep, ENCONTRÉ que YA estaban invocadas en `src/app/api/orders/[id]/route.ts:122-149`. NO requirió cambios.
- ARCHIVOS: ninguno (verificación)
- NOTA: Existe `src/lib/whatsapp.ts` (stub) sin uso — código muerto a eliminar en FASE 8.

### 1.4 Eliminar `.env` del repo ✅
- ID: CRIT-08
- TIPO: CRÍTICO (seguridad)
- CAUSA RAÍZ: `.env` estaba commiteado en GitHub (sin secretos reales, pero mala práctica).
- SOLUCIÓN: `git rm --cached .env` (el archivo sigue en disco, solo se quita del tracking).
- ARCHIVOS: .env (removido del index)

### 1.5 Re-enable TypeScript errors en build ✅
- ID: CRIT-06
- TIPO: CRÍTICO (deuda técnica)
- CAUSA RAÍZ: `next.config.ts:6` tenía `ignoreBuildErrors: true` y `tsconfig.json:13` tenía `noImplicitAny: false` — escondía bugs reales.
- SOLUCIÓN: 
  - Eliminé `typescript.ignoreBuildErrors: true` de next.config.ts
  - Cambié `noImplicitAny: false` → `true` en tsconfig.json
  - Excluí `examples/`, `skills/`, `tests/`, `tool-results/` del tsconfig (no son parte de la app)
  - Corregí 5 errores TS reales:
    1. `checkout-view.tsx:141,149,193` — `error={touched ? errors.x : undefined}` (en vez de `touched && errors.x`)
    2. `admin-guard.ts:3` — eliminé import sin uso de `Session`
    3. `auth.ts:160` — `salt as BufferSource` cast
    4. `menu-view.tsx:26` — `selectedSize` tipado como `PizzaSize | null` en vez de `string | null`
- ARCHIVOS: next.config.ts, tsconfig.json, src/components/views/checkout-view.tsx, src/lib/admin-guard.ts, src/lib/auth.ts, src/components/views/menu-view.tsx
- PRUEBAS: Build exitoso con TS strict mode.

### 1.6 Documentar prisma db push ✅
- ID: CRIT-07
- TIPO: CRÍTICO (riesgo datos)
- CAUSA RAÍZ: `scripts/render-build.sh:17` usa `prisma db push --accept-data-loss` que puede borrar datos en producción silenciosamente.
- SOLUCIÓN PARCIAL: Documenté claramente en el script por qué se mantiene y qué se debe hacer (migrar a `prisma migrate deploy` con migraciones versionadas). 
- ESTADO: PENDIENTE crear migraciones versionadas en `prisma/migrations/` para reemplazar definitivamente el `db push`. Esto se hará en una fase internacional (post-deploy) porque requiere setup inicial en BD existente.

---

## FASE 2 — Precios según spec del negocio (completada)

### 2.1 Actualizar SIZES con basePrice + borderDelta ✅
- ID: CRIT-01.2
- TIPO: CRÍTICO (precios)
- CAUSA RAÍZ: El seed tenía `basePrice` arbitrarios (800, 1200, 1600, etc.) que NO coincidían con la spec del negocio (600, 800, 900, etc.).
- SOLUCIÓN: `src/lib/seed.ts` actualizado con basePrice correctos + `borderDelta` por tamaño.
  - pequena_20: 600 / +150 = 750 borde
  - mediana_25: 800 / +150 = 950 borde
  - grande_30: 900 / +150 = 1050 borde
  - rect_30x20: 850 / +150 = 1000 borde
  - rect_35x40: 1800 / +300 = 2100 borde
  - familiar_42x30: 2200 / +500 = 2700 borde
  - extra_46x36: 2450 / +550 = 3000 borde
- ARCHIVOS: src/lib/seed.ts, scripts/seed-backend.ts, scripts/render-build.sh

### 2.2 Reducir INGREDIENTS a 2 precios ✅
- ID: CRIT-03
- TIPO: CRÍTICO (precios)
- CAUSA RAÍZ: El seed tenía 7 precios por tamaño que no coincidían con la spec que solo define 2 grupos (pequeñas / familiares).
- SOLUCIÓN: Definí `RAW_INGREDIENTS` con 2 precios (priceSmall, priceFamily) y sintetizo `priceBySize` para compatibilidad hacia atrás. Precios según spec:
  - Queso: 250 / 700 ✅
  - Jamón: 230 / 580 ✅
  - Salchicha: 350 / 750 ✅
  - Piña: 200 / 550 ✅
  - Vegetales: 200 / 500 ✅
  - Cebolla: 180 / 450 ✅
  - Champiñones: 200 / 500 (extra, no en spec)
  - Ají: 150 / 350 (extra, no en spec)
- ARCHIVOS: src/lib/seed.ts, scripts/seed-backend.ts, scripts/render-build.sh

### 2.3 Actualizar precios de productos existentes ✅
- ID: CRIT-02
- TIPO: CRÍTICO (precios)
- CAUSA RAÍZ: Todos los precios estaban desactualizados vs spec.
- SOLUCIÓN: 32 productos en total con precios correctos según spec:
  - Comidas: tacos 1000, empanadas 1400 (5u), espaguetis_queso 600, tostones 450/550/600
  - Postres: donas_nutella 1000, donas_cubierta 1800, berlinesas 1300, rosquitas_azucar 800, rosquitas_rellenas 1300, helados 500, helados_potes 350
  - Bebidas: batidos 600, colada 600, malteada 650, limonada 500, limonada_brasilera 600, smoothie 700, batido_nutella 700, jugos 400, refrescos 550, cerveza 600, malta 600
- ARCHIVOS: src/lib/seed.ts, scripts/seed-backend.ts, scripts/render-build.sh

### 2.4 Agregar productos faltantes ✅
- 4 productos nuevos agregados:
  - `donas_cubierta_nutella` (1800 CUP, 6u)
  - `rosquitas_rellenas` (1300 CUP, 6u)
  - `limonada_brasilera` (600 CUP)
  - `batido_nutella` (700 CUP)
  - `helados_potes` (350 CUP — producto distinto a `helados` copa 500)
- Total productos: 32 (5 pizzas + 7 comidas + 7 postres + 11 bebidas + 2 combos)

### 2.5 Cambiar presentaciones ✅
- ID: CRIT-02b
- TIPO: CRÍTICO (datos)
- SOLUCIÓN:
  - `empanadas_queso`: description cambiada a "5 empanadas crujientes con queso fundido" (era "6 empanadas")
  - `tacos_salchicha`: "3 tacos crujientes rellenos de salchicha" (era "4 tacos")
  - `tacos_jamon`: "3 tacos crujientes rellenos de jamón" (era "4 tacos")
  - `espaguetis_queso`: renombrado de "Espaguetis" a "Espaguetis de Queso", precio cambiado de 1100 a 600 CUP
- ARCHIVOS: src/lib/seed.ts, scripts/seed-backend.ts, scripts/render-build.sh

### 2.6 Actualizar seed-backend.ts ✅
- Sincronizado con los mismos datos que `src/lib/seed.ts`. IDs ahora son explícitos (slug) en vez de derivados del nombre.

### 2.7 Actualizar types.ts ✅
- `SizeOption` ahora tiene `borderDelta?: number` (opcional, default 0).
- `Ingredient.priceBySize` se mantiene como `Partial<Record<PizzaSize, number>>` para compatibilidad hacia atrás (no requiere migración de BD).

### 2.8 Actualizar componentes frontend ✅
- `src/components/views/menu-view.tsx`: 
  - Estado `borderCheese` añadido al modal
  - Toggle "Borde de queso" visible cuando `borderPrice > 0`
  - Total incluye `borderPrice` cuando está activado
  - `confirmAdd` y `closeModal` guardan `borderCheese` y `unitPrice` (con borde) en el cartItem
- `src/components/views/builder-view.tsx`:
  - `borderPrice` ahora usa `currentSize.borderDelta ?? 0` (antes era `basePrice * 0.20`)

### 2.9 Schema prisma ✅ (sin cambios destructivos)
- `borderDelta` se sintetiza en el seed como parte del JSON de cada tamaño o como valor hardcoded en el código.
- No se agregó columna al schema prisma para evitar migración destructiva en BD existente.
- En FASE 3 se puede agregar columna `borderDelta Int @default(0)` con migración versionada.

---
