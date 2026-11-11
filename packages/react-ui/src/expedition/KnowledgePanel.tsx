import { useRef } from 'react';
import { KNOW, KNOW_CHIPS, LEVELS, STEP_NAMES, type Step } from '@antartida/core';
import { useFocusReturn } from '../hooks.ts';
import { Chip, Icon } from '../ui.tsx';

/** "Saber más": non-modal side panel with three depth levels per step. Escape is handled by the expedition. */
export function KnowledgePanel({ step, level, onLevel, onClose, fallbackFocus }: {
  step: Step;
  level: number;
  onLevel: (level: number) => void;
  onClose: () => void;
  fallbackFocus: () => HTMLElement | null;
}) {
  const ref = useRef<HTMLElement>(null);
  useFocusReturn(true, ref, '.tab', fallbackFocus);
  const chip = KNOW_CHIPS[level];
  return (
    <aside className="kp" id="kpanel" aria-label="Saber más" ref={ref}>
      <div className="kh">
        <b>Saber más · {STEP_NAMES[step - 1]}</b>
        <button type="button" className="iconbtn" onClick={onClose} aria-label="Cerrar panel">{Icon.close}</button>
      </div>
      <div className="tabs" role="group" aria-label="Nivel de detalle">
        {LEVELS.map((l, i) => (
          <button key={l.label} type="button" className="tab" aria-pressed={level === i} onClick={() => onLevel(i)}>
            {l.label}<small>{l.sub}</small>
          </button>
        ))}
      </div>
      <div className="kb" aria-live="polite">
        <div className="chips"><span className={chip.cls}>{chip.text}</span><Chip kind="prov">[Contenido provisional]</Chip></div>
        <p>{KNOW[step - 1][level]}</p>
        {level === 2 && (
          <>
            <p className="small"><b>Referencias de etiquetas:</b></p>
            <div className="chips" style={{ marginTop: 4 }}>
              <Chip kind="real">Dato real</Chip><Chip kind="sim">Simulación educativa</Chip><Chip kind="art">Reconstrucción artística</Chip>
            </div>
            <p className="small">Fuentes: [Fuente a definir]</p>
          </>
        )}
      </div>
    </aside>
  );
}
