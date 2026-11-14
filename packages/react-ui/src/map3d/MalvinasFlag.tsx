import { useEffect, useMemo, useState } from 'react';
import {
  MALVINAS_FLAG, fuegiaGroundHeight, loadFuegiaMesh, toWorld,
} from '@antartida/core';
import { buildBoxGeometry, vehicleMaterial } from '../voyage/vehicles.ts';
import { MALVINAS_FLAG_BOXES } from './malvinasFlagModel.ts';

/** Rigid illustrative flag with a fixed world size, including when the camera approaches it. */
export function MalvinasFlag({ wide }: { wide: boolean }) {
  const geometry = useMemo(() => buildBoxGeometry(MALVINAS_FLAG_BOXES), []);
  const [ground, setGround] = useState<number | null>(null);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => {
    let alive = true;
    setGround(null);
    loadFuegiaMesh(wide ? 'hi' : 'lo').then((mesh) => {
      if (alive) setGround(fuegiaGroundHeight(mesh, MALVINAS_FLAG.x, MALVINAS_FLAG.y));
    }).catch((error: unknown) => {
      if (!alive) return;
      setGround(null); // Without regional land the flag has no ground to stand on.
      console.warn('Malvinas flag relief unavailable', error);
    });
    return () => { alive = false; };
  }, [wide]);
  const position = toWorld(MALVINAS_FLAG.x, MALVINAS_FLAG.y, ground ?? 0);
  // The front is local +z; face the South Pole, at the world origin, regardless of the camera.
  const rotationY = Math.atan2(-position.x, -position.z);

  return (
    <group name="malvinas-flag" position={[position.x, position.y, position.z]} rotation-y={rotationY} scale={MALVINAS_FLAG.height} visible={ground !== null}>
      <mesh geometry={geometry} material={vehicleMaterial} />
    </group>
  );
}
