import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { Box3, Vector3 } from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { CameraControls, PerformanceMonitor } from '@react-three/drei';
import { EffectComposer } from '@react-three/postprocessing';
import {
  homePose3D,
  performanceBounds,
  DIVE_3D,
  FOV,
  distanceFromK3D,
  homeDistance3D,
  poseFromView,
  viewFrom3D,
  toWorld,
  project,
  heightAt,
  worldHeight,
  fromWorld,
  minCameraDistance,
  FUEGIA_MIN_DISTANCE,
  type Geometry,
  type Marker,
  type Size,
  type View,
} from '@antartida/core';
import { MarkerButton } from '../map/Markers.tsx';
import { useReducedMotion } from '../hooks.ts';
import type { Layer3DProps, Phase } from '../map/MapView.tsx';
import { Ocean } from './Ocean.tsx';
import { Terrain } from './Terrain.tsx';
import { Fuegia } from './Fuegia.tsx';
import { InkLines } from './InkLines.tsx';
import { Graticule3D } from './Graticule3D.tsx';
import { InkEffect } from './InkEffect.ts';
import { SeaTimeContext, useAnimationClock } from './useAnimationClock.ts';
import { Voyage3D } from '../voyage/Voyage3D.tsx';

function SceneContent({
  wide,
  lowQuality,
  phase,
  reduced,
  size,
  geo,
  command,
  onCameraRest,
  markers,
  overlayRef,
  enablePost,
  voyage,
}: {
  wide: boolean;
  lowQuality: boolean;
  phase: Phase;
  reduced: boolean;
  size: Size;
  geo: Geometry;
  command: Layer3DProps['command'];
  onCameraRest: (view: View) => void;
  markers: Marker[];
  overlayRef: RefObject<HTMLDivElement | null>;
  enablePost: boolean;
  voyage: Layer3DProps['voyage'];
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
      <Fuegia wide={wide} />
      <Graticule3D />
      <InkLines />
      {voyage && <Voyage3D bus={voyage} reduced={reduced} overlay={overlayRef} />}
      {enablePost && (
        <EffectComposer multisampling={0}>
          <InkEffect />
        </EffectComposer>
      )}
      <ControlsBridge
        phase={phase}
        reduced={reduced}
        size={size}
        geo={geo}
        command={command}
        onCameraRest={onCameraRest}
      />
      <ProjectMarkers
        markers={markers}
        overlayRef={overlayRef}
        phase={phase}
      />
    </SeaTimeContext.Provider>
  );
}

export type Map3DLayerProps = Layer3DProps;

// Zoom range of the orbit camera, as a distance to its target (the overview is ~800 on desktop
// and ~2250 on a phone). Closer than MIN_DISTANCE the camera would graze the 4 km plateau
// (25 world units high at x50); farther than MAX_DISTANCE the continent is a speck in the fog.
const MIN_DISTANCE = 60;
const MAX_DISTANCE = 5000;
// The camera only gets closer than MIN_DISTANCE around Tierra del Fuego; there the near plane must
// come in too, or the land in front of the target would be clipped.
const NEAR = 10;
const NEAR_CLOSE = NEAR * (FUEGIA_MIN_DISTANCE / MIN_DISTANCE);

function ControlsBridge({
  phase,
  reduced,
  size,
  geo,
  command,
  onCameraRest,
}: {
  phase: Phase;
  reduced: boolean;
  size: Size;
  geo: Geometry;
  command: Layer3DProps['command'];
  onCameraRest: (view: View) => void;
}) {
  const controlsRef = useRef<CameraControls>(null);
  const invalidate = useThree((s) => s.invalidate);
  const scene = useThree((s) => s.scene);
  const initialized = useRef(false);
  const live = useRef({ size, geo, onCameraRest });
  live.current = { size, geo, onCameraRest };

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

  // Report where the camera settled, so clustering and the 2D view follow the orbit camera.
  useEffect(() => {
    const cc = controlsRef.current;
    if (!cc) return;
    const onRest = () => {
      const t = cc.getTarget(new Vector3());
      const { size: sz, geo: g, onCameraRest: report } = live.current;
      report(viewFrom3D(sz, g, t, cc.distance));
    };
    cc.addEventListener('rest', onRest);
    return () => cc.removeEventListener('rest', onRest);
  }, []);

  // Buttons, keys and cluster clicks move the camera from where it is now; they never rebuild
  // a pose from the 2D view, which used to undo the user's orbit and zoom.
  useEffect(() => {
    const cc = controlsRef.current;
    if (!cc || !command || phase === 'dive') return;
    const smooth = !reduced;
    const { cmd } = command;
    const aspect = size.vw / size.vh;
    const clampDistance = (d: number) => Math.min(MAX_DISTANCE, Math.max(cc.minDistance, d));
    // Where the camera ends up; reported right away so clusters split as soon as you zoom,
    // without waiting for the 'rest' event (instant moves under reduced motion may not fire it).
    let endDistance = cc.distance;
    if (cmd.type === 'zoom') {
      endDistance = clampDistance(cc.distance / cmd.factor);
      cc.dollyTo(endDistance, smooth);
    } else if (cmd.type === 'home') {
      const home = homePose3D(aspect);
      endDistance = homeDistance3D(aspect);
      cc.setLookAt(home.pos.x, home.pos.y, home.pos.z, home.target.x, home.target.y, home.target.z, smooth);
    } else if (cmd.type === 'focus') {
      const t = poseFromView(size, geo, cmd.view).target;
      endDistance = clampDistance(distanceFromK3D(aspect, cmd.view.k));
      cc.moveTo(t.x, 0, t.z, smooth);
      cc.dollyTo(endDistance, smooth);
    } else if (cmd.type === 'pan') {
      // Move the target over the ground, in the camera's own left/right and forward directions.
      const upp = (2 * cc.distance * Math.tan((FOV * Math.PI) / 360)) / size.vh; // world units per px
      const az = cc.azimuthAngle;
      const rx = -cmd.dx * upp;
      const fz = cmd.dy * upp;
      const t = cc.getTarget(new Vector3());
      cc.moveTo(
        t.x + Math.cos(az) * rx - Math.sin(az) * fz,
        t.y,
        t.z - Math.sin(az) * rx - Math.cos(az) * fz,
        smooth
      );
    } else if (cmd.type === 'rotate') {
      cc.rotate((cmd.deg * Math.PI) / 180, 0, smooth);
    }
    onCameraRest(viewFrom3D(size, geo, cc.getTarget(new Vector3()), endDistance));
    invalidate();
  }, [command]);

  const target = useRef(new Vector3());
  useFrame(({ camera }) => {
    const cc = controlsRef.current;
    if (!cc) return;
    const at = fromWorld(cc.getTarget(target.current));
    cc.minDistance = minCameraDistance(at.x, at.y, MIN_DISTANCE);
    // Panning out of Tierra del Fuego while close: back off before reaching the ice plateau.
    if (cc.distance < cc.minDistance - 0.01) void cc.dollyTo(cc.minDistance, !reduced);
    const near = cc.distance < MIN_DISTANCE ? NEAR_CLOSE : NEAR;
    if (camera.near !== near) {
      camera.near = near;
      camera.updateProjectionMatrix();
    }
    if (cc.active) invalidate();
  });

  return (
    <CameraControls
      ref={controlsRef}
      makeDefault
      dollyToCursor
      minDistance={MIN_DISTANCE}
      maxDistance={MAX_DISTANCE}
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
  phase,
  markers,
  onPick,
  command,
  onCameraRest,
  voyage,
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
          near: NEAR,
          far: 20000,
          position: [homeStart.pos.x, homeStart.pos.y, homeStart.pos.z],
        }}
        aria-hidden="true"
      >
        <PerformanceMonitor
          bounds={() => performanceBounds(lowQuality)}
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
          command={command}
          onCameraRest={onCameraRest}
          markers={markers}
          overlayRef={overlayRef}
          enablePost={enablePost}
          voyage={voyage}
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
