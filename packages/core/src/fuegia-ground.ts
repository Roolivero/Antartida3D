import { FUEGIA_LAND_MASK, fuegiaWorldHeight } from './fuegia.ts';
import type { TerrainMesh } from './terrain.ts';

/** Sample the actual rendered triangle once per anchor/mesh, in world units. No elevation grid is available here. */
export function fuegiaGroundHeight(mesh: TerrainMesh, mapX: number, mapY: number): number | null {
  if (mapX < mesh.minX || mapX > mesh.maxX || mapY < mesh.minY || mapY > mesh.maxY) return null;
  const x = (mapX - mesh.minX) / (mesh.maxX - mesh.minX) * (mesh.gridSize - 1);
  const y = (mapY - mesh.minY) / (mesh.maxY - mesh.minY) * (mesh.gridSize - 1);
  const xy = mesh.coordsXY;
  for (let t = 0; t < mesh.indices.length; t += 3) {
    const a = mesh.indices[t], b = mesh.indices[t + 1], c = mesh.indices[t + 2];
    const ax = xy[a * 2], ay = xy[a * 2 + 1];
    const bx = xy[b * 2], by = xy[b * 2 + 1];
    const cx = xy[c * 2], cy = xy[c * 2 + 1];
    if (x < Math.min(ax, bx, cx) || x > Math.max(ax, bx, cx) ||
        y < Math.min(ay, by, cy) || y > Math.max(ay, by, cy)) continue;
    const det = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
    if (det === 0) continue;
    const u = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / det;
    const v = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / det;
    const w = 1 - u - v;
    if (Math.min(u, v, w) < -1e-6) continue;
    const land = (i: number) => mesh.masks[i] === FUEGIA_LAND_MASK ? 1 : 0;
    if (u * land(a) + v * land(b) + w * land(c) < 0.5) return null;
    return fuegiaWorldHeight(u * land(a) * mesh.heights[a] + v * land(b) * mesh.heights[b] + w * land(c) * mesh.heights[c]);
  }
  return null;
}
