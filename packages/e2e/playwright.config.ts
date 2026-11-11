import { defineConfig, devices } from '@playwright/test';
import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromiumPath } from './browser.ts';
import { APPS, type AppName } from './ports.ts';

// Run from an app folder (`pnpm e2e`): the folder name selects the port.
const app = basename(process.cwd()) as AppName;
const port = APPS[app];
if (!port) throw new Error(`Unknown app folder: ${app}`);

export default defineConfig({
  testDir: fileURLToPath(new URL('./tests', import.meta.url)),
  outputDir: `${process.cwd()}/test-results`,
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
  ],
  webServer: {
    command: 'pnpm build && pnpm preview',
    cwd: process.cwd(),
    url: `http://localhost:${port}`,
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
