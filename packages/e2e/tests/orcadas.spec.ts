import { expect, test, type Page } from '@playwright/test';

const log = (page: Page) => page.locator('.reg');
const primary = (page: Page) => page.locator('.ebar .btn.primary');

async function openOrcadasFromMap(page: Page) {
  const cluster = page.getByRole('button', { name: /Grupo de .*Estación Orcadas/ });
  if (await cluster.isVisible()) await cluster.click();
  await page.getByRole('button', { name: /^Estación Orcadas, Islas Orcadas del Sur/ }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Estación Orcadas' })).toBeVisible();
  await page.waitForFunction(() => (window as unknown as { __orcadasReady?: boolean }).__orcadasReady === true);
}

async function tabTo(page: Page, name: RegExp, max = 50) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab');
    const label = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      return el ? (el.getAttribute('aria-label') ?? el.textContent ?? '').trim() : '';
    });
    if (name.test(label)) return;
  }
  throw new Error(`Could not reach ${name} with Tab`);
}

const focusedName = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    return el ? (el.getAttribute('aria-label') ?? el.textContent ?? '').trim() : '';
  });

const expectFocused = (page: Page, name: string) => expect.poll(() => focusedName(page)).toBe(name);

let consoleErrors: string[] = [];

test.beforeEach(async ({ page }) => {
  consoleErrors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  page.on('pageerror', (e) => consoleErrors.push(e.message));
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(log(page)).toContainText('0/2');
});

test.afterEach(() => {
  expect(consoleErrors, 'console errors (hydration mismatches, exceptions)').toEqual([]);
});

test('completes all chapters of Orcadas with the keyboard only, opens Sources, and updates the log', async ({ page }) => {
  // Long keyboard-only flow with several camera flights. Without a GPU (CI, headless) each frame of a
  // 1440 px flight is drawn in software: measured 40 s on desktop against 14 s on mobile, with no step stuck.
  test.setTimeout(90_000);
  await openOrcadasFromMap(page);
  await expect(page.getByText('Reconstrucción ilustrada').first()).toBeVisible();
  await expectFocused(page, 'Estación Orcadas');

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow).toBeLessThanOrEqual(0);

  // Chapter 1: Llegada -> Observación
  await tabTo(page, /^Hacer la observación$/);
  await page.keyboard.press('Enter');

  // Chapter 2: Observación (focus moves to h2, primary button is enabled with "Seguir" and shows missing count)
  await expectFocused(page, 'Observación del día');
  await expect(primary(page)).toBeEnabled();
  await expect(primary(page)).toHaveText('Seguir');
  await expect(page.getByText(/Te faltan 4 lecturas/)).toBeVisible();

  await tabTo(page, /^Temperatura del abrigo/);
  await page.keyboard.type('-2.5');
  await tabTo(page, /^Presión atmosférica/);
  await page.keyboard.type('992');
  await tabTo(page, /^Velocidad del viento/);
  await page.keyboard.type('24');
  await tabTo(page, /^Cobertura de nubes/);
  await page.keyboard.type('6');

  await expect(primary(page)).toBeEnabled();
  await expect(primary(page)).toHaveText('Recorrer el año');
  await tabTo(page, /^Recorrer el año$/);
  await page.keyboard.press('Enter');

  // Chapter 3: Un año
  await expectFocused(page, 'Un año en Orcadas');
  await expect(page.getByText(/h de luz/)).toBeVisible();
  await tabTo(page, /^Viajar en el tiempo$/);
  await page.keyboard.press('Enter');

  // Chapter 4: Máquina del tiempo
  await expectFocused(page, 'Máquina del tiempo');
  await expect(page.getByRole('heading', { name: 'Hoy' })).toBeVisible();
  await tabTo(page, /^Ver el siglo en datos$/);
  await page.keyboard.press('Enter');

  // Chapter 5: El siglo
  await expectFocused(page, 'El siglo en datos');
  await expect(page.getByText(/Serie histórica de temperatura media anual/)).toBeVisible();
  await tabTo(page, /^Ir al cierre$/);
  await page.keyboard.press('Enter');

  // Chapter 6: Cierre
  await expectFocused(page, 'Cierre de la expedición');

  // Open Sources panel via keyboard and close with Escape
  await page.getByRole('button', { name: 'Fuentes' }).focus();
  await page.keyboard.press('Enter');
  const sourcesDialog = page.getByRole('dialog', { name: 'Fuentes' });
  await expect(sourcesDialog).toBeVisible();
  await expect(sourcesDialog).toContainText('Consultado');
  await expectFocused(page, 'Cerrar fuentes');
  await page.keyboard.press('Escape');
  await expect(sourcesDialog).toHaveCount(0);
  await expectFocused(page, 'Fuentes');

  await tabTo(page, /^Terminar expedición$/);
  await page.keyboard.press('Enter');

  await expect(log(page)).toContainText('1/2');
  await expect(page.locator('.toast')).toHaveText(
    'Estación Orcadas quedó explorado. Registro de exploración: 1/2'
  );
  // Back on the map, focus lands on the marker of the expedition that was just finished.
  await expect.poll(() => focusedName(page)).toContain('Estación Orcadas');
});

test('opens Orcadas from the 2D map, completes it, and updates the log', async ({ page }) => {
  await openOrcadasFromMap(page);
  await page
    .getByRole('navigation', { name: 'Capítulos de la expedición' })
    .getByRole('button', { name: /Cierre/ })
    .click();
  await page.getByRole('button', { name: 'Terminar expedición' }).click();

  await expect(log(page)).toContainText('1/2');
  await expect(page.locator('.toast')).toHaveText(
    'Estación Orcadas quedó explorado. Registro de exploración: 1/2'
  );
  await expect(page.locator('.stage.ret')).toHaveCount(0);

  // Fósiles is now an "Ampliación prevista" point, opening a sheet rather than an expedition
  await page.getByRole('button', { name: 'Ver como lista' }).click();
  const fosilesBtn = page.getByRole('dialog', { name: 'Todos los puntos' }).getByRole('button', { name: /Fósiles/ });
  await expect(fosilesBtn).toBeVisible();
  await fosilesBtn.click();
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'Fósiles' })).toBeVisible();
});

test('from the 3D map with motion allowed, the camera zooms down to the island before the station opens', async ({ page }) => {
  test.setTimeout(90_000);
  // The app reads the motion preference once, when it loads.
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.reload();
  const toggle = page.getByRole('group', { name: 'Modo de vista' });
  await toggle.getByRole('button', { name: 'Relieve 3D' }).click();
  await expect(toggle.getByRole('button', { name: 'Relieve 3D' })).toHaveAttribute('aria-pressed', 'true');
  const cluster = page.getByRole('button', { name: /Grupo de .*Estación Orcadas/ });
  const marker = page.getByRole('button', { name: /^Estación Orcadas, Islas Orcadas del Sur/ });
  // The 3D markers appear once the layer has loaded: wait for the marker or the group that holds it.
  await cluster.or(marker).first().waitFor();
  if (await cluster.isVisible()) await cluster.click();
  // The approach lasts 2.6 s and software rendering can starve the test's polling: record it in the page.
  await page.evaluate(() => {
    const w = window as unknown as { __sawApproach?: boolean };
    new MutationObserver(() => {
      if (document.querySelector('.stage.approach') && document.querySelector('.veil.late')) w.__sawApproach = true;
    }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });
  });
  await marker.click();
  await expect(page.getByRole('heading', { level: 2, name: 'Estación Orcadas' })).toBeVisible({ timeout: 30_000 });
  // The map stayed on screen during the zoom (no tilt) and the paper veil came only at the end.
  expect(await page.evaluate(() => (window as unknown as { __sawApproach?: boolean }).__sawApproach)).toBe(true);
});

test('respects reducedMotion, opens hotspot cards, and keeps mobile sheet within 45% height', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await openOrcadasFromMap(page);

  const vw = page.viewportSize()?.width ?? 1440;
  const vh = page.viewportSize()?.height ?? 900;
  if (vw <= 420) {
    const panelBox = (await page.locator('.orc-panel').boundingBox())!;
    expect(panelBox.height).toBeLessThanOrEqual(vh * 0.45 + 1);
  }

  // Activate a hotspot button and check dialog + Escape focus return
  const spotBtn = page.getByRole('button', { name: 'Punto de interés: Abrigo meteorológico' });
  const debug = await page.evaluate(() => {
    const btn = document.querySelector('[data-hotspot="screen"]');
    const r = btn?.getBoundingClientRect();
    const x = r ? r.left + r.width / 2 : 0;
    const y = r ? r.top + r.height / 2 : 0;
    const el = document.elementFromPoint(x, y);
    return {
      x, y,
      btn: btn ? {
        display: getComputedStyle(btn).display,
        visibility: getComputedStyle(btn).visibility,
        pointerEvents: getComputedStyle(btn).pointerEvents,
        opacity: getComputedStyle(btn).opacity,
        zIndex: getComputedStyle(btn).zIndex,
        parentPointerEvents: btn.parentElement ? getComputedStyle(btn.parentElement).pointerEvents : null,
      } : null,
      el: el ? {
        tag: el.tagName,
        className: el.className,
        outerHTML: el.outerHTML.slice(0, 150),
        pointerEvents: getComputedStyle(el).pointerEvents,
        zIndex: getComputedStyle(el).zIndex,
      } : null,
    };
  });
  console.log('DEBUG HOTSPOT CLICK:', JSON.stringify(debug, null, 2));
  await spotBtn.click();
  const spotDialog = page.getByRole('dialog', { name: 'Abrigo meteorológico' });
  await expect(spotDialog).toBeVisible();
  await expectFocused(page, 'Cerrar tarjeta de punto');
  await page.keyboard.press('Escape');
  await expect(spotDialog).toHaveCount(0);
  await expectFocused(page, 'Punto de interés: Abrigo meteorológico');
});

test('never renders facts from unverified sources in any chapter', async ({ page }) => {
  await openOrcadasFromMap(page);

  const unverifiedSnippets = [
    'número OMM 88968',
    'El registro de hielo de la bahía Scotia empieza en 1903',
  ];

  const stepNames = [
    'Llegada',
    'Observación',
    'Un año',
    'Máquina del tiempo',
    'El siglo',
    'Cierre',
  ];

  for (const stepName of stepNames) {
    await page
      .getByRole('navigation', { name: 'Capítulos de la expedición' })
      .getByRole('button', { name: new RegExp(stepName) })
      .click();

    const bodyText = await page.locator('.orc').innerText();
    for (const snippet of unverifiedSnippets) {
      expect(bodyText).not.toContain(snippet);
    }
  }
});

test('B4: resetting panel scroll on chapter change', async ({ page }) => {
  await openOrcadasFromMap(page);
  await expect(page.getByRole('heading', { level: 2, name: 'Estación Orcadas' })).toBeVisible();

  // Scroll .orc-panel-scroll to the bottom
  await page.evaluate(() => {
    const scrollEl = document.querySelector('.orc-panel-scroll');
    if (scrollEl) {
      scrollEl.scrollTop = scrollEl.scrollHeight;
    }
  });

  const scrolledTop = await page.evaluate(() => {
    const scrollEl = document.querySelector('.orc-panel-scroll');
    return scrollEl ? scrollEl.scrollTop : 0;
  });
  expect(scrolledTop).toBeGreaterThan(0);

  // Advance to next chapter
  await primary(page).click();
  const nextHeading = page.getByRole('heading', { level: 2, name: 'Observación del día' });
  await expect(nextHeading).toBeVisible();

  // Assert scrollTop is 0 and h2 is in viewport
  const nextScrollTop = await page.evaluate(() => {
    const scrollEl = document.querySelector('.orc-panel-scroll');
    return scrollEl ? scrollEl.scrollTop : -1;
  });
  expect(nextScrollTop).toBe(0);
  await expect(nextHeading).toBeInViewport();
});

test('B7: opening Fuentes closes the hotspot dialog card and vice versa', async ({ page }) => {
  await openOrcadasFromMap(page);

  // Open hotspot card
  const spotBtn = page.getByRole('button', { name: 'Punto de interés: Abrigo meteorológico' });
  await spotBtn.click();
  const spotDialog = page.getByRole('dialog', { name: 'Abrigo meteorológico' });
  await expect(spotDialog).toBeVisible();

  // Click "Fuentes": hotspot card is removed from DOM, sources panel is in DOM
  await page.getByRole('button', { name: 'Fuentes' }).click();
  await expect(spotDialog).toHaveCount(0);
  const sourcesPanel = page.getByRole('dialog', { name: 'Fuentes' });
  await expect(sourcesPanel).toBeVisible();

  // Select a hotspot while sources panel is open: sources panel closes, hotspot dialog opens
  await spotBtn.click();
  await expect(sourcesPanel).toHaveCount(0);
  await expect(page.getByRole('dialog', { name: 'Abrigo meteorológico' })).toBeVisible();
});

test('B1: observation month stays fixed when changing scene month', async ({ page }) => {
  await openOrcadasFromMap(page);

  // 1. Enter 4 readings in Observación
  await page
    .getByRole('navigation', { name: 'Capítulos de la expedición' })
    .getByRole('button', { name: /Observación/ })
    .click();
  await expect(page.getByRole('heading', { level: 2, name: 'Observación del día' })).toBeVisible();

  await page.getByLabel(/^Temperatura del abrigo/).focus();
  await page.keyboard.type('-2.5');
  await page.getByLabel(/^Presión atmosférica/).focus();
  await page.keyboard.type('990');
  await page.getByLabel(/^Velocidad del viento/).focus();
  await page.keyboard.type('20');
  await page.getByLabel(/^Cobertura de nubes/).focus();
  await page.keyboard.type('5');

  // Check Cierre summary text before changing month
  await page
    .getByRole('navigation', { name: 'Capítulos de la expedición' })
    .getByRole('button', { name: /Cierre/ })
    .click();
  await expect(page.getByRole('heading', { level: 2, name: 'Cierre de la expedición' })).toBeVisible();
  const summaryBefore = await page.locator('.orc-done-summary p').textContent();
  expect(summaryBefore).toContain('Tu observación de');

  // 2. Go to "Un año", change month with the wheel slider
  await page
    .getByRole('navigation', { name: 'Capítulos de la expedición' })
    .getByRole('button', { name: /Un año/ })
    .click();
  await expect(page.getByRole('heading', { level: 2, name: 'Un año en Orcadas' })).toBeVisible();

  const wheelSlider = page.getByRole('slider', { name: /Rueda del año/i });
  await wheelSlider.focus();
  await page.keyboard.press('Home');
  await expect(wheelSlider).toHaveAttribute('aria-valuenow', '1');
  await expect(wheelSlider).toHaveAttribute('aria-valuetext', 'enero');

  // 3. Go back to closing chapter
  await page
    .getByRole('navigation', { name: 'Capítulos de la expedición' })
    .getByRole('button', { name: /Cierre/ })
    .click();
  await expect(page.getByRole('heading', { level: 2, name: 'Cierre de la expedición' })).toBeVisible();
  const summaryAfter = await page.locator('.orc-done-summary p').textContent();

  // The text still names the original month and the score text is unchanged compared with before changing the month
  expect(summaryAfter).toBe(summaryBefore);
  const currentMonthIdx = new Date().getMonth();
  if (currentMonthIdx !== 0) {
    expect(summaryAfter).not.toContain('Tu observación de enero');
  }
});
