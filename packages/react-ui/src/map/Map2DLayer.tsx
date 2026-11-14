import { useEffect, useState } from 'react';
import {
  MAP_PLACEHOLDER,
  MAP_RASTER,
  MAP_RASTER_BOX,
  layerTransform,
  loadHiResWhenIdle,
  loadMapInk,
  type Geometry,
  type Marker,
  type View,
} from '@antartida/core';
import { Markers, type MarkerPick } from './Markers.tsx';
import { MalvinasFlag2D } from './MalvinasFlag2D.tsx';
import type { Anim, Phase } from './MapView.tsx';

export interface LayerProps {
  geo: Geometry;
  view: View;
  anim: Anim;
  phase: Phase;
  markers: Marker[];
  /** Key of the marker whose label is in view after a first press. */
  shown: string | null;
  onPick: MarkerPick;
}

const LAYER_TRANSITION: Record<Anim, string> = {
  '': 'none',
  zoom: 'transform .45s cubic-bezier(.3,.6,.3,1)',
  wheel: 'transform .18s cubic-bezier(.2,.7,.3,1)',
  dive: 'transform 1.5s cubic-bezier(.55,0,.3,1)',
};

export function Map2DLayer({ geo, view, anim, phase, markers, shown, onPick }: LayerProps) {
  const [ink, setInk] = useState('');
  const [src, setSrc] = useState(MAP_RASTER.base);
  const [painted, setPainted] = useState(false);

  useEffect(() => {
    let alive = true;
    loadMapInk().then((html) => alive && setInk(html));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => (painted ? loadHiResWhenIdle(setSrc) : undefined), [painted]);

  return (
    <>
      <div
        className="layer"
        style={{
          width: geo.S,
          height: geo.S,
          transform: layerTransform(geo, view),
          transition: LAYER_TRANSITION[anim],
        }}
      >
        {!painted && (
          <svg
            viewBox="0 0 1000 1000"
            style={{ position: 'absolute' }}
            aria-hidden="true"
            focusable="false"
            dangerouslySetInnerHTML={{ __html: MAP_PLACEHOLDER }}
          />
        )}
        <img
          className="paint"
          src={src}
          alt=""
          draggable={false}
          decoding="async"
          fetchPriority="high"
          style={MAP_RASTER_BOX}
          onLoad={() => setPainted(true)}
        />
        <svg
          viewBox="0 0 1000 1000"
          aria-hidden="true"
          focusable="false"
          dangerouslySetInnerHTML={{ __html: ink }}
        />
      </div>
      <MalvinasFlag2D geo={geo} view={view} transition={LAYER_TRANSITION[anim]} />
      <Markers
        markers={markers}
        className={
          'ov' +
          (anim === 'zoom' ? ' zooming' : anim === 'wheel' ? ' wheeling' : '') +
          (phase === 'dive' ? ' hide' : '')
        }
        shown={shown}
        onPick={onPick}
      />
    </>
  );
}
