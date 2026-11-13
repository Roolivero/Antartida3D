import { project } from './projection.ts';

type Point = { x: number; y: number };

/** Ends of the middle line of the storm, as [lon, lat]: off Cape Horn and off the South Shetland Islands. */
const STORM_FROM: readonly [number, number] = [-66.6, -57.6];
const STORM_TO: readonly [number, number] = [-63.5, -60.6];

/**
 * The storm drawn over the Drake Passage, on the open map and during the trip: a band along the
 * crossing that covers most of the passage. An illustration of its fame for gales (source O46),
 * not weather data: neither its place nor its size is measured.
 */
export const DRAKE_STORM = (() => {
  const from = project(...STORM_FROM);
  const to = project(...STORM_TO);
  const center = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
  const middle = [(STORM_FROM[0] + STORM_TO[0]) / 2, (STORM_FROM[1] + STORM_TO[1]) / 2] as const;
  const west = project(middle[0] - 0.25, middle[1]);
  const east = project(middle[0] + 0.25, middle[1]);
  return {
    /** Ends of the middle line, in map space. */
    from,
    to,
    /** Middle of the storm, in map space. */
    ...center,
    /** Map units the storm reaches from its middle line, about 140 km. */
    radius: 18,
    /** Where the wind blows to, as an angle like voyageHeading: the westerlies blow to the east (source I5). */
    wind: Math.atan2(east.y - west.y, east.x - west.x),
    /** Map units over which the storm builds up from its edge. */
    edge: 4,
    /** World height of the base of the clouds. */
    cloudBase: 12,
    /** World height no cloud of the bank reaches (Storm3D stacks them from cloudBase). */
    cloudTop: 17,
  };
})();

/** Point of the middle line of the storm closest to a point of the map. */
export function stormNearest(x: number, y: number): Point {
  const { from, to } = DRAKE_STORM;
  const [dx, dy] = [to.x - from.x, to.y - from.y];
  const along = Math.min(1, Math.max(0, ((x - from.x) * dx + (y - from.y) * dy) / (dx * dx + dy * dy)));
  return { x: from.x + dx * along, y: from.y + dy * along };
}

/** How much storm there is at a point of the map: 0 outside, 1 well inside. */
export function stormAt(x: number, y: number): number {
  const near = stormNearest(x, y);
  const c = Math.min(1, Math.max(0, (DRAKE_STORM.radius - Math.hypot(x - near.x, y - near.y)) / DRAKE_STORM.edge));
  return c * c * (3 - 2 * c);
}

/** Clear air a plane keeps over the top of the clouds, in world units. */
const STORM_OVERFLY = 2.5;
/** Map units before the storm over which a plane climbs to pass over it, and after it to come back down. */
const STORM_APPROACH = 24;

/**
 * World height a plane keeps at a point of the map to fly over the storm: over the clouds inside
 * it, easing down to nothing away from it. ILLUSTRATIVE, like the storm: not a real flight level.
 */
export function stormCeiling(x: number, y: number): number {
  const near = stormNearest(x, y);
  const away = Math.hypot(x - near.x, y - near.y) - DRAKE_STORM.radius;
  const c = Math.min(1, Math.max(0, 1 - away / STORM_APPROACH));
  return c * c * (3 - 2 * c) * (DRAKE_STORM.cloudTop + STORM_OVERFLY);
}
