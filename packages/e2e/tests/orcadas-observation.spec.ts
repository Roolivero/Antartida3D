import { expect, test, type Page } from '@playwright/test';
import { ORCADAS_GUIDING_QUESTION } from '../../core/src/content/orcadas.ts';
import { ORCADAS_CLIMATE } from '../../core/src/content/orcadas-series.ts';
import { beaufort, observationFor, type Reading } from '../../core/src/orcadas.ts';

const primary = (page: Page) => page.locator('.ebar .btn.primary');

function currentExpectedReading(): Reading {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const seed = year * 10000 + month * 100 + now.getDate();
  const climate = ORCADAS_CLIMATE[(month - 1 + 12) % 12] ?? ORCADAS_CLIMATE[0];
  return observationFor(seed + month, climate);
}

async function openOrcadasObservation(page: Page) {
  const cluster = page.getByRole('button', { name: /Grupo de .*Estación Orcadas/ });
  if (await cluster.isVisible()) await cluster.click();
  await page.getByRole('button', { name: /^Estación Orcadas, Islas Orcadas del Sur/ }).click();
  await expect(page.getByRole('heading', { level: 2, name: ORCADAS_GUIDING_QUESTION })).toBeVisible();
  await page.waitForFunction(
    () => (window as unknown as { __orcadasReady?: boolean }).__orcadasReady === true
  );
  await page
    .getByRole('navigation', { name: 'Capítulos de la expedición' })
    .getByRole('button', { name: /Observar/ })
    .click();
  await expect(
    page.getByRole('heading', { level: 2, name: 'Observación del día' })
  ).toBeVisible();
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

async function adjustSliderWithArrows(
  page: Page,
  targetVal: number,
  step: number
) {
  for (let guard = 0; guard < 200; guard++) {
    const current = await page.evaluate(() => {
      const el = document.activeElement;
      return Number(el?.getAttribute('aria-valuenow'));
    });
    const diff = Number((targetVal - current).toFixed(2));
    if (Math.abs(diff) < step / 2) return;

    const tenStep = step * 10;
    const pageSteps = Math.floor(Math.abs(diff) / tenStep);
    if (pageSteps > 0) {
      const key = diff > 0 ? 'PageUp' : 'PageDown';
      for (let p = 0; p < pageSteps; p++) {
        await page.keyboard.press(key);
      }
    } else {
      const arrowSteps = Math.max(1, Math.floor(Math.abs(diff) / step));
      const key = diff > 0 ? 'ArrowRight' : 'ArrowLeft';
      for (let a = 0; a < arrowSteps; a++) {
        await page.keyboard.press(key);
      }
    }
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
});

test.afterEach(() => {
  expect(consoleErrors, 'console errors').toEqual([]);
});

test.describe('Orcadas · observación', () => {
  test('does not expose true values in the DOM before annotating and reports off deviation on a distant guess', async ({
    page,
  }) => {
    await openOrcadasObservation(page);
    const reading = currentExpectedReading();
    const windBf = beaufort(reading.windKmh);

    const obs = page.locator('.orc-obs');
    await expect(obs).toBeVisible();

    const tempComma = reading.tempC.toFixed(1).replace('.', ',');
    const pressComma = reading.pressureHpa.toFixed(1).replace('.', ',');
    const assertNoTruthExposed = async () => {
      const text = await obs.innerText();
      expect(text).not.toContain(`${reading.tempC.toFixed(1)} °C`);
      expect(text).not.toContain(`${tempComma} °C`);
      expect(text).not.toContain(`${reading.pressureHpa.toFixed(1)} hPa`);
      expect(text).not.toContain(`${pressComma} hPa`);
      expect(text).not.toContain(`${reading.windKmh} km/h`);
      expect(text).not.toContain(`${reading.cloudOktas}/8 octas`);
      expect(text).not.toContain(windBf.name);
    };

    // Main temperature stage does not leak truth before guessing
    await assertNoTruthExposed();

    // Open "Mirá también" and check optional instrument tabs do not leak truth before guessing
    await page.locator('details.orc-obs-more > summary').click();
    const optionalTabs = [/^Presión atmosférica/, /^Velocidad del viento/, /^Cobertura de nubes/];
    for (const tabRegex of optionalTabs) {
      await page.getByRole('tab', { name: tabRegex }).click();
      await assertNoTruthExposed();
    }

    // Submit a distant value (-25,0 °C) using the magnifier lens slider + Home + Enter
    const lensSlider = page.getByRole('slider', { name: 'Guía de lectura en la lupa del termómetro' });
    await lensSlider.focus();
    await page.keyboard.press('Home');
    await expect(lensSlider).toHaveAttribute('aria-valuetext', '-25,0 °C');
    await page.keyboard.press('Enter');

    const feedback = page.locator('.orc-obs-feedback.is-off');
    await expect(feedback).toBeVisible();
    await expect(feedback).toContainText('se desvió por');
    const retryBtn = feedback.getByRole('button', { name: 'Reintentar' });
    await expect(retryBtn).toBeVisible();
    await retryBtn.click();

    // Clicking Reintentar returns focus to the lens slider
    const focusedClass = await page.evaluate(() => ({
      role: document.activeElement?.getAttribute('role'),
      cls: document.activeElement?.getAttribute('class'),
    }));
    expect(focusedClass.role).toBe('slider');
    expect(focusedClass.cls).toContain('orc-obs-lens-hit');
  });

  test('completes temperature via lens slider and optional readings via Mirá también with keyboard only, and carries them into Responder', async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await openOrcadasObservation(page);
    const reading = currentExpectedReading();
    const windBf = beaufort(reading.windKmh);

    await expect(primary(page)).toBeEnabled();
    await expect(primary(page)).toHaveText('Viajar en el tiempo');

    // 1. Thermometer via magnifier lens slider (keyboard arrows to exact tempC + Enter)
    await tabTo(page, /^Guía de lectura en la lupa del termómetro$/);
    await adjustSliderWithArrows(page, reading.tempC, 0.1);
    await expect(
      page.getByRole('slider', { name: 'Guía de lectura en la lupa del termómetro' })
    ).toHaveAttribute('aria-valuetext', `${reading.tempC.toFixed(1).replace('.', ',')} °C`);
    await page.keyboard.press('Enter');
    await expect(page.locator('.orc-obs-feedback.is-exact')).toContainText('¡Lectura exacta!');

    // 2. Optional instruments in "Mirá también": pressure, wind (Beaufort appears only after confirming), clouds
    await tabTo(page, /^Mirá también$/);
    await page.keyboard.press('Enter');

    await tabTo(page, /^Presión atmosférica/);
    await page.keyboard.press('Enter');
    await tabTo(page, /^Deslizador de Presión atmosférica$/);
    await adjustSliderWithArrows(page, reading.pressureHpa, 0.1);
    await expect(
      page.getByRole('slider', { name: 'Deslizador de Presión atmosférica' })
    ).toHaveAttribute('aria-valuetext', `${reading.pressureHpa.toFixed(1).replace('.', ',')} hPa`);
    await page.keyboard.press('Enter');
    await expect(page.locator('.orc-obs-optional-panel .orc-obs-feedback.is-exact')).toContainText(
      '¡Lectura exacta!'
    );

    await tabTo(page, /^Velocidad del viento/);
    await page.keyboard.press('Enter');
    await expect(page.locator('.orc-obs')).not.toContainText(windBf.name);
    await tabTo(page, /^Deslizador de Velocidad del viento$/);
    await adjustSliderWithArrows(page, reading.windKmh, 1);
    await expect(
      page.getByRole('slider', { name: 'Deslizador de Velocidad del viento' })
    ).toHaveAttribute('aria-valuetext', `${reading.windKmh} km/h`);
    await page.keyboard.press('Enter');
    await expect(page.locator('.orc-obs-optional-panel .orc-obs-feedback.is-exact')).toContainText(
      '¡Lectura exacta!'
    );
    await expect(page.locator('.orc-obs-beaufort')).toContainText(windBf.name);

    await tabTo(page, /^Cobertura de nubes/);
    await page.keyboard.press('Enter');
    await tabTo(page, /^Deslizador de Cobertura de nubes$/);
    await adjustSliderWithArrows(page, reading.cloudOktas, 1);
    await expect(
      page.getByRole('slider', { name: 'Deslizador de Cobertura de nubes' })
    ).toHaveAttribute('aria-valuetext', `${reading.cloudOktas} octas`);
    await page.keyboard.press('Enter');

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(0);

    // Advance to Responder and verify seal + folded "Tu observación del día" with 4 of 4
    await page
      .getByRole('navigation', { name: 'Capítulos de la expedición' })
      .getByRole('button', { name: /Responder/ })
      .click();
    await expect(page.getByRole('heading', { level: 2, name: 'La respuesta' })).toBeVisible();
    await expect(page.locator('.orc-done-summary')).toContainText('4 de 4 lecturas dentro del margen');
    await page.locator('details.orc-more', { hasText: 'Tu observación del día' }).locator('> summary').click();
    await expect(page.locator('.orc-done-readings')).toContainText(windBf.name);
  });
});
