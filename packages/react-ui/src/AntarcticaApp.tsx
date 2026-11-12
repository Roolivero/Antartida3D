import { lazy, Suspense, useEffect, useState } from 'react';
import {
  DIVE_MS,
  FADE_MS,
  AVAILABLE_COUNT,
  EXPEDITION_POINT,
  RETURN_MS,
  VOYAGE_POINT,
  returnToast,
  TOAST_MS,
  loadExplored,
  saveExplored,
  loadViewMode,
  saveViewMode,
  type MapPoint,
} from '@antartida/core';
import { useReducedMotion, useTimers } from './hooks.ts';
import { MapView, type Layer3DProps, type Phase, type ViewMode } from './map/MapView.tsx';
import { Filters } from './ui.tsx';

const loadExpedition = () => import('./expedition/Expedition.tsx');
const Expedition = lazy(() => loadExpedition().then((m) => ({ default: m.Expedition })));

const loadOrcadas = () => import('./orcadas/OrcadasExpedition.tsx');
const OrcadasExpedition = lazy(() => loadOrcadas().then((m) => ({ default: m.OrcadasExpedition })));

const loadMap3D = () => import('./map3d/Map3DLayer.tsx');
const Map3DLayerLazy = lazy(() => loadMap3D().then((m) => ({ default: m.Map3DLayer })));

// Module-level so its identity is stable: an inline arrow would be a new component type on every
// render and remount the whole 3D scene (resetting the camera) when, say, the legend toggles.
function Layer3D(props: Layer3DProps) {
  return (
    <Suspense fallback={null}>
      <Map3DLayerLazy {...props} />
    </Suspense>
  );
}

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

export function AntarcticaApp() {
  const [screen, setScreen] = useState<'map' | 'exp' | 'orcadas'>('map');
  const [phase, setPhase] = useState<Phase>('idle');
  const [explored, setExplored] = useState<string[]>([]);
  const [voyaging, setVoyaging] = useState(false);
  const [activePoint, setActivePoint] = useState<MapPoint>(EXPEDITION_POINT);
  const [toast, setToast] = useState('');
  const [legend, setLegend] = useState(true);
  const [returned, setReturned] = useState(false);
  const [mode, setMode] = useState<ViewMode>('2d');
  const [webglSupported, setWebglSupported] = useState(false);

  const reduced = useReducedMotion();
  const later = useTimers();

  useEffect(() => {
    setExplored(loadExplored());
    const webgl = hasWebGL();
    setWebglSupported(webgl);

    if (webgl) {
      // Idle preload 3D layer
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(() => void loadMap3D());
      } else {
        setTimeout(() => void loadMap3D(), 1000);
      }

      // Check S7: initial view
      // If prefers-reduced-motion, Save-Data or previous choice of 2D -> starts in 2D
      const saved = loadViewMode();
      const saveData =
        (navigator as unknown as { connection?: { saveData?: boolean } }).connection?.saveData;

      if (saved) {
        setMode(saved);
      } else if (reduced || saveData) {
        setMode('2d');
      } else {
        setMode('3d');
      }
    } else {
      setMode('2d');
    }
  }, [reduced]);

  const toggleMode = (next: ViewMode) => {
    if (next === '3d' && !webglSupported) {
      setToast('WebGL no está disponible en este navegador');
      later('toast', () => setToast(''), TOAST_MS);
      return;
    }
    setMode(next);
    saveViewMode(next);
  };

  const start = (point: MapPoint) => {
    if (phase !== 'idle') return;
    setToast('');
    setActivePoint(point);
    const nextScreen = point.id === 'orcadas' ? 'orcadas' : 'exp';
    if (nextScreen === 'orcadas') void loadOrcadas();
    else void loadExpedition();
    setPhase(reduced ? 'fade' : 'dive');
    later(
      'enter',
      () => {
        setScreen(nextScreen);
        setPhase('idle');
      },
      reduced ? FADE_MS : DIVE_MS
    );
  };

  /** Marks an expedition as explored and announces it. */
  const complete = (point: { id: string; title: string }) => {
    const ids = explored.includes(point.id) ? explored : [...explored, point.id];
    setExplored(ids);
    saveExplored(ids);
    setToast(returnToast(point.title, ids.length, AVAILABLE_COUNT));
    later('toast', () => setToast(''), TOAST_MS);
  };

  // The trip from Ushuaia happens on the 3D map; without WebGL it advances step by step on the 2D one.
  const startVoyage = () => {
    setToast('');
    if (webglSupported) setMode('3d');
    setVoyaging(true);
  };

  const endVoyage = (done: boolean) => {
    setVoyaging(false);
    if (done) complete(VOYAGE_POINT);
  };

  const leave = (done: boolean) => {
    setScreen('map');
    setPhase('ret');
    setReturned(true);
    if (done) complete(activePoint);
    else setToast('');
    later('ret', () => setPhase('idle'), RETURN_MS);
  };

  return (
    <div className="app">
      <Filters />
      {screen === 'map' ? (
        <MapView
          phase={phase}
          explored={explored}
          voyaging={voyaging}
          diveTarget={activePoint}
          toast={toast}
          legend={legend}
          focusExpedition={returned}
          mode={mode}
          showToggle={webglSupported}
          Layer3D={Layer3D}
          onToggleLegend={() => setLegend((l) => !l)}
          onToggleMode={toggleMode}
          onStart={start}
          onStartVoyage={startVoyage}
          onEndVoyage={endVoyage}
        />
      ) : screen === 'orcadas' ? (
        <Suspense fallback={null}>
          <OrcadasExpedition reduced={reduced} onLeave={leave} />
        </Suspense>
      ) : (
        <Suspense fallback={null}>
          <Expedition reduced={reduced} onLeave={leave} />
        </Suspense>
      )}
    </div>
  );
}
