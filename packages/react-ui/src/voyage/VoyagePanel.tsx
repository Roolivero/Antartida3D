import { lazy, Suspense, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import {
  SIGHTINGS,
  SIGHTINGS_NOTE,
  TRANSPORTS,
  VOYAGE_GEARS,
  VOYAGE_ROUTE_NOTE,
  VOYAGE_SOURCES,
  VOYAGE_SOURCES_CONSULTED,
  VOYAGE_SOURCE_CODES,
  VOYAGE_TOURISM_NOTE,
  voyageArrived,
  voyageSightings,
  voyageSourceNumber,
  voyageStops,
  type TransportId,
  type VoyageFact,
  type VoyageSourceCode,
} from '@antartida/core';
import { useFocusReturn } from '../hooks.ts';
import { SightingIcon } from './SightingIcon.tsx';
import type { VoyageController } from './useVoyage.ts';

// Its own chunk: it needs WebGL, which the 2D fallback of the trip does not.
const VehiclePreview = lazy(() => import('./VehiclePreview.tsx').then((m) => ({ default: m.VehiclePreview })));

/** Opens the sources page at one source. */
type OpenSources = (code: VoyageSourceCode) => void;

function Fact({ fact, onSource }: { fact: VoyageFact; onSource: OpenSources }) {
  return (
    <li className="vfact">
      <span>
        {fact.text}
        {fact.sources.map((code) => (
          <button
            key={code}
            type="button"
            className="vref"
            onClick={() => onSource(code)}
            aria-label={`Fuente ${voyageSourceNumber(code)}: ${VOYAGE_SOURCES[code].org}`}
          >
            [{voyageSourceNumber(code)}]
          </button>
        ))}
      </span>
    </li>
  );
}

/** Separate page with every source of the expedition, numbered as the facts cite them. */
function SourcesPage({ focus, onClose }: { focus: VoyageSourceCode; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusReturn(true, ref, `[data-source="${focus}"] a`);
  return (
    <div
      className="listview vsources"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sources-title"
      ref={ref}
      onKeyDown={(e) => {
        if (e.key !== 'Escape') return;
        e.stopPropagation();
        onClose();
      }}
    >
      <div className="inner">
        <div className="listhead">
          <h2 id="sources-title">Fuentes</h2>
          <button type="button" className="btn" onClick={onClose}>Volver al viaje</button>
        </div>
        <p className="gdesc">Cada dato del viaje lleva un número entre corchetes. Acá está de dónde sale. Consultadas el {VOYAGE_SOURCES_CONSULTED}.</p>
        <ol className="vsrclist">
          {VOYAGE_SOURCE_CODES.map((code) => (
            <li key={code} data-source={code} className={code === focus ? 'on' : undefined}>
              <strong>{VOYAGE_SOURCES[code].org}</strong>
              <span>{VOYAGE_SOURCES[code].title}</span>
              <a href={VOYAGE_SOURCES[code].url} target="_blank" rel="noopener noreferrer">Abrir la fuente</a>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function Picker({ onStart, onExit, onSource, preview, reduced }: {
  onStart: (id: TransportId) => void;
  onExit: () => void;
  onSource: OpenSources;
  /** Show the turning 3D model of the picked vehicle (needs WebGL). */
  preview: boolean;
  reduced: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const [picked, setPicked] = useState<TransportId>(TRANSPORTS[0].id);
  useFocusReturn(true, ref, '[aria-pressed="true"]');
  const transport = TRANSPORTS.find((v) => v.id === picked)!;
  return (
    <section
      className="sheet voyage"
      role="dialog"
      aria-modal="true"
      aria-labelledby="voyage-title"
      ref={ref}
      onKeyDown={(e) => e.key === 'Escape' && onExit()}
    >
      <h2 id="voyage-title">Desde Ushuaia</h2>
      <p className="place">Elegí cómo cruzar a la Antártida. Son los medios que usa la ciencia argentina.</p>
      <div className="vpick" role="group" aria-label="Medio de transporte">
        {TRANSPORTS.map((v) => (
          <button key={v.id} type="button" className="vopt" aria-pressed={v.id === picked} onClick={() => setPicked(v.id)}>
            <small>{v.type}</small>
            <strong>{v.name}</strong>
          </button>
        ))}
      </div>
      {preview && (
        <Suspense fallback={<div className="vpreview" />}>
          <VehiclePreview id={picked} reduced={reduced} />
        </Suspense>
      )}
      <p>{transport.pitch}</p>
      <ul className="vfacts">
        {transport.facts.map((f) => <Fact key={f.text} fact={f} onSource={onSource} />)}
        <Fact fact={VOYAGE_TOURISM_NOTE} onSource={onSource} />
      </ul>
      <div className="row vactions">
        <button type="button" className="btn primary" onClick={() => onStart(picked)}>
          {transport.kind === 'plane' ? 'Despegar' : 'Zarpar'}
        </button>
        <button type="button" className="btn" onClick={onExit}>Volver al mapa</button>
      </div>
    </section>
  );
}

/** Card of an animal the traveller touched on the map. */
function SightingCard({ voyage, onSource }: { voyage: VoyageController; onSource: OpenSources }) {
  const ref = useRef<HTMLElement>(null);
  useFocusReturn(true, ref, '.btn.primary');
  const sighting = SIGHTINGS.find((s) => s.id === voyage.sighting)!;
  return (
    <section
      className="sheet voyage"
      role="dialog"
      aria-modal="true"
      aria-labelledby="voyage-title"
      ref={ref}
      onKeyDown={(e) => e.key === 'Escape' && voyage.closeSighting()}
    >
      <small className="vstep">Avistaje {voyage.seen.length} de {SIGHTINGS.length}</small>
      <h2 id="voyage-title" className="vsighting"><SightingIcon icon={sighting.icon} />{sighting.name}</h2>
      <p className="vlatin">{sighting.latin}</p>
      <ul className="vfacts"><Fact fact={sighting.fact} onSource={onSource} /></ul>
      <p className="vsmall">{SIGHTINGS_NOTE}</p>
      <div className="row vactions">
        <button type="button" className="btn primary" onClick={voyage.closeSighting}>Seguir viaje</button>
      </div>
    </section>
  );
}

/**
 * Field notebook shown on arrival: the animals spotted can be opened again; the ones missed stay
 * as silhouettes, an invitation to do the trip again. Without the animated trip there is no
 * chance to spot them on the map, so every one opens from here.
 */
function Notebook({ voyage, animated }: { voyage: VoyageController; animated: boolean }) {
  return (
    <div className="vnotebook">
      <p><strong>Cuaderno de avistajes:</strong> {animated ? `viste ${voyage.seen.length} de ${SIGHTINGS.length}` : `${SIGHTINGS.length} animales de esta ruta`}</p>
      <ul>
        {SIGHTINGS.map((s) => {
          const open = !animated || voyage.seen.includes(s.id);
          return (
            <li key={s.id}>
              {open ? (
                <button type="button" className="vnote" onClick={() => voyage.openSighting(s.id)}>
                  <SightingIcon icon={s.icon} />{s.name}
                </button>
              ) : (
                <span className="vnote missed"><SightingIcon icon={s.icon} />Sin ver</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function MilestoneCard({ voyage, animated, onExit, onSource }: {
  voyage: VoyageController;
  animated: boolean;
  onExit: (done: boolean) => void;
  onSource: OpenSources;
}) {
  const state = voyage.state!;
  const ref = useRef<HTMLElement>(null);
  const [more, setMore] = useState(false);
  useFocusReturn(true, ref, '.btn.primary');
  const { milestone } = voyageStops(state.kind)[state.card];
  const last = voyageArrived(state);
  const next = () => (last ? onExit(true) : voyage.closeCard());
  return (
    <section
      className="sheet voyage"
      role="dialog"
      aria-modal="true"
      aria-labelledby="voyage-title"
      ref={ref}
      onKeyDown={(e) => e.key === 'Escape' && next()}
    >
      <small className="vstep">Hito {state.card + 1} de {voyageStops(state.kind).length}</small>
      <h2 id="voyage-title">{milestone.title}</h2>
      <ul className="vfacts">
        <Fact fact={milestone.essential} onSource={onSource} />
        {more && milestone.more.map((f) => <Fact key={f.text} fact={f} onSource={onSource} />)}
      </ul>
      {last && voyageSightings(state.kind).length > 0 && <Notebook voyage={voyage} animated={animated} />}
      {last && <p className="anno">Si te quedó curiosidad por otro medio, volvé a hacer la expedición.</p>}
      <div className="row vactions">
        <button type="button" className="btn primary" onClick={next}>{last ? 'Terminar el viaje' : 'Continuar'}</button>
        <button type="button" className="btn ghost" aria-expanded={more} onClick={() => setMore((m) => !m)}>
          {more ? 'Ver menos' : 'Saber más'}
        </button>
      </div>
    </section>
  );
}

function TravelBar({ voyage, animated, onExit }: { voyage: VoyageController; animated: boolean; onExit: () => void }) {
  const state = voyage.state!;
  const bar = useRef<HTMLElement>(null);
  const { bus } = voyage;

  // The progress bar follows the trip frame by frame without re-rendering React.
  useEffect(() => {
    const paint = () => {
      if (bar.current && bus.state) bar.current.style.transform = `scaleX(${bus.state.t})`;
    };
    paint();
    bus.listeners.add(paint);
    return () => void bus.listeners.delete(paint);
  }, [bus]);

  const next = voyageStops(state.kind)[state.reached].milestone;
  const holdKey = (on: boolean) => (e: KeyboardEvent) => {
    if (e.key !== ' ' && e.key !== 'Enter') return;
    e.preventDefault();
    if (!e.repeat) voyage.hold(on);
  };
  return (
    <div className="vbar" role="group" aria-label="Controles del viaje">
      <div className="vprog" aria-hidden="true"><i ref={bar} /></div>
      <p className="vnext">
        <span>Próximo hito: <strong>{next.title}</strong></span>
        {animated && voyageSightings(state.kind).length > 0 && (
          <span className="vcount" role="status" aria-label={`Avistajes: ${voyage.seen.length} de ${SIGHTINGS.length}`}>
            <SightingIcon icon="bird" />{voyage.seen.length}/{SIGHTINGS.length}
          </span>
        )}
      </p>
      <p className="vsmall">{VOYAGE_ROUTE_NOTE}</p>
      {/* One row, with the main button at the same corner as "Continuar" in the milestone card: the pointer stays put. */}
      <div className="row">
        {animated && (
          <button
            type="button"
            className="btn primary vhold"
            onPointerDown={() => voyage.hold(true)}
            onPointerUp={() => voyage.hold(false)}
            onPointerLeave={() => voyage.hold(false)}
            onPointerCancel={() => voyage.hold(false)}
            onKeyDown={holdKey(true)}
            onKeyUp={holdKey(false)}
            onBlur={() => voyage.hold(false)}
            onContextMenu={(e) => e.preventDefault()}
            title="Tocá dos o tres veces seguidas y mantené para ir más rápido"
          >
            Mantené para avanzar
            {voyage.gear > 0 && <span className="vgear">×{String(VOYAGE_GEARS[voyage.gear]).replace('.', ',')}</span>}
          </button>
        )}
        <button type="button" className={'btn' + (animated ? '' : ' primary')} onClick={voyage.skip}>Próximo hito</button>
        <button type="button" className="btn ghost" onClick={onExit} aria-label="Salir del viaje">Salir</button>
      </div>
    </div>
  );
}

/**
 * Interface of the trip from Ushuaia, laid over the live map: pick a transport, set the pace,
 * read each milestone. `animated` is false on the 2D map and under reduced motion: the trip then
 * advances milestone by milestone.
 */
export function VoyagePanel({ voyage, animated, webgl, reduced, onExit }: {
  voyage: VoyageController;
  animated: boolean;
  /** The 3D map is on, so WebGL works: the picker can show the vehicle model. */
  webgl: boolean;
  reduced: boolean;
  onExit: (done: boolean) => void;
}) {
  const { state } = voyage;
  // The source the sources page is open at, or null while it is closed.
  const [sources, setSources] = useState<VoyageSourceCode | null>(null);
  const stage = voyage.sighting
    ? <SightingCard voyage={voyage} onSource={setSources} />
    : !state
      ? <Picker onStart={voyage.start} onExit={() => onExit(false)} onSource={setSources} preview={webgl} reduced={reduced} />
    : state.card >= 0
      ? <MilestoneCard key={state.card} voyage={voyage} animated={animated} onExit={onExit} onSource={setSources} />
      : <TravelBar voyage={voyage} animated={animated} onExit={() => onExit(false)} />;
  return (
    <>
      {stage}
      {sources && <SourcesPage focus={sources} onClose={() => setSources(null)} />}
    </>
  );
}
