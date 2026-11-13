import { expect, test, type Locator, type Page } from '@playwright/test';
import { ORCADAS_GUIDING_QUESTION } from '../../core/src/content/orcadas.ts';
import { answerFor } from '../../core/src/orcadas.ts';

const log = (page: Page) => page.locator('.reg');
const primary = (page: Page) => page.locator('.ebar .btn.primary');

function formatTempC(val: number): string {
  const numVal = Number(val.toFixed(1));
  if (Object.is(numVal, -0) || numVal === 0) return '0,0 °C';
  const absVal = Math.abs(val).toFixed(1).replace('.', ',');
  return numVal < 0 ? `−${absVal} °C` : `${absVal} °C`;
}

async function openOrcadasFromMap(page: Page) {
  const cluster = page.getByRole('button', { name: /Grupo de .*Estación Orcadas/ });
  if (await cluster.isVisible()) await cluster.click();
  await page.getByRole('button', { name: /^Estación Orcadas, Islas Orcadas del Sur/ }).click();
  await expect(page.getByRole('heading', { level: 2, name: ORCADAS_GUIDING_QUESTION })).toBeVisible();
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

async function openAllDetailsInPanel(page: Page) {
  const summaries = page.locator('.orc-panel details:not([open]) > summary');
  while ((await summaries.count()) > 0) {
    await summaries.first().click();
  }
}

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

test('completes all chapters and stops of Orcadas with the keyboard only (desktop), opens Sources, and updates the log', async ({
  page,
}) => {
  const vw = page.viewportSize()?.width ?? 1440;
  test.skip(vw < 900, 'Desktop keyboard tour');
  test.setTimeout(90_000);

  await openOrcadasFromMap(page);
  await expect(page.getByText('Reconstrucción ilustrada').first()).toBeVisible();
  await expectFocused(page, ORCADAS_GUIDING_QUESTION);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow).toBeLessThanOrEqual(0);

  // Chapter 1: Llegar (4 stops). Verify Tab/Enter and ArrowRight/ArrowLeft inside TourCard.
  await expect(page.locator('.orc-tour-count')).toHaveText('1 de 4');
  await expect(primary(page)).toHaveText('Siguiente');
  await tabTo(page, /^Cancillería$/);
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.orc-tour-count')).toHaveText('2 de 4');
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('.orc-tour-count')).toHaveText('1 de 4');

  await tabTo(page, /^Siguiente$/);
  await page.keyboard.press('Enter');
  await expect(page.locator('.orc-tour-count')).toHaveText('2 de 4');
  await page.keyboard.press('Enter');
  await expect(page.locator('.orc-tour-count')).toHaveText('3 de 4');
  await page.keyboard.press('Enter');
  await expect(page.locator('.orc-tour-count')).toHaveText('4 de 4');
  await expect(primary(page)).toHaveText('Hacer la observación');
  await page.keyboard.press('Enter');

  // Chapter 2: Observar (1 stop; lens slider + Enter confirms)
  await expectFocused(page, 'Observación del día');
  await expect(primary(page)).toBeEnabled();
  await expect(primary(page)).toHaveText('Viajar en el tiempo');
  await tabTo(page, /^Guía de lectura en la lupa del termómetro$/);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await expect(page.locator('.orc-obs-feedback')).toBeVisible();

  await tabTo(page, /^Viajar en el tiempo$/);
  await page.keyboard.press('Enter');

  // Chapter 3: Viajar (4 era stops: 1903, 1927, 1951, current year)
  await expectFocused(page, 'Viaje en el tiempo');
  await expect(page.locator('.orc-tour-count')).toHaveText('1 de 4');
  await expect(page.locator('.orc-year-counter')).toHaveAttribute('aria-label', 'Año 1903');
  await tabTo(page, /^Siguiente$/);
  await page.keyboard.press('Enter');
  await expect(page.locator('.orc-tour-count')).toHaveText('2 de 4');
  await expect(page.locator('.orc-year-counter')).toHaveAttribute('aria-label', 'Año 1927');
  await page.keyboard.press('Enter');
  await expect(page.locator('.orc-tour-count')).toHaveText('3 de 4');
  await expect(page.locator('.orc-year-counter')).toHaveAttribute('aria-label', 'Año 1951');
  await page.keyboard.press('Enter');
  await expect(page.locator('.orc-tour-count')).toHaveText('4 de 4');
  await expect(page.locator('.orc-year-counter')).toHaveAttribute(
    'aria-label',
    `Año ${new Date().getFullYear()}`
  );
  await expect(primary(page)).toHaveText('Ver la respuesta');
  await page.keyboard.press('Enter');

  // Chapter 4: Responder (0 stops)
  await expectFocused(page, 'La respuesta');
  await expect(page.getByRole('img', { name: /Gráfico de puntos de temperatura/ })).toBeVisible();

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
  await expect.poll(() => focusedName(page)).toContain('Estación Orcadas');
});

test('completes the full mobile tour without typing any numbers (390x844 and 360x740)', async ({ page }) => {
  const vw = page.viewportSize()?.width ?? 1440;
  test.skip(vw > 420, 'Mobile portrait touch tour without typing');
  test.setTimeout(90_000);

  await openOrcadasFromMap(page);

  // Llegar: traverse all 4 stops with primary button
  await expect(page.locator('.orc-tour-count')).toHaveText('1 de 4');
  // «Saber más» folds what the line leaves out, never the line again; with nothing left out it is not shown.
  const tourLine = page.locator('.orc-tour-line');
  const tourMore = page.locator('.orc-tour-more');
  await tourMore.locator('summary').click();
  await expect(tourMore.locator('.orc-fact-card')).not.toHaveCount(0);
  await expect(tourMore).not.toContainText((await tourLine.innerText()).trim());
  await primary(page).click();
  await expect(page.locator('.orc-tour-count')).toHaveText('2 de 4');
  await expect(tourMore).toBeHidden();
  await primary(page).click();
  await expect(page.locator('.orc-tour-count')).toHaveText('3 de 4');
  await primary(page).click();
  await expect(page.locator('.orc-tour-count')).toHaveText('4 de 4');
  await expect(primary(page)).toHaveText('Hacer la observación');
  await primary(page).click();

  // Observar: tap the magnifying lens without opening "Ajuste fino" or typing into any input
  await expect(page.getByRole('heading', { level: 2, name: 'Observación del día' })).toBeVisible();
  await expect(page.locator('details.orc-obs-fine')).not.toHaveAttribute('open', /.*/);

  const lens = page.locator('.orc-obs-lens-hit');
  await expect(lens).toBeVisible();
  const lensBox = (await lens.boundingBox())!;
  await page.touchscreen.tap(lensBox.x + lensBox.width * 0.5, lensBox.y + lensBox.height * 0.35);
  const selectedTemp = Number(await lens.getAttribute('aria-valuenow'));
  expect(Number.isFinite(selectedTemp)).toBe(true);

  await page.locator('.orc-obs-confirm-btn').first().click();
  await expect(page.locator('.orc-obs-feedback')).toBeVisible();
  await expect(primary(page)).toHaveText('Viajar en el tiempo');
  await primary(page).click();

  // Viajar: traverse all 4 era stops (1903, 1927, 1951, current year)
  await expect(page.getByRole('heading', { level: 2, name: 'Viaje en el tiempo' })).toBeVisible();
  const currentYear = new Date().getFullYear();
  await expect(page.locator('.orc-year-counter')).toHaveAttribute('aria-label', 'Año 1903');
  await primary(page).click();
  await expect(page.locator('.orc-year-counter')).toHaveAttribute('aria-label', 'Año 1927');
  await primary(page).click();
  await expect(page.locator('.orc-year-counter')).toHaveAttribute('aria-label', 'Año 1951');
  await primary(page).click();
  await expect(page.locator('.orc-year-counter')).toHaveAttribute('aria-label', `Año ${currentYear}`);
  await expect(primary(page)).toHaveText('Ver la respuesta');
  await primary(page).click();

  // Responder: answer sentence uses the tapped temperature reading
  await expect(page.getByRole('heading', { level: 2, name: 'La respuesta' })).toBeVisible();
  const currentMonth = new Date().getMonth() + 1;
  const [seg1, seg2] = answerFor(selectedTemp, currentMonth);
  const sentence = page.locator('.orc-answer-sentence');
  await expect(sentence).toContainText(`${seg1.fromYear}`);
  await expect(sentence).toContainText(`${seg1.asCold} de ${seg1.years}`);
  await expect(sentence).toContainText(`${seg2.fromYear}`);
  await expect(sentence).toContainText(`${seg2.asCold} de ${seg2.years}`);
  await expect(sentence).toContainText(formatTempC(selectedTemp));
  await expect(page.getByRole('button', { name: 'Volver a Observar' })).toHaveCount(0);

  // The closing checklist: everything required done, the optional readings left dashed.
  const checklist = page.getByRole('list', { name: 'Lo que hiciste en la expedición' });
  await expect(page.locator('.orc-checklist-lead')).toHaveText('Completaste la expedición.');
  await expect(checklist.locator('.orc-check.is-done')).toHaveCount(3);
  await expect(checklist).toContainText('Llegada: 4 de 4 paradas');
  await expect(checklist).toContainText('Viaje: 4 de 4 épocas');
  await expect(checklist.locator('.orc-check:not(.is-done)')).toContainText('Presión, viento y nubes: 0 de 3 (opcional)');

  await primary(page).click();
  await expect(log(page)).toContainText('1/2');
});

test('opens Orcadas from the 2D map, completes it, and updates the log', async ({ page }) => {
  await openOrcadasFromMap(page);
  await page
    .getByRole('navigation', { name: 'Capítulos de la expedición' })
    .getByRole('button', { name: /Responder/ })
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

test('from the 3D map with motion allowed, the camera zooms down to the island before the station opens', async ({
  page,
}) => {
  test.setTimeout(90_000);
  // The app reads the motion preference once, when it loads.
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.reload();
  const toggle = page.getByRole('group', { name: 'Modo de vista' });
  await toggle.getByRole('button', { name: 'Relieve 3D' }).click();
  await expect(toggle.getByRole('button', { name: 'Relieve 3D' })).toHaveAttribute('aria-pressed', 'true');
  const cluster = page.getByRole('button', { name: /Grupo de .*Estación Orcadas/ });
  const marker = page.getByRole('button', { name: /^Estación Orcadas, Islas Orcadas del Sur/ });
  await cluster.or(marker).first().waitFor();
  if (await cluster.isVisible()) await cluster.click();
  await page.evaluate(() => {
    const w = window as unknown as { __sawApproach?: boolean };
    new MutationObserver(() => {
      if (document.querySelector('.stage.approach') && document.querySelector('.veil.late')) w.__sawApproach = true;
    }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });
  });
  await marker.click();
  await expect(page.getByRole('heading', { level: 2, name: ORCADAS_GUIDING_QUESTION })).toBeVisible({
    timeout: 30_000,
  });
  expect(await page.evaluate(() => (window as unknown as { __sawApproach?: boolean }).__sawApproach)).toBe(true);
});

test('respects reducedMotion, jumps to tour stop on stop-hotspot click, and opens dialog on non-stop hotspot', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await openOrcadasFromMap(page);

  const vw = page.viewportSize()?.width ?? 1440;
  const vh = page.viewportSize()?.height ?? 900;
  const isMobilePortrait = vw < 900 && vh > vw;

  // Clicking a hotspot that is a tour stop of Llegar ("Casas históricas", stop 3) jumps to stop 3 without opening a dialog
  const houseHotspot = page.getByRole('button', { name: 'Punto de interés: Casas históricas' });
  await expect(houseHotspot).toBeVisible();
  await houseHotspot.click();
  await expect(page.locator('.orc-tour-count')).toHaveText('3 de 4');
  await expect(page.getByRole('dialog')).toHaveCount(0);

  // Return to stop 1 (overview) so all entry hotspots are visible in the scene
  await page.locator('.orc-btn-back').click();
  await page.locator('.orc-btn-back').click();
  await expect(page.locator('.orc-tour-count')).toHaveText('1 de 4');

  // Clicking a hotspot that is NOT a tour stop in Llegar ("Bahía Scotia y hielo marino") opens its card dialog + Escape focus return
  const spotBtn = page.getByRole('button', { name: 'Punto de interés: Bahía Scotia y hielo marino' });
  await spotBtn.click();
  const spotDialog = page.getByRole('dialog', { name: 'Bahía Scotia y hielo marino' });
  await expect(spotDialog).toBeVisible();
  if (isMobilePortrait) {
    await expectFocused(page, 'Volver al capítulo');
  } else {
    await expectFocused(page, 'Cerrar tarjeta de punto');
  }
  await page.keyboard.press('Escape');
  await expect(spotDialog).toHaveCount(0);
  await expectFocused(page, 'Punto de interés: Bahía Scotia y hielo marino');
});

test('BottomSheet on mobile portrait supports peek, small and tall via touch drag, handle tap, and Enter, and never closes', async ({
  page,
}) => {
  const vw = page.viewportSize()?.width ?? 1440;
  test.skip(vw > 420, 'Mobile portrait BottomSheet test');

  await openOrcadasFromMap(page);

  const panel = page.locator('.orc-panel.sheet');
  const handle = panel.locator('.sheet-handle');
  await expect(panel).toBeVisible();
  await expect(panel).toHaveAttribute('role', 'region');
  await expect(handle).toBeVisible();
  await expect(handle).toHaveAttribute('aria-expanded', 'false');

  const height = () => panel.evaluate((el) => el.getBoundingClientRect().height);
  const smallHeight = await height();

  const cdp = await page.context().newCDPSession(page);
  const drag = async (dy: number, from: Locator = handle) => {
    const box = (await from.boundingBox())!;
    const [x, y] = [box.x + box.width / 2, box.y + box.height / 2];
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let i = 1; i <= 8; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y + (dy * i) / 8 }] });
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  };

  // Drag down from small -> peek; panel remains visible and shows primary button
  await drag(200);
  await expect(panel).toHaveClass(/peek/);
  await expect(panel).toBeVisible();
  await expect(primary(page)).toBeVisible();

  // Dragging down again from peek never closes it
  await drag(200);
  await expect(panel).toHaveClass(/peek/);
  await expect(panel).toBeVisible();

  // Drag up from peek -> small
  await drag(-200);
  await expect(panel).not.toHaveClass(/peek/);
  await expect(panel).not.toHaveClass(/full/);
  await expect.poll(height).toBeCloseTo(smallHeight, 0);

  // Drag up from small -> tall
  await drag(-250);
  await expect(panel).toHaveClass(/full/);
  await expect(handle).toHaveAttribute('aria-expanded', 'true');
  await expect.poll(height).toBeGreaterThan(smallHeight + 150);

  // Drag down from tall -> small
  await drag(200);
  await expect(panel).not.toHaveClass(/full/);
  await expect(handle).toHaveAttribute('aria-expanded', 'false');

  // Tap handle: small -> tall -> small, and peek -> small
  await handle.tap();
  await expect(panel).toHaveClass(/full/);
  await handle.tap();
  await expect(panel).not.toHaveClass(/full/);
  await drag(200);
  await expect(panel).toHaveClass(/peek/);
  await handle.tap();
  await expect(panel).not.toHaveClass(/peek/);

  // Enter on handle: small -> tall -> small, and peek -> small
  await handle.focus();
  await page.keyboard.press('Enter');
  await expect(panel).toHaveClass(/full/);
  await page.keyboard.press('Enter');
  await expect(panel).not.toHaveClass(/full/);
  await drag(200);
  await expect(panel).toHaveClass(/peek/);
  await handle.focus();
  await page.keyboard.press('Enter');
  await expect(panel).not.toHaveClass(/peek/);

  // Advancing stop while in peek returns the sheet to small
  await drag(200);
  await expect(panel).toHaveClass(/peek/);
  await primary(page).click();
  await expect(panel).not.toHaveClass(/peek/);
  await expect(page.locator('.orc-tour-count')).toHaveText('2 de 4');
});

test('never renders facts from unverified sources in any chapter or tour stop (with all details open)', async ({
  page,
}) => {
  // Every stop of every chapter, with all of its details open: long on desktop, where the 3D scene keeps drawing.
  test.slow();
  await openOrcadasFromMap(page);

  const unverifiedSnippets = [
    'número OMM 88968',
    'El registro de hielo de la bahía Scotia empieza en 1903',
  ];

  const stepNames = ['Llegar', 'Observar', 'Viajar', 'Responder'];

  for (const stepName of stepNames) {
    await page
      .getByRole('navigation', { name: 'Capítulos de la expedición' })
      .getByRole('button', { name: new RegExp(stepName) })
      .click();

    while (true) {
      await openAllDetailsInPanel(page);
      const bodyText = await page.locator('.orc').innerText();
      for (const snippet of unverifiedSnippets) {
        expect(bodyText).not.toContain(snippet);
      }

      const btnText = (await primary(page).innerText()).trim();
      if (btnText !== 'Siguiente') break;
      await primary(page).click();
    }
  }
});

test('at most one TourCard is visible and zero fact cards appear outside details in every stop of every chapter', async ({
  page,
}) => {
  await openOrcadasFromMap(page);

  const chapters = ['Llegar', 'Observar', 'Viajar', 'Responder'];
  for (const name of chapters) {
    await page
      .getByRole('navigation', { name: 'Capítulos de la expedición' })
      .getByRole('button', { name: new RegExp(name) })
      .click();

    while (true) {
      const counts = await page.evaluate(() => {
        const panel = document.querySelector('.orc-panel');
        if (!panel) return { tourCards: 0, directFacts: 0 };
        const tourCards = Array.from(panel.querySelectorAll('.orc-tour-card')).filter(
          (el) => (el as HTMLElement).offsetParent !== null
        ).length;
        const directFacts = Array.from(panel.querySelectorAll('.orc-fact-card')).filter(
          (card) => !card.closest('details')
        ).length;
        return { tourCards, directFacts };
      });

      expect(counts.tourCards).toBeLessThanOrEqual(1);
      expect(counts.directFacts).toBe(0);

      const btnText = (await primary(page).innerText()).trim();
      if (btnText !== 'Siguiente') break;
      await primary(page).click();
    }
  }
});

test('B4: resetting panel scroll on chapter change', async ({ page }) => {
  await openOrcadasFromMap(page);

  // Navigate to Viajar and advance to its last stop (4 de 4), opening details so scroll container overflows on desktop too
  await page
    .getByRole('navigation', { name: 'Capítulos de la expedición' })
    .getByRole('button', { name: /Viajar/ })
    .click();
  await expect(page.getByRole('heading', { level: 2, name: 'Viaje en el tiempo' })).toBeVisible();
  while ((await primary(page).innerText()).trim() === 'Siguiente') {
    await primary(page).click();
  }
  await openAllDetailsInPanel(page);

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

  // Advance to next chapter (Responder)
  await primary(page).click();
  const nextHeading = page.getByRole('heading', { level: 2, name: 'La respuesta' });
  await expect(nextHeading).toBeVisible();

  const nextScrollTop = await page.evaluate(() => {
    const scrollEl = document.querySelector('.orc-panel-scroll');
    return scrollEl ? scrollEl.scrollTop : -1;
  });
  expect(nextScrollTop).toBe(0);
  await expect(nextHeading).toBeInViewport();
});

test('B7: opening Fuentes closes the hotspot dialog card and vice versa', async ({ page }) => {
  await openOrcadasFromMap(page);

  // Open a hotspot that is NOT a tour stop in Llegar
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

  // 1. Confirm temperature reading in Observar
  await page
    .getByRole('navigation', { name: 'Capítulos de la expedición' })
    .getByRole('button', { name: /Observar/ })
    .click();
  await expect(page.getByRole('heading', { level: 2, name: 'Observación del día' })).toBeVisible();
  await page.locator('.orc-obs-confirm-btn').first().click();
  await expect(page.locator('.orc-obs-feedback')).toBeVisible();

  // Check Responder sentence and summary before changing scene month
  await page
    .getByRole('navigation', { name: 'Capítulos de la expedición' })
    .getByRole('button', { name: /Responder/ })
    .click();
  await expect(page.getByRole('heading', { level: 2, name: 'La respuesta' })).toBeVisible();
  const sentenceBefore = await page.locator('.orc-answer-sentence').textContent();
  const summaryBefore = await page.locator('.orc-done-summary p').textContent();
  expect(sentenceBefore).toBeTruthy();

  // 2. Change month via chip (mobile portrait) or full month strip (desktop / landscape)
  const monthChip = page.locator('.orc-month-chip');
  if (await monthChip.isVisible()) {
    await monthChip.click();
    const popover = page.locator('#orc-month-popover');
    await expect(popover).toBeVisible();
    await popover.getByRole('button', { name: 'enero' }).click();
    await expect(popover).toHaveCount(0);
  } else {
    const monthStrip = page.getByRole('group', { name: 'Mes en la estación' });
    await expect(monthStrip).toBeVisible();
    const janBtn = monthStrip.getByRole('button', { name: 'enero' });
    await janBtn.click();
    await expect(janBtn).toHaveAttribute('aria-pressed', 'true');
  }

  // 3. In Responder, sentence and score summary remain tied to the observation month
  await expect(page.locator('.orc-answer-sentence')).toHaveText(sentenceBefore!);
  await expect(page.locator('.orc-done-summary p')).toHaveText(summaryBefore!);
  const currentMonthIdx = new Date().getMonth();
  if (currentMonthIdx !== 0) {
    expect(sentenceBefore).not.toContain('eneros');
  }
});

test('D4/D5: clicking a source reference opens Sources highlighted and clicking scrim closes it', async ({ page }) => {
  await openOrcadasFromMap(page);
  await expect(page.getByRole('heading', { level: 2, name: ORCADAS_GUIDING_QUESTION })).toBeVisible();

  const srcBtn = page.locator('.orc-panel .orc-src-link').first();
  await expect(srcBtn).toBeVisible();
  await srcBtn.click();

  const sourcesDialog = page.getByRole('dialog', { name: 'Fuentes' });
  await expect(sourcesDialog).toBeVisible();

  const highlightedCard = page.locator('.orc-source-card[data-highlight]');
  await expect(highlightedCard).toBeVisible();
  await expect(highlightedCard).toHaveAttribute('aria-current', 'true');

  const scrim = page.locator('.orc-scrim');
  await expect(scrim).toBeVisible();
  await scrim.click({ position: { x: 5, y: 5 } });

  await expect(sourcesDialog).toHaveCount(0);
});

test('D5: each source link card in Sources panel has height >= 44 px', async ({ page }) => {
  await openOrcadasFromMap(page);
  await page.getByRole('button', { name: 'Fuentes' }).click();

  const sourcesDialog = page.getByRole('dialog', { name: 'Fuentes' });
  await expect(sourcesDialog).toBeVisible();

  const toggleBtn = page.getByRole('button', { name: /Ver todas las fuentes/ });
  if (await toggleBtn.isVisible()) {
    await toggleBtn.click();
  }

  const links = page.locator('.orc-source-card');
  const count = await links.count();
  expect(count).toBeGreaterThan(0);

  for (let i = 0; i < count; i++) {
    const box = (await links.nth(i).boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
});

test('D2 (mobile): opening non-stop hotspot shows card in bottom panel with Volver al capítulo', async ({ page }) => {
  const vw = page.viewportSize()?.width ?? 900;
  test.skip(vw > 420, 'Mobile only test');

  await openOrcadasFromMap(page);

  const spotBtn = page.getByRole('button', { name: 'Punto de interés: Abrigo meteorológico' });
  await spotBtn.click();

  const panel = page.locator('.orc-panel');
  const returnBtn = panel.getByRole('button', { name: 'Volver al capítulo' });
  await expect(returnBtn).toBeVisible();
  await expect(panel.getByRole('heading', { level: 3, name: 'Abrigo meteorológico' })).toBeVisible();

  await returnBtn.click();
  await expect(returnBtn).toHaveCount(0);
  await expect(panel.getByRole('heading', { level: 2, name: ORCADAS_GUIDING_QUESTION })).toBeVisible();
});

test('D2 (desktop): non-stop hotspot card is within 360 px of dot and does not overlap side panel', async ({ page }) => {
  const vw = page.viewportSize()?.width ?? 900;
  test.skip(vw < 900, 'Desktop only test');

  await openOrcadasFromMap(page);

  const dotBtn = page.getByRole('button', { name: 'Punto de interés: Abrigo meteorológico' });
  await expect(dotBtn).toBeVisible();
  const dotBox = (await dotBtn.boundingBox())!;
  const dotCenter = {
    x: dotBox.x + dotBox.width / 2,
    y: dotBox.y + dotBox.height / 2,
  };

  await dotBtn.click();

  const card = page.locator('.orc-spot-card[role="dialog"]');
  await expect(card).toBeVisible();
  const cardBox = (await card.boundingBox())!;

  const closestX = Math.max(cardBox.x, Math.min(dotCenter.x, cardBox.x + cardBox.width));
  const closestY = Math.max(cardBox.y, Math.min(dotCenter.y, cardBox.y + cardBox.height));
  const dist = Math.hypot(dotCenter.x - closestX, dotCenter.y - closestY);
  expect(dist).toBeLessThan(360);

  const sidePanelBox = (await page.locator('.orc-panel').boundingBox())!;
  const overlapsSidePanel =
    cardBox.x < sidePanelBox.x + sidePanelBox.width &&
    cardBox.x + cardBox.width > sidePanelBox.x &&
    cardBox.y < sidePanelBox.y + sidePanelBox.height &&
    cardBox.y + cardBox.height > sidePanelBox.y;

  expect(overlapsSidePanel).toBe(false);
});

test('at 844x390 landscape the chapter h2 and primary button are in the viewport without scrolling', async ({ page }) => {
  const vp = page.viewportSize() ?? { width: 1440, height: 900 };
  test.skip(vp.width !== 844 || vp.height !== 390, 'Landscape 844x390 test only');

  await openOrcadasFromMap(page);

  const h2 = page.locator('.orc-chapter-h2');
  await expect(h2).toBeVisible();
  const h2Box = (await h2.boundingBox())!;
  expect(h2Box.y).toBeGreaterThanOrEqual(0);
  expect(h2Box.y + h2Box.height).toBeLessThanOrEqual(390);

  const primaryBtn = page.locator('.orc-btn-primary');
  await expect(primaryBtn).toBeVisible();
  const btnBox = (await primaryBtn.boundingBox())!;
  expect(btnBox.y).toBeGreaterThanOrEqual(0);
  expect(btnBox.y + btnBox.height).toBeLessThanOrEqual(390);

  const scrollTop = await page.evaluate(() => document.querySelector('.orc-panel-scroll')?.scrollTop ?? 0);
  expect(scrollTop).toBe(0);
});

test('at 360x740 the 4 chapter buttons are >= 44 px high and the nav does not scroll horizontally', async ({ page }) => {
  const vp = page.viewportSize() ?? { width: 1440, height: 900 };
  test.skip(vp.width !== 360 || vp.height !== 740, 'Compact 360x740 test only');

  await openOrcadasFromMap(page);

  const stepBtns = page.locator('.orc-step-btn');
  expect(await stepBtns.count()).toBe(4);
  for (let i = 0; i < 4; i++) {
    const box = (await stepBtns.nth(i).boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44);
  }

  const navScrolls = await page.evaluate(() => {
    const nav = document.querySelector('.orc-steps-nav');
    return nav ? nav.scrollWidth > nav.clientWidth : false;
  });
  expect(navScrolls).toBe(false);
});

test('on mobile the observation sheet opens tall with the thermometer plate and confirm button in the viewport', async ({
  page,
}) => {
  const vp = page.viewportSize() ?? { width: 1440, height: 900 };
  test.skip(vp.width > 420, 'Mobile portrait only test');

  await openOrcadasFromMap(page);
  await page.locator('.orc-step-btn').nth(1).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Observación del día' })).toBeVisible();

  const panel = page.locator('.orc-panel.sheet');
  await expect(panel).toHaveClass(/full/);

  const vh = vp.height;
  const plate = page.locator('.orc-obs-plate').first();
  await expect(plate).toBeVisible();
  await expect
    .poll(async () => {
      const box = await plate.boundingBox();
      return box ? box.y + box.height : 9999;
    })
    .toBeLessThanOrEqual(vh);
  const plateBox = (await plate.boundingBox())!;
  expect(plateBox.y).toBeGreaterThanOrEqual(0);

  const confirmBtn = page.locator('.orc-obs-confirm-btn').first();
  await expect(confirmBtn).toBeVisible();
  await expect
    .poll(async () => {
      const box = await confirmBtn.boundingBox();
      return box ? box.y + box.height : 9999;
    })
    .toBeLessThanOrEqual(vh);
  const btnBox = (await confirmBtn.boundingBox())!;
  expect(btnBox.y).toBeGreaterThanOrEqual(0);
});

test('G6: in the entry view every hotspot dot is inside the viewport and the camera cannot zoom out past the stage', async ({
  page,
}) => {
  await openOrcadasFromMap(page);
  const vw = page.viewportSize()?.width ?? 1440;
  const vh = page.viewportSize()?.height ?? 900;
  const dots = page.locator('[data-hotspot]');
  const n = await dots.count();
  expect(n).toBeGreaterThan(0);
  for (let i = 0; i < n; i++) {
    const dot = dots.nth(i);
    if ((await dot.evaluate((el) => getComputedStyle(el).opacity)) === '0') continue;
    const box = (await dot.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(vw);
    expect(box.y + box.height).toBeLessThanOrEqual(vh);
  }
  const ratio = await page.evaluate(() => {
    const c = (window as unknown as { __orcadasCamera: { distance: number; maxDistance: number } }).__orcadasCamera;
    return c.maxDistance / c.distance;
  });
  expect(ratio).toBeGreaterThan(1);
  expect(ratio).toBeLessThanOrEqual(1.25);
});
