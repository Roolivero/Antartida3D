import { expect, test, type Page } from '@playwright/test';

/**
 * Same acceptance flow for every stack: question -> dig -> compare -> conclusion -> return (log 1/1).
 * Selectors are roles and visible texts from the handoff, so every app must expose the same accessible DOM.
 */

const log = (page: Page) => page.locator('.reg');
const primary = (page: Page) => page.locator('.ebar .btn.primary');

async function openExpeditionFromList(page: Page) {
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

/** Presses Tab until the focused element's accessible name matches. */
async function tabTo(page: Page, name: RegExp, max = 60) {
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

let consoleErrors: string[] = [];

/** Focus moves in an effect, which some runtimes (Preact, Svelte) flush after paint: poll. */
const expectFocused = (page: Page, name: string) => expect.poll(() => focusedName(page)).toBe(name);

test.beforeEach(async ({ page }) => {
  consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push(e.message));
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(log(page)).toContainText('0/1');
});

test.afterEach(() => {
  expect(consoleErrors, 'console errors (hydration mismatches, exceptions)').toEqual([]);
});

test('completes the expedition with pointer and persists the log', async ({ page }) => {
  await openExpeditionFromList(page);
  await expect(page.getByText('Paso 1 de 5 · Pregunta')).toBeVisible();
  await primary(page).click();

  await expect(primary(page)).toHaveText('Encontrá los 3 restos (0/3)');
  await expect(primary(page)).toBeDisabled();
  for (const spot of [0, 1, 2]) {
    await brushWithPointer(page, spot);
    const card = page.getByRole('dialog');
    await expect(card).toContainText(`hallazgo ${spot + 1} de 3`);
    await card.getByRole('button', { name: spot < 2 ? 'Seguir excavando' : 'Comparar evidencias' }).click();
  }

  await expect(page.getByText('Paso 3 de 5 · Comparar')).toBeVisible();
  await expect(primary(page)).toBeDisabled();
  await page.getByRole('button', { name: /Con tres restos todavía no alcanza/ }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Prudente' })).toBeVisible();
  await primary(page).click();

  await expect(page.getByText('Paso 4 de 5 · Conclusión')).toBeVisible();
  await expect(page.getByText('Reconstrucción artística').first()).toBeVisible();
  await primary(page).click();

  await expect(page.getByText('Paso 5 de 5 · Regreso')).toBeVisible();
  await primary(page).click();

  await expect(log(page)).toContainText('1/1');
  await expect(page.locator('.toast')).toHaveText('Fósiles quedó explorado. Registro de exploración: 1/1');

  await page.reload();
  await expect(log(page)).toContainText('1/1');
});

test('completes the expedition with the keyboard only', async ({ page }) => {
  await tabTo(page, /^Ver como lista$/);
  await page.keyboard.press('Enter');
  await expectFocused(page, 'Ver mapa');
  await tabTo(page, /^Fósiles/);
  await page.keyboard.press('Enter');

  await expect(page.getByRole('heading', { name: '¿Cómo era la Antártida antes del hielo?' })).toBeFocused();
  await tabTo(page, /^Empezar a excavar$/);
  await page.keyboard.press('Enter');

  for (const spot of [1, 2, 3]) {
    if (spot > 1) await tabTo(page, new RegExp(`^Zona de excavación ${spot}: limpiar`));
    else await expect(page.getByRole('button', { name: /^Zona de excavación 1/ })).toBeFocused();
    for (let i = 0; i < 4; i++) {
      const prevText = await page.getByRole('button', { name: new RegExp(`^Zona de excavación ${spot}:`) }).getAttribute('aria-label') ?? '';
      await page.keyboard.press('Enter');
      if (i < 3) {
        await expect.poll(async () => {
          return page.getByRole('button', { name: new RegExp(`^Zona de excavación ${spot}:`) }).getAttribute('aria-label');
        }).not.toBe(prevText);
      }
    }
    await expect(page.getByRole('dialog')).toContainText(`hallazgo ${spot} de 3`);
    await expectFocused(page, spot < 3 ? 'Seguir excavando' : 'Comparar evidencias');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    if (spot < 3) await expectFocused(page, `Zona de excavación ${spot}: resto encontrado`);
  }

  await expect(page.getByRole('heading', { name: 'Comparar evidencias' })).toBeFocused();
  await tabTo(page, /^Vivieron en un ambiente sin hielo/);
  await page.keyboard.press('Enter');
  await tabTo(page, /^Ver la reconstrucción$/);
  await page.keyboard.press('Enter');

  await expect(page.getByRole('heading', { name: 'Conclusión' })).toBeFocused();
  await tabTo(page, /^Terminar expedición$/);
  await page.keyboard.press('Enter');

  await expect(primary(page)).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(log(page)).toContainText('1/1');
});

test('dialogs close with Escape and return focus to their trigger', async ({ page }) => {
  await tabTo(page, /^Ver como lista$/);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Todos los puntos' })).toBeVisible();
  await expectFocused(page, 'Ver mapa');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expectFocused(page, 'Ver como lista');

  await page.keyboard.press('Enter');
  await expectFocused(page, 'Ver mapa');
  await tabTo(page, /^Estación Orcadas/);
  await page.keyboard.press('Enter');
  const sheet = page.getByRole('dialog', { name: 'Estación Orcadas' });
  await expect(sheet).toContainText('[Pregunta provisional]');
  await expectFocused(page, 'Cerrar ficha');
  await page.keyboard.press('Escape');
  await expect(sheet).toHaveCount(0);
  await expectFocused(page, 'Ver como lista');
});

test('knowledge panel shows three levels without blocking the flow', async ({ page }) => {
  await openExpeditionFromList(page);
  await page.getByRole('button', { name: 'Saber más' }).click();
  const panel = page.getByRole('complementary', { name: 'Saber más' });
  await expect(panel).toContainText('Saber más · Pregunta');
  await panel.getByRole('button', { name: /Profundizar/ }).click();
  await expect(panel).toContainText('[Fuente a definir]');
  await expect(panel).toContainText('Simulación educativa');
  await primary(page).click();
  await expect(panel).toContainText('Saber más · Excavación');
  await page.keyboard.press('Escape');
  await expect(panel).toHaveCount(0);
});

test('has no horizontal scroll', async ({ page }) => {
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(await overflow()).toBeLessThanOrEqual(0);
  await openExpeditionFromList(page);
  expect(await overflow()).toBeLessThanOrEqual(0);
});
