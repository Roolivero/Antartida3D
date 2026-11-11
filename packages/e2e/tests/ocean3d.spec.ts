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
  expect(consoleErrors, 'console errors (exceptions, shader compile errors)').toEqual([]);
});

test.describe('Ocean 3D animation efficiency', () => {
  test('in active 3D mode with motion allowed, seaTime advances over 1 s', async ({ page }) => {
    // Override reducedMotion for this test to allow animation
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');

    const toggle = page.getByRole('group', { name: 'Modo de vista' });
    await toggle.getByRole('button', { name: 'Relieve 3D' }).click();
    await expect(page.locator('canvas')).toBeVisible();

    // Wait for initial render and setup
    await page.waitForFunction(() => typeof (window as unknown as { __seaTime?: number }).__seaTime === 'number');

    const t0 = await page.evaluate(() => (window as unknown as { __seaTime: number }).__seaTime);
    await page.waitForTimeout(1000);
    const t1 = await page.evaluate(() => (window as unknown as { __seaTime: number }).__seaTime);

    expect(t1).toBeGreaterThan(t0);
    // Should have advanced around 0.7 - 1.3 seconds
    expect(t1 - t0).toBeGreaterThanOrEqual(0.5);
  });

  test('when document is hidden, frame rendering does not advance', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');

    const toggle = page.getByRole('group', { name: 'Modo de vista' });
    await toggle.getByRole('button', { name: 'Relieve 3D' }).click();
    await expect(page.locator('canvas')).toBeVisible();

    // Wait until frames counter starts ticking
    await page.waitForFunction(() => ((window as unknown as { __frames?: number }).__frames ?? 0) > 3);

    // Simulate document becoming hidden
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Allow loop to settle
    await page.waitForTimeout(200);

    const framesBefore = await page.evaluate(() => (window as unknown as { __frames?: number }).__frames ?? 0);
    await page.waitForTimeout(1000);
    const framesAfter = await page.evaluate(() => (window as unknown as { __frames?: number }).__frames ?? 0);

    // When hidden, uTime is paused and invalidate() is not called by animation clock
    expect(framesAfter).toBe(framesBefore);
  });

  test('with prefers-reduced-motion, seaTime does not change and canvas screenshots are identical', async ({ page }) => {
    // Default playwright config uses reducedMotion: 'reduce'
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    const toggle = page.getByRole('group', { name: 'Modo de vista' });
    await toggle.getByRole('button', { name: 'Relieve 3D' }).click();
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    // Settle textures
    await page.waitForTimeout(1000);

    const t0 = await page.evaluate(() => (window as unknown as { __seaTime?: number }).__seaTime ?? 0);
    const shot1 = await canvas.screenshot();

    await page.waitForTimeout(1000);

    const t1 = await page.evaluate(() => (window as unknown as { __seaTime?: number }).__seaTime ?? 0);
    const shot2 = await canvas.screenshot();

    // Time remains locked at 0
    expect(t0).toBe(0);
    expect(t1).toBe(0);

    // Screenshots are byte-for-byte identical
    expect(shot1.equals(shot2)).toBe(true);
  });
});
