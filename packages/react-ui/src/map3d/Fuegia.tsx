import { useEffect, useMemo, useState } from 'react';
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  RepeatWrapping,
  ShaderMaterial,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  Vector3,
} from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import {
  CONTOUR_M,
  DEPTH_ABSORB,
  FUEGIA_CENTER,
  FUEGIA_DATA_LIMIT_LAT,
  FUEGIA_EDGE_FADE_DEG,
  FUEGIA_LAND_MASK,
  FUEGIA_LOAD_DISTANCE,
  FUEGIA_WATER_FADE,
  FUEGIA_WATER_MASK_MAX,
  fuegiaWorldHeight,
  loadFuegiaMesh,
  project,
  sunDirection,
  toWorld,
  type TerrainMesh,
} from '@antartida/core';
import paper512Url from '@antartida/core/assets/paper-512.webp';
import { FOG_COLOR_HEX } from './fog.glsl.ts';
import { fuegiaFragmentShader, fuegiaVertexShader } from './fuegia.glsl.ts';
import { farLandUniforms, loadFarLandTexture } from './SouthernLands.tsx';

/** Map-space distance from the pole of a parallel (the projection is polar, so it is a circle). */
const radiusOfLatitude = (lat: number) => 500 - project(0, lat).y;
/** Degrees of latitude before the data edge over which the land tint turns into the flat southern lands. */
const FAR_LAND_TINT_DEG = 2.5;

/** Relief of Tierra del Fuego, southern Patagonia and the Malvinas with its near-shore water, fetched once the camera gets near it. */
export function Fuegia({ wide }: { wide: boolean }) {
  const invalidate = useThree((s) => s.invalidate);
  const [near, setNear] = useState(false);
  const [meshData, setMeshData] = useState<TerrainMesh | null>(null);
  const [paper, setPaper] = useState<Texture | null>(null);
  // Natural Earth II color the relief turns into at its northern edge, shared with SouthernLands.
  const farLand = useMemo(() => farLandUniforms(), []);
  const center = useMemo(() => {
    const c = toWorld(FUEGIA_CENTER.x, FUEGIA_CENTER.y);
    return new Vector3(c.x, c.y, c.z);
  }, []);

  useFrame(({ camera }) => {
    if (!near && camera.position.distanceTo(center) < FUEGIA_LOAD_DISTANCE) setNear(true);
  });

  useEffect(() => {
    if (!near) return;
    let alive = true;
    loadFuegiaMesh(wide ? 'hi' : 'lo')
      .then((m) => alive && setMeshData(m))
      // Without it the map still works: the ocean plane stays where the land would be.
      .catch((e: unknown) => console.warn('Fuegia relief unavailable', e));
    new TextureLoader().loadAsync(paper512Url).then((t) => {
      if (!alive) return;
      t.colorSpace = SRGBColorSpace;
      t.wrapS = RepeatWrapping;
      t.wrapT = RepeatWrapping;
      setPaper(t);
    });
    let farTex: Texture | null = null;
    loadFarLandTexture(farLand)
      .then((t) => {
        farTex = t;
        if (alive) invalidate();
      })
      .catch((e: unknown) => console.warn('Fuegia edge color unavailable', e));
    return () => {
      alive = false;
      farTex?.dispose();
    };
  }, [near, wide, farLand, invalidate]);

  const geometry = useMemo(() => {
    if (!meshData) return null;
    const n = meshData.numVerts;
    const positions = new Float32Array(n * 3);
    const heights = new Float32Array(n);
    const land = new Float32Array(n);
    const shore = new Float32Array(n);
    const cell = meshData.gridSize - 1;
    const spanX = meshData.maxX - meshData.minX;
    const spanY = meshData.maxY - meshData.minY;
    for (let i = 0; i < n; i++) {
      const isLand = meshData.masks[i] === FUEGIA_LAND_MASK;
      const w = toWorld(
        meshData.minX + (meshData.coordsXY[i * 2] / cell) * spanX,
        meshData.minY + (meshData.coordsXY[i * 2 + 1] / cell) * spanY,
        isLand ? fuegiaWorldHeight(meshData.heights[i]) : 0
      );
      positions[i * 3] = w.x;
      positions[i * 3 + 1] = w.y;
      positions[i * 3 + 2] = w.z;
      heights[i] = meshData.heights[i];
      land[i] = isLand ? 1 : 0;
      shore[i] = isLand ? 0 : meshData.masks[i] / FUEGIA_WATER_MASK_MAX;
    }
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(positions, 3));
    geo.setAttribute('aHeight', new BufferAttribute(heights, 1));
    geo.setAttribute('aLand', new BufferAttribute(land, 1));
    geo.setAttribute('aShore', new BufferAttribute(shore, 1));
    geo.setIndex(new BufferAttribute(meshData.indices, 1));
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    return geo;
  }, [meshData]);

  const material = useMemo(() => {
    if (!paper) return null;
    return new ShaderMaterial({
      transparent: true,
      vertexShader: fuegiaVertexShader,
      fragmentShader: fuegiaFragmentShader,
      uniforms: {
        uPaperTex: { value: paper },
        uSunDir: { value: new Vector3(...sunDirection()) },
        uContour: { value: CONTOUR_M },
        uEdgeStart: { value: radiusOfLatitude(FUEGIA_DATA_LIMIT_LAT - FUEGIA_EDGE_FADE_DEG) },
        uEdgeEnd: { value: radiusOfLatitude(FUEGIA_DATA_LIMIT_LAT) },
        uTintStart: { value: radiusOfLatitude(FUEGIA_DATA_LIMIT_LAT - FUEGIA_EDGE_FADE_DEG - FAR_LAND_TINT_DEG) },
        ...farLand,
        uAbsorb: { value: DEPTH_ABSORB },
        uWaterFade: { value: FUEGIA_WATER_FADE },
        uFogColor: { value: new Color(FOG_COLOR_HEX) },
        uFogDensity: { value: 0.35 },
      },
    });
  }, [paper, farLand]);

  useEffect(() => () => geometry?.dispose(), [geometry]);
  useEffect(() => () => material?.dispose(), [material]);

  if (!geometry || !material) return null;
  return <mesh geometry={geometry} material={material} />;
}
