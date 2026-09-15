// Procesa el logo real de LOS COMPAS subido por el usuario
// Recorta el screenshot, centra el logo y genera todos los iconos PWA necesarios
import sharp from 'sharp';
import fs from 'fs';

const source = '/home/z/my-project/upload/Screenshot_20260915_032213_WhatsApp.jpg';
const publicDir = '/home/z/my-project/public';

async function processLogo() {
  const image = sharp(source);
  const meta = await image.metadata();
  const w = meta.width;
  const h = meta.height;
  console.log('Source dimensions:', w, 'x', h);

  // Recorte cuadrado centrado
  const side = Math.min(w, h);
  const left = Math.floor((w - side) / 2);
  const top = Math.floor((h - side) / 2);

  console.log(`Cropping: left=${left}, top=${top}, size=${side}x${side}`);

  const cropped = image.extract({ left, top, width: side, height: side });

  // Icono 192x192 con fondo blanco
  await cropped
    .resize(192, 192, { fit: 'cover', position: 'center' })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png()
    .toFile(`${publicDir}/icon-192.png`);
  console.log('Generated icon-192.png');

  // Icono 512x512
  await cropped
    .resize(512, 512, { fit: 'cover', position: 'center' })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png()
    .toFile(`${publicDir}/icon-512.png`);
  console.log('Generated icon-512.png');

  // Apple touch icon 180x180
  await cropped
    .resize(180, 180, { fit: 'cover', position: 'center' })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png()
    .toFile(`${publicDir}/apple-touch-icon.png`);
  console.log('Generated apple-touch-icon.png');

  // Favicon 32x32
  await cropped
    .resize(32, 32, { fit: 'cover', position: 'center' })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png()
    .toFile(`${publicDir}/favicon.png`);
  console.log('Generated favicon.png');

  // Logo principal para la app - 256x256 con fondo oscuro del tema
  await cropped
    .resize(256, 256, { fit: 'cover', position: 'center' })
    .flatten({ background: { r: 26, g: 20, b: 16 } })
    .png()
    .toFile(`${publicDir}/logo.png`);
  console.log('Generated logo.png');

  // Logo pequeño
  await cropped
    .resize(64, 64, { fit: 'cover', position: 'center' })
    .flatten({ background: { r: 26, g: 20, b: 16 } })
    .png()
    .toFile(`${publicDir}/logo-small.png`);
  console.log('Generated logo-small.png');
}

processLogo().catch(e => { console.error(e); process.exit(1); });
