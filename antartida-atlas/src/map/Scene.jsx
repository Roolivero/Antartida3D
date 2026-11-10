import { Component, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Line, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { createTerrain } from './geometry'
import { project } from '../data/geography'

class SceneBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error) { this.props.onError(error) }
  render() { return this.state.failed ? null : this.props.children }
}

const terrainCache = new WeakMap()
function Continent({ geography }) {
  const geometry = useMemo(() => {
    if (!terrainCache.has(geography)) terrainCache.set(geography, createTerrain(geography))
    return terrainCache.get(geography)
  }, [geography])
  return <group dispose={null}>
    <mesh geometry={geometry.top}><meshStandardMaterial vertexColors roughness={0.94} side={THREE.DoubleSide} /></mesh>
    <mesh geometry={geometry.sides}><meshStandardMaterial color="#83afb5" roughness={0.85} side={THREE.DoubleSide} /></mesh>
  </group>
}

function Graticule() {
  const { rings, meridians } = useMemo(() => ({
    rings: [1.75, 3.5, 5.25, 7].map(r => Array.from({ length: 129 }, (_, i) => {
      const a = i / 128 * Math.PI * 2
      return [Math.sin(a) * r, -0.13, Math.cos(a) * r]
    })),
    meridians: Array.from({ length: 12 }, (_, i) => {
      const a = i / 12 * Math.PI * 2
      return [[0, -0.13, 0], [Math.sin(a) * 7, -0.13, Math.cos(a) * 7]]
    }),
  }), [])
  return <group>{[...rings, ...meridians].map((points, i) =>
    <Line key={i} points={points} color="#6d9ba4" transparent opacity={i < 4 ? 0.22 : 0.12} lineWidth={0.7} />
  )}</group>
}

function BaseMarker({ expedition }) {
  const [x, z] = project(expedition.location)
  return <group position={[x, 0, z]}>
    <Line points={[[0, 0, 0], [0, 0.65, 0]]} color="#d8bd83" lineWidth={1.3} />
    <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.07, 0.105, 32]} /><meshBasicMaterial color="#d8bd83" side={THREE.DoubleSide} />
    </mesh>
  </group>
}

const regionAnnotations = [
  { id: 'east', position: [1.5, 0.55, 0.2], kind: 'region', text: <>Antártida<br />oriental</> },
  { id: 'west', position: [-1.35, 0.45, 0.75], kind: 'region', text: <>Antártida<br />occidental</> },
  { id: 'weddell', position: [-1.65, 0.05, -2.1], kind: 'sea', text: 'Mar de Weddell' },
  { id: 'ross', position: [0.25, 0.05, 3.55], kind: 'sea', text: 'Mar de Ross' },
]

/** Project DOM annotations owned by the main React root, avoiding nested roots. */
function ScreenPositions({ annotations, elements }) {
  const { camera, size, invalidate } = useThree()
  const point = useMemo(() => new THREE.Vector3(), [])
  useEffect(() => { invalidate() }, [annotations, invalidate])
  useFrame(() => {
    camera.updateMatrixWorld()
    for (const item of annotations) {
      const element = elements.current.get(item.id)
      if (!element) continue
      point.set(...item.position).project(camera)
      const x = (point.x + 1) * size.width / 2, y = (1 - point.y) * size.height / 2
      element.style.transform = `translate3d(${x}px,${y}px,0) translate(-50%,-50%)`
      element.style.visibility = point.z < -1 || point.z > 1 || x < -100 || x > size.width + 100 || y < -50 || y > size.height + 50 ? 'hidden' : 'visible'
    }
  })
  return null
}

function Navigation({ command, onInteract, reducedMotion }) {
  const controls = useRef(), tween = useRef(null)
  const { camera, size, invalidate } = useThree()
  const baseZoom = Math.min(size.width / (size.width < 650 ? 9 : 10.8), size.height / 8.7)
  const base = useRef(baseZoom)
  base.current = baseZoom

  const moveTo = (position, target, zoom) => {
    if (reducedMotion) {
      camera.position.copy(position); controls.current.target.copy(target)
      camera.zoom = zoom; camera.updateProjectionMatrix(); controls.current.update(); invalidate()
    } else {
      tween.current = { start: performance.now(), from: camera.position.clone(), to: position, lookFrom: controls.current.target.clone(), lookTo: target, zoomFrom: camera.zoom, zoomTo: zoom }
      invalidate()
    }
  }

  useEffect(() => {
    if (!controls.current) return
    tween.current = null
    camera.position.set(0, 11, 9.5)
    camera.zoom = baseZoom
    controls.current.target.set(0, 0, 0)
    camera.updateProjectionMatrix(); controls.current.update(); invalidate()
  }, [baseZoom, camera, invalidate])

  useEffect(() => {
    if (!controls.current) return
    if (command.type === 'zoom-in' || command.type === 'zoom-out') {
      moveTo(camera.position.clone(), controls.current.target.clone(), THREE.MathUtils.clamp(camera.zoom * (command.type === 'zoom-in' ? 1.3 : 1 / 1.3), base.current * 0.7, base.current * 3.6))
    } else if (command.type === 'focus' && command.location) {
      const [x, z] = project(command.location)
      const target = new THREE.Vector3(x, 0, z)
      moveTo(target.clone().add(new THREE.Vector3(0, 11, 9.5)), target, base.current * 1.65)
    } else if (command.type === 'top') {
      moveTo(new THREE.Vector3(0, 14.5, 0.001), new THREE.Vector3(), base.current * 0.95)
    } else if (command.type === 'reset') {
      moveTo(new THREE.Vector3(0, 11, 9.5), new THREE.Vector3(), base.current)
    } else if (command.type.startsWith('move-')) {
      const target = controls.current.target.clone()
      const offset = camera.position.clone().sub(target)
      const spherical = new THREE.Spherical().setFromVector3(offset)
      if (command.type === 'move-left') spherical.theta -= Math.PI / 10
      if (command.type === 'move-right') spherical.theta += Math.PI / 10
      if (command.type === 'move-up') spherical.phi = Math.max(0.05, spherical.phi - 0.15)
      if (command.type === 'move-down') spherical.phi = Math.min(Math.PI / 2.7, spherical.phi + 0.15)
      moveTo(target.clone().add(new THREE.Vector3().setFromSpherical(spherical)), target, camera.zoom)
    }
  }, [command])

  useFrame(() => {
    if (!tween.current || !controls.current) return
    const t = Math.min((performance.now() - tween.current.start) / 700, 1)
    const ease = 1 - (1 - t) ** 3, state = tween.current
    camera.position.lerpVectors(state.from, state.to, ease)
    controls.current.target.lerpVectors(state.lookFrom, state.lookTo, ease)
    camera.zoom = THREE.MathUtils.lerp(state.zoomFrom, state.zoomTo, ease)
    camera.updateProjectionMatrix(); controls.current.update()
    if (t === 1) tween.current = null
    else invalidate()
  })

  return <OrbitControls ref={controls} makeDefault enablePan={false} enableDamping={!reducedMotion} dampingFactor={0.12}
    minZoom={baseZoom * 0.7} maxZoom={baseZoom * 3.6} minPolarAngle={0.001} maxPolarAngle={Math.PI / 2.7}
    rotateSpeed={0.55} zoomSpeed={0.7} onStart={() => { tween.current = null; onInteract() }} />
}

function Ready({ onReady, onError }) {
  const { gl, invalidate } = useThree()
  useEffect(() => {
    const lost = e => { e.preventDefault(); onError(new Error('context-lost')) }
    gl.domElement.addEventListener('webglcontextlost', lost)
    const frame = requestAnimationFrame(() => { invalidate(); onReady() })
    return () => { cancelAnimationFrame(frame); gl.domElement.removeEventListener('webglcontextlost', lost) }
  }, [gl, invalidate, onReady, onError])
  return null
}

export default function Scene({ geography, expeditions, selected, command, layers, reducedMotion, onSelect, onReady, onError, onInteract }) {
  const elements = useRef(new Map())
  const annotations = useMemo(() => [
    ...(layers.labels ? regionAnnotations : []),
    ...(layers.markers ? expeditions.filter(e => e.location).map(expedition => {
      const [x, z] = project(expedition.location)
      return { id: expedition.id, position: [x, 0.65, z], kind: 'marker', expedition }
    }) : []),
  ], [layers, expeditions])
  return <SceneBoundary onError={onError}>
    <div className="scene-shell">
    <Canvas orthographic camera={{ position: [0, 11, 9.5], zoom: 65, near: 0.1, far: 100 }} dpr={[1, 1.7]} frameloop="demand"
      gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }} fallback={<span>Visor 3D. También podés explorar la vista 2D.</span>}>
      <ambientLight intensity={0.7} />
      <hemisphereLight args={['#ecf5ef', '#376370', 1.6]} />
      <directionalLight position={[-6, 10, 5]} color="#fff7e6" intensity={2.3} />
      <directionalLight position={[5, 3, -5]} color="#b3e2ed" intensity={0.7} />
      {layers.grid && <Graticule />}
      <Continent geography={geography} />
      {layers.markers && expeditions.filter(e => e.location).map(e => <BaseMarker key={e.id} expedition={e} />)}
      <Navigation command={command} onInteract={onInteract} reducedMotion={reducedMotion} />
      <ScreenPositions annotations={annotations} elements={elements} />
      <Ready onReady={onReady} onError={onError} />
    </Canvas>
    <div className="scene-annotations">{annotations.map(item =>
      <div key={item.id} ref={el => { if (el) elements.current.set(item.id, el); else elements.current.delete(item.id) }} className={`scene-annotation annotation-${item.kind}`}>
        {item.kind === 'marker' ? <button className={`place-marker ${selected === item.id ? 'is-selected' : ''}`} onClick={e => onSelect(item.id, e.currentTarget)} aria-label={`Ver ${item.expedition.title} en el mapa`}>
          <span className="marker-center" /><span>{item.expedition.title}</span><span className="marker-number">05</span>
        </button> : <span className={item.kind === 'sea' ? 'sea-label' : 'region-label'}>{item.text}</span>}
      </div>
    )}</div>
    </div>
  </SceneBoundary>
}
