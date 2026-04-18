#!/usr/bin/env node
/**
 * Generate Hairtrack brand icon set from a single SVG source.
 *
 * Mark: stylised "H" formed by two hair-strand-like vertical bars, using the
 * brand royal-blue palette. Not a final design — an MVP placeholder so the
 * app no longer ships with the React logo.
 */

import { writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../assets/images');

const BRAND = '#002FCC';
const ON_BRAND = '#FFFFFF';

function logo({ bg, fg, withBg = true, size = 1024, padding = 0.16 }) {
  const inner = size * (1 - padding * 2);
  const offset = size * padding;
  // Two vertical strokes + horizontal bar = an "H".
  const strokeW = inner * 0.18;
  const leftX = offset + inner * 0.18;
  const rightX = offset + inner * 0.82 - strokeW;
  const barY = offset + inner * 0.5 - strokeW / 2;
  const top = offset;
  const height = inner;
  const radius = strokeW / 2;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${withBg ? `<rect width="${size}" height="${size}" fill="${bg}"/>` : ''}
  <rect x="${leftX}" y="${top}" width="${strokeW}" height="${height}" rx="${radius}" fill="${fg}"/>
  <rect x="${rightX}" y="${top}" width="${strokeW}" height="${height}" rx="${radius}" fill="${fg}"/>
  <rect x="${leftX}" y="${barY}" width="${rightX + strokeW - leftX}" height="${strokeW}" rx="${radius}" fill="${fg}"/>
</svg>`;
}

async function svgToPng(svg, outPath, size) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(outPath);
  // eslint-disable-next-line no-console
  console.log('wrote', outPath);
}

async function main() {
  // Main app icon (iOS, store) — 1024 with brand bg
  await svgToPng(
    logo({ bg: BRAND, fg: ON_BRAND, size: 1024 }),
    resolve(OUT, 'icon.png'),
    1024,
  );

  // Splash screen icon — transparent bg, mark only
  await svgToPng(
    logo({ bg: BRAND, fg: ON_BRAND, withBg: false, size: 1024, padding: 0.25 }),
    resolve(OUT, 'splash-icon.png'),
    1024,
  );

  // Android adaptive icon: foreground (transparent bg) + solid background.
  await svgToPng(
    logo({ bg: BRAND, fg: ON_BRAND, withBg: false, size: 1024, padding: 0.28 }),
    resolve(OUT, 'android-icon-foreground.png'),
    1024,
  );
  await sharp({
    create: { width: 1024, height: 1024, channels: 4, background: BRAND },
  })
    .png()
    .toFile(resolve(OUT, 'android-icon-background.png'));
  console.log('wrote', resolve(OUT, 'android-icon-background.png'));

  // Monochrome (Android themed icons) — black mark, transparent bg
  await svgToPng(
    logo({ bg: '#000', fg: '#000', withBg: false, size: 1024, padding: 0.28 }),
    resolve(OUT, 'android-icon-monochrome.png'),
    1024,
  );

  // Web favicon — small
  await svgToPng(
    logo({ bg: BRAND, fg: ON_BRAND, size: 96, padding: 0.18 }),
    resolve(OUT, 'favicon.png'),
    96,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
