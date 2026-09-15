// Genera iconos PNG desde el SVG usando sharp (ES module)
import sharp from 'sharp';
import fs from 'fs';

const svgPath = '/home/z/my-project/public/icon.svg';
const svgBuffer = fs.readFileSync(svgPath);

const bg = { r: 26, g: 20, b: 16 };

await sharp(svgBuffer, { density: 384 })
  .resize(192, 192, { fit: 'contain', background: bg })
  .png()
  .toFile('/home/z/my-project/public/icon-192.png');
console.log('Generated icon-192.png');

await sharp(svgBuffer, { density: 1024 })
  .resize(512, 512, { fit: 'contain', background: bg })
  .png()
  .toFile('/home/z/my-project/public/icon-512.png');
console.log('Generated icon-512.png');

await sharp(svgBuffer, { density: 360 })
  .resize(180, 180, { fit: 'contain', background: bg })
  .png()
  .toFile('/home/z/my-project/public/apple-touch-icon.png');
console.log('Generated apple-touch-icon.png');

await sharp(svgBuffer, { density: 64 })
  .resize(32, 32, { fit: 'contain', background: bg })
  .png()
  .toFile('/home/z/my-project/public/favicon.png');
console.log('Generated favicon.png');
