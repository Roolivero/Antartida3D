import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import { startPreview } from './server.ts';
import { GPU_ARGS } from './gpu.ts';

const root = join(process.cwd(), '../../');
const outDir = join(root, 'docs/rendimiento/capturas/3d');
mkdirSync(outDir, { recursive: true });

const executablePath =
  process.env.CHROMIUM_PATH ??
  ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome'].find(existsSync);

console.log('Starting preview server for @antartida/dibujado on port 5103...');
const stopServer = await startPreview(join(root, 'apps/dibujado'), 5103);

try {
  console.log('Launching Chromium with GPU...');
  const browser = await chromium.launch({
    executablePath,
    args: GPU_ARGS,
  });

  // (a) 2D en HOME (1440x900)
  console.log('Capturing (a) 2D in HOME (1440px)...');
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto('http://localhost:5103/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    // Ensure in 2D
    const btn2D = page.getByRole('button', { name: 'Mapa 2D' });
    if (await btn2D.isVisible()) {
      await btn2D.click();
      await page.waitForTimeout(1000);
    }
    await page.screenshot({ path: join(outDir, 'mapa-2d-1440.jpg'), quality: 85, type: 'jpeg' });
    console.log('Saved mapa-2d-1440.jpg');
    await page.close();
  }

  // (b) 3D cenital en el mismo view (1440x900)
  console.log('Capturing (b) 3D cenital in HOME view (1440px)...');
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto('http://localhost:5103/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const btn3D = page.getByRole('button', { name: 'Relieve 3D' });
    await btn3D.click();
    await page.waitForSelector('canvas');
    await page.waitForTimeout(2000);

    // Set top-down cenital camera pose matching HOME
    await page.evaluate(() => {
      const cc = (window as any).__cameraControls;
      const inv = (window as any).__invalidate;
      if (!cc) throw new Error('No CameraControls found');
      // Match exact poseFromView for HOME view
      const size = { vw: 1440, vh: 900 };
      const S = Math.max(240, Math.min(size.vw * 0.94, size.vh * 0.86));
      const geo = { S, ox: (size.vw - S) / 2 + S * 0.025, oy: (size.vh - S) / 2 + 6 };
      const pxPerUnit = (geo.S * 1.0) / 1000;
      const h = size.vh / (2 * Math.tan((40 * Math.PI) / 360) * pxPerUnit);
      const targetX = (size.vw / 2 - geo.ox) / pxPerUnit - 500;
      const targetZ = (size.vh / 2 - geo.oy) / pxPerUnit - 500;
      cc.setLookAt(targetX, h, targetZ + 0.001, targetX, 0, targetZ, false);
      inv?.();
    });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: join(outDir, 'mapa-3d-cenital-1440.jpg'), quality: 85, type: 'jpeg' });
    console.log('Saved mapa-3d-cenital-1440.jpg');
    await page.close();
  }

  // (c) 3D overview as the app opens it (1440x900)
  console.log('Capturing (c) 3D overview (1440px)...');
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto('http://localhost:5103/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const btn3D = page.getByRole('button', { name: 'Relieve 3D' });
    await btn3D.click();
    await page.waitForSelector('canvas');
    await page.waitForTimeout(2000);

    // The app's own overview pose (homePose3D), exactly what a visitor sees.
    await page.screenshot({ path: join(outDir, 'mapa-3d-1440.jpg'), quality: 85, type: 'jpeg' });
    console.log('Saved mapa-3d-1440.jpg');
    await page.close();
  }

  // (d) 3D acercado a los Montes Transantárticos (cámara distinta, captura distinta)
  console.log('Capturing (d) 3D zoomed in on Montes Transantárticos (1440px)...');
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto('http://localhost:5103/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const btn3D = page.getByRole('button', { name: 'Relieve 3D' });
    await btn3D.click();
    await page.waitForSelector('canvas');
    await page.waitForTimeout(2000);

    await page.evaluate(() => {
      const cc = (window as any).__cameraControls;
      const inv = (window as any).__invalidate;
      if (!cc) throw new Error('No CameraControls found');
      // Target Queen Maud Mountains in Transantarctic Range
      const target = { x: -30, y: 15, z: 100 };
      const distance = 550;
      const pitchRad = (35 * Math.PI) / 180;
      const posX = target.x + 60;
      const posY = target.y + distance * Math.sin(pitchRad);
      const posZ = target.z + distance * Math.cos(pitchRad);
      cc.setLookAt(posX, posY, posZ, target.x, target.y, target.z, false);
      inv?.();
    });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: join(outDir, 'transantarticos-3d.jpg'), quality: 85, type: 'jpeg' });
    console.log('Saved transantarticos-3d.jpg');
    await page.close();
  }

  // (e) 3D a 390 px (390x844)
  console.log('Capturing (e) 3D at 390px mobile...');
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto('http://localhost:5103/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const btn3D = page.getByRole('button', { name: 'Relieve 3D' });
    await btn3D.click();
    await page.waitForSelector('canvas');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: join(outDir, 'mapa-3d-390.jpg'), quality: 85, type: 'jpeg' });
    console.log('Saved mapa-3d-390.jpg');
    await page.close();
  }

  // Helper for capturing specific ocean scenarios in 3D
  const captureOceanScenario = async (
    name: string,
    width: number,
    height: number,
    setupCamera: (page: any) => Promise<void>
  ) => {
    console.log(`Capturing ocean scenario: ${name} (${width}x${height})...`);
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto('http://localhost:5103/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const btn3D = page.getByRole('button', { name: 'Relieve 3D' });
    await btn3D.click();
    await page.waitForSelector('canvas');
    await page.waitForTimeout(2000);

    await setupCamera(page);
    await page.waitForTimeout(1500);

    const filename = `${name}.jpg`;
    await page.screenshot({ path: join(outDir, filename), quality: 85, type: 'jpeg' });
    console.log(`Saved ${filename}`);
    await page.close();
  };

  // 1. Cenital (0° tilt) in 1440x900 and 390x844
  const setupCenital = async (page: any) => {
    await page.evaluate(() => {
      const cc = (window as any).__cameraControls;
      const inv = (window as any).__invalidate;
      if (!cc) throw new Error('No CameraControls found');
      cc.setLookAt(0, 1500, 0.001, 0, 0, 0, false);
      inv?.();
    });
  };
  await captureOceanScenario('oceano-cenital-1440', 1440, 900, setupCenital);
  await captureOceanScenario('oceano-cenital-390', 390, 844, setupCenital);

  // 2. 38° tilt (standard overview tilt) in 1440x900 and 390x844
  const setupTilt38 = async (page: any) => {
    await page.evaluate(() => {
      const cc = (window as any).__cameraControls;
      const inv = (window as any).__invalidate;
      if (!cc) throw new Error('No CameraControls found');
      const pitchRad = (38 * Math.PI) / 180;
      const dist = 1400;
      const target = { x: 0, y: 0, z: 0 };
      cc.setLookAt(
        target.x,
        target.y + dist * Math.sin(pitchRad),
        target.z + dist * Math.cos(pitchRad),
        target.x,
        target.y,
        target.z,
        false
      );
      inv?.();
    });
  };
  await captureOceanScenario('oceano-38deg-1440', 1440, 900, setupTilt38);
  await captureOceanScenario('oceano-38deg-390', 390, 844, setupTilt38);

  // 3. 60° tilt (max polar angle) in 1440x900 and 390x844
  const setupTilt60 = async (page: any) => {
    await page.evaluate(() => {
      const cc = (window as any).__cameraControls;
      const inv = (window as any).__invalidate;
      if (!cc) throw new Error('No CameraControls found');
      // maxPolarAngle = 60 deg, looking towards north (azimuth 0)
      const pitchRad = (30 * Math.PI) / 180; // 30 deg above horizon = 60 deg polar
      const dist = 1500;
      const target = { x: 0, y: 0, z: 0 };
      cc.setLookAt(
        target.x,
        target.y + dist * Math.sin(pitchRad),
        target.z + dist * Math.cos(pitchRad),
        target.x,
        target.y,
        target.z,
        false
      );
      inv?.();
    });
  };
  await captureOceanScenario('oceano-60deg-1440', 1440, 900, setupTilt60);
  await captureOceanScenario('oceano-60deg-390', 390, 844, setupTilt60);

  // 4. Maximum distance zoom out in 1440x900 and 390x844
  const setupMaxDistance = async (page: any) => {
    await page.evaluate(() => {
      const cc = (window as any).__cameraControls;
      const inv = (window as any).__invalidate;
      if (!cc) throw new Error('No CameraControls found');
      const pitchRad = (45 * Math.PI) / 180;
      const dist = 3200; // near maxDistance = 3500
      const target = { x: 0, y: 0, z: 0 };
      cc.setLookAt(
        target.x,
        target.y + dist * Math.sin(pitchRad),
        target.z + dist * Math.cos(pitchRad),
        target.x,
        target.y,
        target.z,
        false
      );
      inv?.();
    });
  };
  await captureOceanScenario('oceano-maxdist-1440', 1440, 900, setupMaxDistance);
  await captureOceanScenario('oceano-maxdist-390', 390, 844, setupMaxDistance);

  // 5. Close-up view of Antarctic Peninsula coast (~dist 300)
  const setupPeninsulaCoast = async (page: any) => {
    await page.evaluate(() => {
      const cc = (window as any).__cameraControls;
      const inv = (window as any).__invalidate;
      if (!cc) throw new Error('No CameraControls found');
      // Look at northern Antarctic Peninsula / Larsen shelf edge
      const target = { x: -300, y: 0, z: -180 };
      const pitchRad = (40 * Math.PI) / 180;
      const dist = 300;
      cc.setLookAt(
        target.x,
        target.y + dist * Math.sin(pitchRad),
        target.z + dist * Math.cos(pitchRad),
        target.x,
        target.y,
        target.z,
        false
      );
      inv?.();
    });
  };
  await captureOceanScenario('oceano-costa-peninsula', 1440, 900, setupPeninsulaCoast);

  // 6. Close-up view of Ross Ice Shelf edge (~dist 300)
  const setupRossCoast = async (page: any) => {
    await page.evaluate(() => {
      const cc = (window as any).__cameraControls;
      const inv = (window as any).__invalidate;
      if (!cc) throw new Error('No CameraControls found');
      // Look at Ross Ice Shelf barrier edge
      const target = { x: 0, y: 0, z: 170 };
      const pitchRad = (40 * Math.PI) / 180;
      const dist = 300;
      cc.setLookAt(
        target.x,
        target.y + dist * Math.sin(pitchRad),
        target.z + dist * Math.cos(pitchRad),
        target.x,
        target.y,
        target.z,
        false
      );
      inv?.();
    });
  };
  await captureOceanScenario('oceano-costa-ross', 1440, 900, setupRossCoast);

  // 7. Very close-up view of Antarctic Peninsula coast (~dist 150, 45° tilt) for foam, isobaths and ink waves
  const setupPeninsulaDetail = async (page: any) => {
    await page.evaluate(() => {
      const cc = (window as any).__cameraControls;
      const inv = (window as any).__invalidate;
      if (!cc) throw new Error('No CameraControls found');
      cc.minDistance = 100;
      const target = { x: -310, y: 0, z: -200 };
      const pitchRad = (45 * Math.PI) / 180;
      const dist = 150;
      cc.setLookAt(
        target.x,
        target.y + dist * Math.sin(pitchRad),
        target.z + dist * Math.cos(pitchRad),
        target.x,
        target.y,
        target.z,
        false
      );
      inv?.();
    });
  };
  await captureOceanScenario('oceano-detalle', 1440, 900, setupPeninsulaDetail);

  // ---------------------------------------------------------------------------
  // Gate 4 (F5): Sea life, tabular icebergs, and ARA Almirante Irizar captures
  // ---------------------------------------------------------------------------
  const scratchDir =
    process.env.SCRATCHPAD_DIR ??
    '/tmp/claude-1000/-home-lk-Proyectos-Antartida3D/1adc844c-cf0e-4f45-90a9-7b2a252061ce/scratchpad';
  mkdirSync(scratchDir, { recursive: true });

  // 8. fauna-38deg-1440.jpg (initial 3D overview at 38 deg, 1440x900)
  await captureOceanScenario('fauna-38deg-1440', 1440, 900, async (page) => {
    const drawCallInfo = await page.evaluate(async () => {
      const gl = (window as any).__gl;
      const inv = (window as any).__invalidate;
      if (!gl || !inv) return { totalFrameCalls: -1, rawWebglDraws: -1 };
      const ctx = gl.getContext() as WebGL2RenderingContext;
      let rawWebglDraws = 0;
      const origDrawElements = ctx.drawElements.bind(ctx);
      const origDrawArrays = ctx.drawArrays.bind(ctx);
      const origDrawElementsInstanced = ctx.drawElementsInstanced.bind(ctx);
      const origDrawArraysInstanced = ctx.drawArraysInstanced.bind(ctx);

      ctx.drawElements = (...args: Parameters<WebGL2RenderingContext['drawElements']>) => {
        rawWebglDraws++;
        return origDrawElements(...args);
      };
      ctx.drawArrays = (...args: Parameters<WebGL2RenderingContext['drawArrays']>) => {
        rawWebglDraws++;
        return origDrawArrays(...args);
      };
      ctx.drawElementsInstanced = (
        ...args: Parameters<WebGL2RenderingContext['drawElementsInstanced']>
      ) => {
        rawWebglDraws++;
        return origDrawElementsInstanced(...args);
      };
      ctx.drawArraysInstanced = (
        ...args: Parameters<WebGL2RenderingContext['drawArraysInstanced']>
      ) => {
        rawWebglDraws++;
        return origDrawArraysInstanced(...args);
      };

      const prevAutoReset = gl.info.autoReset;
      gl.info.autoReset = false;
      gl.info.reset();
      rawWebglDraws = 0;
      inv();
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const totalFrameCalls = gl.info.render.calls;
      gl.info.autoReset = prevAutoReset;
      ctx.drawElements = origDrawElements;
      ctx.drawArrays = origDrawArrays;
      ctx.drawElementsInstanced = origDrawElementsInstanced;
      ctx.drawArraysInstanced = origDrawArraysInstanced;
      return { totalFrameCalls, rawWebglDraws };
    });
    console.log(
      `WebGL draw calls in 1440px overview (with SeaLife): renderer.info.render.calls=${drawCallInfo.totalFrameCalls} (before SeaLife=${drawCallInfo.totalFrameCalls - 1}, new calls=+1 InstancedMesh)`
    );
  });

  // 9. fauna-peninsula.jpg (close to Western Antarctic Peninsula where humpbacks, seals & orcas are)
  await captureOceanScenario('fauna-peninsula', 1440, 900, async (page) => {
    await page.evaluate(() => {
      const cc = (window as any).__cameraControls;
      const inv = (window as any).__invalidate;
      if (!cc) throw new Error('No CameraControls found');
      // Target Western Antarctic Peninsula / Marguerite Bay waters (map ~135, 535 -> world -365, 35)
      const target = { x: -365, y: 0, z: 35 };
      const pitchRad = (36 * Math.PI) / 180;
      const dist = 310;
      cc.setLookAt(
        target.x - 35,
        target.y + dist * Math.sin(pitchRad),
        target.z + dist * Math.cos(pitchRad),
        target.x,
        target.y,
        target.z,
        false
      );
      inv?.();
    });
  });

  // 10. fauna-irizar.jpg (close to the ARA Almirante Irizar in the Drake Passage)
  await captureOceanScenario('fauna-irizar', 1440, 900, async (page) => {
    await page.evaluate(() => {
      const cc = (window as any).__cameraControls;
      const inv = (window as any).__invalidate;
      if (!cc) throw new Error('No CameraControls found');
      const seaTime = (window as any).__seaTime ?? 0;
      const c = (((seaTime * 0.0125 + 0.19) % 1) + 1) % 1;
      let t = 0;
      if (c < 0.4) {
        const u = c / 0.4;
        t = u * u * (3 - 2 * u);
      } else if (c < 0.5) {
        t = 1;
      } else if (c < 0.9) {
        const u = (c - 0.5) / 0.4;
        t = 1 - u * u * (3 - 2 * u);
      } else {
        t = 0;
      }
      const u = 1 - t;
      const p0 = { x: 36, y: 318 };
      const p1 = { x: 80, y: 350 };
      const p2 = { x: 140, y: 348 };
      const p3 = { x: 190, y: 306 };
      const mapX =
        u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x;
      const mapY =
        u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y;
      const target = { x: mapX - 500, y: 0, z: mapY - 500 };
      const pitchRad = (36 * Math.PI) / 180;
      const dist = 210;
      cc.setLookAt(
        target.x,
        target.y + dist * Math.sin(pitchRad),
        target.z + dist * Math.cos(pitchRad),
        target.x,
        target.y,
        target.z,
        false
      );
      inv?.();
    });
  });

  // 11. fauna-390.jpg (mobile 390x844 view)
  await captureOceanScenario('fauna-390', 390, 844, async () => {});

  // 11b. mar-ficha-irizar.jpg (3D view with the ARA Almirante Irizar PointSheet open)
  await captureOceanScenario('mar-ficha-irizar', 1440, 900, async (page) => {
    const btn = page.locator('button[data-key="sea-irizar"], button[aria-label*="Irízar"], button[aria-label*="Irizar"]');
    await btn.first().click();
    await page.waitForSelector('.sheet[role="dialog"]');
    await page.waitForTimeout(500);
  });

  // ---------------------------------------------------------------------------
  // Gate 5 (F8): Coastline, Ross Ice Shelf front, mountains & ice captures
  // ---------------------------------------------------------------------------
  // 13. hielo-38deg-1440.jpg (initial 3D view at 38 deg in 1440x900)
  await captureOceanScenario('hielo-38deg-1440', 1440, 900, async () => {});

  // 14. hielo-ross.jpg (close-up of Ross Ice Shelf front and Transantarctic Mountains)
  await captureOceanScenario('hielo-ross', 1440, 900, async (page) => {
    await page.evaluate(() => {
      const cc = (window as any).__cameraControls;
      const inv = (window as any).__invalidate;
      if (!cc) throw new Error('No CameraControls found');
      const target = { x: 0, y: 2, z: 165 };
      const pitchRad = (32 * Math.PI) / 180;
      const dist = 230;
      cc.setLookAt(
        target.x - 15,
        target.y + dist * Math.sin(pitchRad),
        target.z + dist * Math.cos(pitchRad),
        target.x,
        target.y,
        target.z,
        false
      );
      inv?.();
    });
  });

  // 15. hielo-peninsula.jpg (Antarctic Peninsula mountains and ice shelves)
  await captureOceanScenario('hielo-peninsula', 1440, 900, async (page) => {
    await page.evaluate(() => {
      const cc = (window as any).__cameraControls;
      const inv = (window as any).__invalidate;
      if (!cc) throw new Error('No CameraControls found');
      const target = { x: -305, y: 2, z: -185 };
      const pitchRad = (34 * Math.PI) / 180;
      const dist = 210;
      cc.setLookAt(
        target.x - 35,
        target.y + dist * Math.sin(pitchRad),
        target.z + dist * Math.cos(pitchRad),
        target.x,
        target.y,
        target.z,
        false
      );
      inv?.();
    });
  });

  // 16. hielo-cerca.jpg (close-up over plateau / coastal ice slope where sastrugi and crevasses appear)
  await captureOceanScenario('hielo-cerca', 1440, 900, async (page) => {
    await page.evaluate(() => {
      const cc = (window as any).__cameraControls;
      const inv = (window as any).__invalidate;
      if (!cc) throw new Error('No CameraControls found');
      const target = { x: 55, y: 8, z: 95 };
      const pitchRad = (34 * Math.PI) / 180;
      const dist = 140;
      cc.setLookAt(
        target.x - 20,
        target.y + dist * Math.sin(pitchRad),
        target.z + dist * Math.cos(pitchRad),
        target.x,
        target.y,
        target.z,
        false
      );
      inv?.();
    });
  });

  // 17. hielo-390.jpg (mobile 390x844 view)
  await captureOceanScenario('hielo-390', 390, 844, async () => {});

  // 12. fauna-10s.webm: 10 s video at 38 deg with Playwright recordVideo (reducedMotion: 'no-preference')
  console.log('Recording 10 s animation video fauna-10s.webm (1440x900, 38 deg)...');
  {
    const videoTmpDir = join(scratchDir, 'video-tmp');
    rmSync(videoTmpDir, { recursive: true, force: true });
    mkdirSync(videoTmpDir, { recursive: true });

    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      reducedMotion: 'no-preference',
      recordVideo: {
        dir: videoTmpDir,
        size: { width: 1440, height: 900 },
      },
    });
    const page = await context.newPage();
    await page.goto('http://localhost:5103/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const btn3D = page.getByRole('button', { name: 'Relieve 3D' });
    await btn3D.click();
    await page.waitForSelector('canvas');
    await page.waitForTimeout(2000);

    // Wait 10.5 s in 3D so the last 10.0 s of the recording are pure 3D ocean & sea life animation
    await page.waitForTimeout(10500);

    const video = page.video();
    await page.close();
    await context.close();
    if (video) {
      const videoPath = await video.path();
      const destVideo = join(outDir, 'fauna-10s.webm');
      const trimRes = spawnSync(
        'ffmpeg',
        [
          '-y',
          '-sseof',
          '-10',
          '-i',
          videoPath,
          '-t',
          '10',
          '-r',
          '25',
          '-c:v',
          'libvpx-vp9',
          '-b:v',
          '2M',
          '-an',
          destVideo,
        ],
        { stdio: 'pipe', encoding: 'utf8' }
      );
      if (trimRes.status !== 0) {
        throw new Error(`ffmpeg trim failed: ${trimRes.stderr}`);
      }
      // Extract 3 frames (0s, 5s, 9.8s) from the trimmed 10s video into scratchpad
      for (const [sec, outName] of [
        ['0', 'fauna-video-0s.jpg'],
        ['5', 'fauna-video-5s.jpg'],
        ['9.8', 'fauna-video-10s.jpg'],
      ] as const) {
        spawnSync(
          'ffmpeg',
          ['-y', '-ss', sec, '-i', destVideo, '-frames:v', '1', '-q:v', '2', join(scratchDir, outName)],
          { stdio: 'pipe' }
        );
      }
      console.log(`Saved ${destVideo} (trimmed to 10.0 s)`);
    }
  }

  await browser.close();
  console.log('All captures taken successfully!');
} finally {
  stopServer();
}
