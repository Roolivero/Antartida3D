import { useEffect, useMemo, useRef } from 'react';
import type { Group } from 'three';
import { useFrame } from '@react-three/fiber';
import { ORCADAS_POINT, heightAt, toWorld, worldHeight } from '@antartida/core';
import { buildBoxGeometry, vehicleMaterial } from '../voyage/vehicles.ts';
import { ORCADAS_SITE } from '../voyage/sightingModels.ts';

export const buildOrcadasSiteGeometry = () => buildBoxGeometry(ORCADAS_SITE);

const SIZE_PER_DISTANCE = 0.028;
const MIN_SIZE = 0.2;
const MAX_SIZE = 24;

/**
 * Minimal voxel maqueta of Estación Orcadas on Laurie Island.
 * Scales with camera distance so it reads clearly at any zoom level,
 * positioned on ground relief without covering or interfering with the HTML map marker.
 */
export function OrcadasSite({ reduced }: { reduced?: boolean }) {
  const group = useRef<Group>(null);
  const geometry = useMemo(buildOrcadasSiteGeometry, []);

  useEffect(() => () => geometry.dispose(), [geometry]);

  const elevM = heightAt(ORCADAS_POINT.x, ORCADAS_POINT.y);
  const groundH = worldHeight(elevM);
  // Base world coordinates on the 3D map
  const wPos = toWorld(ORCADAS_POINT.x, ORCADAS_POINT.y, groundH);

  useFrame(({ camera, invalidate }) => {
    const g = group.current;
    if (!g) return;

    const distance = Math.hypot(
      camera.position.x - wPos.x,
      camera.position.y - wPos.y,
      camera.position.z - wPos.z
    );
    const size = Math.min(MAX_SIZE, Math.max(MIN_SIZE, distance * SIZE_PER_DISTANCE));

    g.position.set(wPos.x, groundH, wPos.z);
    g.scale.setScalar(size);

    if (!reduced && distance < 80) {
      invalidate();
    }
  });

  return (
    <group ref={group} rotation-y={0.25}>
      <mesh geometry={geometry} material={vehicleMaterial} />
    </group>
  );
}
