import { useEffect, useMemo } from 'react';
import {
  ClampToEdgeWrapping,
  Color,
  DoubleSide,
  LinearFilter,
  LinearMipmapLinearFilter,
  RepeatWrapping,
  ShaderMaterial,
  Shape,
  ShapeGeometry,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  Vector2,
} from 'three';
import { useThree } from '@react-three/fiber';
import {
  FAR_LAND_COLOR_HEX,
  SOUTHERN_LANDS,
  SOUTHERN_LANDS_TEXTURE_BOX,
  WORLD_FADE_END,
  WORLD_FADE_START,
} from '@antartida/core';
import landColorUrl from '@antartida/core/assets/southern-lands-color.webp';
import worldColorUrl from '@antartida/core/assets/world-lands-color.webp';
import paper512Url from '@antartida/core/assets/paper-512.webp';
import {
  southernLandsFragmentShader,
  southernLandsVertexShader,
} from './southernLands.glsl.ts';

/** Uniforms read by farLandChunk; uFarLandTex is filled once loadFarLandTexture resolves. */
export function farLandUniforms() {
  const b = SOUTHERN_LANDS_TEXTURE_BOX;
  return {
    uFarLandTex: { value: null as Texture | null },
    uHasFarLand: { value: 0 },
    uFarLandBoxMin: { value: new Vector2(b.minX - 500, b.minY - 500) },
    uFarLandBoxSize: { value: new Vector2(b.maxX - b.minX, b.maxY - b.minY) },
  };
}

/** Loads one of the Natural Earth II color textures of the lands outside Antarctica. */
function loadLandColor(url: string): Promise<Texture> {
  return new TextureLoader().loadAsync(url).then((t) => {
    t.colorSpace = SRGBColorSpace;
    t.wrapS = ClampToEdgeWrapping;
    t.wrapT = ClampToEdgeWrapping;
    t.minFilter = LinearMipmapLinearFilter;
    t.magFilter = LinearFilter;
    // Raster row 0 is minY: no flip, so the uv maps directly.
    t.flipY = false;
    return t;
  });
}

/** Loads the Natural Earth II color of the near lands and plugs it into farLandUniforms. */
export function loadFarLandTexture(uniforms: ReturnType<typeof farLandUniforms>): Promise<Texture> {
  return loadLandColor(landColorUrl).then((t) => {
    uniforms.uFarLandTex.value = t;
    uniforms.uHasFarLand.value = 1;
    return t;
  });
}

/**
 * Flat context silhouettes of the world outside Antarctica, up to 60° N (Natural Earth), colored
 * with Natural Earth II. No relief.
 */
export function SouthernLands() {
  const invalidate = useThree((s) => s.invalidate);

  const geometry = useMemo(() => {
    const shapes = SOUTHERN_LANDS.map((ring) => {
      const shape = new Shape();
      shape.moveTo(ring[0] - 500, ring[1] - 500);
      for (let i = 2; i < ring.length; i += 2) {
        shape.lineTo(ring[i] - 500, ring[i + 1] - 500);
      }
      return shape;
    });
    const geo = new ShapeGeometry(shapes);
    geo.rotateX(Math.PI / 2);
    return geo;
  }, []);

  const material = useMemo(() => {
    return new ShaderMaterial({
      transparent: true,
      side: DoubleSide,
      vertexShader: southernLandsVertexShader,
      fragmentShader: southernLandsFragmentShader,
      uniforms: {
        ...farLandUniforms(),
        uPaperTex: { value: null as Texture | null },
        uHasPaper: { value: 0 },
        uLandColor: { value: new Color(FAR_LAND_COLOR_HEX) },
        uFadeStart: { value: WORLD_FADE_START },
        uFadeEnd: { value: WORLD_FADE_END },
        uWorldLandTex: { value: null as Texture | null },
        uHasWorldLand: { value: 0 },
        uNearEdge: { value: (SOUTHERN_LANDS_TEXTURE_BOX.maxX - SOUTHERN_LANDS_TEXTURE_BOX.minX) / 2 },
      },
    });
  }, []);

  useEffect(() => {
    let alive = true;
    const loaded: Texture[] = [];
    const u = material.uniforms as ReturnType<typeof farLandUniforms> & Record<string, { value: unknown }>;
    loadFarLandTexture(u)
      .then((t) => {
        loaded.push(t);
        if (alive) invalidate();
      })
      // Without it the silhouettes keep the flat FAR_LAND_COLOR_HEX tone.
      .catch((e: unknown) => console.warn('Southern lands color unavailable', e));
    loadLandColor(worldColorUrl)
      .then((t) => {
        loaded.push(t);
        material.uniforms.uWorldLandTex.value = t;
        material.uniforms.uHasWorldLand.value = 1;
        if (alive) invalidate();
      })
      .catch((e: unknown) => console.warn('World lands color unavailable', e));
    new TextureLoader()
      .loadAsync(paper512Url)
      .then((t) => {
        loaded.push(t);
        t.colorSpace = SRGBColorSpace;
        t.wrapS = RepeatWrapping;
        t.wrapT = RepeatWrapping;
        material.uniforms.uPaperTex.value = t;
        material.uniforms.uHasPaper.value = 1;
        if (alive) invalidate();
      })
      .catch((e: unknown) => console.warn('Southern lands paper texture unavailable', e));
    return () => {
      alive = false;
      loaded.forEach((t) => t.dispose());
    };
  }, [material, invalidate]);

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  // Drawn before the Fuegia relief: where that relief fades out at the end of its data it must blend
  // over these lands, not over the ocean (that showed as a dark seam at 50° S).
  return <mesh geometry={geometry} material={material} position={[0, -0.02, 0]} renderOrder={-1} />;
}
