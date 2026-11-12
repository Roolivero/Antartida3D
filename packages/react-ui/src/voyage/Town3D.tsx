import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { BoxGeometry, MeshBasicMaterial, type Group, type Mesh } from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import {
  FUEGIA_LAND_MASK,
  MODEL_MIN_PX,
  MODEL_REFERENCE_DISTANCE,
  fuegiaWorldHeight,
  loadFuegiaMesh,
  project,
  screenPx,
  type TerrainMesh,
} from '@antartida/core';
import { TOWN_CHIMNEYS, buildTownGeometry } from './sightingModels.ts';
import { vehicleMaterial } from './vehicles.ts';

/** The bay the trip leaves from, where the real town is. */
const BAY = project(-68.3, -54.81);
/**
 * The town stands on the low shore next to that point (about 2 km away), where the ground is under
 * 20 m high. The slopes start right inland: there the town would be lifted onto the mountains.
 */
const SITE = { x: BAY.x + 0.2, y: BAY.y + 0.15 };

/** Reference width factor of the town at MODEL_REFERENCE_DISTANCE. */
const SIZE_PER_DISTANCE = 0.036;
const TOWN_SIZE = MODEL_REFERENCE_DISTANCE * SIZE_PER_DISTANCE;
/** Ground is measured this far around the center, in town widths. */
const FOOTING = 0.4;
/** Maximum footing radius in map units so the ground query stays local. */
const MAX_FOOTING = 0.4;

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
/** From farther than this the town is a dot: its name would only crowd the labels of the open map. */
const LABEL_REACH = 70;

const PUFFS_PER_CHIMNEY = 3;
/** Seconds a puff takes to rise and fade. */
const PUFF_SECONDS = 3.2;
const puffGeometry = new BoxGeometry(1, 1, 1);
const puffMaterial = new MeshBasicMaterial({ color: 0xf7fafb, transparent: true, opacity: 0.8 });

/** Ushuaia on the map, in the trip and outside it: houses, smoke from the chimneys and its name. Not a button. */
export function Town3D({ reduced, wide, overlay }: {
  reduced: boolean;
  /** Same detail of the relief as the map draws, so the town stands on what is seen. */
  wide: boolean;
  overlay: RefObject<HTMLElement | null>;
}) {
  const group = useRef<Group>(null);
  const puffs = useRef<(Mesh | null)[]>([]);
  const label = useRef<HTMLSpanElement>(null);
  const geometry = useMemo(buildTownGeometry, []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  // The town stands on the relief of Tierra del Fuego, a separate mesh that loads after the map.
  const [relief, setRelief] = useState<TerrainMesh | null>(null);
  useEffect(() => {
    let alive = true;
    // Without the relief there is no ground to stand on: no town.
    loadFuegiaMesh(wide ? 'hi' : 'lo').then((mesh) => alive && setRelief(mesh)).catch(() => {});
    return () => void (alive = false);
  }, [wide]);
  // Ground under the town cached for the current relief mesh.
  const footing = useRef<{ relief: TerrainMesh | null; ground: number }>({ relief, ground: 0 });

  useFrame(({ camera, size, invalidate }) => {
    const g = group.current;
    if (!g || !relief) return;
    const distance = Math.hypot(camera.position.x - (SITE.x - 500), camera.position.y, camera.position.z - (SITE.y - 500));
    g.visible = screenPx(TOWN_SIZE, distance, size.height) >= MODEL_MIN_PX;
    const f = footing.current;
    if (f.relief !== relief) {
      footing.current = { relief, ground: highestGround(relief, SITE.x, SITE.y, Math.min(MAX_FOOTING, TOWN_SIZE * FOOTING)) };
    }
    g.position.set(SITE.x - 500, footing.current.ground, SITE.y - 500);
    g.scale.setScalar(TOWN_SIZE);
    const time = reduced ? 0 : performance.now() / 1000;
    puffs.current.forEach((puff, i) => {
      if (!puff) return;
      const [x, y, z] = TOWN_CHIMNEYS[Math.floor(i / PUFFS_PER_CHIMNEY)];
      const age = (time / PUFF_SECONDS + (i % PUFFS_PER_CHIMNEY) / PUFFS_PER_CHIMNEY + i * 0.11) % 1;
      puff.position.set(x + age * 0.1, y + 0.03 + age * 0.34, z);
      // Grows as it rises, then thins out.
      puff.scale.setScalar(0.035 + 0.075 * Math.sin(Math.PI * Math.min(1, age * 1.15)));
    });
    if (label.current) label.current.hidden = distance > LABEL_REACH;
    if (!reduced && distance < SMOKE_REACH) invalidate();
  });

  if (!relief) return null;
  return (
    // The houses look south, at the water.
    <group ref={group} rotation-y={Math.atan2(500 - SITE.x, 500 - SITE.y)}>
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
        <span ref={label} className="vtown">Ushuaia</span>
      </Html>
    </group>
  );
}
