import meshHiUrl from './assets/terrain-mesh-hi.bin?url';
import meshLoUrl from './assets/terrain-mesh-lo.bin?url';


/**
 * Natural Earth splits the continent and the Ross Ice Shelf on the antimeridian (x = 500, south half).
 * The 2D map hides that cut with ICE_SHELF_SEAM; in 3D the segments along it must not be inked or walled.
 * After simplification the cut is two long, near-vertical edges a few units either side of x = 500.
 */
export function isAntimeridianSeam(x0: number, y0: number, x1: number, y1: number): boolean {
  return (
    Math.abs(x0 - 500) < 4 && Math.abs(x1 - 500) < 4 &&
    y0 > 500 && y1 > 500 &&
    Math.abs(x1 - x0) < 2 && Math.abs(y1 - y0) > 40
  );
}

export const TERRAIN_BOX = {
  minX: 150.4,
  maxX: 851.8,
  minY: 197.3,
  maxY: 783.4,
};

export interface TerrainMesh {
  numVerts: number;
  numIndices: number;
  gridSize: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  coordsXY: Uint16Array;
  heights: Uint16Array;
  masks: Uint8Array;
  indices: Uint32Array;
  elevationGrid?: Uint16Array;
  elevationGridSize?: number;
}

/** Parses raw array buffer of a terrain mesh .bin file. */
export function parseTerrainMesh(buffer: ArrayBuffer): TerrainMesh {
  // If the buffer slice or byteOffset is unaligned to 4, copy into a clean aligned buffer
  let cleanBuf = buffer;
  if (buffer.byteLength % 4 !== 0) {
    const padded = new ArrayBuffer(buffer.byteLength + ((4 - (buffer.byteLength % 4)) % 4));
    new Uint8Array(padded).set(new Uint8Array(buffer));
    cleanBuf = padded;
  }
  const view = new DataView(cleanBuf);
  const magic = String.fromCharCode(
    view.getUint8(0),
    view.getUint8(1),
    view.getUint8(2),
    view.getUint8(3)
  );
  if (magic !== 'MESH') {
    throw new Error(`Invalid terrain mesh magic: ${magic}`);
  }

  const numVerts = view.getUint32(4, true);
  const numIndices = view.getUint32(8, true);
  const gridSize = view.getUint32(12, true);
  const minX = view.getFloat32(16, true);
  const maxX = view.getFloat32(20, true);
  const minY = view.getFloat32(24, true);
  const maxY = view.getFloat32(28, true);

  let offset = 32;

  // coordsXY: Uint16Array (numVerts * 2)
  const coordsXY = new Uint16Array(cleanBuf.slice(offset, offset + numVerts * 2 * 2));
  offset += numVerts * 2 * 2;

  // heights: Uint16Array (numVerts)
  const heights = new Uint16Array(cleanBuf.slice(offset, offset + numVerts * 2));
  offset += numVerts * 2;

  // masks: Uint8Array (numVerts)
  const masks = new Uint8Array(cleanBuf.slice(offset, offset + numVerts));
  offset += numVerts;

  const padding = (4 - (offset % 4)) % 4;
  offset += padding;

  // indices: Uint32Array (numIndices)
  const indicesSlice = cleanBuf.slice(offset, offset + numIndices * 4);
  const indices = new Uint32Array(indicesSlice);
  offset += numIndices * 4;

  let elevationGrid: Uint16Array | undefined;
  let elevationGridSize: number | undefined;

  if (offset + 4 <= cleanBuf.byteLength) {
    elevationGridSize = view.getUint32(offset, true);
    offset += 4;
    const gridBytes = elevationGridSize * elevationGridSize * 2;
    if (offset + gridBytes <= cleanBuf.byteLength) {
      elevationGrid = new Uint16Array(cleanBuf.slice(offset, offset + gridBytes));
    }
  }

  return {
    numVerts,
    numIndices,
    gridSize,
    minX,
    maxX,
    minY,
    maxY,
    coordsXY,
    heights,
    masks,
    indices,
    elevationGrid,
    elevationGridSize,
  };
}

let cachedMesh: TerrainMesh | null = null;
let cachedLevel: 'hi' | 'lo' | null = null;

export async function loadTerrainMesh(level: 'hi' | 'lo'): Promise<TerrainMesh> {
  if (cachedMesh && cachedLevel === level) return cachedMesh;
  const url = level === 'hi' ? meshHiUrl : meshLoUrl;
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  cachedMesh = parseTerrainMesh(buf);
  cachedLevel = level;
  return cachedMesh;
}

/**
 * Returns terrain surface elevation in meters at map coordinates (x, y).
 * Uses O(1) bilinear interpolation over regular elevation grid.
 */
export function heightAt(x: number, y: number, mesh?: TerrainMesh): number {
  const m = mesh || cachedMesh;
  if (!m) {
    return 0;
  }

  if (x < m.minX || x > m.maxX || y < m.minY || y > m.maxY) {
    return 0;
  }

  if (m.elevationGrid && m.elevationGridSize && m.elevationGridSize > 1) {
    const dim = m.elevationGridSize;
    const u = (x - m.minX) / (m.maxX - m.minX);
    const v = (y - m.minY) / (m.maxY - m.minY);

    const gx = u * (dim - 1);
    const gy = v * (dim - 1);

    const x0 = Math.floor(gx);
    const y0 = Math.floor(gy);
    const x1 = Math.min(dim - 1, x0 + 1);
    const y1 = Math.min(dim - 1, y0 + 1);

    const fx = gx - x0;
    const fy = gy - y0;

    const grid = m.elevationGrid;
    const row0 = y0 * dim;
    const row1 = y1 * dim;

    const h00 = grid[row0 + x0];
    const h10 = grid[row0 + x1];
    const h01 = grid[row1 + x0];
    const h11 = grid[row1 + x1];

    const h0 = h00 + (h10 - h00) * fx;
    const h1 = h01 + (h11 - h01) * fx;
    return h0 + (h1 - h0) * fy;
  }

  // Fallback if no elevation grid available
  return 0;
}
