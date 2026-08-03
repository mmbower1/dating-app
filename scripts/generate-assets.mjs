import sharp from 'sharp';
import { mkdirSync } from 'fs';

mkdirSync('./assets', { recursive: true });
mkdirSync('./public/splash', { recursive: true });

// The lock icon SVG — icon only, centered on a dark background
const iconSvg = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1a1d2e"/>
      <stop offset="100%" stop-color="#20243a"/>
    </linearGradient>
    <linearGradient id="lockBodyGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#7eb3f5"/>
      <stop offset="100%" stop-color="#b39dfa"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" rx="230" fill="url(#bg)"/>
  <g transform="translate(152, 80) scale(7.2)">
    <path d="M 26 66 L 26 36 C 26 10 74 10 74 36 L 74 66" stroke="#8aacd4" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <rect x="5" y="50" width="90" height="60" rx="13" fill="url(#lockBodyGrad)"/>
    <rect x="11" y="57" width="22" height="8" rx="4" fill="rgba(255,255,255,0.35)"/>
    <path d="M 50 85 C 43 80 40 77 40 74 C 40 71 42 69.5 45 69.5 C 47 69.5 48.5 72 50 74 C 51.5 72 53 69.5 55 69.5 C 58 69.5 60 71 60 74 C 60 77 57 80 50 85 Z" fill="#1e2340"/>
  </g>
</svg>`;

// Generates a splash SVG at any dimension with the lock centered
function makeSplashSvg(w, h) {
  const iconSize = Math.round(Math.min(w, h) * 0.22);
  const x = Math.round((w - iconSize) / 2);
  const y = Math.round((h - iconSize) / 2);
  const scale = iconSize / 100;
  return `
<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="lockBodyGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#7eb3f5"/>
      <stop offset="100%" stop-color="#b39dfa"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="#1a1d2e"/>
  <g transform="translate(${x}, ${y}) scale(${scale})">
    <path d="M 26 66 L 26 36 C 26 10 74 10 74 36 L 74 66" stroke="#8aacd4" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <rect x="5" y="50" width="90" height="60" rx="13" fill="url(#lockBodyGrad)"/>
    <rect x="11" y="57" width="22" height="8" rx="4" fill="rgba(255,255,255,0.35)"/>
    <path d="M 50 85 C 43 80 40 77 40 74 C 40 71 42 69.5 45 69.5 C 47 69.5 48.5 72 50 74 C 51.5 72 53 69.5 55 69.5 C 58 69.5 60 71 60 74 C 60 77 57 80 50 85 Z" fill="#1e2340"/>
  </g>
</svg>`;
}

// iOS requires exact pixel dimensions for each device
const iosSplashSizes = [
  { w: 640,  h: 1136 }, // iPhone SE 1st gen
  { w: 750,  h: 1334 }, // iPhone 6/7/8
  { w: 1242, h: 2208 }, // iPhone 6+/7+/8+
  { w: 1125, h: 2436 }, // iPhone X/XS/11 Pro
  { w: 828,  h: 1792 }, // iPhone XR/11
  { w: 1242, h: 2688 }, // iPhone XS Max/11 Pro Max
  { w: 1080, h: 2340 }, // iPhone 12 mini
  { w: 1170, h: 2532 }, // iPhone 12/13/14
  { w: 1284, h: 2778 }, // iPhone 12/13/14 Pro Max
  { w: 1179, h: 2556 }, // iPhone 14 Pro / 15 / 15 Pro
  { w: 1290, h: 2796 }, // iPhone 14 Pro Max / 15 Plus / 15 Pro Max
  { w: 1320, h: 2868 }, // iPhone 16 Pro
  { w: 1440, h: 3120 }, // iPhone 16 Pro Max
  { w: 1536, h: 2048 }, // iPad mini / iPad Air (portrait)
  { w: 1668, h: 2224 }, // iPad Air 10.5"
  { w: 1668, h: 2388 }, // iPad Pro 11"
  { w: 2048, h: 2732 }, // iPad Pro 12.9"
];

// Generate Capacitor-style assets
console.log('Generating icon-only.png...');
await sharp(Buffer.from(iconSvg)).png().toFile('./assets/icon-only.png');

// PWA icons used by browsers and iOS
console.log('Generating public/apple-touch-icon.png...');
await sharp(Buffer.from(iconSvg)).resize(180, 180).png().toFile('./public/apple-touch-icon.png');
console.log('Generating public/favicon-192.png...');
await sharp(Buffer.from(iconSvg)).resize(192, 192).png().toFile('./public/favicon-192.png');
console.log('Generating public/favicon-512.png...');
await sharp(Buffer.from(iconSvg)).resize(512, 512).png().toFile('./public/favicon-512.png');

console.log('Generating icon-foreground.png...');
await sharp(Buffer.from(iconSvg)).png().toFile('./assets/icon-foreground.png');

const baseSplash = makeSplashSvg(2732, 2732);
console.log('Generating splash.png...');
await sharp(Buffer.from(baseSplash)).png().toFile('./assets/splash.png');
console.log('Generating splash-dark.png...');
await sharp(Buffer.from(baseSplash)).png().toFile('./assets/splash-dark.png');

// Generate iOS PWA launch images
console.log('\nGenerating iOS splash screens...');
for (const { w, h } of iosSplashSizes) {
  const svg = makeSplashSvg(w, h);
  const file = `./public/splash/splash-${w}x${h}.png`;
  await sharp(Buffer.from(svg)).png().toFile(file);
  process.stdout.write(`  ✓ ${w}x${h}\n`);
}

console.log('\n✅ All assets generated.');
