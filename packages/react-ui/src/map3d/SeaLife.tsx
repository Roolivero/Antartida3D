import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { BufferGeometry, Group, Mesh } from 'three';
import {
  FOV,
  IRIZAR_DEFAULT_SPEED,
  MODEL_MIN_PX,
  MODEL_REFERENCE_DISTANCE,
  driftOffsetAtTime,
  fractSin,
  irizarStateAtTime,
  screenPx,
  voyageAt,
  voyageHeading,
  whaleCyclePosition,
  whaleCycleState,
  type SeaLifeInstance,
} from '@antartida/core';
import { buildSeaGeometry, buildSpoutGeometry, SEA_MODELS, type SeaModelId } from '../voyage/sightingModels.ts';
import { heightOf } from '../voyage/Voyage3D.tsx';
import type { VoyageBus } from '../voyage/useVoyage.ts';
import { buildVehicleGeometry, vehicleMaterial } from '../voyage/vehicles.ts';
import { useSeaTime, type SeaTimeUniform } from './useAnimationClock.ts';

/** Reference on-screen length in px at a 900 px tall viewport at MODEL_REFERENCE_DISTANCE. */
const ANIMAL_PX = 65;
const ICE_PX = 78;
const VEHICLE_PX = 72;
const REFERENCE_HEIGHT = 900;
const FOV_TAN = Math.tan((FOV * Math.PI) / 360);

/** The plane flies the round trip faster than the ship sails it, and out of step with it. */
const HERCULES_SPEED = IRIZAR_DEFAULT_SPEED * 2.6;
const HERCULES_PHASE = 0.62;

/** Whale poses of `whaleCycleState`: breathing, back out of the water, tail up before the dive. */
const POSE_SPOUT = 2;
const POSE_TAIL = 1;
/** How far a whale stays under the surface between breaths, and its pitch when it dives, in model units and radians. */
const WHALE_FLOAT = 0.1;
const DIVE_PITCH = -0.75;

const modelOf = (inst: SeaLifeInstance): SeaModelId | null => {
  if (inst.species === 'iceberg') return inst.sprite === 'iceberg-lg' ? 'iceberg-lg' : 'iceberg-sm';
  return inst.species in SEA_MODELS ? (inst.species as SeaModelId) : null;
};

/**
 * Sea life, ice and the two Argentine transports on the open map, as voxel models. Positions and
 * cycles come from `@antartida/core` (the same ones the ink ripples of the ocean follow).
 */
export function SeaLife({ visible = true, timeUniform, instances, voyage }: {
  visible?: boolean;
  timeUniform?: SeaTimeUniform;
  instances: readonly SeaLifeInstance[];
  /** During the trip from Ushuaia the map shows that trip's own vehicle and sightings instead. */
  voyage?: VoyageBus | null;
}) {
  const root = useRef<Group>(null);
  const contextTime = useSeaTime();
  const clock = timeUniform || contextTime;

  const geometry = useMemo(() => {
    const models = Object.fromEntries(
      (Object.keys(SEA_MODELS) as SeaModelId[]).map((id) => [id, buildSeaGeometry(id)]),
    ) as Record<SeaModelId, BufferGeometry>;
    return { models, spout: buildSpoutGeometry(), irizar: buildVehicleGeometry('irizar'), hercules: buildVehicleGeometry('hercules') };
  }, []);
  useEffect(() => () => {
    Object.values(geometry.models).forEach((g) => g.dispose());
    geometry.spout.dispose();
    geometry.irizar.dispose();
    geometry.hercules.dispose();
  }, [geometry]);

  // The wake sprite has no model: the ship is drawn alone.
  const drawn = useMemo(() => instances.filter((inst) => inst.species === 'irizar' || modelOf(inst)), [instances]);
  const groups = useRef<(Group | null)[]>([]);
  const spouts = useRef<(Mesh | null)[]>([]);
  const plane = useRef<Group>(null);

  useFrame(({ camera, size }) => {
    if (!root.current) return;
    root.current.visible = visible && !voyage?.state;
    if (!root.current.visible) return;
    const time = clock.value;
    const sized = (g: Group, px: number) => {
      const s = MODEL_REFERENCE_DISTANCE * ((2 * FOV_TAN) / REFERENCE_HEIGHT) * px;
      g.scale.setScalar(s);
      const distance = camera.position.distanceTo(g.position);
      g.visible = screenPx(s, distance, size.height) >= MODEL_MIN_PX;
      return s;
    };

    drawn.forEach((inst, i) => {
      const g = groups.current[i];
      if (!g) return;
      if (inst.species === 'irizar') {
        const ship = irizarStateAtTime(time, inst.speed, inst.phase);
        g.position.set(ship.x - 500, 0, ship.y - 500);
        const s = sized(g, VEHICLE_PX);
        g.position.y = -s * 0.02 + Math.sin(time * 1.3) * 0.012 * s;
        g.rotation.set(Math.sin(time * 1.1) * 0.04 * ship.speed, -ship.headingRad, 0, 'YZX');
        return;
      }
      if (inst.species === 'humpback' || inst.species === 'minke' || inst.species === 'orca') {
        const cycle = time * inst.speed + inst.phase;
        const index = Math.floor(cycle);
        const state = whaleCycleState(cycle - index, inst.species);
        if (state.alpha <= 0.02) {
          g.visible = false;
          return;
        }
        const seedMix = inst.species === 'minke' ? fractSin(inst.seed * 5.3 + index * 11.1) : fractSin(inst.seed * 7.13 + index * 3.7);
        const dir = seedMix < 0.5 ? 1 : -1;
        const at = inst.species === 'orca' ? { x: inst.x, y: inst.y } : whaleCyclePosition(inst.x, inst.y, inst.radius, inst.seed, index);
        g.position.set(at.x + state.slideX * dir - 500, 0, at.y - 500);
        const s = sized(g, ANIMAL_PX * inst.scale);
        // It rises out of the water and sinks back instead of fading.
        g.position.y = (WHALE_FLOAT + state.bobY - (1 - state.alpha) * 0.2) * s;
        const diving = inst.species === 'humpback' && state.spriteIndex === POSE_TAIL;
        g.rotation.set(0, dir > 0 ? 0 : Math.PI, diving ? DIVE_PITCH * state.alpha : state.rotAngle, 'YZX');
        const spout = spouts.current[i];
        if (spout) spout.visible = inst.species === 'humpback' && state.spriteIndex === POSE_SPOUT;
        return;
      }
      // Ice, and the animals resting on it: a slow drift and a gentle rock.
      const drift = driftOffsetAtTime(time, inst.speed, inst.phase, inst.radius);
      g.position.set(inst.x + drift.dx - 500, 0, inst.y + drift.dy - 500);
      sized(g, (inst.species === 'iceberg' ? ICE_PX : ANIMAL_PX) * inst.scale);
      const sway = time * (inst.species === 'iceberg' ? 0.4 : 1.15) + inst.phase * Math.PI * 2;
      g.rotation.set(Math.sin(sway) * 0.03, inst.seed * 2.4, Math.sin(sway * 1.2) * 0.02, 'YZX');
    });

    if (plane.current) {
      const flight = irizarStateAtTime(time, HERCULES_SPEED, HERCULES_PHASE);
      const p = voyageAt('plane', flight.routeT);
      const g = plane.current;
      g.position.set(p.x - 500, 0, p.y - 500);
      const s = sized(g, VEHICLE_PX);
      g.position.y = heightOf('plane', flight.routeT, s);
      const heading = voyageHeading('plane', flight.routeT) + (flight.dirSign < 0 ? Math.PI : 0);
      g.rotation.set(Math.sin(time * 0.9) * 0.05, -heading, 0, 'YZX');
    }
  });

  if (drawn.length === 0) return null;
  return (
    <group ref={root}>
      {drawn.map((inst, i) => {
        const model = modelOf(inst);
        return (
          <group key={inst.id} ref={(g) => void (groups.current[i] = g)}>
            <mesh geometry={model ? geometry.models[model] : geometry.irizar} material={vehicleMaterial} />
            {inst.species === 'humpback' && (
              <mesh
                ref={(m) => void (spouts.current[i] = m)}
                geometry={geometry.spout}
                material={vehicleMaterial}
                position={[0.3, 0.1, 0]}
                visible={false}
              />
            )}
          </group>
        );
      })}
      <group ref={plane}>
        <mesh geometry={geometry.hercules} material={vehicleMaterial} />
      </group>
    </group>
  );
}
