import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createTerrain } from '../map/geometry.js'

test('terrain has finite geometry and no open seams inside the continent', () => {
  const source = JSON.parse(readFileSync(new URL('../../public/data/antarctica.geojson', import.meta.url)))
  const { top, sides } = createTerrain(source)
  const position = top.getAttribute('position'), index = top.index.array
  assert.ok(position.count > 1000)
  assert.ok([...position.array].every(Number.isFinite))
  assert.ok([...sides.getAttribute('position').array].every(Number.isFinite))
  const edges = new Map()
  for (let i = 0; i < index.length; i += 3) {
    const [a, b, c] = [index[i], index[i + 1], index[i + 2]]
    for (const [u, v] of [[a, b], [b, c], [c, a]]) {
      const key = u < v ? `${u}:${v}` : `${v}:${u}`
      const item = edges.get(key) ?? { count: 0, u, v }
      item.count++; edges.set(key, item)
    }
  }
  for (const { count, u, v } of edges.values()) {
    assert.ok(count <= 2, 'surface is manifold')
    if (count === 1) {
      assert.ok(position.getY(u) < 0.036 && position.getY(v) < 0.036, 'open edges belong to the coast, not the interior')
    }
  }
  top.dispose(); sides.dispose()
})
