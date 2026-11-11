/**
 * Generates two seamless, tileable 256x256 ocean wave normal textures:
 * - packages/core/src/assets/ocean-waves-a-256.webp
 * - packages/core/src/assets/ocean-waves-b-256.webp
 *
 * Uses periodic Fourier wave harmonics (integer wavevectors on the 256x256 torus)
 * combined with tileable multi-octave value noise so RepeatWrapping has zero seams.
 * RGB encodes the tangent-space surface normal (nx, ny, nz), and A encodes a
 * tileable brushstroke/wave-crest mask.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '../src/assets');
mkdirSync(outDir, { recursive: true });

const SIZE = 256;

// Deterministic PRNG (Mulberry32)
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Tileable 2D value noise with integer period P
function makeTileableNoise(period: number, seed: number): (u: number, v: number) => number {
  const rand = mulberry32(seed);
  const grid = new Float32Array(period * period);
  for (let i = 0; i < grid.length; i++) {
    grid[i] = rand();
  }
  return (u: number, v: number) => {
    const x = ((u * period) % period + period) % period;
    const y = ((v * period) % period + period) % period;
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = (x0 + 1) % period;
    const y1 = (y0 + 1) % period;
    const fx = x - x0;
    const fy = y - y0;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const v00 = grid[y0 * period + x0];
    const v10 = grid[y0 * period + x1];
    const v01 = grid[y1 * period + x0];
    const v11 = grid[y1 * period + x1];
    const top = v00 + (v10 - v00) * sx;
    const bot = v01 + (v11 - v01) * sx;
    return top + (bot - top) * sy;
  };
}

function generateWaveNormalMap(seed: number, primaryAngleRad: number): Buffer {
  const rand = mulberry32(seed);
  const n1 = makeTileableNoise(8, seed + 101);
  const n2 = makeTileableNoise(16, seed + 202);
  const n3 = makeTileableNoise(32, seed + 303);

  interface WaveComponent {
    kx: number;
    ky: number;
    amp: number;
    phase: number;
  }

  const components: WaveComponent[] = [];
  const numWaves = 44;
  for (let i = 0; i < numWaves; i++) {
    // Spread angles widely around primary swell direction to avoid any grid alignment
    const angleSpread = (rand() - 0.5) * 1.85;
    const angle = primaryAngleRad + angleSpread;
    const freq = 5 + Math.floor(Math.pow(rand(), 1.2) * 18); // integer frequency 5..22 (no low-freq tile blobs)
    const kx = Math.round(Math.cos(angle) * freq);
    const ky = Math.round(Math.sin(angle) * freq);
    const kLen = Math.hypot(kx, ky);
    if (kLen < 4) continue;
    const amp = 0.28 / Math.pow(kLen, 1.1);
    const phase = rand() * Math.PI * 2;
    components.push({ kx, ky, amp, phase });
  }

  const heightField = new Float32Array(SIZE * SIZE);
  const brushField = new Float32Array(SIZE * SIZE);

  for (let y = 0; y < SIZE; y++) {
    const v = y / SIZE;
    for (let x = 0; x < SIZE; x++) {
      const u = x / SIZE;
      let h = 0;
      for (let i = 0; i < components.length; i++) {
        const c = components[i];
        const theta = 2 * Math.PI * (c.kx * u + c.ky * v) + c.phase;
        // Slightly sharpened wave crests
        const s = Math.sin(theta);
        h += c.amp * (s + 0.22 * Math.sin(2 * theta));
      }

      // Add multi-octave tileable noise for organic hand-painted water surface
      const fbm =
        0.55 * (n1(u, v) - 0.5) +
        0.30 * (n2(u, v) - 0.5) +
        0.15 * (n3(u, v) - 0.5);
      h += fbm * 0.45;

      heightField[y * SIZE + x] = h;
      brushField[y * SIZE + x] = Math.min(1, Math.max(0, 0.5 + fbm * 1.1));
    }
  }

  const rgba = Buffer.alloc(SIZE * SIZE * 4);
  const strength = 1.6 * SIZE * 0.04;

  for (let y = 0; y < SIZE; y++) {
    const yPrev = ((y - 1 + SIZE) % SIZE) * SIZE;
    const yNext = ((y + 1) % SIZE) * SIZE;
    const yRow = y * SIZE;

    for (let x = 0; x < SIZE; x++) {
      const xPrev = (x - 1 + SIZE) % SIZE;
      const xNext = (x + 1) % SIZE;

      const dhdx = (heightField[yRow + xNext] - heightField[yRow + xPrev]) * 0.5 * strength;
      const dhdy = (heightField[yNext + x] - heightField[yPrev + x]) * 0.5 * strength;

      const nx = -dhdx;
      const ny = -dhdy;
      const nz = 1.0;
      const len = Math.hypot(nx, ny, nz);

      const idx = (yRow + x) * 4;
      rgba[idx] = Math.min(255, Math.max(0, Math.round(((nx / len) * 0.5 + 0.5) * 255)));
      rgba[idx + 1] = Math.min(255, Math.max(0, Math.round(((ny / len) * 0.5 + 0.5) * 255)));
      rgba[idx + 2] = Math.min(255, Math.max(0, Math.round(((nz / len) * 0.5 + 0.5) * 255)));
      rgba[idx + 3] = Math.min(255, Math.max(0, Math.round(brushField[yRow + x] * 255)));
    }
  }

  return rgba;
}

const rawA = generateWaveNormalMap(1337, 0.35);
const rawB = generateWaveNormalMap(7331, 1.42);

const bufA = await sharp(rawA, { raw: { width: SIZE, height: SIZE, channels: 4 } })
  .webp({ quality: 92 })
  .toBuffer();
const pathA = join(outDir, 'ocean-waves-a-256.webp');
writeFileSync(pathA, bufA);
console.log(`ocean-waves-a-256.webp: ${(bufA.length / 1024).toFixed(1)} kB`);

const bufB = await sharp(rawB, { raw: { width: SIZE, height: SIZE, channels: 4 } })
  .webp({ quality: 92 })
  .toBuffer();
const pathB = join(outDir, 'ocean-waves-b-256.webp');
writeFileSync(pathB, bufB);
console.log(`ocean-waves-b-256.webp: ${(bufB.length / 1024).toFixed(1)} kB`);
