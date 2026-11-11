import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium } from 'playwright'

// Start `npm run dev` or `npm run preview` before running this script.
const url = process.env.ATLAS_URL || 'http://127.0.0.1:5175/'
const captureDir = process.env.CAPTURE_DIR ? resolve(process.env.CAPTURE_DIR) : null
if (captureDir) await mkdir(captureDir, { recursive: true })

let server = null
try {
  await fetch(url)
} catch {
  server = spawn('pnpm', ['preview', '--host', '127.0.0.1', '--port', '5175'], { cwd: resolve(import.meta.dirname, '..'), stdio: 'ignore', detached: true })
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(url)).ok) break
    } catch {}
    await new Promise(r => setTimeout(r, 200))
  }
}

const executablePath = process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined)
const browser = await chromium.launch({ executablePath, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const errors = []
const ready = page => page.waitForFunction(() => document.querySelector('.map-topline')?.textContent.includes('Exploración libre'))
const capture = async (page, name) => {
  if (!captureDir) return
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: resolve(captureDir, `${name}.png`) })
}
const checkOverflow = async page => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight), true, 'page must fit the viewport')

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' })
  const page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  await page.goto(url, { waitUntil: 'networkidle' })
  await ready(page)
  assert.equal(await page.locator('canvas').count(), 1, '3D is the initial view')
  assert.equal(await page.locator('.expedition-item').count(), 5)
  await checkOverflow(page)
  await capture(page, 'atlas-escritorio')

  await page.getByRole('button', { name: 'Naturaleza', exact: true }).click()
  assert.equal(await page.locator('.expedition-item').count(), 2)
  await page.getByRole('button', { name: 'Historias', exact: true }).click()
  assert.equal(await page.locator('.expedition-item').count(), 3)
  await page.getByRole('button', { name: 'Todas', exact: true }).click()

  const fossils = page.getByRole('button', { name: 'Ver propuesta Fósiles', exact: true })
  await fossils.focus()
  await page.keyboard.press('Enter')
  await page.getByRole('heading', { name: 'Fósiles', exact: true }).waitFor()
  await page.waitForFunction(() => document.activeElement?.id === 'expedition-title')
  assert.equal(await page.getByRole('dialog').count(), 0, 'expedition is not modal')
  await page.getByRole('button', { name: 'Ver recorrido propuesto', exact: true }).click()
  assert.equal(await page.locator('.proposed-route li').count(), 3)
  await capture(page, 'ficha-fosiles')
  await page.keyboard.press('Escape')
  await page.waitForFunction(() => document.activeElement?.dataset.expeditionId === 'fosiles')

  const marker = page.getByRole('button', { name: 'Ver Base Orcadas en el mapa', exact: true })
  await marker.click()
  await page.getByRole('heading', { name: 'Base Orcadas', exact: true }).waitFor()
  await page.getByText('60°45′ S · 44°43′ O', { exact: true }).waitFor()
  await page.getByText('Sobre esta propuesta', { exact: true }).click()
  assert.equal(await page.locator('.source-links a').count(), 2)
  await page.getByRole('button', { name: 'Capas del mapa', exact: true }).click()
  await page.getByLabel('Sitios ubicados', { exact: true }).uncheck()
  assert.equal(await marker.count(), 0)
  await page.getByLabel('Sitios ubicados', { exact: true }).check()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Ubicar en el mapa', exact: true }).click()
  await capture(page, 'base-orcadas')

  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: '2D', exact: true }).click()
    await page.locator('.flat-map').waitFor()
    assert.equal(await page.getByRole('heading', { name: 'Base Orcadas', exact: true }).count(), 1)
    await page.getByRole('button', { name: '3D', exact: true }).click()
    await page.locator('canvas').waitFor()
    await ready(page)
  }
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Ver todo el continente', exact: true }).click()
  await page.getByRole('button', { name: '2D', exact: true }).click()
  await page.locator('.flat-map').waitFor()
  const position = () => marker.evaluate(el => ({ x: el.style.left, y: el.style.top }))
  const before = await position()
  await page.getByRole('button', { name: 'Acercar', exact: true }).click()
  await page.waitForFunction(b => {
    const el = document.querySelector('button[aria-label="Ver Base Orcadas en el mapa"]')
    return el && el.style.left !== b.x
  }, before)
  assert.notDeepEqual(await position(), before, '2D zoom moves geographic markers')
  await page.getByRole('button', { name: 'Ver todo el continente', exact: true }).click()
  await capture(page, 'mapa-2d')
  await page.getByRole('button', { name: '3D', exact: true }).click()
  await ready(page)

  const projectButton = page.getByRole('button', { name: 'El proyecto', exact: false }).first()
  await projectButton.click()
  await page.getByRole('dialog').waitFor()
  await page.keyboard.press('Escape')
  assert.equal(await page.getByRole('dialog').count(), 0)

  for (const [width, height] of [[1024, 768], [768, 1024], [390, 844], [360, 640]]) {
    await page.setViewportSize({ width, height })
    await page.waitForTimeout(150)
    await checkOverflow(page)
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await capture(page, 'atlas-celular')
  const mobileNav = page.getByRole('navigation', { name: 'Navegación móvil', exact: true })
  await mobileNav.getByRole('button', { name: /Expediciones/ }).click()
  await page.getByRole('button', { name: 'Ver propuesta Fósiles', exact: true }).click()
  await page.getByRole('heading', { name: 'Fósiles', exact: true }).waitFor()
  await page.getByRole('button', { name: 'Ver recorrido propuesto', exact: true }).click()
  await capture(page, 'ficha-celular')
  await mobileNav.getByRole('button', { name: 'Mapa', exact: true }).click()
  await page.waitForFunction(() => getComputedStyle(document.querySelector('.explorer-panel')).visibility === 'hidden')
  const map = page.getByRole('region', { name: 'Mapa interactivo de la Antártida, vista 3D', exact: true })
  await map.focus()
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('+')
  await page.keyboard.press('Home')
  await page.getByRole('button', { name: 'Capas del mapa', exact: true }).click()
  await page.getByLabel('Líneas de referencia', { exact: true }).uncheck()
  await page.keyboard.press('Escape')
  await checkOverflow(page)
  await context.close()
  assert.deepEqual(errors, [], 'normal navigation must not log browser errors')
  console.log('✓ Desktop, filters, focus, routes, layers, 2D/3D, keyboard and mobile navigation')

  const blocked = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })
  await blocked.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function(type, ...args) {
      return type.startsWith('webgl') ? null : original.call(this, type, ...args)
    }
  })
  const fallback = await blocked.newPage()
  await fallback.goto(url, { waitUntil: 'networkidle' })
  await fallback.locator('.flat-map').waitFor({ timeout: 15000 })
  await ready(fallback)
  await fallback.getByRole('navigation', { name: 'Navegación móvil' }).getByRole('button', { name: /Expediciones/ }).click()
  await fallback.getByRole('button', { name: 'Ver propuesta Océano', exact: true }).click()
  await fallback.getByRole('heading', { name: 'Océano', exact: true }).waitFor()
  await checkOverflow(fallback)
  await blocked.close()
  console.log('✓ Automatic 2D fallback and expedition access without WebGL')

  const offline = await browser.newContext({ reducedMotion: 'reduce' })
  const failed = await offline.newPage()
  await failed.route('**/data/antarctica.geojson', route => route.fulfill({ status: 503, body: 'Unavailable' }))
  await failed.goto(url, { waitUntil: 'networkidle' })
  await failed.getByRole('alert').waitFor()
  assert.equal(await failed.locator('.expedition-item').count(), 5)
  await failed.unroute('**/data/antarctica.geojson')
  await failed.getByRole('button', { name: 'Volver a intentar', exact: true }).click()
  await ready(failed)
  await offline.close()
  console.log('✓ Geography failure, accessible proposals and successful retry')
} finally {
  await browser?.close()
  if (server?.pid) {
    try { process.kill(-server.pid, 'SIGTERM') } catch {}
  }
}
