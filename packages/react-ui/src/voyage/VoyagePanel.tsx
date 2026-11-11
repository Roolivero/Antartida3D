import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import {
  TRANSPORTS,
  VOYAGE_KIND_LABEL,
  VOYAGE_ROUTE_NOTE,
  VOYAGE_SOURCES,
  VOYAGE_SOURCES_CONSULTED,
  VOYAGE_TOURISM_NOTE,
  voyageArrived,
  voyageStops,
  type TransportId,
  type VoyageDataKind,
  type VoyageFact,
} from '@antartida/core';
import { useFocusReturn } from '../hooks.ts';
import { Chip, type ChipKind } from '../ui.tsx';
import type { VoyageController } from './useVoyage.ts';

const CHIP: Record<VoyageDataKind, ChipKind> = { real: 'real', estimate: 'sim', illustrative: 'art' };

function Fact({ fact }: { fact: VoyageFact }) {
  return (
    <li className="vfact">
      <Chip kind={CHIP[fact.kind]}>{VOYAGE_KIND_LABEL[fact.kind]}</Chip>
      <span>{fact.text}</span>
      {fact.sources.map((code) => (
        <a key={code} className="vsrc" href={VOYAGE_SOURCES[code].url} target="_blank" rel="noopener noreferrer">
          Fuente: {VOYAGE_SOURCES[code].org}. {VOYAGE_SOURCES[code].title}
        </a>
      ))}
    </li>
  );
}

const Consulted = () => <p className="vsmall">Fuentes consultadas el {VOYAGE_SOURCES_CONSULTED}.</p>;

function Picker({ onStart, onExit }: { onStart: (id: TransportId) => void; onExit: () => void }) {
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
      <p>{transport.pitch}</p>
      <ul className="vfacts">{transport.facts.map((f) => <Fact key={f.text} fact={f} />)}</ul>
      <ul className="vfacts"><Fact fact={VOYAGE_TOURISM_NOTE} /></ul>
      <Consulted />
      <div className="row" style={{ marginTop: 12 }}>
        <button type="button" className="btn primary" onClick={() => onStart(picked)}>
          {transport.kind === 'plane' ? 'Despegar' : 'Zarpar'}
        </button>
        <button type="button" className="btn" onClick={onExit}>Volver al mapa</button>
      </div>
    </section>
  );
}

function MilestoneCard({ voyage, onExit }: { voyage: VoyageController; onExit: (done: boolean) => void }) {
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
      <ul className="vfacts"><Fact fact={milestone.essential} /></ul>
      <button type="button" className="btn ghost" aria-expanded={more} onClick={() => setMore((m) => !m)}>
        {more ? 'Ver menos' : 'Saber más'}
      </button>
      {more && (
        <>
          <ul className="vfacts">{milestone.more.map((f) => <Fact key={f.text} fact={f} />)}</ul>
          <Consulted />
        </>
      )}
      {last && <p className="anno">Si te quedó curiosidad por otro medio, volvé a hacer la expedición.</p>}
      <div className="row" style={{ marginTop: 12 }}>
        <button type="button" className="btn primary" onClick={next}>{last ? 'Terminar el viaje' : 'Continuar'}</button>
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
    voyage.hold(on);
  };
  return (
    <div className="vbar" role="group" aria-label="Controles del viaje">
      <div className="vprog" aria-hidden="true"><i ref={bar} /></div>
      <p className="vnext">Próximo hito: <strong>{next.title}</strong></p>
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
          >
            Mantené para avanzar
          </button>
        )}
        <button type="button" className={'btn' + (animated ? '' : ' primary')} onClick={voyage.skip}>Ir al próximo hito</button>
        {animated && <button type="button" className="btn ghost" onClick={voyage.recenter}>Centrar</button>}
        <button type="button" className="btn ghost" onClick={onExit}>Salir del viaje</button>
      </div>
      <p className="vsmall">{VOYAGE_ROUTE_NOTE}</p>
    </div>
  );
}

/**
 * Interface of the trip from Ushuaia, laid over the live map: pick a transport, set the pace,
 * read each milestone. `animated` is false on the 2D map and under reduced motion: the trip then
 * advances milestone by milestone.
 */
export function VoyagePanel({ voyage, animated, onExit }: {
  voyage: VoyageController;
  animated: boolean;
  onExit: (done: boolean) => void;
}) {
  const { state } = voyage;
  if (!state) return <Picker onStart={voyage.start} onExit={() => onExit(false)} />;
  if (state.card >= 0) return <MilestoneCard key={state.card} voyage={voyage} onExit={onExit} />;
  return <TravelBar voyage={voyage} animated={animated} onExit={() => onExit(false)} />;
}
