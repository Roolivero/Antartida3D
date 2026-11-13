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

test.describe('3D relief view', () => {
  test('toggle switches between 2D and 3D and renders canvas', async ({ page }) => {
    await page.goto('/');
    const toggle = page.getByRole('group', { name: 'Modo de vista' });
    await expect(toggle).toBeVisible();

    // Default under reducedMotion: 'reduce' is 2D
    await expect(toggle.getByRole('button', { name: 'Mapa 2D' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.layer')).toBeVisible();

    // Switch to 3D
    await toggle.getByRole('button', { name: 'Relieve 3D' }).click();
    await expect(toggle.getByRole('button', { name: 'Relieve 3D' })).toHaveAttribute('aria-pressed', 'true');
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    // Reload preserves the choice
    await page.reload();
    await expect(toggle.getByRole('button', { name: 'Relieve 3D' })).toHaveAttribute('aria-pressed', 'true');
    await expect(canvas).toBeVisible();

    // Switch back to 2D
    await toggle.getByRole('button', { name: 'Mapa 2D' }).click();
    await expect(toggle.getByRole('button', { name: 'Mapa 2D' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('markers are focusable in 3D and Orcadas opens the expedition', async ({ page }) => {
    await page.goto('/');
    const toggle = page.getByRole('group', { name: 'Modo de vista' });
    await expect(toggle).toBeVisible();

    // Switch to 3D
    await toggle.getByRole('button', { name: 'Relieve 3D' }).click();
    await page.waitForSelector('canvas');

    // Click cluster containing orcadas or directly orcadas marker
    const clusterOrMarker = page.locator('.ov [data-key*="orcadas"] button');
    await expect(clusterOrMarker).toBeVisible();
    await clusterOrMarker.click();

    // If it was in a cluster, clicking it zooms in and separates the points; then click the marker.
    const orcadasBtn = page.getByRole('button', { name: /Estación Orcadas.*Expedición disponible/ });
    if (await orcadasBtn.isVisible()) {
      await orcadasBtn.click();
    }

    await expect(page.getByRole('heading', { level: 2, name: 'Estación Orcadas' })).toBeVisible({ timeout: 10000 });
  });

  test('zoom buttons move the orbit camera from where it is, without resetting it', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('group', { name: 'Modo de vista' }).getByRole('button', { name: 'Relieve 3D' }).click();
    await page.waitForFunction(() => (window as any).__cameraControls);

    type Cam = { d: number; polar: number; az: number; tx: number; tz: number };
    const cam = () =>
      page.evaluate((): Cam => {
        const cc = (window as any).__cameraControls;
        const t = cc.getTarget();
        return { d: cc.distance, polar: cc.polarAngle, az: cc.azimuthAngle, tx: t.x, tz: t.z };
      });

    // The user orbits and moves somewhere (reduced motion: no transitions).
    await page.evaluate(() => {
      const cc = (window as any).__cameraControls;
      cc.rotateTo(0.6, 0.5, false);
      cc.moveTo(-150, 0, -80, false);
    });
    const before = await cam();

    // "+" must get closer (it used to move away from the overview on desktop) and keep the orbit.
    await page.getByRole('button', { name: 'Acercar', exact: true }).click();
    const zoomedIn = await cam();
    expect(zoomedIn.d).toBeLessThan(before.d * 0.7);
    expect(zoomedIn.polar).toBeCloseTo(before.polar, 3);
    expect(zoomedIn.az).toBeCloseTo(before.az, 3);
    expect(zoomedIn.tx).toBeCloseTo(before.tx, 1);
    expect(zoomedIn.tz).toBeCloseTo(before.tz, 1);

    // "-" goes back out from there, not to the overview.
    await page.getByRole('button', { name: 'Alejar', exact: true }).click();
    const zoomedOut = await cam();
    expect(zoomedOut.d).toBeCloseTo(before.d, 0);
    expect(zoomedOut.tx).toBeCloseTo(before.tx, 1);

    // Unrelated UI state (the legend) must not remount the scene and reset the camera.
    await page.getByRole('button', { name: /Leyenda/ }).click();
    const afterLegend = await cam();
    expect(afterLegend.d).toBeCloseTo(zoomedOut.d, 0);
    expect(afterLegend.tx).toBeCloseTo(before.tx, 1);

    // The camera gets closer than the old limit of 120; the farthest view is the overview it starts at.
    const range = await page.evaluate(() => {
      const cc = (window as any).__cameraControls;
      return { min: cc.minDistance, max: cc.maxDistance };
    });
    expect(range.min).toBeLessThan(120);
    expect(range.max).toBeCloseTo(before.d, 0);
  });

  test('the farthest view is the overview and the sea reaches the top of the screen, with no paper', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('group', { name: 'Modo de vista' }).getByRole('button', { name: 'Relieve 3D' }).click();
    await page.waitForFunction(() => (window as any).__cameraControls);
    const overview = await page.evaluate(() => (window as any).__cameraControls.distance as number);

    // As far and as tilted as the camera goes, from a corner of the pan area looking out over the Pacific.
    await page.evaluate(() => {
      const cc = (window as any).__cameraControls;
      cc.moveTo(-800, 0, 800, false);
      cc.rotateTo((135 * Math.PI) / 180, Math.PI / 2, false);
      cc.dollyTo(1e6, false);
      (window as any).__invalidate();
    });
    expect(await page.evaluate(() => (window as any).__cameraControls.distance as number)).toBeCloseTo(overview, 0);

    // Top of the canvas, left of the middle: sea up to the edge, crossed at most by a few far
    // islands and coasts. It used to be all paper.
    const sea = () =>
      page.evaluate(() => {
        (window as any).__invalidate();
        const c = document.querySelector('canvas')!;
        const c2d = document.createElement('canvas');
        c2d.width = c.width;
        c2d.height = 1;
        const ctx = c2d.getContext('2d')!;
        ctx.drawImage(c, 0, Math.round(c.height * 0.02), c.width, 1, 0, 0, c.width, 1);
        const row = ctx.getImageData(0, 0, c.width, 1).data;
        let blue = 0;
        let total = 0;
        for (let x = Math.round(c.width * 0.05); x < c.width * 0.6; x += 4) {
          total++;
          if (row[x * 4 + 2] > row[x * 4] + 25 && row[x * 4] < 130) blue++;
        }
        return blue / total;
      });
    await expect.poll(sea, { timeout: 15000 }).toBeGreaterThan(0.9);
  });

  test('dragging moves over the map and the right button turns the camera', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('group', { name: 'Modo de vista' }).getByRole('button', { name: 'Relieve 3D' }).click();
    await page.waitForFunction(() => (window as any).__cameraControls);

    // Open sea in the South Pacific, away from every marker; the camera is south of its target, looking north.
    await page.evaluate(() => {
      const cc = (window as any).__cameraControls;
      cc.moveTo(500, 0, 500, false);
      cc.dollyTo(300, false);
      (window as any).__invalidate();
    });
    type Cam = { d: number; polar: number; az: number; tx: number; tz: number };
    const cam = () =>
      page.evaluate((): Cam => {
        const cc = (window as any).__cameraControls;
        const t = cc.getTarget();
        return { d: cc.distance, polar: cc.polarAngle, az: cc.azimuthAngle, tx: t.x, tz: t.z };
      });
    const vp = page.viewportSize()!;
    const from = { x: vp.width / 2, y: vp.height * 0.3 };
    const drag = async (button: 'left' | 'right', dx: number, dy: number) => {
      await page.mouse.move(from.x, from.y);
      await page.mouse.down({ button });
      await page.mouse.move(from.x + dx, from.y + dy, { steps: 8 });
      await page.mouse.up({ button });
      // The camera eases to where the drag left it.
      await page.waitForTimeout(150);
      await page.waitForFunction(() => {
        (window as any).__invalidate();
        return !(window as any).__cameraControls.active;
      });
    };

    // Dragging to the right pulls the map with the pointer: the target goes to the camera's left.
    const start = await cam();
    await drag('left', 120, 0);
    const right = await cam();
    expect(right.tx).toBeLessThan(start.tx - 10);
    expect(right.tz).toBeCloseTo(start.tz, 0);
    expect(right.az).toBeCloseTo(start.az, 3);
    expect(right.polar).toBeCloseTo(start.polar, 3);
    expect(right.d).toBeCloseTo(start.d, 1);

    // Dragging down pulls the map down: the target goes forward, away from the camera.
    await drag('left', 0, 120);
    const down = await cam();
    expect(down.tz).toBeLessThan(right.tz - 10);
    expect(down.tx).toBeCloseTo(right.tx, 0);
    expect(down.polar).toBeCloseTo(start.polar, 3);

    // The right button turns the camera around the same target.
    await drag('right', 120, 0);
    const turned = await cam();
    expect(Math.abs(turned.az - down.az)).toBeGreaterThan(0.1);
    expect(turned.tx).toBeCloseTo(down.tx, 0);
    expect(turned.tz).toBeCloseTo(down.tz, 0);
    expect(turned.d).toBeCloseTo(down.d, 1);
  });

  test('on a touch screen one finger moves over the map', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'touch gestures belong to the phone layout');
    await page.goto('/');
    await page.getByRole('group', { name: 'Modo de vista' }).getByRole('button', { name: 'Relieve 3D' }).click();
    await page.waitForFunction(() => (window as any).__cameraControls);
    await page.evaluate(() => {
      const cc = (window as any).__cameraControls;
      cc.moveTo(500, 0, 500, false);
      cc.dollyTo(300, false);
      (window as any).__invalidate();
    });
    const cam = () =>
      page.evaluate(() => {
        const cc = (window as any).__cameraControls;
        return { az: cc.azimuthAngle as number, polar: cc.polarAngle as number, tx: cc.getTarget().x as number };
      });
    const start = await cam();

    const vp = page.viewportSize()!;
    const y = vp.height * 0.3;
    const cdp = await page.context().newCDPSession(page);
    const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', x: number) =>
      cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
    await touch('touchStart', vp.width * 0.3);
    for (let i = 1; i <= 8; i++) await touch('touchMove', vp.width * 0.3 + i * 15);
    await touch('touchEnd', 0);
    await page.waitForTimeout(150);
    await page.waitForFunction(() => {
      (window as any).__invalidate();
      return !(window as any).__cameraControls.active;
    });

    const end = await cam();
    expect(end.tx).toBeLessThan(start.tx - 10);
    expect(end.az).toBeCloseTo(start.az, 3);
    expect(end.polar).toBeCloseTo(start.polar, 3);
  });

  test('on a touch screen two fingers zoom by pinching, turn by twisting and tilt by dragging up', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'touch gestures belong to the phone layout');
    await page.goto('/');
    await page.getByRole('group', { name: 'Modo de vista' }).getByRole('button', { name: 'Relieve 3D' }).click();
    await page.waitForFunction(() => (window as any).__cameraControls);
    const reset = () =>
      page.evaluate(() => {
        const cc = (window as any).__cameraControls;
        cc.moveTo(0, 0, 0, false);
        cc.dollyTo(600, false);
        cc.rotateTo(0, 0.5, false);
        (window as any).__invalidate();
      });
    const cam = () =>
      page.evaluate(() => {
        const cc = (window as any).__cameraControls;
        // Where a point east of the target is drawn, as an angle around the target on screen.
        const centre = cc.getTarget().clone().project(cc.camera);
        const east = cc.getTarget().clone();
        east.x += 50;
        east.project(cc.camera);
        return {
          az: cc.azimuthAngle as number,
          polar: cc.polarAngle as number,
          d: cc.distance as number,
          tx: cc.getTarget().x as number,
          // Screen y grows down, so this grows clockwise.
          eastOnScreen: Math.atan2(-(east.y - centre.y), east.x - centre.x),
        };
      });
    const vp = page.viewportSize()!;
    const [cx, cy] = [vp.width / 2, vp.height * 0.3];
    const cdp = await page.context().newCDPSession(page);
    type Pair = [{ x: number; y: number }, { x: number; y: number }];
    /** Two fingers go from `from` to `to` in ten moves; `to` gets the step 0..1. */
    const gesture = async (at: (u: number) => Pair) => {
      const points = (u: number) => at(u).map((p, id) => ({ ...p, id }));
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points(0) });
      for (let i = 1; i <= 10; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: points(i / 10) });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await page.waitForTimeout(150);
      await page.waitForFunction(() => {
        (window as any).__invalidate();
        return !(window as any).__cameraControls.active;
      });
    };

    // Spreading the fingers to twice the gap halves the distance; nothing else moves.
    await reset();
    let start = await cam();
    await gesture((u) => [{ x: cx - 40 - 40 * u, y: cy }, { x: cx + 40 + 40 * u, y: cy }]);
    let end = await cam();
    expect(end.d).toBeCloseTo(start.d / 2, 0);
    expect(end.az).toBeCloseTo(start.az, 3);
    expect(end.polar).toBeCloseTo(start.polar, 3);
    expect(end.tx).toBeCloseTo(start.tx, 1);

    // Twisting the fingers clockwise turns the map clockwise with them, by the same angle.
    await reset();
    start = await cam();
    const turn = Math.PI / 4;
    await gesture((u) => [
      { x: cx - 60 * Math.cos(turn * u), y: cy - 60 * Math.sin(turn * u) },
      { x: cx + 60 * Math.cos(turn * u), y: cy + 60 * Math.sin(turn * u) },
    ]);
    end = await cam();
    expect(Math.abs(end.az - start.az)).toBeCloseTo(turn, 2);
    expect(end.eastOnScreen).toBeGreaterThan(start.eastOnScreen);
    expect(end.polar).toBeCloseTo(start.polar, 3);
    expect(end.d).toBeCloseTo(start.d, 1);

    // Dragging both fingers up tilts the view towards the horizon; it does not zoom or turn.
    await reset();
    start = await cam();
    await gesture((u) => [{ x: cx - 40, y: cy + 60 - 120 * u }, { x: cx + 40, y: cy + 60 - 120 * u }]);
    end = await cam();
    expect(end.polar).toBeGreaterThan(start.polar + 0.2);
    expect(end.az).toBeCloseTo(start.az, 3);
    expect(end.d).toBeCloseTo(start.d, 1);
  });

  test('terrain is rendered and South Pole pixel is not ocean color', async ({ page }) => {
    await page.goto('/');
    const toggle = page.getByRole('group', { name: 'Modo de vista' });
    await toggle.getByRole('button', { name: 'Relieve 3D' }).click();
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    // Wait for terrain textures and mesh to settle
    await page.waitForTimeout(1200);

    const isTerrainVisible = await page.evaluate(() => {
      const c = document.querySelector('canvas');
      if (!c) return false;
      const c2d = document.createElement('canvas');
      c2d.width = 1;
      c2d.height = 1;
      const ctx = c2d.getContext('2d');
      if (!ctx) return false;
      ctx.drawImage(c, c.width / 2, c.height / 2, 1, 1, 0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      // Ocean color #3F6F94 is r:63, g:111, b:148.
      // Terrain at South Pole is bright snow/relief (r > 130).
      const isOcean = r < 100 && g < 135 && b > 100;
      return !isOcean && (r > 120 || g > 120);
    });

    expect(isTerrainVisible).toBe(true);
  });

  test('Tierra del Fuego has relief and the camera gets closer there than over Antarctica', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('group', { name: 'Modo de vista' }).getByRole('button', { name: 'Relieve 3D' }).click();
    await page.waitForFunction(() => (window as any).__cameraControls);

    // Look at Ushuaia (map 31.5, 313.6 -> world -468.5, -186.4).
    await page.evaluate(() => {
      (window as any).__cameraControls.setLookAt(-455, 40, -170, -468.5, 0, -186.4, false);
      (window as any).__invalidate();
    });

    // The regional mesh is fetched once the camera is near and carries a land/water attribute.
    await page.waitForFunction(
      () => {
        let found = false;
        (window as any).__scene.traverse((o: any) => {
          if (o.isMesh && o.geometry?.attributes?.aLand) found = true;
        });
        (window as any).__invalidate();
        return found;
      },
      null,
      { timeout: 20000 },
    );

    const distance = () => page.evaluate(() => (window as any).__cameraControls.distance as number);
    const settle = (check: string) =>
      page.waitForFunction(
        (c) => {
          (window as any).__invalidate();
          const cc = (window as any).__cameraControls;
          return new Function('cc', `return ${c}`)(cc);
        },
        check,
        { timeout: 10000 },
      );

    // Around Ushuaia the camera may go well below the Antarctic limit of 60.
    await settle('cc.minDistance < 60');
    await page.evaluate(() => void (window as any).__cameraControls.dollyTo(1, false));
    await settle('cc.distance < 20');
    const minHere = await page.evaluate(() => (window as any).__cameraControls.minDistance as number);
    expect(await distance()).toBeGreaterThanOrEqual(minHere - 0.01);

    // Moving the target to the South Pole pushes it back out.
    await page.evaluate(() => void (window as any).__cameraControls.moveTo(0, 0, 0, false));
    await settle('cc.minDistance === 60 && cc.distance >= 59.9');
  });

  test('with PointSheet open, elementFromPoint at sheet center returns an element inside the sheet', async ({ page }) => {
    await page.goto('/');
    const toggle = page.getByRole('group', { name: 'Modo de vista' });
    await toggle.getByRole('button', { name: 'Relieve 3D' }).click();
    await page.waitForSelector('canvas');
    await page.waitForTimeout(1000);

    // Open PointSheet for a sea marker
    const seaMarker = page.locator('.ov [data-key^="sea-"] button').first();
    await expect(seaMarker).toBeVisible();
    await seaMarker.click();
    const sheet = page.locator('.sheet[role="dialog"]');
    await expect(sheet).toBeVisible();

    // Verify center of sheet points to a node inside the sheet
    const hitInside = await page.evaluate(() => {
      const el = document.querySelector('.sheet[role="dialog"]');
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const hit = document.elementFromPoint(cx, cy);
      return el.contains(hit);
    });

    expect(hitInside).toBe(true);
  });

  test('sea cards show the block model of their point, and the Drake card shows none (#50)', async ({ page }) => {
    await page.goto('/');
    const toggle = page.getByRole('group', { name: 'Modo de vista' });
    await toggle.getByRole('button', { name: 'Relieve 3D' }).click();
    await page.waitForSelector('canvas');
    await page.waitForTimeout(1000);

    const sheet = page.locator('.sheet[role="dialog"]');
    const open = async (key: string) => {
      // Markers can sit under another one or off screen: open the card without aiming at it.
      await page.locator(`[data-key="${key}"] button`).evaluate((b: HTMLElement) => b.click());
      await expect(sheet).toBeVisible();
    };
    for (const key of ['sea-ballena', 'sea-pinguino', 'sea-irizar', 'sea-tempano']) {
      await open(key);
      await expect(sheet.locator('.vpreview canvas')).toHaveCount(1);
      await page.keyboard.press('Escape');
      await expect(sheet).not.toBeVisible();
    }
    await open('sea-drake');
    await expect(sheet.locator('.vpreview')).toHaveCount(0);
  });
});
