import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const SHOTS_DIR =
  '/tmp/claude-1000/-home-lk-Proyectos-Antartida3D/124e784b-64ef-4eeb-a7c6-baa78f8de665/scratchpad/shots2/H';

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

test('switches between the three century views with keyboard, moves the year cursor, opens the table, and labels the user observation as simulación', async ({
  page,
}) => {
  await openOrcadasFromMap(page);

  // Enter a user temperature reading in Chapter 2 (Observación) so userTempC is passed to CenturyChart
  await page
    .getByRole('navigation', { name: 'Capítulos de la expedición' })
    .getByRole('button', { name: /Observación/ })
    .click();
  await expect(page.getByRole('heading', { level: 2, name: 'Observación del día' })).toBeVisible();

  const tempControl = page.getByLabel(/^Temperatura del abrigo/);
  await tempControl.focus();
  await page.keyboard.type('-2.5');

  // Navigate to Chapter 5: El siglo en datos
  await page
    .getByRole('navigation', { name: 'Capítulos de la expedición' })
    .getByRole('button', { name: /El siglo/ })
    .click();
  await expect(page.getByRole('heading', { level: 2, name: 'El siglo en datos' })).toBeVisible();

  // Verify no horizontal overflow
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow).toBeLessThanOrEqual(0);

  // Verify source & license visibility
  await expect(
    page.getByText('Datos: SCAR READER, British Antarctic Survey. Open Government Licence v3.0')
  ).toBeVisible();

  const vw = page.viewportSize()?.width ?? 1440;
  const vh = page.viewportSize()?.height ?? 900;
  const prefix = `${vw}x${vh}`;
  mkdirSync(SHOTS_DIR, { recursive: true });

  // 1. Switch between the three views with the keyboard
  const tabAnnual = page.getByRole('tab', { name: /Año por año/ });
  const tabStripes = page.getByRole('tab', { name: /Franjas/ });
  const tabMonth = page.getByRole('tab', { name: /Tu mes/ });

  await expect(tabAnnual).toHaveAttribute('aria-selected', 'true');
  const trendBanner = page.locator('.orc-century-trend-banner');
  await expect(trendBanner).toBeVisible();
  await expect(trendBanner).toContainText('Cálculo sobre la serie');
  await expect(trendBanner).toContainText('−0,02 °C por década');
  await expect(trendBanner).toContainText('+0,13 °C por década');
  const bannerText = await trendBanner.innerText();
  expect(bannerText.match(/por década/g)?.length).toBe(2);
  await expect(page.getByText(/Media móvil 11 años/)).toBeVisible();
  await page.screenshot({ path: `${SHOTS_DIR}/${prefix}-century-annual.png` });

  await tabAnnual.focus();
  await page.keyboard.press('ArrowRight');
  await expect(tabStripes).toHaveAttribute('aria-selected', 'true');
  await expect(tabStripes).toBeFocused();
  await expect(page.getByText(/Media histórica 1903–2026:/)).toBeVisible();
  await page.screenshot({ path: `${SHOTS_DIR}/${prefix}-century-stripes.png` });

  await page.keyboard.press('ArrowRight');
  await expect(tabMonth).toHaveAttribute('aria-selected', 'true');
  await expect(tabMonth).toBeFocused();
  await expect(page.getByText(/Más frío en /).first()).toBeVisible();
  await expect(page.getByText(/Más cálido en /).first()).toBeVisible();

  // 2. Verify that the user's observation mark carries the text "simulación" and is separated
  const simCallout = page.getByTestId('orc-user-obs-callout');
  await expect(simCallout).toBeVisible();
  await expect(simCallout).toContainText(/Tu observación \(simulación\)/i);
  await expect(simCallout).toContainText('-2.5 °C');

  const simSvgMark = page.getByTestId('orc-user-sim-mark');
  await expect(simSvgMark).toBeVisible();
  await expect(simSvgMark).toContainText(/simulación/i);
  await page.screenshot({ path: `${SHOTS_DIR}/${prefix}-century-month.png` });

  // Return to "Año por año" view with keyboard Home
  await page.keyboard.press('Home');
  await expect(tabAnnual).toHaveAttribute('aria-selected', 'true');

  // 3. Move the year cursor (role="slider") with arrow keys and read the announcement
  const slider = page.getByRole('slider', { name: /Cursor de años del registro histórico/ });
  await slider.focus();
  await expect(slider).toHaveAttribute('aria-valuenow', '2016');

  const cursorCard = page.getByTestId('orc-century-cursor-card');
  await expect(cursorCard).toContainText('2016');
  await expect(cursorCard).toContainText('-3.0 °C');
  await expect(cursorCard).toContainText('Hoy');

  await page.keyboard.press('ArrowLeft');
  await expect(slider).toHaveAttribute('aria-valuenow', '2015');
  await expect(slider).toHaveAttribute('aria-valuetext', /2015 · Media anual: -3\.8 °C/);
  await expect(cursorCard).toContainText('2015');
  await expect(cursorCard).toContainText('-3.8 °C');
  await expect(cursorCard).toContainText('Hoy');

  // Jump to beginning of archive (1903, Casa Omond, incomplete year)
  await page.keyboard.press('Home');
  await expect(slider).toHaveAttribute('aria-valuenow', '1903');
  await expect(slider).toHaveAttribute('aria-valuetext', /1903 · Año incompleto.*Casa Omond/);
  await expect(cursorCard).toContainText('1903');
  await expect(cursorCard).toContainText('Casa Omond');

  // 4. Open the accessible folded data table (<details> "Ver los datos en tabla")
  const tableSummary = page.locator('summary', { hasText: 'Ver los datos en tabla' });
  await tableSummary.focus();
  await page.keyboard.press('Enter');

  const dataTable = page.getByRole('table', {
    name: /Temperatura media anual en Estación Orcadas/,
  });
  await expect(dataTable).toBeVisible();
  await expect(dataTable.getByRole('row', { name: /1904 -5\.37 °C/ })).toBeVisible();
  await expect(dataTable.getByRole('row', { name: /1930 -6\.96 °C/ })).toBeVisible();
});
