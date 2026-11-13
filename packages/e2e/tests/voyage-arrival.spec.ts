import { expect, test, type Page } from '@playwright/test';

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

/**
 * Starts the trip from Ushuaia on a transport and goes to the card of Base Marambio. Under reduced
 * motion the trip goes step by step: close the card of a milestone, jump to the next one.
 */
async function arriveAtMarambio(page: Page, transport: RegExp) {
  await page.getByRole('button', { name: 'Ver como lista' }).click();
  // The button of the list, not the marker of the map behind it.
  await page.getByRole('dialog', { name: 'Todos los puntos' }).getByRole('button', { name: /Desde Ushuaia/ }).click();
  await page.getByRole('group', { name: 'Medio de transporte' }).getByRole('button', { name: transport }).click();
  await page.getByRole('button', { name: /^(Zarpar|Despegar)$/ }).click();
  const arrival = page.getByRole('dialog', { name: 'Base Marambio' });
  for (let i = 0; i < 12; i++) {
    await expect(page.locator('section.sheet.voyage')).toBeVisible();
    if (await arrival.isVisible()) break;
    await page.getByRole('button', { name: 'Continuar', exact: true }).click();
    await page.getByRole('button', { name: 'Próximo hito', exact: true }).click();
  }
  await expect(arrival).toBeVisible();
  return arrival;
}

test.describe('arrival at Base Marambio on the trip from Ushuaia', () => {
  // A ship opens eight milestones on its way: on a wide screen, without a GPU, the walk takes close to 30 s.
  test.describe.configure({ timeout: 90_000 });

  test('on the Irízar it asks how people and cargo reach the base, and tells it after the answer', async ({ page }) => {
    const card = await arriveAtMarambio(page, /Irízar/);
    const quiz = card.getByRole('group', { name: /¿Cómo pasan del Irízar a la base las personas y la carga\?/ });
    await expect(quiz.getByRole('button')).toHaveText(['Por un puente', 'En botes', 'En helicóptero']);
    // The notes answer the question: they wait for it.
    await expect(card.getByText(/un Sea King va y viene/)).toHaveCount(0);

    await quiz.getByRole('button', { name: 'En helicóptero' }).click();
    await expect(quiz.getByRole('status')).toHaveText('Correcto.');
    await expect(card.getByText(/un Sea King va y viene/)).toBeVisible();
    // Where the ship waits is a drawing, and the card says so.
    await expect(card.getByText(/frente a la isla es ilustrativo/)).toBeVisible();
    await expect(card.getByText(/acertaste 1 de 3/)).toBeVisible();
    await expect(card.getByRole('button', { name: 'Terminar el viaje' })).toBeVisible();
  });

  test('on the Hércules it asks nothing: the plane lands on the runway of the base', async ({ page }) => {
    const card = await arriveAtMarambio(page, /Hércules/);
    await expect(card.locator('fieldset')).toHaveCount(0);
    await expect(card.getByText(/La pista mide 1\.200 m/)).toBeVisible();
    await expect(card.getByText(/frente a la isla/)).toHaveCount(0);
    await expect(card.getByText(/acertaste 0 de 2/)).toBeVisible();
  });

  test('on the Puerto Argentino it asks nothing and owns up that where the ship waits is a drawing', async ({ page }) => {
    const card = await arriveAtMarambio(page, /Puerto Argentino/);
    await expect(card.locator('fieldset')).toHaveCount(0);
    await expect(card.getByText(/frente a la isla es ilustrativo/)).toBeVisible();
    await expect(card.getByText(/Sea King/)).toHaveCount(0);
    await expect(card.getByText(/acertaste 0 de 2/)).toBeVisible();
  });
});
