# 🍕 LOS COMPAS PIZZERÍA PWA — Guía de Despliegue

## Despliegue gratuito en Vercel

### Paso 1: Preparar el repositorio
```bash
git init
git add .
git commit -m "LOS COMPAS Pizzería PWA lista para producción"
```

### Paso 2: Subir a GitHub
1. Crea una cuenta en github.com (gratis)
2. Crea un repositorio nuevo: `los-compas-pizzeria`
3. Sube el código:
```bash
git remote add origin https://github.com/TU_USUARIO/los-compas-pizzeria.git
git push -u origin main
```

### Paso 3: Desplegar en Vercel
1. Ve a vercel.com y crea una cuenta (gratis con GitHub)
2. Click en "New Project"
3. Importa el repositorio `los-compas-pizzeria`
4. Vercel detecta Next.js automáticamente
5. Configura las variables de entorno:
   - `DATABASE_URL` = `file:./db/prod.db` (SQLite en Vercel)
   - `WHATSAPP_TOKEN` = tu token de Meta Business (opcional)
   - `WHATSAPP_PHONE_NUMBER_ID` = tu ID de teléfono de Meta (opcional)
6. Click en "Deploy"
7. Vercel te da una URL como: `los-compas-pizzeria.vercel.app`

### Paso 4: Configurar dominio propio (opcional)
1. En Vercel → Settings → Domains
2. Agrega tu dominio (ej: `www.loscompaspizzeria.com`)
3. Configura los DNS según las instrucciones de Vercel
4. HTTPS se configura automáticamente

### Paso 5: Configurar WhatsApp Cloud API (opcional)
1. Ve a developers.facebook.com
2. Crea una app de WhatsApp Business
3. Obtén el token de acceso y el ID de teléfono
4. Configura en Vercel las variables:
   - `WHATSAPP_TOKEN`
   - `WHATSAPP_PHONE_NUMBER_ID`
5. Los mensajes automáticos se enviarán en cada cambio de estado de pedido

### Paso 6: Configurar Notificaciones Push (opcional)
1. Genera VAPID keys:
```bash
npx web-push generate-vapid-keys
```
2. Configura en Vercel:
   - `VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`
3. Los clientes pueden suscribirse a push notifications desde su navegador

### Notas importantes

- **SQLite en Vercel**: SQLite funciona en desarrollo. En producción con Vercel (serverless),
  considera migrar a PostgreSQL (Neon, Supabase) cambiando `DATABASE_URL` y el provider en `schema.prisma`.
- **Backups**: Usa la pestaña "Backup" del panel admin para exportar JSON regularmente.
- **Actualizaciones**: Sube cambios al repo de GitHub y Vercel despliega automáticamente.

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
```
