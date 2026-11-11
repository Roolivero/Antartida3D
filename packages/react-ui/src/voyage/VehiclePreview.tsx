import { useEffect, useMemo, useRef } from 'react';
import type { Group } from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import type { TransportId } from '@antartida/core';
import { buildVehicleGeometry, vehicleMaterial } from './vehicles.ts';

/** Seconds per full turn. */
const TURN_SECONDS = 9;

function Model({ id, reduced }: { id: TransportId; reduced: boolean }) {
  const group = useRef<Group>(null);
  const geometry = useMemo(() => buildVehicleGeometry(id), [id]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame((_, delta) => {
    if (group.current && !reduced) group.current.rotation.y += (delta * 2 * Math.PI) / TURN_SECONDS;
  });
  return (
    <group ref={group} rotation={[0, -0.6, 0]} position={[0, -0.08, 0]}>
      <mesh geometry={geometry} material={vehicleMaterial} />
    </group>
  );
}

/** Small turntable of the picked vehicle, as in a game's vehicle select. It is an illustration, not a scale model. */
export function VehiclePreview({ id, reduced }: { id: TransportId; reduced: boolean }) {
  return (
    <div className="vpreview" aria-hidden="true">
      <Canvas
        frameloop={reduced ? 'demand' : 'always'}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
        camera={{ fov: 30, near: 0.1, far: 20, position: [0, 0.62, 1.55] }}
        onCreated={({ camera }) => camera.lookAt(0, 0, 0)}
      >
        <Model id={id} reduced={reduced} />
      </Canvas>
    </div>
  );
}
