import { useRef } from 'react';
import { FOSSIL_CARD, type Evidence } from '@antartida/core';
import { useFocusReturn } from '../hooks.ts';
import { Chip, SvgHtml } from '../ui.tsx';

export function EvidenceCard({ evidence, found, actionLabel, onAction, onClose }: {
  evidence: Evidence;
  found: number;
  actionLabel: string;
  onAction: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLElement>(null);
  useFocusReturn(true, ref);
  const art = FOSSIL_CARD[evidence.kind];
  return (
    <div className="modal">
      <div className="scrim" onClick={onClose} />
      <section
        className="mcard"
        role="dialog"
        aria-modal="true"
        aria-labelledby="card-title"
        ref={ref}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
      >
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="anno">hallazgo {found} de 3</span>
          <Chip kind="sim">Simulación educativa</Chip>
        </div>
        <div className="art"><SvgHtml viewBox={art.viewBox} html={art.body} /></div>
        <h2 id="card-title">{evidence.name}</h2>
        <div className="blk">
          <div className="chips"><Chip kind="sim">Lo que observás</Chip></div>
          <p>{evidence.obs}</p>
        </div>
        <div className="blk">
          <div className="chips"><Chip kind="real">Dato real · a completar</Chip></div>
          <p>[Contenido provisional] Qué es este resto, qué edad tiene y en qué capa de roca se encontró se completa cuando se elija el hallazgo real.</p>
          <p className="small" style={{ marginTop: 4 }}>Fuente: [Fuente a definir]</p>
        </div>
        <div className="row" style={{ marginTop: 14 }}>
          <button type="button" className="btn primary" style={{ flex: 1 }} onClick={onAction}>{actionLabel}</button>
        </div>
      </section>
    </div>
  );
}
