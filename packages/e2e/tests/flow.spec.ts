import { expect, test, type Page } from '@playwright/test';

const log = (page: Page) => page.locator('.reg');

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
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  page.on('pageerror', (e) => consoleErrors.push(e.message));
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(log(page)).toContainText('0/2');
});

test.afterEach(() => {
  expect(consoleErrors, 'console errors (hydration mismatches, exceptions)').toEqual([]);
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
  await tabTo(page, /^Océano/);
  await page.keyboard.press('Enter');
  const sheet = page.getByRole('dialog', { name: 'Océano' });
  await expect(sheet).toContainText('[Pregunta provisional]');
  await expectFocused(page, 'Cerrar ficha');
  await page.keyboard.press('Escape');
  await expect(sheet).toHaveCount(0);
  await expectFocused(page, 'Ver como lista');
});

test('Fósiles is displayed as Ampliación prevista and opens its point sheet', async ({ page }) => {
  await tabTo(page, /^Ver como lista$/);
  await page.keyboard.press('Enter');
  const fosilesBtn = page.getByRole('dialog', { name: 'Todos los puntos' }).getByRole('button', { name: /Fósiles/ });
  await expect(fosilesBtn).toBeVisible();
  await fosilesBtn.click();
  const sheet = page.getByRole('dialog', { name: 'Fósiles' });
  await expect(sheet).toBeVisible();
  await expect(sheet.locator('.tag.tb')).toHaveText('Ampliación prevista');
  await page.keyboard.press('Escape');
  await expect(sheet).toHaveCount(0);
});

test('has no horizontal scroll', async ({ page }) => {
  const overflow = () =>
    page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(await overflow()).toBeLessThanOrEqual(0);
});
