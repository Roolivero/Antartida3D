import { useEffect, useMemo, useState } from 'react';
import { useThree } from '@react-three/fiber';
import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  PlaneGeometry,
  SRGBColorSpace,
  Texture,
  TextureLoader,
} from 'three';
import {
  ANTARCTICA_PATH,
  ICE_SHELVES_PATH,
  MAP_RASTER_3D,
  MAP_RASTER_SPAN,
  worldHeight,
  heightAt,
  isAntimeridianSeam,
} from '@antartida/core';

function buildWallGeometry(): BufferGeometry {
  const geo = new BufferGeometry();
  const positions: number[] = [];

  const addPathWalls = (svgPath: string) => {
    const subpathRegex = /M\s*([-\d.]+)[,\s]+([-\d.]+)([^MZz]*)([Zz]?)/g;
    let match: RegExpExecArray | null;

    while ((match = subpathRegex.exec(svgPath)) !== null) {
      const startX = parseFloat(match[1]);
      const startY = parseFloat(match[2]);
      const body = match[3];
      const closed = Boolean(match[4]);

      const coordRegex = /([-\d.]+)[,\s]+([-\d.]+)/g;
      let prevX = startX;
      let prevY = startY;
      let cMatch: RegExpExecArray | null;

      const addSegment = (x0: number, y0: number, x1: number, y1: number) => {
        if (isAntimeridianSeam(x0, y0, x1, y1)) return;
        const h0 = worldHeight(heightAt(x0, y0));
        const h1 = worldHeight(heightAt(x1, y1));
        if (h0 < 0.02 && h1 < 0.02) return;

        const p0x = x0 - 500, p0z = y0 - 500;
        const p1x = x1 - 500, p1z = y1 - 500;

        // Quad: v0=(p0x, h0, p0z), v1=(p1x, h1, p1z), v2=(p1x, 0, p1z), v3=(p0x, 0, p0z)
        // Triangle 1: v0, v1, v2
        positions.push(p0x, h0, p0z, p1x, h1, p1z, p1x, 0, p1z);
        // Triangle 2: v0, v2, v3
        positions.push(p0x, h0, p0z, p1x, 0, p1z, p0x, 0, p0z);
      };

      while ((cMatch = coordRegex.exec(body)) !== null) {
        const currX = parseFloat(cMatch[1]);
        const currY = parseFloat(cMatch[2]);
        addSegment(prevX, prevY, currX, currY);
        prevX = currX;
        prevY = currY;
      }

      if (closed && (prevX !== startX || prevY !== startY)) {
        addSegment(prevX, prevY, startX, startY);
      }
    }
  };

  addPathWalls(ANTARCTICA_PATH);
  addPathWalls(ICE_SHELVES_PATH);

  geo.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geo.computeVertexNormals();
  return geo;
}

export function OceanBlock({ wide = true }: { wide?: boolean }) {
  const [paintTex, setPaintTex] = useState<Texture | null>(null);
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    let alive = true;
    const url = wide ? MAP_RASTER_3D.hi : MAP_RASTER_3D.mid;
    new TextureLoader().loadAsync(url).then((tex) => {
      if (!alive) return;
      tex.colorSpace = SRGBColorSpace;
      setPaintTex(tex);
      invalidate();
    });
    return () => {
      alive = false;
    };
  }, [wide, invalidate]);

  const planeGeo = useMemo(() => new PlaneGeometry(MAP_RASTER_SPAN, MAP_RASTER_SPAN), []);
  const wallGeo = useMemo(() => buildWallGeometry(), []);

  return (
    <group>
      {/* Ocean plane at y = 0 */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.05, 0]} geometry={planeGeo}>
        <meshBasicMaterial
          key={paintTex ? 'tex' : 'color'}
          color={paintTex ? '#ffffff' : '#3F6F94'}
          map={paintTex ?? undefined}
          // The baked watercolor has transparent corners; without blending they render black.
          transparent
          depthWrite={false}
          side={DoubleSide}
        />
      </mesh>

      {/* Coastal and shelf drop walls in --deep */}
      <mesh geometry={wallGeo}>
        <meshBasicMaterial color="#1E3E5C" side={DoubleSide} />
      </mesh>
    </group>
  );
}
