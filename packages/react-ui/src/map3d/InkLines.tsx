import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import {
  ANTARCTICA_PATH,
  ICE_SHELVES_PATH,
  heightAt,
  isAntimeridianSeam,
  worldHeight,
} from '@antartida/core';

function pathToSegments(svgPath: string): [number, number, number][] {
  const points: [number, number, number][] = [];
  const subpathRegex = /M\s*([-\d.]+)[,\s]+([-\d.]+)([^MZz]*)([Zz]?)/g;
  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = subpathRegex.exec(svgPath)) !== null) {
    const startX = parseFloat(match[1]);
    const startY = parseFloat(match[2]);
    const body = match[3];
    const closed = Boolean(match[4]);

    const toWorldPt = (x: number, y: number, index: number): [number, number, number] => {
      const elev = heightAt(x, y);
      const h = worldHeight(elev) + 0.4;
      const jitter = Math.sin(index * 12.9898) * 0.3;
      return [x - 500 + jitter, h, y - 500 + jitter];
    };

    const coordRegex = /([-\d.]+)[,\s]+([-\d.]+)/g;
    let prevX = startX;
    let prevY = startY;
    let cMatch: RegExpExecArray | null;

    while ((cMatch = coordRegex.exec(body)) !== null) {
      const currX = parseFloat(cMatch[1]);
      const currY = parseFloat(cMatch[2]);
      if (!isAntimeridianSeam(prevX, prevY, currX, currY)) {
        points.push(toWorldPt(prevX, prevY, idx++), toWorldPt(currX, currY, idx++));
      }
      prevX = currX;
      prevY = currY;
    }

    if (closed && (prevX !== startX || prevY !== startY) && !isAntimeridianSeam(prevX, prevY, startX, startY)) {
      const ptA = toWorldPt(prevX, prevY, idx++);
      const ptB = toWorldPt(startX, startY, idx++);
      points.push(ptA, ptB);
    }
  }

  return points;
}

export function InkLines() {
  const coastPoints = useMemo(() => pathToSegments(ANTARCTICA_PATH), []);
  const shelvesPoints = useMemo(() => pathToSegments(ICE_SHELVES_PATH), []);

  return (
    <group>
      {coastPoints.length > 1 && (
        <Line
          points={coastPoints}
          color="#1F2A36"
          lineWidth={1.6}
          segments
        />
      )}
      {shelvesPoints.length > 1 && (
        <Line
          points={shelvesPoints}
          color="#28507A"
          lineWidth={1.2}
          segments
        />
      )}
    </group>
  );
}
