import meshHiUrl from './assets/fuegia-mesh-hi.bin?url';
import meshLoUrl from './assets/fuegia-mesh-lo.bin?url';
import { parseTerrainMesh, type TerrainMesh } from './terrain.ts';

const cache: Partial<Record<'hi' | 'lo', Promise<TerrainMesh>>> = {};

export function loadFuegiaMesh(level: 'hi' | 'lo'): Promise<TerrainMesh> {
  cache[level] ??= fetch(level === 'hi' ? meshHiUrl : meshLoUrl)
    .then((res) => res.arrayBuffer())
    .then(parseTerrainMesh);
  return cache[level];
}
