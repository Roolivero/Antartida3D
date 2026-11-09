import { lazy, StrictMode, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Compass, Flag, Hand, Info, Layers3, MapPin, Minus, MountainSnow, Pause, Play, Plus, RotateCcw, Ship, Sparkles, Waves, X, Shell, ExternalLink } from 'lucide-react'
import '@fontsource-variable/dm-sans/index.css'
import '@fontsource/libre-caslon-display/latin.css'
import { expeditions } from './data/expeditions'
import './styles.css'

const AntarcticaScene = lazy(() => import('./AntarcticaScene'))

const icons = { fossil: Shell, waves: Waves, sparkles: Sparkles, ship: Ship, flag: Flag }

function Modal({ open, onClose, titleId, children, className = '' }) {
  const ref = useRef()
  useEffect(() => {
    const dialog = ref.current
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])
  return <dialog ref={ref} aria-labelledby={titleId} className={className} onCancel={onClose}
    onClick={event => { if (event.target === ref.current) { const r = ref.current.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) onClose() } }}>
    {children}
  </dialog>
}

function ExpeditionDetail({ expedition, onClose }) {
  const [exploring, setExploring] = useState(false)
  useEffect(() => setExploring(false), [expedition?.id])
  if (!expedition) return null
  const Icon = icons[expedition.icon]
  return <Modal open onClose={onClose} titleId="expedition-title" className="expedition-dialog">
    <div className="detail-visual" style={{ '--exp-color': expedition.color }}>
      <span className="detail-grid" /><Icon className="detail-symbol" size={95} strokeWidth={0.8} />
      <span className="detail-number">EXPEDICIÓN / {expedition.number}</span>
      <button className="icon-button close-button" onClick={onClose} aria-label="Cerrar ficha"><X size={20} /></button>
    </div>
    <div className="detail-body">
      <span className="eyebrow">{expedition.category}</span>
      <h2 id="expedition-title">{expedition.title}</h2>
      <p className="detail-description">{expedition.description}</p>
      <div className={`location-status ${expedition.location ? 'verified' : ''}`}><MapPin size={16} />{expedition.status}</div>
      {expedition.location && <p className="coordinates">{expedition.locationLabel}<br />{expedition.coordinatesLabel}</p>}
      {!exploring ? <button className="primary-button full-width" onClick={() => setExploring(true)}>Explorar propuesta <ArrowRight size={18} /></button> : <section className="story" aria-label="Recorrido propuesto">
        <span className="eyebrow">Un recorrido para imaginar</span>
        <h3>{expedition.question}</h3>
        <ol>{expedition.steps.map(([title, text], index) => <li key={title}><span className="step-number">0{index + 1}</span><div><h4>{title}</h4><p>{text}</p></div></li>)}</ol>
      </section>}
      <p className="editorial-note"><Info size={16} /><span>{expedition.note}</span></p>
      {expedition.sources && <div className="detail-sources"><span className="eyebrow">Fuentes consultadas</span>{expedition.sources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.label}<ExternalLink size={13} /></a>)}</div>}
    </div>
  </Modal>
}

function About({ open, onClose }) {
  return <Modal open={open} onClose={onClose} titleId="about-title" className="about-dialog">
    <button className="icon-button about-close" onClick={onClose} aria-label="Cerrar información"><X size={20} /></button>
    <span className="eyebrow">Transparencia del prototipo</span>
    <h2 id="about-title">Una maqueta.<br />No una medición.</h2>
    <p>Esta experiencia es un punto de partida para conversar, elegir contenidos y construir Antártida3D en equipo.</p>
    <div className="source-item"><span className="source-dot verified-dot" /><div><h3>Geografía con una fuente abierta</h3><p>Contorno de tierras de Natural Earth, escala 1:50 millones, en dominio público. Vista polar estereográfica, sin límites políticos. No representa el frente actual del hielo.</p><a href="https://www.naturalearthdata.com/about/terms-of-use/" target="_blank" rel="noreferrer">Natural Earth · datos y licencia <ArrowUpRight size={14} /></a></div></div>
    <div className="source-item"><span className="source-dot illustrative-dot" /><div><h3>Relieve ilustrativo</h3><p>Las alturas, montañas, colores y el espesor del hielo son una reconstrucción visual generada para esta demo. No provienen de un modelo de elevación y no deben leerse como datos científicos.</p></div></div>
    <div className="source-item"><span className="source-dot pending-dot" /><div><h3>Expediciones en construcción</h3><p>Las cinco fichas son propuestas editoriales. Solo Base Orcadas tiene una referencia geográfica verificada; ese punto ubica la base, no una salida confirmada. Las otras cuatro esperan una ubicación validada.</p><a href="https://www.argentina.gob.ar/armada/antartida/bases-permanentes" target="_blank" rel="noreferrer">Armada Argentina · coordenadas <ArrowUpRight size={14} /></a></div></div>
    <p className="about-footnote">Versión 0.1 · Prototipo para debatir · Fuentes consultadas el 8 de noviembre de 2026</p>
  </Modal>
}

function App() {
  const [showExpeditions, setShowExpeditions] = useState(false)
  const [selected, setSelected] = useState(null)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [autoRotate, setAutoRotate] = useState(false)
  const [ready, setReady] = useState(false)
  const [sceneError, setSceneError] = useState(false)
  const [command, setCommand] = useState({ type: 'reset', id: 0 })
  const onReady = useCallback(() => setReady(true), [])
  const onError = useCallback(() => { setSceneError(true); setAutoRotate(false) }, [])
  const sendCommand = type => setCommand(c => ({ type, id: c.id + 1 }))
  const selectedExpedition = expeditions.find(e => e.id === selected)
  const resetHome = () => { setShowExpeditions(false); setSelected(null); setAutoRotate(false); sendCommand('reset') }
  useEffect(() => {
    const hideRotation = () => { if (document.hidden) setAutoRotate(false) }
    document.addEventListener('visibilitychange', hideRotation)
    return () => document.removeEventListener('visibilitychange', hideRotation)
  }, [])

  return <div className={`app ${showExpeditions ? 'expeditions-visible' : ''}`}>
    <a className="skip-link" href="#main">Saltar al contenido</a>
    <header className="header">
      <button className="brand" onClick={resetHome} aria-label="Antártida3D, volver al inicio"><span className="brand-icon"><MountainSnow size={28} strokeWidth={1.5} /></span><span>antártida<span className="brand-3d">3D</span><small>OTRA FORMA DE EXPLORAR</small></span></button>
      <nav aria-label="Principal"><span className="prototype-tag"><span />Prototipo en construcción</span><button className="about-button" onClick={() => setAboutOpen(true)}><span>Sobre la maqueta</span><Info size={17} /></button></nav>
    </header>

    <main id="main" className="explorer">
      <section className="intro" aria-label={showExpeditions ? 'Expediciones disponibles' : 'Bienvenida'}>
        {!showExpeditions ? <>
          <div className="eyebrow intro-eyebrow"><span className="tiny-line" /> UN TERRITORIO DE PREGUNTAS</div>
          <h1>Tan lejos.<br />Tan cerca de<br /><em>descubrir.</em></h1>
          <p className="intro-description">Un continente, muchas historias.<br />{' '}Explorá la Antártida y encontrá una nueva forma de mirar el mundo.</p>
          <button className="primary-button explore-button" onClick={() => setShowExpeditions(true)}>Ver expediciones <ArrowRight size={19} /></button>
          <div className="intro-footnote"><span className="footnote-rule" /><span>Giralo. Acercate.<br />Dejá que la curiosidad te lleve.</span></div>
        </> : <>
          <button className="text-button back-button" onClick={resetHome}><ArrowLeft size={15} />Volver a la vista general</button>
          <span className="eyebrow">CINCO FORMAS DE EXPLORAR</span>
          <h1 className="expedition-heading">Cada pregunta,<br /><em>un comienzo.</em></h1>
          <p className="list-description">Elegí una propuesta y empezá a imaginar el recorrido.</p>
          <div className="expedition-list">{expeditions.map(expedition => {
            const Icon = icons[expedition.icon]
            return <button key={expedition.id} className="expedition-card" onClick={() => setSelected(expedition.id)} style={{ '--exp-color': expedition.color }}>
              <span className="expedition-icon"><Icon size={23} strokeWidth={1.5} /></span>
              <span className="expedition-copy"><strong>{expedition.title}</strong><small>{expedition.location ? 'Referencia verificada' : 'Propuesta · ubicación pendiente'}</small></span>
              <ArrowUpRight className="card-arrow" size={18} />
            </button>
          })}</div>
          <p className="list-note"><MapPin size={14} /><span>{expeditions.filter(e => e.location).length} referencia en el mapa · {expeditions.filter(e => !e.location).length} propuestas por ubicar</span></p>
        </>}
      </section>

      <section className="map-section" aria-label="Maqueta interactiva de la Antártida">
        <div className="map-heading"><span className="eyebrow">VISTA POLAR / ANTÁRTIDA</span><span className="live-indicator"><span />{sceneError ? 'Vista alternativa' : ready ? 'Exploración libre' : 'Cargando maqueta'}</span></div>
        <div className="map-canvas" role="group" aria-label="Visor 3D. Arrastrá para girar y usá dos dedos para acercar o alejar. También hay botones de zoom y restaurar vista.">
          <Suspense fallback={<div className="scene-loading" role="status"><span className="loading-orbit" />Preparando el continente…</div>}>
            <AntarcticaScene showExpeditions={showExpeditions} expeditions={expeditions} selected={selected}
              onSelect={setSelected} command={command} autoRotate={autoRotate && !selected && !aboutOpen} onReady={onReady} onError={onError} />
          </Suspense>
        </div>
        <div className="ocean-label" aria-hidden="true">O C É A N O &nbsp; A U S T R A L</div>
        <div className="compass" aria-hidden="true"><Compass size={34} strokeWidth={0.8} /><span>VISTA SUR</span></div>
        <div className="map-toolbar" aria-label="Controles de la maqueta">
          <button className="icon-button" onClick={() => sendCommand('zoom-in')} aria-label="Acercar" title="Acercar"><Plus size={19} /></button>
          <button className="icon-button" onClick={() => sendCommand('zoom-out')} aria-label="Alejar" title="Alejar"><Minus size={19} /></button>
          <span className="toolbar-divider" />
          <button className="icon-button" onClick={() => sendCommand('reset')} aria-label="Restaurar vista" title="Restaurar vista"><RotateCcw size={17} /></button>
          <button className={`icon-button ${autoRotate ? 'active' : ''}`} onClick={() => setAutoRotate(a => !a)} aria-label={autoRotate ? 'Pausar giro automático' : 'Activar giro automático'} aria-pressed={autoRotate} title="Giro automático">{autoRotate ? <Pause size={17} /> : <Play size={17} />}</button>
        </div>
        {showExpeditions && <div className="map-legend"><span className="source-dot verified-dot" />Base verificada <span className="legend-separator" />Otras propuestas sin punto asignado</div>}
        <div className="gesture-hint"><Hand size={15} strokeWidth={1.5} /><span>Arrastrá para girar <span className="hint-dot">·</span> Pellizcá para acercar</span></div>
      </section>
    </main>

    <footer className="footer"><div className="model-note"><Layers3 size={15} /><span>Contorno geográfico abierto <span>·</span> Relieve ilustrativo</span><button onClick={() => setAboutOpen(true)} aria-label="Ver fuentes y límites de la maqueta"><Info size={14} /></button></div><span className="footer-caption">La ciencia empieza con una pregunta.</span><span className="version">DEMO / 0.1</span></footer>
    <ExpeditionDetail expedition={selectedExpedition} onClose={() => setSelected(null)} />
    <About open={aboutOpen} onClose={() => setAboutOpen(false)} />
  </div>
}

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>)
