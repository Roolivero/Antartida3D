import { EV, FOSSIL_THUMB, OPTS } from '@antartida/core';
import { Chip, SvgHtml } from '../ui.tsx';

export function Compare({ answer, onPick }: { answer: number; onPick: (i: number) => void }) {
  return (
    <div className="page">
      <div className="chips"><Chip kind="sim">Simulación educativa</Chip><Chip kind="prov">[Contenido provisional]</Chip></div>
      <h2 style={{ marginTop: 8 }} tabIndex={-1} data-step-focus>Comparar evidencias</h2>
      <p className="small">Mirá las tres juntas. Deslizá para ver todas.</p>
      <div className="cards">
        {EV.map((e) => (
          <article key={e.kind} className="ecard">
            <div className="art"><SvgHtml viewBox={FOSSIL_THUMB[e.kind].viewBox} html={FOSSIL_THUMB[e.kind].body} /></div>
            <h3>{e.name}</h3>
            <p className="small" style={{ margin: 0 }}>{e.obs}</p>
            <div className="chips"><Chip kind="real">Dato real · a completar</Chip></div>
            <p className="small" style={{ margin: 0 }}>[Contenido provisional] · [Fuente a definir]</p>
          </article>
        ))}
      </div>
      <h3 style={{ marginTop: 6 }}>¿Qué pueden tener en común estos tres restos?</h3>
      <div className="opts" role="group" aria-label="Elegí una hipótesis">
        {OPTS.map((o, i) => (
          <button key={i} type="button" className={'opt' + (answer === i ? ' sel' : '')} aria-pressed={answer === i} onClick={() => onPick(i)}>
            {o.text}
          </button>
        ))}
      </div>
      {answer >= 0 && (
        <div className="fb" role="status">{OPTS[answer].fb} <span className="small">[Contenido provisional]</span></div>
      )}
    </div>
  );
}
