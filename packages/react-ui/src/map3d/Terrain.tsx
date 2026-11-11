import { useEffect, useMemo, useState } from 'react';
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  NoColorSpace,
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
  TERRAIN_BOX,
  CONTOUR_M,
  VERTICAL_EXAGGERATION,
  sunDirection,
  worldHeight,
  loadTerrainMesh,
  type TerrainMesh,
  MAP_RASTER_3D,
} from '@antartida/core';
import relief4096Url from '@antartida/core/assets/terrain-relief-4096.webp';
import relief2048Url from '@antartida/core/assets/terrain-relief-2048.webp';
import paper512Url from '@antartida/core/assets/paper-512.webp';
import light2048Url from '@antartida/core/assets/terrain-light-2048.webp';
import {
  paintedTerrainFragmentShader,
  paintedTerrainVertexShader,
} from './paintedTerrain.glsl.ts';
import { FOG_COLOR_HEX } from './fog.glsl.ts';

export function Terrain({ wide }: { wide: boolean }) {
  const [meshData, setMeshData] = useState<TerrainMesh | null>(null);
  const [textures, setTextures] = useState<{
    paint: Texture;
    relief: Texture;
    light: Texture;
    paper: Texture;
  } | null>(null);

  useEffect(() => {
    let alive = true;
    loadTerrainMesh(wide ? 'hi' : 'lo').then((m) => {
      if (alive) setMeshData(m);
    });
    return () => {
      alive = false;
    };
  }, [wide]);

  useEffect(() => {
    let alive = true;
    const loader = new TextureLoader();

    const paintUrl = wide ? MAP_RASTER_3D.hi : MAP_RASTER_3D.mid;
    const reliefUrl = wide ? relief4096Url : relief2048Url;

    Promise.all([
      loader.loadAsync(paintUrl),
      loader.loadAsync(reliefUrl),
      loader.loadAsync(paper512Url),
      loader.loadAsync(light2048Url),
    ]).then(([paint, relief, paper, light]) => {
      if (!alive) return;
      paint.colorSpace = SRGBColorSpace;
      paint.flipY = false;

      relief.colorSpace = NoColorSpace;
      relief.flipY = false;

      // R = ambient occlusion, G = sun shadow: data, not color.
      light.colorSpace = NoColorSpace;
      light.flipY = false;

      paper.colorSpace = SRGBColorSpace;
      paper.wrapS = RepeatWrapping;
      paper.wrapT = RepeatWrapping;
      setTextures({ paint, relief, light, paper });
    });
  }, [wide]);

  const geometry = useMemo(() => {
    if (!meshData) return null;
    const geo = new BufferGeometry();

    const n = meshData.numVerts;
    const positions = new Float32Array(n * 3);
    const heights = new Float32Array(n);
    const masks = new Float32Array(n);

    const spanX = meshData.maxX - meshData.minX;
    const spanY = meshData.maxY - meshData.minY;
    const gSize = meshData.gridSize - 1;

    for (let i = 0; i < n; i++) {
      const vx = meshData.coordsXY[i * 2];
      const vy = meshData.coordsXY[i * 2 + 1];

      // Map coordinates (x in 0..1000, z in 0..1000)
      const mapX = meshData.minX + (vx / gSize) * spanX;
      const mapY = meshData.minY + (vy / gSize) * spanY;
      const elev = meshData.heights[i];
      const worldY = worldHeight(elev);

      positions[i * 3] = mapX - 500;
      positions[i * 3 + 1] = worldY;
      positions[i * 3 + 2] = mapY - 500;

      heights[i] = elev;
      masks[i] = meshData.masks[i];
    }

    geo.setAttribute('position', new BufferAttribute(positions, 3));
    geo.setAttribute('aHeight', new BufferAttribute(heights, 1));
    geo.setAttribute('aMask', new BufferAttribute(masks, 1));
    geo.setIndex(new BufferAttribute(meshData.indices, 1));
    geo.computeVertexNormals();
    geo.computeBoundingBox();
    geo.computeBoundingSphere();

    return geo;
  }, [meshData]);

  const material = useMemo(() => {
    if (!textures) return null;
    return new ShaderMaterial({
      vertexShader: paintedTerrainVertexShader,
      fragmentShader: paintedTerrainFragmentShader,
      uniforms: {
        uBounds: {
          value: new Vector4(
            TERRAIN_BOX.minX,
            TERRAIN_BOX.maxX,
            TERRAIN_BOX.minY,
            TERRAIN_BOX.maxY
          ),
        },
        uVerticalExaggeration: { value: VERTICAL_EXAGGERATION },
        uPaintTex: { value: textures.paint },
        uReliefTex: { value: textures.relief },
        uLightTex: { value: textures.light },
        uSunDir: { value: new Vector3(...sunDirection()) },
        uContour: { value: CONTOUR_M },
        uPaperTex: { value: textures.paper },
        uFogColor: { value: new Color(FOG_COLOR_HEX) },
        uFogDensity: { value: 0.35 },
        uScreenSize: { value: new Vector2(window.innerWidth, window.innerHeight) },
      },
    });
  }, [textures]);

  if (!geometry || !material) return null;

  return <mesh geometry={geometry} material={material} />;
}
