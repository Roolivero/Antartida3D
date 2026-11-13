/**
 * Shared antialiased periodic line helper for terrain contours, hachures, and ocean isobaths.
 * Returns 1.0 on the line and 0.0 between integer multiples of `coord`.
 */
export const periodicLineChunk = /* glsl */ `
float periodicLine(float coord, float halfWidthPx) {
  float w = fwidth(coord);
  float d = abs(fract(coord + 0.5) - 0.5) / max(w, 1e-5);
  return 1.0 - smoothstep(halfWidthPx - 0.5, halfWidthPx + 0.5, d);
}
`;
