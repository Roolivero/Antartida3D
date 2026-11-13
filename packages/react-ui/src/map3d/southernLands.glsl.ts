import { STEREO_RADIUS, WORLD_LANDS_CLIP_DEG } from '@antartida/core';

/**
 * Natural Earth II color of the near lands outside Antarctica (southern-lands-color.webp), shared by
 * the flat silhouettes and by the Fuegia relief where it fades into them, so both use the same tone.
 */
export const farLandChunk = /* glsl */ `
uniform sampler2D uFarLandTex;
uniform float uHasFarLand;
uniform vec2 uFarLandBoxMin; // world xz of the texture's minX, minY corner
uniform vec2 uFarLandBoxSize;

// Mild saturation and depth boost: the Natural Earth II colors are pale next to the watercolor.
const float FAR_LAND_SAT = 1.25;
const float FAR_LAND_DEEP = 0.94;

vec3 farLandTone(vec3 col) {
  col = mix(vec3(dot(col, vec3(0.299, 0.587, 0.114))), col, FAR_LAND_SAT);
  return clamp(col * FAR_LAND_DEEP, 0.0, 1.0);
}

vec3 farLandColor(vec2 worldXZ) {
  // Texture row 0 is minY and flipY is off, so the uv maps directly.
  return farLandTone(texture2D(uFarLandTex, (worldXZ - uFarLandBoxMin) / uFarLandBoxSize).rgb);
}
`;

export const southernLandsVertexShader = /* glsl */ `
varying vec3 vWorldPos;

void main() {
  vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const southernLandsFragmentShader = /* glsl */ `
precision highp float;

uniform sampler2D uPaperTex;
uniform float uHasPaper;
uniform vec3 uLandColor; // flat fallback until the color textures load
uniform float uFadeStart;
uniform float uFadeEnd;
uniform sampler2D uWorldLandTex;
uniform float uHasWorldLand;
uniform float uNearEdge; // radius from the pole where the texture of the near lands ends

${farLandChunk}

const float STEREO_RADIUS = ${STEREO_RADIUS.toFixed(1)};
const float WORLD_LANDS_CLIP = ${((WORLD_LANDS_CLIP_DEG * Math.PI) / 180).toFixed(6)}; // radians from the South Pole

varying vec3 vWorldPos;

// Color of the rest of the world (world-lands-color.webp). In that texture the distance from the
// center is the angle from the South Pole, up to WORLD_LANDS_CLIP at its edge
// (core/scripts/build-southern-lands-color.ts).
vec3 worldLandColor(vec2 worldXZ) {
  float r = max(length(worldXZ), 1e-3);
  float rho = 2.0 * atan(r / STEREO_RADIUS) / WORLD_LANDS_CLIP;
  return farLandTone(texture2D(uWorldLandTex, 0.5 + 0.5 * rho * worldXZ / r).rgb);
}

void main() {
  float poleDist = length(vWorldPos.xz);
  vec3 nearCol = uHasFarLand > 0.5 ? farLandColor(vWorldPos.xz) : uLandColor;
  vec3 worldCol = uHasWorldLand > 0.5 ? worldLandColor(vWorldPos.xz) : uLandColor;
  vec3 col = mix(nearCol, worldCol, smoothstep(0.9 * uNearEdge, 0.99 * uNearEdge, poleDist));

  if (uHasPaper > 0.5) {
    vec3 paper = texture2D(uPaperTex, gl_FragCoord.xy / 512.0).rgb;
    col = mix(col, col * paper * 1.2, 0.3);
  }

  // The lands dissolve into the sea before the circle where their data is clipped.
  float alpha = 1.0 - smoothstep(uFadeStart, uFadeEnd, poleDist);
  gl_FragColor = vec4(col, alpha);

  // Sampling decodes sRGB to linear; Color(hex) is linear; colorspace chunk encodes output.
  #include <colorspace_fragment>
}
`;
