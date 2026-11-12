/**
 * Bakes the hand-drawn SVG sea life and icebreaker sprites into a 2048x2048 RGBA WebP atlas
 * (`packages/core/src/assets/sea-atlas.webp`) and writes UV + anchor metadata (`sea-atlas.json`).
 * Run with `pnpm sea-atlas`.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { SVG_DEFS } from '../src/svg/filters.ts';

const here = dirname(fileURLToPath(import.meta.url));
const artDir = join(here, '../src/art/sea');
const outDir = join(here, '../src/assets');
const ATLAS_SIZE = 2048;
const CELL_SIZE = 512;
const COLS = 4;
const QUALITY = 0.88;

export interface SeaSpriteSpec {
  id: string;
  /** Normalized anchor X (0 = left, 0.5 = center, 1 = right) */
  anchorX: number;
  /** Normalized anchor Y (0 = top, 0.5 = center, 1 = bottom) */
  anchorY: number;
}

const SPRITE_SPECS: readonly SeaSpriteSpec[] = [
  { id: 'humpback-back', anchorX: 0.5, anchorY: 0.7 },
  { id: 'humpback-tail', anchorX: 0.5, anchorY: 0.76 },
  { id: 'humpback-spout', anchorX: 0.5, anchorY: 0.76 },
  { id: 'orca', anchorX: 0.5, anchorY: 0.71 },
  { id: 'minke', anchorX: 0.5, anchorY: 0.67 },
  { id: 'penguins-iceberg', anchorX: 0.5, anchorY: 0.72 },
  { id: 'leopard-seal', anchorX: 0.5, anchorY: 0.71 },
  { id: 'iceberg-lg', anchorX: 0.5, anchorY: 0.72 },
  { id: 'iceberg-sm', anchorX: 0.5, anchorY: 0.71 },
  { id: 'irizar', anchorX: 0.5, anchorY: 0.69 },
  { id: 'irizar-wake', anchorX: 0.9, anchorY: 0.5 },
];

export interface SeaAtlasEntry {
  index: number;
  x: number;
  y: number;
  w: number;
  h: number;
  u0: number;
  v0: number;
  u1: number;
  v1: number;
  anchorX: number;
  anchorY: number;
}

export interface SeaAtlasManifest {
  size: number;
  cellSize: number;
  sprites: Record<string, SeaAtlasEntry>;
}

mkdirSync(outDir, { recursive: true });

const cellsSvg: string[] = [];
const spritesMeta: Record<string, SeaAtlasEntry> = {};

for (let i = 0; i < SPRITE_SPECS.length; i++) {
  const spec = SPRITE_SPECS[i];
  const col = i % COLS;
  const row = Math.floor(i / COLS);
  const x = col * CELL_SIZE;
  const y = row * CELL_SIZE;

  const rawSvg = readFileSync(join(artDir, `${spec.id}.svg`), 'utf8');
  const inner = rawSvg
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^[\s\S]*?<svg[^>]*>/i, '')
    .replace(/<\/svg>\s*$/i, '');

  // Inset by 16 px inside each 512x512 cell so displacement filters never bleed across cell edges
  const pad = 16;
  const innerSize = CELL_SIZE - pad * 2;
  cellsSvg.push(
    `<svg x="${x + pad}" y="${y + pad}" width="${innerSize}" height="${innerSize}" viewBox="0 0 256 256" overflow="hidden">${inner}</svg>`
  );

  spritesMeta[spec.id] = {
    index: i,
    x,
    y,
    w: CELL_SIZE,
    h: CELL_SIZE,
    u0: x / ATLAS_SIZE,
    v0: y / ATLAS_SIZE,
    u1: (x + CELL_SIZE) / ATLAS_SIZE,
    v1: (y + CELL_SIZE) / ATLAS_SIZE,
    anchorX: spec.anchorX,
    anchorY: spec.anchorY,
  };
}

const masterSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${ATLAS_SIZE}" height="${ATLAS_SIZE}" viewBox="0 0 ${ATLAS_SIZE} ${ATLAS_SIZE}">
  <defs>${SVG_DEFS}</defs>
  ${cellsSvg.join('\n  ')}
</svg>`;

const executablePath =
  process.env.CHROMIUM_PATH ??
  ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome'].find(existsSync);
const browser = await chromium.launch({ executablePath });
const page = await browser.newPage();

const { atlasDataUrl, previewDeepUrl, preview64Url } = await page.evaluate(
  async ({ svg, size, quality, specs }) => {
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    const img = new Image();
    img.src = url;
    await img.decode();

    // 1. Transparent RGBA atlas WebP
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(img, 0, 0, size, size);
    const atlasDataUrl = canvas.toDataURL('image/webp', quality);

    // 2. Full preview on --deep (#1E3E5C) background with grid and labels
    const prevCanvas = document.createElement('canvas');
    prevCanvas.width = 1024;
    prevCanvas.height = 768;
    const pctx = prevCanvas.getContext('2d')!;
    pctx.fillStyle = '#1E3E5C';
    pctx.fillRect(0, 0, 1024, 768);
    pctx.drawImage(canvas, 0, 0, 2048, 1536, 0, 0, 1024, 768);
    pctx.strokeStyle = 'rgba(247, 250, 251, 0.25)';
    pctx.lineWidth = 1;
    pctx.font = 'bold 14px sans-serif';
    pctx.fillStyle = '#F3EBDD';
    for (let i = 0; i < specs.length; i++) {
      const c = i % 4;
      const r = Math.floor(i / 4);
      pctx.strokeRect(c * 256, r * 256, 256, 256);
      pctx.fillText(`${i}: ${specs[i].id}`, c * 256 + 10, r * 256 + 22);
    }
    const previewDeepUrl = prevCanvas.toDataURL('image/png');

    // 3. 64 px recognition test strip on --deep (#1E3E5C) and --glacier (#7FA8C4)
    const stripCanvas = document.createElement('canvas');
    stripCanvas.width = specs.length * 88 + 16;
    stripCanvas.height = 200;
    const sctx = stripCanvas.getContext('2d')!;
    sctx.fillStyle = '#1E3E5C';
    sctx.fillRect(0, 0, stripCanvas.width, 100);
    sctx.fillStyle = '#3F6F94';
    sctx.fillRect(0, 100, stripCanvas.width, 100);
    sctx.fillStyle = '#F3EBDD';
    sctx.font = '11px sans-serif';
    for (let i = 0; i < specs.length; i++) {
      const c = i % 4;
      const r = Math.floor(i / 4);
      const sx = c * 512;
      const sy = r * 512;
      const dx = 16 + i * 88;
      sctx.drawImage(canvas, sx, sy, 512, 512, dx, 12, 64, 64);
      sctx.drawImage(canvas, sx, sy, 512, 512, dx, 112, 64, 64);
      sctx.fillText(specs[i].id.slice(0, 11), dx, 92);
    }
    const preview64Url = stripCanvas.toDataURL('image/png');

    URL.revokeObjectURL(url);
    return { atlasDataUrl, previewDeepUrl, preview64Url };
  },
  { svg: masterSvg, size: ATLAS_SIZE, quality: QUALITY, specs: SPRITE_SPECS }
);

await browser.close();

const webpBuf = Buffer.from(atlasDataUrl.split(',')[1], 'base64');
const webpPath = join(outDir, 'sea-atlas.webp');
writeFileSync(webpPath, webpBuf);

const manifest: SeaAtlasManifest = {
  size: ATLAS_SIZE,
  cellSize: CELL_SIZE,
  sprites: spritesMeta,
};
const jsonPath = join(outDir, 'sea-atlas.json');
writeFileSync(jsonPath, JSON.stringify(manifest, null, 2) + '\n');

const scratchDir =
  process.env.SCRATCHPAD_DIR ??
  '/tmp/claude-1000/-home-lk-Proyectos-Antartida3D/1adc844c-cf0e-4f45-90a9-7b2a252061ce/scratchpad';
mkdirSync(scratchDir, { recursive: true });
writeFileSync(
  join(scratchDir, 'sea-atlas-preview-deep.png'),
  Buffer.from(previewDeepUrl.split(',')[1], 'base64')
);
writeFileSync(
  join(scratchDir, 'sea-atlas-preview-64px.png'),
  Buffer.from(preview64Url.split(',')[1], 'base64')
);

console.log(`sea-atlas.webp: ${(webpBuf.length / 1024).toFixed(1)} kB`);
console.log(`sea-atlas.json: ${SPRITE_SPECS.length} sprites`);
