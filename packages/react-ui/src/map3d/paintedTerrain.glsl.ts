import { fogParsChunk, periodicLineChunk } from './fog.glsl.ts';

export const paintedTerrainVertexShader = /* glsl */ `
uniform vec4 uBounds; // minX, maxX, minY, maxY
uniform float uVerticalExaggeration;

attribute float aHeight;
attribute float aMask;

varying vec2 vMapUV;
varying vec2 vTerrainUV;
varying float vHeight;
varying float vMask;
varying vec3 vWorldPos;

const float MAP_PAD = 120.0;
const float MAP_SPAN = 1240.0;

void main() {
  vHeight = aHeight;
  vMask = aMask;

  float mapX = position.x + 500.0;
  float mapY = position.z + 500.0;

  vTerrainUV = vec2(
    (mapX - uBounds.x) / (uBounds.y - uBounds.x),
    (mapY - uBounds.z) / (uBounds.w - uBounds.z)
  );

  vMapUV = vec2(
    (mapX + MAP_PAD) / MAP_SPAN,
    (mapY + MAP_PAD) / MAP_SPAN
  );

  vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const paintedTerrainFragmentShader = /* glsl */ `
precision highp float;

uniform sampler2D uPaintTex;
uniform sampler2D uReliefTex;
uniform sampler2D uLightTex;
uniform sampler2D uPaperTex;
uniform vec3 uSunDir;
uniform float uContour;

${fogParsChunk}

varying vec2 vMapUV;
varying vec2 vTerrainUV;
varying float vHeight;
varying float vMask;
varying vec3 vWorldPos;

// Palette from tokens.css: --deep, --pencil.
const vec3 DEEP = vec3(0.118, 0.243, 0.361);
const vec3 PENCIL = vec3(0.369, 0.396, 0.424);

${periodicLineChunk}

void main() {
  // Discard border triangles with interpolated ocean mask and sea level height (~0)
  // so the ocean underneath renders cleanly without watercolor border artifacts.
  if (vMask < 0.5 && vHeight < 5.0) {
    discard;
  }

  // 1. Base color: the same baked watercolor as the 2D map.
  vec3 col = texture2D(uPaintTex, vMapUV).rgb;
  if (vMask > 3.5) {
    col = mix(col, vec3(0.62, 0.52, 0.42), 0.55); // exposed rock: warm grey-brown wash
  } else if (vMask > 2.5) {
    col = mix(col, vec3(0.86, 0.92, 0.96), 0.35); // floating ice shelf: light cyan
  }

  // 2. Relief: baked normal (RGB) plus ambient occlusion (R) and sun shadow (G).
  vec3 n = normalize(texture2D(uReliefTex, vTerrainUV).rgb * 2.0 - 1.0);
  vec3 normal = normalize(vec3(n.x, n.z, n.y));
  vec2 light = texture2D(uLightTex, vTerrainUV).rg;
  float ao = light.r;
  float shadow = light.g;

  // Raking NW sun plus soft W and N fills (multi-directional hillshade), relative to flat ground
  // so the plateau keeps its watercolor tone and only slopes get lighter or darker.
  vec3 fillW = normalize(vec3(-0.82, 0.57, 0.0));
  vec3 fillN = normalize(vec3(0.0, 0.57, -0.82));
  float direct = max(dot(normal, uSunDir), 0.0) * mix(0.35, 1.0, shadow);
  float lit = 0.7 * direct + 0.15 * max(dot(normal, fillW), 0.0) + 0.15 * max(dot(normal, fillN), 0.0);
  float flatLit = 0.7 * uSunDir.y + 0.3 * 0.57; // "flat" is reserved in GLSL 3
  float L = (lit / flatLit) * mix(1.0, ao, 0.85);
  // The ice sheet is gentle (a few degrees even at x50): stretch the tones around flat ground.
  L = 1.0 + (L - 1.0) * 1.7;

  // Hypsometric tint on ice: low coastal ice greyer and cooler, the high plateau brighter.
  // It is what lets the eye read the dome of East Antarctica.
  if (vMask < 3.5) {
    float e = smoothstep(0.0, 3800.0, vHeight);
    col *= mix(vec3(0.82, 0.87, 0.93), vec3(1.03, 1.02, 1.0), e);
  }

  // Painted shading: shadows pool as cool blue pigment, lit slopes warm up slightly.
  float dark = clamp(1.0 - L, 0.0, 1.0);
  col = mix(col, col * mix(vec3(1.0), DEEP * 1.6 + 0.12, 0.85), smoothstep(0.0, 0.9, dark));
  col += vec3(0.05, 0.04, 0.02) * clamp(L - 1.0, 0.0, 1.0);

  // 3. Hachures: strokes following the fall line on the shaded side of steep slopes.
  vec2 grad = n.xy;
  float slope = length(grad);
  if (slope > 0.02) {
    vec2 across = vec2(-grad.y, grad.x) / slope;
    float coord = dot(vWorldPos.xz, across) * 2.2;
    float density = fwidth(coord);
    float fade = 1.0 - smoothstep(0.25, 0.5, density); // drop strokes before they alias into grey
    float strength = smoothstep(0.03, 0.3, slope) * smoothstep(0.15, 0.8, dark) * fade;
    col = mix(col, col * PENCIL * 1.4, periodicLine(coord, 0.6) * strength * 0.55);
  }

  float camDist = length(cameraPosition - vWorldPos);

  // 4. Contours: a faint pencil aid that only appears when zoomed in, where it helps read altitude.
  // From afar the shading already tells the shape and the lines would only cover it.
  float contourFade = 1.0 - smoothstep(260.0, 480.0, camDist);
  if (vHeight > 20.0 && contourFade > 0.0) {
    float minor = periodicLine(vHeight / uContour, 0.4);
    float major = periodicLine(vHeight / (uContour * 4.0), 0.55);
    col = mix(col, PENCIL, max(minor * 0.16, major * 0.26) * contourFade);
  }

  // 5. Ice sheen: a soft sun glint on the smooth ice, never on rock or in shadow.
  if (vMask < 3.5) {
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float spec = pow(max(dot(normal, normalize(uSunDir + viewDir)), 0.0), 48.0);
    col += vec3(1.0, 0.98, 0.94) * spec * 0.14 * shadow * (vMask > 2.5 ? 1.6 : 1.0);
  }

  // 6. Exponential fog towards paper color (matching ocean shader)
  float fog = computeFogFactor(vWorldPos);
  col = mix(col, uFogColor, fog);

  // 7. Paper grain, fixed to the screen like the 2D grain overlay.
  vec3 paper = texture2D(uPaperTex, gl_FragCoord.xy / 512.0).rgb;
  col = mix(col, col * paper * 1.2, 0.3);

  gl_FragColor = vec4(col, 1.0);
  // Shading is done in linear space (sRGB textures decode on sampling). Encode for the screen
  // when drawing straight to it; into the post-processing buffer this is a no-op.
  #include <colorspace_fragment>
}
`;
