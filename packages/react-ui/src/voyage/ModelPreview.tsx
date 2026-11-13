import { useEffect, useMemo, useRef } from 'react';
import type { Group } from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { buildBoxGeometry, vehicleMaterial, type Box } from './vehicles.ts';

/**
 * How the model moves in its preview. ILLUSTRATIVE: no source backs these movements.
 * - `turn`: a turntable, as in a game's vehicle select.
 * - `swim`: it rises and sinks slowly and rocks a little, like the whale of the sightings.
 * - `sway`: it stands and barely rocks from one foot to the other.
 * - `still`: it does not move.
 */
export type PreviewMotion = 'turn' | 'swim' | 'sway' | 'still';

/** Seconds per full turn. */
const TURN_SECONDS = 9;
/** The model is looked at from the front and a little to one side. */
const POSE = -0.6;

function Model({ boxes, motion, reduced }: { boxes: readonly Box[]; motion: PreviewMotion; reduced: boolean }) {
  const group = useRef<Group>(null);
  const geometry = useMemo(() => buildBoxGeometry(boxes), [boxes]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame(({ clock }, delta) => {
    const g = group.current;
    if (!g || reduced) return;
    const time = clock.elapsedTime;
    if (motion === 'turn') g.rotation.y += (delta * 2 * Math.PI) / TURN_SECONDS;
    else if (motion === 'swim') {
      g.position.y = -0.02 + Math.sin(time * 0.6) * 0.05;
      g.rotation.z = Math.sin(time * 0.6 + 1) * 0.12;
    } else if (motion === 'sway') g.rotation.x = Math.sin(time * 1.6) * 0.035;
  });
  return (
    <group ref={group} rotation={[0, POSE, 0]} position={[0, motion === 'swim' ? -0.02 : -0.08, 0]}>
      <mesh geometry={geometry} material={vehicleMaterial} />
    </group>
  );
}

/**
 * Small view of a block model inside a card. It is an illustration, not a scale model. A model
 * is one unit long or wide (docs/diseno/estilo-voxel.md), so one camera fits them all; `lift`
 * raises the look for a tall one.
 */
export function ModelPreview({ boxes, motion, reduced, lift = 0, sea = false }: {
  boxes: readonly Box[];
  motion: PreviewMotion;
  reduced: boolean;
  /** Model units the camera looks above the base of the model. */
  lift?: number;
  /** Sea behind the model instead of sky: pale ice needs a dark background. */
  sea?: boolean;
}) {
  const moves = motion !== 'still' && !reduced;
  return (
    <div className={sea ? 'vpreview sea' : 'vpreview'} aria-hidden="true">
      <Canvas
        frameloop={moves ? 'always' : 'demand'}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
        camera={{ fov: 30, near: 0.1, far: 20, position: [0, 0.62 + lift, 1.55] }}
        onCreated={({ camera }) => camera.lookAt(0, lift, 0)}
      >
        <Model boxes={boxes} motion={motion} reduced={reduced} />
      </Canvas>
    </div>
  );
}
