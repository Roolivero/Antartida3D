import { existsSync, mkdirSync } from 'node:fs';
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

  await browser.close();
  console.log('All captures taken successfully!');
} finally {
  stopServer();
}
