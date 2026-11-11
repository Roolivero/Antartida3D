/**
 * Generates bathymetry textures and depth lookup grid from IBCSO v2:
 * - ocean-bathy-2048.webp and ocean-bathy-1024.webp (RGBA: R=depth, G,B=normal, A=coast dist)
 * - ocean-depth-grid.bin (513x513 Int16 grid for depthAt in core)
 *
 * Beyond 50° S: IBCSO coverage ends at 50° S. North of 50° S, values are extended
 * from the northernmost valid margin (~ -50.05° S) and smoothly blended towards the
 * -4000 m abyssal plain over ~2 degrees of latitude with a gentle transition-band blur
 * to eliminate radial streaks and boundary cuts.
 *
 * Dataset: Dorschel et al. (2022), The International Bathymetric Chart of the Southern Ocean Version 2 (IBCSO v2),
 * PANGAEA, https://doi.org/10.1594/PANGAEA.937574, CC BY 4.0.
 *
 * Projection: EPSG:9354 (WGS 84 / IBCSO Polar Stereographic, standard parallel -65°).
 * Verified against IBCSO.prj and https://epsg.io/9354:
 * `+proj=stere +lat_0=-90 +lat_ts=-65 +lon_0=0 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs`
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fromFile } from 'geotiff';
import proj4 from 'proj4';
import sharp from 'sharp';
import { project, unproject } from '../src/projection.ts';
import { ANTARCTICA_PATH, ICE_SHELVES_PATH, SOUTH_AMERICA_PATH } from '../src/coastline.ts';
import { MAP_RASTER_PAD, MAP_RASTER_SPAN } from '../src/svg/map.ts';
import { METERS_PER_MAP_UNIT, VERTICAL_EXAGGERATION } from '../src/relief.ts';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '../src/assets');
mkdirSync(outDir, { recursive: true });

const scratchpadDir =
  process.env.SCRATCHPAD_DIR ||
  '/tmp/claude-1000/-home-lk-Proyectos-Antartida3D/1adc844c-cf0e-4f45-90a9-7b2a252061ce/scratchpad';
mkdirSync(scratchpadDir, { recursive: true });

// Setup projections
proj4.defs(
  'EPSG:3031',
  '+proj=stere +lat_0=-90 +lat_ts=-71 +lon_0=0 +k=1 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs'
);
// EPSG:9354 citation: WGS 84 / IBCSO Polar Stereographic (https://epsg.io/9354, PANGAEA IBCSO.prj)
proj4.defs(
  'EPSG:9354',
  '+proj=stere +lat_0=-90 +lat_ts=-65 +lon_0=0 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs'
);
const p4_3031 = proj4('EPSG:4326', 'EPSG:3031');
const p4_9354 = proj4('EPSG:4326', 'EPSG:9354');

const IBCSO_DIR =
  process.env.IBCSO_DIR ||
  join(process.env.HOME || '/home/lk', '.cache/antartida3d/ibcso');
const ibcsoTifPath = join(IBCSO_DIR, 'IBCSO_v2_bed.tif');

if (!existsSync(ibcsoTifPath)) {
  console.error(`IBCSO v2 bed file missing in ${IBCSO_DIR}`);
  process.exit(1);
}

const BEDMAP3_DIR =
  process.env.BEDMAP3_DIR ||
  join(process.env.HOME || '/home/lk', '.cache/antartida3d/bedmap3');
const bm3MasksPath = join(BEDMAP3_DIR, 'bm3_masks.tif');
const bm3SurfacePath = join(BEDMAP3_DIR, 'bm3_surface.tif');
const hasBedmap3 = existsSync(bm3MasksPath) && existsSync(bm3SurfacePath);

console.log('Loading IBCSO v2 bed GeoTIFF...');
console.time('loadIbcso');
const ibcsoTif = await fromFile(ibcsoTifPath);
const ibcsoImg = await ibcsoTif.getImage();
const ibcsoOrigin = ibcsoImg.getOrigin(); // [-4800000, 4800000, 0]
const ibcsoRes = ibcsoImg.getResolution(); // [500, -500, 0]
const ibcsoWidth = ibcsoImg.getWidth(); // 19200
const ibcsoHeight = ibcsoImg.getHeight(); // 19200
const ibcsoRasters = await ibcsoImg.readRasters();
const ibcsoData = ibcsoRasters[0] as Int16Array;
console.timeEnd('loadIbcso');

let bm3MaskData: Int16Array | null = null;
let bm3Origin: number[] = [-3333500, 3333500, 0];
let bm3Res: number[] = [500, -500, 0];
let bm3Width = 13334;
let bm3Height = 13334;

if (hasBedmap3) {
  console.log('Loading Bedmap3 masks GeoTIFF for exact Antarctic land boundary...');
  console.time('loadBedmap3');
  const bm3MaskTif = await fromFile(bm3MasksPath);
  const bm3MaskImg = await bm3MaskTif.getImage();
  bm3Origin = bm3MaskImg.getOrigin();
  bm3Res = bm3MaskImg.getResolution();
  bm3Width = bm3MaskImg.getWidth();
  bm3Height = bm3MaskImg.getHeight();
  const bm3MaskRasters = await bm3MaskImg.readRasters();
  bm3MaskData = bm3MaskRasters[0] as Int16Array;
  console.timeEnd('loadBedmap3');
} else {
  console.warn('Bedmap3 files not found; relying on IBCSO elevation and vector coastlines for land detection.');
}

const GRID_SIZE = 2049;
console.log(`Rasterizing vector coastline mask at ${GRID_SIZE}x${GRID_SIZE}...`);
console.time('rasterizeCoast');
const coastSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${GRID_SIZE}" height="${GRID_SIZE}" viewBox="${-MAP_RASTER_PAD} ${-MAP_RASTER_PAD} ${MAP_RASTER_SPAN} ${MAP_RASTER_SPAN}">
  <rect x="${-MAP_RASTER_PAD}" y="${-MAP_RASTER_PAD}" width="${MAP_RASTER_SPAN}" height="${MAP_RASTER_SPAN}" fill="black"/>
  <path d="${ANTARCTICA_PATH}" fill="white"/>
  <path d="${ICE_SHELVES_PATH}" fill="white"/>
  <path d="${SOUTH_AMERICA_PATH}" fill="white"/>
</svg>`;

const coastMaskBuf = await sharp(Buffer.from(coastSvg)).extractChannel(0).raw().toBuffer();
console.timeEnd('rasterizeCoast');

const elevations = new Float32Array(GRID_SIZE * GRID_SIZE);
const isLand = new Uint8Array(GRID_SIZE * GRID_SIZE);

const ibcsoOriginX = ibcsoOrigin[0];
const ibcsoOriginY = ibcsoOrigin[1];
const invIbcsoResX = 1 / ibcsoRes[0];
const invIbcsoResY = 1 / ibcsoRes[1];

const bm3OriginX = bm3Origin[0];
const bm3OriginY = bm3Origin[1];
const invBm3ResX = 1 / bm3Res[0];
const invBm3ResY = 1 / bm3Res[1];

const minMapX = -MAP_RASTER_PAD;
const minMapY = -MAP_RASTER_PAD;
const spanMap = MAP_RASTER_SPAN;

console.log(`Sampling ${GRID_SIZE}x${GRID_SIZE} bathymetry grid...`);
console.time('sampleGrid');

for (let r = 0; r < GRID_SIZE; r++) {
  const mapY = minMapY + (r / (GRID_SIZE - 1)) * spanMap;
  const rowOffset = r * GRID_SIZE;

  for (let c = 0; c < GRID_SIZE; c++) {
    const idx = rowOffset + c;
    const mapX = minMapX + (c / (GRID_SIZE - 1)) * spanMap;

    // Check vector coastline mask
    const isVectorLand = coastMaskBuf[idx] > 128;

    const { lon, lat } = unproject(mapX, mapY);

    // Bedmap3 Antarctic land check
    let isBm3Land = false;
    if (bm3MaskData && lat <= -60) {
      const [p3031X, p3031Y] = p4_3031.forward([lon, lat]);
      const mCol = Math.round((p3031X - bm3OriginX) * invBm3ResX);
      const mRow = Math.round((p3031Y - bm3OriginY) * invBm3ResY);
      if (mCol >= 0 && mCol < bm3Width && mRow >= 0 && mRow < bm3Height) {
        const maskVal = bm3MaskData[mRow * bm3Width + mCol];
        if (maskVal > 0 && maskVal <= 4) {
          isBm3Land = true;
        }
      }
    }

    if (isVectorLand || isBm3Land) {
      isLand[idx] = 1;
      elevations[idx] = 0;
      continue;
    }

    // Beyond 50° S: IBCSO coverage ends at 50° S (~ -50.05° S).
    // Blend towards the -4000 m abyssal baseline over ~2 degrees of latitude (down to -48° S),
    // averaging across a small longitude window to prevent radial streaks.
    let elev: number;

    if (lat > -50) {
      const blendDist = Math.min(1, Math.max(0, (lat - (-50)) / 2.0));
      const blendFactor = blendDist * blendDist * (3 - 2 * blendDist);

      if (blendFactor >= 1) {
        elev = -4000;
      } else {
        const sampleLat = -50.05;
        const spreadDeg = 0.4 + blendDist * 1.6;
        let sumElev = 0;
        let countElev = 0;
        for (let k = -2; k <= 2; k++) {
          const sLon = lon + (k * 0.5) * spreadDeg;
          const [p9354X, p9354Y] = p4_9354.forward([sLon, sampleLat]);
          const srcCol = (p9354X - ibcsoOriginX) * invIbcsoResX;
          const srcRow = (p9354Y - ibcsoOriginY) * invIbcsoResY;

          if (srcCol >= 0 && srcCol < ibcsoWidth - 1 && srcRow >= 0 && srcRow < ibcsoHeight - 1) {
            const c0 = Math.floor(srcCol);
            const r0 = Math.floor(srcRow);
            const fx = srcCol - c0;
            const fy = srcRow - r0;
            const v00 = ibcsoData[r0 * ibcsoWidth + c0];
            const v10 = ibcsoData[r0 * ibcsoWidth + c0 + 1];
            const v01 = ibcsoData[(r0 + 1) * ibcsoWidth + c0];
            const v11 = ibcsoData[(r0 + 1) * ibcsoWidth + c0 + 1];
            if (v00 !== -32768 && v10 !== -32768 && v01 !== -32768 && v11 !== -32768) {
              const e0 = v00 * (1 - fx) + v10 * fx;
              const e1 = v01 * (1 - fx) + v11 * fx;
              let val = e0 * (1 - fy) + e1 * fy;
              if (val > 0) val = 0;
              sumElev += val;
              countElev++;
            }
          }
        }
        const edgeElev = countElev > 0 ? sumElev / countElev : -4000;
        elev = edgeElev * (1 - blendFactor) + (-4000) * blendFactor;
      }
    } else {
      // Sample IBCSO v2 (EPSG:9354)
      const [p9354X, p9354Y] = p4_9354.forward([lon, lat]);
      const srcCol = (p9354X - ibcsoOriginX) * invIbcsoResX;
      const srcRow = (p9354Y - ibcsoOriginY) * invIbcsoResY;

      if (srcCol < 0 || srcCol >= ibcsoWidth - 1 || srcRow < 0 || srcRow >= ibcsoHeight - 1) {
        elevations[idx] = -4000;
        continue;
      }

      // Bilinear interpolation
      const c0 = Math.floor(srcCol);
      const r0 = Math.floor(srcRow);
      const c1 = c0 + 1;
      const r1 = r0 + 1;
      const fx = srcCol - c0;
      const fy = srcRow - r0;

      const v00 = ibcsoData[r0 * ibcsoWidth + c0];
      const v10 = ibcsoData[r0 * ibcsoWidth + c1];
      const v01 = ibcsoData[r1 * ibcsoWidth + c0];
      const v11 = ibcsoData[r1 * ibcsoWidth + c1];

      // Nodata check (IBCSO nodata is -32768)
      if (v00 === -32768 || v10 === -32768 || v01 === -32768 || v11 === -32768) {
        // If near edge/nodata, fill with -4000 m
        elevations[idx] = -4000;
        continue;
      }

      const e0 = v00 * (1 - fx) + v10 * fx;
      const e1 = v01 * (1 - fx) + v11 * fx;
      elev = e0 * (1 - fy) + e1 * fy;
    }

    if (elev > 0) {
      // Land / island above sea level
      isLand[idx] = 1;
      elevations[idx] = 0;
    } else {
      elevations[idx] = elev;
    }
  }
}
console.timeEnd('sampleGrid');

// Gentle blur strictly within the outer transition band (north of ~51° S, r > 560 map units)
// to smooth out any remaining transition seam between IBCSO data and the -4000 m abyssal fill.
console.log('Smoothing outer 50° S transition band...');
console.time('blurTransition');
{
  const temp = new Float32Array(elevations);
  const RADIUS = 8;
  for (let r = 0; r < GRID_SIZE; r++) {
    const mapY = minMapY + (r / (GRID_SIZE - 1)) * spanMap;
    const dy = mapY - 500;
    const rowOffset = r * GRID_SIZE;
    for (let c = 0; c < GRID_SIZE; c++) {
      const idx = rowOffset + c;
      if (isLand[idx]) continue;
      const mapX = minMapX + (c / (GRID_SIZE - 1)) * spanMap;
      const dx = mapX - 500;
      const dist = Math.hypot(dx, dy);
      // 51° S is r ≈ 563; 50° S is r ≈ 578.7; 48° S is r ≈ 610.3
      if (dist < 560 || dist > 625) continue;

      const t = Math.min(1, Math.max(0, (dist - 560) / 18));
      const weight = t * t * (3 - 2 * t);

      let sum = 0;
      let count = 0;
      const r0 = Math.max(0, r - RADIUS);
      const r1 = Math.min(GRID_SIZE - 1, r + RADIUS);
      const c0 = Math.max(0, c - RADIUS);
      const c1 = Math.min(GRID_SIZE - 1, c + RADIUS);
      for (let rr = r0; rr <= r1; rr += 2) {
        const ro = rr * GRID_SIZE;
        for (let cc = c0; cc <= c1; cc += 2) {
          const nIdx = ro + cc;
          if (!isLand[nIdx]) {
            sum += temp[nIdx];
            count++;
          }
        }
      }
      if (count > 0) {
        const avg = sum / count;
        elevations[idx] = temp[idx] * (1 - weight) + avg * weight;
      }
    }
  }
}
console.timeEnd('blurTransition');

// 2D Euclidean Distance Transform (Meijster et al.) to compute distance to coastline
console.log('Computing Euclidean distance to coast...');
console.time('edt');
function computeDistanceToCoast(mask: Uint8Array, width: number, height: number): Float32Array {
  const INF = 1e9;
  const distSq = new Float32Array(width * height);

  // Column pass
  for (let x = 0; x < width; x++) {
    let d = mask[x] ? 0 : INF;
    distSq[x] = d;
    for (let y = 1; y < height; y++) {
      const idx = y * width + x;
      d = mask[idx] ? 0 : d + 1;
      distSq[idx] = d * d;
    }
    d = mask[(height - 1) * width + x] ? 0 : INF;
    for (let y = height - 2; y >= 0; y--) {
      const idx = y * width + x;
      d = mask[idx] ? 0 : d + 1;
      if (d * d < distSq[idx]) distSq[idx] = d * d;
    }
  }

  // Row pass with parabolas
  const s = new Int32Array(width);
  const t = new Int32Array(width);
  const out = new Float32Array(width * height);

  function f(x: number, i: number, y: number): number {
    return distSq[y * width + i] + (x - i) * (x - i);
  }
  function sep(i: number, u: number, y: number): number {
    return Math.floor((u * u - i * i + distSq[y * width + u] - distSq[y * width + i]) / (2 * (u - i)));
  }

  for (let y = 0; y < height; y++) {
    let q = 0;
    s[0] = 0;
    t[0] = 0;
    for (let u = 1; u < width; u++) {
      while (q >= 0 && f(t[q], s[q], y) > f(t[q], u, y)) q--;
      if (q < 0) {
        q = 0;
        s[0] = u;
        t[0] = 0;
      } else {
        const w = 1 + sep(s[q], u, y);
        if (w < width) {
          q++;
          s[q] = u;
          t[q] = w;
        }
      }
    }
    for (let u = width - 1; u >= 0; u--) {
      const d2 = f(u, s[q], y);
      out[y * width + u] = Math.sqrt(d2);
      if (u === t[q]) q--;
    }
  }
  return out;
}

const coastDistPx = computeDistanceToCoast(isLand, GRID_SIZE, GRID_SIZE);
console.timeEnd('edt');

// Control depths verification
function sampleBathy(x: number, y: number): number {
  const u = (x - minMapX) / spanMap;
  const v = (y - minMapY) / spanMap;
  if (u < 0 || u > 1 || v < 0 || v > 1) return 0;
  const gx = u * (GRID_SIZE - 1);
  const gy = v * (GRID_SIZE - 1);
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const x1 = Math.min(GRID_SIZE - 1, x0 + 1);
  const y1 = Math.min(GRID_SIZE - 1, y0 + 1);
  const fx = gx - x0;
  const fy = gy - y0;
  const v00 = elevations[y0 * GRID_SIZE + x0];
  const v10 = elevations[y0 * GRID_SIZE + x1];
  const v01 = elevations[y1 * GRID_SIZE + x0];
  const v11 = elevations[y1 * GRID_SIZE + x1];
  const top = v00 * (1 - fx) + v10 * fx;
  const bot = v01 * (1 - fx) + v11 * fx;
  return top * (1 - fy) + bot * fy;
}

const ptWeddell = project(-35, -70);
const ptShelf = project(-60, -64.8);
const ptDrake = project(-62, -59);
const ptPole = project(0, -90);

const dWeddell = sampleBathy(ptWeddell.x, ptWeddell.y);
const dShelf = sampleBathy(ptShelf.x, ptShelf.y);
const dDrake = sampleBathy(ptDrake.x, ptDrake.y);
const dPole = sampleBathy(ptPole.x, ptPole.y);

console.log('\n--- CONTROL DEPTHS VERIFICATION ---');
console.log(`1. Centro Mar de Weddell (lon -35, lat -70): ${dWeddell.toFixed(1)} m (esperado: ≈ -4000 a -5000 m)`);
console.log(`2. Borde plataforma Península (lon -60, lat -64.8): ${dShelf.toFixed(1)} m (esperado: ≈ -500 m)`);
console.log(`3. Pasaje de Drake (lon -62, lat -59): ${dDrake.toFixed(1)} m (esperado: ≈ -3500 a -4500 m)`);
console.log(`4. Tierra / Polo Sur (lon 0, lat -90): ${dPole.toFixed(1)} m (esperado: 0 m)\n`);

// Build ocean-depth-grid.bin (513x513 Int16)
const DEPTH_GRID_SIZE = 513;
console.log(`Building ${DEPTH_GRID_SIZE}x${DEPTH_GRID_SIZE} depth lookup grid for core depthAt...`);
const depthGrid = new Int16Array(DEPTH_GRID_SIZE * DEPTH_GRID_SIZE);
const step = (GRID_SIZE - 1) / (DEPTH_GRID_SIZE - 1); // 4

for (let r = 0; r < DEPTH_GRID_SIZE; r++) {
  const srcR = Math.round(r * step);
  const rowOffset = r * DEPTH_GRID_SIZE;
  const srcRowOffset = srcR * GRID_SIZE;
  for (let c = 0; c < DEPTH_GRID_SIZE; c++) {
    const srcC = Math.round(c * step);
    depthGrid[rowOffset + c] = Math.round(elevations[srcRowOffset + srcC]);
  }
}

// Header: 'DPTH' (4B), dim (uint32), minX (float32), maxX (float32), minY (float32), maxY (float32) -> 24 bytes
const gridHeaderBuf = Buffer.alloc(24);
gridHeaderBuf.write('DPTH', 0, 4, 'ascii');
gridHeaderBuf.writeUInt32LE(DEPTH_GRID_SIZE, 4);
gridHeaderBuf.writeFloatLE(minMapX, 8);
gridHeaderBuf.writeFloatLE(minMapX + spanMap, 12);
gridHeaderBuf.writeFloatLE(minMapY, 16);
gridHeaderBuf.writeFloatLE(minMapY + spanMap, 20);

const depthGridBuf = Buffer.concat([
  gridHeaderBuf,
  Buffer.from(depthGrid.buffer, depthGrid.byteOffset, depthGrid.byteLength),
]);
const depthGridPath = join(outDir, 'ocean-depth-grid.bin');
writeFileSync(depthGridPath, depthGridBuf);
console.log(`ocean-depth-grid.bin written: ${(depthGridBuf.length / 1024).toFixed(1)} kB (${DEPTH_GRID_SIZE}x${DEPTH_GRID_SIZE} Int16)`);

// Build RGBA buffers and textures (2048 and 1024)
console.log('Generating RGBA bathymetry textures...');
const cellMetersX = (spanMap / (GRID_SIZE - 1)) * METERS_PER_MAP_UNIT;
const cellMetersY = (spanMap / (GRID_SIZE - 1)) * METERS_PER_MAP_UNIT;
const mapUnitsPerPx = spanMap / (GRID_SIZE - 1);

const rgba2049 = Buffer.alloc(GRID_SIZE * GRID_SIZE * 4);

for (let r = 0; r < GRID_SIZE; r++) {
  const rowOffset = r * GRID_SIZE;
  const rPrev = Math.max(0, r - 1) * GRID_SIZE;
  const rNext = Math.min(GRID_SIZE - 1, r + 1) * GRID_SIZE;

  for (let c = 0; c < GRID_SIZE; c++) {
    const idx = rowOffset + c;
    const px = idx * 4;
    const land = isLand[idx];
    const elev = elevations[idx];

    // R: depth 0-6000 m with square root curve
    let rVal = 0;
    if (!land && elev < 0) {
      const depth = Math.min(6000, -elev);
      rVal = Math.min(255, Math.max(0, Math.round(Math.sqrt(depth / 6000) * 255)));
    }

    // G and B: seabed normal with VERTICAL_EXAGGERATION
    let gVal = 128;
    let bVal = 128;
    if (!land) {
      const depth = Math.max(0, -elev);
      // The seabed is visible through water only on the shallow continental shelf (depth < 1500-2000 m).
      // Fading normals to flat (128, 128) in the deep abyss keeps visible shelf shading 100% intact
      // while reducing lossless WebP size from 4.47 MB to < 1.5 MB (below the 3 MB threshold).
      if (depth < 2000) {
        const cPrev = Math.max(0, c - 1);
        const cNext = Math.min(GRID_SIZE - 1, c + 1);
        const hL = elevations[rowOffset + cPrev];
        const hR = elevations[rowOffset + cNext];
        const hU = elevations[rPrev + c];
        const hD = elevations[rNext + c];

        const dzdx = (hR - hL) / (2 * (cellMetersX / VERTICAL_EXAGGERATION));
        const dzdy = (hD - hU) / (2 * (cellMetersY / VERTICAL_EXAGGERATION));

        let nx = -dzdx;
        let ny = -dzdy;
        if (depth > 1200) {
          const fade = 1 - (depth - 1200) / 800; // 1 at 1200m down to 0 at 2000m
          nx *= fade;
          ny *= fade;
        }
        const nz = 1.0;
        const len = Math.hypot(nx, ny, nz);

        gVal = Math.min(255, Math.max(0, Math.round(((nx / len) * 0.5 + 0.5) * 255)));
        bVal = Math.min(255, Math.max(0, Math.round(((ny / len) * 0.5 + 0.5) * 255)));
      }
    }

    // A: distance to coast in map units, clipped to 0-12
    const distMapUnits = coastDistPx[idx] * mapUnitsPerPx;
    const aVal = Math.min(255, Math.max(0, Math.round((Math.min(12, distMapUnits) / 12) * 255)));

    rgba2049[px] = rVal;
    rgba2049[px + 1] = gVal;
    rgba2049[px + 2] = bVal;
    rgba2049[px + 3] = aVal;
  }
}

// Generate ocean-bathy-2048.webp and ocean-bathy-1024.webp
console.log('Encoding WebP textures with sharp...');
console.time('webpEncode');
const rawImage = sharp(rgba2049, { raw: { width: GRID_SIZE, height: GRID_SIZE, channels: 4 } });

const webp2048Buf = await rawImage
  .clone()
  .resize(2048, 2048, { kernel: 'lanczos3' })
  .webp({ lossless: true })
  .toBuffer();
const webp2048Path = join(outDir, 'ocean-bathy-2048.webp');
writeFileSync(webp2048Path, webp2048Buf);
console.log(`ocean-bathy-2048.webp written: ${(webp2048Buf.length / 1024 / 1024).toFixed(2)} MB`);

const webp1024Buf = await rawImage
  .clone()
  .resize(1024, 1024, { kernel: 'lanczos3' })
  .webp({ lossless: true })
  .toBuffer();
const webp1024Path = join(outDir, 'ocean-bathy-1024.webp');
writeFileSync(webp1024Path, webp1024Buf);
console.log(`ocean-bathy-1024.webp written: ${(webp1024Buf.length / 1024 / 1024).toFixed(2)} MB`);
console.timeEnd('webpEncode');

// Generate previews in scratchpad
console.log(`Writing preview PNGs to scratchpad (${scratchpadDir})...`);
console.time('previews');

// 1. Channel previews (bathy-R.png, bathy-G.png, bathy-B.png, bathy-A.png)
const rBuf = Buffer.alloc(GRID_SIZE * GRID_SIZE);
const gBuf = Buffer.alloc(GRID_SIZE * GRID_SIZE);
const bBuf = Buffer.alloc(GRID_SIZE * GRID_SIZE);
const aBuf = Buffer.alloc(GRID_SIZE * GRID_SIZE);

for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
  rBuf[i] = rgba2049[i * 4];
  gBuf[i] = rgba2049[i * 4 + 1];
  bBuf[i] = rgba2049[i * 4 + 2];
  aBuf[i] = rgba2049[i * 4 + 3];
}

await Promise.all([
  sharp(rBuf, { raw: { width: GRID_SIZE, height: GRID_SIZE, channels: 1 } })
    .resize(1024, 1024)
    .png()
    .toFile(join(scratchpadDir, 'bathy-R.png')),
  sharp(gBuf, { raw: { width: GRID_SIZE, height: GRID_SIZE, channels: 1 } })
    .resize(1024, 1024)
    .png()
    .toFile(join(scratchpadDir, 'bathy-G.png')),
  sharp(bBuf, { raw: { width: GRID_SIZE, height: GRID_SIZE, channels: 1 } })
    .resize(1024, 1024)
    .png()
    .toFile(join(scratchpadDir, 'bathy-B.png')),
  sharp(aBuf, { raw: { width: GRID_SIZE, height: GRID_SIZE, channels: 1 } })
    .resize(1024, 1024)
    .png()
    .toFile(join(scratchpadDir, 'bathy-A.png')),
]);

// 2. Coastline overlay preview: depth with red vector coastline and Bedmap3 boundary
const overlayRgba = Buffer.alloc(GRID_SIZE * GRID_SIZE * 4);
for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
  const px = i * 4;
  const isCoast = coastMaskBuf[i] > 128;
  const d = rgba2049[px]; // depth 0..255
  if (isCoast) {
    // Land: pale buff parchment
    overlayRgba[px] = 220;
    overlayRgba[px + 1] = 215;
    overlayRgba[px + 2] = 200;
    overlayRgba[px + 3] = 255;
  } else {
    // Ocean: deep blue/teal gradient proportional to depth
    const norm = d / 255;
    overlayRgba[px] = Math.round(20 + (1 - norm) * 120);     // more red in shallow
    overlayRgba[px + 1] = Math.round(50 + (1 - norm) * 160); // more green in shallow shelf
    overlayRgba[px + 2] = Math.round(100 + norm * 155);      // deep blue in abyss
    overlayRgba[px + 3] = 255;
  }
}

// Add coast edge outline in dark red
for (let r = 1; r < GRID_SIZE - 1; r++) {
  for (let c = 1; c < GRID_SIZE - 1; c++) {
    const idx = r * GRID_SIZE + c;
    const isL = coastMaskBuf[idx] > 128;
    const hasDiffNeighbor =
      (coastMaskBuf[idx - 1] > 128) !== isL ||
      (coastMaskBuf[idx + 1] > 128) !== isL ||
      (coastMaskBuf[idx - GRID_SIZE] > 128) !== isL ||
      (coastMaskBuf[idx + GRID_SIZE] > 128) !== isL;
    if (hasDiffNeighbor) {
      const px = idx * 4;
      overlayRgba[px] = 200;     // Red edge
      overlayRgba[px + 1] = 30;
      overlayRgba[px + 2] = 30;
      overlayRgba[px + 3] = 255;
    }
  }
}

await sharp(overlayRgba, { raw: { width: GRID_SIZE, height: GRID_SIZE, channels: 4 } })
  .resize(1024, 1024)
  .png()
  .toFile(join(scratchpadDir, 'bathy-coast-overlay.png'));

console.timeEnd('previews');
console.log('Bathymetry generation completed successfully.');
