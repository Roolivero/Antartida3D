import { fogParsChunk } from './fog.glsl.ts';

/**
 * Natural Earth II color of the lands outside Antarctica (southern-lands-color.webp), shared by the
 * flat silhouettes and by the Fuegia relief where it fades into them, so both use the same tone.
 */
export const farLandChunk = /* glsl */ `
uniform sampler2D uFarLandTex;
uniform float uHasFarLand;
uniform vec2 uFarLandBoxMin; // world xz of the texture's minX, minY corner
uniform vec2 uFarLandBoxSize;

// Mild saturation and depth boost: the Natural Earth II colors are pale next to the watercolor.
const float FAR_LAND_SAT = 1.25;
const float FAR_LAND_DEEP = 0.94;

vec3 farLandColor(vec2 worldXZ) {
  // Texture row 0 is minY and flipY is off, so the uv maps directly.
  vec3 col = texture2D(uFarLandTex, (worldXZ - uFarLandBoxMin) / uFarLandBoxSize).rgb;
  col = mix(vec3(dot(col, vec3(0.299, 0.587, 0.114))), col, FAR_LAND_SAT);
  return clamp(col * FAR_LAND_DEEP, 0.0, 1.0);
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
uniform vec3 uLandColor; // flat fallback until the color texture loads
uniform float uFadeStart;
uniform float uFadeEnd;

${fogParsChunk}
${farLandChunk}

varying vec3 vWorldPos;

void main() {
  vec3 col = uHasFarLand > 0.5 ? farLandColor(vWorldPos.xz) : uLandColor;

  if (uHasPaper > 0.5) {
    vec3 paper = texture2D(uPaperTex, gl_FragCoord.xy / 512.0).rgb;
    col = mix(col, col * paper * 1.2, 0.3);
  }

  col = mix(col, uFogColor, computeFogFactor(vWorldPos));

  float alpha = 1.0 - smoothstep(uFadeStart, uFadeEnd, length(vWorldPos.xz));
  gl_FragColor = vec4(col, alpha);

  // Sampling decodes sRGB to linear; Color(hex) is linear; colorspace chunk encodes output.
  #include <colorspace_fragment>
}
`;
