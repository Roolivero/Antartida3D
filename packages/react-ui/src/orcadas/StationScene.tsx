import {
  memo,
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
  Color,
  DoubleSide,
  Group,
  InstancedMesh,
  MeshBasicMaterial,
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
  layoutOf,
  midMonthDayOfYear,
  shouldTick,
  solarAzimuthDeg,
  solarElevationDeg,
  type BuildingId,
} from '@antartida/core';
import { InkEffect } from '../map3d/InkEffect.ts';
import { buildBoxGeometry, vehicleMaterial, type Box } from '../voyage/vehicles.ts';
import { HOTSPOTS, poseForHotspot, type HotspotId } from './Hotspots.tsx';
import { StationFallback } from './StationFallback.tsx';
import {
  ADELIE_PENGUIN_BOXES,
  BIRD_WING_ROOT,
  CHINSTRAP_PENGUIN_BOXES,
  ELEPHANT_SEAL_BOXES,
  FLAGPOLE_BASE_BOXES,
  ICEBERG_PINNACLE_BOXES,
  ICEBERG_TABULAR_BOXES,
  SEA_ICE_FLOE_BOXES,
  SKUA_MODEL,
  SLIDING_PENGUIN_BOXES,
  SNOW_PETREL_MODEL,
  STATION_BOAT_BOXES,
  STEVENSON_SCREEN_BOXES,
  SUPPLY_CRATES_BOXES,
  WEDDELL_SEAL_BOXES,
  WIND_CUPS_BOXES,
  WIND_MAST_BASE_BOXES,
  WIND_VANE_BOXES,
  buildLaborcBoxes,
  buildModernModulesBoxes,
  buildMonetaBoxes,
  buildOmondBoxes,
  buildRadioMastsBoxes,
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
}: {
  sunDir: Vector3;
  sunElevationDeg: number;
  cloudOktas: number;
  windVec: Vector2;
  reduced: boolean;
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
  const plateGeo = useMemo(() => buildBoxGeometry(SEA_ICE_FLOE_BOXES), []);
  const platesRef = useRef<InstancedMesh>(null);

  const icebergs = useMemo(() => generateIcebergs(190409), []);
  const tabularBergs = useMemo(
    () => icebergs.filter((b) => b.variant === 'tabular'),
    [icebergs]
  );
  const pinnacleBergs = useMemo(
    () => icebergs.filter((b) => b.variant === 'pinnacle'),
    [icebergs]
  );
  const tabularGeo = useMemo(() => buildBoxGeometry(ICEBERG_TABULAR_BOXES), []);
  const pinnacleGeo = useMemo(() => buildBoxGeometry(ICEBERG_PINNACLE_BOXES), []);
  const tabularRef = useRef<InstancedMesh>(null);
  const pinnacleRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);

  useEffect(() => {
    return () => {
      waterGeo.dispose();
      waterMat.dispose();
      plateGeo.dispose();
      tabularGeo.dispose();
      pinnacleGeo.dispose();
    };
  }, [waterGeo, waterMat, plateGeo, tabularGeo, pinnacleGeo]);

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
    const initBergs = (mesh: InstancedMesh | null, list: typeof tabularBergs) => {
      if (!mesh) return;
      for (let i = 0; i < list.length; i++) {
        const b = list[i];
        dummy.position.set(b.x, 0.35, b.z);
        dummy.rotation.set(0.08, b.rotY, -0.05);
        dummy.scale.set(b.scaleX, b.scaleY, b.scaleZ);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    };
    initBergs(tabularRef.current, tabularBergs);
    initBergs(pinnacleRef.current, pinnacleBergs);
  }, [tabularBergs, pinnacleBergs, dummy]);

  useFrame(({ clock }) => {
    if (reduced) return;
    const t = clock.getElapsedTime();
    uniforms.uTime.value = t;

    const damp = 1 - seaIce * 0.7;
    const updateBergs = (mesh: InstancedMesh | null, list: typeof tabularBergs) => {
      if (!mesh) return;
      for (let i = 0; i < list.length; i++) {
        const b = list[i];
        const bob = Math.sin(t * 1.1 + b.phase) * 0.08 * damp;
        const tilt = Math.cos(t * 0.9 + b.phase) * 0.04 * damp;
        dummy.position.set(b.x, 0.35 + bob, b.z);
        dummy.rotation.set(0.06 + tilt, b.rotY, -0.04 + tilt);
        dummy.scale.set(b.scaleX, b.scaleY, b.scaleZ);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    };
    updateBergs(tabularRef.current, tabularBergs);
    updateBergs(pinnacleRef.current, pinnacleBergs);
  });

  return (
    <group>
      <mesh geometry={waterGeo} material={waterMat} position={[0, 0, 0]} />
      <instancedMesh
        ref={platesRef}
        args={[plateGeo, vehicleMaterial, plates.length]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={tabularRef}
        args={[tabularGeo, vehicleMaterial, tabularBergs.length]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={pinnacleRef}
        args={[pinnacleGeo, vehicleMaterial, pinnacleBergs.length]}
        frustumCulled={false}
      />
    </group>
  );
}

type EraBuildingId = 'omond' | 'moneta' | 'radioMast' | 'modern';
const ERA_BUILDING_IDS: readonly EraBuildingId[] = ['omond', 'moneta', 'radioMast', 'modern'];

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
  const laborcRef = useRef<Group>(null);
  const smokeRef = useRef<Group>(null);

  const presences = useRef<Record<EraBuildingId, number>>({
    omond: buildings.includes('omond') ? 1 : 0,
    moneta: buildings.includes('moneta') ? 1 : 0,
    radioMast: buildings.includes('radioMast') ? 1 : 0,
    modern: buildings.includes('modern') ? 1 : 0,
  });

  const invalidate = useThree((s) => s.invalidate);

  useLayoutEffect(() => {
    if (reduced) {
      for (const id of ERA_BUILDING_IDS) {
        presences.current[id] = buildings.includes(id) ? 1 : 0;
      }
    }
    invalidate();
  }, [buildings, reduced, invalidate]);

  useFrame(({ clock }, delta) => {
    const refs: Record<EraBuildingId, RefObject<Group | null>> = {
      omond: omondRef,
      moneta: monetaRef,
      radioMast: radioRef,
      modern: modernRef,
    };

    let moving = false;
    for (const id of ERA_BUILDING_IDS) {
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
      if (id === 'modern') {
        const labGrp = laborcRef.current;
        if (labGrp) {
          labGrp.visible = next > 0.01;
          const s = Math.max(0.001, next);
          labGrp.scale.set(s, s, s);
        }
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

  const omondGeo = useMemo(() => buildBoxGeometry(buildOmondBoxes(isNight)), [isNight]);
  const monetaGeo = useMemo(() => buildBoxGeometry(buildMonetaBoxes(isNight)), [isNight]);
  const radioGeo = useMemo(() => buildBoxGeometry(buildRadioMastsBoxes()), []);
  const modernGeo = useMemo(() => buildBoxGeometry(buildModernModulesBoxes(isNight)), [isNight]);
  const laborcGeo = useMemo(() => buildBoxGeometry(buildLaborcBoxes(isNight)), [isNight]);
  const smokeGeo = useMemo(() => new BoxGeometry(1, 1, 1), []);
  const smokeMat = useMemo(
    () => new MeshBasicMaterial({ color: 0xf3ebdd, transparent: true, opacity: 0.55 }),
    []
  );

  useEffect(() => {
    return () => {
      omondGeo.dispose();
      monetaGeo.dispose();
      radioGeo.dispose();
      modernGeo.dispose();
      laborcGeo.dispose();
      smokeGeo.dispose();
      smokeMat.dispose();
    };
  }, [omondGeo, monetaGeo, radioGeo, modernGeo, laborcGeo, smokeGeo, smokeMat]);

  return (
    <group>
      {/* 1. Omond House (1903 stone cabin) */}
      <group
        ref={omondRef}
        position={layoutOf('omond').position}
        rotation={[0, layoutOf('omond').rotationY, 0]}
      >
        <mesh geometry={omondGeo} material={vehicleMaterial} />
      </group>

      {/* 2. Casa Moneta (1905 wooden house with smoking chimney) */}
      <group
        ref={monetaRef}
        position={layoutOf('moneta').position}
        rotation={[0, layoutOf('moneta').rotationY, 0]}
      >
        <mesh geometry={monetaGeo} material={vehicleMaterial} />
        {/* Chimney smoke puffs inclined by wind */}
        <group ref={smokeRef} position={[0.95, 2.95, -0.35]}>
          {[0, 1, 2, 3].map((i) => {
            const sc = 0.16 + i * 0.06;
            return (
              <mesh
                key={i}
                position={[i * 0.14, i * 0.36, 0]}
                scale={[sc, sc, sc]}
                geometry={smokeGeo}
                material={smokeMat}
              />
            );
          })}
        </group>
      </group>

      {/* 3. Radio Telegraphy Masts (1927 lattice towers + wire antenna) */}
      <group
        ref={radioRef}
        position={layoutOf('radioMast').position}
        rotation={[0, layoutOf('radioMast').rotationY, 0]}
      >
        <mesh geometry={radioGeo} material={vehicleMaterial} />
      </group>

      {/* 4. Modern Station Modules (pavilions) */}
      <group
        ref={modernRef}
        position={layoutOf('modern').position}
        rotation={[0, layoutOf('modern').rotationY, 0]}
      >
        <mesh geometry={modernGeo} material={vehicleMaterial} />
      </group>

      {/* 5. Science lab module (LABORC) */}
      <group
        ref={laborcRef}
        position={layoutOf('laborc').position}
        rotation={[0, layoutOf('laborc').rotationY, 0]}
      >
        <mesh geometry={laborcGeo} material={vehicleMaterial} />
      </group>
    </group>
  );
}

function StationInstruments({
  windKmh,
  windDirDeg,
  reduced,
  buildings,
}: {
  windKmh: number;
  windDirDeg: number;
  reduced: boolean;
  buildings: readonly BuildingId[];
}) {
  const cupsRef = useRef<Group>(null);
  const vaneRef = useRef<Group>(null);
  const mastRef = useRef<Group>(null);
  const flagRef = useRef<Group>(null);

  const presences = useRef({
    windMast: buildings.includes('windMast') ? 1 : 0,
    flag: buildings.includes('flag') ? 1 : 0,
  });

  const invalidate = useThree((s) => s.invalidate);

  const screenGeo = useMemo(() => buildBoxGeometry(STEVENSON_SCREEN_BOXES), []);
  const mastBaseGeo = useMemo(() => buildBoxGeometry(WIND_MAST_BASE_BOXES), []);
  const vaneGeo = useMemo(() => buildBoxGeometry(WIND_VANE_BOXES), []);
  const cupsGeo = useMemo(() => buildBoxGeometry(WIND_CUPS_BOXES), []);
  const flagpoleGeo = useMemo(() => buildBoxGeometry(FLAGPOLE_BASE_BOXES), []);
  const cratesGeo = useMemo(() => buildBoxGeometry(SUPPLY_CRATES_BOXES), []);
  const boatGeo = useMemo(() => buildBoxGeometry(STATION_BOAT_BOXES), []);

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
      screenGeo.dispose();
      mastBaseGeo.dispose();
      vaneGeo.dispose();
      cupsGeo.dispose();
      flagpoleGeo.dispose();
      cratesGeo.dispose();
      boatGeo.dispose();
      flagGeo.dispose();
      flagMat.dispose();
    };
  }, [
    screenGeo,
    mastBaseGeo,
    vaneGeo,
    cupsGeo,
    flagpoleGeo,
    cratesGeo,
    boatGeo,
    flagGeo,
    flagMat,
  ]);

  useLayoutEffect(() => {
    flagUniforms.uWindSpeed.value = windKmh;
    if (vaneRef.current) {
      vaneRef.current.rotation.y = (-windDirDeg * Math.PI) / 180;
    }
    if (reduced) {
      presences.current.windMast = buildings.includes('windMast') ? 1 : 0;
      presences.current.flag = buildings.includes('flag') ? 1 : 0;
    }
    invalidate();
  }, [windKmh, windDirDeg, flagUniforms, buildings, reduced, invalidate]);

  useFrame(({ clock }, delta) => {
    if (!reduced) {
      flagUniforms.uTime.value = clock.getElapsedTime();
      if (cupsRef.current) {
        const spinRate = 0.6 + (windKmh / 15) * 3.2;
        cupsRef.current.rotation.y += delta * spinRate;
      }
    }

    const instRefs = [
      ['windMast', mastRef],
      ['flag', flagRef],
    ] as const;

    let moving = false;
    for (const [id, ref] of instRefs) {
      const target = buildings.includes(id) ? 1 : 0;
      const cur = presences.current[id];
      const next = reduced
        ? target
        : Math.abs(target - cur) < 0.005
          ? target
          : cur + (target - cur) * Math.min(1, delta * 6.5);
      if (next !== cur) moving = true;
      presences.current[id] = next;

      const grp = ref.current;
      if (grp) {
        grp.visible = next > 0.01;
        const s = Math.max(0.001, next);
        grp.scale.set(s, s, s);
      }
    }
    if (moving) invalidate();
  });

  const windToRad = ((-windDirDeg + 90) * Math.PI) / 180;

  return (
    <group>
      {/* 1. Stevenson Meteorological Screen ('screen' hotspot) */}
      <group
        position={layoutOf('screen').position}
        rotation={[0, layoutOf('screen').rotationY, 0]}
      >
        <mesh geometry={screenGeo} material={vehicleMaterial} />
      </group>

      {/* 2. Wind Mast with Vane & Spinning Cups ('mast' hotspot) */}
      <group
        ref={mastRef}
        position={layoutOf('windMast').position}
        rotation={[0, layoutOf('windMast').rotationY, 0]}
      >
        <mesh geometry={mastBaseGeo} material={vehicleMaterial} />
        {/* Wind direction vane */}
        <group ref={vaneRef} position={[0, 3.85, 0]}>
          <mesh geometry={vaneGeo} material={vehicleMaterial} />
        </group>
        {/* 3-cup anemometer rotor */}
        <group ref={cupsRef} position={[0, 4.25, 0]}>
          <mesh geometry={cupsGeo} material={vehicleMaterial} />
        </group>
      </group>

      {/* 3. Argentine Flagpole ('flag' hotspot) */}
      <group
        ref={flagRef}
        position={layoutOf('flag').position}
        rotation={[0, layoutOf('flag').rotationY, 0]}
      >
        <mesh geometry={flagpoleGeo} material={vehicleMaterial} />
        {/* Waving flag cloth */}
        <mesh
          position={[0, 3.95, 0]}
          rotation={[0, windToRad, 0]}
          geometry={flagGeo}
          material={flagMat}
        />
      </group>

      {/* 4. Historic supply crates beside Casa Moneta */}
      <group
        position={layoutOf('crates').position}
        rotation={[0, layoutOf('crates').rotationY, 0]}
      >
        <mesh geometry={cratesGeo} material={vehicleMaterial} />
      </group>

      {/* 5. Station whaleboat pulled onto Scotia Bay shore */}
      <group
        position={layoutOf('boat').position}
        rotation={[0, layoutOf('boat').rotationY, 0]}
      >
        <mesh geometry={boatGeo} material={vehicleMaterial} />
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

  const adelieGeo = useMemo(() => buildBoxGeometry(ADELIE_PENGUIN_BOXES), []);
  const chinstrapGeo = useMemo(() => buildBoxGeometry(CHINSTRAP_PENGUIN_BOXES), []);
  const slideGeo = useMemo(() => buildBoxGeometry(SLIDING_PENGUIN_BOXES), []);

  const weddellGeo = useMemo(() => buildBoxGeometry(WEDDELL_SEAL_BOXES), []);
  const elephantGeo = useMemo(() => buildBoxGeometry(ELEPHANT_SEAL_BOXES), []);

  const mirrorZ = (boxes: readonly Box[]): Box[] =>
    boxes.map(([x, y, z, ...rest]) => [x, y, -z, ...rest]);

  const skuaBodyGeo = useMemo(() => buildBoxGeometry(SKUA_MODEL.body), []);
  const skuaRightWingGeo = useMemo(() => buildBoxGeometry(SKUA_MODEL.wing), []);
  const skuaLeftWingGeo = useMemo(() => buildBoxGeometry(mirrorZ(SKUA_MODEL.wing)), []);

  const petrelBodyGeo = useMemo(() => buildBoxGeometry(SNOW_PETREL_MODEL.body), []);
  const petrelRightWingGeo = useMemo(() => buildBoxGeometry(SNOW_PETREL_MODEL.wing), []);
  const petrelLeftWingGeo = useMemo(() => buildBoxGeometry(mirrorZ(SNOW_PETREL_MODEL.wing)), []);

  useEffect(() => {
    return () => {
      adelieGeo.dispose();
      chinstrapGeo.dispose();
      slideGeo.dispose();
      weddellGeo.dispose();
      elephantGeo.dispose();
      skuaBodyGeo.dispose();
      skuaRightWingGeo.dispose();
      skuaLeftWingGeo.dispose();
      petrelBodyGeo.dispose();
      petrelRightWingGeo.dispose();
      petrelLeftWingGeo.dispose();
    };
  }, [
    adelieGeo,
    chinstrapGeo,
    slideGeo,
    weddellGeo,
    elephantGeo,
    skuaBodyGeo,
    skuaRightWingGeo,
    skuaLeftWingGeo,
    petrelBodyGeo,
    petrelRightWingGeo,
    petrelLeftWingGeo,
  ]);

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
          const slideProgress = (t * 0.38 * p.speed + p.phase) % 1;
          const sx = p.x + slideProgress * 1.4;
          const sz = p.z + slideProgress * 2.2;
          const sy = Math.max(0.25, p.y - slideProgress * 0.85);
          node.position.set(sx, sy, sz);
          node.rotation.set(0.22, p.rotY, 0);
        }
      }
    }

    if (showBirds && birdsGroupRef.current) {
      const nodes = birdsGroupRef.current.children;
      for (let i = 0; i < nodes.length; i++) {
        const bird = nodes[i];
        const isPetrel = animals.includes('snowPetrel') && i % 2 === 0;
        const model = isPetrel ? SNOW_PETREL_MODEL : SKUA_MODEL;
        const ang = t * (0.45 + i * 0.06) + i * 1.3;
        const radius = 12 + (i % 3) * 4.5;
        bird.position.set(
          Math.cos(ang) * radius,
          8.5 + (i % 2) * 2.2 + Math.sin(t * 1.5 + i) * 0.6,
          Math.sin(ang) * radius
        );
        bird.rotation.set(0.08, -ang - Math.PI / 2, Math.sin(t * 1.8 + i) * 0.14, 'YXZ');

        const [reach, speed] = model.flap;
        const lift = 0.08 + Math.sin(t * speed + i * 1.2) * reach;
        if (bird.children[1]) bird.children[1].rotation.x = -lift;
        if (bird.children[2]) bird.children[2].rotation.x = lift;
      }
    }

    if (showSeals && sealsGroupRef.current) {
      const nodes = sealsGroupRef.current.children;
      for (let i = 0; i < nodes.length; i++) {
        const seal = nodes[i];
        const breath = Math.sin(t * 1.6 + i * 2) * 0.04;
        seal.scale.set(1 + breath * 0.3, 1 + breath, 1 + breath * 0.3);
      }
    }
  });

  return (
    <group>
      {/* Penguin colony on the eastern rookery terrace */}
      {showPenguins && (
        <group ref={penguinGroupRef}>
          {penguins.map((p, i) => {
            const geo =
              p.mode === 'slide'
                ? slideGeo
                : p.species === 'adelie'
                  ? adelieGeo
                  : chinstrapGeo;
            return (
              <group
                key={i}
                position={[p.x, p.y, p.z]}
                rotation={[p.mode === 'slide' ? 0.22 : 0, p.rotY, 0]}
              >
                <mesh geometry={geo} material={vehicleMaterial} />
              </group>
            );
          })}
        </group>
      )}

      {/* Seals resting on the southern beach of Bahía Scotia */}
      {showSeals && (
        <group ref={sealsGroupRef}>
          {[
            { pos: [-3.4, 0.42, 9.2] as const, rot: 0.4, type: 'weddell' as const },
            { pos: [-1.6, 0.38, 9.6] as const, rot: -0.25, type: 'elephant' as const },
            { pos: [1.1, 0.44, 9.1] as const, rot: 0.75, type: 'weddell' as const },
          ].map((s, i) => {
            const isElephant =
              s.type === 'elephant' && animals.includes('elephant');
            const geo = isElephant ? elephantGeo : weddellGeo;
            return (
              <group key={i} position={s.pos} rotation={[0, s.rot, 0]}>
                <mesh geometry={geo} material={vehicleMaterial} />
              </group>
            );
          })}
        </group>
      )}

      {/* Gliding seabirds (skuas and snow petrels) */}
      {showBirds && (
        <group ref={birdsGroupRef}>
          {[0, 1, 2, 3, 4].map((i) => {
            const isPetrel = animals.includes('snowPetrel') && i % 2 === 0;
            const bodyGeo = isPetrel ? petrelBodyGeo : skuaBodyGeo;
            const rightWingGeo = isPetrel ? petrelRightWingGeo : skuaRightWingGeo;
            const leftWingGeo = isPetrel ? petrelLeftWingGeo : skuaLeftWingGeo;
            return (
              <group
                key={i}
                position={[Math.cos(i) * 12, 9 + (i % 2) * 2, Math.sin(i) * 12]}
              >
                {/* 0: Body */}
                <mesh geometry={bodyGeo} material={vehicleMaterial} />
                {/* 1: Right wing */}
                <group position={BIRD_WING_ROOT}>
                  <mesh geometry={rightWingGeo} material={vehicleMaterial} />
                </group>
                {/* 2: Left wing */}
                <group
                  position={[
                    BIRD_WING_ROOT[0],
                    BIRD_WING_ROOT[1],
                    -BIRD_WING_ROOT[2],
                  ]}
                >
                  <mesh geometry={leftWingGeo} material={vehicleMaterial} />
                </group>
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
        size: 0.085,
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
    cc.maxPolarAngle = Math.PI * 0.47;
    cc.minDistance = 4.5;
    cc.maxDistance = 75;
    cc.smoothTime = 0.32;
    cc.setBoundary(new Box3(new Vector3(-55, -15, -55), new Vector3(55, 45, 65)));

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

      const xBound = size.width >= 900 ? 1.08 : 1.45;
      const yBound = size.width >= 900 ? 1.08 : 1.45;
      const visible =
        projVec.z < 1.0 &&
        projVec.x >= -xBound &&
        projVec.x <= xBound &&
        projVec.y >= -yBound &&
        projVec.y <= yBound;

      if (!visible) {
        btn.style.opacity = '0';
        btn.style.pointerEvents = 'none';
        continue;
      }

      const rawSx = ((projVec.x + 1) * size.width) / 2;
      const rawSy = ((-projVec.y + 1) * size.height) / 2;
      const maxX = size.width >= 900 ? size.width - 560 : size.width - 68;
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

/** Fps cap of the scene, and while quality is low: fewer frames keep a slow GPU responsive. */
const SCENE_FPS = 60;
const LOW_QUALITY_FPS = 30;
/**
 * Quality monitor bounds: [decline below, incline above]. A 90 or 144 Hz screen under the 60 fps
 * cap draws 45 to 48 fps, which must still count as fast. Low quality never reaches the upper one.
 */
const QUALITY_FPS_BOUNDS: [number, number] = [36, 42];

/**
 * Keeps the demand-driven canvas drawing while the scene animates. Without it the snow, sea and
 * fauna only advanced when the camera moved, and jumped ahead on the next frame.
 */
function SceneClock({ reduced, lowQuality }: { reduced: boolean; lowQuality: boolean }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    if (reduced) return;
    let id = 0;
    let lastTickMs = 0;
    const loop = (nowMs: number) => {
      if (!document.hidden && shouldTick(nowMs, lastTickMs, lowQuality ? LOW_QUALITY_FPS : SCENE_FPS)) {
        lastTickMs = nowMs;
        invalidate();
      }
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [invalidate, reduced, lowQuality]);
  return null;
}

export const StationScene = memo(function StationScene({
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
        // Low quality also renders fewer pixels: the sky and ink passes cost per pixel.
        dpr={lowQuality ? 0.7 : 1}
        shadows={false}
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
        <SceneClock reduced={reduced} lowQuality={lowQuality} />
        {/* Reduced motion draws on demand: sparse frames would read as a slow GPU. */}
        {!reduced && (
          <PerformanceMonitor
            bounds={() => QUALITY_FPS_BOUNDS}
            onIncline={() => setEnablePost(true)}
            onDecline={() => {
              setLowQuality(true);
              setEnablePost(false);
            }}
          />
        )}
        <SkyAndLighting
          sunDir={sunDir}
          sunElevationDeg={sunElevationDeg}
          cloudOktas={cloudOktas}
          windVec={windVec}
          reduced={reduced}
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
          buildings={buildings}
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
});
