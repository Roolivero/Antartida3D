import { lazy, Suspense, useEffect, useState } from 'react';
import {
  DIVE_MS,
  FADE_MS,
  RETURN_MS,
  RETURN_TOAST,
  TOAST_MS,
  loadExplored,
  saveExplored,
  loadViewMode,
  saveViewMode,
} from '@antartida/core';
import { useReducedMotion, useTimers } from './hooks.ts';
import { MapView, type Layer3DProps, type Phase, type ViewMode } from './map/MapView.tsx';
import { Filters } from './ui.tsx';

const loadExpedition = () => import('./expedition/Expedition.tsx');
const Expedition = lazy(() => loadExpedition().then((m) => ({ default: m.Expedition })));

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
  const [screen, setScreen] = useState<'map' | 'exp'>('map');
  const [phase, setPhase] = useState<Phase>('idle');
  const [explored, setExplored] = useState(false);
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

  const start = () => {
    if (phase !== 'idle') return;
    setToast('');
    void loadExpedition();
    setPhase(reduced ? 'fade' : 'dive');
    later(
      'enter',
      () => {
        setScreen('exp');
        setPhase('idle');
      },
      reduced ? FADE_MS : DIVE_MS
    );
  };

  const leave = (done: boolean) => {
    if (done) {
      setExplored(true);
      saveExplored(true);
    }
    setScreen('map');
    setPhase('ret');
    setReturned(true);
    setToast(done ? RETURN_TOAST : '');
    later('ret', () => setPhase('idle'), RETURN_MS);
    if (done) later('toast', () => setToast(''), TOAST_MS);
  };

  return (
    <div className="app">
      <Filters />
      {screen === 'map' ? (
        <MapView
          phase={phase}
          explored={explored}
          toast={toast}
          legend={legend}
          focusExpedition={returned}
          mode={mode}
          showToggle={webglSupported}
          Layer3D={Layer3D}
          onToggleLegend={() => setLegend((l) => !l)}
          onToggleMode={toggleMode}
          onStart={start}
        />
      ) : (
        <Suspense fallback={null}>
          <Expedition reduced={reduced} onLeave={leave} />
        </Suspense>
      )}
    </div>
  );
}
