import { useEffect, useReducer, useRef, useState } from 'react';
import {
  EV, SEAL_SVG, STEP_NAMES, canAdvance, cardButtonLabel, expeditionReducer, foundCount, initialExpedition, primaryLabel,
} from '@antartida/core';
import { Chip, Icon } from '../ui.tsx';
import { Compare } from './Compare.tsx';
import { DigSite } from './DigSite.tsx';
import { EvidenceCard } from './EvidenceCard.tsx';
import { KnowledgePanel } from './KnowledgePanel.tsx';
import { Reconstruction } from './Reconstruction.tsx';
import { Scene } from './Scene.tsx';

export function Expedition({ reduced, onLeave }: { reduced: boolean; onLeave: (done: boolean) => void }) {
  const [s, dispatch] = useReducer(expeditionReducer, initialExpedition);
  const [par, setPar] = useState({ nx: 0, ny: 0 });
  const rootRef = useRef<HTMLElement>(null);
  const panelBtnRef = useRef<HTMLButtonElement>(null);
  const found = foundCount(s);
  const nx = reduced ? 0 : par.nx, ny = reduced ? 0 : par.ny;

  // Move focus to where each step starts, so keyboard and screen reader users follow along.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const target = s.step === 2
      ? root.querySelector<HTMLElement>('.spot')
      : s.step === 5 ? root.querySelector<HTMLElement>('.ebar .btn.primary') : root.querySelector<HTMLElement>('[data-step-focus]');
    target?.focus();
  }, [s.step]);

  const primary = () => (s.step === 5 ? onLeave(true) : dispatch({ type: 'next' }));

  return (
    <section
      className="exp"
      aria-label="Expedición Fósiles en Isla Marambio"
      ref={rootRef}
      onKeyDown={(e) => {
        // The panel is non-modal: Escape closes it wherever focus is, unless a card (which handles Escape) is open.
        if (e.key === 'Escape' && s.panel && s.card < 0) dispatch({ type: 'closePanel' });
      }}
      onPointerMove={(e) => {
        if (reduced) return;
        const r = e.currentTarget.getBoundingClientRect();
        setPar({ nx: ((e.clientX - r.left) / r.width - 0.5) * 2, ny: ((e.clientY - r.top) / r.height - 0.5) * 2 });
      }}
    >
      <Scene nx={nx} ny={ny} />

      {s.step <= 2 && (
        <DigSite
          active={s.step === 2}
          prog={s.prog}
          paused={s.card >= 0}
          offset={`translate(${-nx * 15}px, ${-ny * 7}px)`}
          onBrush={(spot) => dispatch({ type: 'brush', spot })}
        />
      )}

      <header className="etop">
        <div className="r1">
          <button type="button" className="pill" onClick={() => onLeave(false)} aria-label="Volver al mapa">
            {Icon.back}
            Mapa
          </button>
          <div className="ttl"><b>Fósiles</b><span>Isla Marambio</span></div>
          <button
            type="button"
            className="pill"
            ref={panelBtnRef}
            onClick={() => dispatch({ type: 'togglePanel' })}
            aria-expanded={s.panel}
            aria-controls="kpanel"
          >
            Saber más
          </button>
        </div>
        <div className="steps" aria-hidden="true">
          {[1, 2, 3, 4, 5].map((n) => <i key={n} className={n < s.step ? 'done' : n === s.step ? 'cur' : ''} />)}
        </div>
        <div className="steplbl" aria-live="polite">Paso {s.step} de 5 · {STEP_NAMES[s.step - 1]}</div>
      </header>

      <div className="ebody">
        <div className="wrap">
          {s.step === 1 && (
            <div className="bigq">
              <div className="kick">Pregunta inicial</div>
              <h2 tabIndex={-1} data-step-focus>¿Cómo era la Antártida antes del hielo?</h2>
              <p>Las rocas de esta isla guardan pistas. Tu tarea: encontrarlas y ver qué cuentan. <span className="small">[Contenido provisional]</span></p>
            </div>
          )}
          {s.step === 2 && (
            <div className="dighud">
              <div className="ins">Tocá o arrastrá sobre la roca para limpiar el sedimento.</div>
              <div className="counter" aria-live="polite" aria-label={`Hallazgos: ${found} de 3`}>
                {[0, 1, 2].map((i) => (
                  <span key={i} className={s.prog[i] >= 4 ? 'f' : ''}>{s.prog[i] >= 4 ? 'ABC'[i] : '?'}</span>
                ))}
              </div>
              <div className="chips" style={{ justifyContent: 'center', marginTop: 8 }}><Chip kind="sim">Simulación educativa</Chip></div>
            </div>
          )}
          {s.step === 3 && <Compare answer={s.answer} onPick={(option) => dispatch({ type: 'pick', option })} />}
          {s.step === 4 && <Reconstruction />}
          {s.step === 5 && (
            <div className="page done5">
              <svg className="seal" viewBox="0 0 120 120" aria-hidden="true" dangerouslySetInnerHTML={{ __html: SEAL_SVG }} />
              <div className="anno">expedición registrada</div>
              <h2>Fósiles · Isla Marambio</h2>
              <p>Encontraste 3 restos, los comparaste y viste una reconstrucción posible del ambiente antes del hielo.</p>
              <p className="small">Al volver, el punto queda marcado como explorado y se suma a tu registro de exploración.</p>
            </div>
          )}
        </div>
      </div>

      <div className="ebar">
        {s.step >= 2 && s.step <= 4 && (
          <button type="button" className="btn ghost" onClick={() => dispatch({ type: 'back' })}>Atrás</button>
        )}
        <button type="button" className="btn primary" onClick={primary} disabled={s.step !== 5 && !canAdvance(s)}>
          {primaryLabel(s)}
        </button>
      </div>

      {s.panel && (
        <KnowledgePanel
          step={s.step}
          level={s.level}
          onLevel={(level) => dispatch({ type: 'level', level })}
          onClose={() => dispatch({ type: 'closePanel' })}
          fallbackFocus={() => panelBtnRef.current}
        />
      )}

      {s.card >= 0 && (
        <EvidenceCard
          evidence={EV[s.card]}
          found={found}
          actionLabel={cardButtonLabel(s)}
          onAction={() => dispatch({ type: 'cardAction' })}
          onClose={() => dispatch({ type: 'closeCard' })}
        />
      )}
    </section>
  );
}
