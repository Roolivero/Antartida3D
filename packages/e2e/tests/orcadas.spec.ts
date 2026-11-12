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

async function openFosilesFromList(page: Page) {
  await page.getByRole('button', { name: 'Ver como lista' }).click();
  await page.getByRole('dialog', { name: 'Todos los puntos' }).getByRole('button', { name: /Fósiles/ }).click();
  await expect(page.getByRole('heading', { name: '¿Cómo era la Antártida antes del hielo?' })).toBeVisible();
}

async function brushWithPointer(page: Page, spot: number) {
  const box = (await page.locator('.dig').boundingBox())!;
  const spots = [{ x: 0.23, y: 0.613 }, { x: 0.535, y: 0.753 }, { x: 0.795, y: 0.56 }];
  for (let i = 0; i < 4; i++) {
    await page.mouse.click(box.x + spots[spot].x * box.width, box.y + spots[spot].y * box.height);
    await page.waitForTimeout(140);
  }
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
  await expect(log(page)).toContainText('0/3');
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

  // Chapter 2: Observación (focus moves to h2, primary button disabled until 4 readings entered)
  await expectFocused(page, 'Observación del día');
  await expect(primary(page)).toBeDisabled();

  await tabTo(page, /^Temperatura del abrigo/);
  await page.keyboard.type('-2.5');
  await tabTo(page, /^Presión atmosférica/);
  await page.keyboard.type('992');
  await tabTo(page, /^Velocidad del viento/);
  await page.keyboard.type('24');
  await tabTo(page, /^Cobertura de nubes/);
  await page.keyboard.type('6');

  await expect(primary(page)).toBeEnabled();
  await tabTo(page, /^Recorrer el año$/);
  await page.keyboard.press('Enter');

  // Chapter 3: Un año
  await expectFocused(page, 'Un año en Orcadas');
  await expect(page.getByText(/h de luz/)).toBeVisible();
  await tabTo(page, /^Viajar en el tiempo$/);
  await page.keyboard.press('Enter');

  // Chapter 4: Máquina del tiempo
  await expectFocused(page, 'Máquina del tiempo');
  await expect(page.getByRole('heading', { name: 'Bases científicas modernas' })).toBeVisible();
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

  await expect(log(page)).toContainText('1/3');
  await expect(page.locator('.toast')).toHaveText(
    'Estación Orcadas quedó explorado. Registro de exploración: 1/3'
  );
});

test('opens Orcadas from the 2D map, completes it, and reaches 2/3 after Fósiles', async ({ page }) => {
  await openOrcadasFromMap(page);
  await page
    .getByRole('navigation', { name: 'Capítulos de la expedición' })
    .getByRole('button', { name: /Cierre/ })
    .click();
  await page.getByRole('button', { name: 'Terminar expedición' }).click();

  await expect(log(page)).toContainText('1/3');
  await expect(page.locator('.toast')).toHaveText(
    'Estación Orcadas quedó explorado. Registro de exploración: 1/3'
  );
  await expect(page.locator('.stage.ret')).toHaveCount(0);

  await openFosilesFromList(page);
  await primary(page).click();
  for (const spot of [0, 1, 2]) {
    await brushWithPointer(page, spot);
    const card = page.getByRole('dialog');
    await card.getByRole('button', { name: spot < 2 ? 'Seguir excavando' : 'Comparar evidencias' }).click();
  }
  await page.getByRole('button', { name: /Con tres restos todavía no alcanza/ }).click();
  await primary(page).click();
  await primary(page).click();
  await primary(page).click();

  await expect(log(page)).toContainText('2/3');
  await expect(page.locator('.toast')).toHaveText('Fósiles quedó explorado. Registro de exploración: 2/3');
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
    '8 m sobre el nivel del mar',
    'número OMM 88968',
    'anemómetro de cazoletas Robinson',
    'El registro de hielo de la bahía Scotia empieza en 1903',
    'Zazulie',
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
