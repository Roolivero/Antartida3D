import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import {
  DRAG_THRESHOLD, EXPEDITION_POINT, HOME, KEY_PAN, MIN_K, PTS, VOYAGE_POINT, ZOOM_MS,
  buildMarkers, diveView, geometry, isWheelNotch, keyView, panBy, wheelFactor, zoomAround, zoomCenter,
  type MapPoint, type Marker, type SeaPoint, type Size, type View,
} from '@antartida/core';
import { useReducedMotion, useTimers } from '../hooks.ts';
import { useVoyage, type VoyageBus } from '../voyage/useVoyage.ts';
import { Icon } from '../ui.tsx';
import { ExplorationLog } from './ExplorationLog.tsx';
import { Legend } from './Legend.tsx';
import { ListView } from './ListView.tsx';
import { PointSheet } from './PointSheet.tsx';
import { ViewToggle } from './ViewToggle.tsx';
import { Map2DLayer, type LayerProps } from './Map2DLayer.tsx';

const VoyagePanel = lazy(() => import('../voyage/VoyagePanel.tsx').then((m) => ({ default: m.VoyagePanel })));

export type Phase = 'idle' | 'dive' | 'fade' | 'ret';
export type Anim = '' | 'zoom' | 'wheel' | 'dive';
export type ViewMode = '2d' | '3d';

const WHEEL_MS = 200;

/**
 * A request from the shared controls (buttons, keys, cluster clicks) to the 3D camera. In 3D the
 * orbit camera owns zoom and pan, so the controls ask it to move instead of rewriting `view`.
 */
export type Camera3DCommand =
  | { type: 'zoom'; factor: number }
  | { type: 'home' }
  | { type: 'focus'; view: View }
  | { type: 'pan'; dx: number; dy: number }
  | { type: 'rotate'; deg: number };

export type Layer3DProps = LayerProps & {
  size: Size;
  diveTarget: MapPoint;
  /** `n` grows with every request so repeating the same command still fires. */
  command: { n: number; cmd: Camera3DCommand } | null;
  /** The camera came to rest: the 2D-style view it shows, for clustering and the 2D switch. */
  onCameraRest: (view: View) => void;
  /** The trip from Ushuaia while it is under way: the scene draws the vehicle and follows it. */
  voyage: VoyageBus | null;
};

export interface MapViewProps {
  phase: Phase;
  explored: readonly string[];
  /** The trip from Ushuaia is open: its panel replaces the map's own controls. */
  voyaging?: boolean;
  diveTarget?: MapPoint;
  toast: string;
  legend: boolean;
  /** Move focus to the expedition marker on mount (coming back from the expedition). */
  focusExpedition: boolean;
  mode?: ViewMode;
  showToggle?: boolean;
  Layer3D?: (props: Layer3DProps) => React.ReactNode;
  onToggleLegend: () => void;
  onToggleMode?: (next: ViewMode) => void;
  onStart: (point: MapPoint) => void;
  onStartVoyage?: () => void;
  onEndVoyage?: (done: boolean) => void;
}

/** Keyboard navigation of the 3D camera: same keys as 2D, plus Q and E to turn. */
function keyCommand3D(key: string): Camera3DCommand | null {
  if (key === 'ArrowLeft') return { type: 'pan', dx: KEY_PAN, dy: 0 };
  if (key === 'ArrowRight') return { type: 'pan', dx: -KEY_PAN, dy: 0 };
  if (key === 'ArrowUp') return { type: 'pan', dx: 0, dy: KEY_PAN };
  if (key === 'ArrowDown') return { type: 'pan', dx: 0, dy: -KEY_PAN };
  if (key === '+' || key === '=') return { type: 'zoom', factor: 1.5 };
  if (key === '-' || key === '_') return { type: 'zoom', factor: 1 / 1.5 };
  if (key === 'q' || key === 'Q') return { type: 'rotate', deg: 15 };
  if (key === 'e' || key === 'E') return { type: 'rotate', deg: -15 };
  return null;
}

export function MapView({
  phase,
  explored,
  voyaging = false,
  diveTarget = EXPEDITION_POINT,
  toast,
  legend,
  focusExpedition,
  mode = '2d',
  showToggle = false,
  Layer3D,
  onToggleLegend,
  onToggleMode,
  onStart,
  onStartVoyage,
  onEndVoyage,
}: MapViewProps) {
  const vpRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<Size>({ vw: 390, vh: 844 });
  const [view, setView] = useState<View>(HOME);
  const [anim, setAnim] = useState<Anim>('');
  const [touched, setTouched] = useState(false);
  const [sheet, setSheet] = useState<MapPoint | SeaPoint | null>(null);
  const [list, setList] = useState(false);
  const later = useTimers();
  const reduced = useReducedMotion();
  const voyage = useVoyage();

  useEffect(() => {
    if (!voyaging) voyage.reset();
  }, [voyaging]);

  const is3D = mode === '3d' && !!Layer3D;
  const [command, setCommand] = useState<Layer3DProps['command']>(null);
  const live = useRef({ size, view, phase, is3D });
  live.current = { size, view, phase, is3D };

  const send3D = (cmd: Camera3DCommand) => {
    setCommand((c) => ({ n: (c?.n ?? 0) + 1, cmd }));
    setTouched(true);
  };

  useEffect(() => {
    if (is3D) return;
    // A pending camera command must not replay when the 3D scene mounts again later.
    setCommand(null);
    // The 3D camera can zoom out past the overview (k < 1); the 2D map cannot.
    setView((v) => (v.k < MIN_K ? HOME : v));
  }, [is3D]);
  const ptrs = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ dragged: boolean; pan: null | { x: number; y: number; px: number; py: number }; pinch: null | (View & { d: number }) }>(
    { dragged: false, pan: null, pinch: null },
  );

  useLayoutEffect(() => {
    const el = vpRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0) setSize((s) => (Math.abs(r.width - s.vw) > 1 || Math.abs(r.height - s.vh) > 1 ? { vw: r.width, vh: r.height } : s));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!focusExpedition) return;
    vpRef.current?.querySelector<HTMLElement>('.mk.ta, .mk.has-a')?.focus();
  }, [focusExpedition]);

  useEffect(() => {
    if (phase !== 'dive' && phase !== 'fade') return;
    setSheet(null);
    setList(false);
    if (phase === 'fade') return;
    setAnim('dive');
    setView(diveView(live.current.size, diveTarget.x, diveTarget.y));
  }, [phase, diveTarget]);

  const animateTo = (next: View) => {
    setView(next);
    setAnim('zoom');
    setTouched(true);
    later('zoom', () => setAnim(''), ZOOM_MS);
  };

  const rel = (e: { clientX: number; clientY: number }) => {
    const r = vpRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onDown = (e: PointerEvent) => {
    if (phase !== 'idle') return;
    const p = rel(e);
    const g = gesture.current;
    ptrs.current.set(e.pointerId, p);
    if (ptrs.current.size === 1) {
      g.dragged = false;
      g.pan = { ...p, px: view.px, py: view.py };
    } else if (ptrs.current.size === 2) {
      const [a, b] = [...ptrs.current.values()];
      g.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), ...view };
      g.dragged = true;
    }
  };

  const onMove = (e: PointerEvent) => {
    if (!ptrs.current.has(e.pointerId)) return;
    const p = rel(e);
    const g = gesture.current;
    const { size: sz, view: v } = live.current;
    ptrs.current.set(e.pointerId, p);
    if (is3D) {
      // The orbit camera handles drag and pinch itself; only track the drag so a marker under
      // the pointer is not opened at the end of it.
      if (g.pan && !g.dragged && Math.hypot(p.x - g.pan.x, p.y - g.pan.y) > DRAG_THRESHOLD) {
        g.dragged = true;
        setTouched(true);
      }
      return;
    }
    if (ptrs.current.size >= 2 && g.pinch) {
      const [a, b] = [...ptrs.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      setView(zoomAround(sz, g.pinch, (a.x + b.x) / 2, (a.y + b.y) / 2, g.pinch.k * (d / Math.max(1, g.pinch.d))));
      setAnim('');
      setTouched(true);
      return;
    }
    if (!g.pan) return;
    const dx = p.x - g.pan.x, dy = p.y - g.pan.y;
    if (!g.dragged && Math.hypot(dx, dy) > DRAG_THRESHOLD) g.dragged = true;
    if (g.dragged) {
      setView(panBy(sz, { k: v.k, px: g.pan.px, py: g.pan.py }, dx, dy));
      setAnim('');
      setTouched(true);
    }
  };

  const onUp = (e: PointerEvent) => {
    const g = gesture.current;
    ptrs.current.delete(e.pointerId);
    if (ptrs.current.size < 2) g.pinch = null;
    if (ptrs.current.size === 1) {
      const [p] = [...ptrs.current.values()];
      g.pan = { ...p, px: live.current.view.px, py: live.current.view.py };
    }
    if (ptrs.current.size === 0) g.pan = null;
  };

  // Native non-passive listener: preventDefault keeps trackpad pinch (ctrl+wheel) from zooming the whole page.
  useEffect(() => {
    const el = vpRef.current;
    if (!el) return;
    const onWheel = (e: globalThis.WheelEvent) => {
      e.preventDefault();
      const { size: sz, view: v, phase: ph, is3D: in3D } = live.current;
      if (ph !== 'idle') return;
      if (in3D) {
        setTouched(true); // the orbit camera zooms on the wheel itself
        return;
      }
      const p = rel(e);
      // Compound from the latest target so quick notches add up instead of restarting.
      const next = zoomAround(sz, v, p.x, p.y, v.k * wheelFactor(e.deltaY, e.deltaMode));
      live.current.view = next;
      setView(next);
      setTouched(true);
      if (isWheelNotch(e.deltaY, e.deltaMode)) {
        setAnim('wheel');
        later('wheel', () => setAnim(''), WHEEL_MS);
      } else setAnim('');
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const onKey = (e: KeyboardEvent) => {
    if (e.target !== vpRef.current) return;
    if (is3D) {
      const cmd = keyCommand3D(e.key);
      if (cmd) {
        e.preventDefault();
        send3D(cmd);
      }
      return;
    }
    const next = keyView(size, view, e.key);
    if (next) {
      e.preventDefault();
      animateTo(next);
    }
  };

  const openPoint = (p: MapPoint | SeaPoint) => {
    if (p.id === VOYAGE_POINT.id && onStartVoyage) onStartVoyage();
    else if ('tier' in p && p.tier === 'A') onStart(p);
    else {
      setSheet(p);
      setTouched(true);
    }
  };

  const onPick = (m: Marker) => {
    if (gesture.current.dragged) return;
    if (m.kind === 'cluster') {
      if (is3D) send3D({ type: 'focus', view: m.target });
      else animateTo(m.target);
    }
    else openPoint(m.point);
  };

  const markers = useMemo(() => buildMarkers(size, view, explored, PTS), [size, view, explored]);
  const geo = geometry(size);
  const stageCls = 'stage' + (is3D ? ' m3d' : '') + (voyaging ? ' voyaging' : '') + (phase === 'dive' ? ' dive' : phase === 'fade' ? ' fade' : phase === 'ret' ? ' ret' : '');

  return (
    <div className="stagewrap">
      <div className={stageCls}>
        <div
          className="vp"
          ref={vpRef}
          tabIndex={0}
          role="application"
          aria-label={
            mode === '3d'
              ? 'Mapa en relieve 3D de la Antártida. Arrastrá para orbitar o mover, usá las flechas para desplazarte, las teclas más y menos para acercar, y las teclas Q y E para girar.'
              : 'Mapa de la Antártida. Arrastrá para mover, usá las flechas para desplazarte y las teclas más y menos para acercar.'
          }
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onPointerLeave={onUp}
          onKeyDown={onKey}
        >
          {mode === '3d' && Layer3D ? (
            <Layer3D
              size={size}
              geo={geo}
              view={view}
              anim={anim}
              phase={phase}
              diveTarget={diveTarget}
              markers={markers}
              onPick={onPick}
              command={command}
              onCameraRest={setView}
              voyage={voyaging ? voyage.bus : null}
            />
          ) : (
            <Map2DLayer geo={geo} view={view} anim={anim} phase={phase} markers={markers} onPick={onPick} />
          )}
        </div>

        <svg className="grain" aria-hidden="true" focusable="false"><rect width="100%" height="100%" filter="url(#paperf)" /></svg>

        <header className="top">
          <div className="brand">
            <h1>Antártida por descubrir</h1>
            <p>cuaderno de campo · desde Ushuaia</p>
          </div>
          <ExplorationLog explored={explored} />
        </header>

        {!touched && !voyaging && phase === 'idle' && <div className="hint">arrastrá para mover · pellizcá para acercar</div>}
        {toast && <div className="toast" role="status">{toast}</div>}

        <div className="bottom">
          {voyaging ? <span /> : (
          <div className="leftcol">
            <Legend open={legend} onToggle={onToggleLegend} mode={mode} />
            <button type="button" className="btn" onClick={() => { setSheet(null); setList(true); }}>
              {Icon.list}
              Ver como lista
            </button>
            {showToggle && onToggleMode && (
              <ViewToggle mode={mode} onChange={onToggleMode} />
            )}
          </div>
          )}
          <div className="zoom">
            <button type="button" className="iconbtn" onClick={() => (is3D ? send3D({ type: 'zoom', factor: 1.6 }) : animateTo(zoomCenter(size, view, 1.6)))} aria-label="Acercar">{Icon.plus}</button>
            <button type="button" className="iconbtn" onClick={() => (is3D ? send3D({ type: 'zoom', factor: 1 / 1.6 }) : animateTo(zoomCenter(size, view, 1 / 1.6)))} aria-label="Alejar">{Icon.minus}</button>
            <button type="button" className="iconbtn" onClick={() => (is3D ? send3D({ type: 'home' }) : animateTo(HOME))} aria-label="Ver todo el continente">{Icon.reset}</button>
          </div>
        </div>

        {list && (
          <ListView
            explored={explored}
            onClose={() => setList(false)}
            onPick={(p) => { setList(false); openPoint(p); }}
          />
        )}
        {voyaging && onEndVoyage && (
          <Suspense fallback={null}>
            <VoyagePanel voyage={voyage} animated={is3D && !reduced} webgl={is3D} reduced={reduced} onExit={onEndVoyage} />
          </Suspense>
        )}
        {sheet && <PointSheet point={sheet} onClose={() => setSheet(null)} fallbackFocus={() => vpRef.current} />}
      </div>
      <div className={'veil' + (phase === 'dive' ? ' on' : '')} />
    </div>
  );
}
