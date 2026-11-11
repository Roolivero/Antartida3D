export const MAP_SIZE = 1000;
export const STEREO_RADIUS = 1590;

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

/** Polar stereographic projection into the 0..1000 map space, Greenwich up. */
export function project(lon: number, lat: number): { x: number; y: number } {
  const r = STEREO_RADIUS * Math.tan(((90 - Math.abs(lat)) / 2) * RAD);
  return { x: 500 + r * Math.sin(lon * RAD), y: 500 - r * Math.cos(lon * RAD) };
}

/** Inverse polar stereographic projection from the 0..1000 map space back to lon/lat. */
export function unproject(x: number, y: number): { lon: number; lat: number } {
  const dx = x - 500;
  const dy = y - 500;
  const r = Math.hypot(dx, dy);
  const lat = -(90 - 2 * Math.atan(r / STEREO_RADIUS) * DEG);
  const lon = Math.atan2(dx, -dy) * DEG;
  return { lon, lat };
}
