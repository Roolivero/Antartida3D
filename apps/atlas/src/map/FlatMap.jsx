import { useEffect, useMemo, useRef, useState } from 'react'
import { project } from '../data/geography'
import { displayRings } from './coastline.js'

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const initialView = { k: 1, x: 0, y: 0 }

export default function FlatMap({ geography, expeditions, selected, command, layers, onSelect, onReady, onInteract }) {
  const root = useRef(), drag = useRef(null)
  const [size, setSize] = useState({ width: 600, height: 600 })
  const [view, setView] = useState(initialView)
  const scale = Math.min(size.width / 12, size.height / 11.4)
  const paths = useMemo(() => geography.features.map(feature => displayRings(feature).map(ring =>
    ring.map((p, i) => `${i ? 'L' : 'M'}${project(p).map(n => n.toFixed(4)).join(',')}`).join('') + 'Z').join('')), [geography])

  useEffect(() => {
    const el = root.current
    const resize = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }))
    resize.observe(el)
    onReady()
    const wheel = e => { e.preventDefault(); onInteract(); setView(v => ({ ...v, k: clamp(v.k * Math.exp(-e.deltaY * 0.0015), 0.8, 3.6) })) }
    el.addEventListener('wheel', wheel, { passive: false })
    return () => { resize.disconnect(); el.removeEventListener('wheel', wheel) }
  }, [onReady, onInteract])

  useEffect(() => {
    if (command.type === 'reset' || command.type === 'top') setView(initialView)
    else if (command.type === 'zoom-in' || command.type === 'zoom-out') setView(v => ({ ...v, k: clamp(v.k * (command.type === 'zoom-in' ? 1.3 : 1 / 1.3), 0.8, 3.6) }))
    else if (command.type === 'focus' && command.location) {
      const [x, y] = project(command.location)
      setView({ k: 1.65, x: -x * 1.65, y: -y * 1.65 })
    } else if (command.type.startsWith('move-')) {
      const delta = { 'move-left': [0.6, 0], 'move-right': [-0.6, 0], 'move-up': [0, 0.6], 'move-down': [0, -0.6] }[command.type]
      if (delta) setView(v => ({ ...v, x: clamp(v.x + delta[0], -8, 8), y: clamp(v.y + delta[1], -8, 8) }))
    }
  }, [command])

  return <div ref={root} className="flat-map" onPointerDown={e => {
    if (e.target.closest('button')) return
    root.current.setPointerCapture(e.pointerId)
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, view }
    onInteract()
  }} onPointerMove={e => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    setView({ ...d.view, x: clamp(d.view.x + (e.clientX - d.x) / scale, -8, 8), y: clamp(d.view.y + (e.clientY - d.y) / scale, -8, 8) })
  }} onPointerUp={() => { drag.current = null }} onPointerCancel={() => { drag.current = null }}>
    <svg viewBox="-6 -5.7 12 11.4" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="ice" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#f0f4ea" /><stop offset="1" stopColor="#a8c6c9" /></linearGradient>
        <filter id="coast-shadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="0.07" stdDeviation="0.11" floodColor="#020f16" floodOpacity=".5" /></filter>
      </defs>
      <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
        {layers.grid && <g fill="none" stroke="#709aa3" strokeWidth=".008" opacity=".3">
          {[1.75, 3.5, 5.25, 7].map(r => <circle key={r} r={r} />)}
          {Array.from({ length: 12 }, (_, i) => <line key={i} x2={Math.sin(i / 6 * Math.PI) * 7} y2={Math.cos(i / 6 * Math.PI) * 7} opacity=".65" />)}
        </g>}
        <g fill="url(#ice)" stroke="#a5c3c6" strokeWidth=".012" filter="url(#coast-shadow)">{paths.map((d, i) => <path key={i} d={d} fillRule="evenodd" />)}</g>
        {layers.labels && <g className="flat-labels" fontSize={12 / (scale * view.k)} textAnchor="middle" fill="#35545a">
          <text x="1.2" y="0"><tspan x="1.2">Antártida</tspan><tspan x="1.2" dy="1.15em">oriental</tspan></text><text x="-1.7" y="1"><tspan x="-1.7">Antártida</tspan><tspan x="-1.7" dy="1.15em">occidental</tspan></text>
          <text x="-1.7" y="-2.1" fill="#a6c2c7" fontStyle="italic">Mar de Weddell</text>
          <text x=".3" y="3.6" fill="#a6c2c7" fontStyle="italic">Mar de Ross</text>
        </g>}
      </g>
    </svg>
    {layers.markers && expeditions.filter(e => e.location).map(expedition => {
      const [x, y] = project(expedition.location)
      return <button key={expedition.id} className={`place-marker flat-marker ${selected === expedition.id ? 'is-selected' : ''}`}
        style={{ left: size.width / 2 + (x * view.k + view.x) * scale, top: size.height / 2 + (y * view.k + view.y) * scale }}
        onClick={e => onSelect(expedition.id, e.currentTarget)} aria-label={`Ver ${expedition.title} en el mapa`}>
        <span className="marker-center" /><span>{expedition.title}</span><span className="marker-number">05</span>
      </button>
    })}
  </div>
}
