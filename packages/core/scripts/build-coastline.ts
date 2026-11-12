/**
 * Natural Earth ne_50m_land (public domain) -> static SVG paths in the 0..1000 map space.
 * Run with `pnpm coastline`. The output (src/coastline.ts) is committed; d3-geo never ships to the client.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { geoPath, geoStereographic, geoCentroid } from 'd3-geo';
import type { Feature, FeatureCollection, Polygon, MultiPolygon } from 'geojson';
import { project, STEREO_RADIUS } from '../src/projection.ts';

const SOURCE_BASE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/';
const here = dirname(fileURLToPath(import.meta.url));
const outFile = join(here, '../src/coastline.ts');
const southernLandsFile = join(here, '../src/southern-lands.ts');
const TOLERANCE = 0.9;
const WIDE_TOLERANCE = 1.5;
const MIN_AREA = 4;

async function load(name: string): Promise<FeatureCollection<Polygon | MultiPolygon>> {
  const cacheFile = join(here, `../.cache/${name}.geojson`);
  if (!existsSync(cacheFile)) {
    mkdirSync(dirname(cacheFile), { recursive: true });
    const res = await fetch(SOURCE_BASE + name + '.geojson');
    if (!res.ok) throw new Error(`Natural Earth download failed: ${res.status}`);
    writeFileSync(cacheFile, await res.text());
  }
  return JSON.parse(readFileSync(cacheFile, 'utf8'));
}

const projection = geoStereographic()
  .rotate([0, 90])
  .scale(1590)
  .translate([500, 500])
  .clipAngle(42)
  .clipExtent([[-120, -120], [1120, 1120]]);

const wideProjection = geoStereographic()
  .rotate([0, 90])
  .scale(1590)
  .translate([500, 500])
  .clipAngle(80)
  .clipExtent([[-1000, -1000], [2000, 2000]]);

function checkProjection(proj: ReturnType<typeof geoStereographic>) {
  for (const [lon, lat] of [[-56.62, -64.24], [-68.3, -54.8], [0, -60], [90, -70], [166.67, -77.53]]) {
    const d = proj([lon, lat])!;
    const f = project(lon, lat);
    if (Math.hypot(d[0] - f.x, d[1] - f.y) > 0.5) {
      throw new Error(`d3 projection mismatch at ${lon},${lat}: d3=${d} formula=${f.x},${f.y}`);
    }
  }
}

type Pt = [number, number];

function simplify(points: Pt[], tol: number): Pt[] {
  if (points.length < 4) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    const [ax, ay] = points[a], [bx, by] = points[b];
    const len = Math.hypot(bx - ax, by - ay) || 1;
    let max = 0, idx = -1;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = points[i];
      const d = Math.abs((bx - ax) * (ay - py) - (ax - px) * (by - ay)) / len;
      if (d > max) { max = d; idx = i; }
    }
    if (max > tol && idx > 0) { keep[idx] = 1; stack.push([a, idx], [idx, b]); }
  }
  return points.filter((_, i) => keep[i]);
}

function area(points: Pt[]): number {
  let s = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i], [x2, y2] = points[(i + 1) % points.length];
    s += x1 * y2 - x2 * y1;
  }
  return Math.abs(s / 2);
}

/** d3 emits "M..L..Z" rings; parse, simplify, and re-serialize with one decimal. */
function toPath(feature: Feature): string {
  const raw = geoPath(projection)(feature) ?? '';
  const rings = raw.split('M').filter(Boolean).map((ring) =>
    ring.replace(/Z/g, '').split('L').map((p) => p.split(',').map(Number) as Pt),
  );
  return rings
    // Antarctica's ring runs down the antimeridian to the pole and back (x = 500, y >= 500): drop that seam.
    .map((r) => simplify(r.filter(([x, y]) => !(Math.abs(x - 500) < 0.3 && y >= 499.5)), TOLERANCE))
    .filter((r) => r.length >= 3 && area(r) >= MIN_AREA)
    .map((r) => 'M' + r.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join('L').replace(/\.0(?=[,L]|$)/g, '') + 'Z')
    .join('');
}

/** Project a feature and return simplified rings as flat [x0, y0, x1, y1, ...] arrays without closing duplicate. */
function toRings(feature: Feature, proj: ReturnType<typeof geoStereographic>, tol: number): number[][] {
  const raw = geoPath(proj)(feature) ?? '';
  const rings = raw.split('M').filter(Boolean).map((ring) =>
    ring.replace(/Z/g, '').split('L').map((p) => p.split(',').map(Number) as Pt),
  );
  return rings
    .map((r) => simplify(r, tol))
    .filter((r) => r.length >= 3 && area(r) >= MIN_AREA)
    .map((r) => r.flatMap(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]));
}

async function main() {
  checkProjection(projection);
  checkProjection(wideProjection);
  const land = await load('ne_50m_land');
  const shelves = await load('ne_50m_antarctic_ice_shelves_polys');
  const south = land.features.filter((f) => JSON.stringify(f.geometry.coordinates).match(/,-(5\d|[6-9]\d)\.?\d*\]/));
  const antarctic: string[] = [];
  const north: string[] = [];
  for (const f of south) {
    const path = toPath(f);
    if (!path) continue;
    (geoCentroid(f)[1] < -58 ? antarctic : north).push(path);
  }
  const shelfPath = shelves.features.map(toPath).join('');
  // Ross Ice Shelf is split in two polygons along the antimeridian; the map covers that seam.
  const seamYs = shelves.features
    .flatMap((f) => (geoPath(projection)(f) ?? '').match(/[\d.]+,[\d.]+/g) ?? [])
    .map((p) => p.split(',').map(Number))
    .filter(([x, y]) => Math.abs(x - 500) < 0.3 && y > 500)
    .map(([, y]) => y);
  const seam = `M500,${Math.min(...seamYs).toFixed(1)}L500,${Math.max(...seamYs).toFixed(1)}`;
  const out = `// Generated by scripts/build-coastline.ts from Natural Earth ne_50m_land and ne_50m_antarctic_ice_shelves_polys (public domain). Do not edit.
export const ANTARCTICA_PATH = ${JSON.stringify(antarctic.join(''))};
export const ICE_SHELVES_PATH = ${JSON.stringify(shelfPath)};
export const ICE_SHELF_SEAM = ${JSON.stringify(seam)};
export const SOUTH_AMERICA_PATH = ${JSON.stringify(north.join(''))};
`;
  writeFileSync(outFile, out);
  console.log(`coastline.ts: antarctica ${antarctic.join('').length} B, shelves ${shelfPath.length} B, south ${north.join('').length} B`);

  // Southern hemisphere lands outside Antarctica (South America, southern Africa, Australia, NZ, etc.)
  const southernLands = land.features
    .filter((f) => geoCentroid(f)[1] > -58)
    .flatMap((f) => toRings(f, wideProjection, WIDE_TOLERANCE));

  const R = Math.ceil(STEREO_RADIUS * Math.tan((40 * Math.PI) / 180));
  const minX = 500 - R;
  const maxX = 500 + R;
  const minY = 500 - R;
  const maxY = 500 + R;

  const southernLandsOut = `// Generated by scripts/build-coastline.ts from Natural Earth ne_50m_land (public domain). Do not edit.
/** Map-space square covered by southern-lands-color.webp (row 0 = minY). */
export const SOUTHERN_LANDS_TEXTURE_BOX = { minX: ${minX}, maxX: ${maxX}, minY: ${minY}, maxY: ${maxY} };

/** Land outside Antarctica down to ~10° S, as flat [x, y, ...] rings in the 0..1000 map space (same polar stereographic projection). Context only: no relief. */
export const SOUTHERN_LANDS: number[][] = ${JSON.stringify(southernLands)};
`;
  writeFileSync(southernLandsFile, southernLandsOut);
  console.log(`southern-lands.ts: ${Buffer.byteLength(southernLandsOut)} B (${southernLands.length} rings)`);
}

await main();
