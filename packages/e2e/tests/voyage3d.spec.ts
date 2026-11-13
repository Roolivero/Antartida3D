import { expect, test } from '@playwright/test';

let consoleErrors: string[] = [];

test.beforeEach(async ({ page }) => {
  consoleErrors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  page.on('pageerror', (e) => consoleErrors.push(e.message));
});

test.afterEach(() => {
  expect(consoleErrors, 'console errors (hydration mismatches, exceptions)').toEqual([]);
});

type Page = import('@playwright/test').Page;

/** Where the drawn camera looks over the ground (world x, z), from the three.js camera itself, not the controls' goal. */
const drawnTarget = (page: Page) =>
  page.evaluate(() => {
    const cc = (window as any).__cameraControls;
    const cam = cc.camera;
    const dir = cam.getWorldDirection(cam.position.clone());
    // The controls keep the target at `distance` in front of the camera.
    const at = cam.position.clone().addScaledVector(dir, cc.distance);
    return { x: at.x as number, z: at.z as number };
  });

/**
 * Ground position (world x, z) of the pin of milestone `n` (1-based; the first one, the departure, has none).
 * A pin stands where the camera goes: on the path, or at the far place of the milestone (Cabo de Hornos).
 */
const pinOf = (page: Page, n: number) =>
  page.evaluate((n) => {
    const pins: { x: number; z: number }[] = [];
    (window as any).__scene.traverse((o: any) => {
      const order = o.children.map((c: any) => c.renderOrder).join();
      if (o.type === 'Group' && order === '1001,1000,1002') pins.push({ x: o.position.x, z: o.position.z });
    });
    return pins[n - 2];
  }, n);

// Under reduced motion "Próximo hito" jumps the vehicle without animation, and the canvas draws on
// demand: the camera must still land on the vehicle, or on the far place of the milestone (#76).
for (const [name, kind, start] of [['Hércules C-130', 'plane', 'Despegar'], ['ARA Almirante Irízar', 'ship', 'Zarpar']] as const) {
  test(`with reduced motion, each milestone jump of the ${kind} takes the camera there`, async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/');
    await page.getByRole('group', { name: 'Modo de vista' }).getByRole('button', { name: 'Relieve 3D' }).click();
    await page.waitForFunction(() => (window as any).__cameraControls);
    await page.getByRole('button', { name: 'Ver como lista' }).click();
    await page.getByRole('button', { name: /Desde Ushuaia.*Empezar expedición/ }).click();
    await page.getByRole('group', { name: 'Medio de transporte' }).getByRole('button', { name: new RegExp(name) }).click();
    await page.getByRole('button', { name: start }).click();

    // The first milestone opens at the departure. Then up to the Drake Passage; the ship goes by
    // Cabo de Hornos, a place off its path, on the way.
    for (let n = 1; ; n++) {
      if (n > 1) await page.getByRole('button', { name: 'Próximo hito' }).click();
      await expect(page.locator('.vstep')).toHaveText(new RegExp(`^Hito ${n} de`));
      if (n > 1) {
        const want = (await pinOf(page, n))!;
        const title = await page.locator('#voyage-title').textContent();
        await expect
          .poll(async () => {
            const got = await drawnTarget(page);
            return Math.hypot(got.x - want.x, got.z - want.z);
          }, { message: `camera over «${title}»` })
          .toBeLessThan(0.5);
      }
      if (await page.getByRole('heading', { level: 2, name: 'Pasaje de Drake' }).isVisible()) break;
      await page.getByRole('button', { name: 'Continuar' }).click();
    }

    // With the camera there, the canvas rests: following a vehicle that stands still draws no frames,
    // even after something else asks for one.
    const frames = () => page.evaluate(() => (window as any).__gl.info.render.frame as number);
    await page.evaluate(() => (window as any).__invalidate());
    await expect
      .poll(async () => {
        const before = await frames();
        await page.waitForTimeout(500);
        return (await frames()) - before;
      }, { message: 'frames drawn in 500 ms while the trip waits' })
      .toBe(0);
  });
}
