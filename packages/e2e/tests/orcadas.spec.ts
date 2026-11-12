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

  // Chapter 1: Llegar -> Observar
  await tabTo(page, /^Hacer la observación$/);
  await page.keyboard.press('Enter');

  // Chapter 2: Observar (focus moves to h2, primary button is enabled with "Seguir" and shows missing count)
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
  await expect(primary(page)).toHaveText('Viajar en el tiempo');
  await tabTo(page, /^Viajar en el tiempo$/);
  await page.keyboard.press('Enter');

  // Chapter 3: Viajar
  await expectFocused(page, 'Viaje en el tiempo');
  await expect(page.getByRole('heading', { level: 3, name: 'Hoy' })).toBeVisible();
  await tabTo(page, /^Ver la respuesta$/);
  await page.keyboard.press('Enter');

  // Chapter 4: Responder
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
  // Back on the map, focus lands on the marker of the expedition that was just finished.
  await expect.poll(() => focusedName(page)).toContain('Estación Orcadas');
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
  if (vw <= 420) {
    await expectFocused(page, 'Volver al capítulo');
  } else {
    await expectFocused(page, 'Cerrar tarjeta de punto');
  }
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
    'Llegar',
    'Observar',
    'Viajar',
    'Responder',
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

  // Navigate to Viajar (journey) which is tall enough to scroll on both mobile and desktop
  await page
    .getByRole('navigation', { name: 'Capítulos de la expedición' })
    .getByRole('button', { name: /Viajar/ })
    .click();
  await expect(page.getByRole('heading', { level: 2, name: 'Viaje en el tiempo' })).toBeVisible();

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
  const nextHeading = page.getByRole('heading', { level: 2, name: 'La respuesta' });
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
    .getByRole('button', { name: /Observar/ })
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

  // Check Responder summary text before changing month
  await page
    .getByRole('navigation', { name: 'Capítulos de la expedición' })
    .getByRole('button', { name: /Responder/ })
    .click();
  await expect(page.getByRole('heading', { level: 2, name: 'La respuesta' })).toBeVisible();
  const summaryBefore = await page.locator('.orc-done-summary p').textContent();
  expect(summaryBefore).toContain('Tu observación de');

  // 2. Change month via the month strip
  const monthStrip = page.getByRole('group', { name: 'Mes en la estación' });
  await expect(monthStrip).toBeVisible();
  const janBtn = monthStrip.getByRole('button', { name: 'enero' });
  await janBtn.click();
  await expect(janBtn).toHaveAttribute('aria-pressed', 'true');

  // 3. In Responder, the text still names the original month and the score text is unchanged
  const summaryAfter = await page.locator('.orc-done-summary p').textContent();
  expect(summaryAfter).toBe(summaryBefore);
  const currentMonthIdx = new Date().getMonth();
  if (currentMonthIdx !== 0) {
    expect(summaryAfter).not.toContain('Tu observación de enero');
  }
});

test('D1: a chapter panel never shows more than 2 fact cards outside details.orc-more in any chapter', async ({ page }) => {
  await openOrcadasFromMap(page);

  const chapters = ['Llegar', 'Observar', 'Viajar', 'Responder'];
  for (const name of chapters) {
    await page
      .getByRole('navigation', { name: 'Capítulos de la expedición' })
      .getByRole('button', { name: new RegExp(name) })
      .click();

    // Wait for the chapter to settle
    await page.waitForTimeout(100);

    // Check count of fact cards outside details.orc-more
    const directFactsCount = await page.evaluate(() => {
      const panel = document.querySelector('.orc-panel');
      if (!panel) return 0;
      const allCards = Array.from(panel.querySelectorAll('.orc-fact-card'));
      const outsideMore = allCards.filter((card) => !card.closest('details.orc-more'));
      return outsideMore.length;
    });

    expect(directFactsCount).toBeLessThanOrEqual(2);
  }
});

test('D4/D5: clicking a source reference opens Sources highlighted and clicking scrim closes it', async ({ page }) => {
  await openOrcadasFromMap(page);
  await expect(page.getByRole('heading', { level: 2, name: 'Estación Orcadas' })).toBeVisible();

  // Find a source link button in the arrival panel facts
  const srcBtn = page.locator('.orc-panel .orc-src-link').first();
  await expect(srcBtn).toBeVisible();

  await srcBtn.click();

  // Sources dialog opens
  const sourcesDialog = page.getByRole('dialog', { name: 'Fuentes' });
  await expect(sourcesDialog).toBeVisible();

  // Check highlighted card
  const highlightedCard = page.locator('.orc-source-card[data-highlight]');
  await expect(highlightedCard).toBeVisible();
  await expect(highlightedCard).toHaveAttribute('aria-current', 'true');

  // Clicking the scrim closes Sources
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

  // Switch to all expedition sources to verify every single source link
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

test('D2 (mobile): opening hotspot shows card in bottom panel with Volver al capítulo', async ({ page }) => {
  const vw = page.viewportSize()?.width ?? 900;
  test.skip(vw > 420, 'Mobile only test');

  await openOrcadasFromMap(page);

  // Click hotspot
  const spotBtn = page.getByRole('button', { name: 'Punto de interés: Abrigo meteorológico' });
  await spotBtn.click();

  // The bottom panel now contains the hotspot card dialog
  const panel = page.locator('.orc-panel');
  const returnBtn = panel.getByRole('button', { name: 'Volver al capítulo' });
  await expect(returnBtn).toBeVisible();
  await expect(panel.getByRole('heading', { level: 3, name: 'Abrigo meteorológico' })).toBeVisible();

  // Return to chapter content
  await returnBtn.click();
  await expect(returnBtn).toHaveCount(0);
  await expect(panel.getByRole('heading', { level: 2, name: 'Estación Orcadas' })).toBeVisible();
});

test('D2 (desktop): hotspot card is within 360 px of dot and does not overlap side panel', async ({ page }) => {
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

  // Check distance to dot
  const closestX = Math.max(cardBox.x, Math.min(dotCenter.x, cardBox.x + cardBox.width));
  const closestY = Math.max(cardBox.y, Math.min(dotCenter.y, cardBox.y + cardBox.height));
  const dist = Math.hypot(dotCenter.x - closestX, dotCenter.y - closestY);
  expect(dist).toBeLessThan(360);

  // Check no overlap with side panel
  const sidePanelBox = (await page.locator('.orc-panel').boundingBox())!;
  const overlapsSidePanel =
    cardBox.x < sidePanelBox.x + sidePanelBox.width &&
    cardBox.x + cardBox.width > sidePanelBox.x &&
    cardBox.y < sidePanelBox.y + sidePanelBox.height &&
    cardBox.y + cardBox.height > sidePanelBox.y;

  expect(overlapsSidePanel).toBe(false);
});
