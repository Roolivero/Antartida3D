import { project } from './projection.ts';
import { ROUTE_WAYPOINTS } from './route.ts';

/** No asset imports here, so the build script (Node) can use it too. */

const RAD = Math.PI / 180;

const toVector = ([lon, lat]: readonly [number, number]) => {
  const cosLat = Math.cos(lat * RAD);
  return [cosLat * Math.cos(lon * RAD), cosLat * Math.sin(lon * RAD), Math.sin(lat * RAD)];
};

const FLIGHT_FROM = toVector(ROUTE_WAYPOINTS[0]);
const FLIGHT_TO = toVector(ROUTE_WAYPOINTS[ROUTE_WAYPOINTS.length - 1]);
const FLIGHT_ANGLE = Math.acos(FLIGHT_FROM.reduce((sum, v, i) => sum + v * FLIGHT_TO[i], 0));

/**
 * Flight path in map space at fraction `t` (0..1): the great circle between the two ends of the
 * sea route. ILLUSTRATIVE, like the sea route: the real track of the C-130 has no public source.
 */
export function flightAt(t: number): { x: number; y: number } {
  const a = Math.sin((1 - t) * FLIGHT_ANGLE) / Math.sin(FLIGHT_ANGLE);
  const b = Math.sin(t * FLIGHT_ANGLE) / Math.sin(FLIGHT_ANGLE);
  const [x, y, z] = FLIGHT_FROM.map((v, i) => a * v + b * FLIGHT_TO[i]);
  return project(Math.atan2(y, x) / RAD, Math.asin(z) / RAD);
}

/** Step of the baked ground profile under the flight (flight-ground.ts), as a fraction of the trip. */
export const FLIGHT_GROUND_STEP = 0.002;
/** Map units to each side of the path that the baked profile covers. */
export const FLIGHT_GROUND_SIDE = 0.8;
