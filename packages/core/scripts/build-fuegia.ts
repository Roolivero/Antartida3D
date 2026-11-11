/**
 * Generates the 3D relief of Tierra del Fuego and southern Patagonia from IBCSO v2:
 * - fuegia-mesh-hi.bin and fuegia-mesh-lo.bin (same MESH layout as the Antarctic terrain, no elevation grid):
 *   the land and the water close to its shore
 *
 * The Antarctic terrain comes from Bedmap3, which stops at 60° S, so South America had no land in 3D.
 * IBCSO v2 covers everything south of 50° S, land included, on a 500 m grid: the Beagle Channel
 * (about 5 km wide) is resolved, and the coastline comes from the same elevations as the relief.
 *
 * Dataset: Dorschel et al. (2022), The International Bathymetric Chart of the Southern Ocean Version 2 (IBCSO v2),
 * PANGAEA, https://doi.org/10.1594/PANGAEA.937574, CC BY 4.0.
 * Projection: EPSG:9354 (WGS 84 / IBCSO Polar Stereographic, standard parallel -65°).
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fromFile } from 'geotiff';
import proj4 from 'proj4';
import Martini from '@mapbox/martini';
import { unproject } from '../src/projection.ts';
import {
  FUEGIA_BOX,
  FUEGIA_DATA_LIMIT_LAT,
  FUEGIA_EDGE_FADE_DEG,
  FUEGIA_LAND_MASK,
  FUEGIA_WATER_MASK_MAX,
  FUEGIA_WATER_REACH,
} from '../src/fuegia.ts';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '../src/assets');
mkdirSync(outDir, { recursive: true });

proj4.defs(
  'EPSG:9354',
  '+proj=stere +lat_0=-90 +lat_ts=-65 +lon_0=0 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs'
);
const toIbcso = proj4('EPSG:4326', 'EPSG:9354');

const IBCSO_DIR = process.env.IBCSO_DIR || join(process.env.HOME || '', '.cache/antartida3d/ibcso');
const tifPath = join(IBCSO_DIR, 'IBCSO_v2_bed.tif');
if (!existsSync(tifPath)) {
  console.error(`IBCSO file missing: ${tifPath}`);
  process.exit(1);
}

const tif = await fromFile(tifPath);
const img = await tif.getImage();
const [originX, originY] = img.getOrigin();
const [resX, resY] = img.getResolution();
const width = img.getWidth();
const height = img.getHeight();
const noData = img.getGDALNoData();

const GRID = 2049; // Martini needs 2^n + 1; one cell is about 510 m at 55° S
const spanX = FUEGIA_BOX.maxX - FUEGIA_BOX.minX;
const spanY = FUEGIA_BOX.maxY - FUEGIA_BOX.minY;

// Source window covering the box, read once.
let c0 = Infinity, c1 = -Infinity, r0 = Infinity, r1 = -Infinity;
const srcCol = new Float32Array(GRID * GRID);
const srcRow = new Float32Array(GRID * GRID);
const fade = new Float32Array(GRID * GRID);
for (let r = 0; r < GRID; r++) {
  const mapY = FUEGIA_BOX.minY + (r / (GRID - 1)) * spanY;
  for (let c = 0; c < GRID; c++) {
    const mapX = FUEGIA_BOX.minX + (c / (GRID - 1)) * spanX;
    const { lon, lat } = unproject(mapX, mapY);
    const [px, py] = toIbcso.forward([lon, lat]);
    const sc = (px - originX) / resX;
    const sr = (py - originY) / resY;
    const i = r * GRID + c;
    srcCol[i] = sc;
    srcRow[i] = sr;
    // The data ends at 50° S: sink the land smoothly just before it instead of ending in a wall.
    const t = (FUEGIA_DATA_LIMIT_LAT - lat) / FUEGIA_EDGE_FADE_DEG;
    fade[i] = Math.min(1, Math.max(0, t));
    if (fade[i] > 0) {
      c0 = Math.min(c0, Math.floor(sc)); c1 = Math.max(c1, Math.ceil(sc) + 1);
      r0 = Math.min(r0, Math.floor(sr)); r1 = Math.max(r1, Math.ceil(sr) + 1);
    }
  }
}
c0 = Math.max(0, c0); r0 = Math.max(0, r0); c1 = Math.min(width, c1 + 1); r1 = Math.min(height, r1 + 1);
const winW = c1 - c0;
const src = (await img.readRasters({ window: [c0, r0, c1, r1] }))[0] as Int16Array;
console.log(`IBCSO ${width}x${height}, window ${winW}x${r1 - r0}`);

const elevations = new Float32Array(GRID * GRID); // land height in m, 0 on sea
const depths = new Float32Array(GRID * GRID); // sea depth in m, 0 on land
const known = new Uint8Array(GRID * GRID); // 1 where IBCSO has data inside the latitude limit
let maxElevation = 0;
let landCells = 0;
for (let i = 0; i < GRID * GRID; i++) {
  if (fade[i] <= 0) continue;
  const sc = srcCol[i] - c0;
  const sr = srcRow[i] - r0;
  const x0 = Math.floor(sc), y0 = Math.floor(sr);
  if (x0 < 0 || y0 < 0 || x0 + 1 >= winW || y0 + 1 >= r1 - r0) continue;
  const fx = sc - x0, fy = sr - y0;
  const v00 = src[y0 * winW + x0], v10 = src[y0 * winW + x0 + 1];
  const v01 = src[(y0 + 1) * winW + x0], v11 = src[(y0 + 1) * winW + x0 + 1];
  if (v00 === noData || v10 === noData || v01 === noData || v11 === noData) continue;
  const e = (v00 * (1 - fx) + v10 * fx) * (1 - fy) + (v01 * (1 - fx) + v11 * fx) * fy;
  known[i] = 1;
  if (e <= 0) {
    depths[i] = -e;
    continue;
  }
  const h = e * fade[i];
  elevations[i] = h;
  landCells++;
  if (h > maxElevation) maxElevation = h;
}
console.log(`Land cells: ${landCells}, max elevation: ${maxElevation.toFixed(0)} m`);

// Distance from every sea cell to the nearest land, in map units (two-pass chamfer transform).
// The ocean plane still draws its coast from Natural Earth, with a surf band wider than these
// channels, so this mesh also paints the water within FUEGIA_WATER_REACH of the real shore.
const cellUnits = spanX / (GRID - 1);
const FAR = 1e9;
const dist = new Float32Array(GRID * GRID).fill(FAR);
for (let i = 0; i < GRID * GRID; i++) if (elevations[i] > 0) dist[i] = 0;
const relax = (i: number, j: number, d: number) => {
  if (dist[j] + d < dist[i]) dist[i] = dist[j] + d;
};
for (let r = 0; r < GRID; r++) {
  for (let c = 0; c < GRID; c++) {
    const i = r * GRID + c;
    if (c > 0) relax(i, i - 1, 1);
    if (r > 0) relax(i, i - GRID, 1);
    if (r > 0 && c > 0) relax(i, i - GRID - 1, Math.SQRT2);
    if (r > 0 && c < GRID - 1) relax(i, i - GRID + 1, Math.SQRT2);
  }
}
for (let r = GRID - 1; r >= 0; r--) {
  for (let c = GRID - 1; c >= 0; c--) {
    const i = r * GRID + c;
    if (c < GRID - 1) relax(i, i + 1, 1);
    if (r < GRID - 1) relax(i, i + GRID, 1);
    if (r < GRID - 1 && c < GRID - 1) relax(i, i + GRID + 1, Math.SQRT2);
    if (r < GRID - 1 && c > 0) relax(i, i + GRID - 1, Math.SQRT2);
  }
}
const shoreUnits = (i: number) => dist[i] * cellUnits;
const inWater = (i: number) => known[i] === 1 && elevations[i] <= 0 && shoreUnits(i) < FUEGIA_WATER_REACH;

// Martini drops detail below its error threshold, and a low shore is only a few meters high.
// Simplify a stand-in surface where land stands on a tall step, the seabed keeps its shallow
// relief and the outer edge of the painted water is a ramp, so the coastline and that edge
// survive at any threshold. The values written to the mesh are the real ones.
const COAST_STEP_M = 600;
const SEABED_CAP_M = 150;
const WATER_EDGE_M = 150;
const standIn = new Float32Array(GRID * GRID);
for (let i = 0; i < GRID * GRID; i++) {
  if (elevations[i] > 0) standIn[i] = elevations[i] + COAST_STEP_M;
  else if (known[i]) {
    const out = Math.min(1, shoreUnits(i) / FUEGIA_WATER_REACH);
    standIn[i] = -Math.min(depths[i], SEABED_CAP_M) - WATER_EDGE_M * out;
  } else standIn[i] = -SEABED_CAP_M - WATER_EDGE_M;
}
const tile = new Martini(GRID).createTile(standIn);

function buildMesh(errorMeters: number, maxTriangles: number, level: 'hi' | 'lo') {
  let err = errorMeters;
  let raw = tile.getMesh(err);
  let kept: number[] = [];
  const cellOf = (v: number) => raw.vertices[2 * v + 1] * GRID + raw.vertices[2 * v];
  const keepUseful = () => {
    kept = [];
    for (let t = 0; t < raw.triangles.length; t += 3) {
      const a = raw.triangles[t], b = raw.triangles[t + 1], c = raw.triangles[t + 2];
      const ia = cellOf(a), ib = cellOf(b), ic = cellOf(c);
      const land = elevations[ia] > 0 || elevations[ib] > 0 || elevations[ic] > 0;
      if (!land && !inWater(ia) && !inWater(ib) && !inWater(ic)) continue; // open sea: the ocean plane draws it
      kept.push(a, b, c);
    }
  };
  keepUseful();
  while (kept.length / 3 > maxTriangles && err < 500) {
    err += 5;
    raw = tile.getMesh(err);
    keepUseful();
  }

  const numRaw = raw.vertices.length / 2;
  const remap = new Int32Array(numRaw).fill(-1);
  let numVerts = 0;
  for (const v of kept) if (remap[v] === -1) remap[v] = numVerts++;

  // Per vertex: `heights` is the land height or, on water, the depth (both in meters);
  // `masks` is FUEGIA_LAND_MASK on land or, on water, the distance to the shore scaled so that
  // FUEGIA_WATER_MASK_MAX means FUEGIA_WATER_REACH or more.
  const coordsXY = new Uint16Array(numVerts * 2);
  const heights = new Uint16Array(numVerts);
  const masks = new Uint8Array(numVerts);
  for (let v = 0; v < numRaw; v++) {
    const n = remap[v];
    if (n === -1) continue;
    const i = cellOf(v);
    coordsXY[n * 2] = raw.vertices[2 * v];
    coordsXY[n * 2 + 1] = raw.vertices[2 * v + 1];
    if (elevations[i] > 0) {
      heights[n] = Math.min(65535, Math.max(1, Math.round(elevations[i])));
      masks[n] = FUEGIA_LAND_MASK;
    } else {
      heights[n] = Math.min(65535, Math.round(depths[i]));
      const out = known[i] ? Math.min(1, shoreUnits(i) / FUEGIA_WATER_REACH) : 1;
      masks[n] = Math.round(out * FUEGIA_WATER_MASK_MAX);
    }
  }
  const indices = Uint32Array.from(kept, (v) => remap[v]);

  const header = Buffer.alloc(32);
  header.write('MESH', 0, 4, 'ascii');
  header.writeUInt32LE(numVerts, 4);
  header.writeUInt32LE(indices.length, 8);
  header.writeUInt32LE(GRID, 12);
  header.writeFloatLE(FUEGIA_BOX.minX, 16);
  header.writeFloatLE(FUEGIA_BOX.maxX, 20);
  header.writeFloatLE(FUEGIA_BOX.minY, 24);
  header.writeFloatLE(FUEGIA_BOX.maxY, 28);
  const body = 32 + coordsXY.byteLength + heights.byteLength + masks.byteLength;
  const bin = Buffer.concat([
    header,
    Buffer.from(coordsXY.buffer),
    Buffer.from(heights.buffer),
    Buffer.from(masks.buffer),
    Buffer.alloc((4 - (body % 4)) % 4),
    Buffer.from(indices.buffer),
  ]);
  writeFileSync(join(outDir, `fuegia-mesh-${level}.bin`), bin);
  console.log(
    `fuegia-mesh-${level}.bin: ${numVerts} verts, ${indices.length / 3} triangles, err ${err} m, ${(bin.length / 1024).toFixed(0)} kB`
  );
}

buildMesh(20, 260000, 'hi');
buildMesh(60, 90000, 'lo');
