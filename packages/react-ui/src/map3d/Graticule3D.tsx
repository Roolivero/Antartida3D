import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import { project, toWorld } from '@antartida/core';

export function Graticule3D() {
  const { parallel60, parallel70, meridians } = useMemo(() => {
    // 60° S parallel circle
    const p60: [number, number, number][] = [];
    const STEPS = 120;
    for (let i = 0; i <= STEPS; i++) {
      const lon = (i / STEPS) * 360 - 180;
      const m = project(lon, -60);
      const w = toWorld(m.x, m.y, 0.05);
      p60.push([w.x, w.y, w.z]);
    }

    // 70° S parallel circle
    const p70: [number, number, number][] = [];
    for (let i = 0; i <= STEPS; i++) {
      const lon = (i / STEPS) * 360 - 180;
      const m = project(lon, -70);
      const w = toWorld(m.x, m.y, 0.05);
      p70.push([w.x, w.y, w.z]);
    }

    // 12 meridians every 30°: from 55° S to 78° S
    // Segments array for Line
    const merid: [number, number, number][] = [];
    for (let lon = -180; lon < 180; lon += 30) {
      const LAT_STEPS = 20;
      for (let s = 0; s < LAT_STEPS; s++) {
        const lat0 = -52 - (s / LAT_STEPS) * 26;
        const lat1 = -52 - ((s + 1) / LAT_STEPS) * 26;
        const m0 = project(lon, lat0);
        const m1 = project(lon, lat1);
        const w0 = toWorld(m0.x, m0.y, 0.05);
        const w1 = toWorld(m1.x, m1.y, 0.05);
        merid.push([w0.x, w0.y, w0.z], [w1.x, w1.y, w1.z]);
      }
    }

    return { parallel60: p60, parallel70: p70, meridians: merid };
  }, []);

  return (
    <group>
      <Line
        points={parallel60}
        color="#1F2A36"
        lineWidth={1.0}
        transparent
        opacity={0.32}
        dashed
        dashScale={0.06}
        dashSize={3}
        gapSize={4}
      />
      <Line
        points={parallel70}
        color="#1F2A36"
        lineWidth={0.9}
        transparent
        opacity={0.24}
        dashed
        dashScale={0.06}
        dashSize={3}
        gapSize={4}
      />
      <Line
        points={meridians}
        color="#1F2A36"
        lineWidth={0.8}
        segments
        transparent
        opacity={0.22}
      />
    </group>
  );
}
