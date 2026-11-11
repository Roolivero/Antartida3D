/** Map-to-expedition transition timings (ms), as in the prototype. */
export const DIVE_MS = 1500;
export const FADE_MS = 550;
export const RETURN_MS = 720;
export const ZOOM_MS = 470;
export const TOAST_MS = 4200;

export const returnToast = (title: string, explored: number, total: number) =>
  `${title} quedó explorado. Registro de exploración: ${explored}/${total}`;

export function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}
