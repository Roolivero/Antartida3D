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

async function openOrcadasChapter(page: Page, stepName: 'Viajar' | 'Responder' | 'Llegar' | 'Observar') {
  const cluster = page.getByRole('button', { name: /Grupo de .*Estación Orcadas/ });
  if (await cluster.isVisible()) await cluster.click();
  await page.getByRole('button', { name: /^Estación Orcadas, Islas Orcadas del Sur/ }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Estación Orcadas' })).toBeVisible();
  await page.waitForFunction(
    () => (window as unknown as { __orcadasReady?: boolean }).__orcadasReady === true
  );
  if (stepName !== 'Llegar') {
    await page
      .getByRole('navigation', { name: 'Capítulos de la expedición' })
      .getByRole('button', { name: new RegExp(stepName) })
      .click();
  }
}

const UNPUBLISHABLE_SNIPPETS = [
  'número OMM 88968',
  'El registro de hielo de la bahía Scotia empieza en 1903',
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

test('MonthStrip: changes month with arrow keys, no horizontal scroll at 390 px, opens Saber más with sun arc and facts', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openOrcadasChapter(page, 'Llegar');

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow).toBeLessThanOrEqual(0);

  const monthStrip = page.getByRole('group', { name: 'Mes en la estación' });
  await expect(monthStrip).toBeVisible();

  // 12 month buttons present
  const monthBtns = monthStrip.getByRole('button');
  await expect(monthBtns).toHaveCount(12);

  // Jump to January via Home key on month strip
  const firstBtn = monthStrip.getByRole('button', { name: 'enero' });
  await firstBtn.focus();
  await page.keyboard.press('Home');
  await expect(firstBtn).toHaveAttribute('aria-pressed', 'true');

  // Step 5 months to June with ArrowRight
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('ArrowRight');
  }
  const juneBtn = monthStrip.getByRole('button', { name: 'junio' });
  await expect(juneBtn).toHaveAttribute('aria-pressed', 'true');

  // Open <details> "Saber más"
  const details = page.locator('.orc-month-details');
  await details.locator('> summary').click();
  await expect(page.getByText(/Luz solar en junio/)).toBeVisible();
  await expect(page.getByText(/Bahía Scotia:/)).toBeVisible();

  // Move the sun slider to midnight (Home -> 00:00 h) and verify night state
  const sunSlider = page.getByRole('slider', { name: 'Hora solar' });
  await sunSlider.focus();
  await page.keyboard.press('Home');
  await expect(sunSlider).toHaveAttribute('aria-valuenow', '0');
  await expect(sunSlider).toHaveAttribute('aria-valuetext', /00:00 horas, noche/);
  await expect(page.getByText(/Noche estrellada/)).toBeVisible();

  // Ensure no unpublishable facts are in the DOM
  const textContent = await page.locator('.orc').innerText();
  for (const snippet of UNPUBLISHABLE_SNIPPETS) {
    expect(textContent).not.toContain(snippet);
  }
});

test('Viajar: traverses eras, moves ruler slider and updates chart cursor in sync, hides flag/mast in 1903, and shows illustrative date for Hoy', async ({
  page,
}) => {
  await openOrcadasChapter(page, 'Viajar');
  await expect(page.getByRole('heading', { level: 2, name: 'Viaje en el tiempo' })).toBeVisible();

  const rulerSlider = page.getByRole('slider', { name: 'Año en la estación' });
  const chartSlider = page.getByRole('slider', { name: 'Cursor de años en el gráfico histórico' });
  await expect(rulerSlider).toBeVisible();
  await expect(chartSlider).toBeVisible();

  // Jump to first year (1903) via Home key on the ruler slider
  await rulerSlider.focus();
  await page.keyboard.press('Home');
  await expect(rulerSlider).toHaveAttribute('aria-valuenow', '1903');
  await expect(chartSlider).toHaveAttribute('aria-valuenow', '1903');
  await expect(page.getByRole('heading', { level: 3, name: 'Casa Omond' })).toBeVisible();
  await expect(page.getByText('Registro desde 1903: primer año')).toBeVisible();

  // Flag and wind mast hotspots are absent in 1903 (B2)
  const flagHotspot = page.getByRole('button', { name: 'Punto de interés: Mástil y pabellón' });
  const windMastHotspot = page.getByRole('button', { name: 'Punto de interés: Mástil de viento' });
  await expect(flagHotspot).toHaveCount(0);
  await expect(windMastHotspot).toHaveCount(0);

  // Traverse forward through all remaining eras
  const nextEraBtn = page.getByRole('button', { name: /Era siguiente/i });
  const prevEraBtn = page.getByRole('button', { name: /Era anterior/i });

  await expect(prevEraBtn).toBeDisabled();

  const expectedForwardEras = [
    { year: '1904', title: 'Traspaso a la Argentina', span: 'Registro desde 1903: 1 año, 0 de ellos completos' },
    { year: '1905', title: 'Casa Moneta', span: 'Registro desde 1903: 2 años, 1 de ellos completos' },
    { year: '1927', title: 'Primera estación de radio', span: 'Registro desde 1903: 24 años, 23 de ellos completos' },
    { year: '1951', title: 'Destacamento Naval', span: 'Registro desde 1903: 48 años, 47 de ellos completos' },
    { year: '2000', title: 'Hoy', span: 'Registro desde 1903: 97 años, 96 de ellos completos' },
  ];

  for (const era of expectedForwardEras) {
    await nextEraBtn.click();
    await expect(rulerSlider).toHaveAttribute('aria-valuenow', era.year);
    await expect(chartSlider).toHaveAttribute('aria-valuenow', era.year);
    await expect(page.getByRole('heading', { level: 3, name: era.title })).toBeVisible();
    await expect(page.getByText(era.span)).toBeVisible();

    const domText = await page.locator('.orc').innerText();
    for (const snippet of UNPUBLISHABLE_SNIPPETS) {
      expect(domText).not.toContain(snippet);
    }
  }

  // At the latest era (Hoy), verify illustrative start chip and absence of 2000 in era card
  const eraCard = page.locator('.orc-era-card');
  await expect(eraCard).toContainText('Fecha ilustrativa');
  await expect(eraCard).not.toContainText('2000');
  await expect(page.getByRole('button', { name: 'Hoy' })).toBeVisible();
  await expect(page.getByRole('button', { name: '2000' })).toHaveCount(0);

  // At the latest era, both hotspots exist (B2)
  await expect(flagHotspot).toBeVisible();
  await expect(windMastHotspot).toBeVisible();

  await expect(nextEraBtn).toBeDisabled();

  // Moving chart slider backward updates the ruler slider in sync
  await chartSlider.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(chartSlider).toHaveAttribute('aria-valuenow', '1999');
  await expect(rulerSlider).toHaveAttribute('aria-valuenow', '1999');
  await expect(page.getByRole('heading', { level: 3, name: 'Destacamento Naval' })).toBeVisible();
});
