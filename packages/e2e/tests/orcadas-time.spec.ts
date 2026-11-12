import { mkdirSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

const SHOTS_DIR =
  '/tmp/claude-1000/-home-lk-Proyectos-Antartida3D/124e784b-64ef-4eeb-a7c6-baa78f8de665/scratchpad/shots2/G';
try {
  mkdirSync(SHOTS_DIR, { recursive: true });
} catch {
  // ignore
}

function viewportTag(page: Page): string {
  const vp = page.viewportSize() ?? { width: 1440, height: 900 };
  return `${vp.width}x${vp.height}`;
}

async function openOrcadasChapter(page: Page, stepName: 'Un año' | 'Máquina del tiempo') {
  const cluster = page.getByRole('button', { name: /Grupo de .*Estación Orcadas/ });
  if (await cluster.isVisible()) await cluster.click();
  await page.getByRole('button', { name: /^Estación Orcadas, Islas Orcadas del Sur/ }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Estación Orcadas' })).toBeVisible();
  await page.waitForFunction(
    () => (window as unknown as { __orcadasReady?: boolean }).__orcadasReady === true
  );
  await page
    .getByRole('navigation', { name: 'Capítulos de la expedición' })
    .getByRole('button', { name: new RegExp(stepName) })
    .click();
}

const UNPUBLISHABLE_SNIPPETS = [
  '8 m sobre el nivel del mar',
  'número OMM 88968',
  'anemómetro de cazoletas Robinson',
  'El registro de hielo de la bahía Scotia empieza en 1903',
  'Zazulie',
];

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
});

test.afterEach(() => {
  expect(consoleErrors, 'console errors in orcadas-time').toEqual([]);
});

test('YearWheel: rotates month with keyboard, announces month name, moves solar hour, steps year with reduced motion, and hides unpublishable facts', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openOrcadasChapter(page, 'Un año');

  await expect(page.getByRole('heading', { level: 2, name: 'Un año en Orcadas' })).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow).toBeLessThanOrEqual(0);

  const wheelSlider = page.getByRole('slider', { name: /Rueda del año/i });
  await expect(wheelSlider).toBeVisible();

  // Jump to January (Home), then step to June (5 ArrowRight presses -> month 6)
  await wheelSlider.focus();
  await page.keyboard.press('Home');
  await expect(wheelSlider).toHaveAttribute('aria-valuenow', '1');
  await expect(wheelSlider).toHaveAttribute('aria-valuetext', 'enero');

  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('ArrowRight');
  }
  await expect(wheelSlider).toHaveAttribute('aria-valuenow', '6');
  await expect(wheelSlider).toHaveAttribute('aria-valuetext', 'junio');

  // Verify exact reading for June + climate + sea ice
  await expect(page.getByText('En junio el día dura 5 h 40 min')).toBeVisible();
  await expect(page.getByRole('status').getByText(/-9,0 °C/)).toBeVisible();
  await expect(page.getByText(/70 % cubierto/)).toBeVisible();
  await page.screenshot({ path: `${SHOTS_DIR}/${viewportTag(page)}-year-junio.png` });

  // Move the sun slider to midnight (Home -> 00:00 h) and verify night state, then advance hour
  const sunSlider = page.getByRole('slider', { name: 'Hora solar' });
  await sunSlider.focus();
  await page.keyboard.press('Home');
  await expect(sunSlider).toHaveAttribute('aria-valuenow', '0');
  await expect(sunSlider).toHaveAttribute('aria-valuetext', /00:00 horas, noche/);
  await expect(page.getByText(/Noche estrellada/)).toBeVisible();
  await page.screenshot({ path: `${SHOTS_DIR}/${viewportTag(page)}-year-noche.png` });

  await page.keyboard.press('End');
  await expect(sunSlider).toHaveAttribute('aria-valuenow', '23');

  // "Pasar el año" button advances by step under reduced motion
  const playBtn = page.getByRole('button', { name: 'Pasar el año' });
  await playBtn.click();
  await expect(wheelSlider).toHaveAttribute('aria-valuenow', '7');
  await expect(wheelSlider).toHaveAttribute('aria-valuetext', 'julio');

  // Ensure no unpublishable facts are in the DOM
  const textContent = await page.locator('.orc').innerText();
  for (const snippet of UNPUBLISHABLE_SNIPPETS) {
    expect(textContent).not.toContain(snippet);
  }
});

test('TimeMachine: traverses all eras with buttons, updates era title and continuous record calculation, and renders only publishable facts', async ({
  page,
}) => {
  await openOrcadasChapter(page, 'Máquina del tiempo');

  await expect(page.getByRole('heading', { level: 2, name: 'Máquina del tiempo' })).toBeVisible();

  const rulerSlider = page.getByRole('slider', { name: 'Año en la estación' });
  await expect(rulerSlider).toBeVisible();

  // Jump to first year (1903) via Home key on the ruler slider
  await rulerSlider.focus();
  await page.keyboard.press('Home');
  await expect(rulerSlider).toHaveAttribute('aria-valuenow', '1903');
  await expect(page.getByRole('heading', { level: 3, name: 'Casa Omond' })).toBeVisible();
  await expect(page.getByText('1903 − 1903 = 0 años sin pausa')).toBeVisible();
  await page.screenshot({ path: `${SHOTS_DIR}/${viewportTag(page)}-eras-1903.png` });

  const nextEraBtn = page.getByRole('button', { name: /Era siguiente/i });
  const prevEraBtn = page.getByRole('button', { name: /Era anterior/i });

  await expect(prevEraBtn).toBeDisabled();

  // Traverse forward through all remaining eras
  const expectedForwardEras = [
    { year: '1905', title: 'Casa Moneta', diff: '1905 − 1903 = 2 años sin pausa' },
    { year: '1927', title: 'Primera estación de radio', diff: '1927 − 1903 = 24 años sin pausa' },
    { year: '1951', title: 'Destacamento Naval', diff: '1951 − 1903 = 48 años sin pausa' },
    { year: '2000', title: 'Bases científicas modernas', diff: '2000 − 1903 = 97 años sin pausa' },
  ];

  for (const era of expectedForwardEras) {
    await nextEraBtn.click();
    await expect(rulerSlider).toHaveAttribute('aria-valuenow', era.year);
    await expect(page.getByRole('heading', { level: 3, name: era.title })).toBeVisible();
    await expect(page.getByText(era.diff)).toBeVisible();

    const domText = await page.locator('.orc').innerText();
    for (const snippet of UNPUBLISHABLE_SNIPPETS) {
      expect(domText).not.toContain(snippet);
    }
  }

  await expect(nextEraBtn).toBeDisabled();
  await page.screenshot({ path: `${SHOTS_DIR}/${viewportTag(page)}-eras-2000.png` });

  // Step backward one era to verify "Era anterior" button
  await prevEraBtn.click();
  await expect(page.getByRole('heading', { level: 3, name: 'Destacamento Naval' })).toBeVisible();
});
