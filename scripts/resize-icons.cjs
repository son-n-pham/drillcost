const sharp = require('sharp');
const path = require('path');

const src = process.argv[2] || path.join(__dirname, '..', 'img', 'logo_SonPham.png');
const outDir = path.dirname(src);

const tasks = [
  { size: 16, name: 'favicon-16x16.png' },
  { size: 32, name: 'favicon-32x32.png' },
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 192, name: 'android-chrome-192x192.png' },
  { size: 512, name: 'android-chrome-512x512.png' }
];

(async () => {
  try {
    for (const t of tasks) {
      const out = path.join(outDir, t.name);
      await sharp(src).resize(t.size, t.size, { fit: 'cover' }).toFile(out);
      console.log('Wrote', out);
    }
  } catch (err) {
    console.error('Error creating icons:', err);
    process.exit(1);
  }
})();
