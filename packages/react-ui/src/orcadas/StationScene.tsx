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
import { beachPoint } from './penguins.ts';
import {
  BIRD_WING_ROOT,
  FLAGPOLE_BASE_BOXES,
  FLAG_SEGMENT_BOXES,
  FLAG_SEGMENT_WIDTH,
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

  const plates = useMemo(() => generateSeaIcePlates(190406), []);
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

/** The boat model is 2.3 units long; the measured boat is 5 m. */
const BOAT_SCALE = 5 / DIORAMA_METERS_PER_UNIT / 2.3;

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
}: {
  buildings: readonly BuildingId[];
  isNight: boolean;
  windKmh: number;
  windDirDeg: number;
  reduced: boolean;
  seaIce: number;
}) {
  const vaneRef = useRef<Group>(null);
  const cupsRef = useRef<Group>(null);
  const boatRef = useRef<Group>(null);
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
  const isFrozen = seaIce >= 0.5;

  // Pulled up for the winter onto the flat gravel above the beach, so the chocks stay short.
  const boatBeachRest = useMemo(() => {
    const [bx, bz] = beachPoint([boatLayout.position[0], boatLayout.position[2]], 1.9);
    const c = Math.cos(bRotY);
    const s = Math.sin(bRotY);
    let maxGroundY = -Infinity;
    for (let u = -0.7; u <= 0.7; u += 0.08) {
      for (let v = -0.25; v <= 0.25; v += 0.06) {
        const wx = bx + u * c + v * s;
        const wz = bz - u * s + v * c;
        const gy = evaluateIsthmusTerrain(wx, wz).y;
        if (gy > maxGroundY) maxGroundY = gy;
      }
    }
    const chockTopY = maxGroundY + 0.04;
    const chockBoxes: Box[] = [];
    for (const u of [0.35, -0.35]) {
      const wx = bx + u * c;
      const wz = bz - u * s;
      const gy = evaluateIsthmusTerrain(wx, wz).y;
      const h = Math.max(0.04, chockTopY - gy);
      const midY = gy + h / 2;
      chockBoxes.push(
        [wx, midY, wz, 0.12, h, 0.52, VOXEL_PALETTE.WOOD],
        [wx + 0.03 * c, chockTopY - 0.02, wz - 0.03 * s + 0.22, 0.14, 0.06, 0.1, VOXEL_PALETTE.WOOD_LIGHT],
        [wx + 0.03 * c, chockTopY - 0.02, wz - 0.03 * s - 0.22, 0.14, 0.06, 0.1, VOXEL_PALETTE.WOOD_LIGHT]
      );
    }
    return { x: bx, z: bz, chockTopY, chockGeo: buildBoxGeometry(chockBoxes) };
  }, [boatLayout, bRotY]);

  const mooredPoint = useMemo(() => {
    const pt = beachPoint([bx, bz], -0.9);
    return [pt[0], -0.02, pt[1]] as const;
  }, [bx, bz]);

  const bollardGeo = useMemo(() => {
    const gy = evaluateIsthmusTerrain(bx, bz).y;
    const boxes: Box[] = [
      [bx, gy + 0.12, bz, 0.1, 0.24, 0.1, VOXEL_PALETTE.WOOD],
      [bx, gy + 0.23, bz, 0.14, 0.04, 0.14, VOXEL_PALETTE.WOOD_LIGHT],
    ];
    return buildBoxGeometry(boxes);
  }, [bx, bz]);

  const mooringLineGeo = useMemo(() => {
    const bowX = mooredPoint[0] + 1.18 * BOAT_SCALE * Math.cos(bRotY);
    const bowY = mooredPoint[1] + 0.36 * BOAT_SCALE;
    const bowZ = mooredPoint[2] - 1.18 * BOAT_SCALE * Math.sin(bRotY);
    const bollardX = bx;
    const bollardY = evaluateIsthmusTerrain(bx, bz).y + 0.22;
    const bollardZ = bz;
    const boxes: Box[] = [];
    const segments = 8;
    for (let i = 0; i < segments; i++) {
      const t0 = i / segments;
      const t1 = (i + 1) / segments;
      const x0 = bowX + (bollardX - bowX) * t0;
      const y0 = bowY + (bollardY - bowY) * t0 - Math.sin(t0 * Math.PI) * 0.08;
      const z0 = bowZ + (bollardZ - bowZ) * t0;
      const x1 = bowX + (bollardX - bowX) * t1;
      const y1 = bowY + (bollardY - bowY) * t1 - Math.sin(t1 * Math.PI) * 0.08;
      const z1 = bowZ + (bollardZ - bowZ) * t1;
      const mx = (x0 + x1) / 2;
      const my = (y0 + y1) / 2;
      const mz = (z0 + z1) / 2;
      boxes.push([
        mx,
        my,
        mz,
        Math.max(0.025, Math.abs(x1 - x0) + 0.015),
        Math.max(0.025, Math.abs(y1 - y0) + 0.015),
        Math.max(0.025, Math.abs(z1 - z0) + 0.015),
        VOXEL_PALETTE.CREAM,
      ]);
    }
    return buildBoxGeometry(boxes);
  }, [mooredPoint, bx, bz, bRotY]);

  const boatGeo = useMemo(() => buildBoxGeometry(STATION_BOAT_BOXES), []);

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
        default:
          boxes = [];
      }
      map.set(el.id, buildBoxGeometry(boxes));
    }
    return map;
  }, [buildingElements, isNight]);

  const vaneGeo = useMemo(() => buildBoxGeometry(WIND_VANE_BOXES), []);
  const cupsGeo = useMemo(() => buildBoxGeometry(WIND_CUPS_BOXES), []);

  const flagGeos = useMemo(() => FLAG_SEGMENT_BOXES.map((boxes) => buildBoxGeometry(boxes)), []);
  const flagJointRefs = useRef<(Group | null)[]>([]);

  useEffect(() => {
    return () => {
      for (const geo of geometries.values()) {
        geo.dispose();
      }
      vaneGeo.dispose();
      cupsGeo.dispose();
      for (const g of flagGeos) g.dispose();
      boatBeachRest.chockGeo.dispose();
      bollardGeo.dispose();
      mooringLineGeo.dispose();
      boatGeo.dispose();
    };
  }, [geometries, vaneGeo, cupsGeo, flagGeos, boatBeachRest, bollardGeo, mooringLineGeo, boatGeo]);

  useLayoutEffect(() => {
    if (reduced) waveFlag(flagJointRefs.current, 0, windKmh);
    if (vaneRef.current) {
      vaneRef.current.rotation.y = (-windDirDeg * Math.PI) / 180;
    }
    if (boatRef.current) {
      if (isFrozen) {
        boatRef.current.position.set(boatBeachRest.x, boatBeachRest.chockTopY, boatBeachRest.z);
        boatRef.current.rotation.set(0, bRotY, 0);
      } else {
        boatRef.current.position.set(mooredPoint[0], mooredPoint[1], mooredPoint[2]);
        boatRef.current.rotation.set(0, bRotY, 0);
      }
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
  }, [buildings, windKmh, windDirDeg, reduced, invalidate, isFrozen, bx, bz, bRotY, boatBeachRest, mooredPoint, buildingElements]);

  useFrame(({ clock }, delta) => {
    if (!reduced) {
      waveFlag(flagJointRefs.current, clock.getElapsedTime(), windKmh);
      if (cupsRef.current) {
        const spinRate = 0.6 + (windKmh / 15) * 3.2;
        cupsRef.current.rotation.y += delta * spinRate;
      }
      if (!isFrozen && boatRef.current) {
        const t = clock.getElapsedTime();
        const swell = Math.min(1.0, Math.max(0.12, windKmh / 35));
        const bob = Math.sin(t * 1.8) * 0.032 * swell;
        const roll = Math.cos(t * 1.4) * 0.055 * swell;
        const pitch = Math.sin(t * 1.1 + 0.4) * 0.024 * swell;
        boatRef.current.position.set(mooredPoint[0], mooredPoint[1] + bob, mooredPoint[2]);
        boatRef.current.rotation.set(pitch, bRotY, roll);
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

    if (moving) invalidate();
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
            </group>
          </group>
        );
      })}

      {/* Whaleboat: pulled up on chocks when frozen, moored off beach when open */}
      <mesh geometry={bollardGeo} material={vehicleMaterial} />
      {!isFrozen && <mesh geometry={mooringLineGeo} material={vehicleMaterial} />}
      {isFrozen && <mesh geometry={boatBeachRest.chockGeo} material={vehicleMaterial} />}
      <group
        ref={boatRef}
        position={isFrozen ? [boatBeachRest.x, boatBeachRest.chockTopY, boatBeachRest.z] : [mooredPoint[0], mooredPoint[1], mooredPoint[2]]}
        rotation={[0, bRotY, 0]}
      >
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
      {showPenguins && <PenguinColony reduced={reduced} />}

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
  overlayRef,
  onReady,
}: {
  focus: HotspotId | null;
  reduced: boolean;
  panelExpanded?: boolean;
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
    const entry = poseForHotspot(null, mobile, Boolean(panelExpanded), landscape);
    cc.maxDistance =
      Math.hypot(
        entry.pos[0] - entry.target[0],
        entry.pos[1] - entry.target[1],
        entry.pos[2] - entry.target[2]
      ) * VIEW_MAX_ZOOM_OUT;
    cc.smoothTime = 0.32;
    cc.setBoundary(new Box3(new Vector3(-20, -1, -14), new Vector3(20, 24, 60)));

    const pose = poseForHotspot(focus, mobile, Boolean(panelExpanded), landscape);
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
  }, [focus, mobile, landscape, reduced, panelExpanded, invalidate]);

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
    const panelRect = document.querySelector('.orc-panel')?.getBoundingClientRect();
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
  panelExpanded,
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
          far: 400,
          position: [20, 9, 26],
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
          overlayRef={overlayRef}
          onReady={onReady}
        />
      </Canvas>
    </div>
  );
});
