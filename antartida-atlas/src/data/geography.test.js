import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { project } from './geography.js'
import { expeditions } from './expeditions.js'

test('South pole is centered; dateline edges meet in the polar view', () => {
  assert.deepEqual(project([0, -90]), [0, -0])
  const west = project([-180, -70]), east = project([180, -70])
  assert.ok(Math.hypot(west[0] - east[0], west[1] - east[1]) < 1e-12)
})

test('only verified base has a marker; proposed expeditions have no invented coordinates', () => {
  assert.equal(new Set(expeditions.map(e => e.id)).size, 5)
  const located = expeditions.filter(e => e.location)
  assert.equal(located.length, 1)
  assert.equal(located[0].id, 'orcadas')
  assert.ok(located[0].sources.length > 0)
  for (const item of located) {
    const [lon, lat] = item.location
    assert.ok(lon >= -180 && lon <= 180 && lat >= -90 && lat <= 90)
  }
})

test('bundled coastline is sourced and contains the continental polygon', () => {
  const data = JSON.parse(readFileSync(new URL('../../public/data/antarctica.geojson', import.meta.url)))
  assert.equal(data.metadata.license, 'Public domain')
  assert.match(data.metadata.sourceSha256, /^[0-9a-f]{64}$/)
  assert.ok(data.features.some(f => f.geometry.coordinates[0].length > 500))
  for (const feature of data.features) {
    for (const ring of feature.geometry.coordinates) {
      assert.deepEqual(ring[0], ring.at(-1))
      assert.ok(ring.every(p => p[1] <= -60))
    }
  }
})
