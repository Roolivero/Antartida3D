/**
 * Shared fog function for terrain and ocean shaders.
 * Blends towards paper color based on horizontal camera distance relative to camera height.
 */
export const FOG_COLOR_HEX = '#F3EBDD';

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

export const fogParsChunk = /* glsl */ `
uniform vec3 uFogColor;
uniform float uFogDensity;

/**
 * Computes smoothstep fog factor blending towards paper color.
 * Based on horizontal camera distance, ensuring the entire map area (|x|, |z| <= 620)
 * stays clear (fog < 0.05) from home, top-down and oblique poses, while reaching full fog
 * before the edge of the ocean plane (OCEAN_SIZE/2 = 10000).
 */
float computeFogFactor(vec3 worldPos) {
  vec2 dXZ = worldPos.xz - cameraPosition.xz;
  float distXZ = length(dXZ);
  float camY = max(cameraPosition.y, 10.0);
  float onset = 700.0 + 2.2 * camY;
  float full = min(9000.0, onset * 2.8);
  return smoothstep(onset, full, distXZ);
}
`;
