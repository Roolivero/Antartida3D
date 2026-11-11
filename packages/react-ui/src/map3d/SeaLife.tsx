import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
   Color,
  InstancedBufferAttribute,
  InstancedMesh,
  LinearFilter,
  LinearMipmapLinearFilter,
  PlaneGeometry,
  RepeatWrapping,
  ShaderMaterial,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  Vector2,
  Vector4,
} from 'three';
import {
  FOV,
  IRIZAR_ROUTE_POLYLINE,
  IRIZAR_ROUTE_SAMPLES,
  SEA_ATLAS,
  type SeaLifeInstance,
  type SeaSpriteId,
} from '@antartida/core';
import seaAtlasUrl from '@antartida/core/assets/sea-atlas.webp';
import paper512Url from '@antartida/core/assets/paper-512.webp';
import { FOG_COLOR_HEX } from './fog.glsl.ts';
import { seaLifeFragmentShader, seaLifeVertexShader } from './seaLife.glsl.ts';
import { useSeaTime, type SeaTimeUniform } from './useAnimationClock.ts';

const ORDERED_SPRITES: readonly SeaSpriteId[] = [
  'humpback-back',
  'humpback-tail',
  'humpback-spout',
  'orca',
  'minke',
  'penguins-iceberg',
  'leopard-seal',
  'iceberg-lg',
  'iceberg-sm',
  'irizar',
  'irizar-wake',
];

export function SeaLife({
  visible = true,
  timeUniform,
  instances,
}: {
  visible?: boolean;
  timeUniform?: SeaTimeUniform;
  instances: readonly SeaLifeInstance[];
}) {
  const meshRef = useRef<InstancedMesh>(null);
  const invalidate = useThree((s) => s.invalidate);
  const size = useThree((s) => s.size);
  const contextTime = useSeaTime();
  const effectiveTime = timeUniform || contextTime;

  const [textures, setTextures] = useState<{
    atlas: Texture;
    paper: Texture;
  } | null>(null);

  useEffect(() => {
    let alive = true;
    const loader = new TextureLoader();
    Promise.all([loader.loadAsync(seaAtlasUrl), loader.loadAsync(paper512Url)]).then(
      ([atlas, paper]) => {
        if (!alive) return;
        atlas.colorSpace = SRGBColorSpace;
        atlas.flipY = false;
        atlas.minFilter = LinearMipmapLinearFilter;
        atlas.magFilter = LinearFilter;
        atlas.generateMipmaps = true;

        paper.colorSpace = SRGBColorSpace;
        paper.wrapS = RepeatWrapping;
        paper.wrapT = RepeatWrapping;

        setTextures({ atlas, paper });
        invalidate();
      }
    );
    return () => {
      alive = false;
    };
  }, [invalidate]);

  const geometry = useMemo(() => {
    const geo = new PlaneGeometry(1, 1, 1, 1);
    const count = instances.length;

    const centers = new Float32Array(count * 2);
    const sprites = new Float32Array(count);
    const kinds = new Float32Array(count);
    const phases = new Float32Array(count);
    const speeds = new Float32Array(count);
    const radii = new Float32Array(count);
    const scales = new Float32Array(count);
    const seeds = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const inst = instances[i];
      centers[i * 2] = inst.x;
      centers[i * 2 + 1] = inst.y;
      sprites[i] = inst.spriteIndex;
      kinds[i] = inst.kindCode;
      phases[i] = inst.phase;
      speeds[i] = inst.speed;
      radii[i] = inst.radius;
      scales[i] = inst.scale;
      seeds[i] = inst.seed;
    }

    geo.setAttribute('aCenter', new InstancedBufferAttribute(centers, 2));
    geo.setAttribute('aSprite', new InstancedBufferAttribute(sprites, 1));
    geo.setAttribute('aKind', new InstancedBufferAttribute(kinds, 1));
    geo.setAttribute('aPhase', new InstancedBufferAttribute(phases, 1));
    geo.setAttribute('aSpeed', new InstancedBufferAttribute(speeds, 1));
    geo.setAttribute('aRadius', new InstancedBufferAttribute(radii, 1));
    geo.setAttribute('aScale', new InstancedBufferAttribute(scales, 1));
    geo.setAttribute('aSeed', new InstancedBufferAttribute(seeds, 1));

    return geo;
  }, [instances]);

  const uniforms = useMemo(() => {
    const spriteRects = ORDERED_SPRITES.map((id) => {
      const s = SEA_ATLAS.sprites[id];
      return new Vector4(s.u0, s.v0, s.u1, s.v1);
    });
    const spriteAnchors = ORDERED_SPRITES.map((id) => {
      const s = SEA_ATLAS.sprites[id];
      return new Vector2(s.anchorX, s.anchorY);
    });
    const routePoints = IRIZAR_ROUTE_POLYLINE.map((p) => new Vector2(p.x, p.y));

    return {
      uAtlas: { value: null as Texture | null },
      uPaperTex: { value: null as Texture | null },
      uTime: { value: 0 },
      uViewportHeight: { value: 900 },
      uFovTan: { value: Math.tan((FOV * Math.PI) / 360) },
      uRoutePoints: { value: routePoints },
      uSpriteRects: { value: spriteRects },
      uSpriteAnchors: { value: spriteAnchors },
      uFogColor: { value: new Color(FOG_COLOR_HEX) },
      uFogDensity: { value: 0.35 },
    };
  }, []);

  useEffect(() => {
    if (textures) {
      uniforms.uAtlas.value = textures.atlas;
      uniforms.uPaperTex.value = textures.paper;
      invalidate();
    }
  }, [textures, uniforms, invalidate]);

  const material = useMemo(() => {
    return new ShaderMaterial({
      defines: { ROUTE_SAMPLES: IRIZAR_ROUTE_SAMPLES },
      vertexShader: seaLifeVertexShader,
      fragmentShader: seaLifeFragmentShader,
      uniforms,
      depthWrite: true,
      depthTest: true,
      transparent: true,
    });
  }, [uniforms]);

  useFrame(() => {
    uniforms.uTime.value = effectiveTime.value;
    uniforms.uViewportHeight.value = size.height;
  });

  if (!textures || !visible || instances.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, instances.length]}
      frustumCulled={false}
    />
  );
}
