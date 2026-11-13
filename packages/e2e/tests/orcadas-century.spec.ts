import { expect, test, type Page } from '@playwright/test';
import { ORCADAS_GUIDING_QUESTION } from '../../core/src/content/orcadas.ts';
import { answerFor, climateFor } from '../../core/src/orcadas.ts';

async function openOrcadasFromMap(page: Page) {
  const cluster = page.getByRole('button', { name: /Grupo de .*Estación Orcadas/ });
  if (await cluster.isVisible()) await cluster.click();
  await page.getByRole('button', { name: /^Estación Orcadas, Islas Orcadas del Sur/ }).click();
  await expect(page.getByRole('heading', { level: 2, name: ORCADAS_GUIDING_QUESTION })).toBeVisible();
  await page.waitForFunction(
    () => (window as unknown as { __orcadasReady?: boolean }).__orcadasReady === true
  );
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
});

test.afterEach(() => {
  expect(consoleErrors, 'console errors (hydration mismatches, exceptions)').toEqual([]);
});

test('Viajar: renders annual series chart, folds legend and two-segment trend in details, and syncs cursor with stops', async ({
  page,
}) => {
  await openOrcadasFromMap(page);

  await page
    .getByRole('navigation', { name: 'Capítulos de la expedición' })
    .getByRole('button', { name: /Viajar/ })
    .click();
  await expect(page.getByRole('heading', { level: 2, name: 'Viaje en el tiempo' })).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow).toBeLessThanOrEqual(0);

  const chart = page.locator('.orc-century-svg');
  await expect(chart).toBeVisible();

  // Legend and two-segment trend live folded inside "Cómo leer el gráfico"
  const legendDetails = page.locator('details.orc-century-details');
  await expect(legendDetails).not.toHaveAttribute('open', /.*/);
  await legendDetails.locator('> summary').click();

  await expect(
    page.getByText(/Media de cada año \(dato real; la línea se corta en los años incompletos\)/)
  ).toBeVisible();
  await expect(page.getByText('Media móvil de 11 años (cálculo)')).toBeVisible();
  await expect(page.getByText('Tendencia en dos tramos (cálculo)')).toBeVisible();

  const trendBanner = page.locator('.orc-century-trend-banner');
  await expect(trendBanner).toBeVisible();
  await expect(trendBanner).toContainText('−0,02 °C por década');
  await expect(trendBanner).toContainText('+0,13 °C por década');
  await expect(trendBanner).toContainText('Zazulie');

  // Verify cursor sync with tour stops and Home key
  const chartSlider = page.getByRole('slider', { name: 'Cursor de años en el gráfico histórico' });
  await expect(chartSlider).toHaveAttribute('aria-valuenow', '1903');
  await page.locator('.orc-btn-primary').click();
  await expect(chartSlider).toHaveAttribute('aria-valuenow', '1927');
  await expect(page.locator('.orc-year-counter')).toHaveAttribute('aria-label', 'Año 1927');

  await chartSlider.focus();
  await page.keyboard.press('Home');
  await expect(chartSlider).toHaveAttribute('aria-valuenow', '1903');
  await expect(page.locator('.orc-year-counter')).toHaveAttribute('aria-label', 'Año 1903');
});

test('Responder: with user reading, sentence matches answerFor, chart shows threshold line, and observation detail is folded', async ({
  page,
}) => {
  await openOrcadasFromMap(page);

  // 1. Enter temperature guess -3.0 in Observar via Ajuste fino
  await page
    .getByRole('navigation', { name: 'Capítulos de la expedición' })
    .getByRole('button', { name: /Observar/ })
    .click();
  await expect(page.getByRole('heading', { level: 2, name: 'Observación del día' })).toBeVisible();

  await page.locator('details.orc-obs-fine > summary').click();
  const numInput = page.locator('details.orc-obs-fine .orc-obs-num-input');
  await numInput.fill('-3.0');
  await page.locator('.orc-obs-confirm-btn').first().click();
  await expect(page.locator('.orc-obs-feedback')).toBeVisible();

  // 2. Navigate to Responder
  await page
    .getByRole('navigation', { name: 'Capítulos de la expedición' })
    .getByRole('button', { name: /Responder/ })
    .click();
  await expect(page.getByRole('heading', { level: 2, name: 'La respuesta' })).toBeVisible();

  await expect(page.locator('.orc-question')).toContainText('¿Cuánto cambió el clima');

  const dotChart = page.getByRole('img', { name: /Gráfico de puntos de temperatura/ });
  await expect(dotChart).toBeVisible();
  await expect(page.getByText(/Dato real: .* igual de frío o más/)).toBeVisible();
  await expect(page.getByText(/Dato real: .* más cálido/)).toBeVisible();
  await expect(page.getByText('Tu lectura (simulación)')).toBeVisible();

  const currentMonth = new Date().getMonth() + 1;
  const [seg1, seg2] = answerFor(-3.0, currentMonth);

  const sentenceBlock = page.locator('.orc-answer-sentence-block');
  await expect(sentenceBlock).toBeVisible();
  await expect(sentenceBlock).toContainText(`${seg1.fromYear}`);
  await expect(sentenceBlock).toContainText(`${seg1.toYear}`);
  await expect(sentenceBlock).toContainText(`${seg1.asCold} de ${seg1.years}`);
  await expect(sentenceBlock).toContainText(`${seg2.fromYear}`);
  await expect(sentenceBlock).toContainText(`${seg2.asCold} de ${seg2.years}`);
  await expect(sentenceBlock).toContainText('−3,0 °C');
  await expect(sentenceBlock).toContainText('SCAR READER');

  await expect(page.locator('.orc-seal')).toBeVisible();
  await expect(page.getByText('Bitácora sellada')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Terminar expedición' })).toBeVisible();

  // Detailed reading breakdown stays folded under "Tu observación del día"
  const obsDetails = page.locator('details.orc-more', { hasText: 'Tu observación del día' });
  await expect(obsDetails).not.toHaveAttribute('open', /.*/);
  await obsDetails.locator('> summary').click();
  await expect(page.locator('.orc-done-readings')).toContainText('−3,0 °C');
});

test('Responder: without reading shows monthly mean, reference line, and Volver a Observar button', async ({
  page,
}) => {
  await openOrcadasFromMap(page);

  await page
    .getByRole('navigation', { name: 'Capítulos de la expedición' })
    .getByRole('button', { name: /Responder/ })
    .click();
  await expect(page.getByRole('heading', { level: 2, name: 'La respuesta' })).toBeVisible();

  const currentMonth = new Date().getMonth() + 1;
  const climate = climateFor(currentMonth);
  const [seg1, seg2] = answerFor(climate.tempMeanC, currentMonth);

  const sentenceBlock = page.locator('.orc-answer-sentence-block');
  await expect(sentenceBlock).toBeVisible();
  await expect(sentenceBlock).toContainText('la media de');
  await expect(sentenceBlock).toContainText(`${seg1.fromYear}`);
  await expect(sentenceBlock).toContainText(`${seg1.asCold} de ${seg1.years}`);
  await expect(sentenceBlock).toContainText(`${seg2.asCold} de ${seg2.years}`);

  // Straight to Responder: the checklist shows what was left, dashed.
  await expect(page.locator('.orc-checklist-lead')).toContainText('Te faltó lo punteado');
  await expect(page.locator('.orc-check', { hasText: 'Temperatura sin anotar' })).not.toHaveClass(/is-done/);

  const backToObsBtn = page.getByRole('button', { name: 'Volver a Observar' });
  await expect(backToObsBtn).toBeVisible();
  await backToObsBtn.click();
  await expect(page.getByRole('heading', { level: 2, name: 'Observación del día' })).toBeVisible();
});
