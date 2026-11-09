import * as THREE from 'three'
import { illustrativeHeight, project } from './data/geography'

/** Triangulate actual coastline, then refine triangles to sculpt display relief. */
export function createTerrain(collection) {
  const surface = [], walls = []
  const emit = (a, b, c, depth = 0) => {
    const ab = a.distanceToSquared(b), bc = b.distanceToSquared(c), ca = c.distanceToSquared(a)
    if (Math.max(ab, bc, ca) > 0.035 && depth < 13) {
      if (ab >= bc && ab >= ca) {
        const m = a.clone().add(b).multiplyScalar(0.5)
        emit(a, m, c, depth + 1); emit(m, b, c, depth + 1)
      } else if (bc >= ca) {
        const m = b.clone().add(c).multiplyScalar(0.5)
        emit(a, b, m, depth + 1); emit(a, m, c, depth + 1)
      } else {
        const m = c.clone().add(a).multiplyScalar(0.5)
        emit(a, b, m, depth + 1); emit(m, b, c, depth + 1)
      }
      return
    }
    // ShapeUtils returns XY counterclockwise triangles; XZ reverses normals.
    for (const p of [a, c, b]) surface.push(p.x, illustrativeHeight(p.x, p.y), p.y)
  }
  for (const feature of collection.features) {
    const rings = feature.geometry.coordinates.map(ring => {
      const points = ring.map(p => new THREE.Vector2(...project(p)))
      return points.filter((p, i) => !i || p.distanceToSquared(points[i - 1]) > 1e-12)
    }).filter(ring => ring.length >= 3)
    if (!rings.length) continue
    // Remove closing vertices before flattening, as triangulateShape does.
    for (const ring of rings) if (ring[0].equals(ring.at(-1))) ring.pop()
    const contour = rings[0], holes = rings.slice(1)
    const vertices = rings.flat()
    const triangles = THREE.ShapeUtils.triangulateShape(contour, holes)
    for (const tri of triangles) emit(...tri.map(i => vertices[i]))
    for (const ring of rings) {
      for (let i = 0; i < ring.length; i++) {
        const a = ring[i], b = ring[(i + 1) % ring.length]
        const ah = illustrativeHeight(a.x, a.y), bh = illustrativeHeight(b.x, b.y)
        walls.push(a.x, ah, a.y, b.x, bh, b.y, a.x, -0.19, a.y,
          b.x, bh, b.y, b.x, -0.19, b.y, a.x, -0.19, a.y)
      }
    }
  }
  const top = new THREE.BufferGeometry()
  top.setAttribute('position', new THREE.Float32BufferAttribute(surface, 3))
  top.computeVertexNormals()
  const colors = [], color = new THREE.Color()
  const normal = top.getAttribute('normal')
  for (let i = 0; i < surface.length / 3; i++) {
    const shade = Math.abs(normal.getY(i))
    color.set(shade < 0.65 ? '#88a7ae' : shade < 0.88 ? '#c4d9da' : '#edf5ed')
    colors.push(color.r, color.g, color.b)
  }
  top.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  const sides = new THREE.BufferGeometry()
  sides.setAttribute('position', new THREE.Float32BufferAttribute(walls, 3))
  sides.computeVertexNormals()
  return { top, sides }
}
