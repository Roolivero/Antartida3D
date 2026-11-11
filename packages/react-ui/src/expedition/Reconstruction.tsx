import { RECONSTRUCTION_SVG } from '@antartida/core';
import { Chip } from '../ui.tsx';

export function Reconstruction() {
  return (
    <div className="page">
      <h2 tabIndex={-1} data-step-focus>Conclusión</h2>
      <p className="small">Así podría haber sido este lugar. Cada parte tiene una etiqueta para saber de dónde sale.</p>
      <div className="recon">
        <svg
          viewBox="0 0 400 240"
          role="img"
          aria-label="Reconstrucción artística: costa templada con bosque, playa y mar poco profundo"
          dangerouslySetInnerHTML={{ __html: RECONSTRUCTION_SVG }}
        />
        <span className="stamp chip art">Reconstrucción artística</span>
        <span className="pin" style={{ left: '24%', top: '84%' }} aria-hidden="true">A</span>
        <span className="pin" style={{ left: '64%', top: '34%' }} aria-hidden="true">B</span>
        <span className="pin" style={{ left: '48%', top: '70%' }} aria-hidden="true">C</span>
      </div>
      <div className="layers">
        <div className="lyr ev">
          <div className="lh">
            <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="6.5" stroke="#A4471F" strokeWidth="2.2" fill="none" />
              <path d="M16 16l4.5 4.5" stroke="#A4471F" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
            <b>Evidencia</b>
          </div>
          <p>Lo que se encontró: los restos A (espiral), B (hoja) y C (hueso). Están marcados con su letra en la imagen.</p>
          <div className="chips" style={{ marginTop: 6 }}><Chip kind="real">Dato real · a completar</Chip></div>
        </div>
        <div className="lyr in">
          <div className="lh">
            <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" stroke="#1E3E5C" strokeWidth="2" fill="none" strokeLinejoin="round" />
            </svg>
            <b>Interpretación</b>
          </div>
          <p>[Contenido provisional] Si aparecen juntos restos de mar y de plantas, la zona pudo tener costa, vegetación y un clima sin hielo permanente.</p>
        </div>
        <div className="lyr ar">
          <div className="lh">
            <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 20c2-1 3-3 3-5l9-9 3 3-9 9c-2 0-4 1-5 2z" stroke="#8A5A14" strokeWidth="2" fill="none" strokeLinejoin="round" />
            </svg>
            <b>Reconstrucción artística</b>
          </div>
          <p>La ilustración es una forma de imaginar el lugar. Colores, plantas y paisaje son una propuesta, no una foto del pasado.</p>
        </div>
      </div>
      <p className="small" style={{ marginTop: 10 }}>Fuentes: [Fuente a definir]</p>
    </div>
  );
}
