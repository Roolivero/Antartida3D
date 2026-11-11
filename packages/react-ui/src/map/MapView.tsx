import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import {
  DRAG_THRESHOLD, EXPEDITION_POINT, HOME, PTS, ZOOM_MS,
  buildMarkers, diveView, geometry, isWheelNotch, keyView, panBy, wheelFactor, zoomAround, zoomCenter,
  type MapPoint, type Marker, type Size, type View,
} from '@antartida/core';
import { useTimers } from '../hooks.ts';
import { Icon } from '../ui.tsx';
import { ExplorationLog } from './ExplorationLog.tsx';
import { Legend } from './Legend.tsx';
import { ListView } from './ListView.tsx';
import { PointSheet } from './PointSheet.tsx';
import { ViewToggle } from './ViewToggle.tsx';
import { Map2DLayer, type LayerProps } from './Map2DLayer.tsx';

export type Phase = 'idle' | 'dive' | 'fade' | 'ret';
export type Anim = '' | 'zoom' | 'wheel' | 'dive';
export type ViewMode = '2d' | '3d';

const WHEEL_MS = 200;

export interface MapViewProps {
  phase: Phase;
  explored: boolean;
  toast: string;
  legend: boolean;
  /** Move focus to the expedition marker on mount (coming back from the expedition). */
  focusExpedition: boolean;
  mode?: ViewMode;
  showToggle?: boolean;
  Layer3D?: (props: LayerProps & { size: Size }) => React.ReactNode;
  onToggleLegend: () => void;
  onToggleMode?: (next: ViewMode) => void;
  onStart: () => void;
}

export function MapView({
  phase,
  explored,
  toast,
  legend,
  focusExpedition,
  mode = '2d',
  showToggle = false,
  Layer3D,
  onToggleLegend,
  onToggleMode,
  onStart,
}: MapViewProps) {
  const vpRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<Size>({ vw: 390, vh: 844 });
  const [view, setView] = useState<View>(HOME);
  const [anim, setAnim] = useState<Anim>('');
  const [touched, setTouched] = useState(false);
  const [sheet, setSheet] = useState<MapPoint | null>(null);
  const [list, setList] = useState(false);
  const later = useTimers();

  const live = useRef({ size, view, phase });
  live.current = { size, view, phase };
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
    setView(diveView(live.current.size, EXPEDITION_POINT.x, EXPEDITION_POINT.y));
  }, [phase]);

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
      const { size: sz, view: v, phase: ph } = live.current;
      if (ph !== 'idle') return;
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
    const next = keyView(size, view, e.key);
    if (next) {
      e.preventDefault();
      animateTo(next);
    }
  };

  const openPoint = (p: MapPoint) => {
    if (p.tier === 'A') onStart();
    else {
      setSheet(p);
      setTouched(true);
    }
  };

  const onPick = (m: Marker) => {
    if (gesture.current.dragged) return;
    if (m.kind === 'cluster') animateTo(m.target);
    else openPoint(m.point);
  };

  const markers = useMemo(() => buildMarkers(size, view, explored, PTS), [size, view, explored]);
  const geo = geometry(size);
  const stageCls = 'stage' + (phase === 'dive' ? ' dive' : phase === 'fade' ? ' fade' : phase === 'ret' ? ' ret' : '');

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
            <Layer3D size={size} geo={geo} view={view} anim={anim} phase={phase} markers={markers} onPick={onPick} />
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

        {!touched && phase === 'idle' && <div className="hint">arrastrá para mover · pellizcá para acercar</div>}
        {toast && <div className="toast" role="status">{toast}</div>}

        <div className="bottom">
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
          <div className="zoom">
            <button type="button" className="iconbtn" onClick={() => animateTo(zoomCenter(size, view, 1.6))} aria-label="Acercar">{Icon.plus}</button>
            <button type="button" className="iconbtn" onClick={() => animateTo(zoomCenter(size, view, 1 / 1.6))} aria-label="Alejar">{Icon.minus}</button>
            <button type="button" className="iconbtn" onClick={() => animateTo(HOME)} aria-label="Ver todo el continente">{Icon.reset}</button>
          </div>
        </div>

        {list && (
          <ListView
            explored={explored}
            onClose={() => setList(false)}
            onPick={(p) => { setList(false); openPoint(p); }}
          />
        )}
        {sheet && <PointSheet point={sheet} onClose={() => setSheet(null)} fallbackFocus={() => vpRef.current} />}
      </div>
      <div className={'veil' + (phase === 'dive' ? ' on' : '')} />
    </div>
  );
}
