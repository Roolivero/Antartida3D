import { expect, test, type Page } from '@playwright/test';
import { ORCADAS_CLIMATE } from '../../core/src/content/orcadas-series.ts';
import {
  beaufort,
  observationFor,
  type Reading,
} from '../../core/src/orcadas.ts';

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
  await expect(page.getByRole('heading', { level: 2, name: 'Estación Orcadas' })).toBeVisible();
  await page.waitForFunction(
    () => (window as unknown as { __orcadasReady?: boolean }).__orcadasReady === true
  );
  await page.getByRole('button', { name: 'Hacer la observación' }).click();
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

    // Check across all 4 instrument tabs that the true value and Beaufort name are not leaked before guessing
    const tabLabels = [
      /^Temperatura del abrigo/,
      /^Presión atmosférica/,
      /^Velocidad del viento/,
      /^Cobertura de nubes/,
    ];

    for (const tabRegex of tabLabels) {
      await page.getByRole('tab', { name: tabRegex }).click();
      const text = await obs.innerText();
      expect(text).not.toContain(`${reading.tempC.toFixed(1)} °C`);
      expect(text).not.toContain(`${reading.pressureHpa.toFixed(1)} hPa`);
      expect(text).not.toContain(`${reading.windKmh} km/h`);
      expect(text).not.toContain(`${reading.cloudOktas}/8 octas`);
      expect(text).not.toContain(windBf.name);
    }

    // Switch to Thermometer and submit a distant value (-25.0 °C via Home key)
    await page.getByRole('tab', { name: /^Temperatura del abrigo/ }).click();
    const slider = page.getByRole('slider', { name: 'Deslizador de Temperatura del abrigo' });
    await slider.focus();
    await page.keyboard.press('Home');
    await expect(slider).toHaveAttribute('aria-valuetext', '-25.0 °C');
    await page.keyboard.press('Enter');

    // Should show 'off' feedback with deviation amount and a retry button
    const feedback = page.locator('.orc-obs-feedback.is-off');
    await expect(feedback).toBeVisible();
    await expect(feedback).toContainText('se desvió por');
    const retryBtn = feedback.getByRole('button', { name: 'Reintentar' });
    await expect(retryBtn).toBeVisible();
    await retryBtn.click();

    // Clicking Reintentar returns focus to the slider so the user can correct the value
    const focusedRole = await page.evaluate(() =>
      document.activeElement?.getAttribute('role')
    );
    expect(focusedRole).toBe('slider');
  });

  test('completes all four readings with the keyboard only, shows the animated seal in the notebook, and resets on Empezar de nuevo', async ({
    page,
  }) => {
    // Long keyboard-only flow with several camera flights. Without a GPU (CI, headless) each frame of a
    // 1440 px flight is drawn in software: measured 40 s on desktop against 14 s on mobile, with no step stuck.
    test.setTimeout(90_000);
    await openOrcadasObservation(page);
    const reading = currentExpectedReading();
    const windBf = beaufort(reading.windKmh);

    await expect(primary(page)).toBeEnabled();
    await expect(primary(page)).toHaveText('Seguir');
    await expect(page.getByText('Observación registrada')).toHaveCount(0);

    // 1. Thermometer (keyboard only: Tab to tab, Enter, Tab to slider, arrows to exact tempC, Enter)
    await tabTo(page, /^Temperatura del abrigo/);
    await page.keyboard.press('Enter');
    await tabTo(page, /^Deslizador de Temperatura del abrigo$/);
    await adjustSliderWithArrows(page, reading.tempC, 0.1);
    await expect(
      page.getByRole('slider', { name: 'Deslizador de Temperatura del abrigo' })
    ).toHaveAttribute('aria-valuetext', `${reading.tempC.toFixed(1)} °C`);
    await page.keyboard.press('Enter');
    await expect(page.locator('.orc-obs-feedback.is-exact')).toContainText('¡Lectura exacta!');

    // 2. Barometer
    await page.getByRole('heading', { level: 2, name: 'Observación del día' }).focus();
    await tabTo(page, /^Presión atmosférica/);
    await page.keyboard.press('Enter');
    await tabTo(page, /^Deslizador de Presión atmosférica$/);
    await adjustSliderWithArrows(page, reading.pressureHpa, 0.1);
    await expect(
      page.getByRole('slider', { name: 'Deslizador de Presión atmosférica' })
    ).toHaveAttribute('aria-valuetext', `${reading.pressureHpa.toFixed(1)} hPa`);
    await page.keyboard.press('Enter');
    await expect(page.locator('.orc-obs-feedback.is-exact')).toContainText('¡Lectura exacta!');

    // 3. Wind (Beaufort name appears only after confirming)
    await page.getByRole('heading', { level: 2, name: 'Observación del día' }).focus();
    await tabTo(page, /^Velocidad del viento/);
    await page.keyboard.press('Enter');
    await expect(page.locator('.orc-obs')).not.toContainText(windBf.name);
    await tabTo(page, /^Deslizador de Velocidad del viento$/);
    await adjustSliderWithArrows(page, reading.windKmh, 1);
    await expect(
      page.getByRole('slider', { name: 'Deslizador de Velocidad del viento' })
    ).toHaveAttribute('aria-valuetext', `${reading.windKmh} km/h`);
    await page.keyboard.press('Enter');
    await expect(page.locator('.orc-obs-feedback.is-exact')).toContainText('¡Lectura exacta!');
    await expect(page.locator('.orc-obs-beaufort')).toContainText(windBf.name);

    // 4. Clouds
    await page.getByRole('heading', { level: 2, name: 'Observación del día' }).focus();
    await tabTo(page, /^Cobertura de nubes/);
    await page.keyboard.press('Enter');
    await tabTo(page, /^Deslizador de Cobertura de nubes$/);
    await adjustSliderWithArrows(page, reading.cloudOktas, 1);
    await expect(
      page.getByRole('slider', { name: 'Deslizador de Cobertura de nubes' })
    ).toHaveAttribute('aria-valuetext', `${reading.cloudOktas} octas`);
    await page.keyboard.press('Enter');

    // All 4 completed: seal, simulation notice, and primary button enabled
    await expect(page.getByText('Observación registrada')).toBeVisible();
    await expect(
      page.locator('.orc-notebook-sim-note')
    ).toContainText('La observación del día es una simulación sorteada dentro del clima real del mes.');
    await expect(primary(page)).toBeEnabled();

    // No horizontal overflow at current viewport (390px mobile or 1440px desktop)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(0);

    // Reset with "Empezar de nuevo" via keyboard
    await tabTo(page, /^Empezar de nuevo$/);
    await page.keyboard.press('Enter');
    await expect(page.getByText('Observación registrada')).toHaveCount(0);
    await expect(primary(page)).toBeEnabled();
    await expect(primary(page)).toHaveText('Seguir');
  });
});
