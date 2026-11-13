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
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  InstancedMesh,
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
  DIORAMA_METERS_PER_UNIT,
  DIORAMA_PROP_SCALE,
  DIORAMA_ELEMENTS,
  helicopterOnPad,
  layoutOf,
  worldCoastDistance,
  midMonthDayOfYear,
  shouldTick,
  solarAzimuthDeg,
  solarElevationDeg,
  type BuildingId,
} from '@antartida/core';
import { InkEffect } from '../map3d/InkEffect.ts';
import { buildBoxGeometry, vehicleMaterial, type Box } from '../voyage/vehicles.ts';
import {
  HOTSPOTS,
  VIEW_BEARING_DEG,
  VIEW_ELEVATION_DEG,
  VIEW_MAX_ZOOM_OUT,
  VIEW_ORBIT_DEG,
  poseForHotspot,
  type HotspotId,
} from './Hotspots.tsx';
import { StationFallback } from './StationFallback.tsx';
import { PenguinColony } from './PenguinColony.tsx';
import {
  PENGUIN_SWIM_CLEARANCE,
  beachPoint,
  buildPenguinRoute,
  penguinSwimCorridor,
} from './penguins.ts';
import {
  BIRD_WING_ROOT,
  FLAGPOLE_BASE_BOXES,
  FLAG_SEGMENT_BOXES,
  FLAG_SEGMENT_WIDTH,
  HELICOPTER_BOXES,
  HELICOPTER_ROTOR_BOXES,
  HELICOPTER_ROTOR_ORIGIN,
  HELIPAD_TOP_Y,
  ICEBERG_PINNACLE_BOXES,
  ICEBERG_TABULAR_BOXES,
  SEA_ICE_FLOE_VARIANTS,
  SKUA_MODEL,
  SNOW_PETREL_MODEL,
  STATION_BOAT_BOXES,
  STEVENSON_SCREEN_BOXES,
  VOXEL_PALETTE,
  WIND_CUPS_BOXES,
  WIND_MAST_BASE_BOXES,
  WIND_VANE_BOXES,
  buildHelipadBoxes,
  buildModuleBoxes,
  buildOmondBoxes,
  buildRadioTowerBoxes,
  buildStageDetailBoxes,
  createIsthmusTerrainGeometry,
  evaluateIsthmusTerrain,
  generateIcebergs,
  floeVisibility,
  generateSeaIcePlates,
  generateSnowParticles,
  type SeaIcePlate,
} from './stationModels.ts';
import {
  ELEPHANT_FLIPPER_L,
  ELEPHANT_FLIPPER_R,
  ELEPHANT_JAW,
  ELEPHANT_NECK,
  ELEPHANT_TAIL,
  WEDDELL_FLIPPER_L,
  WEDDELL_FLIPPER_R,
  WEDDELL_NECK,
  WEDDELL_TAIL,
  buildSealColony,
  elephantSealParts,
  residentPose as sealResidentPose,
  restPose as restSealPose,
  travellerPose as sealTravellerPose,
  weddellSealParts,
  type SealPose,
} from './seals.ts';
import {
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
  panelExpanded?: boolean;
  panelHidden?: boolean;
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

/** Paths, loose rocks and snow patches of the stage: static boxes in one geometry. */
function StageDetails() {
  const geo = useMemo(() => buildBoxGeometry(buildStageDetailBoxes()), []);
  useEffect(() => () => geo.dispose(), [geo]);
  return <mesh geometry={geo} material={vehicleMaterial} />;
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
    // Fine enough near the stage for the shore-based ice and surf (about 1.25 units per cell).
    const g = new PlaneGeometry(200, 200, 160, 160);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    const coast = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) coast[i] = worldCoastDistance(pos.getX(i), pos.getZ(i));
    g.setAttribute('aCoast', new BufferAttribute(coast, 1));
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

  const swimCorridor = useMemo(
    () => penguinSwimCorridor(buildPenguinRoute((x, z) => evaluateIsthmusTerrain(x, z).y)),
    []
  );
  const plates = useMemo(
    () => generateSeaIcePlates(190406, swimCorridor, PENGUIN_SWIM_CLEARANCE),
    [swimCorridor]
  );
  const floeGeos = useMemo(
    () => SEA_ICE_FLOE_VARIANTS.map((boxes) => buildBoxGeometry(boxes)),
    []
  );
  const variantPlates = useMemo(() => {
    const list: SeaIcePlate[][] = [[], [], [], []];
    for (const p of plates) {
      list[p.variant % 4].push(p);
    }
    return list;
  }, [plates]);
  const platesRefs = useRef<(InstancedMesh | null)[]>([]);

  const icebergs = useMemo(
    () => generateIcebergs(190409, swimCorridor, PENGUIN_SWIM_CLEARANCE),
    [swimCorridor]
  );
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
      for (const g of floeGeos) g.dispose();
      tabularGeo.dispose();
      pinnacleGeo.dispose();
    };
  }, [waterGeo, waterMat, floeGeos, tabularGeo, pinnacleGeo]);

  useLayoutEffect(() => {
    uniforms.uSunDir.value.copy(sunDir);
    uniforms.uWindSpeed.value = windKmh;
    uniforms.uWindVec.value.copy(windVec);
    uniforms.uSeaIce.value = seaIce;
  }, [sunDir, windKmh, windVec, seaIce, uniforms]);

  // Update sea-ice pancake plates whenever seaIce changes
  useLayoutEffect(() => {
    const isClosed = seaIce >= 0.9;
    variantPlates.forEach((group, v) => {
      const mesh = platesRefs.current[v];
      if (!mesh) return;
      for (let i = 0; i < group.length; i++) {
        const p = group[i];
        if (isClosed) {
          // On the closed sheet (seaIce >= 0.9) keep only about 1 in 6 as low rubble, rest hidden
          if (i % 6 === 0) {
            dummy.position.set(p.x, 0.015, p.z);
            dummy.rotation.set(0, p.rotY, 0);
            dummy.scale.set(p.sizeX * 0.65, 0.22, p.sizeZ * 0.65);
          } else {
            dummy.scale.set(0, 0, 0);
          }
        } else {
          const cov = floeVisibility(p.threshold, seaIce);
          const k = cov / 0.9;
          dummy.position.set(p.x, 0.02, p.z);
          dummy.rotation.set(0, p.rotY, 0);
          dummy.scale.set(p.sizeX * k, cov > 0.01 ? 0.8 : 0, p.sizeZ * k);
        }
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    });
  }, [variantPlates, seaIce, dummy]);

  // Update icebergs initially and bob in useFrame when !reduced
  useLayoutEffect(() => {
    const initBergs = (mesh: InstancedMesh | null, list: typeof tabularBergs) => {
      if (!mesh) return;
      for (let i = 0; i < list.length; i++) {
        const b = list[i];
        dummy.position.set(b.x, 0.35 - seaIce * 0.2, b.z);
        dummy.rotation.set(0.08, b.rotY, -0.05);
        dummy.scale.set(b.scaleX, b.scaleY, b.scaleZ);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    };
    initBergs(tabularRef.current, tabularBergs);
    initBergs(pinnacleRef.current, pinnacleBergs);
  }, [tabularBergs, pinnacleBergs, dummy, seaIce]);

  useFrame(({ clock }) => {
    if (reduced) return;
    const t = clock.getElapsedTime();
    uniforms.uTime.value = t;

    // Icebergs stop rocking as the bay closes; frozen in, they sit lower in the ice.
    const damp = 1 - seaIce;
    const updateBergs = (mesh: InstancedMesh | null, list: typeof tabularBergs) => {
      if (!mesh) return;
      for (let i = 0; i < list.length; i++) {
        const b = list[i];
        const bob = Math.sin(t * 1.1 + b.phase) * 0.08 * damp;
        const tilt = Math.cos(t * 0.9 + b.phase) * 0.04 * damp;
        dummy.position.set(b.x, 0.35 - seaIce * 0.2 + bob, b.z);
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
      {variantPlates.map((group, v) => (
        <instancedMesh
          key={v}
          ref={(node) => {
            platesRefs.current[v] = node;
          }}
          args={[floeGeos[v], vehicleMaterial, group.length]}
          frustumCulled={false}
        />
      ))}
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

/**
 * The flag as a chain of 5 box segments: each one hangs from the end of the previous one, so a
 * small turn at every hinge adds up to a wave along the cloth.
 */
function FlagChain({
  geos,
  jointRefs,
  index,
}: {
  geos: readonly BufferGeometry[];
  jointRefs: RefObject<(Group | null)[]>;
  index: number;
}) {
  if (index >= geos.length) return null;
  return (
    <group
      ref={(node) => {
        jointRefs.current[index] = node;
      }}
      position={[index === 0 ? 0 : FLAG_SEGMENT_WIDTH, 0, 0]}
    >
      <mesh geometry={geos[index]} material={vehicleMaterial} />
      <FlagChain geos={geos} jointRefs={jointRefs} index={index + 1} />
    </group>
  );
}

/** Turns each hinge of the flag: a travelling wave that grows and quickens with the wind. */
function waveFlag(joints: (Group | null)[], t: number, windKmh: number) {
  const strength = Math.min(1, windKmh / 60);
  const amp = 0.06 + strength * 0.24;
  const speed = 2.2 + strength * 5;
  joints.forEach((joint, i) => {
    if (!joint) return;
    joint.rotation.y = Math.sin(t * speed - i * 1.1) * amp * (0.6 + i * 0.15);
    // Light wind lets the free end droop a little.
    joint.rotation.z = i === 0 ? 0 : -(1 - strength) * 0.05;
  });
}

/** The boat model is 2.3 units long; the measured Zodiac is 5 m. */
const BOAT_SCALE = 5 / DIORAMA_METERS_PER_UNIT / 2.3;
const BOAT_ARRIVAL_DURATION = 6.0;
const BOAT_ARRIVAL_DISTANCE = 8.0;
const WAKE_COUNT = 26;
/** Rotor blade length in HELICOPTER_BOXES; scaled so the rotor matches the helipad side. */
const HELICOPTER_ROTOR_SPAN = 0.84;
const HELI_ARRIVAL_DURATION = 6.0;
const HELI_ROTOR_COAST_DURATION = 2.0;
const HELI_TOTAL_ARRIVAL_DURATION = HELI_ARRIVAL_DURATION + HELI_ROTOR_COAST_DURATION;
const HELI_ROTOR_CRUISE_SPEED = 22;
/** Approach start in helipad local units: high over Bahía Scotia (+z) and slightly west (-x). */
const HELI_START_OFFSET: readonly [number, number, number] = [-3.5, 5.2, 10.5];
const HELI_START_YAW = Math.atan2(HELI_START_OFFSET[2], -HELI_START_OFFSET[0]);
const HELI_START_PITCH = -0.12;

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function smooth01(t: number): number {
  const c = clamp01(t);
  return c * c * (3 - 2 * c);
}

function zodiacBottomY(localX: number, localZ: number): number {
  const az = Math.abs(localZ);
  let base = 0;
  if (localX > 0.98) base = 0.17;
  else if (localX > 0.85) base = 0.095;
  else if (localX > 0.65) base = 0.04;
  if (az > 0.31) base = Math.max(base, 0.11);
  else if (az > 0.21) base = Math.max(base, 0.085);
  else if (az > 0.08) base = Math.max(base, 0.035);
  return base;
}

const ERA_BUILDING_IDS: readonly BuildingId[] = [
  'omond',
  'flag',
  'windMast',
  'radioMast',
  'modern',
];

function StationElements({
  buildings,
  isNight,
  windKmh,
  windDirDeg,
  reduced,
  seaIce,
  showHelicopter,
}: {
  buildings: readonly BuildingId[];
  isNight: boolean;
  windKmh: number;
  windDirDeg: number;
  reduced: boolean;
  seaIce: number;
  showHelicopter: boolean;
}) {
  const vaneRef = useRef<Group>(null);
  const cupsRef = useRef<Group>(null);
  const boatRef = useRef<Group>(null);
  const wakeRef = useRef<InstancedMesh>(null);
  const heliRef = useRef<Group>(null);
  const heliRotorRef = useRef<Group>(null);
  const elementRefs = useRef<Record<string, Group | null>>({});

  const presences = useRef<Record<BuildingId, number>>({
    omond: buildings.includes('omond') ? 1 : 0,
    flag: buildings.includes('flag') ? 1 : 0,
    windMast: buildings.includes('windMast') ? 1 : 0,
    moneta: buildings.includes('moneta') ? 1 : 0,
    radioMast: buildings.includes('radioMast') ? 1 : 0,
    modern: buildings.includes('modern') ? 1 : 0,
  });

  const invalidate = useThree((s) => s.invalidate);

  const buildingElements = useMemo(
    () => DIORAMA_ELEMENTS.filter((e) => e.kind !== 'boat'),
    []
  );

  const boatLayout = useMemo(() => layoutOf('boat'), []);
  const [bx, , bz] = boatLayout.position;
  const bRotY = boatLayout.rotationY;
  const fwdX = Math.cos(bRotY);
  const fwdZ = -Math.sin(bRotY);
  const rightX = Math.sin(bRotY);
  const rightZ = Math.cos(bRotY);
  const isFrozen = seaIce >= 0.5;

  const arrivalRef = useRef<{ active: boolean; elapsed: number }>({
    active: !isFrozen && !reduced,
    elapsed: 0,
  });
  const prevFrozenRef = useRef<boolean>(isFrozen);

  const heliArrivalRef = useRef<{ active: boolean; elapsed: number }>({
    active: showHelicopter && !reduced,
    elapsed: 0,
  });
  const prevShowHeliRef = useRef<boolean>(showHelicopter);

  // Pulled up for the winter onto the flat gravel above the beach, so the chocks stay short.
  const boatBeachRest = useMemo(() => {
    const [rx, rz] = beachPoint([boatLayout.position[0], boatLayout.position[2]], 1.9);
    let maxGroundY = -Infinity;
    for (let u = -0.7; u <= 0.7; u += 0.08) {
      for (let v = -0.32; v <= 0.32; v += 0.08) {
        const wx = rx + u * fwdX + v * rightX;
        const wz = rz + u * fwdZ + v * rightZ;
        const gy = evaluateIsthmusTerrain(wx, wz).y;
        if (gy > maxGroundY) maxGroundY = gy;
      }
    }
    const chockTopY = maxGroundY + 0.04;
    const chockBoxes: Box[] = [];
    for (const u of [0.35, -0.35]) {
      const wx = rx + u * fwdX;
      const wz = rz + u * fwdZ;
      const gy = evaluateIsthmusTerrain(wx, wz).y;
      const h = Math.max(0.04, chockTopY - gy);
      const midY = gy + h / 2;
      chockBoxes.push(
        [wx, midY, wz, 0.12, h, 0.52, VOXEL_PALETTE.WOOD],
        [wx + 0.03 * fwdX, chockTopY - 0.02, wz + 0.03 * fwdZ + 0.22, 0.14, 0.06, 0.1, VOXEL_PALETTE.WOOD_LIGHT],
        [wx + 0.03 * fwdX, chockTopY - 0.02, wz + 0.03 * fwdZ - 0.22, 0.14, 0.06, 0.1, VOXEL_PALETTE.WOOD_LIGHT]
      );
    }
    return { x: rx, z: rz, chockTopY, chockGeo: buildBoxGeometry(chockBoxes) };
  }, [boatLayout, fwdX, fwdZ, rightX, rightZ]);

  // Open-water stranded pose: bow resting on the gravel beach, stern floating in the bay.
  const strandedPose = useMemo(() => {
    const [sx, sz] = beachPoint([bx, bz], -0.03);
    const roll = 0.08;
    const sternU = -0.82 * BOAT_SCALE;
    const sternWaterY = -0.025;
    let maxSlope = 0.06;

    for (let localX = -0.3; localX <= 1.04; localX += 0.06) {
      const u = localX * BOAT_SCALE;
      const zSpan = localX > 0.72 ? 0.14 : 0.36;
      for (const localZ of [-zSpan, -0.15, 0, 0.15, zSpan]) {
        const v = localZ * BOAT_SCALE;
        const bottomY = zodiacBottomY(localX, localZ) * BOAT_SCALE - v * Math.sin(roll);
        const wx = sx + u * fwdX + v * rightX;
        const wz = sz + u * fwdZ + v * rightZ;
        const gy = evaluateIsthmusTerrain(wx, wz).y;
        const slope = (gy - bottomY - sternWaterY) / (u - sternU);
        if (slope > maxSlope) maxSlope = slope;
      }
    }

    const pitch = Math.atan(maxSlope);
    const y = sternWaterY - sternU * maxSlope;
    return { x: sx, y, z: sz, pitch, roll };
  }, [bx, bz, fwdX, fwdZ, rightX, rightZ]);

  const boatGeo = useMemo(() => buildBoxGeometry(STATION_BOAT_BOXES), []);
  const wakeGeo = useMemo(
    () => buildBoxGeometry([[0, 0, 0, 1, 1, 1, VOXEL_PALETTE.WHITE]]),
    []
  );
  const wakeDummy = useMemo(() => new Object3D(), []);

  const geometries = useMemo(() => {
    const map = new Map<string, BufferGeometry>();
    for (const el of buildingElements) {
      let boxes: readonly Box[];
      const [length, width] = layoutOf(el.id).footprint;
      const height = el.heightM / DIORAMA_METERS_PER_UNIT;
      switch (el.kind) {
        case 'omond':
          boxes = buildOmondBoxes(isNight);
          break;
        case 'module':
          boxes = buildModuleBoxes(
            length,
            width,
            height,
            el.colour ?? 'unknown',
            el.roof ?? 'flat',
            isNight
          );
          break;
        case 'radioTower':
          boxes = buildRadioTowerBoxes(height);
          break;
        case 'screen':
          boxes = STEVENSON_SCREEN_BOXES;
          break;
        case 'windMast':
          boxes = WIND_MAST_BASE_BOXES;
          break;
        case 'flag':
          boxes = FLAGPOLE_BASE_BOXES;
          break;
        case 'helipad':
          boxes = buildHelipadBoxes(length);
          break;
        default:
          boxes = [];
      }
      map.set(el.id, buildBoxGeometry(boxes));
    }
    return map;
  }, [buildingElements, isNight]);

  const vaneGeo = useMemo(() => buildBoxGeometry(WIND_VANE_BOXES), []);
  const cupsGeo = useMemo(() => buildBoxGeometry(WIND_CUPS_BOXES), []);
  const heliGeo = useMemo(() => buildBoxGeometry(HELICOPTER_BOXES), []);
  const heliRotorGeo = useMemo(() => buildBoxGeometry(HELICOPTER_ROTOR_BOXES), []);

  const flagGeos = useMemo(() => FLAG_SEGMENT_BOXES.map((boxes) => buildBoxGeometry(boxes)), []);
  const flagJointRefs = useRef<(Group | null)[]>([]);

  useEffect(() => {
    return () => {
      for (const geo of geometries.values()) {
        geo.dispose();
      }
      vaneGeo.dispose();
      cupsGeo.dispose();
      heliGeo.dispose();
      heliRotorGeo.dispose();
      for (const g of flagGeos) g.dispose();
      boatBeachRest.chockGeo.dispose();
      boatGeo.dispose();
      wakeGeo.dispose();
    };
  }, [geometries, vaneGeo, cupsGeo, heliGeo, heliRotorGeo, flagGeos, boatBeachRest, boatGeo, wakeGeo]);

  useLayoutEffect(() => {
    if (reduced) waveFlag(flagJointRefs.current, 0, windKmh);
    if (vaneRef.current) {
      vaneRef.current.rotation.y = (-windDirDeg * Math.PI) / 180;
    }

    const wasFrozen = prevFrozenRef.current;
    prevFrozenRef.current = isFrozen;

    if (boatRef.current) {
      boatRef.current.rotation.order = 'YXZ';
      if (isFrozen) {
        arrivalRef.current.active = false;
        boatRef.current.position.set(boatBeachRest.x, boatBeachRest.chockTopY, boatBeachRest.z);
        boatRef.current.rotation.set(0, bRotY, 0);
      } else if (reduced) {
        arrivalRef.current.active = false;
        boatRef.current.position.set(strandedPose.x, strandedPose.y, strandedPose.z);
        boatRef.current.rotation.set(strandedPose.roll, bRotY, strandedPose.pitch);
      } else if (wasFrozen || (arrivalRef.current.active && arrivalRef.current.elapsed === 0)) {
        arrivalRef.current = { active: true, elapsed: 0 };
        boatRef.current.position.set(
          strandedPose.x - BOAT_ARRIVAL_DISTANCE * fwdX,
          -0.025,
          strandedPose.z - BOAT_ARRIVAL_DISTANCE * fwdZ
        );
        boatRef.current.rotation.set(0, bRotY, 0.03);
      }
    }
    if (wakeRef.current && (isFrozen || reduced || !arrivalRef.current.active)) {
      wakeRef.current.visible = false;
    }

    const wasShowHeli = prevShowHeliRef.current;
    prevShowHeliRef.current = showHelicopter;
    if (heliRef.current) {
      heliRef.current.rotation.order = 'YXZ';
      if (!showHelicopter || reduced) {
        heliArrivalRef.current.active = false;
        heliRef.current.position.set(0, HELIPAD_TOP_Y, 0);
        heliRef.current.rotation.set(0, 0, 0);
        if (heliRotorRef.current) heliRotorRef.current.rotation.y = 0;
      } else if (
        !wasShowHeli ||
        (heliArrivalRef.current.active && heliArrivalRef.current.elapsed === 0)
      ) {
        heliArrivalRef.current = { active: true, elapsed: 0 };
        heliRef.current.position.set(
          HELI_START_OFFSET[0],
          HELIPAD_TOP_Y + HELI_START_OFFSET[1],
          HELI_START_OFFSET[2]
        );
        heliRef.current.rotation.set(0, HELI_START_YAW, HELI_START_PITCH);
        if (heliRotorRef.current) heliRotorRef.current.rotation.y = 0;
      }
    } else if (!showHelicopter) {
      heliArrivalRef.current.active = false;
    }

    if (reduced) {
      for (const id of ERA_BUILDING_IDS) {
        presences.current[id] = buildings.includes(id) ? 1 : 0;
      }
      for (const el of buildingElements) {
        const grp = elementRefs.current[el.id];
        if (grp) {
          const p = el.era ? (buildings.includes(el.era) ? 1 : 0) : 1;
          grp.visible = p > 0.01;
          grp.scale.set(p, p, p);
        }
      }
    }
    invalidate();
  }, [
    buildings,
    windKmh,
    windDirDeg,
    reduced,
    invalidate,
    isFrozen,
    bRotY,
    fwdX,
    fwdZ,
    boatBeachRest,
    strandedPose,
    buildingElements,
    showHelicopter,
  ]);

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();
    let arrivalMoving = false;

    if (!reduced) {
      waveFlag(flagJointRefs.current, t, windKmh);
      if (cupsRef.current) {
        const spinRate = 0.6 + (windKmh / 15) * 3.2;
        cupsRef.current.rotation.y += delta * spinRate;
      }
      if (!isFrozen && boatRef.current) {
        boatRef.current.rotation.order = 'YXZ';
        if (arrivalRef.current.active) {
          arrivalRef.current.elapsed += Math.min(delta, 0.05);
          const u = clamp01(arrivalRef.current.elapsed / BOAT_ARRIVAL_DURATION);
          const ease = 1 - (1 - u) ** 2.3;
          const speedNorm = (1 - u) ** 1.3;
          const backDist = BOAT_ARRIVAL_DISTANCE * (1 - ease);
          const px = strandedPose.x - backDist * fwdX;
          const pz = strandedPose.z - backDist * fwdZ;

          const waveDamp = 1 - smooth01((u - 0.65) / 0.31);
          const swell = Math.min(1.0, Math.max(0.22, windKmh / 35));
          const waveBob = Math.sin(t * 2.8) * 0.025 * swell * waveDamp;
          const wavePitch = Math.sin(t * 3.2 + 0.5) * 0.045 * swell * waveDamp + 0.035 * speedNorm;
          const waveRoll = Math.cos(t * 2.4) * 0.055 * swell * waveDamp;

          const climb = smooth01((u - 0.68) / 0.32);
          const py = -0.025 + waveBob + (strandedPose.y - (-0.025 + waveBob)) * climb;
          const pitch = wavePitch + (strandedPose.pitch - wavePitch) * climb;
          const roll = waveRoll + (strandedPose.roll - waveRoll) * climb;
          boatRef.current.position.set(px, py, pz);
          boatRef.current.rotation.set(roll, bRotY, pitch);

          const wakeMesh = wakeRef.current;
          if (wakeMesh) {
            const wakeFade = speedNorm * (1 - smooth01((u - 0.68) / 0.24));
            if (wakeFade > 0.02) {
              wakeMesh.visible = true;
              for (let i = 0; i < WAKE_COUNT; i++) {
                let lag: number;
                let side: number;
                let sx: number;
                let sy: number;
                let sz: number;
                let wy: number;
                let yawOffset = 0;

                if (i < 10) {
                  const k = i / 9;
                  lag = 0.72 + k * 2.4;
                  side = Math.sin(i * 2.4 + t * 8) * 0.055 * (1 + k);
                  const s = wakeFade * (1 - k * 0.55) * (0.85 + 0.25 * Math.sin(t * 10 - i * 1.3));
                  sx = 0.20 * s;
                  sy = 0.036 * s;
                  sz = 0.17 * s;
                  wy = 0.016;
                } else {
                  const arm = i < 18 ? -1 : 1;
                  const idx = i < 18 ? i - 10 : i - 18;
                  const k = idx / 7;
                  lag = 0.50 + k * 2.5;
                  side = arm * (0.24 + k * 0.58);
                  const s = wakeFade * (1 - k * 0.5);
                  sx = 0.26 * s;
                  sy = 0.026 * s;
                  sz = 0.11 * s;
                  wy = 0.012;
                  yawOffset = arm * 0.24;
                }

                const wx = px - lag * fwdX + side * rightX;
                const wz = pz - lag * fwdZ + side * rightZ;
                if (worldCoastDistance(wx, wz) >= -0.04) {
                  wakeDummy.scale.set(0, 0, 0);
                } else {
                  wakeDummy.position.set(wx, wy, wz);
                  wakeDummy.rotation.set(0, bRotY + yawOffset, 0);
                  wakeDummy.scale.set(sx, sy, sz);
                }
                wakeDummy.updateMatrix();
                wakeMesh.setMatrixAt(i, wakeDummy.matrix);
              }
              wakeMesh.instanceMatrix.needsUpdate = true;
            } else {
              wakeMesh.visible = false;
            }
          }

          if (u >= 1) {
            arrivalRef.current.active = false;
            if (wakeRef.current) wakeRef.current.visible = false;
          } else {
            arrivalMoving = true;
          }
        } else {
          // Stranded: bow stays planted on the gravel beach, stern breathes gently in the swell.
          if (wakeRef.current) wakeRef.current.visible = false;
          const swell = Math.min(1.0, Math.max(0.12, windKmh / 40));
          const sternBob = Math.sin(t * 1.4) * 0.004 * swell;
          const bowU = 0.72 * BOAT_SCALE;
          const sternU = -0.82 * BOAT_SCALE;
          const pivotSpan = bowU - sternU;
          const dPitch = -sternBob / pivotSpan;
          const dY = (sternBob * bowU) / pivotSpan;
          const dRoll = Math.cos(t * 1.1) * 0.008 * swell;
          boatRef.current.position.set(strandedPose.x, strandedPose.y + dY, strandedPose.z);
          boatRef.current.rotation.set(strandedPose.roll + dRoll, bRotY, strandedPose.pitch + dPitch);
        }
      }
      if (showHelicopter && heliRef.current && heliArrivalRef.current.active) {
        heliRef.current.rotation.order = 'YXZ';
        const dt = Math.min(delta, 0.05);
        heliArrivalRef.current.elapsed += dt;
        const elapsed = heliArrivalRef.current.elapsed;

        if (elapsed < HELI_ARRIVAL_DURATION) {
          const u = clamp01(elapsed / HELI_ARRIVAL_DURATION);
          const horiz = 1 - (1 - u) ** 2.2;
          const vert = smooth01(u);
          heliRef.current.position.set(
            HELI_START_OFFSET[0] * (1 - horiz),
            HELIPAD_TOP_Y + HELI_START_OFFSET[1] * (1 - vert),
            HELI_START_OFFSET[2] * (1 - horiz)
          );
          const yaw = HELI_START_YAW * (1 - vert);
          const pitch =
            HELI_START_PITCH * (1 - smooth01((u - 0.2) / 0.55)) +
            0.08 * Math.sin(Math.PI * clamp01((u - 0.55) / 0.45));
          const roll = 0.09 * Math.sin(Math.PI * vert);
          heliRef.current.rotation.set(roll, yaw, pitch);
        } else {
          heliRef.current.position.set(0, HELIPAD_TOP_Y, 0);
          heliRef.current.rotation.set(0, 0, 0);
        }

        if (heliRotorRef.current) {
          const rotorSpeed =
            elapsed <= HELI_ARRIVAL_DURATION
              ? HELI_ROTOR_CRUISE_SPEED
              : HELI_ROTOR_CRUISE_SPEED *
                (1 - smooth01((elapsed - HELI_ARRIVAL_DURATION) / HELI_ROTOR_COAST_DURATION));
          heliRotorRef.current.rotation.y += dt * rotorSpeed;
        }

        if (elapsed >= HELI_TOTAL_ARRIVAL_DURATION) {
          heliArrivalRef.current.active = false;
        } else {
          arrivalMoving = true;
        }
      }
    }

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
    }

    for (const el of buildingElements) {
      const grp = elementRefs.current[el.id];
      if (!grp) continue;
      const p = el.era ? presences.current[el.era] : 1;
      grp.visible = p > 0.01;
      const s = Math.max(0.001, p);
      grp.scale.set(s, s, s);
    }

    if (moving || arrivalMoving) invalidate();
  });

  const windToRad = ((-windDirDeg + 90) * Math.PI) / 180;

  return (
    <group>
      {buildingElements.map((el) => {
        const layout = layoutOf(el.id);
        const geo = geometries.get(el.id);
        const isProp = el.kind === 'screen' || el.kind === 'windMast' || el.kind === 'flag';
        const scale = isProp ? DIORAMA_PROP_SCALE : 1;
        const [x, y, z] = layout.position;
        return (
          <group
            key={el.id}
            ref={(node) => {
              elementRefs.current[el.id] = node;
            }}
            position={[x, y, z]}
            rotation={[0, layout.rotationY, 0]}
          >
            <group scale={scale}>
              {geo && <mesh geometry={geo} material={vehicleMaterial} />}
              {el.id === 'windMast' && (
                <>
                  <group ref={vaneRef} position={[0, 3.85, 0]}>
                    <mesh geometry={vaneGeo} material={vehicleMaterial} />
                  </group>
                  <group ref={cupsRef} position={[0, 4.25, 0]}>
                    <mesh geometry={cupsGeo} material={vehicleMaterial} />
                  </group>
                </>
              )}
              {el.id === 'flag' && (
                <group position={[0, 3.95, 0]} rotation={[0, windToRad, 0]}>
                  <FlagChain geos={flagGeos} jointRefs={flagJointRefs} index={0} />
                </group>
              )}
              {el.id === 'helipad' && showHelicopter && (
                <group ref={heliRef} position={[0, HELIPAD_TOP_Y, 0]}>
                  <group scale={layout.footprint[0] / HELICOPTER_ROTOR_SPAN}>
                    <mesh geometry={heliGeo} material={vehicleMaterial} />
                    <group ref={heliRotorRef} position={HELICOPTER_ROTOR_ORIGIN}>
                      <mesh geometry={heliRotorGeo} material={vehicleMaterial} />
                    </group>
                  </group>
                </group>
              )}
            </group>
          </group>
        );
      })}

      {/* Zodiac boat: pulled up on chocks when frozen, stranded on beach when open */}
      {isFrozen && <mesh geometry={boatBeachRest.chockGeo} material={vehicleMaterial} />}
      <instancedMesh
        ref={wakeRef}
        args={[wakeGeo, vehicleMaterial, WAKE_COUNT]}
        visible={false}
        frustumCulled={false}
      />
      <group ref={boatRef}>
        <group scale={BOAT_SCALE}>
          <mesh geometry={boatGeo} material={vehicleMaterial} />
        </group>
      </group>
    </group>
  );
}

interface SealRig {
  root: Group | null;
  tilt: Group | null;
  neck: Group | null;
  jaw: Group | null;
  flipR: Group | null;
  flipL: Group | null;
  tail: Group | null;
}

const STILL_TIME = 2.0;

function applySealPose(rig: SealRig, p: SealPose) {
  const { root, tilt, neck, jaw, flipR, flipL, tail } = rig;
  if (!root || !tilt || !neck || !flipR || !flipL || !tail) return;
  root.position.set(p.x, p.y, p.z);
  root.rotation.y = p.yaw;
  tilt.rotation.set(p.pitch, 0, p.roll);
  tilt.scale.set(1 + p.hump * 0.08, p.stretch, 1 - p.hump * 0.06);
  neck.rotation.set(p.headPitch, p.headYaw, p.headRoll);
  if (jaw) jaw.rotation.z = -p.jawOpen * 0.35;
  flipR.rotation.set(p.flipRPitch, 0, p.flipRRoll);
  flipL.rotation.set(p.flipLPitch, 0, p.flipLRoll);
  tail.rotation.set(p.tailPitch, p.tailYaw, 0);
}

function StationFauna({
  animals,
  reduced,
  seaIce,
}: {
  animals: readonly string[];
  reduced: boolean;
  seaIce: number;
}) {
  const showPenguins =
    animals.includes('adelie') || animals.includes('chinstrap');
  const showSeals =
    animals.includes('weddell') || animals.includes('elephant');
  const showBirds =
    animals.includes('skua') || animals.includes('snowPetrel');

  const birdsGroupRef = useRef<Group>(null);

  const sealColony = useMemo(() => buildSealColony((x, z) => evaluateIsthmusTerrain(x, z).y), []);

  const weddellParts = useMemo(() => weddellSealParts(), []);
  const elephantParts = useMemo(() => elephantSealParts(), []);

  const weddellGeos = useMemo(
    () => ({
      body: buildBoxGeometry(weddellParts.body),
      head: buildBoxGeometry(weddellParts.head),
      flipperR: buildBoxGeometry(weddellParts.flipperR),
      flipperL: buildBoxGeometry(weddellParts.flipperL),
      tail: buildBoxGeometry(weddellParts.tail),
    }),
    [weddellParts]
  );

  const elephantGeos = useMemo(
    () => ({
      body: buildBoxGeometry(elephantParts.body),
      head: buildBoxGeometry(elephantParts.head),
      jaw: elephantParts.jaw ? buildBoxGeometry(elephantParts.jaw) : null,
      flipperR: buildBoxGeometry(elephantParts.flipperR),
      flipperL: buildBoxGeometry(elephantParts.flipperL),
      tail: buildBoxGeometry(elephantParts.tail),
    }),
    [elephantParts]
  );

  const seals = useMemo(
    () => [
      ...sealColony.residents.map((r) => ({
        species: r.species,
        pose: (t: number, o: SealPose) => sealResidentPose(r, t, o),
      })),
      {
        species: sealColony.traveller.species,
        pose: (t: number, o: SealPose) =>
          seaIce >= 0.5
            ? sealResidentPose(sealColony.traveller.rest, t, o)
            : sealTravellerPose(sealColony.traveller.route, t, o),
      },
    ],
    [sealColony, seaIce]
  );

  const sealRigs = useRef<SealRig[]>(
    seals.map(() => ({
      root: null,
      tilt: null,
      neck: null,
      jaw: null,
      flipR: null,
      flipL: null,
      tail: null,
    }))
  );
  const tempSealPose = useMemo(() => restSealPose(), []);

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
      weddellGeos.body.dispose();
      weddellGeos.head.dispose();
      weddellGeos.flipperR.dispose();
      weddellGeos.flipperL.dispose();
      weddellGeos.tail.dispose();
      elephantGeos.body.dispose();
      elephantGeos.head.dispose();
      elephantGeos.jaw?.dispose();
      elephantGeos.flipperR.dispose();
      elephantGeos.flipperL.dispose();
      elephantGeos.tail.dispose();

      skuaBodyGeo.dispose();
      skuaRightWingGeo.dispose();
      skuaLeftWingGeo.dispose();
      petrelBodyGeo.dispose();
      petrelRightWingGeo.dispose();
      petrelLeftWingGeo.dispose();
    };
  }, [
    weddellGeos,
    elephantGeos,
    skuaBodyGeo,
    skuaRightWingGeo,
    skuaLeftWingGeo,
    petrelBodyGeo,
    petrelRightWingGeo,
    petrelLeftWingGeo,
  ]);

  useLayoutEffect(() => {
    if (reduced) {
      seals.forEach((s, i) =>
        applySealPose(sealRigs.current[i], s.pose(STILL_TIME, tempSealPose))
      );
    }
  }, [reduced, seals, tempSealPose]);

  useFrame(({ clock }) => {
    if (reduced) return;
    const t = clock.getElapsedTime();

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

    if (showSeals) {
      seals.forEach((s, i) =>
        applySealPose(sealRigs.current[i], s.pose(t, tempSealPose))
      );
    }
  });

  return (
    <group>
      {showPenguins && <PenguinColony reduced={reduced} seaIce={seaIce} />}

      {/* Seals on the front beach of Bahía Scotia */}
      {showSeals && (
        <group>
          {seals.map((s, i) => {
            if (s.species === 'elephant' && !animals.includes('elephant')) return null;
            if (s.species === 'weddell' && !animals.includes('weddell')) return null;
            const isElephant = s.species === 'elephant';
            const geos = isElephant ? elephantGeos : weddellGeos;
            const rig = sealRigs.current[i];
            const neckPivot = isElephant ? ELEPHANT_NECK : WEDDELL_NECK;
            const flipRPivot = isElephant ? ELEPHANT_FLIPPER_R : WEDDELL_FLIPPER_R;
            const flipLPivot = isElephant ? ELEPHANT_FLIPPER_L : WEDDELL_FLIPPER_L;
            const tailPivot = isElephant ? ELEPHANT_TAIL : WEDDELL_TAIL;

            return (
              <group key={i} ref={(n) => void (rig.root = n)}>
                <group ref={(n) => void (rig.tilt = n)}>
                  <mesh geometry={geos.body} material={vehicleMaterial} />
                  <group ref={(n) => void (rig.neck = n)} position={neckPivot}>
                    <mesh geometry={geos.head} material={vehicleMaterial} />
                    {isElephant && elephantGeos.jaw && (
                      <group
                        ref={(n) => void (rig.jaw = n)}
                        position={[
                          ELEPHANT_JAW[0] - ELEPHANT_NECK[0],
                          ELEPHANT_JAW[1] - ELEPHANT_NECK[1],
                          0,
                        ]}
                      >
                        <mesh geometry={elephantGeos.jaw} material={vehicleMaterial} />
                      </group>
                    )}
                  </group>
                  <group ref={(n) => void (rig.flipR = n)} position={flipRPivot}>
                    <mesh geometry={geos.flipperR} material={vehicleMaterial} />
                  </group>
                  <group ref={(n) => void (rig.flipL = n)} position={flipLPivot}>
                    <mesh geometry={geos.flipperL} material={vehicleMaterial} />
                  </group>
                  <group ref={(n) => void (rig.tail = n)} position={tailPivot}>
                    <mesh geometry={geos.tail} material={vehicleMaterial} />
                  </group>
                </group>
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
  panelExpanded,
  panelHidden,
  overlayRef,
  onReady,
}: {
  focus: HotspotId | null;
  reduced: boolean;
  panelExpanded?: boolean;
  panelHidden?: boolean;
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
  const projectedRef = useRef(false);

  const isPortrait = size.width < 900 && size.height > size.width;
  const mobile = isPortrait;
  // Same test as the landscape media query of orcadas.css, where the panel takes the right 46 %.
  const landscape = size.width > size.height && size.height <= 500;

  useLayoutEffect(() => {
    invalidate();
  }, [invalidate]);

  useLayoutEffect(() => {
    const cc = controlsRef.current;
    if (!cc) return;
    (window as unknown as { __orcadasCamera?: CameraControls }).__orcadasCamera = cc;
    // The diorama is always seen from Bahía Scotia: a little orbit, no top view, limited zoom.
    const deg = Math.PI / 180;
    const azimuth = (180 - VIEW_BEARING_DEG) * deg;
    cc.minAzimuthAngle = azimuth - VIEW_ORBIT_DEG * deg;
    cc.maxAzimuthAngle = azimuth + VIEW_ORBIT_DEG * deg;
    cc.minPolarAngle = (90 - VIEW_ELEVATION_DEG[1]) * deg;
    cc.maxPolarAngle = (90 - VIEW_ELEVATION_DEG[0]) * deg;
    cc.minDistance = 3;
    // Never farther than a little beyond the entry view: the stage ends past it.
    const entry = poseForHotspot(null, mobile, Boolean(panelExpanded), landscape, Boolean(panelHidden));
    cc.maxDistance =
      Math.hypot(
        entry.pos[0] - entry.target[0],
        entry.pos[1] - entry.target[1],
        entry.pos[2] - entry.target[2]
      ) * VIEW_MAX_ZOOM_OUT;
    cc.smoothTime = 0.32;
    cc.setBoundary(new Box3(new Vector3(-20, -1, -14), new Vector3(20, 24, 60)));

    const pose = poseForHotspot(focus, mobile, Boolean(panelExpanded), landscape, Boolean(panelHidden));
    projectedRef.current = false;
    if (!initializedRef.current) {
      // Every visit starts from the same view, without an entry flight.
      initializedRef.current = true;
      camera.position.set(pose.pos[0], pose.pos[1], pose.pos[2]);
      camera.lookAt(new Vector3(pose.target[0], pose.target[1], pose.target[2]));
      camera.updateMatrixWorld(true);
      camera.updateProjectionMatrix();
      void cc.setLookAt(
        pose.pos[0],
        pose.pos[1],
        pose.pos[2],
        pose.target[0],
        pose.target[1],
        pose.target[2],
        false
      );
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
  }, [focus, mobile, landscape, reduced, panelExpanded, panelHidden, invalidate]);

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

  // The phone's chapter panel changes height without the camera moving: place the dots again.
  useEffect(() => {
    const panel = isPortrait ? document.querySelector('.orc-panel') : null;
    if (!panel) return;
    const ro = new ResizeObserver(() => {
      projectedRef.current = false;
      invalidate();
    });
    ro.observe(panel);
    return () => ro.disconnect();
  }, [isPortrait, invalidate]);

  useFrame(() => {
    const cc = controlsRef.current;
    if (cc && cc.active) {
      invalidate();
    }

    const overlay = overlayRef?.current;
    if (!overlay) {
      invalidate();
      return;
    }

    const map = buttonMapRef.current;
    if (map.size !== HOTSPOTS.length) {
      map.clear();
      for (const spot of HOTSPOTS) {
        const btn = overlay.querySelector<HTMLElement>(
          `[data-hotspot="${spot.id}"]`
        );
        if (btn) map.set(spot.id, btn);
      }
      if (map.size === 0) {
        invalidate();
        return;
      }
    }

    const camPos = camera.position;
    const moving = Boolean(cc && cc.active);
    const posChanged =
      !lastCamPos.current || lastCamPos.current.distanceToSquared(camPos) > 1e-5;
    const sizeChanged =
      lastSize.current.width !== size.width ||
      lastSize.current.height !== size.height;

    if (projectedRef.current && !moving && !posChanged && !sizeChanged) {
      return;
    }

    projectedRef.current = true;
    if (!lastCamPos.current) lastCamPos.current = new Vector3();
    lastCamPos.current.copy(camPos);
    lastSize.current.width = size.width;
    lastSize.current.height = size.height;

    // Dots never go under the month strip (it sits above them so its «Saber más» stays usable).
    const strip = document.querySelector('.orc-month-strip-wrap');
    const minY = strip
      ? strip.getBoundingClientRect().bottom - overlay.getBoundingClientRect().top + 24
      : 116;
    // Nor under the chapter panel: above it on a portrait phone (a bottom sheet the user drags),
    // left of it elsewhere (a card on the right).
    const panelRect = !panelHidden ? document.querySelector('.orc-panel')?.getBoundingClientRect() : null;
    const overlayRect = overlay.getBoundingClientRect();
    const panelTop = panelRect && isPortrait ? panelRect.top - overlayRect.top - 28 : null;
    const panelLeft = panelRect && !isPortrait ? panelRect.left - overlayRect.left - 28 : null;

    for (const spot of HOTSPOTS) {
      const btn = map.get(spot.id);
      if (!btn) continue;

      projVec.set(spot.worldPos[0], spot.worldPos[1], spot.worldPos[2]);
      projVec.project(camera);

      const xBound = size.width >= 900 ? 1.08 : 1.45;
      const yBound = size.width >= 900 ? 1.08 : 1.45;
      const visible =
        projVec.z < 1.01 &&
        projVec.x >= -xBound &&
        projVec.x <= xBound &&
        projVec.y >= -yBound &&
        projVec.y <= yBound;

      const rawSx = ((projVec.x + 1) * size.width) / 2;
      const rawSy = ((-projVec.y + 1) * size.height) / 2;
      // A dot that would sit under the month strip is hidden, except the focused one, which is
      // pulled down; pulling them all would stack several dots on the same line.
      const underStrip = rawSy < minY && spot.id !== focus;

      if (!visible || underStrip) {
        btn.style.opacity = '0';
        btn.style.pointerEvents = 'none';
        continue;
      }

      const maxX = panelLeft ?? size.width - 68;
      const maxY = panelTop ?? (isPortrait ? size.height * 0.52 : size.height - 64);
      const sx = Math.max(58, Math.min(maxX, rawSx));
      const sy = Math.max(Math.min(minY, maxY), Math.min(maxY, rawSy));
      btn.style.opacity = '1';
      btn.style.pointerEvents = 'auto';
      btn.style.left = '0px';
      btn.style.top = '0px';
      btn.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0px) translate(-50%, -50%)`;
    }

    const screenBtn = map.get('screen');
    const screenReady = screenBtn && screenBtn.style.pointerEvents === 'auto';
    if (!readyFiredRef.current) {
      if (screenReady) {
        readyFiredRef.current = true;
        if (typeof window !== 'undefined') {
          (window as unknown as { __orcadasReady?: boolean }).__orcadasReady = true;
        }
        onReady?.();
      } else {
        invalidate();
      }
    }
  });

  return <CameraControls ref={controlsRef} makeDefault dollyToCursor />;
}

/** Fps cap of the scene, and while quality is low: fewer frames keep a slow GPU responsive. */
const SCENE_FPS = 60;
const LOW_QUALITY_FPS = 30;
/**
 * Quality monitor bounds: [decline below, incline above]. A 90 or 144 Hz screen under the 60 fps
 * cap draws 45 to 48 fps, which must still count as fast. Low quality is capped at 30 fps, so its
 * bounds sit under that cap: drawing the full 30 means the slowdown is over (for example, the
 * window was covered while the visitor looked at another one) and full quality comes back.
 */
const qualityFpsBounds = (lowQuality: boolean): [number, number] =>
  lowQuality ? [LOW_QUALITY_FPS * 0.8, LOW_QUALITY_FPS * 0.9] : [36, 42];
/** How long a lost WebGL context has to come back before the scene falls back to 2D. */
const CONTEXT_RESTORE_MS = 4000;
/** Quality changes allowed before the monitor settles on low quality: a slow GPU stops flickering. */
const QUALITY_FLIPFLOPS = 4;

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
  panelExpanded,
  panelHidden,
  onReady,
  overlayRef,
}: StationSceneProps) {
  const [webglOk, setWebglOk] = useState<boolean>(() => canUseWebGL());
  const [lowQuality, setLowQuality] = useState(false);
  const [enablePost, setEnablePost] = useState(false);
  // Back on the page (another window or tab was in front), quality is measured again from scratch:
  // the slow frames of a covered window say nothing about the GPU.
  const [monitorRun, setMonitorRun] = useState(0);
  useEffect(() => {
    const remeasure = () => {
      if (document.hidden) return;
      setLowQuality(false);
      setMonitorRun((n) => n + 1);
    };
    window.addEventListener('focus', remeasure);
    document.addEventListener('visibilitychange', remeasure);
    return () => {
      window.removeEventListener('focus', remeasure);
      document.removeEventListener('visibilitychange', remeasure);
    };
  }, []);

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
          far: 400,
          position: [20, 9, 26],
        }}
        onCreated={({ gl }) => {
          const dom = gl.domElement;
          // A browser may drop the context of a page in the background and give it back on return:
          // wait for it before falling back to the 2D drawing, which would stay until a reload.
          let fallbackTimer = 0;
          dom.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            fallbackTimer = window.setTimeout(() => setWebglOk(false), CONTEXT_RESTORE_MS);
          });
          dom.addEventListener('webglcontextrestored', () => window.clearTimeout(fallbackTimer));
        }}
      >
        <SceneClock reduced={reduced} lowQuality={lowQuality} />
        {/* Reduced motion draws on demand: sparse frames would read as a slow GPU. */}
        {!reduced && (
          <PerformanceMonitor
            key={monitorRun}
            bounds={() => qualityFpsBounds(lowQuality)}
            flipflops={QUALITY_FLIPFLOPS}
            onIncline={() => {
              setLowQuality(false);
              setEnablePost(true);
            }}
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
        <StageDetails />
        <BayOcean
          sunDir={sunDir}
          windKmh={windKmh}
          windVec={windVec}
          seaIce={seaIce}
          reduced={reduced}
        />
        <StationElements
          buildings={buildings}
          isNight={isNight}
          windKmh={windKmh}
          windDirDeg={windDirDeg}
          seaIce={seaIce}
          reduced={reduced}
          showHelicopter={helicopterOnPad(month)}
        />
        <StationFauna
          animals={animals}
          seaIce={seaIce}
          reduced={reduced}
        />
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
          panelExpanded={panelExpanded}
          panelHidden={panelHidden}
          overlayRef={overlayRef}
          onReady={onReady}
        />
      </Canvas>
    </div>
  );
});
