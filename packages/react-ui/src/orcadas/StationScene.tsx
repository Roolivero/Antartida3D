import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';
import {
  BackSide,
  Box3,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CapsuleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  DodecahedronGeometry,
  Group,
  InstancedMesh,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  Points,
  PointsMaterial,
  ShaderMaterial,
  SphereGeometry,
  Vector2,
  Vector3,
} from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { CameraControls, PerformanceMonitor } from '@react-three/drei';
import { EffectComposer } from '@react-three/postprocessing';
import {
  ORCADAS_LAT,
  midMonthDayOfYear,
  performanceBounds,
  solarAzimuthDeg,
  solarElevationDeg,
  type BuildingId,
} from '@antartida/core';
import { InkEffect } from '../map3d/InkEffect.ts';
import { HOTSPOTS, poseForHotspot, type HotspotId } from './Hotspots.tsx';
import { StationFallback } from './StationFallback.tsx';
import {
  createIsthmusTerrainGeometry,
  generateIcebergs,
  generatePenguinColony,
  generateSeaIcePlates,
  generateSnowParticles,
} from './stationModels.ts';
import {
  stationFlagFragmentShader,
  stationFlagVertexShader,
  stationSkyFragmentShader,
  stationSkyVertexShader,
  stationTerrainFragmentShader,
  stationTerrainVertexShader,
  stationWaterFragmentShader,
  stationWaterVertexShader,
} from './stationSky.glsl.ts';

export interface StationSceneProps {
  month: number;
  hour: number;
  windKmh: number;
  windDirDeg: number;
  cloudOktas: number;
  seaIce: number;
  buildings: readonly BuildingId[];
  animals: readonly string[];
  focus: HotspotId | null;
  reduced: boolean;
  onReady?: () => void;
  overlayRef?: RefObject<HTMLDivElement | null>;
}

function canUseWebGL(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

function computeSunDirection(month: number, hour: number): {
  dir: Vector3;
  elevationDeg: number;
} {
  const doy = midMonthDayOfYear(month);
  const elDeg = solarElevationDeg(ORCADAS_LAT, doy, hour);
  const azDeg = solarAzimuthDeg(ORCADAS_LAT, doy, hour);
  const elRad = (elDeg * Math.PI) / 180;
  const azRad = (azDeg * Math.PI) / 180;
  const cosEl = Math.cos(elRad);
  const x = cosEl * Math.sin(azRad);
  const y = Math.sin(elRad);
  const z = -cosEl * Math.cos(azRad);
  return {
    dir: new Vector3(x, y, z).normalize(),
    elevationDeg: elDeg,
  };
}

function computeWindVector(windDirDeg: number, windKmh: number): Vector2 {
  // windDirDeg is the direction wind blows FROM; drift direction is opposite (+180 deg)
  const toRad = ((windDirDeg + 180) * Math.PI) / 180;
  const speedNorm = Math.min(2.5, Math.max(0.05, windKmh / 28));
  return new Vector2(Math.sin(toRad) * speedNorm, -Math.cos(toRad) * speedNorm);
}

function SkyAndLighting({
  sunDir,
  sunElevationDeg,
  cloudOktas,
  windVec,
  reduced,
  lowQuality,
}: {
  sunDir: Vector3;
  sunElevationDeg: number;
  cloudOktas: number;
  windVec: Vector2;
  reduced: boolean;
  lowQuality: boolean;
}) {
  const skyGeo = useMemo(() => new SphereGeometry(96, 32, 20), []);
  const uniforms = useMemo(
    () => ({
      uSunDir: { value: new Vector3(0, 0.5, -0.8) },
      uCloudCover: { value: 0.5 },
      uTime: { value: 0 },
      uWindVec: { value: new Vector2(0.5, 0) },
    }),
    []
  );

  const skyMat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: stationSkyVertexShader,
        fragmentShader: stationSkyFragmentShader,
        uniforms,
        side: BackSide,
        depthWrite: false,
      }),
    [uniforms]
  );

  useEffect(() => {
    return () => {
      skyGeo.dispose();
      skyMat.dispose();
    };
  }, [skyGeo, skyMat]);

  useLayoutEffect(() => {
    uniforms.uSunDir.value.copy(sunDir);
    uniforms.uCloudCover.value = Math.max(0, Math.min(1, cloudOktas / 8));
    uniforms.uWindVec.value.copy(windVec);
  }, [sunDir, cloudOktas, windVec, uniforms]);

  useFrame(({ clock }) => {
    if (!reduced) {
      uniforms.uTime.value = clock.getElapsedTime();
    }
  });

  const dayRatio = Math.max(0, Math.min(1, (sunElevationDeg + 6) / 28));
  const cloudAtten = 1 - (cloudOktas / 8) * 0.38;
  const dirIntensity = (0.35 + dayRatio * 1.25) * cloudAtten;
  const ambIntensity = 0.48 + dayRatio * 0.45;
  const lightPos: [number, number, number] = [
    sunDir.x * 42,
    Math.max(8, sunDir.y * 42),
    sunDir.z * 42,
  ];

  return (
    <>
      <mesh geometry={skyGeo} material={skyMat} renderOrder={-1} />
      <ambientLight
        intensity={ambIntensity}
        color={dayRatio > 0.25 ? '#F3EBDD' : '#7FA8C4'}
      />
      <hemisphereLight
        args={[
          dayRatio > 0.25 ? '#DCE8EF' : '#385A7C',
          '#6E6459',
          0.45 + dayRatio * 0.25,
        ]}
      />
      <directionalLight
        position={lightPos}
        intensity={dirIntensity}
        color={sunElevationDeg < 6 ? '#E8A864' : '#FFF7E8'}
        castShadow={!lowQuality && !reduced}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={5}
        shadow-camera-far={95}
        shadow-camera-left={-28}
        shadow-camera-right={28}
        shadow-camera-top={28}
        shadow-camera-bottom={-28}
      />
    </>
  );
}

function IsthmusTerrain({
  sunDir,
  sunElevationDeg,
}: {
  sunDir: Vector3;
  sunElevationDeg: number;
}) {
  const geo = useMemo(() => createIsthmusTerrainGeometry(19040222), []);
  const uniforms = useMemo(
    () => ({
      uSunDir: { value: new Vector3(0, 0.5, -0.8) },
      uAmbient: { value: 0.45 },
    }),
    []
  );

  const mat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: stationTerrainVertexShader,
        fragmentShader: stationTerrainFragmentShader,
        uniforms,
      }),
    [uniforms]
  );

  useEffect(() => {
    return () => {
      geo.dispose();
      mat.dispose();
    };
  }, [geo, mat]);

  useLayoutEffect(() => {
    uniforms.uSunDir.value.copy(sunDir);
    const dayRatio = Math.max(0, Math.min(1, (sunElevationDeg + 8) / 30));
    uniforms.uAmbient.value = 0.34 + dayRatio * 0.24;
  }, [sunDir, sunElevationDeg, uniforms]);

  return <mesh geometry={geo} material={mat} receiveShadow />;
}

function BayOcean({
  sunDir,
  windKmh,
  windVec,
  seaIce,
  reduced,
}: {
  sunDir: Vector3;
  windKmh: number;
  windVec: Vector2;
  seaIce: number;
  reduced: boolean;
}) {
  const waterGeo = useMemo(() => {
    const g = new PlaneGeometry(130, 130, 36, 36);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSunDir: { value: new Vector3(0, 0.5, -0.8) },
      uWindSpeed: { value: 20 },
      uWindVec: { value: new Vector2(0.5, 0) },
      uSeaIce: { value: 0 },
    }),
    []
  );

  const waterMat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: stationWaterVertexShader,
        fragmentShader: stationWaterFragmentShader,
        uniforms,
      }),
    [uniforms]
  );

  const plates = useMemo(() => generateSeaIcePlates(190406), []);
  const plateGeo = useMemo(() => new CylinderGeometry(1, 1.08, 0.18, 6), []);
  const plateMat = useMemo(
    () =>
      new MeshStandardMaterial({
        color: '#F2F7FA',
        roughness: 0.75,
        metalness: 0.05,
      }),
    []
  );
  const platesRef = useRef<InstancedMesh>(null);

  const icebergs = useMemo(() => generateIcebergs(190409), []);
  const bergGeo = useMemo(() => new DodecahedronGeometry(1.6, 0), []);
  const bergMat = useMemo(
    () =>
      new MeshStandardMaterial({
        color: '#E3F0F7',
        roughness: 0.55,
        metalness: 0.05,
        flatShading: true,
      }),
    []
  );
  const bergsRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);

  useEffect(() => {
    return () => {
      waterGeo.dispose();
      waterMat.dispose();
      plateGeo.dispose();
      plateMat.dispose();
      bergGeo.dispose();
      bergMat.dispose();
    };
  }, [waterGeo, waterMat, plateGeo, plateMat, bergGeo, bergMat]);

  useLayoutEffect(() => {
    uniforms.uSunDir.value.copy(sunDir);
    uniforms.uWindSpeed.value = windKmh;
    uniforms.uWindVec.value.copy(windVec);
    uniforms.uSeaIce.value = seaIce;
  }, [sunDir, windKmh, windVec, seaIce, uniforms]);

  // Update sea-ice pancake plates whenever seaIce changes
  useLayoutEffect(() => {
    const mesh = platesRef.current;
    if (!mesh) return;
    for (let i = 0; i < plates.length; i++) {
      const p = plates[i];
      const cov = Math.max(0, Math.min(1, (seaIce - p.threshold + 0.18) / 0.22));
      const r = p.radius * cov;
      dummy.position.set(p.x, 0.04, p.z);
      dummy.rotation.set(0, p.rotY, 0);
      dummy.scale.set(r, cov > 0.01 ? 1 : 0, r);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [plates, seaIce, dummy]);

  // Update icebergs initially and bob in useFrame when !reduced
  useLayoutEffect(() => {
    const mesh = bergsRef.current;
    if (!mesh) return;
    for (let i = 0; i < icebergs.length; i++) {
      const b = icebergs[i];
      dummy.position.set(b.x, 0.35, b.z);
      dummy.rotation.set(0.08, b.rotY, -0.05);
      dummy.scale.set(b.scaleX, b.scaleY, b.scaleZ);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [icebergs, dummy]);

  useFrame(({ clock }) => {
    if (reduced) return;
    const t = clock.getElapsedTime();
    uniforms.uTime.value = t;

    const mesh = bergsRef.current;
    if (mesh) {
      for (let i = 0; i < icebergs.length; i++) {
        const b = icebergs[i];
        const bob = Math.sin(t * 1.1 + b.phase) * 0.08 * (1 - seaIce * 0.7);
        const tilt = Math.cos(t * 0.9 + b.phase) * 0.04 * (1 - seaIce * 0.7);
        dummy.position.set(b.x, 0.35 + bob, b.z);
        dummy.rotation.set(0.06 + tilt, b.rotY, -0.04 + tilt);
        dummy.scale.set(b.scaleX, b.scaleY, b.scaleZ);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
      <mesh geometry={waterGeo} material={waterMat} position={[0, 0, 0]} />
      <instancedMesh
        ref={platesRef}
        args={[plateGeo, plateMat, plates.length]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={bergsRef}
        args={[bergGeo, bergMat, icebergs.length]}
        frustumCulled={false}
      />
    </group>
  );
}

function EraBuildings({
  buildings,
  isNight,
  windVec,
  reduced,
}: {
  buildings: readonly BuildingId[];
  isNight: boolean;
  windVec: Vector2;
  reduced: boolean;
}) {
  const omondRef = useRef<Group>(null);
  const monetaRef = useRef<Group>(null);
  const radioRef = useRef<Group>(null);
  const modernRef = useRef<Group>(null);
  const smokeRef = useRef<Group>(null);

  const presences = useRef<Record<BuildingId, number>>({
    omond: buildings.includes('omond') ? 1 : 0,
    moneta: buildings.includes('moneta') ? 1 : 0,
    radioMast: buildings.includes('radioMast') ? 1 : 0,
    modern: buildings.includes('modern') ? 1 : 0,
  });

  const invalidate = useThree((s) => s.invalidate);

  useLayoutEffect(() => {
    if (reduced) {
      presences.current.omond = buildings.includes('omond') ? 1 : 0;
      presences.current.moneta = buildings.includes('moneta') ? 1 : 0;
      presences.current.radioMast = buildings.includes('radioMast') ? 1 : 0;
      presences.current.modern = buildings.includes('modern') ? 1 : 0;
    }
    invalidate();
  }, [buildings, reduced, invalidate]);

  useFrame(({ clock }, delta) => {
    const ids: BuildingId[] = ['omond', 'moneta', 'radioMast', 'modern'];
    const refs: Record<BuildingId, RefObject<Group | null>> = {
      omond: omondRef,
      moneta: monetaRef,
      radioMast: radioRef,
      modern: modernRef,
    };

    let moving = false;
    for (const id of ids) {
      const target = buildings.includes(id) ? 1 : 0;
      const cur = presences.current[id];
      const next = reduced
        ? target
        : Math.abs(target - cur) < 0.005
          ? target
          : cur + (target - cur) * Math.min(1, delta * 6.5);
      if (next !== cur) moving = true;
      presences.current[id] = next;

      const grp = refs[id].current;
      if (grp) {
        grp.visible = next > 0.01;
        const s = Math.max(0.001, next);
        grp.scale.set(s, s, s);
      }
    }

    // Animate chimney smoke puffs on Casa Moneta when visible and !reduced
    if (!reduced && smokeRef.current && presences.current.moneta > 0.2) {
      const t = clock.getElapsedTime();
      const children = smokeRef.current.children;
      for (let i = 0; i < children.length; i++) {
        const puff = children[i];
        const cycle = (t * 0.65 + i * 0.25) % 1;
        puff.position.set(
          windVec.x * cycle * 1.4,
          cycle * 1.8,
          windVec.y * cycle * 1.4
        );
        const sc = 0.16 + cycle * 0.28;
        puff.scale.set(sc, sc, sc);
      }
    }

    if (moving) invalidate();
  });

  const windowColor = isNight ? '#F8CB66' : '#CFE2EE';
  const windowEmissive = isNight ? '#E59A28' : '#000000';

  const bldgGeos = useMemo(
    () => ({
      omondWall: new BoxGeometry(2.3, 1.1, 1.7),
      omondRoof: new ConeGeometry(1.65, 0.75, 4),
      omondPorch: new BoxGeometry(0.72, 0.84, 0.45),
      monetaBody: new BoxGeometry(3.4, 1.55, 2.2),
      monetaRoof: new ConeGeometry(2.0, 0.95, 4),
      monetaChimney: new BoxGeometry(0.32, 0.85, 0.32),
      smokePuff: new DodecahedronGeometry(1, 0),
      monetaWindow: new BoxGeometry(0.52, 0.48, 0.06),
      radioMast: new CylinderGeometry(0.08, 0.28, 6.4, 4),
      radioCross: new BoxGeometry(1.1, 0.08, 0.08),
      radioWire: new CylinderGeometry(0.025, 0.025, 12.8, 6),
      modernMain: new BoxGeometry(3.8, 1.35, 2.1),
      modernRoof: new BoxGeometry(4.0, 0.18, 2.3),
      modernLab: new BoxGeometry(2.8, 1.15, 1.8),
      modernWindow: new BoxGeometry(0.46, 0.42, 0.05),
    }),
    []
  );

  const bldgMats = useMemo(
    () => ({
      omondWall: new MeshStandardMaterial({ color: '#766E65', roughness: 0.92 }),
      omondRoof: new MeshStandardMaterial({ color: '#4E3E30', roughness: 0.85 }),
      omondPorch: new MeshStandardMaterial({ color: '#5C4938', roughness: 0.88 }),
      monetaBody: new MeshStandardMaterial({ color: '#C89B6E', roughness: 0.78 }),
      monetaRoof: new MeshStandardMaterial({ color: '#9C4320', roughness: 0.72 }),
      monetaChimney: new MeshStandardMaterial({ color: '#6E3520', roughness: 0.85 }),
      smokePuff: new MeshStandardMaterial({
        color: '#F3EBDD',
        transparent: true,
        opacity: 0.45,
        roughness: 1,
      }),
      radioMast: new MeshStandardMaterial({
        color: '#3B4651',
        roughness: 0.6,
        metalness: 0.35,
      }),
      darkSteel: new MeshStandardMaterial({ color: '#1F2A36' }),
      modernMain: new MeshStandardMaterial({ color: '#B84622', roughness: 0.65 }),
      modernRoof: new MeshStandardMaterial({ color: '#1E3E5C', roughness: 0.6 }),
      modernLab: new MeshStandardMaterial({ color: '#C0862F', roughness: 0.68 }),
    }),
    []
  );

  const monetaWindowMat = useMemo(
    () =>
      new MeshStandardMaterial({
        color: windowColor,
        emissive: windowEmissive,
        emissiveIntensity: isNight ? 0.85 : 0,
      }),
    [windowColor, windowEmissive, isNight]
  );
  const modernWindowMat = useMemo(
    () =>
      new MeshStandardMaterial({
        color: windowColor,
        emissive: windowEmissive,
        emissiveIntensity: isNight ? 0.95 : 0,
      }),
    [windowColor, windowEmissive, isNight]
  );

  useEffect(() => {
    return () => {
      Object.values(bldgGeos).forEach((g) => g.dispose());
      Object.values(bldgMats).forEach((m) => m.dispose());
      monetaWindowMat.dispose();
      modernWindowMat.dispose();
    };
  }, [bldgGeos, bldgMats, monetaWindowMat, modernWindowMat]);

  return (
    <group>
      {/* 1. Omond House (1903 stone cabin) */}
      <group ref={omondRef} position={[-1.4, 1.45, -1.6]}>
        {/* Dry-stone walls */}
        <mesh
          position={[0, 0.55, 0]}
          geometry={bldgGeos.omondWall}
          material={bldgMats.omondWall}
          castShadow
          receiveShadow
        />
        {/* Pitched timber roof */}
        <mesh
          position={[0, 1.32, 0]}
          rotation={[0, Math.PI / 4, 0]}
          geometry={bldgGeos.omondRoof}
          material={bldgMats.omondRoof}
          castShadow
        />
        {/* Small wooden entrance porch */}
        <mesh
          position={[0, 0.42, 0.95]}
          geometry={bldgGeos.omondPorch}
          material={bldgMats.omondPorch}
          castShadow
        />
      </group>

      {/* 2. Casa Moneta (1905 wooden gable house with smoking chimney) */}
      <group ref={monetaRef} position={[2.6, 1.45, -1.5]}>
        {/* Main wooden body */}
        <mesh
          position={[0, 0.78, 0]}
          geometry={bldgGeos.monetaBody}
          material={bldgMats.monetaBody}
          castShadow
          receiveShadow
        />
        {/* Gable roof */}
        <mesh
          position={[0, 1.92, 0]}
          rotation={[0, Math.PI / 4, 0]}
          scale={[1.35, 1, 0.92]}
          geometry={bldgGeos.monetaRoof}
          material={bldgMats.monetaRoof}
          castShadow
        />
        {/* Chimney */}
        <mesh
          position={[0.9, 2.25, -0.3]}
          geometry={bldgGeos.monetaChimney}
          material={bldgMats.monetaChimney}
          castShadow
        />
        {/* Chimney smoke puffs */}
        <group ref={smokeRef} position={[0.9, 2.75, -0.3]}>
          {[0, 1, 2, 3].map((i) => {
            const sc = 0.16 + i * 0.06;
            return (
              <mesh
                key={i}
                position={[i * 0.14, i * 0.36, 0]}
                scale={[sc, sc, sc]}
                geometry={bldgGeos.smokePuff}
                material={bldgMats.smokePuff}
              />
            );
          })}
        </group>
        {/* Windows */}
        {[-0.85, 0.85].map((wx) => (
          <mesh
            key={wx}
            position={[wx, 0.85, 1.12]}
            geometry={bldgGeos.monetaWindow}
            material={monetaWindowMat}
          />
        ))}
      </group>

      {/* 3. Radio Telegraphy Masts (1927 lattice towers + wire antenna) */}
      <group ref={radioRef} position={[0, 1.45, -3.6]}>
        {[-5.6, 7.2].map((mx) => (
          <group key={mx} position={[mx, 0, 0]}>
            <mesh
              position={[0, 3.2, 0]}
              geometry={bldgGeos.radioMast}
              material={bldgMats.radioMast}
              castShadow
            />
            <mesh
              position={[0, 6.1, 0]}
              geometry={bldgGeos.radioCross}
              material={bldgMats.darkSteel}
            />
          </group>
        ))}
        {/* Horizontal antenna wire between the two masts */}
        <mesh
          position={[0.8, 6.0, 0]}
          rotation={[0, 0, Math.PI / 2]}
          geometry={bldgGeos.radioWire}
          material={bldgMats.darkSteel}
        />
      </group>

      {/* 4. Modern Station Modules (vivid orange-red pavilions with lit windows at night) */}
      <group ref={modernRef} position={[5.8, 1.45, 1.8]}>
        {/* Main modern pavilion */}
        <mesh
          position={[0, 0.85, 0]}
          geometry={bldgGeos.modernMain}
          material={bldgMats.modernMain}
          castShadow
          receiveShadow
        />
        {/* Dark roof cap */}
        <mesh
          position={[0, 1.58, 0]}
          geometry={bldgGeos.modernRoof}
          material={bldgMats.modernRoof}
          castShadow
        />
        {/* Secondary lab module */}
        <mesh
          position={[-1.4, 0.72, -4.8]}
          geometry={bldgGeos.modernLab}
          material={bldgMats.modernLab}
          castShadow
          receiveShadow
        />
        {/* Lit windows */}
        {[-1.2, -0.4, 0.4, 1.2].map((wx) => (
          <mesh
            key={wx}
            position={[wx, 0.92, 1.06]}
            geometry={bldgGeos.modernWindow}
            material={modernWindowMat}
          />
        ))}
      </group>
    </group>
  );
}

function StationInstruments({
  windKmh,
  windDirDeg,
  reduced,
}: {
  windKmh: number;
  windDirDeg: number;
  reduced: boolean;
}) {
  const cupsRef = useRef<Group>(null);
  const vaneRef = useRef<Group>(null);

  const instGeos = useMemo(
    () => ({
      screenLeg: new BoxGeometry(0.09, 0.9, 0.09),
      screenBox: new BoxGeometry(1.05, 0.82, 0.88),
      screenRoof: new BoxGeometry(1.18, 0.1, 1.02),
      screenStep: new BoxGeometry(0.62, 0.42, 0.42),
      mast: new CylinderGeometry(0.07, 0.11, 4.2, 8),
      vanePole: new CylinderGeometry(0.025, 0.025, 0.95, 6),
      vaneCone: new ConeGeometry(0.12, 0.28, 4),
      vaneTail: new BoxGeometry(0.24, 0.18, 0.03),
      cupArm: new CylinderGeometry(0.018, 0.018, 0.52, 6),
      cup: new SphereGeometry(0.09, 8, 8),
      cairn: new CylinderGeometry(0.45, 0.58, 0.5, 8),
      pole: new CylinderGeometry(0.055, 0.09, 4.6, 8),
    }),
    []
  );

  const instMats = useMemo(
    () => ({
      screenLeg: new MeshStandardMaterial({ color: '#E6ECEF', roughness: 0.7 }),
      screenBox: new MeshStandardMaterial({ color: '#F7FAFB', roughness: 0.65 }),
      screenRoof: new MeshStandardMaterial({ color: '#DCE6EC', roughness: 0.65 }),
      screenStep: new MeshStandardMaterial({ color: '#8A6E53', roughness: 0.85 }),
      mast: new MeshStandardMaterial({ color: '#2B3640', metalness: 0.4, roughness: 0.5 }),
      darkSteel: new MeshStandardMaterial({ color: '#1F2A36' }),
      gold: new MeshStandardMaterial({ color: '#C0862F' }),
      cup: new MeshStandardMaterial({ color: '#A4471F' }),
      cairn: new MeshStandardMaterial({ color: '#6E665E', roughness: 0.9 }),
      pole: new MeshStandardMaterial({ color: '#F7FAFB', roughness: 0.5 }),
    }),
    []
  );

  useEffect(() => {
    return () => {
      Object.values(instGeos).forEach((g) => g.dispose());
      Object.values(instMats).forEach((m) => m.dispose());
    };
  }, [instGeos, instMats]);

  const flagGeo = useMemo(() => {
    const g = new PlaneGeometry(1.75, 1.05, 16, 8);
    g.translate(0.875, 0, 0);
    return g;
  }, []);

  const flagUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uWindSpeed: { value: 20 },
    }),
    []
  );

  const flagMat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: stationFlagVertexShader,
        fragmentShader: stationFlagFragmentShader,
        uniforms: flagUniforms,
        side: DoubleSide,
      }),
    [flagUniforms]
  );

  useEffect(() => {
    return () => {
      flagGeo.dispose();
      flagMat.dispose();
    };
  }, [flagGeo, flagMat]);

  useLayoutEffect(() => {
    flagUniforms.uWindSpeed.value = windKmh;
    if (vaneRef.current) {
      vaneRef.current.rotation.y = (-windDirDeg * Math.PI) / 180;
    }
  }, [windKmh, windDirDeg, flagUniforms]);

  useFrame(({ clock }, delta) => {
    if (reduced) return;
    flagUniforms.uTime.value = clock.getElapsedTime();
    if (cupsRef.current) {
      const spinRate = 0.6 + (windKmh / 15) * 3.2;
      cupsRef.current.rotation.y += delta * spinRate;
    }
  });

  const windToRad = ((-windDirDeg + 90) * Math.PI) / 180;

  return (
    <group>
      {/* 1. Stevenson Meteorological Screen ('screen' hotspot at [-4.5, 1.45, 2.2]) */}
      <group position={[-4.5, 1.45, 2.2]}>
        {/* Four support legs */}
        {[
          [-0.42, -0.35],
          [0.42, -0.35],
          [-0.42, 0.35],
          [0.42, 0.35],
        ].map(([lx, lz], i) => (
          <mesh
            key={i}
            position={[lx, 0.45, lz]}
            geometry={instGeos.screenLeg}
            material={instMats.screenLeg}
            castShadow
          />
        ))}
        {/* Louvered white box */}
        <mesh
          position={[0, 1.15, 0]}
          geometry={instGeos.screenBox}
          material={instMats.screenBox}
          castShadow
        />
        {/* Sloped roof */}
        <mesh
          position={[0, 1.62, 0]}
          rotation={[0.08, 0, 0]}
          geometry={instGeos.screenRoof}
          material={instMats.screenRoof}
          castShadow
        />
        {/* Front wooden steps */}
        <mesh
          position={[0, 0.22, 0.65]}
          geometry={instGeos.screenStep}
          material={instMats.screenStep}
          castShadow
        />
      </group>

      {/* 2. Wind Mast with Vane & Spinning Cups ('mast' hotspot at [-7.2, 1.45, -1.2]) */}
      <group position={[-7.2, 1.45, -1.2]}>
        <mesh
          position={[0, 2.1, 0]}
          geometry={instGeos.mast}
          material={instMats.mast}
          castShadow
        />
        {/* Wind direction vane */}
        <group ref={vaneRef} position={[0, 3.85, 0]}>
          <mesh
            rotation={[0, 0, Math.PI / 2]}
            geometry={instGeos.vanePole}
            material={instMats.darkSteel}
          />
          <mesh
            position={[0.45, 0, 0]}
            rotation={[0, 0, -Math.PI / 2]}
            geometry={instGeos.vaneCone}
            material={instMats.gold}
          />
          <mesh
            position={[-0.42, 0, 0]}
            geometry={instGeos.vaneTail}
            material={instMats.darkSteel}
          />
        </group>
        {/* 3-cup anemometer rotor */}
        <group ref={cupsRef} position={[0, 4.25, 0]}>
          {[0, 1, 2].map((idx) => {
            const ang = (idx * Math.PI * 2) / 3;
            return (
              <group key={idx} rotation={[0, ang, 0]}>
                <mesh
                  position={[0.26, 0, 0]}
                  rotation={[0, 0, Math.PI / 2]}
                  geometry={instGeos.cupArm}
                  material={instMats.darkSteel}
                />
                <mesh
                  position={[0.52, 0, 0]}
                  geometry={instGeos.cup}
                  material={instMats.cup}
                />
              </group>
            );
          })}
        </group>
      </group>

      {/* 3. Argentine Flagpole ('flag' hotspot at [0.2, 1.45, 3.6]) */}
      <group position={[0.2, 1.45, 3.6]}>
        {/* Stone cairn base */}
        <mesh
          position={[0, 0.25, 0]}
          geometry={instGeos.cairn}
          material={instMats.cairn}
          castShadow
        />
        {/* White mast */}
        <mesh
          position={[0, 2.3, 0]}
          geometry={instGeos.pole}
          material={instMats.pole}
          castShadow
        />
        {/* Waving flag cloth */}
        <mesh
          position={[0, 3.95, 0]}
          rotation={[0, windToRad, 0]}
          geometry={flagGeo}
          material={flagMat}
        />
      </group>
    </group>
  );
}

function StationFauna({
  animals,
  reduced,
}: {
  animals: readonly string[];
  reduced: boolean;
}) {
  const showPenguins =
    animals.includes('adelie') || animals.includes('chinstrap');
  const showSeals =
    animals.includes('weddell') || animals.includes('elephant');
  const showBirds =
    animals.includes('skua') || animals.includes('snowPetrel');

  const penguins = useMemo(() => generatePenguinColony(190411), []);
  const penguinGroupRef = useRef<Group>(null);
  const birdsGroupRef = useRef<Group>(null);
  const sealsGroupRef = useRef<Group>(null);

  const faunaGeos = useMemo(
    () => ({
      penguinBody: new CapsuleGeometry(0.14, 0.26, 4, 8),
      penguinBelly: new CapsuleGeometry(0.11, 0.22, 4, 8),
      penguinBeak: new ConeGeometry(0.04, 0.12, 4),
      sealBody: new CapsuleGeometry(0.26, 0.68, 4, 8),
      sealHead: new SphereGeometry(0.2, 8, 8),
      bird: new BoxGeometry(1.1, 0.4, 0.6),
    }),
    []
  );

  const faunaMats = useMemo(
    () => ({
      penguinBody: new MeshStandardMaterial({ color: '#1F2A36', roughness: 0.75 }),
      penguinBelly: new MeshStandardMaterial({ color: '#F7FAFB', roughness: 0.7 }),
      penguinBeak: new MeshStandardMaterial({ color: '#C0862F' }),
      sealBody: new MeshStandardMaterial({ color: '#4D545C', roughness: 0.82 }),
      sealHead: new MeshStandardMaterial({ color: '#596068', roughness: 0.8 }),
      birdPetrel: new MeshStandardMaterial({ color: '#F7FAFB', roughness: 0.7 }),
      birdSkua: new MeshStandardMaterial({ color: '#4E4339', roughness: 0.7 }),
    }),
    []
  );

  useEffect(() => {
    return () => {
      Object.values(faunaGeos).forEach((g) => g.dispose());
      Object.values(faunaMats).forEach((m) => m.dispose());
    };
  }, [faunaGeos, faunaMats]);

  useFrame(({ clock }) => {
    if (reduced) return;
    const t = clock.getElapsedTime();

    if (showPenguins && penguinGroupRef.current) {
      const nodes = penguinGroupRef.current.children;
      for (let i = 0; i < penguins.length; i++) {
        const p = penguins[i];
        const node = nodes[i];
        if (!node) continue;
        if (p.mode === 'walk') {
          const waddle = Math.sin(t * 4.5 * p.speed + p.phase) * 0.14;
          const stepX = Math.cos(t * 0.8 * p.speed + p.phase) * 0.35;
          const stepZ = Math.sin(t * 0.8 * p.speed + p.phase) * 0.35;
          node.position.set(p.x + stepX, p.y, p.z + stepZ);
          node.rotation.set(0, p.rotY + waddle * 0.5, waddle);
        } else {
          // Belly tobogganing down the snow slope
          const slideProgress = ((t * 0.38 * p.speed + p.phase) % 1);
          const sx = p.x + slideProgress * 1.4;
          const sz = p.z + slideProgress * 2.2;
          const sy = Math.max(0.25, p.y - slideProgress * 0.85);
          node.position.set(sx, sy, sz);
          node.rotation.set(Math.PI / 2.2, p.rotY, 0);
        }
      }
    }

    if (showBirds && birdsGroupRef.current) {
      const nodes = birdsGroupRef.current.children;
      for (let i = 0; i < nodes.length; i++) {
        const bird = nodes[i];
        const ang = t * (0.45 + i * 0.06) + i * 1.3;
        const radius = 12 + (i % 3) * 4.5;
        bird.position.set(
          Math.cos(ang) * radius,
          8.5 + (i % 2) * 2.2 + Math.sin(t * 1.5 + i) * 0.6,
          Math.sin(ang) * radius
        );
        bird.rotation.set(0, -ang, Math.sin(t * 2.2 + i) * 0.18);
      }
    }

    if (showSeals && sealsGroupRef.current) {
      const nodes = sealsGroupRef.current.children;
      for (let i = 0; i < nodes.length; i++) {
        const seal = nodes[i];
        seal.scale.y = 1 + Math.sin(t * 1.6 + i * 2) * 0.04;
      }
    }
  });

  return (
    <group>
      {/* Penguin colony on the eastern rookery terrace */}
      {showPenguins && (
        <group ref={penguinGroupRef}>
          {penguins.map((p, i) => (
            <group
              key={i}
              position={[p.x, p.y, p.z]}
              rotation={[p.mode === 'slide' ? Math.PI / 2.2 : 0, p.rotY, 0]}
            >
              {/* Dark back & body */}
              <mesh
                position={[0, 0.28, 0]}
                geometry={faunaGeos.penguinBody}
                material={faunaMats.penguinBody}
                castShadow
              />
              {/* White belly */}
              <mesh
                position={[0, 0.26, 0.06]}
                geometry={faunaGeos.penguinBelly}
                material={faunaMats.penguinBelly}
              />
              {/* Beak */}
              <mesh
                position={[0, 0.44, 0.16]}
                rotation={[Math.PI / 2, 0, 0]}
                geometry={faunaGeos.penguinBeak}
                material={faunaMats.penguinBeak}
              />
            </group>
          ))}
        </group>
      )}

      {/* Seals resting on the southern beach of Bahía Scotia */}
      {showSeals && (
        <group ref={sealsGroupRef}>
          {[
            { pos: [-3.4, 0.42, 9.2] as const, rot: 0.4 },
            { pos: [-1.6, 0.38, 9.6] as const, rot: -0.25 },
            { pos: [1.1, 0.44, 9.1] as const, rot: 0.75 },
          ].map((s, i) => (
            <group key={i} position={s.pos} rotation={[0, s.rot, 0]}>
              <mesh
                rotation={[0, 0, Math.PI / 2]}
                scale={[1.4, 0.85, 0.85]}
                geometry={faunaGeos.sealBody}
                material={faunaMats.sealBody}
                castShadow
              />
              <mesh
                position={[0.58, 0.16, 0]}
                geometry={faunaGeos.sealHead}
                material={faunaMats.sealHead}
              />
            </group>
          ))}
        </group>
      )}

      {/* Gliding seabirds (skuas and snow petrels) */}
      {showBirds && (
        <group ref={birdsGroupRef}>
          {[0, 1, 2, 3, 4].map((i) => {
            const isPetrel = animals.includes('snowPetrel') && i % 2 === 0;
            const mat = isPetrel ? faunaMats.birdPetrel : faunaMats.birdSkua;
            return (
              <group
                key={i}
                position={[Math.cos(i) * 12, 9 + (i % 2) * 2, Math.sin(i) * 12]}
              >
                <mesh
                  scale={[0.9, 0.12, 0.28]}
                  geometry={faunaGeos.bird}
                  material={mat}
                />
              </group>
            );
          })}
        </group>
      )}
    </group>
  );
}

function SnowAndSpindrift({
  windKmh,
  windVec,
  reduced,
  lowQuality,
}: {
  windKmh: number;
  windVec: Vector2;
  reduced: boolean;
  lowQuality: boolean;
}) {
  const count = lowQuality ? 140 : 420;
  const pointsRef = useRef<Points>(null);

  const geo = useMemo(() => {
    const g = new BufferGeometry();
    const positions = generateSnowParticles(count, 190412);
    g.setAttribute('position', new BufferAttribute(positions, 3));
    return g;
  }, [count]);

  const mat = useMemo(
    () =>
      new PointsMaterial({
        color: new Color('#F7FAFB'),
        size: 0.28,
        transparent: true,
        opacity: 0.78,
        depthWrite: false,
      }),
    []
  );

  useEffect(() => {
    return () => {
      geo.dispose();
      mat.dispose();
    };
  }, [geo, mat]);

  useFrame((_, delta) => {
    if (reduced || !pointsRef.current) return;
    const posAttr = geo.getAttribute('position') as BufferAttribute;
    const arr = posAttr.array as Float32Array;
    const dt = Math.min(delta, 0.05);
    const strongGale = windKmh >= 35;
    const vx = windVec.x * (strongGale ? 9.5 : 4.2);
    const vz = windVec.y * (strongGale ? 9.5 : 4.2);
    const vy = strongGale ? -1.4 : -2.2;

    for (let i = 0; i < count; i++) {
      let x = arr[i * 3] + vx * dt;
      let y = arr[i * 3 + 1] + vy * dt;
      let z = arr[i * 3 + 2] + vz * dt;

      if (x > 32) x -= 64;
      if (x < -32) x += 64;
      if (z > 32) z -= 64;
      if (z < -32) z += 64;
      if (y < 0.2) {
        y = strongGale && i % 3 === 0 ? 0.4 + (i % 5) * 0.45 : 22.0;
      }

      arr[i * 3] = x;
      arr[i * 3 + 1] = y;
      arr[i * 3 + 2] = z;
    }
    posAttr.needsUpdate = true;
  });

  if (reduced) return null;
  return <points ref={pointsRef} geometry={geo} material={mat} />;
}

function StationCameraAndProjection({
  focus,
  reduced,
  overlayRef,
  onReady,
}: {
  focus: HotspotId | null;
  reduced: boolean;
  overlayRef?: RefObject<HTMLDivElement | null>;
  onReady?: () => void;
}) {
  const controlsRef = useRef<CameraControls>(null);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const readyFiredRef = useRef(false);
  const initializedRef = useRef(false);
  const projVec = useMemo(() => new Vector3(), []);
  const buttonMapRef = useRef<Map<string, HTMLElement>>(new Map());
  const lastCamPos = useRef<Vector3 | null>(null);
  const lastSize = useRef<{ width: number; height: number }>({ width: 0, height: 0 });

  const mobile = size.width < 820;

  useLayoutEffect(() => {
    if (typeof window !== 'undefined') {
      (window as unknown as { __orcadasReady?: boolean }).__orcadasReady = true;
    }
    onReady?.();
    invalidate();
  }, [invalidate, onReady]);

  useLayoutEffect(() => {
    const cc = controlsRef.current;
    if (!cc) return;
    (window as unknown as { __orcadasCamera?: CameraControls }).__orcadasCamera = cc;
    cc.minPolarAngle = 0.14;
    cc.maxPolarAngle = Math.PI * 0.44;
    cc.minDistance = 5.5;
    cc.maxDistance = 56;
    cc.smoothTime = 0.32;
    cc.setBoundary(new Box3(new Vector3(-28, 0.2, -28), new Vector3(28, 24, 28)));

    const pose = poseForHotspot(focus, mobile);
    if (!initializedRef.current) {
      initializedRef.current = true;
      if (!reduced && (!focus || focus === 'overview')) {
        // Entry camera presentation flight from higher over the bay down to overview
        cc.setLookAt(
          pose.pos[0] * 1.25,
          pose.pos[1] * 1.35,
          pose.pos[2] * 1.25,
          pose.target[0],
          pose.target[1],
          pose.target[2],
          false
        );
        void cc.setLookAt(
          pose.pos[0],
          pose.pos[1],
          pose.pos[2],
          pose.target[0],
          pose.target[1],
          pose.target[2],
          true
        );
      } else {
        void cc.setLookAt(
          pose.pos[0],
          pose.pos[1],
          pose.pos[2],
          pose.target[0],
          pose.target[1],
          pose.target[2],
          false
        );
      }
    } else {
      void cc.setLookAt(
        pose.pos[0],
        pose.pos[1],
        pose.pos[2],
        pose.target[0],
        pose.target[1],
        pose.target[2],
        !reduced
      );
    }
    invalidate();
  }, [focus, mobile, reduced, invalidate]);

  // Keyboard orbit (Arrow keys) and zoom (+ / -)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'SELECT' ||
          target.tagName === 'TEXTAREA')
      ) {
        return;
      }
      const cc = controlsRef.current;
      if (!cc) return;
      const smooth = !reduced;
      if (e.key === 'ArrowLeft') {
        void cc.rotate(-0.18, 0, smooth);
        invalidate();
      } else if (e.key === 'ArrowRight') {
        void cc.rotate(0.18, 0, smooth);
        invalidate();
      } else if (e.key === 'ArrowUp') {
        void cc.rotate(0, -0.12, smooth);
        invalidate();
      } else if (e.key === 'ArrowDown') {
        void cc.rotate(0, 0.12, smooth);
        invalidate();
      } else if (e.key === '+' || e.key === '=') {
        void cc.dollyTo(Math.max(cc.minDistance, cc.distance * 0.8), smooth);
        invalidate();
      } else if (e.key === '-' || e.key === '_') {
        void cc.dollyTo(Math.min(cc.maxDistance, cc.distance * 1.25), smooth);
        invalidate();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [reduced, invalidate]);

  useFrame(() => {
    if (!readyFiredRef.current) {
      readyFiredRef.current = true;
      if (typeof window !== 'undefined') {
        (window as unknown as { __orcadasReady?: boolean }).__orcadasReady = true;
      }
      onReady?.();
    }

    const cc = controlsRef.current;
    if (cc && cc.active) {
      invalidate();
    }

    const overlay = overlayRef?.current;
    if (!overlay) return;

    const camPos = camera.position;
    const moving = Boolean(cc && cc.active);
    const posChanged =
      !lastCamPos.current || lastCamPos.current.distanceToSquared(camPos) > 1e-5;
    const sizeChanged =
      lastSize.current.width !== size.width ||
      lastSize.current.height !== size.height;

    if (!moving && !posChanged && !sizeChanged) {
      return;
    }

    if (!lastCamPos.current) lastCamPos.current = new Vector3();
    lastCamPos.current.copy(camPos);
    lastSize.current.width = size.width;
    lastSize.current.height = size.height;

    const map = buttonMapRef.current;
    if (map.size !== HOTSPOTS.length) {
      map.clear();
      for (const spot of HOTSPOTS) {
        const btn = overlay.querySelector<HTMLElement>(
          `[data-hotspot="${spot.id}"]`
        );
        if (btn) map.set(spot.id, btn);
      }
    }

    for (const spot of HOTSPOTS) {
      const btn = map.get(spot.id);
      if (!btn) continue;

      projVec.set(spot.worldPos[0], spot.worldPos[1], spot.worldPos[2]);
      projVec.project(camera);

      const visible =
        projVec.z < 1.0 &&
        projVec.x >= -1.08 &&
        projVec.x <= 1.08 &&
        projVec.y >= -1.08 &&
        projVec.y <= 1.08;

      if (!visible) {
        btn.style.opacity = '0';
        btn.style.pointerEvents = 'none';
        continue;
      }

      const rawSx = ((projVec.x + 1) * size.width) / 2;
      const rawSy = ((-projVec.y + 1) * size.height) / 2;
      const maxX = size.width >= 900 ? size.width - 510 : size.width - 68;
      const maxY = size.width >= 900 ? size.height - 64 : size.height * 0.52;
      const sx = Math.max(58, Math.min(maxX, rawSx));
      const sy = Math.max(116, Math.min(maxY, rawSy));
      btn.style.opacity = '1';
      btn.style.pointerEvents = 'auto';
      btn.style.left = '0px';
      btn.style.top = '0px';
      btn.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0px) translate(-50%, -50%)`;
    }
  });

  return <CameraControls ref={controlsRef} makeDefault dollyToCursor />;
}

export function StationScene({
  month,
  hour,
  windKmh,
  windDirDeg,
  cloudOktas,
  seaIce,
  buildings,
  animals,
  focus,
  reduced,
  onReady,
  overlayRef,
}: StationSceneProps) {
  const [webglOk, setWebglOk] = useState<boolean>(() => canUseWebGL());
  const [lowQuality, setLowQuality] = useState(false);
  const [enablePost, setEnablePost] = useState(false);

  const { dir: sunDir, elevationDeg: sunElevationDeg } = useMemo(
    () => computeSunDirection(month, hour),
    [month, hour]
  );

  const windVec = useMemo(
    () => computeWindVector(windDirDeg, windKmh),
    [windDirDeg, windKmh]
  );

  const isNight = sunElevationDeg < -1.5;

  if (!webglOk) {
    return (
      <StationFallback
        month={month}
        hour={hour}
        buildings={buildings}
        onReady={onReady}
      />
    );
  }

  return (
    <div className="orc-scene-wrap" aria-hidden="true">
      <Canvas
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          background: 'var(--paper, #F3EBDD)',
        }}
        frameloop="demand"
        dpr={1}
        shadows={!lowQuality && !reduced}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          alpha: false,
          preserveDrawingBuffer: true,
        }}
        camera={{
          fov: 42,
          near: 0.5,
          far: 220,
          position: [-13.5, 14.5, 31.0],
        }}
        onCreated={({ gl }) => {
          const dom = gl.domElement;
          const handleLost = (e: Event) => {
            e.preventDefault();
            setWebglOk(false);
          };
          dom.addEventListener('webglcontextlost', handleLost, { once: true });
        }}
      >
        <PerformanceMonitor
          flipflops={3}
          bounds={() => performanceBounds(lowQuality)}
          onIncline={() => {
            setLowQuality((prev) => (prev ? false : prev));
            setEnablePost((prev) => (!prev ? true : prev));
          }}
          onDecline={() => {
            setLowQuality((prev) => (!prev ? true : prev));
            setEnablePost((prev) => (prev ? false : prev));
          }}
          onFallback={() => {
            setLowQuality(true);
            setEnablePost(false);
          }}
        />
        <SkyAndLighting
          sunDir={sunDir}
          sunElevationDeg={sunElevationDeg}
          cloudOktas={cloudOktas}
          windVec={windVec}
          reduced={reduced}
          lowQuality={lowQuality}
        />
        <IsthmusTerrain sunDir={sunDir} sunElevationDeg={sunElevationDeg} />
        <BayOcean
          sunDir={sunDir}
          windKmh={windKmh}
          windVec={windVec}
          seaIce={seaIce}
          reduced={reduced}
        />
        <EraBuildings
          buildings={buildings}
          isNight={isNight}
          windVec={windVec}
          reduced={reduced}
        />
        <StationInstruments
          windKmh={windKmh}
          windDirDeg={windDirDeg}
          reduced={reduced}
        />
        <StationFauna animals={animals} reduced={reduced} />
        <SnowAndSpindrift
          windKmh={windKmh}
          windVec={windVec}
          reduced={reduced}
          lowQuality={lowQuality}
        />
        {enablePost && !lowQuality && (
          <EffectComposer multisampling={0}>
            <InkEffect />
          </EffectComposer>
        )}
        <StationCameraAndProjection
          focus={focus}
          reduced={reduced}
          overlayRef={overlayRef}
          onReady={onReady}
        />
      </Canvas>
    </div>
  );
}
