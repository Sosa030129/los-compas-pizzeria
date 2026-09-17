# 🍕 LOS COMPAS PIZZERÍA PWA — Guía de Despliegue en Render.com

## Despliegue gratuito en Render (sin teléfono)

### Paso 1: Subir el código a GitHub
1. Crea cuenta en **github.com** (gratis, solo email)
2. Crea un repositorio nuevo: `los-compas-pizzeria`
3. Sube el código:
```bash
git init
git add .
git commit -m "LOS COMPAS PIZZERÍA PWA"
git remote add origin https://github.com/TU_USUARIO/los-compas-pizzeria.git
git push -u origin main
```

### Paso 2: Crear cuenta en Render
1. Ve a **render.com** → "Get Started"
2. Inicia sesión con **GitHub** o **Google** (NO pide teléfono)
3. ¡Listo! Ya tienes cuenta

### Paso 3: Desplegar (2 formas)

#### Opción A: Automática con render.yaml (recomendada)
1. En Render → "New" → "Blueprint"
2. Selecciona tu repositorio de GitHub
3. Render detecta `render.yaml` automáticamente
4. Crea:
   - Base de datos PostgreSQL gratis
   - Web service con Next.js
5. Click "Apply" → Render hace todo automáticamente

#### Opción B: Manual paso a paso
1. **Crear base de datos**:
   - Render → "New" → "PostgreSQL"
   - Name: `los-compas-db`
   - Plan: Free
   - Click "Create"
   - Copia la "Internal Database URL"

2. **Crear web service**:
   - Render → "New" → "Web Service"
   - Conecta tu repo de GitHub
   - Name: `los-compas-pizzeria`
   - Runtime: Node
   - Build Command: `bun install && bun run db:generate && bun scripts/seed-backend.ts`
   - Start Command: `bun run start`
   - Plan: Free

3. **Configurar variables de entorno**:
   En Render → Environment:
   - `DATABASE_PROVIDER` = `postgresql`
   - `DATABASE_URL` = (pega la URL de PostgreSQL del paso 1)
   - `NODE_ENV` = `production`
   - `WHATSAPP_TOKEN` = (tu token de Meta, opcional)
   - `WHATSAPP_PHONE_NUMBER_ID` = (tu ID de Meta, opcional)

4. Click "Create Web Service"
5. ¡Listo! Render construye y despliega automáticamente

### Paso 4: Tu URL pública
- Render te da: `los-compas-pizzeria.onrender.com`
- Esta URL es permanente y accesible 24/7

### Paso 5: Dominio propio (opcional)
1. Render → tu servicio → Settings → Custom Domains
2. Agrega tu dominio (ej: `www.loscompaspizzeria.com`)
3. Configura los DNS según Render
4. HTTPS automático ✅

### Paso 6: WhatsApp Cloud API (opcional)
1. Ve a developers.facebook.com
2. Crea una app de WhatsApp Business
3. Obtén el token y el ID de teléfono
4. Configura en Render → Environment:
   - `WHATSAPP_TOKEN`
   - `WHATSAPP_PHONE_NUMBER_ID`

### Notas importantes
- **Free tier**: La app "duerme" tras 15 min sin actividad. La primera visita tarda ~30s en despertar.
- **Para always-on**: Plan Starter ($7/mes) — sin cold starts.
- **Base de datos**: PostgreSQL free tier expira a los 90 días. Para permanente: $7/mes.
- **Backups**: Usa la pestaña "Backup" del admin para exportar JSON.

### Cuentas demo (cambiar en producción)
- admin / admin123
- cocina / cocina123
- reparto / reparto123

### Comandos útiles
```bash
bun run dev        # Desarrollo local
bun run lint       # Verificar errores
bun run db:push    # Actualizar base de datos
bun run db:generate # Regenerar cliente Prisma
bun scripts/init-prod.sh  # Inicializar BD en producción
```
