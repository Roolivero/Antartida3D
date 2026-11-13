import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import type { Group } from 'three';
import { useFrame } from '@react-three/fiber';
import { buildBoxGeometry, vehicleMaterial } from '../voyage/vehicles.ts';
import {
  PENGUIN_NECK,
  PENGUIN_SCALE,
  PENGUIN_SHOULDER,
  buildPenguinColony,
  buildRookeryBoxes,
  penguinParts,
  residentPose,
  restPose,
  travellerPose,
  type PenguinPose,
  type PenguinSpecies,
} from './penguins.ts';
import { PENGUIN_KNOLL, evaluateIsthmusTerrain } from './stationModels.ts';

interface Rig {
  root: Group | null;
  tilt: Group | null;
  neck: Group | null;
  flipL: Group | null;
  flipR: Group | null;
}

/** Time drawn when motion is reduced: every penguin stands still in a calm pose. */
const STILL_TIME = 2;

function applyPose(rig: Rig, p: PenguinPose) {
  const { root, tilt, neck, flipL, flipR } = rig;
  if (!root || !tilt || !neck || !flipL || !flipR) return;
  root.position.set(p.x, p.y, p.z);
  root.rotation.y = p.yaw;
  // Pitch first (lying on the belly, following the slope), then the roll around the heading.
  tilt.rotation.set(p.roll, 0, -p.lie * (Math.PI / 2) + p.slope, 'XYZ');
  tilt.scale.set(1, p.stretch, 1);
  neck.rotation.set(0, p.headYaw, p.headPitch, 'YZX');
  flipL.rotation.x = -p.flipL;
  flipR.rotation.x = p.flipR;
}

/**
 * Penguin colony on its knoll (reconstruction): residents on their nests and travellers doing
 * the round trip to Bahía Scotia. Poses come from penguins.ts, a pure function of time.
 */
export function PenguinColony({ reduced, seaIce = 0 }: { reduced: boolean; seaIce?: number }) {
  const colony = useMemo(() => buildPenguinColony((x, z) => evaluateIsthmusTerrain(x, z).y), []);
  const geos = useMemo(() => {
    const make = (species: PenguinSpecies) => {
      const parts = penguinParts(species);
      return {
        body: buildBoxGeometry(parts.body),
        head: buildBoxGeometry(parts.head),
        flipper: buildBoxGeometry(parts.flipper),
      };
    };
    return { adelie: make('adelie'), chinstrap: make('chinstrap') };
  }, []);
  const rookeryGeo = useMemo(() => buildBoxGeometry(buildRookeryBoxes()), []);
  const knollTop = useMemo(
    () => evaluateIsthmusTerrain(PENGUIN_KNOLL.center[0], PENGUIN_KNOLL.center[1]).y,
    []
  );

  useEffect(
    () => () => {
      for (const g of Object.values(geos)) {
        g.body.dispose();
        g.head.dispose();
        g.flipper.dispose();
      }
      rookeryGeo.dispose();
    },
    [geos, rookeryGeo]
  );

  const isFrozen = seaIce >= 0.5;
  const penguins = useMemo(
    () => [
      ...colony.residents.map((r) => ({ species: r.species, pose: (t: number, o: PenguinPose) => residentPose(r, t, o) })),
      ...colony.travellers.map((v, idx) => ({
        species: v.species,
        pose: (t: number, o: PenguinPose) =>
          isFrozen
            ? residentPose(colony.frozenTravellers[idx], t, o)
            : travellerPose(colony.route, t - v.delay, v.offset, o),
      })),
    ],
    [colony, isFrozen]
  );
  const rigs = useRef<Rig[]>(penguins.map(() => ({ root: null, tilt: null, neck: null, flipL: null, flipR: null })));
  const pose = useMemo(() => restPose(), []);

  useLayoutEffect(() => {
    if (!reduced) return;
    penguins.forEach((p, i) => applyPose(rigs.current[i], p.pose(STILL_TIME, pose)));
  }, [reduced, penguins, pose]);

  useFrame(({ clock }) => {
    if (reduced) return;
    const t = clock.getElapsedTime();
    penguins.forEach((p, i) => applyPose(rigs.current[i], p.pose(t, pose)));
  });

  const [sx, sy, sz] = PENGUIN_SHOULDER;
  return (
    <group>
      <mesh
        geometry={rookeryGeo}
        material={vehicleMaterial}
        position={[PENGUIN_KNOLL.center[0], knollTop, PENGUIN_KNOLL.center[1]]}
      />
      {penguins.map((p, i) => {
        const g = geos[p.species];
        const rig = rigs.current[i];
        return (
          <group key={i} ref={(n) => void (rig.root = n)} scale={PENGUIN_SCALE}>
            <group ref={(n) => void (rig.tilt = n)}>
              <mesh geometry={g.body} material={vehicleMaterial} />
              <group ref={(n) => void (rig.neck = n)} position={PENGUIN_NECK}>
                <mesh geometry={g.head} material={vehicleMaterial} />
              </group>
              <group ref={(n) => void (rig.flipL = n)} position={[sx, sy, sz]}>
                <mesh geometry={g.flipper} material={vehicleMaterial} />
              </group>
              <group ref={(n) => void (rig.flipR = n)} position={[sx, sy, -sz]}>
                <mesh geometry={g.flipper} material={vehicleMaterial} />
              </group>
            </group>
          </group>
        );
      })}
    </group>
  );
}
