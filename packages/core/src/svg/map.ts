/**
 * The map is two layers:
 * - the watercolor (ocean, ice, halos, graticule, all the painted SVG filters), baked at build time
 *   into WebP by scripts/build-map-raster.ts, so zooming scales a bitmap instead of re-running feTurbulence;
 * - a crisp vector "ink" layer on top (coastline outlines, route, labels), with no filters.
 */

/** Map units of margin baked around 0..1000 (halo and Tierra del Fuego overflow the square). */
export const MAP_RASTER_PAD = 120;
export const MAP_RASTER_SPAN = 1000 + 2 * MAP_RASTER_PAD;

/**
 * `base` (768 px, preloaded from each app's HTML) is the first paint and the LCP element; a sharper one
 * is swapped in while idle: `mid` on small screens (less GPU memory on phones), `hi` on desktop.
 */
export const MAP_RASTER = {
  base: new URL('../assets/map-paint-768.webp', import.meta.url).href,
  mid: new URL('../assets/map-paint-2048.webp', import.meta.url).href,
  hi: new URL('../assets/map-paint-4096.webp', import.meta.url).href,
};


/** Baked watercolor for the 3D terrain and ocean (no glacier strokes). Same box as MAP_RASTER. */
export const MAP_RASTER_3D = {
  mid: new URL('../assets/map-paint-3d-2048.webp', import.meta.url).href,
  hi: new URL('../assets/map-paint-3d-4096.webp', import.meta.url).href,
};

/** Box of the baked image inside the 0..1000 map layer, as CSS percentages. */
export const MAP_RASTER_BOX = {
  left: `${(-MAP_RASTER_PAD / 1000) * 100}%`,
  top: `${(-MAP_RASTER_PAD / 1000) * 100}%`,
  width: `${(MAP_RASTER_SPAN / 1000) * 100}%`,
  height: `${(MAP_RASTER_SPAN / 1000) * 100}%`,
};

/** Cheap filter-free ocean shown until the image arrives (uses the shared #ocean gradient). */
export const MAP_PLACEHOLDER = `<circle cx="500" cy="505" r="548" fill="url(#ocean)" opacity="0.94"></circle>`;

/** Vector ink layer (~10 kB gzip of coastline), loaded on demand. */
export const loadMapInk = (): Promise<string> => import('./land.ts').then((m) => m.MAP_INK);

/**
 * Loads the sharp image during idle time after the first paint and calls `onReady` once it is decoded.
 * Swapping (and uploading 64 MB of texture) mid-zoom caused an ~80 ms hitch; doing it while idle keeps
 * every zoom smooth. Skipped on Save-Data or slow connections. Returns a cancel function.
 */
export function loadHiResWhenIdle(onReady: (url: string) => void): () => void {
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (conn?.saveData || /(^|-)2g|3g/.test(conn?.effectiveType ?? '')) return () => {};
  let alive = true;
  const start = () => {
    const img = new Image();
    const url = window.innerWidth < 820 ? MAP_RASTER.mid : MAP_RASTER.hi;
    img.src = url;
    img.decode().then(() => alive && onReady(url), () => {});
  };
  const idle = window.requestIdleCallback
    ? window.requestIdleCallback(start, { timeout: 4000 })
    : window.setTimeout(start, 1500);
  return () => {
    alive = false;
    if (window.cancelIdleCallback) window.cancelIdleCallback(idle);
    else window.clearTimeout(idle);
  };
}
