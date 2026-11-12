/**
 * Reprojects Natural Earth 2 50M Shaded Relief (plate carree) to the polar stereographic
 * southern lands texture box (row 0 = minY) and saves as WebP.
 *
 * Source: Natural Earth 2 with Shaded Relief (public domain).
 * https://www.naturalearthdata.com/downloads/50m-raster-data/50m-natural-earth-2/
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { project, unproject } from '../src/projection.ts';
import { SOUTHERN_LANDS_TEXTURE_BOX } from '../src/southern-lands.ts';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '../src/assets');
mkdirSync(outDir, { recursive: true });
const outFile = join(outDir, 'southern-lands-color.webp');

const NE2_DIR = process.env.NE2_DIR || join(process.env.HOME || '', '.cache/antartida3d/natural-earth-2/NE2_50M_SR');
const tifPath = join(NE2_DIR, 'NE2_50M_SR.tif');
if (!existsSync(tifPath)) {
  throw new Error(
    `Natural Earth 2 raster missing: ${tifPath}\nDownload and unzip from: https://naturalearth.s3.amazonaws.com/50m_raster/NE2_50M_SR.zip`
  );
}

// NE2_50M_SR.tif is 10800x5400 whole-world plate carree (lat 90 to -90, lon -180 to 180).
// Pixel (col, row) center: lon = -180 + (col + 0.5) * 360 / 10800, lat = 90 - (row + 0.5) * 180 / 5400.
// Extract only rows south of lat -5 to save memory: (90 - (-5)) * 5400 / 180 = 2850.
const SRC_WIDTH = 10800;
const SRC_HEIGHT = 5400;
const TOP_ROW = 2850;
const EXTRACTED_HEIGHT = SRC_HEIGHT - TOP_ROW; // 2550 rows

const { data: srcData } = await sharp(tifPath)
  .extract({ left: 0, top: TOP_ROW, width: SRC_WIDTH, height: EXTRACTED_HEIGHT })
  .raw()
  .toBuffer({ resolveWithObject: true });

const SIZE = 2048;
const { minX, maxX, minY, maxY } = SOUTHERN_LANDS_TEXTURE_BOX;
const spanX = maxX - minX;
const spanY = maxY - minY;

const outBuffer = Buffer.alloc(SIZE * SIZE * 3);
let ptr = 0;

for (let j = 0; j < SIZE; j++) {
  const mapY = minY + ((j + 0.5) / SIZE) * spanY;
  for (let i = 0; i < SIZE; i++) {
    const mapX = minX + ((i + 0.5) / SIZE) * spanX;
    const { lon, lat } = unproject(mapX, mapY);

    // Continuous column and row in source coordinates
    const srcCol = (lon + 180) * (SRC_WIDTH / 360) - 0.5;
    const srcRow = (90 - lat) * (SRC_HEIGHT / 180) - 0.5;

    // Clamp row to extracted slice [0, EXTRACTED_HEIGHT - 1]
    const clampedY = Math.max(0, Math.min(EXTRACTED_HEIGHT - 1, srcRow - TOP_ROW));
    const y0 = Math.floor(clampedY);
    const y1 = Math.min(EXTRACTED_HEIGHT - 1, y0 + 1);
    const fy = clampedY - y0;

    // Wrap column across antimeridian [0, SRC_WIDTH - 1]
    const x0 = Math.floor(srcCol);
    const fx = srcCol - x0;
    const c0 = ((x0 % SRC_WIDTH) + SRC_WIDTH) % SRC_WIDTH;
    const c1 = (c0 + 1) % SRC_WIDTH;

    const idx00 = (y0 * SRC_WIDTH + c0) * 3;
    const idx01 = (y0 * SRC_WIDTH + c1) * 3;
    const idx10 = (y1 * SRC_WIDTH + c0) * 3;
    const idx11 = (y1 * SRC_WIDTH + c1) * 3;

    const w00 = (1 - fx) * (1 - fy);
    const w01 = fx * (1 - fy);
    const w10 = (1 - fx) * fy;
    const w11 = fx * fy;

    outBuffer[ptr++] = Math.round(srcData[idx00] * w00 + srcData[idx01] * w01 + srcData[idx10] * w10 + srcData[idx11] * w11);
    outBuffer[ptr++] = Math.round(srcData[idx00 + 1] * w00 + srcData[idx01 + 1] * w01 + srcData[idx10 + 1] * w10 + srcData[idx11 + 1] * w11);
    outBuffer[ptr++] = Math.round(srcData[idx00 + 2] * w00 + srcData[idx01 + 2] * w01 + srcData[idx10 + 2] * w10 + srcData[idx11 + 2] * w11);
  }
}

// Encode to WebP. Target < 500 KB; if larger, step quality down to 64.
let quality = 82;
let webpBuffer = await sharp(outBuffer, { raw: { width: SIZE, height: SIZE, channels: 3 } })
  .webp({ quality, effort: 6 })
  .toBuffer();

while (webpBuffer.byteLength > 500 * 1024 && quality > 64) {
  quality -= 6;
  webpBuffer = await sharp(outBuffer, { raw: { width: SIZE, height: SIZE, channels: 3 } })
    .webp({ quality, effort: 6 })
    .toBuffer();
}

writeFileSync(outFile, webpBuffer);
const sizeKb = (webpBuffer.byteLength / 1024).toFixed(1);
console.log(`southern-lands-color.webp: ${sizeKb} KB (quality ${quality})`);

// Sanity check: sample RGB from the decoded output WebP at specified locations
const { data: decoded } = await sharp(outFile)
  .raw()
  .toBuffer({ resolveWithObject: true });

const checkPoints = [
  ['Amazonia', -60, -8],
  ['Patagonia steppe', -69, -46],
  ['Atacama', -69.5, -24],
  ['central Australia', 133, -25],
  ['New Zealand South Island west coast', 170.5, -43.5],
  ['Kalahari', 21, -24],
] as const;

console.log('Sanity check RGB (decoded from output WebP):');
for (const [name, lon, lat] of checkPoints) {
  const { x, y } = project(lon, lat);
  const px = Math.max(0, Math.min(SIZE - 1, Math.round(((x - minX) / spanX) * SIZE - 0.5)));
  const py = Math.max(0, Math.min(SIZE - 1, Math.round(((y - minY) / spanY) * SIZE - 0.5)));
  const idx = (py * SIZE + px) * 3;
  const rgb = [decoded[idx], decoded[idx + 1], decoded[idx + 2]];
  console.log(`${name}: [${rgb.join(', ')}]`);
}
