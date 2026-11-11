import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { rmSync } from 'node:fs';
import { join } from 'node:path';

export function build(appDir: string): number {
  for (const d of ['dist', 'node_modules/.vite']) rmSync(join(appDir, d), { recursive: true, force: true });
  const t0 = performance.now();
  const r = spawnSync('pnpm', ['build'], { cwd: appDir, stdio: ['ignore', 'ignore', 'pipe'], encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`build failed in ${appDir}:\n${r.stderr.slice(-2000)}`);
  return Math.round(performance.now() - t0);
}

export async function startPreview(appDir: string, port: number): Promise<() => void> {
  const child: ChildProcess = spawn('pnpm', ['preview'], { cwd: appDir, stdio: 'ignore', detached: true });
  const stop = () => {
    try { process.kill(-child.pid!, 'SIGTERM'); } catch { /* already gone */ }
  };
  const url = `http://localhost:${port}/`;
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(url)).ok) return stop;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  stop();
  throw new Error(`preview did not start on ${url}`);
}
