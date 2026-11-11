import { memo } from 'react';
import { SCENE_ROCK, SCENE_SEA, SCENE_SKY } from '@antartida/core';
import { SvgHtml } from '../ui.tsx';

/** Parallax backdrop: sky, sea and rock layers move by different amounts. */
export const Scene = memo(function Scene({ nx, ny }: { nx: number; ny: number }) {
  return (
    <div className="scene" aria-hidden="true">
      <div className="pl" style={{ transform: `translate3d(${-nx * 4}px, ${-ny * 3}px, 0)` }}>
        <SvgHtml viewBox="0 0 400 700" preserveAspectRatio="xMidYMid slice" html={SCENE_SKY} />
      </div>
      <div className="pl" style={{ transform: `translate3d(${-nx * 9}px, ${-ny * 5}px, 0)` }}>
        <SvgHtml viewBox="0 0 400 700" preserveAspectRatio="xMidYMid slice" html={SCENE_SEA} />
      </div>
      <div className="pl" style={{ transform: `translate3d(${-nx * 15}px, ${-ny * 7}px, 0)` }}>
        <SvgHtml viewBox="0 0 400 700" preserveAspectRatio="xMidYMax slice" html={SCENE_ROCK} />
      </div>
      <svg className="grain" aria-hidden="true" focusable="false">
        <rect width="100%" height="100%" filter="url(#fibers)" opacity="0.6" />
      </svg>
    </div>
  );
});
