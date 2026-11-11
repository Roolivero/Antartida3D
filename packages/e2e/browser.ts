import { existsSync } from 'node:fs';

/**
 * Chromium used by e2e and bench: CHROMIUM_PATH, else the system Chromium, else Playwright's own build
 * (`pnpm exec playwright install chromium`).
 */
export const chromiumPath: string | undefined =
  process.env.CHROMIUM_PATH ?? ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome'].find(existsSync);
