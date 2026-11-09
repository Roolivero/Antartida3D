import { readFileSync, writeFileSync } from 'node:fs'
import { project } from '../src/data/geography.js'
const data = JSON.parse(readFileSync(new URL('../public/data/antarctica.geojson', import.meta.url)))
const paths = data.features.map(f => f.geometry.coordinates.map(ring => ring.map((p, i) => `${i ? 'L' : 'M'}${project(p).map(n => n.toFixed(4)).join(',')}`).join(' ') + 'Z').join(' ')).join(' ')
writeFileSync(new URL('../public/antarctica-outline.svg', import.meta.url), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-5 -5 10 10"><path d="${paths}" fill="#c4e2da" fill-rule="evenodd"/></svg>`)
console.log('Geographic 2D fallback generated')
