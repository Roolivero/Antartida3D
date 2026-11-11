import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { Box3, Vector3 } from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { CameraControls, PerformanceMonitor } from '@react-three/drei';
import { EffectComposer } from '@react-three/postprocessing';
import {
  homePose3D,
  DIVE_3D,
  toWorld,
  project,
  heightAt,
  worldHeight,
  type Geometry,
  type Marker,
  type Size,
  type View,
} from '@antartida/core';
import { MarkerButton } from '../map/Markers.tsx';
import { useReducedMotion } from '../hooks.ts';
import type { Anim, Phase } from '../map/MapView.tsx';
import { Ocean } from './Ocean.tsx';
import { Terrain } from './Terrain.tsx';
import { InkLines } from './InkLines.tsx';
import { Graticule3D } from './Graticule3D.tsx';
import { InkEffect } from './InkEffect.ts';
import { SeaTimeContext, useAnimationClock } from './useAnimationClock.ts';

function SceneContent({
  wide,
  lowQuality,
  phase,
  reduced,
  size,
  geo,
  view,
  markers,
  overlayRef,
  enablePost,
}: {
  wide: boolean;
  lowQuality: boolean;
  phase: Phase;
  reduced: boolean;
  size: Size;
  geo: Geometry;
  view: View;
  markers: Marker[];
  overlayRef: RefObject<HTMLDivElement | null>;
  enablePost: boolean;
}) {
  const seaTime = useAnimationClock({ lowQuality });

  // Expose render frame count for tests
  useFrame(() => {
    if (typeof window !== 'undefined') {
      const win = window as unknown as { __frames?: number };
      win.__frames = (win.__frames ?? 0) + 1;
    }
  });

  return (
    <SeaTimeContext.Provider value={seaTime}>
      <Ocean wide={wide} timeUniform={seaTime} />
      <Terrain wide={wide} />
      <Graticule3D />
      <InkLines />
      {enablePost && (
        <EffectComposer multisampling={0}>
          <InkEffect />
        </EffectComposer>
      )}
      <ControlsBridge phase={phase} reduced={reduced} size={size} geo={geo} view={view} />
      <ProjectMarkers
        markers={markers}
        overlayRef={overlayRef}
        phase={phase}
      />
    </SeaTimeContext.Provider>
  );
}

export interface Map3DLayerProps {
  size: Size;
  geo: Geometry;
  view: View;
  anim: Anim;
  phase: Phase;
  markers: Marker[];
  onPick: (m: Marker) => void;
  onCameraChange?: (view: View) => void;
}

function ControlsBridge({
  phase,
  reduced,
  size,
  geo,
  view,
}: {
  phase: Phase;
  reduced: boolean;
  size: Size;
  geo: Geometry;
  view: View;
}) {
  const controlsRef = useRef<CameraControls>(null);
  const invalidate = useThree((s) => s.invalidate);
  const scene = useThree((s) => s.scene);
  const initialized = useRef(false);

  useLayoutEffect(() => {
    const cc = controlsRef.current;
    if (!cc) return;

    (window as unknown as { __cameraControls?: CameraControls }).__cameraControls = cc;
    (window as unknown as { __invalidate?: () => void }).__invalidate = invalidate;
    (window as unknown as { __scene?: unknown }).__scene = scene;

    cc.minPolarAngle = 0;
    cc.maxPolarAngle = (60 * Math.PI) / 180;
    cc.smoothTime = 0.25;

    // Boundary box enclosing continent and surrounding ocean navigation area
    const bbox = new Box3(new Vector3(-800, -50, -800), new Vector3(800, 2500, 800));
    cc.setBoundary(bbox);

    if (phase === 'dive') {
      const dur = reduced ? 0 : 1.5;
      cc.setLookAt(
        DIVE_3D.pos.x,
        DIVE_3D.pos.y,
        DIVE_3D.pos.z,
        DIVE_3D.target.x,
        DIVE_3D.target.y,
        DIVE_3D.target.z,
        dur > 0
      );
    } else if (!initialized.current) {
      initialized.current = true;
      const home = homePose3D(size.vw / size.vh);
      cc.setLookAt(home.pos.x, home.pos.y, home.pos.z, home.target.x, home.target.y, home.target.z, false);
    }
  }, [phase, reduced]);

  // When view changes from UI buttons or cluster clicks, update camera target & distance to match
  useLayoutEffect(() => {
    const cc = controlsRef.current;
    if (!cc || phase === 'dive' || !initialized.current) return;
    if (view.k > 1.05) {
      const pxPerUnit = (geo.S * view.k) / 1000;
      const h = size.vh / (2 * Math.tan((40 * Math.PI) / 360) * pxPerUnit);
      const targetX = (size.vw / 2 - geo.ox - view.px) / pxPerUnit;
      const targetY = (size.vh / 2 - geo.oy - view.py) / pxPerUnit;
      const target = { x: targetX - 500, y: 0, z: targetY - 500 };
      const pitchRad = (38 * Math.PI) / 180;
      const distance = h;
      const posY = target.y + distance * Math.sin(pitchRad);
      const posZ = target.z + distance * Math.cos(pitchRad);
      cc.setLookAt(target.x, posY, posZ, target.x, target.y, target.z, true);
    } else {
      // Back to the overview (reset button, or zoomed all the way out).
      const home = homePose3D(size.vw / size.vh);
      cc.setLookAt(home.pos.x, home.pos.y, home.pos.z, home.target.x, home.target.y, home.target.z, !reduced);
    }
  }, [view.k, view.px, view.py, size, geo, phase, reduced]);

  useFrame(() => {
    const cc = controlsRef.current;
    if (cc && cc.active) {
      invalidate();
    }
  });

  return (
    <CameraControls
      ref={controlsRef}
      makeDefault
      dollyToCursor
      minDistance={120}
      maxDistance={3500}
    />
  );
}

function ProjectMarkers({
  markers,
  overlayRef,
  phase,
}: {
  markers: Marker[];
  overlayRef: RefObject<HTMLDivElement | null>;
  phase: Phase;
}) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);

  useFrame(() => {
    const el = overlayRef.current;
    if (!el || phase === 'dive') return;

    // 1. Position expedition & fossil markers
    for (const m of markers) {
      const btn = el.querySelector<HTMLElement>(`[data-key="${m.key}"]`);
      if (!btn) continue;

      const elevM = heightAt(m.x, m.y);
      const groundH = worldHeight(elevM);
      const wPos = toWorld(m.x, m.y, groundH + 3.0);
      const p = new Vector3(wPos.x, wPos.y, wPos.z);
      p.project(camera);

      const visible = p.z < 1.0 && p.x >= -1.1 && p.x <= 1.1 && p.y >= -1.1 && p.y <= 1.1;
      if (!visible) {
        btn.style.display = 'none';
        continue;
      }

      btn.style.display = '';
      const sx = ((p.x + 1) * size.width) / 2;
      const sy = ((-p.y + 1) * size.height) / 2;
      btn.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0px) translate(-50%, -50%)`;
    }

    // 2. Position graticule labels: "0° Greenwich" and "60° S" calculated with project(lon, lat)
    const updateGraticuleLabel = (selector: string, mapCoord: { x: number; y: number }) => {
      const label = el.querySelector<HTMLElement>(selector);
      if (!label) return;
      const wPos = toWorld(mapCoord.x, mapCoord.y, 0.2);
      const p = new Vector3(wPos.x, wPos.y, wPos.z);
      p.project(camera);

      const visible = p.z < 1.0 && p.x >= -1.1 && p.x <= 1.1 && p.y >= -1.1 && p.y <= 1.1;
      if (!visible) {
        label.style.display = 'none';
        return;
      }

      label.style.display = '';
      const sx = ((p.x + 1) * size.width) / 2;
      const sy = ((-p.y + 1) * size.height) / 2;
      label.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0px) translate(-50%, -50%)`;
    };

    // Greenwich: lon 0, lat ~ -57; 60° S: on circle of -60° lat on a meridian free of markers (lon 45)
    updateGraticuleLabel('[data-graticule="greenwich"]', project(0, -57));
    updateGraticuleLabel('[data-graticule="60s"]', project(45, -60));
  });

  return null;
}

export function Map3DLayer({
  size,
  geo,
  view,
  phase,
  markers,
  onPick,
}: Map3DLayerProps) {
  const reduced = useReducedMotion();
  const overlayRef = useRef<HTMLDivElement>(null);
  const [dpr, setDpr] = useState(1.5);
  const [enablePost, setEnablePost] = useState(true);
  const [lowQuality, setLowQuality] = useState(false);

  const homeStart = homePose3D(size.vw / size.vh);

  return (
    <>
      <Canvas
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          background: 'var(--paper, #EAE0D0)',
        }}
        frameloop="demand"
        dpr={dpr}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          alpha: true,
          preserveDrawingBuffer: true,
        }}
        camera={{
          fov: 40,
          near: 10,
          far: 20000,
          position: [homeStart.pos.x, homeStart.pos.y, homeStart.pos.z],
        }}
        aria-hidden="true"
      >
        <PerformanceMonitor
          onIncline={() => {
            setLowQuality(false);
            if (!enablePost) setEnablePost(true);
            else if (dpr < 1.5) setDpr(1.5);
          }}
          onDecline={() => {
            setLowQuality(true);
            if (dpr > 1) setDpr(1);
            else if (enablePost) setEnablePost(false);
          }}
          onFallback={() => {
            setLowQuality(true);
            setDpr(1);
            setEnablePost(false);
          }}
        />
        <SceneContent
          wide={size.vw > 820}
          lowQuality={lowQuality}
          phase={phase}
          reduced={reduced}
          size={size}
          geo={geo}
          view={view}
          markers={markers}
          overlayRef={overlayRef}
          enablePost={enablePost}
        />
      </Canvas>
      <div
        className={'ov' + (phase === 'dive' ? ' hide' : '')}
        ref={overlayRef}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      >
        {phase !== 'dive' && (
          <>
            <span
              data-graticule="greenwich"
              className="hand"
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                color: 'var(--ice, #F7FAFB)',
                fontSize: 17,
                opacity: 0.85,
                textShadow: '0 1px 2px rgba(31,42,54,0.6)',
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                willChange: 'transform',
                userSelect: 'none',
              }}
            >
              0° Greenwich
            </span>
            <span
              data-graticule="60s"
              className="hand"
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                color: 'var(--ice, #F7FAFB)',
                fontSize: 17,
                opacity: 0.85,
                textShadow: '0 1px 2px rgba(31,42,54,0.6)',
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                willChange: 'transform',
                userSelect: 'none',
              }}
            >
              60° S
            </span>
            {markers.map((m) => {
              const zIndex = m.kind === 'cluster' ? 3 : m.kind === 'point' && m.point.tier === 'A' ? 2 : 1;
              return (
                <div
                  key={m.key}
                  data-key={m.key}
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    pointerEvents: 'auto',
                    willChange: 'transform',
                    zIndex,
                  }}
                >
                  <MarkerButton m={m} style={{ left: 0, top: 0 }} onPick={onPick} />
                </div>
              );
            })}
          </>
        )}
      </div>
    </>
  );
}
