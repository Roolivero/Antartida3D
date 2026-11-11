import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join, posix, relative } from 'node:path';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';
import type { Size } from './types.ts';

export const zero = (): Size => ({ raw: 0, gzip: 0, brotli: 0 });

export function sizeOf(buf: Buffer | string): Size {
  const b = typeof buf === 'string' ? Buffer.from(buf) : buf;
  return {
    raw: b.length,
    gzip: gzipSync(b, { level: 9 }).length,
    brotli: brotliCompressSync(b, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length,
  };
}

export const add = (a: Size, b: Size): Size => ({ raw: a.raw + b.raw, gzip: a.gzip + b.gzip, brotli: a.brotli + b.brotli });

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

export function sumFiles(dist: string, ext: RegExp): Size {
  return walk(dist).filter((f) => ext.test(f)).reduce((acc, f) => add(acc, sizeOf(readFileSync(f))), zero());
}

// Static `import x from "./a.js"`, `import "./a.js"`, `export * from "./a.js"`; never `import("./a.js")`.
const STATIC_IMPORT = /(?:\bimport\s*(?:[\w$*{}\s,]+?\s*from\s*)?|\bexport\s*(?:\*|\{[^}]*\})\s*from\s*)["']([^"']+\.m?js)["']/g;

/**
 * JS needed before the page is interactive: <script src>, <link rel=modulepreload> and inline scripts,
 * plus everything they import statically.
 * Lazy chunks (dynamic import()) are excluded.
 */
export function initialJs(dist: string, htmlFile = 'index.html'): { size: Size; files: string[] } {
  const html = readFileSync(join(dist, htmlFile), 'utf8');
  const roots = new Set<string>();
  const attr = /(?:<script[^>]*\ssrc|<link[^>]*rel="modulepreload"[^>]*\shref|<link[^>]*\shref(?=[^>]*rel="modulepreload"))="([^"]+\.m?js)"/g;
  for (const m of html.matchAll(attr)) roots.add(m[1]);

  const seen = new Set<string>();
  const queue = [...roots].map((u) => join(dist, u.replace(/^\//, '')));
  while (queue.length) {
    const file = queue.pop()!;
    if (seen.has(file) || !existsSync(file)) continue;
    seen.add(file);
    const code = readFileSync(file, 'utf8');
    for (const m of code.matchAll(STATIC_IMPORT)) {
      const spec = m[1];
      queue.push(spec.startsWith('/') ? join(dist, spec.slice(1)) : join(dirname(file), spec));
    }
  }

  let size = [...seen].reduce((acc, f) => add(acc, sizeOf(readFileSync(f))), zero());
  const inline = [...html.matchAll(/<script(?![^>]*\ssrc=)(?![^>]*type="application\/(?:ld\+)?json")[^>]*>([\s\S]*?)<\/script>/g)]
    .map((m) => m[1]).join('');
  if (inline.trim()) size = add(size, sizeOf(inline));
  return { size, files: [...seen].map((f) => posix.normalize(relative(dist, f))) };
}
