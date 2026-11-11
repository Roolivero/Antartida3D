/**
 * Generates 3D terrain assets from Bedmap3 GeoTIFFs:
 * - terrain-mesh-hi.bin and terrain-mesh-lo.bin
 * - terrain-relief-4096.webp and terrain-relief-2048.webp
 * - terrain-light-2048.webp (ambient occlusion and sun shadows)
 * - paper-512.webp
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fromFile } from 'geotiff';
import proj4 from 'proj4';
import Martini from '@mapbox/martini';
import sharp from 'sharp';
import { chromium } from '@playwright/test';
import { project, unproject } from '../src/projection.ts';
import { ANTARCTICA_PATH } from '../src/coastline.ts';
import { SVG_DEFS } from '../src/svg/filters.ts';
import { clampTerrainSpikes, METERS_PER_MAP_UNIT, SUN, VERTICAL_EXAGGERATION } from '../src/relief.ts';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '../src/assets');
mkdirSync(outDir, { recursive: true });

// Setup EPSG:3031 projection
proj4.defs(
  'EPSG:3031',
  '+proj=stere +lat_0=-90 +lat_ts=-71 +lon_0=0 +k=1 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs'
);
const p4 = proj4('EPSG:4326', 'EPSG:3031');

// Compute TERRAIN_BOX from ANTARCTICA_PATH + 10 margin
const coords = (ANTARCTICA_PATH.match(/[0-9.]+,[0-9.]+/g) || []).map((s) => s.split(',').map(Number));
let rawMinX = Infinity, rawMaxX = -Infinity, rawMinY = Infinity, rawMaxY = -Infinity;
for (const [x, y] of coords) {
  if (x < rawMinX) rawMinX = x;
  if (x > rawMaxX) rawMaxX = x;
  if (y < rawMinY) rawMinY = y;
  if (y > rawMaxY) rawMaxY = y;
}
export const TERRAIN_BOX = {
  minX: rawMinX - 10,
  maxX: rawMaxX + 10,
  minY: rawMinY - 10,
  maxY: rawMaxY + 10,
};

const BEDMAP3_DIR =
  process.env.BEDMAP3_DIR ||
  join(process.env.HOME || '/home/lk', '.cache/antartida3d/bedmap3');
const surfaceTifPath = join(BEDMAP3_DIR, 'bm3_surface.tif');
const masksTifPath = join(BEDMAP3_DIR, 'bm3_masks.tif');

if (!existsSync(surfaceTifPath) || !existsSync(masksTifPath)) {
  console.error(`Bedmap3 files missing in ${BEDMAP3_DIR}`);
  process.exit(1);
}

console.log('Loading Bedmap3 surface and masks GeoTIFFs...');
console.time('loadTif');
const [surfTif, maskTif] = await Promise.all([fromFile(surfaceTifPath), fromFile(masksTifPath)]);
const [surfImg, maskImg] = await Promise.all([surfTif.getImage(), maskTif.getImage()]);

const surfOrigin = surfImg.getOrigin(); // [-3333500, 3333500, 0]
const surfRes = surfImg.getResolution(); // [500, -500, 0]
const surfWidth = surfImg.getWidth(); // 13334
const surfHeight = surfImg.getHeight(); // 13334

const [surfRasters, maskRasters] = await Promise.all([surfImg.readRasters(), maskImg.readRasters()]);
const surfData = surfRasters[0] as Int16Array;
const maskData = maskRasters[0] as Int16Array;
console.timeEnd('loadTif');

console.log(`TIFF size: ${surfWidth}x${surfHeight}`);

// Output grid of 4097x4097 over TERRAIN_BOX
const GRID_SIZE = 4097;
const elevations = new Float32Array(GRID_SIZE * GRID_SIZE);
const masks = new Uint8Array(GRID_SIZE * GRID_SIZE);

console.log(`Sampling ${GRID_SIZE}x${GRID_SIZE} grid over TERRAIN_BOX...`);
console.time('gridSample');

let maxElevation = -Infinity;
let poleElevation = 0;
let domeAElevation = 0;

const invSurfResX = 1 / surfRes[0];
const invSurfResY = 1 / surfRes[1];
const surfOriginX = surfOrigin[0];
const surfOriginY = surfOrigin[1];

const spanX = TERRAIN_BOX.maxX - TERRAIN_BOX.minX;
const spanY = TERRAIN_BOX.maxY - TERRAIN_BOX.minY;

for (let r = 0; r < GRID_SIZE; r++) {
  const mapY = TERRAIN_BOX.minY + (r / (GRID_SIZE - 1)) * spanY;
  const rowOffset = r * GRID_SIZE;

  for (let c = 0; c < GRID_SIZE; c++) {
    const mapX = TERRAIN_BOX.minX + (c / (GRID_SIZE - 1)) * spanX;
    const { lon, lat } = unproject(mapX, mapY);

    if (lat > -60) {
      elevations[rowOffset + c] = 0;
      masks[rowOffset + c] = 0;
      continue;
    }

    const [projX, projY] = p4.forward([lon, lat]);
    const srcCol = (projX - surfOriginX) * invSurfResX;
    const srcRow = (projY - surfOriginY) * invSurfResY;

    if (srcCol < 0 || srcCol >= surfWidth - 1 || srcRow < 0 || srcRow >= surfHeight - 1) {
      elevations[rowOffset + c] = 0;
      masks[rowOffset + c] = 0;
      continue;
    }

    // Nearest neighbor mask
    const mCol = Math.round(srcCol);
    const mRow = Math.round(srcRow);
    const rawMask = maskData[mRow * surfWidth + mCol];
    const maskVal = rawMask > 0 && rawMask <= 4 ? rawMask : 0;
    masks[rowOffset + c] = maskVal;

    // Bilinear interpolation for elevation
    const c0 = Math.floor(srcCol);
    const r0 = Math.floor(srcRow);
    const c1 = c0 + 1;
    const r1 = r0 + 1;
    const fx = srcCol - c0;
    const fy = srcRow - r0;

    const idx00 = r0 * surfWidth + c0;
    const idx10 = r0 * surfWidth + c1;
    const idx01 = r1 * surfWidth + c0;
    const idx11 = r1 * surfWidth + c1;

    const v00 = surfData[idx00];
    const v10 = surfData[idx10];
    const v01 = surfData[idx01];
    const v11 = surfData[idx11];

    if (v00 === -9999 || v10 === -9999 || v01 === -9999 || v11 === -9999 || maskVal === 0) {
      elevations[rowOffset + c] = 0;
    } else {
      const e0 = v00 * (1 - fx) + v10 * fx;
      const e1 = v01 * (1 - fx) + v11 * fx;
      const elev = e0 * (1 - fy) + e1 * fy;
      const finalElev = elev > 0 ? elev : 0;
      elevations[rowOffset + c] = finalElev;
      if (finalElev > maxElevation) maxElevation = finalElev;
    }
  }
}
console.timeEnd('gridSample');

console.time('despike');
const clampedSpikes = clampTerrainSpikes(elevations, GRID_SIZE, 35, {
  masks,
  radii: [6, 4, 2, 1],
  passes: 4,
  smoothPasses: 2,
});
maxElevation = 0;
for (let i = 0; i < elevations.length; i++) {
  if (elevations[i] > maxElevation) maxElevation = elevations[i];
}
console.timeEnd('despike');
console.log(`Clamped ${clampedSpikes} spike cells on ${GRID_SIZE}x${GRID_SIZE} grid`);

// Compute 2-pass Chamfer signed distance field (in map units) to Bedmap3 coastline (masks > 0 vs 0)
console.time('coastSdf');
const distCells = new Float32Array(GRID_SIZE * GRID_SIZE).fill(1e6);
for (let r = 0; r < GRID_SIZE; r++) {
  const row = r * GRID_SIZE;
  for (let c = 0; c < GRID_SIZE; c++) {
    const idx = row + c;
    const land = masks[idx] > 0;
    const diffL = c > 0 && (masks[idx - 1] > 0) !== land;
    const diffR = c + 1 < GRID_SIZE && (masks[idx + 1] > 0) !== land;
    const diffU = r > 0 && (masks[idx - GRID_SIZE] > 0) !== land;
    const diffD = r + 1 < GRID_SIZE && (masks[idx + GRID_SIZE] > 0) !== land;
    if (diffL || diffR || diffU || diffD) {
      distCells[idx] = 0.5;
    }
  }
}
const DIAG = Math.SQRT2;
for (let r = 0; r < GRID_SIZE; r++) {
  const row = r * GRID_SIZE;
  for (let c = 0; c < GRID_SIZE; c++) {
    const idx = row + c;
    let d = distCells[idx];
    if (c > 0) d = Math.min(d, distCells[idx - 1] + 1);
    if (r > 0) {
      d = Math.min(d, distCells[idx - GRID_SIZE] + 1);
      if (c > 0) d = Math.min(d, distCells[idx - GRID_SIZE - 1] + DIAG);
      if (c + 1 < GRID_SIZE) d = Math.min(d, distCells[idx - GRID_SIZE + 1] + DIAG);
    }
    distCells[idx] = d;
  }
}
for (let r = GRID_SIZE - 1; r >= 0; r--) {
  const row = r * GRID_SIZE;
  for (let c = GRID_SIZE - 1; c >= 0; c--) {
    const idx = row + c;
    let d = distCells[idx];
    if (c + 1 < GRID_SIZE) d = Math.min(d, distCells[idx + 1] + 1);
    if (r + 1 < GRID_SIZE) {
      d = Math.min(d, distCells[idx + GRID_SIZE] + 1);
      if (c + 1 < GRID_SIZE) d = Math.min(d, distCells[idx + GRID_SIZE + 1] + DIAG);
      if (c > 0) d = Math.min(d, distCells[idx + GRID_SIZE - 1] + DIAG);
    }
    distCells[idx] = d;
  }
}
const cellMapUnits = spanX / (GRID_SIZE - 1);
const coastSdfGrid = new Float32Array(GRID_SIZE * GRID_SIZE);
for (let i = 0; i < coastSdfGrid.length; i++) {
  const sign = masks[i] > 0 ? 1 : -1;
  coastSdfGrid[i] = sign * distCells[i] * cellMapUnits;
}
console.timeEnd('coastSdf');

// Sample Pole and Dome A directly for logging
const poleMap = project(0, -90);
const poleC = Math.round(((poleMap.x - TERRAIN_BOX.minX) / spanX) * (GRID_SIZE - 1));
const poleR = Math.round(((poleMap.y - TERRAIN_BOX.minY) / spanY) * (GRID_SIZE - 1));
poleElevation = elevations[poleR * GRID_SIZE + poleC];

const domeAMap = project(77.35, -80.37);
const domeAC = Math.round(((domeAMap.x - TERRAIN_BOX.minX) / spanX) * (GRID_SIZE - 1));
const domeAR = Math.round(((domeAMap.y - TERRAIN_BOX.minY) / spanY) * (GRID_SIZE - 1));
domeAElevation = elevations[domeAR * GRID_SIZE + domeAC];

console.log(`Max elevation: ${maxElevation.toFixed(1)} m`);
console.log(`South Pole elevation: ${poleElevation.toFixed(1)} m (grid [${poleC}, ${poleR}])`);
console.log(`Dome A elevation: ${domeAElevation.toFixed(1)} m (grid [${domeAC}, ${domeAR}])`);

// Step 11: Products (Mesh, Relief textures, Paper texture)
console.log('Generating Martini RTIN meshes (2049x2049)...');
const MARTINI_SIZE = 2049;
const martiniElevations = new Float32Array(MARTINI_SIZE * MARTINI_SIZE);
const martiniMasks = new Uint8Array(MARTINI_SIZE * MARTINI_SIZE);
const martiniInput = new Float32Array(MARTINI_SIZE * MARTINI_SIZE);
// Negative ocean sentinel forces Martini RTIN to subdivide triangles crossing the Bedmap3 coastline
// (especially low ~38 m floating ice shelves like Ross and Ronne where 38 m vs 0 m had <25 m midpoint error).
const OCEAN_SENTINEL_M = -250;

for (let r = 0; r < MARTINI_SIZE; r++) {
  const srcR = r * 2;
  const srcRow = srcR * GRID_SIZE;
  const dstRow = r * MARTINI_SIZE;
  for (let c = 0; c < MARTINI_SIZE; c++) {
    const srcC = c * 2;
    const h = elevations[srcRow + srcC];
    const m = masks[srcRow + srcC];
    martiniElevations[dstRow + c] = h;
    martiniMasks[dstRow + c] = m;
    martiniInput[dstRow + c] = m === 0 ? OCEAN_SENTINEL_M : h;
  }
}

const martini = new Martini(MARTINI_SIZE);
const tile = martini.createTile(martiniInput);

function buildMeshBuffer(errorMeters: number, maxTriangles: number, levelName: string) {
  let err = errorMeters;
  let rawMesh = tile.getMesh(err);
  while (rawMesh.triangles.length / 3 > maxTriangles && err < 300) {
    err += 5;
    rawMesh = tile.getMesh(err);
  }

  const rawIndices = rawMesh.triangles;
  const rawVerts = rawMesh.vertices;
  const numRawVerts = rawVerts.length / 2;

  // Filter out triangles that are entirely ocean (all 3 vertices have elevation <= 0 and mask === 0)
  const isOceanVert = new Uint8Array(numRawVerts);
  for (let i = 0; i < numRawVerts; i++) {
    const vx = rawVerts[2 * i];
    const vy = rawVerts[2 * i + 1];
    const idx = vy * MARTINI_SIZE + vx;
    if (martiniElevations[idx] <= 0 && martiniMasks[idx] === 0) {
      isOceanVert[i] = 1;
    }
  }

  const keptIndices: number[] = [];
  const vertexUsed = new Uint8Array(numRawVerts);
  for (let t = 0; t < rawIndices.length; t += 3) {
    const i0 = rawIndices[t];
    const i1 = rawIndices[t + 1];
    const i2 = rawIndices[t + 2];
    if (isOceanVert[i0] && isOceanVert[i1] && isOceanVert[i2]) {
      continue; // completely ocean
    }
    keptIndices.push(i0, i1, i2);
    vertexUsed[i0] = 1;
    vertexUsed[i1] = 1;
    vertexUsed[i2] = 1;
  }

  // Remap vertices
  const remap = new Int32Array(numRawVerts).fill(-1);
  let numVerts = 0;
  for (let i = 0; i < numRawVerts; i++) {
    if (vertexUsed[i]) remap[i] = numVerts++;
  }

  const finalIndices = new Uint32Array(keptIndices.length);
  for (let i = 0; i < keptIndices.length; i++) {
    finalIndices[i] = remap[keptIndices[i]];
  }

  const coordsXY = new Uint16Array(numVerts * 2);
  const heights = new Uint16Array(numVerts);
  const vertMasks = new Uint8Array(numVerts);

  for (let i = 0; i < numRawVerts; i++) {
    const newIdx = remap[i];
    if (newIdx === -1) continue;
    const vx = rawVerts[2 * i];
    const vy = rawVerts[2 * i + 1];
    coordsXY[newIdx * 2] = vx;
    coordsXY[newIdx * 2 + 1] = vy;
    const gridIdx = vy * MARTINI_SIZE + vx;
    heights[newIdx] = Math.min(65535, Math.round(martiniElevations[gridIdx]));
    vertMasks[newIdx] = martiniMasks[gridIdx];
  }

  // Header:
  // [0..3]: 'MESH' (4 bytes)
  // [4..7]: numVerts (uint32)
  // [8..11]: numIndices (uint32)
  // [12..15]: MARTINI_SIZE (uint32)
  // [16..19]: minX (float32)
  // [20..23]: maxX (float32)
  // [24..27]: minY (float32)
  // [28..31]: maxY (float32)
  const headerBuf = Buffer.alloc(32);
  headerBuf.write('MESH', 0, 4, 'ascii');
  headerBuf.writeUInt32LE(numVerts, 4);
  headerBuf.writeUInt32LE(finalIndices.length, 8);
  headerBuf.writeUInt32LE(MARTINI_SIZE, 12);
  headerBuf.writeFloatLE(TERRAIN_BOX.minX, 16);
  headerBuf.writeFloatLE(TERRAIN_BOX.maxX, 20);
  headerBuf.writeFloatLE(TERRAIN_BOX.minY, 24);
  headerBuf.writeFloatLE(TERRAIN_BOX.maxY, 28);

  const currentOffset =
    32 + coordsXY.byteLength + heights.byteLength + vertMasks.byteLength;
  const padding = (4 - (currentOffset % 4)) % 4;
  const paddingBuf = Buffer.alloc(padding);

  // Elevation grid for O(1) bilinear heightAt lookup
  const ELEV_GRID_SIZE = 1025;
  const elevationGrid = new Uint16Array(ELEV_GRID_SIZE * ELEV_GRID_SIZE);
  for (let r = 0; r < ELEV_GRID_SIZE; r++) {
    const srcR = r * 2;
    const dstRow = r * ELEV_GRID_SIZE;
    const srcRow = srcR * MARTINI_SIZE;
    for (let c = 0; c < ELEV_GRID_SIZE; c++) {
      const srcC = c * 2;
      const h = Math.round(martiniElevations[srcRow + srcC]);
      elevationGrid[dstRow + c] = Math.min(65535, Math.max(0, h));
    }
  }

  const elevGridHeader = Buffer.alloc(4);
  elevGridHeader.writeUInt32LE(ELEV_GRID_SIZE, 0);

  const binBuf = Buffer.concat([
    headerBuf,
    Buffer.from(coordsXY.buffer, coordsXY.byteOffset, coordsXY.byteLength),
    Buffer.from(heights.buffer, heights.byteOffset, heights.byteLength),
    Buffer.from(vertMasks.buffer, vertMasks.byteOffset, vertMasks.byteLength),
    paddingBuf,
    Buffer.from(finalIndices.buffer, finalIndices.byteOffset, finalIndices.byteLength),
    elevGridHeader,
    Buffer.from(elevationGrid.buffer, elevationGrid.byteOffset, elevationGrid.byteLength),
  ]);

  const path = join(outDir, `terrain-mesh-${levelName}.bin`);
  writeFileSync(path, binBuf);
  console.log(
    `terrain-mesh-${levelName}.bin: ${numVerts} verts, ${finalIndices.length / 3} triangles, err: ${err}m, size: ${(binBuf.length / 1024).toFixed(0)} kB`
  );
  return { numVerts, numTriangles: finalIndices.length / 3, bytes: binBuf.length };
}

buildMeshBuffer(25, 400000, 'hi');
buildMeshBuffer(70, 120000, 'lo');

// Step 11: Normal and Height Relief WebP textures

async function buildReliefTexture(size: number) {
  console.log(`Generating relief texture ${size}x${size}...`);
  const rgba = Buffer.alloc(size * size * 4);
  const step = (GRID_SIZE - 1) / (size - 1);

  // Meter span across TERRAIN_BOX in map space:
  // 1 map unit = STEREO_RADIUS ... Let's calculate ground scale in meters.
  // In EPSG:3031, 1 degree at standard parallel has known scale.
  // Near the pole, 1 map unit ≈ 3500-4000 meters.
  // Specifically: dR/dLat near pole is STEREO_RADIUS / 2 radians ≈ 1590 / 114.6 ≈ 13.87 units per degree.
  // 1 degree lat ≈ 111,139 m -> 1 map unit ≈ 111,139 / 13.87 ≈ 8,013 m.
  // For normal slope, dx and dy in world units (map units * VERTICAL_EXAGGERATION):
  const cellMetersX = ((TERRAIN_BOX.maxX - TERRAIN_BOX.minX) / (size - 1)) * METERS_PER_MAP_UNIT;
  const cellMetersY = ((TERRAIN_BOX.maxY - TERRAIN_BOX.minY) / (size - 1)) * METERS_PER_MAP_UNIT;

  for (let r = 0; r < size; r++) {
    const gridR = Math.round(r * step);
    const rowOffset = r * size * 4;

    const rPrev = Math.max(0, gridR - 1) * GRID_SIZE;
    const rNext = Math.min(GRID_SIZE - 1, gridR + 1) * GRID_SIZE;

    for (let c = 0; c < size; c++) {
      const gridC = Math.round(c * step);
      const cPrev = Math.max(0, gridC - 1);
      const cNext = Math.min(GRID_SIZE - 1, gridC + 1);

      const hL = elevations[gridR * GRID_SIZE + cPrev];
      const hR = elevations[gridR * GRID_SIZE + cNext];
      const hU = elevations[rPrev + gridC];
      const hD = elevations[rNext + gridC];

      const dzdx = ((hR - hL) / (2 * (cellMetersX / VERTICAL_EXAGGERATION)));
      const dzdy = ((hD - hU) / (2 * (cellMetersY / VERTICAL_EXAGGERATION)));

      // Normal vector = normalize([-dzdx, 1, -dzdy]) or standard tangent-space [-dzdx, -dzdy, 1]
      // Mapping to RGB: [-1..1] -> [0..255]
      const nx = -dzdx;
      const ny = -dzdy;
      const nz = 1.0;
      const len = Math.hypot(nx, ny, nz);

      const rVal = Math.round(((nx / len) * 0.5 + 0.5) * 255);
      const gVal = Math.round(((ny / len) * 0.5 + 0.5) * 255);
      const bVal = Math.round(((nz / len) * 0.5 + 0.5) * 255);

      const sdfMap = coastSdfGrid[gridR * GRID_SIZE + gridC];
      // Signed distance to Bedmap3 coastline in map units: 0 at -1.0, 32 at 0.0 (coastline), 255 at +6.97
      const aVal = Math.min(255, Math.max(0, Math.round(32 + sdfMap * 32)));

      const px = rowOffset + c * 4;
      rgba[px] = rVal;
      rgba[px + 1] = gVal;
      rgba[px + 2] = bVal;
      rgba[px + 3] = aVal;
    }
  }

  const outPath = join(outDir, `terrain-relief-${size}.webp`);
  await sharp(rgba, { raw: { width: size, height: size, channels: 4 } })
    .webp({ lossless: true })
    .toFile(outPath);
  console.log(`terrain-relief-${size}.webp written`);
}

await buildReliefTexture(4096);
await buildReliefTexture(2048);

// Light texture: ambient occlusion (R) and cast shadow from the fixed sun (G), baked on the 2049 grid.
// These are the strongest depth cues and too expensive to compute per frame.
async function buildLightTexture() {
  const S = MARTINI_SIZE;
  const cellX = ((TERRAIN_BOX.maxX - TERRAIN_BOX.minX) / (S - 1)) * METERS_PER_MAP_UNIT;
  const cellY = ((TERRAIN_BOX.maxY - TERRAIN_BOX.minY) / (S - 1)) * METERS_PER_MAP_UNIT;
  const H = new Float32Array(S * S);
  let maxH = 0;
  for (let i = 0; i < H.length; i++) {
    H[i] = martiniElevations[i] * VERTICAL_EXAGGERATION;
    if (H[i] > maxH) maxH = H[i];
  }
  const ao = new Float32Array(S * S).fill(1);
  const lit = new Float32Array(S * S).fill(1);

  // Horizon-based ambient occlusion: 16 directions, distances growing geometrically (in cells).
  const DIRS = 16;
  const STEPS = [1, 2, 3, 5, 8, 12, 18, 27, 40, 60, 90];
  const dirs = Array.from({ length: DIRS }, (_, k) => {
    const a = (k / DIRS) * Math.PI * 2;
    return [Math.cos(a), Math.sin(a)];
  });

  // Shadow ray towards the sun: map north is -row, west is -col.
  const az = (SUN.azimuthDeg * Math.PI) / 180;
  const sunC = Math.sin(az), sunR = -Math.cos(az);
  const tanSun = Math.tan((SUN.elevationDeg * Math.PI) / 180);
  const stepMeters = Math.hypot(sunC * cellX, sunR * cellY);
  const PENUMBRA = 0.12; // tan-angle range over which the shadow edge fades

  for (let r = 0; r < S; r++) {
    for (let c = 0; c < S; c++) {
      const i = r * S + c;
      const h0 = H[i];
      if (h0 <= 0) continue; // ocean: fully open and lit

      let occ = 0;
      for (const [dc, dr] of dirs) {
        let maxTan = 0;
        for (const d of STEPS) {
          const cc = Math.round(c + dc * d), rr = Math.round(r + dr * d);
          if (cc < 0 || rr < 0 || cc >= S || rr >= S) break;
          const dist = Math.hypot(dc * d * cellX, dr * d * cellY);
          const t = (H[rr * S + cc] - h0) / dist;
          if (t > maxTan) maxTan = t;
        }
        occ += Math.sin(Math.atan(maxTan));
      }
      ao[i] = 1 - occ / DIRS;

      let worst = -Infinity;
      for (let d = 1; d < 400; d++) {
        const dist = d * stepMeters;
        if (h0 + dist * tanSun > maxH) break; // the ray is above every peak
        const cc = Math.round(c + sunC * d), rr = Math.round(r + sunR * d);
        if (cc < 0 || rr < 0 || cc >= S || rr >= S) break;
        const excess = (H[rr * S + cc] - h0) / dist - tanSun;
        if (excess > worst) worst = excess;
      }
      lit[i] = worst === -Infinity ? 1 : 1 - Math.min(1, Math.max(0, (worst + PENUMBRA) / (2 * PENUMBRA)));
    }
  }

  const rgb = Buffer.alloc(S * S * 3);
  for (let i = 0; i < S * S; i++) {
    rgb[i * 3] = Math.round(Math.max(0, Math.min(1, ao[i])) * 255);
    rgb[i * 3 + 1] = Math.round(lit[i] * 255);
  }
  // AO and shadows are low-frequency: one lossy 2048 texture serves every screen.
  const outPath = join(outDir, 'terrain-light-2048.webp');
  await sharp(rgb, { raw: { width: S, height: S, channels: 3 } })
    .resize(2048, 2048)
    .webp({ quality: 90 })
    .toFile(outPath);
  console.log('terrain-light-2048.webp written');
}

await buildLightTexture();

// Step 11: paper-512.webp baked with Chromium
console.log('Generating paper-512.webp with Chromium...');
const executablePath =
  process.env.CHROMIUM_PATH ??
  ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome'].find(existsSync);
const browser = await chromium.launch({ executablePath });
const page = await browser.newPage();

const paperSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>${SVG_DEFS}</defs>
  <rect width="512" height="512" fill="#EAE0D0" />
  <rect width="512" height="512" filter="url(#paperf)" opacity="0.6" />
</svg>`;

const dataUrl = await page.evaluate(async ({ svg }) => {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  const img = new Image();
  img.src = url;
  await img.decode();
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  canvas.getContext('2d')!.drawImage(img, 0, 0, 512, 512);
  URL.revokeObjectURL(url);
  return canvas.toDataURL('image/webp', 0.9);
}, { svg: paperSvg });
await browser.close();

const paperBuf = Buffer.from(dataUrl.split(',')[1], 'base64');
writeFileSync(join(outDir, 'paper-512.webp'), paperBuf);
console.log(`paper-512.webp written: ${(paperBuf.length / 1024).toFixed(0)} kB`);

console.log('All terrain assets generated successfully.');
