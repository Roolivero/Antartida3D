/**
 * Reprojects Natural Earth 2 50M Shaded Relief (plate carree) into the two color textures of the
 * lands outside Antarctica and saves them as WebP (row 0 = minY in both):
 * - southern-lands-color.webp: the near lands, down to 10° S, in the polar stereographic box
 *   SOUTHERN_LANDS_TEXTURE_BOX.
 * - world-lands-color.webp: the rest of the world out to WORLD_LANDS_CLIP_DEG (60° N). The distance
 *   from the center of the texture is the angle from the South Pole (azimuthal equidistant): in the
 *   stereographic box the far north would take almost every texel.
 *
 * Source: Natural Earth 2 with Shaded Relief (public domain).
 * https://www.naturalearthdata.com/downloads/50m-raster-data/50m-natural-earth-2/
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { project, STEREO_RADIUS, unproject, WORLD_LANDS_CLIP_DEG } from '../src/projection.ts';
import { SOUTHERN_LANDS_TEXTURE_BOX } from '../src/southern-lands.ts';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '../src/assets');
mkdirSync(outDir, { recursive: true });

const NE2_DIR = process.env.NE2_DIR || join(process.env.HOME || '', '.cache/antartida3d/natural-earth-2/NE2_50M_SR');
const tifPath = join(NE2_DIR, 'NE2_50M_SR.tif');
if (!existsSync(tifPath)) {
  throw new Error(
    `Natural Earth 2 raster missing: ${tifPath}\nDownload and unzip from: https://naturalearth.s3.amazonaws.com/50m_raster/NE2_50M_SR.zip`
  );
}

// NE2_50M_SR.tif is 10800x5400 whole-world plate carree (lat 90 to -90, lon -180 to 180).
// Pixel (col, row) center: lon = -180 + (col + 0.5) * 360 / 10800, lat = 90 - (row + 0.5) * 180 / 5400.
const SRC_WIDTH = 10800;
const SRC_HEIGHT = 5400;
const rowOfLat = (lat: number) => Math.round(((90 - lat) * SRC_HEIGHT) / 180);
// Northernmost source row each texture reads; farther north it repeats that row.
const NEAR_TOP_ROW = rowOfLat(-5);
const WORLD_TOP_ROW = rowOfLat(WORLD_LANDS_CLIP_DEG - 90 + 2);
// Extract only the rows that are read, to save memory.
const EXTRACTED_HEIGHT = SRC_HEIGHT - WORLD_TOP_ROW;

const { data: srcData } = await sharp(tifPath)
  .extract({ left: 0, top: WORLD_TOP_ROW, width: SRC_WIDTH, height: EXTRACTED_HEIGHT })
  .raw()
  .toBuffer({ resolveWithObject: true });

const SIZE = 2048;
const RAD = Math.PI / 180;

/** Bilinear sample of the source at a lon/lat into out[ptr..ptr+2]; rows north of topRow repeat it. */
function sampleInto(out: Buffer, ptr: number, lon: number, lat: number, topRow: number) {
  // Continuous column and row in source coordinates
  const srcCol = (lon + 180) * (SRC_WIDTH / 360) - 0.5;
  const srcRow = (90 - lat) * (SRC_HEIGHT / 180) - 0.5;

  const clampedY = Math.max(topRow, Math.min(SRC_HEIGHT - 1, srcRow)) - WORLD_TOP_ROW;
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

  for (let c = 0; c < 3; c++) {
    out[ptr + c] = Math.round(srcData[idx00 + c] * w00 + srcData[idx01 + c] * w01 + srcData[idx10 + c] * w10 + srcData[idx11 + c] * w11);
  }
}

type CheckPoint = readonly [name: string, lon: number, lat: number];

/**
 * Fills a SIZE x SIZE texture, encodes it to WebP and prints the color it holds at some known
 * places. `lonLatAt` gives the lon/lat of a texel center (u, v in 0..1) and `uvOf` is its inverse.
 */
async function build(
  name: string,
  topRow: number,
  lonLatAt: (u: number, v: number) => { lon: number; lat: number },
  uvOf: (lon: number, lat: number) => { u: number; v: number },
  checkPoints: readonly CheckPoint[],
) {
  const outBuffer = Buffer.alloc(SIZE * SIZE * 3);
  let ptr = 0;
  for (let j = 0; j < SIZE; j++) {
    for (let i = 0; i < SIZE; i++) {
      const { lon, lat } = lonLatAt((i + 0.5) / SIZE, (j + 0.5) / SIZE);
      sampleInto(outBuffer, ptr, lon, lat, topRow);
      ptr += 3;
    }
  }

  // Encode to WebP. Target < 500 KB; if larger, step quality down to 64.
  const encode = (q: number) => sharp(outBuffer, { raw: { width: SIZE, height: SIZE, channels: 3 } }).webp({ quality: q, effort: 6 }).toBuffer();
  let quality = 82;
  let webpBuffer = await encode(quality);
  while (webpBuffer.byteLength > 500 * 1024 && quality > 64) {
    quality -= 6;
    webpBuffer = await encode(quality);
  }

  const outFile = join(outDir, name);
  writeFileSync(outFile, webpBuffer);
  console.log(`${name}: ${(webpBuffer.byteLength / 1024).toFixed(1)} KB (quality ${quality})`);

  // Sanity check: sample RGB from the decoded output WebP at specified locations
  const { data: decoded } = await sharp(outFile).raw().toBuffer({ resolveWithObject: true });
  console.log('Sanity check RGB (decoded from output WebP):');
  for (const [place, lon, lat] of checkPoints) {
    const { u, v } = uvOf(lon, lat);
    const px = Math.max(0, Math.min(SIZE - 1, Math.round(u * SIZE - 0.5)));
    const py = Math.max(0, Math.min(SIZE - 1, Math.round(v * SIZE - 0.5)));
    const idx = (py * SIZE + px) * 3;
    console.log(`${place}: [${[decoded[idx], decoded[idx + 1], decoded[idx + 2]].join(', ')}]`);
  }
}

const { minX, maxX, minY, maxY } = SOUTHERN_LANDS_TEXTURE_BOX;
await build(
  'southern-lands-color.webp',
  NEAR_TOP_ROW,
  (u, v) => unproject(minX + u * (maxX - minX), minY + v * (maxY - minY)),
  (lon, lat) => {
    const { x, y } = project(lon, lat);
    return { u: (x - minX) / (maxX - minX), v: (y - minY) / (maxY - minY) };
  },
  [
    ['Amazonia', -60, -8],
    ['Patagonia steppe', -69, -46],
    ['Atacama', -69.5, -24],
    ['central Australia', 133, -25],
    ['New Zealand South Island west coast', 170.5, -43.5],
    ['Kalahari', 21, -24],
  ],
);

// Same mapping as worldLandColor in react-ui/src/map3d/southernLands.glsl.ts: the texel at a
// fraction `rho` of the half size is at `rho * WORLD_LANDS_CLIP_DEG` degrees from the South Pole,
// in the direction of the map point from the pole (map x to the right, map y down the rows).
await build(
  'world-lands-color.webp',
  WORLD_TOP_ROW,
  (u, v) => {
    const dx = u - 0.5;
    const dy = v - 0.5;
    // Outside the circle of the texture the corners repeat its edge.
    const r = STEREO_RADIUS * Math.tan(Math.min(0.5, Math.hypot(dx, dy)) * WORLD_LANDS_CLIP_DEG * RAD);
    const dir = Math.atan2(dy, dx);
    return unproject(500 + r * Math.cos(dir), 500 + r * Math.sin(dir));
  },
  (lon, lat) => {
    const rho = (lat + 90) / WORLD_LANDS_CLIP_DEG / 2;
    return { u: 0.5 + rho * Math.sin(lon * RAD), v: 0.5 - rho * Math.cos(lon * RAD) };
  },
  [
    ['Amazonia', -60, -3],
    ['Sahara', 10, 23],
    ['Congo basin', 22, 0],
    ['Borneo', 114, 1],
    ['Great Plains', -100, 40],
    ['Gobi', 105, 43],
    ['Greenland edge of the data', -42, 60],
  ],
);
