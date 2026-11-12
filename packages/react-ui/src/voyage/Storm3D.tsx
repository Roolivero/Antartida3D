import { useEffect, useMemo, useRef } from 'react';
import { BoxGeometry, MeshBasicMaterial, Object3D, type Group, type InstancedMesh, type Mesh } from 'three';
import { useFrame } from '@react-three/fiber';
import { DRAKE_STORM, MODEL_MIN_PX, createSeededRng, screenPx } from '@antartida/core';
import { useSeaTime } from '../map3d/useAnimationClock.ts';
import { buildBoxGeometry, type Box } from './vehicles.ts';

// Approximate colors of a storm front. An effect, not a model: an illustration of the fame of the Drake.
const CLOUD_DARK = 0x47525d;
const CLOUD_GREY = 0x66727d;
const CLOUD_LIGHT = 0x8b97a1;
const RAIN = 0xb9cbd6;
const FOAM = 0xf7fafb;
const BOLT = 0xfff3b0;

const { radius: RADIUS, cloudBase: CLOUD_BASE } = DRAKE_STORM;
const CLOUDS = 22;
/** Clouds the two bolts fall from. */
const BOLT_CLOUDS = [5, 8];
const STREAKS = 300;
const WHITECAPS = 240;
const GUSTS = 34;
/** Boxes of one gust of wind: a thin ribbon that bends as it goes. */
const GUST_LINKS = 9;
/** Seconds a streak of rain takes to fall. */
const FALL_SECONDS = 1.1;
/** Seconds a gust takes to cross its stretch of sea: slow, so the ribbons glide. */
const GUST_SECONDS = 7;
/** Seconds between the flashes of one bolt. */
const BOLT_SECONDS = 5.5;
/** Part of that time the bolt is lit: two quick flashes. */
const BOLT_FLASHES: readonly (readonly [number, number])[] = [[0, 0.03], [0.055, 0.075]];
/**
 * Rain, whitecaps and gusts are sized for the camera of the trip, about this high over the sea.
 * Higher they grow with the camera, up to DETAIL_MAX times, so they still show from farther away.
 */
const DETAIL_HEIGHT = 9;
const DETAIL_MAX = 6;
/** Rain, whitecaps and gusts are not drawn when a streak of rain is shorter than this on screen: from afar only the clouds show. */
const DETAIL_MIN_PX = 5;
/** World length of a streak of rain at the camera of the trip. */
const STREAK_LENGTH = 0.5;

/** One cloud, one unit wide, its base at y = 0. */
const CLOUD: readonly (readonly [number, number, number, number, number, number, number])[] = [
  [0, 0.08, 0, 1, 0.16, 0.62, CLOUD_DARK],
  [-0.12, 0.22, 0.03, 0.7, 0.14, 0.46, CLOUD_GREY],
  [0.1, 0.33, -0.03, 0.4, 0.1, 0.3, CLOUD_LIGHT],
  [0.42, 0.11, 0.2, 0.35, 0.12, 0.3, CLOUD_GREY],
  [-0.45, 0.09, -0.2, 0.3, 0.1, 0.28, CLOUD_DARK],
];

/** A zigzag from the cloud base (y = 1) down to the sea. */
const BOLT_BOXES: readonly Box[] = [
  [0, 0.87, 0, 0.025, 0.27, 0.025, BOLT],
  [0.08, 0.66, 0, 0.185, 0.025, 0.025, BOLT],
  [0.16, 0.47, 0, 0.025, 0.36, 0.025, BOLT],
  [0.09, 0.3, 0, 0.165, 0.025, 0.025, BOLT],
  [0.02, 0.15, 0, 0.025, 0.3, 0.025, BOLT],
];

interface Layout {
  /** Every cloud of the bank, in the frame of the storm: +x downwind. */
  clouds: Box[];
  /** [x, z, height] of the base of the clouds the bolts fall from. */
  bolts: (readonly [number, number, number])[];
  /** [x, z, phase] of each streak of rain. */
  streaks: (readonly [number, number, number])[];
  /** [x, z, length, phase] of each whitecap. */
  caps: (readonly [number, number, number, number])[];
  /** [x, z, height, phase] of each gust of wind. */
  gusts: (readonly [number, number, number, number])[];
}

/** Same storm on every visit: the layout comes from a fixed seed. */
function layOut(): Layout {
  const rng = createSeededRng(58);
  const inDisc = (reach = RADIUS) => {
    const [r, a] = [Math.sqrt(rng()) * reach, rng() * Math.PI * 2];
    return [Math.cos(a) * r, Math.sin(a) * r] as const;
  };
  // One bank of clouds over the whole storm, at three heights so they overlap without flickering.
  const spots = Array.from({ length: CLOUDS }, (_, i) => [...inDisc(RADIUS - 4), 9 + rng() * 5, CLOUD_BASE + (i % 3) * 0.9] as const);
  return {
    clouds: spots.flatMap(([x, z, width, base]) =>
      CLOUD.map(([cx, cy, cz, sx, sy, sz, color]): Box => [x + cx * width, base + cy * width, z + cz * width, sx * width, sy * width, sz * width, color])),
    bolts: BOLT_CLOUDS.map((i) => [spots[i][0], spots[i][1], spots[i][3]] as const),
    streaks: Array.from({ length: STREAKS }, () => [...inDisc(), rng()] as const),
    caps: Array.from({ length: WHITECAPS }, () => [...inDisc(), 0.25 + rng() * 0.35, rng() * Math.PI * 2] as const),
    gusts: Array.from({ length: GUSTS }, () => [...inDisc(RADIUS - 2), 0.35 + rng() * 1.3, rng()] as const),
  };
}

const cloudMaterial = new MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.88, depthWrite: false });
const boltMaterial = new MeshBasicMaterial({ vertexColors: true });
const rainMaterial = new MeshBasicMaterial({ color: RAIN, transparent: true, opacity: 0.7, depthWrite: false });
const foamMaterial = new MeshBasicMaterial({ color: FOAM, transparent: true, opacity: 0.85 });
const gustMaterial = new MeshBasicMaterial({ color: FOAM, transparent: true, opacity: 0.6, depthWrite: false });
const unitBox = new BoxGeometry(1, 1, 1);

/**
 * The storm over the Drake Passage: clouds, rain, lightning, whitecaps and gusts of wind, on the
 * open map and during the trip. Made of boxes like every effect. An illustration, not weather data.
 */
export function Storm3D({ reduced }: { reduced: boolean }) {
  const group = useRef<Group>(null);
  const clouds = useRef<Mesh>(null);
  const details = useRef<Group>(null);
  const rain = useRef<InstancedMesh>(null);
  const foam = useRef<InstancedMesh>(null);
  const wind = useRef<InstancedMesh>(null);
  const bolts = useRef<(Mesh | null)[]>([]);
  const seaTime = useSeaTime();
  const layout = useMemo(layOut, []);
  const cloudGeometry = useMemo(() => buildBoxGeometry(layout.clouds), [layout]);
  const boltGeometry = useMemo(() => buildBoxGeometry(BOLT_BOXES), []);
  useEffect(() => () => {
    cloudGeometry.dispose();
    boltGeometry.dispose();
  }, [cloudGeometry, boltGeometry]);
  const dummy = useMemo(() => new Object3D(), []);

  // Time comes from the clock of the sea, which already asks for frames and stands still with reduced motion.
  useFrame(({ camera, size }) => {
    const g = group.current;
    if (!g) return;
    const distance = Math.hypot(camera.position.x - g.position.x, camera.position.y, camera.position.z - g.position.z);
    g.visible = screenPx(2 * RADIUS, distance, size.height) >= MODEL_MIN_PX;
    if (!g.visible) return;
    const time = seaTime.value;
    const detail = Math.min(DETAIL_MAX, Math.max(1, camera.position.y / DETAIL_HEIGHT));

    // The bank heaves slowly, downwind and back.
    clouds.current?.position.set(Math.sin(time * 0.12) * 0.8, Math.sin(time * 0.3) * 0.15, 0);

    bolts.current.forEach((bolt, i) => {
      if (!bolt) return;
      const beat = (time / BOLT_SECONDS + i * 0.43) % 1;
      // No flashes with reduced motion.
      bolt.visible = !reduced && BOLT_FLASHES.some(([from, to]) => beat >= from && beat < to);
    });

    const fine = details.current;
    if (!fine) return;
    fine.visible = screenPx(STREAK_LENGTH * detail, distance, size.height) >= DETAIL_MIN_PX;
    if (!fine.visible) return;

    if (rain.current) {
      const top = Math.min(CLOUD_BASE, 5 * detail);
      layout.streaks.forEach(([x, z, phase], i) => {
        const fall = (time / FALL_SECONDS + phase) % 1;
        // Slanted by the wind: it drifts downwind while it falls.
        dummy.position.set(x + fall * 0.6 * detail, top * (1 - fall * 0.95), z);
        dummy.rotation.set(0, 0, 0.3);
        dummy.scale.set(0.03 * detail, STREAK_LENGTH * detail, 0.03 * detail);
        dummy.updateMatrix();
        rain.current!.setMatrixAt(i, dummy.matrix);
      });
      rain.current.instanceMatrix.needsUpdate = true;
    }

    if (foam.current) {
      layout.caps.forEach(([x, z, length, phase], i) => {
        // Each crest swells, runs downwind and breaks; it is gone for the other half of its beat.
        const swell = Math.max(0, Math.sin(time * 0.9 + phase));
        dummy.position.set(x + swell * 0.3 * detail, 0.03 + 0.02 * detail, z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(0.09 * swell * detail, 0.04 * detail, length * swell * detail);
        dummy.updateMatrix();
        foam.current!.setMatrixAt(i, dummy.matrix);
      });
      foam.current.instanceMatrix.needsUpdate = true;
    }

    if (wind.current) {
      const link = 0.24 * detail;
      layout.gusts.forEach(([x, z, height, phase], i) => {
        const life = (time / GUST_SECONDS + phase) % 1;
        // It grows out of nothing, glides and thins away: no ribbon pops in or out.
        const strength = Math.sin(Math.PI * life) ** 2;
        const head = x + (life - 0.5) * 7 * detail;
        for (let k = 0; k < GUST_LINKS; k++) {
          const along = head - k * link;
          // A slow wave runs along the ribbon; each link follows its slope.
          const wave = along * 0.9 / detail + phase * 20 + time * 0.5;
          dummy.position.set(along, (height + Math.sin(wave) * 0.2) * detail, z);
          dummy.rotation.set(0, 0, Math.atan(Math.cos(wave) * 0.2 * 0.9));
          // Thinner towards the tail.
          dummy.scale.set(link * 1.04, 0.035 * detail * strength * (1 - k / GUST_LINKS), 0.035 * detail);
          dummy.updateMatrix();
          wind.current!.setMatrixAt(i * GUST_LINKS + k, dummy.matrix);
        }
      });
      wind.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    // +x of the storm points downwind, like the bow of a vehicle points ahead.
    <group ref={group} position={[DRAKE_STORM.x - 500, 0, DRAKE_STORM.y - 500]} rotation-y={-DRAKE_STORM.wind}>
      <mesh ref={clouds} geometry={cloudGeometry} material={cloudMaterial} />
      {layout.bolts.map(([x, z, base], i) => (
        <mesh key={i} ref={(m) => void (bolts.current[i] = m)} position={[x, 0, z]} scale={base} geometry={boltGeometry} material={boltMaterial} visible={false} />
      ))}
      <group ref={details}>
        <instancedMesh ref={rain} args={[unitBox, rainMaterial, STREAKS]} frustumCulled={false} />
        <instancedMesh ref={foam} args={[unitBox, foamMaterial, WHITECAPS]} frustumCulled={false} />
        <instancedMesh ref={wind} args={[unitBox, gustMaterial, GUSTS * GUST_LINKS]} frustumCulled={false} />
      </group>
    </group>
  );
}
