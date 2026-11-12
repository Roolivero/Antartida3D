import { expect, test, type Page } from '@playwright/test';
import { answerFor, climateFor } from '../../core/src/orcadas.ts';

async function openOrcadasFromMap(page: Page) {
  const cluster = page.getByRole('button', { name: /Grupo de .*Estación Orcadas/ });
  if (await cluster.isVisible()) await cluster.click();
  await page.getByRole('button', { name: /^Estación Orcadas, Islas Orcadas del Sur/ }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Estación Orcadas' })).toBeVisible();
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

test('Viajar: renders annual series chart with moving average, two trend slopes, and cursor in sync', async ({
  page,
}) => {
  await openOrcadasFromMap(page);

  await page
    .getByRole('navigation', { name: 'Capítulos de la expedición' })
    .getByRole('button', { name: /Viajar/ })
    .click();
  await expect(page.getByRole('heading', { level: 2, name: 'Viaje en el tiempo' })).toBeVisible();

  // Verify no horizontal overflow
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow).toBeLessThanOrEqual(0);

  // Annual chart elements
  const chart = page.locator('.orc-century-svg');
  await expect(chart).toBeVisible();
  await expect(page.getByText('Media anual real')).toBeVisible();
  await expect(page.getByText('Media móvil 11 años')).toBeVisible();
  await expect(page.getByText('Recta de tendencia', { exact: true })).toBeVisible();

  // Two-segment trend banner
  const trendBanner = page.locator('.orc-century-trend-banner');
  await expect(trendBanner).toBeVisible();
  await expect(trendBanner).toContainText('−0,02 °C por década');
  await expect(trendBanner).toContainText('+0,13 °C por década');
  await expect(trendBanner).toContainText('Zazulie');

  // Verify year cursor sync: ruler and chart
  const rulerSlider = page.getByRole('slider', { name: 'Año en la estación' });
  const chartSlider = page.getByRole('slider', { name: 'Cursor de años en el gráfico histórico' });

  await rulerSlider.focus();
  await page.keyboard.press('Home');
  await expect(rulerSlider).toHaveAttribute('aria-valuenow', '1903');
  await expect(chartSlider).toHaveAttribute('aria-valuenow', '1903');
  await expect(page.getByRole('heading', { level: 3, name: 'Casa Omond' })).toBeVisible();
});

test('Responder: with user reading, sentence matches answerFor and chart shows threshold line', async ({
  page,
}) => {
  await openOrcadasFromMap(page);

  // 1. Enter temperature guess -3.0 in Observar
  await page
    .getByRole('navigation', { name: 'Capítulos de la expedición' })
    .getByRole('button', { name: /Observar/ })
    .click();
  await expect(page.getByRole('heading', { level: 2, name: 'Observación del día' })).toBeVisible();

  const tempControl = page.getByLabel(/^Temperatura del abrigo/);
  await tempControl.focus();
  await page.keyboard.type('-3.0');

  // 2. Navigate to Responder
  await page
    .getByRole('navigation', { name: 'Capítulos de la expedición' })
    .getByRole('button', { name: /Responder/ })
    .click();
  await expect(page.getByRole('heading', { level: 2, name: 'La respuesta' })).toBeVisible();

  // Guiding question heading
  await expect(page.locator('.orc-question')).toContainText('¿Cuánto cambió el clima');

  // Dot chart
  const dotChart = page.getByRole('img', { name: /Gráfico de puntos de temperatura/ });
  await expect(dotChart).toBeVisible();
  await expect(page.getByText(/Dato real: .* igual de frío o más/)).toBeVisible();
  await expect(page.getByText(/Dato real: .* más cálido/)).toBeVisible();
  await expect(page.getByText('Tu lectura (simulación)')).toBeVisible();

  // Check calculated sentence matches answerFor(-3.0, month)
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

  // Bitácora sellada closing content
  await expect(page.locator('.orc-seal')).toBeVisible();
  await expect(page.getByText('Bitácora sellada')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Terminar expedición' })).toBeVisible();
});

test('Responder: without reading shows monthly mean, reference line, and Volver a Observar button', async ({
  page,
}) => {
  await openOrcadasFromMap(page);

  // Directly navigate to Responder without recording readings
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

  // Button "Volver a Observar" returns to Observación chapter
  const backToObsBtn = page.getByRole('button', { name: 'Volver a Observar' });
  await expect(backToObsBtn).toBeVisible();
  await backToObsBtn.click();
  await expect(page.getByRole('heading', { level: 2, name: 'Observación del día' })).toBeVisible();
});
