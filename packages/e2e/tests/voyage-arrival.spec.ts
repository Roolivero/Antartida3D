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
    // With motion the trip travels to each milestone: its card takes a while to open.
    await expect(page.locator('section.sheet.voyage')).toBeVisible({ timeout: 30_000 });
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
    // The helicopter hop is an animation of the 3D map: with reduced motion the notes give the answer.
    await expect(card.getByRole('button', { name: 'Ver el traslado' })).toHaveCount(0);
  });

  test('with motion, on the Irízar the helicopter hop plays after the answer and can be skipped', async ({ page }) => {
    // The trip travels to each milestone and the hop lasts 6 s: slow without a GPU.
    test.setTimeout(240_000);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.reload();
    const relief = page.getByRole('group', { name: 'Modo de vista' }).getByRole('button', { name: 'Relieve 3D' });
    if ((await relief.getAttribute('aria-pressed')) !== 'true') await relief.click();
    await expect(page.locator('canvas').first()).toBeVisible();

    const card = await arriveAtMarambio(page, /Irízar/);
    const watch = card.getByRole('button', { name: 'Ver el traslado' });
    // The hop shows the answer: it is not offered before it.
    await expect(watch).toHaveCount(0);
    await card.getByRole('button', { name: 'En helicóptero' }).click();
    await watch.click();

    // The card steps aside. The bar says what the hop is and that it is a drawing.
    const bar = page.getByRole('group', { name: 'Del Irízar a la base' });
    await expect(bar.getByText(/Sea King lleva la carga y el personal/)).toBeVisible();
    await expect(bar.getByText(/La animación es ilustrativa/)).toBeVisible();
    await expect(bar.getByRole('button', { name: 'Saltar' })).toBeFocused();
    await expect(card).toBeHidden();

    // The helicopter lands by itself and the card comes back with the answer kept.
    await expect(card).toBeVisible({ timeout: 90_000 });
    await expect(card.getByText('Correcto.')).toBeVisible();
    await expect(card.getByRole('button', { name: 'Terminar el viaje' })).toBeFocused();

    // It plays again, and «Saltar» lands it at once.
    await watch.click();
    await bar.getByRole('button', { name: 'Saltar' }).click();
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
