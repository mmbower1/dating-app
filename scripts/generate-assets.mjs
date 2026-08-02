import sharp from 'sharp';
import { mkdirSync } from 'fs';

mkdirSync('./assets', { recursive: true });

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

  <!-- Background -->
  <rect width="1024" height="1024" rx="230" fill="url(#bg)"/>

  <!-- Lock centered, scaled up -->
  <g transform="translate(162, 142) scale(7)">
    <!-- Shackle -->
    <path
      d="M 26 66 L 26 36 C 26 10 74 10 74 36 L 74 66"
      stroke="#8aacd4"
      stroke-width="16"
      stroke-linecap="round"
      stroke-linejoin="round"
      fill="none"
    />
    <!-- Body -->
    <rect x="5" y="50" width="90" height="60" rx="13" fill="url(#lockBodyGrad)"/>
    <!-- Shine highlight -->
    <rect x="11" y="57" width="22" height="8" rx="4" fill="rgba(255,255,255,0.35)"/>
    <!-- Heart keyhole -->
    <path
      d="M 50 85 C 43 80 40 77 40 74 C 40 71 42 69.5 45 69.5 C 47 69.5 48.5 72 50 74 C 51.5 72 53 69.5 55 69.5 C 58 69.5 60 71 60 74 C 60 77 57 80 50 85 Z"
      fill="#1e2340"
    />
  </g>
</svg>`;

// Splash screen — icon centered on full dark background
const splashSvg = `
<svg width="2732" height="2732" viewBox="0 0 2732 2732" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="lockBodyGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#7eb3f5"/>
      <stop offset="100%" stop-color="#b39dfa"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="2732" height="2732" fill="#1a1d2e"/>

  <!-- Subtle gradient orbs -->
  <ellipse cx="2050" cy="273" rx="800" ry="600" fill="rgba(179,157,250,0.15)"/>
  <ellipse cx="546" cy="2460" rx="700" ry="500" fill="rgba(126,179,245,0.12)"/>

  <!-- Lock centered, large -->
  <g transform="translate(966, 966) scale(8)">
    <path
      d="M 26 66 L 26 36 C 26 10 74 10 74 36 L 74 66"
      stroke="#8aacd4"
      stroke-width="16"
      stroke-linecap="round"
      stroke-linejoin="round"
      fill="none"
    />
    <rect x="5" y="50" width="90" height="60" rx="13" fill="url(#lockBodyGrad)"/>
    <rect x="11" y="57" width="22" height="8" rx="4" fill="rgba(255,255,255,0.35)"/>
    <path
      d="M 50 85 C 43 80 40 77 40 74 C 40 71 42 69.5 45 69.5 C 47 69.5 48.5 72 50 74 C 51.5 72 53 69.5 55 69.5 C 58 69.5 60 71 60 74 C 60 77 57 80 50 85 Z"
      fill="#1e2340"
    />
  </g>
</svg>`;

console.log('Generating icon-only.png (1024x1024)...');
await sharp(Buffer.from(iconSvg)).png().toFile('./assets/icon-only.png');

console.log('Generating icon-foreground.png (1024x1024)...');
await sharp(Buffer.from(iconSvg)).png().toFile('./assets/icon-foreground.png');

console.log('Generating splash.png (2732x2732)...');
await sharp(Buffer.from(splashSvg)).png().toFile('./assets/splash.png');

console.log('Generating splash-dark.png (2732x2732)...');
await sharp(Buffer.from(splashSvg)).png().toFile('./assets/splash-dark.png');

console.log('✅ All assets generated in ./assets/');
