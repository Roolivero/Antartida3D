import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { BoxGeometry, MeshBasicMaterial, type Group, type Mesh } from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { FUEGIA_LAND_MASK, fuegiaWorldHeight, loadFuegiaMesh, project, type TerrainMesh } from '@antartida/core';
import { TOWN_CHIMNEYS, buildTownGeometry } from './sightingModels.ts';
import { vehicleMaterial } from './vehicles.ts';

/** The bay the trip leaves from, where the real town is. */
const BAY = project(-68.3, -54.81);
/**
 * The relief is drawn ten times taller than it is, so the real site of the town is inside a slope.
 * The town is drawn on the lowest ground within SEARCH map units of the bay (about 8 km each),
 * and not closer than CLEAR, where the vehicle waits.
 */
const SEARCH = 1.6;
const CLEAR = 0.9;
const SEARCH_STEP = 0.2;
/** Radius of ground a site is judged by, in map units. */
const SITE_RADIUS = 0.5;

/** Width of the town as a fraction of its distance to the camera, between a size that reads from the bay and one that does not cover the island. */
const SIZE_PER_DISTANCE = 0.065;
const MIN_SIZE = 0.5;
const MAX_SIZE = 1.8;
/** Ground is measured this far around the center, in town widths. */
const FOOTING = 0.5;

/**
 * Highest land of the relief within `radius` map units of (x, y), as a world height. The town
 * stands on it, so the slopes do not bury the houses.
 */
function highestGround(mesh: TerrainMesh, x: number, y: number, radius: number): number {
  const cell = mesh.gridSize - 1;
  const [spanX, spanY] = [mesh.maxX - mesh.minX, mesh.maxY - mesh.minY];
  let top = 0;
  for (let i = 0; i < mesh.numVerts; i++) {
    if (mesh.masks[i] !== FUEGIA_LAND_MASK || mesh.heights[i] <= top) continue;
    const dx = mesh.minX + (mesh.coordsXY[i * 2] / cell) * spanX - x;
    const dy = mesh.minY + (mesh.coordsXY[i * 2 + 1] / cell) * spanY - y;
    if (dx * dx + dy * dy <= radius * radius) top = mesh.heights[i];
  }
  return fuegiaWorldHeight(top);
}

/** Beyond this distance from the camera the smoke is too small to see: it stops asking for frames. */
const SMOKE_REACH = 60;

const PUFFS_PER_CHIMNEY = 3;
/** Seconds a puff takes to rise and fade. */
const PUFF_SECONDS = 3.2;
const puffGeometry = new BoxGeometry(1, 1, 1);
const puffMaterial = new MeshBasicMaterial({ color: 0xf7fafb, transparent: true, opacity: 0.8 });

/** Land near the bay with the lowest ground around it, in map space; the bay itself if there is none. */
function findSite(mesh: TerrainMesh): { x: number; y: number } {
  let best = { x: BAY.x, y: BAY.y, top: Infinity };
  const bayRadius = Math.hypot(BAY.x - 500, BAY.y - 500);
  for (let dx = -SEARCH; dx <= SEARCH; dx += SEARCH_STEP) {
    for (let dy = -SEARCH; dy <= SEARCH; dy += SEARCH_STEP) {
      if (Math.hypot(dx, dy) < CLEAR) continue;
      const [x, y] = [BAY.x + dx, BAY.y + dy];
      // On land north of the bay (farther from the pole), not on an islet of the channel.
      if (Math.hypot(x - 500, y - 500) < bayRadius + SEARCH_STEP) continue;
      if (highestGround(mesh, x, y, SEARCH_STEP / 2) <= 0) continue;
      const top = highestGround(mesh, x, y, SITE_RADIUS);
      if (top < best.top) best = { x, y, top };
    }
  }
  return best;
}

/** Ushuaia at the start of the trip: houses, smoke from the chimneys and its name. Not a button. */
export function Town3D({ reduced, wide, overlay }: {
  reduced: boolean;
  /** Same detail of the relief as the map draws, so the town stands on what is seen. */
  wide: boolean;
  overlay: RefObject<HTMLElement | null>;
}) {
  const group = useRef<Group>(null);
  const puffs = useRef<(Mesh | null)[]>([]);
  const geometry = useMemo(buildTownGeometry, []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  // The town stands on the relief of Tierra del Fuego, a separate mesh that loads after the map.
  const [relief, setRelief] = useState<TerrainMesh | null>(null);
  const site = useMemo(() => (relief ? findSite(relief) : null), [relief]);
  useEffect(() => {
    let alive = true;
    // Without the relief there is no ground to stand on: no town.
    loadFuegiaMesh(wide ? 'hi' : 'lo').then((mesh) => alive && setRelief(mesh)).catch(() => {});
    return () => void (alive = false);
  }, [wide]);
  // Ground under the town at the size it was last measured for: the footprint grows with the camera distance.
  const footing = useRef({ size: 0, relief, ground: 0 });

  useFrame(({ camera, invalidate }) => {
    const g = group.current;
    if (!g || !site || !relief) return;
    const distance = Math.hypot(camera.position.x - (site.x - 500), camera.position.y, camera.position.z - (site.y - 500));
    const size = Math.min(MAX_SIZE, Math.max(MIN_SIZE, distance * SIZE_PER_DISTANCE));
    const f = footing.current;
    if (f.relief !== relief || Math.abs(size - f.size) > f.size * 0.03) {
      footing.current = { size, relief, ground: highestGround(relief, site.x, site.y, size * FOOTING) };
    }
    g.position.set(site.x - 500, footing.current.ground, site.y - 500);
    g.scale.setScalar(size);
    const time = reduced ? 0 : performance.now() / 1000;
    puffs.current.forEach((puff, i) => {
      if (!puff) return;
      const [x, y, z] = TOWN_CHIMNEYS[Math.floor(i / PUFFS_PER_CHIMNEY)];
      const age = (time / PUFF_SECONDS + (i % PUFFS_PER_CHIMNEY) / PUFFS_PER_CHIMNEY + i * 0.11) % 1;
      puff.position.set(x + age * 0.1, y + 0.03 + age * 0.34, z);
      // Grows as it rises, then thins out.
      puff.scale.setScalar(0.035 + 0.075 * Math.sin(Math.PI * Math.min(1, age * 1.15)));
    });
    if (!reduced && distance < SMOKE_REACH) invalidate();
  });

  if (!site) return null;
  return (
    // The houses look south, at the water.
    <group ref={group} rotation-y={Math.atan2(500 - site.x, 500 - site.y)}>
      <mesh geometry={geometry} material={vehicleMaterial} />
      {TOWN_CHIMNEYS.flatMap((_, c) => Array.from({ length: PUFFS_PER_CHIMNEY }, (_, i) => (
        <mesh
          key={`${c}-${i}`}
          ref={(m) => void (puffs.current[c * PUFFS_PER_CHIMNEY + i] = m)}
          geometry={puffGeometry}
          material={puffMaterial}
        />
      )))}
      <Html position={[0, 1.08, 0]} center portal={overlay as RefObject<HTMLElement>} zIndexRange={[3, 3]}>
        <span className="vtown">Ushuaia</span>
      </Html>
    </group>
  );
}
