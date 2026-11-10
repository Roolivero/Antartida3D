import { Component, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { Html, Line, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { createTerrain } from './terrain'
import { project } from './data/geography'

export class SceneBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error) { console.warn('3D viewer unavailable:', error.message); this.props.onError?.() }
  render() { return this.state.failed ? this.props.fallback : this.props.children }
}

function Continent({ geography }) {
  const { top, sides } = useMemo(() => createTerrain(geography), [geography])
  const bottom = useMemo(() => {
    const geometry = top.clone()
    const position = geometry.getAttribute('position')
    for (let i = 0; i < position.count; i++) position.setY(i, -0.19)
    geometry.computeVertexNormals()
    return geometry
  }, [top])
  useEffect(() => () => { top.dispose(); sides.dispose(); bottom.dispose() }, [top, sides, bottom])
  return <group>
    <mesh geometry={top}>
      <meshStandardMaterial vertexColors roughness={0.92} side={THREE.DoubleSide} />
    </mesh>
    <mesh geometry={sides}>
      <meshStandardMaterial color="#74abb7" roughness={0.75} side={THREE.DoubleSide} />
    </mesh>
    <mesh geometry={bottom}><meshStandardMaterial color="#407b8a" roughness={0.9} side={THREE.DoubleSide} /></mesh>
  </group>
}

function Ocean() {
  const meridians = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const angle = (i * Math.PI) / 6
    return [[0, -0.27, 0], [Math.sin(angle) * 5.5, -0.27, Math.cos(angle) * 5.5]]
  }), [])
  const rings = useMemo(() => [1.3, 2.65, 4.02, 5.5].map(r => Array.from({ length: 129 }, (_, i) => {
    const a = (i / 128) * Math.PI * 2
    return [Math.sin(a) * r, -0.27, Math.cos(a) * r]
  })), [])
  return <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.3, 0]}>
      <circleGeometry args={[5.55, 128]} />
      <meshStandardMaterial color="#0d3946" transparent opacity={0.6} roughness={0.82} />
    </mesh>
    {rings.map((points, i) => <Line key={i} points={points} color="#5a8a91" transparent opacity={0.22} lineWidth={0.65} />)}
    {meridians.map((points, i) => <Line key={i} points={points} color="#5a8a91" transparent opacity={0.14} lineWidth={0.65} />)}
  </group>
}

function Marker({ expedition, selected, onSelect }) {
  const [x, z] = project(expedition.location)
  return <group position={[x, 0, z]}>
    <Line points={[[0, -0.2, 0], [0, 0.65, 0]]} color="#a4e6cc" lineWidth={1.5} />
    <mesh position={[0, -0.24, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.08, 0.12, 32]} /><meshBasicMaterial color="#9ce0c9" side={THREE.DoubleSide} />
    </mesh>
    <Html center position={[0, 0.65, 0]} zIndexRange={[20, 0]}>
      <button className={`map-marker ${selected ? 'selected' : ''}`} onClick={onSelect} aria-label={`Abrir expedición ${expedition.title}`}>
        <span className="marker-dot" /><span>{expedition.title}</span><span className="marker-arrow">↗</span>
      </button>
    </Html>
  </group>
}

function ViewControls({ command, autoRotate }) {
  const controls = useRef()
  const { camera, size, invalidate } = useThree()
  useEffect(() => {
    const mobile = size.width < 650
    camera.position.set(0, mobile ? 9.5 : 8.1, mobile ? 12.8 : 10.8)
    controls.current?.target.set(0, 0, 0)
    controls.current?.update()
    invalidate()
  }, [camera, size.width, invalidate])
  useEffect(() => {
    if (!controls.current) return
    if (command.type === 'reset') {
      camera.position.set(0, size.width < 650 ? 9.5 : 8.1, size.width < 650 ? 12.8 : 10.8)
      controls.current.target.set(0, 0, 0)
    } else if (command.type === 'zoom-in' || command.type === 'zoom-out') {
      const target = controls.current.target
      const offset = camera.position.clone().sub(target)
      const distance = THREE.MathUtils.clamp(offset.length() * (command.type === 'zoom-in' ? 0.8 : 1.25), 5, 23)
      camera.position.copy(target).add(offset.setLength(distance))
    }
    controls.current.update()
    invalidate()
  }, [command, camera, size.width, invalidate])
  return <OrbitControls ref={controls} makeDefault enablePan={false} enableDamping dampingFactor={0.08}
    minDistance={5} maxDistance={23} minPolarAngle={0.1} maxPolarAngle={Math.PI * 0.62}
    autoRotate={autoRotate} autoRotateSpeed={0.45} rotateSpeed={0.65} zoomSpeed={0.8}
    touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }} />
}

export default function AntarcticaScene({ showExpeditions, expeditions, selected, onSelect, command, autoRotate, onReady, onError }) {
  const [geography, setGeography] = useState(null)
  const [failure, setFailure] = useState(false)
  const [webglReady, setWebglReady] = useState(false)
  const [contextFailed, setContextFailed] = useState(false)
  const handleContextError = useCallback(() => { setContextFailed(true); setWebglReady(false); onError() }, [onError])
  useEffect(() => {
    const controller = new AbortController()
    fetch('/data/antarctica.geojson', { signal: controller.signal })
      .then(r => { if (!r.ok) throw new Error('Geografía no disponible'); return r.json() })
      .then(setGeography)
      .catch(error => { if (error.name !== 'AbortError') { setFailure(true); onError() } })
    return () => controller.abort()
  }, [onError])
  if (failure) return <div className="scene-fallback"><img src="/antarctica-outline.svg" alt="Contorno de la Antártida, vista polar" /><p>No pudimos cargar el mapa. Recargá para reintentar; las expediciones siguen disponibles.</p></div>
  if (!geography) return <div className="scene-loading" role="status"><span className="loading-orbit" />Preparando el continente…</div>
  const fallback = <div className="scene-fallback" aria-hidden={webglReady}><img src="/antarctica-outline.svg" alt="Contorno antártico en vista polar" /><p>Vista 2D · Este dispositivo no pudo iniciar el visor 3D. Podés explorar todas las fichas.</p></div>
  if (contextFailed) return fallback
  return <SceneBoundary fallback={fallback} onError={handleContextError}>
    <Canvas camera={{ position: [0, 8.1, 10.8], fov: 42, near: 0.1, far: 60 }} dpr={[1, 1.6]} frameloop="demand"
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }} fallback={fallback}
      onCreated={({ gl }) => { gl.domElement.addEventListener('webglcontextlost', handleContextError, { once: true }); setWebglReady(true); onReady() }}>
      <ambientLight intensity={0.65} />
      <hemisphereLight args={['#e4f5fa', '#1f5265', 1.8]} />
      <directionalLight position={[-4, 8, 3]} intensity={3.1} color="#fff5dd" />
      <directionalLight position={[5, 2, -5]} intensity={1.1} color="#6cbedb" />
      <Suspense fallback={null}>
        <Ocean /><Continent geography={geography} />
        {showExpeditions && expeditions.filter(e => e.location).map(e => <Marker key={e.id} expedition={e} selected={selected === e.id} onSelect={() => onSelect(e.id)} />)}
      </Suspense>
      <ViewControls command={command} autoRotate={autoRotate} />
    </Canvas>
  </SceneBoundary>
}
