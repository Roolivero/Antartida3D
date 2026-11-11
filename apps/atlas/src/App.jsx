import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { ArrowUpRight, Check, Compass, Globe2, HelpCircle, Info, Layers3, List, Map, Minus, MountainSnow, Navigation, Plus, RotateCcw, X } from 'lucide-react'
import { expeditions } from './data/expeditions'
import { ExpeditionDetail, ExpeditionList } from './components/Expeditions'
import AboutDialog from './components/AboutDialog'
import FlatMap from './map/FlatMap'

const Scene = lazy(() => import('./map/Scene'))
const layerOptions = [['markers', 'Sitios ubicados'], ['labels', 'Nombres de regiones'], ['grid', 'Líneas de referencia']]

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  return reduced
}

export default function App() {
  const [geography, setGeography] = useState(null), [geographyError, setGeographyError] = useState(false)
  const [retry, setRetry] = useState(0), [selected, setSelected] = useState(null), [filter, setFilter] = useState('todas')
  const [mode, setMode] = useState('3d'), [ready, setReady] = useState(false), [fallback, setFallback] = useState(false)
  const [layers, setLayers] = useState({ grid: true, labels: true, markers: true }), [layersOpen, setLayersOpen] = useState(false)
  const [panel, setPanel] = useState('peek'), [dialog, setDialog] = useState(null), [interacted, setInteracted] = useState(false)
  const [command, setCommand] = useState({ type: 'reset', id: 0 })
  const previousTrigger = useRef(null), previousSelection = useRef(null), panelBody = useRef(), layersRef = useRef(), layersButton = useRef()
  const reducedMotion = useReducedMotion()
  const expedition = expeditions.find(e => e.id === selected)
  const onReady = useCallback(() => setReady(true), [])
  const onInteract = useCallback(() => setInteracted(true), [])
  const sendCommand = useCallback((type, location) => { setCommand(v => ({ type, location, id: v.id + 1 })); setInteracted(true) }, [])
  const onError = useCallback(() => { setMode('2d'); setFallback(true); setReady(false) }, [])

  useEffect(() => {
    const controller = new AbortController()
    setGeographyError(false)
    fetch('/data/antarctica.geojson', { signal: controller.signal }).then(r => {
      if (!r.ok) throw new Error('geography-unavailable')
      return r.json()
    }).then(setGeography).catch(error => { if (error.name !== 'AbortError') setGeographyError(true) })
    return () => controller.abort()
  }, [retry])

  const selectExpedition = useCallback((id, trigger) => {
    if (trigger) previousTrigger.current = trigger
    previousSelection.current = id
    setSelected(id); setPanel('open'); setLayersOpen(false)
    const item = expeditions.find(e => e.id === id)
    if (item.location) {
      setLayers(v => ({ ...v, markers: true }))
      sendCommand('focus', item.location)
    } else sendCommand('reset')
    panelBody.current?.scrollTo({ top: 0 })
  }, [sendCommand])

  const closeDetail = useCallback(() => {
    setSelected(null); setPanel(window.matchMedia('(max-width: 800px)').matches ? 'open' : 'peek')
    sendCommand('reset')
    requestAnimationFrame(() => {
      if (previousTrigger.current?.isConnected) previousTrigger.current.focus({ preventScroll: true })
      else {
        const card = document.querySelector(`[data-expedition-id="${previousSelection.current}"]`) ?? document.querySelector('.expedition-item')
        card?.focus({ preventScroll: true })
        card?.scrollIntoView({ block: 'nearest' })
      }
    })
  }, [sendCommand])

  useEffect(() => {
    const escape = e => {
      if (e.key !== 'Escape' || dialog) return
      if (layersOpen) { setLayersOpen(false); layersButton.current?.focus() }
      else if (selected) closeDetail()
      else setPanel('peek')
    }
    window.addEventListener('keydown', escape)
    return () => window.removeEventListener('keydown', escape)
  }, [dialog, layersOpen, selected, closeDetail])

  useEffect(() => {
    if (!layersOpen) return
    const outside = e => { if (!layersRef.current?.contains(e.target) && !layersButton.current?.contains(e.target)) setLayersOpen(false) }
    window.addEventListener('pointerdown', outside)
    return () => window.removeEventListener('pointerdown', outside)
  }, [layersOpen])

  useEffect(() => {
    if (!fallback) return
    const timeout = setTimeout(() => setFallback(false), 7000)
    return () => clearTimeout(timeout)
  }, [fallback])

  const changeMode = value => { if (value !== mode) { setMode(value); setReady(false); setLayersOpen(false) } }
  const home = () => { setSelected(null); setFilter('todas'); setPanel('peek'); sendCommand('reset') }

  return <div className={`atlas-app ${selected ? 'has-selection' : ''} panel-${panel}`}>
    <a className="skip-link" href="#expeditions">Ir a las expediciones</a>
    <header className="site-header">
      <button className="brand" onClick={home} aria-label="Antártida por descubrir, volver a la vista general"><span className="brand-symbol"><MountainSnow size={29} strokeWidth={1.1} /></span><span className="brand-name">Antártida<small>POR DESCUBRIR</small></span></button>
      <nav className="desktop-nav" aria-label="Principal"><button className="nav-current" onClick={home}><Globe2 size={16} />Explorar el atlas</button><button onClick={() => setDialog('about')}>El proyecto<ArrowUpRight size={14} /></button></nav>
      <div className="header-origin"><Navigation size={15} strokeWidth={1.4} /><span>Desde Ushuaia<small>TIERRA DEL FUEGO, ARGENTINA</small></span></div>
      <button className="mobile-info icon-button" aria-label="Acerca del proyecto" onClick={() => setDialog('about')}><Info size={21} /></button>
    </header>

    <main className="atlas-main" aria-label="Atlas de expediciones antárticas">
      <section className="map-stage" aria-label={`Mapa interactivo de la Antártida, vista ${mode.toUpperCase()}`} tabIndex={0} onKeyDown={e => {
        if (e.target !== e.currentTarget) return
        const key = { '+': 'zoom-in', '=': 'zoom-in', '-': 'zoom-out', ArrowLeft: 'move-left', ArrowRight: 'move-right', ArrowUp: 'move-up', ArrowDown: 'move-down', Home: 'reset' }[e.key]
        if (key) { e.preventDefault(); sendCommand(key) }
      }}>
        {geography && <Suspense fallback={null}>{mode === '3d' ? <Scene geography={geography} expeditions={expeditions} selected={selected} command={command} layers={layers} reducedMotion={reducedMotion}
          onSelect={selectExpedition} onReady={onReady} onError={onError} onInteract={onInteract} /> :
          <FlatMap geography={geography} expeditions={expeditions} selected={selected} command={command} layers={layers} onSelect={selectExpedition} onReady={onReady} onInteract={onInteract} />}</Suspense>}
        {!ready && !geographyError && <div className="map-loading" role="status"><img src="/antarctica-outline.svg" alt="" /><span><span className="loading-dot" />Preparando el continente…</span></div>}
        {geographyError && <div className="map-error" role="alert"><Globe2 size={36} strokeWidth={1} /><h2>El continente espera.</h2><p>No pudimos cargar el mapa. Las propuestas siguen disponibles.</p><button className="primary-button" onClick={() => setRetry(n => n + 1)}>Volver a intentar<RotateCcw size={17} /></button></div>}
      </section>

      <div className="map-topline" aria-hidden="true"><span className="small-rule" />ANTÁRTIDA / VISTA POLAR<span className="live-dot" /><span>{ready ? 'Exploración libre' : 'Cargando'}</span></div>

      <div className="view-switch" role="group" aria-label="Modo de visualización">
        <button aria-pressed={mode === '2d'} onClick={() => changeMode('2d')}><Map size={15} />2D</button>
        <button aria-pressed={mode === '3d'} onClick={() => changeMode('3d')}><Layers3 size={15} />3D</button>
      </div>
      <button className="map-compass" onClick={() => sendCommand('reset')} aria-label="Orientar y recuperar la vista general"><Compass size={43} strokeWidth={0.8} /><span>VISTA SUR</span></button>

      <aside className={`explorer-panel ${selected ? 'detail-panel' : ''}`} id="expeditions" aria-label={selected ? 'Ficha de expedición' : 'Propuestas de expedición'}>
        <button className="sheet-handle" onClick={() => setPanel(v => v === 'open' ? 'peek' : 'open')} aria-expanded={panel === 'open'} aria-label={panel === 'open' ? 'Contraer expediciones' : 'Expandir expediciones'}><span /></button>
        <div className="mobile-panel-heading"><span>{selected ? 'Una pregunta para explorar' : 'Expediciones por descubrir'}</span><button className="icon-button" onClick={() => selected ? closeDetail() : setPanel('closed')} aria-label={selected ? 'Cerrar ficha de expedición' : 'Ocultar expediciones'}><X size={18} /></button></div>
        <div className="panel-body" ref={panelBody}>
          {expedition ? <ExpeditionDetail expedition={expedition} onClose={closeDetail} onLocate={() => { setLayers(v => ({ ...v, markers: true })); sendCommand('focus', expedition.location) }}
            onNext={() => selectExpedition(expeditions[(expeditions.findIndex(e => e.id === selected) + 1) % expeditions.length].id)} /> :
            <ExpeditionList expeditions={expeditions} onSelect={selectExpedition} filter={filter} onFilter={setFilter} />}
        </div>
      </aside>

      <div className="map-tools" aria-label="Herramientas del mapa">
        <div className="tool-group"><button className="icon-button" onClick={() => sendCommand('zoom-in')} aria-label="Acercar" title="Acercar"><Plus size={21} /></button><span /><button className="icon-button" onClick={() => sendCommand('zoom-out')} aria-label="Alejar" title="Alejar"><Minus size={21} /></button></div>
        <button className="icon-button solo-tool" onClick={() => sendCommand('reset')} aria-label="Ver todo el continente" title="Ver todo el continente"><RotateCcw size={18} /></button>
        <button ref={layersButton} className="icon-button solo-tool" aria-expanded={layersOpen} aria-controls="map-layers" onClick={() => setLayersOpen(v => !v)} aria-label="Capas del mapa" title="Capas del mapa"><Layers3 size={19} /></button>
        <button className="icon-button solo-tool help-tool" onClick={() => setDialog('help')} aria-label="Cómo explorar el mapa" title="Cómo explorar el mapa"><HelpCircle size={19} /></button>
      </div>

      {layersOpen && <section className="layers-popover" ref={layersRef} id="map-layers" aria-label="Capas del mapa"><div><h2>Tu forma de mirar</h2><button className="icon-button" onClick={() => setLayersOpen(false)} aria-label="Cerrar capas"><X size={17} /></button></div>
        {layerOptions.map(([key, label]) => <label key={key}><input type="checkbox" checked={layers[key]} onChange={e => setLayers(v => ({ ...v, [key]: e.target.checked }))} /><span className="checkbox-visual"><Check size={12} /></span>{label}</label>)}
        <p>Activá las referencias que te ayuden a explorar.</p></section>}

      <div className={`map-invitation ${interacted ? 'is-quiet' : ''}`}><span className="invitation-line" /><span className="invitation-desktop">{mode === '3d' ? 'Giralo. Acercate. Dejá que te sorprenda.' : 'Acercate. Cada lugar abre una pregunta.'}</span><span className="invitation-mobile">{mode === '3d' ? 'Arrastrá para girar · Pellizcá para acercar' : 'Arrastrá para mover · Acercate con + y −'}</span></div>
      {fallback && <div className="fallback-notice" role="status"><Info size={16} /><span>Seguís explorando en 2D: el visor 3D no está disponible.</span><button className="icon-button" onClick={() => setFallback(false)} aria-label="Cerrar aviso"><X size={15} /></button></div>}

      <footer className="atlas-footer"><button onClick={() => setDialog('about')}><Layers3 size={14} /><span>Relieve ilustrativo</span><Info size={13} /></button><span className="footer-thought">La ciencia empieza con una pregunta.</span><span className="map-key"><span className="key-dot" />1 referencia ubicada<span className="footer-divider" />5 propuestas</span></footer>
    </main>
    <nav className="mobile-nav" aria-label="Navegación móvil"><button aria-current={panel === 'closed' ? 'page' : undefined} onClick={() => { setPanel('closed'); setLayersOpen(false) }}><Globe2 size={20} /><span>Mapa</span></button>
      <button aria-current={panel !== 'closed' ? 'page' : undefined} onClick={() => setPanel('open')}><List size={20} /><span>Expediciones</span><span className="nav-count">5</span></button>
      <button onClick={() => setDialog('about')}><Info size={20} /><span>El proyecto</span></button></nav>
    <AboutDialog kind={dialog} onClose={() => setDialog(null)} />
  </div>
}
