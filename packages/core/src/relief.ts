/**
 * Shared constants of the 3D relief. No asset imports, so the build script (Node) can use it too.
 * Changing VERTICAL_EXAGGERATION or SUN requires `pnpm terrain`: normals and shadows are baked with them.
 */

/** Heights are multiplied by this when drawn. The UI legend states it. */
export const VERTICAL_EXAGGERATION = 50;

/** Contour interval in meters (thin pencil lines; every 4th one is inked). */
export const CONTOUR_M = 250;

/** Approximate ground size of one map unit near the pole (stereographic radius 1590). */
export const METERS_PER_MAP_UNIT = 8000;

/** Fixed cartographic sun: from the northwest (top-left of the map), low enough to rake the ice sheet. */
export const SUN = { azimuthDeg: 315, elevationDeg: 35 };

/** Elevation in meters to world height (map units), exaggerated. */
export function worldHeight(meters: number): number {
  return (meters * VERTICAL_EXAGGERATION) / METERS_PER_MAP_UNIT;
}

/**
 * Unit vector pointing to the sun in world space (x = map x, y = up, z = map y).
 * Map north (Greenwich) is -z, so azimuth 315 (northwest) is (-x, -z).
 */
export function sunDirection(): [number, number, number] {
  const az = (SUN.azimuthDeg * Math.PI) / 180;
  const el = (SUN.elevationDeg * Math.PI) / 180;
  return [Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)];
}
