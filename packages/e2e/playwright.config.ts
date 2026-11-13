import { defineConfig, devices } from '@playwright/test';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromiumPath } from './browser.ts';
import { APPS, type AppName } from './ports.ts';

// Run from an app folder (`pnpm e2e`) or repository root: default to `dibujado`.
const folder = basename(process.cwd());
const app: AppName = (folder in APPS ? folder : 'dibujado') as AppName;
const appDir = folder in APPS ? process.cwd() : resolve(process.cwd(), 'apps', app);
const port = APPS[app];

export default defineConfig({
  testDir: fileURLToPath(new URL('./tests', import.meta.url)),
  outputDir: `${appDir}/test-results`,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${port}`,
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    launchOptions: { executablePath: chromiumPath },
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    {
      name: 'mobile-compact',
      testMatch: /orcadas.*\.spec\.ts/,
      use: { ...devices['Pixel 7'], viewport: { width: 360, height: 740 } },
    },
    {
      name: 'mobile-landscape',
      testMatch: /orcadas.*\.spec\.ts/,
      use: { ...devices['Pixel 7'], viewport: { width: 844, height: 390 } },
    },
  ],
  webServer: {
    command: 'pnpm build && pnpm preview',
    cwd: appDir,
    url: `http://localhost:${port}`,
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
