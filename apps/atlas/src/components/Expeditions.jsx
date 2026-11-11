import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, ChevronDown, ExternalLink, Flag, Info, MapPin, Shell, Ship, Sparkles, Waves } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export const expeditionIcons = { fossil: Shell, waves: Waves, sparkles: Sparkles, ship: Ship, flag: Flag }
const groups = { fosiles: 'naturaleza', oceano: 'naturaleza', poncho: 'historias', ushuaia: 'historias', orcadas: 'historias' }

export function ExpeditionList({ expeditions, onSelect, filter, onFilter }) {
  const visible = expeditions.filter(e => filter === 'todas' || groups[e.id] === filter)
  return <>
    <div className="panel-intro">
      <div className="eyebrow"><span className="small-rule" /> UN ATLAS DE EXPEDICIONES</div>
      <h1>Un continente.<br /><em>Miles de preguntas.</em></h1>
      <p>Acercate a sus lugares. Encontrá una historia. Seguí tu curiosidad.</p>
    </div>
    <div className="expedition-browser">
      <div className="browser-heading"><h2>Elegí por dónde empezar</h2><span>05</span></div>
      <div className="filters" role="group" aria-label="Filtrar expediciones">
        {[['todas', 'Todas'], ['naturaleza', 'Naturaleza'], ['historias', 'Historias']].map(([value, label]) =>
          <button key={value} aria-pressed={filter === value} onClick={() => onFilter(value)}>{label}</button>)}
      </div>
      <div className="expedition-list" aria-live="polite">
        {visible.map(expedition => {
          const Icon = expeditionIcons[expedition.icon]
          return <button key={expedition.id} data-expedition-id={expedition.id} className={`expedition-item ${expedition.id === 'fosiles' ? 'featured' : ''}`}
            style={{ '--exp-color': expedition.color }} onClick={e => onSelect(expedition.id, e.currentTarget)} aria-label={`Ver propuesta ${expedition.title}`}>
            <span className="item-icon"><Icon size={22} strokeWidth={1.35} /></span>
            <span className="item-copy"><span className="item-meta">{expedition.number} / {expedition.category}</span><strong>{expedition.title}</strong>
              <span className="item-status"><span className={expedition.location ? 'status-dot located' : 'status-dot'} />{expedition.location ? 'Ubicada en el mapa' : 'Propuesta en desarrollo'}</span></span>
            <ArrowUpRight size={17} className="item-arrow" />
          </button>
        })}
      </div>
    </div>
    <div className="panel-footnote"><Info size={15} /><p>Estas expediciones están tomando forma.<br />Por ahora, explorá sus propuestas.</p></div>
  </>
}

export function ExpeditionDetail({ expedition, onClose, onLocate, onNext }) {
  const [showRoute, setShowRoute] = useState(false)
  const title = useRef()
  const Icon = expeditionIcons[expedition.icon]
  useEffect(() => {
    setShowRoute(false)
    title.current?.focus({ preventScroll: true })
  }, [expedition.id])
  return <div className="detail-content" style={{ '--exp-color': expedition.color }}>
    <button className="back-link" onClick={onClose}><ArrowLeft size={17} />Todas las expediciones</button>
    <div className="detail-art" aria-hidden="true">
      <span className="art-orbit orbit-one" /><span className="art-orbit orbit-two" /><span className="art-cross cross-one" /><span className="art-cross cross-two" />
      <Icon size={86} strokeWidth={0.8} />
      <span className="art-index">EXPEDICIÓN / {expedition.number}</span><span className="art-caption">UNA PREGUNTA ABIERTA</span>
    </div>
    <div className="detail-main">
      <div className="eyebrow">{expedition.category}</div>
      <h2 ref={title} tabIndex={-1} id="expedition-title">{expedition.title}</h2>
      <p className="detail-description">{expedition.description}</p>
      <div className={`location-note ${expedition.location ? 'located' : ''}`}><MapPin size={17} /><div><strong>{expedition.location ? expedition.locationLabel : expedition.status}</strong>
        <span>{expedition.location ? expedition.coordinatesLabel : 'La propuesta todavía no tiene un punto asignado.'}</span></div></div>
      {expedition.location && <button className="locate-button" onClick={onLocate}><MapPin size={16} />Ubicar en el mapa<ArrowUpRight size={16} /></button>}
      <div className="question-card"><span>LA PREGUNTA QUE NOS GUÍA</span><p>{expedition.question}</p></div>
      <button className="primary-button" aria-expanded={showRoute} aria-controls="proposed-route" onClick={() => setShowRoute(v => !v)}>
        {showRoute ? 'Cerrar recorrido propuesto' : 'Ver recorrido propuesto'}{showRoute ? <ChevronDown size={18} /> : <ArrowDown size={18} />}
      </button>
      {showRoute && <section className="proposed-route" id="proposed-route" aria-label="Recorrido propuesto">
        <p className="route-intro">Un primer guion para imaginar la experiencia.</p>
        <ol>{expedition.steps.map(([heading, text], i) => <li key={heading}><span>0{i + 1}</span><div><h3>{heading}</h3><p>{text}</p></div></li>)}</ol>
      </section>}
      <details className="proposal-sources"><summary>Sobre esta propuesta<ChevronDown size={15} /></summary>
        <p>{expedition.note}</p>
        {expedition.sources && <div className="source-links">{expedition.sources.map(source => <a href={source.url} key={source.url} target="_blank" rel="noreferrer">{source.label}<ExternalLink size={14} /></a>)}</div>}
      </details>
    </div>
    <button className="next-expedition" onClick={onNext}><span>SEGUÍ EXPLORANDO<strong>Otra pregunta, otro comienzo</strong></span><ArrowRight size={20} /></button>
  </div>
}
