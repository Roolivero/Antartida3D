import * as THREE from 'three'
import { illustrativeHeight, project } from '../data/geography.js'
import { displayRings } from './coastline.js'

/** Refine shared edges together so the illustrative surface has no T-junctions. */
export function createTerrain(collection) {
  const points = [], pointIds = new Map(), midpoints = new Map(), boundaries = []
  let triangles = []
  const edgeKey = (a, b) => a < b ? `${a}:${b}` : `${b}:${a}`
  const addPoint = p => {
    const key = `${p.x.toFixed(8)},${p.y.toFixed(8)}`
    if (!pointIds.has(key)) { pointIds.set(key, points.length); points.push(p) }
    return pointIds.get(key)
  }
  for (const feature of collection.features) {
    const rings = displayRings(feature).map(ring => ring.map(p => new THREE.Vector2(...project(p)))
      .filter((p, i, all) => !i || p.distanceToSquared(all[i - 1]) > 1e-12)).filter(r => r.length >= 3)
    for (const ring of rings) if (ring[0].equals(ring.at(-1))) ring.pop()
    if (!rings.length) continue
    const ids = rings.flat().map(addPoint)
    for (const tri of THREE.ShapeUtils.triangulateShape(rings[0], rings.slice(1))) triangles.push(tri.map(i => ids[i]))
    for (const ring of rings) for (let i = 0; i < ring.length; i++) boundaries.push([addPoint(ring[i]), addPoint(ring[(i + 1) % ring.length])])
  }
  for (let pass = 0; pass < 14; pass++) {
    const split = new Map()
    for (const [a, b, c] of triangles) for (const [u, v] of [[a, b], [b, c], [c, a]]) {
      const key = edgeKey(u, v)
      if (points[u].distanceToSquared(points[v]) > 0.04 && !split.has(key)) {
        const m = addPoint(points[u].clone().add(points[v]).multiplyScalar(0.5))
        split.set(key, m); midpoints.set(key, m)
      }
    }
    if (!split.size) break
    const next = []
    for (const [a, b, c] of triangles) {
      const ab = split.get(edgeKey(a, b)), bc = split.get(edgeKey(b, c)), ca = split.get(edgeKey(c, a))
      const count = [ab, bc, ca].filter(v => v !== undefined).length
      if (!count) next.push([a, b, c])
      else if (count === 3) next.push([a, ab, ca], [ab, b, bc], [ca, bc, c], [ab, bc, ca])
      else if (count === 1) {
        if (ab !== undefined) next.push([a, ab, c], [ab, b, c])
        else if (bc !== undefined) next.push([a, b, bc], [a, bc, c])
        else next.push([a, b, ca], [ca, b, c])
      } else if (ca === undefined) next.push([a, ab, c], [ab, bc, c], [ab, b, bc])
      else if (ab === undefined) next.push([b, bc, a], [bc, ca, a], [bc, c, ca])
      else next.push([c, ca, b], [ca, ab, b], [ca, a, ab])
    }
    triangles = next
  }

  // Index nearby coast segments to taper the fictional relief towards the real coast.
  const buckets = new Map(), cell = 0.45
  for (const [a, b] of boundaries) {
    const u = points[a], v = points[b]
    for (let x = Math.floor(Math.min(u.x, v.x) / cell); x <= Math.floor(Math.max(u.x, v.x) / cell); x++)
      for (let y = Math.floor(Math.min(u.y, v.y) / cell); y <= Math.floor(Math.max(u.y, v.y) / cell); y++) {
        const key = `${x},${y}`
        if (!buckets.has(key)) buckets.set(key, [])
        buckets.get(key).push([u, v])
      }
  }
  const heights = points.map(p => {
    let distance = cell
    const bx = Math.floor(p.x / cell), by = Math.floor(p.y / cell)
    for (let x = bx - 1; x <= bx + 1; x++) for (let y = by - 1; y <= by + 1; y++) {
      for (const [a, b] of buckets.get(`${x},${y}`) ?? []) {
        const dx = b.x - a.x, dy = b.y - a.y
        const length = dx * dx + dy * dy
        const t = length ? THREE.MathUtils.clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / length, 0, 1) : 0
        distance = Math.min(distance, Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy))
      }
    }
    return 0.035 + illustrativeHeight(p.x, p.y) * 0.95 * THREE.MathUtils.smoothstep(distance, 0, cell)
  })
  const positions = points.flatMap((p, i) => [p.x, heights[i], p.y])
  const top = new THREE.BufferGeometry()
  top.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  top.setIndex(triangles.flatMap(([a, b, c]) => [a, c, b]))
  top.computeVertexNormals()
  const normals = top.getAttribute('normal'), colors = [], color = new THREE.Color(), shade = new THREE.Color('#9fc1c5')
  for (let i = 0; i < points.length; i++) {
    color.set('#e6eee8').lerp(shade, Math.min(0.55, (1 - Math.abs(normals.getY(i))) * 0.65))
    colors.push(color.r, color.g, color.b)
  }
  top.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  const walls = []
  function wall(a, b) {
    const mid = midpoints.get(edgeKey(a, b))
    if (mid !== undefined) { wall(a, mid); wall(mid, b); return }
    const u = points[a], v = points[b]
    walls.push(u.x, heights[a], u.y, v.x, heights[b], v.y, u.x, -0.07, u.y,
      v.x, heights[b], v.y, v.x, -0.07, v.y, u.x, -0.07, u.y)
  }
  for (const [a, b] of boundaries) wall(a, b)
  const sides = new THREE.BufferGeometry()
  sides.setAttribute('position', new THREE.Float32BufferAttribute(walls, 3))
  sides.computeVertexNormals()
  return { top, sides }
}
