import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  Color,
  Mesh,
  NoColorSpace,
  PlaneGeometry,
  RepeatWrapping,
  ShaderMaterial,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  Vector2,
  Vector3,
  Vector4,
} from 'three';
import {
  DEPTH_ABSORB,
  DRAKE_STORM,
  MAX_WHALE_RIPPLES,
  OCEAN_SIZE,
  WORLD_FADE_END,
  WORLD_FADE_START,
  computeWhaleRipples,
  sunDirection,
  type SeaLifeInstance,
} from '@antartida/core';
import oceanBathy2048Url from '@antartida/core/assets/ocean-bathy-2048.webp';
import oceanBathy1024Url from '@antartida/core/assets/ocean-bathy-1024.webp';
import oceanWavesAUrl from '@antartida/core/assets/ocean-waves-a-256.webp';
import oceanWavesBUrl from '@antartida/core/assets/ocean-waves-b-256.webp';
import paper512Url from '@antartida/core/assets/paper-512.webp';
import { oceanFragmentShader, oceanVertexShader } from './ocean.glsl.ts';
import { FOG_COLOR_HEX } from './fog.glsl.ts';
import { useSeaTime, type SeaTimeUniform } from './useAnimationClock.ts';

interface OceanTextures {
  bathy: Texture;
  paper: Texture;
  waveA: Texture;
  waveB: Texture;
}

const EMPTY_INSTANCES: readonly SeaLifeInstance[] = [];

export function Ocean({
  wide = true,
  timeUniform,
  instances = EMPTY_INSTANCES,
}: {
  wide?: boolean;
  timeUniform?: SeaTimeUniform;
  instances?: readonly SeaLifeInstance[];
}) {
  const meshRef = useRef<Mesh>(null);
  const invalidate = useThree((s) => s.invalidate);
  const contextTime = useSeaTime();
  const effectiveTimeUniform = timeUniform || contextTime;
  const [textures, setTextures] = useState<OceanTextures | null>(null);

  useEffect(() => {
    let alive = true;
    const loader = new TextureLoader();
    const bathyUrl = wide ? oceanBathy2048Url : oceanBathy1024Url;

    Promise.all([
      loader.loadAsync(bathyUrl),
      loader.loadAsync(paper512Url),
      loader.loadAsync(oceanWavesAUrl),
      loader.loadAsync(oceanWavesBUrl),
    ]).then(([bathy, paper, waveA, waveB]) => {
      if (!alive) return;
      bathy.colorSpace = NoColorSpace;
      bathy.flipY = false;

      paper.colorSpace = SRGBColorSpace;
      paper.wrapS = RepeatWrapping;
      paper.wrapT = RepeatWrapping;

      waveA.colorSpace = NoColorSpace;
      waveA.wrapS = RepeatWrapping;
      waveA.wrapT = RepeatWrapping;

      waveB.colorSpace = NoColorSpace;
      waveB.wrapS = RepeatWrapping;
      waveB.wrapT = RepeatWrapping;

      setTextures({ bathy, paper, waveA, waveB });
      invalidate();
    });

    return () => {
      alive = false;
    };
  }, [wide, invalidate]);

  const geo = useMemo(() => new PlaneGeometry(OCEAN_SIZE, OCEAN_SIZE, 4, 4), []);

  const whaleInstances = useMemo(
    () =>
      instances
        .filter((inst) => inst.species === 'humpback' || inst.species === 'minke')
        .slice(0, MAX_WHALE_RIPPLES),
    [instances]
  );
  const lastWhaleCyclesRef = useRef<number[]>([]);

  const uniforms = useMemo(() => {
    const initialRipples = Array.from({ length: MAX_WHALE_RIPPLES }, () => new Vector4(0, 0, 0, 0));
    return {
      uBathy: { value: null as Texture | null },
      uPaperTex: { value: null as Texture | null },
      uWaveNormA: { value: null as Texture | null },
      uWaveNormB: { value: null as Texture | null },
      uSunDir: { value: new Vector3(...sunDirection()) },
      uTime: { value: 0 },
      // Per-layer artistic tuning uniforms (in plan order 1..9)
      uAbsorb: { value: DEPTH_ABSORB },
      uShelfShading: { value: 0.82 },
      uWashStrength: { value: 0.68 },
      uWaveStrength: { value: 0.35 },
      uFresnelStrength: { value: 0.22 },
      uSunGlintStrength: { value: 0.22 },
      uInkWavesStrength: { value: 0.75 },
      uIsobarsStrength: { value: 0.88 },
      uFoamStrength: { value: 0.90 },
      uPaperGrainStrength: { value: 0.24 },
      uWhaleRipples: { value: initialRipples },
      uStormBand: { value: new Vector4(DRAKE_STORM.from.x - 500, DRAKE_STORM.from.y - 500, DRAKE_STORM.to.x - 500, DRAKE_STORM.to.y - 500) },
      uStormShape: { value: new Vector2(DRAKE_STORM.radius, DRAKE_STORM.edge) },
      uStormWind: { value: new Vector2(Math.cos(DRAKE_STORM.wind), Math.sin(DRAKE_STORM.wind)) },
      uFadeStart: { value: WORLD_FADE_START },
      uFadeEnd: { value: WORLD_FADE_END },
      uFogColor: { value: new Color(FOG_COLOR_HEX) },
      uFogDensity: { value: 0.35 },
    };
  }, []);

  useEffect(() => {
    if (textures) {
      uniforms.uBathy.value = textures.bathy;
      uniforms.uPaperTex.value = textures.paper;
      uniforms.uWaveNormA.value = textures.waveA;
      uniforms.uWaveNormB.value = textures.waveB;
      invalidate();
    }
  }, [textures, uniforms, invalidate]);

  /**
   * Coast-water seam & z-fighting prevention (Step 9):
   * - Terrain discards ocean border triangles where `vMask < 0.5 && vHeight < 5.0`
   *   (5 m corresponds to worldY = 5 * 50 / 8000 = +0.03125 map units), while valid
   *   coastal land/shelf vertices start at height >= 0 m (worldY >= 0.0).
   * - Placing the ocean plane at `y = -0.05` (-8 m equivalent) keeps it physically
   *   below the 0..5 m coastal transition without any visible vertical gap.
   * - With camera `near = 10` and `far = 20000`, hardware 24-bit depth buffer precision
   *   at oblique distances (1500..3500 units) is ~0.01..0.04 world units. Enabling
   *   `polygonOffset` with `factor = 1, units = 2` biases the ocean depth value away
   *   from the camera by 1 * DZ + 2 * r in screen depth space, eliminating z-fighting
   *   shimmer along shallow coastlines at both close (dist = 150) and far poses.
   */
  const mat = useMemo(() => {
    return new ShaderMaterial({
      vertexShader: oceanVertexShader,
      fragmentShader: oceanFragmentShader,
      uniforms,
      depthWrite: true,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 2,
    });
  }, [uniforms]);

  // Re-center ocean plane under camera target in discrete steps to prevent "swimming"
  const STEP = 50.0;
  const lastCenter = useRef({ x: 0, z: 0 });

  useFrame((state) => {
    const t = effectiveTimeUniform.value;
    uniforms.uTime.value = t;

    // Recompute whale emergence ripple uniforms on CPU ONLY when a whale's cycle index changes
    const prevCycles = lastWhaleCyclesRef.current;
    let cycleChanged = prevCycles.length !== whaleInstances.length;
    if (!cycleChanged) {
      for (let i = 0; i < whaleInstances.length; i++) {
        const w = whaleInstances[i];
        if (Math.floor(t * w.speed + w.phase) !== prevCycles[i]) {
          cycleChanged = true;
          break;
        }
      }
    }
    if (cycleChanged) {
      const nextRipples = computeWhaleRipples(whaleInstances, t);
      lastWhaleCyclesRef.current = nextRipples.map((r) => r.cycleIndex);
      for (let i = 0; i < MAX_WHALE_RIPPLES; i++) {
        const r = nextRipples[i];
        if (r) {
          uniforms.uWhaleRipples.value[i].set(r.worldX, r.worldZ, r.speed, r.phase);
        } else {
          uniforms.uWhaleRipples.value[i].set(0, 0, 0, 0);
        }
      }
    }

    const controls = (state as unknown as { controls?: { target?: Vector3 } }).controls;
    const target = controls?.target;
    if (!target || !meshRef.current) return;

    const snapX = Math.round(target.x / STEP) * STEP;
    const snapZ = Math.round(target.z / STEP) * STEP;

    if (snapX !== lastCenter.current.x || snapZ !== lastCenter.current.z) {
      lastCenter.current.x = snapX;
      lastCenter.current.z = snapZ;
      meshRef.current.position.set(snapX, -0.05, snapZ);
      invalidate();
    }
  });

  return (
    <mesh
      ref={meshRef}
      rotation-x={-Math.PI / 2}
      position={[0, -0.05, 0]}
      geometry={geo}
      material={mat}
    />
  );
}
