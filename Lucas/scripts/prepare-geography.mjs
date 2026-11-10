/** Reproducible extraction; raw file is only needed when updating the source. */
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

const rawPath = new URL('./source-cache/natural-earth-land.geojson', import.meta.url)
const raw = readFileSync(rawPath)
const source = JSON.parse(raw)
const features = source.features.filter(f => f.geometry.type === 'Polygon' && f.geometry.coordinates[0].every(p => p[1] <= -60))
const data = {
  type: 'FeatureCollection',
  metadata: {
    source: 'Natural Earth, 1:50m land, ne_50m_land.geojson',
    sourceUrl: 'https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_50m_land.geojson',
    downloaded: '2026-11-08',
    license: 'Public domain',
    sourceSha256: createHash('sha256').update(raw).digest('hex'),
    processing: 'Polygons entirely south of 60°S; coordinates unchanged. Includes small islands. No political boundaries. Not a current ice-edge product.',
  },
  features,
}
writeFileSync(new URL('../public/data/antarctica.geojson', import.meta.url), JSON.stringify(data))
console.log(`${features.length} Antarctic land polygons extracted; ${JSON.stringify(data).length} bytes`)
