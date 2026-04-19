#!/usr/bin/env node
/**
 * Generate Hairtrack brand icon set from a single SVG source.
 *
 * Mark: orange→purple diagonal gradient tile with a bold upward arrow
 * (cheap approximation of the user's logo until the real PNG is dropped
 * into assets/images/logo.png).
 *
 * If `assets/images/logo.png` exists, we use it as-is for `icon.png` and
 * derive the other sizes from it so the branded PNG drives everything.
 */

import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../assets/images');
const LOGO_SRC = resolve(OUT, 'logo.png');

const ORANGE = '#F97316';
const MAGENTA = '#9D3FCB';
const PURPLE = '#7C2DB2';
const WHITE = '#FFFFFF';

function gradientTile({ size = 1024, padding = 0.18, withArrow = true, bg = true }) {
  // Diagonal gradient matching the brand sweep (bottom-left orange → top-right purple).
  const pad = size * padding;
  const inner = size - pad * 2;
  const centerX = size / 2;
  const centerY = size / 2;
  const stroke = inner * 0.14;
  const half = inner * 0.38;

  // Upward-right arrow path: long shaft + arrowhead.
  const tipX = centerX + half * 0.85;
  const tipY = centerY - half * 0.85;
  const tailX = centerX - half * 0.5;
  const tailY = centerY + half * 0.5;

  const arrowHeadSize = stroke * 2.2;

  const arrow = withArrow
    ? `
  <line x1="${tailX}" y1="${tailY}" x2="${tipX}" y2="${tipY}"
        stroke="${WHITE}" stroke-width="${stroke}" stroke-linecap="round"/>
  <!-- Arrow head as two strokes -->
  <line x1="${tipX}" y1="${tipY}"
        x2="${tipX - arrowHeadSize * 1.15}" y2="${tipY}"
        stroke="${WHITE}" stroke-width="${stroke}" stroke-linecap="round"/>
  <line x1="${tipX}" y1="${tipY}"
        x2="${tipX}" y2="${tipY + arrowHeadSize * 1.15}"
        stroke="${WHITE}" stroke-width="${stroke}" stroke-linecap="round"/>
    `
    : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${ORANGE}"/>
      <stop offset="55%" stop-color="${MAGENTA}"/>
      <stop offset="100%" stop-color="${PURPLE}"/>
    </linearGradient>
  </defs>
  ${bg ? `<rect width="${size}" height="${size}" fill="url(#g)"/>` : ''}
  ${arrow}
</svg>`;
}

async function svgToPng(svg, outPath, size) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(outPath);
  console.log('wrote', outPath);
}

async function main() {
  const haveLogo = existsSync(LOGO_SRC);
  if (haveLogo) {
    console.log('found user logo at', LOGO_SRC, '— deriving icons from it');
    // Main app icon
    await sharp(LOGO_SRC)
      .resize(1024, 1024, { fit: 'contain', background: WHITE })
      .flatten({ background: WHITE })
      .png()
      .toFile(resolve(OUT, 'icon.png'));
    console.log('wrote', resolve(OUT, 'icon.png'));
    // Splash (transparent)
    await sharp(LOGO_SRC)
      .resize(1024, 1024, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(resolve(OUT, 'splash-icon.png'));
    console.log('wrote', resolve(OUT, 'splash-icon.png'));
    // Android adaptive foreground (transparent, extra padding)
    await sharp(LOGO_SRC)
      .resize(720, 720, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .extend({
        top: 152,
        bottom: 152,
        left: 152,
        right: 152,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toFile(resolve(OUT, 'android-icon-foreground.png'));
    console.log('wrote', resolve(OUT, 'android-icon-foreground.png'));
    // Favicon — small + solid white bg
    await sharp(LOGO_SRC)
      .resize(96, 96, { fit: 'contain', background: WHITE })
      .flatten({ background: WHITE })
      .png()
      .toFile(resolve(OUT, 'favicon.png'));
    console.log('wrote', resolve(OUT, 'favicon.png'));
  } else {
    console.log('no logo.png found — generating placeholder gradient icons');
    await svgToPng(
      gradientTile({ size: 1024, padding: 0.2 }),
      resolve(OUT, 'icon.png'),
      1024,
    );
    await svgToPng(
      gradientTile({ size: 1024, padding: 0.22, bg: true }),
      resolve(OUT, 'splash-icon.png'),
      1024,
    );
    await svgToPng(
      gradientTile({ size: 1024, padding: 0.28, bg: true }),
      resolve(OUT, 'android-icon-foreground.png'),
      1024,
    );
    await svgToPng(
      gradientTile({ size: 96, padding: 0.18 }),
      resolve(OUT, 'favicon.png'),
      96,
    );
  }

  // Solid gradient-ish background tile for Android (hex approx of middle stop).
  await sharp({
    create: { width: 1024, height: 1024, channels: 4, background: MAGENTA },
  })
    .png()
    .toFile(resolve(OUT, 'android-icon-background.png'));
  console.log('wrote', resolve(OUT, 'android-icon-background.png'));

  // Monochrome (Android themed icons) — black mark, transparent bg
  await svgToPng(
    `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <line x1="256" y1="768" x2="768" y2="256" stroke="#000" stroke-width="140" stroke-linecap="round"/>
  <line x1="768" y1="256" x2="560" y2="256" stroke="#000" stroke-width="140" stroke-linecap="round"/>
  <line x1="768" y1="256" x2="768" y2="464" stroke="#000" stroke-width="140" stroke-linecap="round"/>
</svg>`,
    resolve(OUT, 'android-icon-monochrome.png'),
    1024,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
