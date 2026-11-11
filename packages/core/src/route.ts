import { project } from './projection.ts';

type Point = { x: number; y: number };

/**
 * Ushuaia–Marambio sea route as [lon, lat] waypoints.
 *
 * ILLUSTRATIVE: this is not the real track of any ship (no public source for it). It is a plausible
 * sea path traced over the IBCSO v2 relief the 3D map shows, so the vehicle stays on the water:
 * Ushuaia → east along the Beagle Channel, through Mackinlay Pass and north of Picton Island →
 * east of Nueva Island → off Cape Horn → across the Drake Passage → Nelson Strait (South Shetlands)
 * → Bransfield Strait → Antarctic Sound (between the peninsula tip and Joinville Island) → Marambio.
 * The simplified Natural Earth coastline of the 2D map closes the Beagle, so the 2D line touches
 * its drawn coast there.
 * Endpoints: Ushuaia (68.30° W, 54.81° S) and Base Marambio (56.62° W, 64.23° S). [Fuente a definir]
 */
export const ROUTE_WAYPOINTS: readonly (readonly [number, number])[] = [
  [-68.3, -54.81], // Ushuaia
  [-68.22, -54.84], // out of Ushuaia Bay
  [-68.12, -54.865], // Beagle Channel
  [-67.94, -54.88],
  [-67.8, -54.893],
  [-67.66, -54.905],
  [-67.56, -54.915], // Mackinlay Pass, between Gable Island and Navarino
  [-67.46, -54.9158],
  [-67.38, -54.9155],
  [-67.25, -54.916],
  [-67.02, -54.965],
  [-66.78, -55.03], // between Picton Island and Tierra del Fuego
  [-66.5, -55.1], // Beagle eastern mouth
  [-66.2, -55.25], // east of Nueva Island
  [-66.25, -55.7],
  [-66.6, -56.15], // off Cape Horn, to its east
  [-66.23, -59.62], // Drake Passage
  [-60, -62.03], // approaching the South Shetlands
  [-59.33, -62.32], // Nelson Strait, between Robert and Nelson Islands
  [-59.15, -62.5],
  [-57.99, -62.98], // Bransfield Strait
  [-56.95, -63.15], // around the peninsula tip
  [-56.72, -63.3], // Antarctic Sound, between the peninsula and Joinville Island
  [-56.6, -63.45],
  [-56.38, -63.57], // east of Andersson Island
  [-56.4, -63.85],
  [-56.4, -64.1],
  [-56.62, -64.23], // Marambio
];

/** Waypoints in the 0..1000 map space. */
export const ROUTE_POINTS: readonly Point[] = ROUTE_WAYPOINTS.map(([lon, lat]) => project(lon, lat));

/**
 * Smooth curve through every waypoint: one cubic Bézier per leg, tangent parallel to the chord
 * between the neighbouring waypoints and handles a third of the leg long, so short legs (the
 * channels) never overshoot into land.
 */
const LEGS: Point[][] = ROUTE_POINTS.slice(1).map((end, i) => {
  const start = ROUTE_POINTS[i];
  const before = ROUTE_POINTS[Math.max(0, i - 1)];
  const after = ROUTE_POINTS[Math.min(ROUTE_POINTS.length - 1, i + 2)];
  const handle = Math.hypot(end.x - start.x, end.y - start.y) / 3;
  const along = (a: Point, b: Point) => {
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    return { x: ((b.x - a.x) / len) * handle, y: ((b.y - a.y) / len) * handle };
  };
  const t0 = along(before, end);
  const t1 = along(start, after);
  return [start, { x: start.x + t0.x, y: start.y + t0.y }, { x: end.x - t1.x, y: end.y - t1.y }, end];
});

const f = (p: Point) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`;

/** SVG `d` of the route, drawn by the 2D ink layer. */
export const ROUTE_PATH = `M${f(ROUTE_POINTS[0])}${LEGS.map(([, c0, c1, end]) => ` C${f(c0)} ${f(c1)} ${f(end)}`).join('')}`;

function bezier([a, b, c, d]: Point[], t: number): Point {
  const u = 1 - t;
  const k = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
  return { x: k[0] * a.x + k[1] * b.x + k[2] * c.x + k[3] * d.x, y: k[0] * a.y + k[1] * b.y + k[2] * c.y + k[3] * d.y };
}

/** Dense polyline of the curve with cumulative length, so routeAt moves at constant speed. */
const SAMPLES_PER_LEG = 64;
const DENSE: Point[] = [ROUTE_POINTS[0], ...LEGS.flatMap((leg) => Array.from({ length: SAMPLES_PER_LEG }, (_, i) => bezier(leg, (i + 1) / SAMPLES_PER_LEG)))];
const CUMULATIVE = DENSE.reduce<number[]>((acc, p, i) => {
  acc.push(i === 0 ? 0 : acc[i - 1] + Math.hypot(p.x - DENSE[i - 1].x, p.y - DENSE[i - 1].y));
  return acc;
}, []);

/** Point on the route at fraction `t` (0 = Ushuaia, 1 = Marambio) of its length, in map space. */
export function routeAt(t: number): Point {
  const target = Math.min(1, Math.max(0, t)) * CUMULATIVE[CUMULATIVE.length - 1];
  let hi = 1;
  while (hi < CUMULATIVE.length - 1 && CUMULATIVE[hi] < target) hi++;
  const lo = hi - 1;
  const span = CUMULATIVE[hi] - CUMULATIVE[lo];
  const s = span > 0 ? (target - CUMULATIVE[lo]) / span : 0;
  return { x: DENSE[lo].x + (DENSE[hi].x - DENSE[lo].x) * s, y: DENSE[lo].y + (DENSE[hi].y - DENSE[lo].y) * s };
}
