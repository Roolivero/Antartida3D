import { expect, test, type Page } from '@playwright/test';
import { ORCADAS_GUIDING_QUESTION } from '../../core/src/content/orcadas.ts';
import { recordSpanText } from '../../core/src/orcadas.ts';

async function openOrcadasChapter(page: Page, stepName: 'Viajar' | 'Responder' | 'Llegar' | 'Observar') {
  const cluster = page.getByRole('button', { name: /Grupo de .*Estación Orcadas/ });
  if (await cluster.isVisible()) await cluster.click();
  await page.getByRole('button', { name: /^Estación Orcadas, Islas Orcadas del Sur/ }).click();
  await expect(page.getByRole('heading', { level: 2, name: ORCADAS_GUIDING_QUESTION })).toBeVisible();
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

test('MonthStrip: desktop shows full strip; phones, upright or on their side, use chip popover with focus return, Escape and arrow keys', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openOrcadasChapter(page, 'Llegar');

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow).toBeLessThanOrEqual(0);

  const vp = page.viewportSize() ?? { width: 1440, height: 900 };
  // Same test as MonthStrip: the whole strip only on a wide screen that is not a phone on its side.
  const compact = vp.width < 900 || vp.height <= 500;

  if (compact) {
    const chip = page.locator('.orc-month-chip');
    const popover = page.locator('#orc-month-popover');
    await expect(chip).toBeVisible();
    await expect(chip).toHaveAttribute('aria-expanded', 'false');
    await expect(chip).toHaveAttribute('aria-controls', 'orc-month-popover');
    await expect(popover).toHaveCount(0);

    // ArrowRight / ArrowLeft while chip is focused change the active month
    const initialChipText = (await chip.locator('.orc-month-chip-name').innerText()).trim();
    await chip.focus();
    await page.keyboard.press('ArrowRight');
    await expect(chip.locator('.orc-month-chip-name')).not.toHaveText(initialChipText);
    await page.keyboard.press('ArrowLeft');
    await expect(chip.locator('.orc-month-chip-name')).toHaveText(initialChipText);

    // Opening the chip moves focus into the current month inside the popover
    await chip.click();
    await expect(chip).toHaveAttribute('aria-expanded', 'true');
    await expect(popover).toBeVisible();
    const focusedPressed = await page.evaluate(() => ({
      inPopover: Boolean(document.activeElement?.closest('#orc-month-popover')),
      pressed: document.activeElement?.getAttribute('aria-pressed'),
    }));
    expect(focusedPressed.inPopover).toBe(true);
    expect(focusedPressed.pressed).toBe('true');

    // Escape closes popover and returns focus to chip
    await page.keyboard.press('Escape');
    await expect(popover).toHaveCount(0);
    await expect(chip).toHaveAttribute('aria-expanded', 'false');
    const focusedIsChipAfterEsc = await page.evaluate(() =>
      document.activeElement?.classList.contains('orc-month-chip')
    );
    expect(focusedIsChipAfterEsc).toBe(true);

    // Reopen, jump to June, open Saber más and test SunArc slider
    await chip.click();
    const monthStrip = popover.getByRole('group', { name: 'Mes en la estación' });
    await expect(monthStrip.getByRole('button')).toHaveCount(12);
    const firstBtn = monthStrip.getByRole('button', { name: 'enero' });
    await firstBtn.focus();
    await page.keyboard.press('Home');
    await expect(firstBtn).toHaveAttribute('aria-pressed', 'true');
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('ArrowRight');
    }
    await expect(monthStrip.getByRole('button', { name: 'junio' })).toHaveAttribute('aria-pressed', 'true');

    await popover.locator('.orc-month-details > summary').click();
    await expect(popover.getByText(/Luz solar en junio/)).toBeVisible();
    await expect(popover.getByText(/Bahía Scotia:/)).toBeVisible();

    const sunSlider = popover.getByRole('slider', { name: 'Hora solar' });
    await sunSlider.focus();
    await page.keyboard.press('Home');
    await expect(sunSlider).toHaveAttribute('aria-valuenow', '0');
    await expect(sunSlider).toHaveAttribute('aria-valuetext', /00:00 horas, noche/);
    await expect(popover.getByText(/Noche estrellada/)).toBeVisible();

    // Selecting a month button changes month, closes popover and returns focus to chip
    await monthStrip.getByRole('button', { name: 'marzo' }).click();
    await expect(popover).toHaveCount(0);
    await expect(chip.locator('.orc-month-chip-name')).toHaveText('Marzo');
    const focusedIsChipAfterSelect = await page.evaluate(() =>
      document.activeElement?.classList.contains('orc-month-chip')
    );
    expect(focusedIsChipAfterSelect).toBe(true);

    // Reopen and tap outside: popover closes
    await chip.click();
    await expect(popover).toBeVisible();
    await page.locator('.orc-top-title').click();
    await expect(popover).toHaveCount(0);
  } else {
    await expect(page.locator('.orc-month-chip')).toHaveCount(0);
    const monthStrip = page.getByRole('group', { name: 'Mes en la estación' });
    await expect(monthStrip).toBeVisible();
    await expect(monthStrip.getByRole('button')).toHaveCount(12);

    const firstBtn = monthStrip.getByRole('button', { name: 'enero' });
    await firstBtn.focus();
    await page.keyboard.press('Home');
    await expect(firstBtn).toHaveAttribute('aria-pressed', 'true');

    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('ArrowRight');
    }
    const juneBtn = monthStrip.getByRole('button', { name: 'junio' });
    await expect(juneBtn).toHaveAttribute('aria-pressed', 'true');

    const details = page.locator('.orc-month-details');
    await details.locator('> summary').click();
    await expect(page.getByText(/Luz solar en junio/)).toBeVisible();
    await expect(page.getByText(/Bahía Scotia:/)).toBeVisible();

    const sunSlider = page.getByRole('slider', { name: 'Hora solar' });
    await sunSlider.focus();
    await page.keyboard.press('Home');
    await expect(sunSlider).toHaveAttribute('aria-valuenow', '0');
    await expect(sunSlider).toHaveAttribute('aria-valuetext', /00:00 horas, noche/);
    await expect(page.getByText(/Noche estrellada/)).toBeVisible();
  }

  const textContent = await page.locator('.orc').innerText();
  for (const snippet of UNPUBLISHABLE_SNIPPETS) {
    expect(textContent).not.toContain(snippet);
  }
});

test('Viajar: traverses the 4 era stops (1903, 1927, 1951, current year), syncs chart cursor, and hides flag/mast in 1903', async ({
  page,
}) => {
  await openOrcadasChapter(page, 'Viajar');
  await expect(page.getByRole('heading', { level: 2, name: 'Viaje en el tiempo' })).toBeVisible();

  const yearCounter = page.locator('.orc-year-counter');
  const chartSlider = page.getByRole('slider', { name: 'Cursor de años en el gráfico histórico' });
  const primaryBtn = page.locator('.orc-btn-primary');
  const backBtn = page.locator('.orc-btn-back');
  await expect(chartSlider).toBeVisible();

  // Stop 1 (1903): flag and wind mast hotspots are absent (B2)
  await expect(page.locator('.orc-tour-count')).toHaveText('1 de 4');
  await expect(yearCounter).toHaveAttribute('aria-label', 'Año 1903');
  await expect(chartSlider).toHaveAttribute('aria-valuenow', '1903');
  await expect(page.getByText('Registro desde 1903: primer año')).toBeVisible();

  const flagHotspot = page.getByRole('button', { name: 'Punto de interés: Mástil y pabellón' });
  const windMastHotspot = page.getByRole('button', { name: 'Punto de interés: Mástil de viento' });
  await expect(flagHotspot).toHaveCount(0);
  await expect(windMastHotspot).toHaveCount(0);

  const currentYear = new Date().getFullYear();
  const expectedStops = [
    {
      count: '2 de 4',
      year: '1927',
      span: recordSpanText(1927),
    },
    {
      count: '3 de 4',
      year: '1951',
      span: recordSpanText(1951),
    },
    {
      count: '4 de 4',
      year: String(currentYear),
      span: recordSpanText(currentYear),
    },
  ];

  for (const stop of expectedStops) {
    await primaryBtn.click();
    await expect(page.locator('.orc-tour-count')).toHaveText(stop.count);
    await expect(yearCounter).toHaveAttribute('aria-label', `Año ${stop.year}`);
    await expect(chartSlider).toHaveAttribute('aria-valuenow', stop.year);
    await expect(page.getByText(stop.span)).toBeVisible();

    const domText = await page.locator('.orc').innerText();
    for (const snippet of UNPUBLISHABLE_SNIPPETS) {
      expect(domText).not.toContain(snippet);
    }
  }

  // At current year stop, primary button advances to Responder and both hotspots exist (B2)
  await expect(primaryBtn).toHaveText('Ver la respuesta');
  await expect(flagHotspot).toBeVisible();
  await expect(windMastHotspot).toBeVisible();

  // Atrás returns to 1951 (stop 3 de 4)
  await backBtn.click();
  await expect(page.locator('.orc-tour-count')).toHaveText('3 de 4');
  await expect(yearCounter).toHaveAttribute('aria-label', 'Año 1951');
  await expect(chartSlider).toHaveAttribute('aria-valuenow', '1951');

  // Moving chart slider backward updates the year counter and active tour stop in sync
  await chartSlider.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(chartSlider).toHaveAttribute('aria-valuenow', '1950');
  await expect(yearCounter).toHaveAttribute('aria-label', 'Año 1950');
  await expect(page.locator('.orc-tour-count')).toHaveText('2 de 4');
});
