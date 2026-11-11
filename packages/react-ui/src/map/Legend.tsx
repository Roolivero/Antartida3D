import { CONTOUR_M, VERTICAL_EXAGGERATION } from '@antartida/core';
import { Icon } from '../ui.tsx';

export function Legend({ open, onToggle, mode = '2d' }: { open: boolean; onToggle: () => void; mode?: '2d' | '3d' }) {
  return (
    <div className="legend">
      <button type="button" className="lt" onClick={onToggle} aria-expanded={open}>
        {Icon.legend}
        Leyenda
      </button>
      {open && (
        <ul>
          {mode === '3d' && (
            <li className="leg-note" style={{ fontStyle: 'italic', fontSize: '0.82em', opacity: 0.9 }}>
              Relieve real · Bedmap3 (BAS) · exageración vertical ×{VERTICAL_EXAGGERATION} · curvas cada {CONTOUR_M} m
            </li>
          )}
          <li><span className="sw"><span className="a" /></span><span><b>Expedición disponible</b></span></li>
          <li><span className="sw"><span className="b" /></span><span>Ampliación prevista</span></li>
          <li><span className="sw"><span className="c" /></span><span>Próximamente</span></li>
        </ul>
      )}
    </div>
  );
}
