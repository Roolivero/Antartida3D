import { MAP_RASTER_PAD, MAP_RASTER_SPAN } from '@antartida/core';
import { fogParsChunk, periodicLineChunk } from './fog.glsl.ts';

export const oceanVertexShader = /* glsl */ `
varying vec2 vMapUV;
varying vec3 vWorldPos;

const float MAP_PAD = float(${MAP_RASTER_PAD});
const float MAP_SPAN = float(${MAP_RASTER_SPAN});

void main() {
  vec4 world4 = modelMatrix * vec4(position, 1.0);
  vWorldPos = world4.xyz;

  // In polar stereographic map space:
  // mapX = world.x + 500.0, mapY = world.z + 500.0
  float mapX = world4.x + 500.0;
  float mapY = world4.z + 500.0;

  vMapUV = vec2(
    (mapX + MAP_PAD) / MAP_SPAN,
    (mapY + MAP_PAD) / MAP_SPAN
  );

  gl_Position = projectionMatrix * viewMatrix * world4;
}
`;

export const oceanFragmentShader = /* glsl */ `
precision highp float;

uniform sampler2D uBathy;
uniform sampler2D uPaperTex;
uniform sampler2D uWaveNormA;
uniform sampler2D uWaveNormB;
uniform vec3 uSunDir;
uniform float uTime;

// One uniform per layer (in plan order) for independent artistic tuning:
uniform float uAbsorb;             // 1. Depth absorption coefficient (DEPTH_ABSORB)
uniform float uShelfShading;       // 1b. Seabed normal shading visibility on shallow shelf
uniform float uWashStrength;       // 2. Watercolor low-frequency wash & slope puddle edges
uniform float uWaveStrength;       // 3. Dual animated wave normal perturbation
uniform float uFresnelStrength;    // 4. Low-angle sky reflection (Fresnel)
uniform float uSunGlintStrength;   // 5. Brushstroke-masked solar specular glint
uniform float uInkWavesStrength;   // 6. Nautical chart "~" ink wave marks in open sea
uniform float uIsobarsStrength;    // 7. Pencil isobaths every 500 m and 2000 m when zoomed in
uniform float uFoamStrength;       // 8. Animated coastal & ice-shelf barrier surf foam
uniform float uPaperGrainStrength; // 9. Screen-space paper grain overlay

${fogParsChunk}
${periodicLineChunk}

varying vec2 vMapUV;
varying vec3 vWorldPos;

// Palette from packages/core/src/styles/tokens.css (in sRGB 0..1):
// --paper:   #F3EBDD -> vec3(0.953, 0.922, 0.867)
// --ink:     #1F2A36 -> vec3(0.122, 0.165, 0.212)
// --deep:    #1E3E5C -> vec3(0.118, 0.243, 0.361)
// --glacier: #7FA8C4 -> vec3(0.498, 0.659, 0.769)
// --ice:     #F7FAFB -> vec3(0.969, 0.980, 0.984)
// --pencil:  #5E656C -> vec3(0.369, 0.396, 0.424)
const vec3 PAPER_SRGB = vec3(0.953, 0.922, 0.867);
const vec3 INK        = vec3(0.122, 0.165, 0.212);
const vec3 DEEP       = vec3(0.118, 0.243, 0.361);
const vec3 GLACIER    = vec3(0.498, 0.659, 0.769);
const vec3 ICE        = vec3(0.969, 0.980, 0.984);
const vec3 PENCIL     = vec3(0.369, 0.396, 0.424);

// Continental shelf water: --glacier lightened slightly toward --ice with a subtle green-teal
// shift, staying distinctly darker and more aquatic than the white/cyan continental ice.
const vec3 SHALLOW = vec3(0.530, 0.725, 0.795);
// Mid-depth water (outer shelf & continental slope): --glacier toned toward --deep (#3F6F94).
const vec3 MID     = vec3(0.265, 0.445, 0.590);
// Deep abyssal basins: --deep (#1E3E5C) with outer ring richness matching 2D #ocean gradient.
const vec3 ABYSS   = vec3(0.125, 0.252, 0.378);

// Converts perceptual sRGB color to Linear-sRGB for Three.js WebGLRenderer output pipeline
vec3 srgbToLinear(vec3 srgb) {
  return pow(clamp(srgb, 0.0, 1.0), vec3(2.2));
}

// Fast deterministic 2D hash in world space (no loops, zero textures)
vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}

// Smooth 2D value noise for watercolor wash and organic shoreline perturbation
float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash22(i).x;
  float b = hash22(i + vec2(1.0, 0.0)).x;
  float c = hash22(i + vec2(0.0, 1.0)).x;
  float d = hash22(i + vec2(1.0, 1.0)).x;
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

void main() {
  // Sample 1: Bathymetry RGBA (R = sqrt(depth/6000), G,B = seabed normal, A = coast distance)
  vec2 clampedUV = clamp(vMapUV, 0.0, 1.0);
  vec4 bathySample = texture2D(uBathy, clampedUV);

  float rNorm = bathySample.r;
  float sampledDepth = rNorm * rNorm * 6000.0;

  // Circular radial distance from the South Pole (world origin = map (500, 500)).
  // Smoothly blends toward the 4000 m abyssal fill before reaching the square UV edge (r = 620),
  // matching the circular 2D vignette and preventing any horizontal/vertical UV border cuts.
  float poleDist = length(vWorldPos.xz);
  float edgeFactor = smoothstep(545.0, 608.0, poleDist);
  float depthMeters = mix(sampledDepth, 4000.0, edgeFactor);
  float coastDist = mix(bathySample.a * 12.0, 12.0, edgeFactor);

  // ---------------------------------------------------------------------------
  // 1. Depth absorption (Beer-Lambert 1 - exp(-d * k)) & shallow seabed shading
  // ---------------------------------------------------------------------------
  vec2 sbXY = (bathySample.gb * 2.0 - 1.0) * (1.0 - edgeFactor);
  vec3 seabedNormal = normalize(vec3(sbXY.x, 1.0, sbXY.y));
  float seabedLit = max(dot(seabedNormal, uSunDir), 0.0) / max(uSunDir.y, 0.25);
  float shelfVis = exp(-depthMeters * 0.0014) * uShelfShading;
  float seabedShade = clamp(1.0 + (seabedLit - 1.0) * 0.85 * shelfVis, 0.72, 1.20);
  vec3 shelfCol = SHALLOW * seabedShade;
  // Cool blue pigment in shaded submarine canyons/troughs on the shelf
  float troughDark = clamp(1.0 - seabedLit, 0.0, 1.0) * shelfVis;
  shelfCol = mix(shelfCol, mix(MID, DEEP, 0.5), troughDark * 0.55);

  // Two-stage exponential absorption in perceptual sRGB space (matching SVG #ocean gradient):
  // - Shelf (0..550 m): SHALLOW (with seabed relief) -> MID
  // - Slope to abyssal basin (300..4200 m): MID -> ABYSS (--deep)
  float absorbShelf = 1.0 - exp(-depthMeters * (uAbsorb * 0.95));
  float absorbDeep  = 1.0 - exp(-max(depthMeters - 280.0, 0.0) * (uAbsorb * 0.34));
  vec3 waterCol = mix(shelfCol, MID, absorbShelf);
  waterCol = mix(waterCol, ABYSS, absorbDeep);

  // ---------------------------------------------------------------------------
  // 2. Watercolor wash (low-frequency mottling + dark puddle rims on the slope)
  // ---------------------------------------------------------------------------
  // Sample 2: World-space paper texture at low frequency for watercolor granulation
  vec3 worldPaper = pow(clamp(texture2D(uPaperTex, vWorldPos.xz / 320.0).rgb, 0.0, 1.0), vec3(1.0 / 2.2));
  float lowNoise = valueNoise(vWorldPos.xz * 0.0055) * 0.65 + valueNoise(vWorldPos.xz * 0.014) * 0.35;
  float washMottle = (worldPaper.r - 0.72) * 0.45 + (lowNoise - 0.5) * 0.55;
  waterCol *= 1.0 + washMottle * 0.18 * uWashStrength;
  // Subtle pigment pooling across broad watercolor washes
  waterCol = mix(waterCol, mix(waterCol, DEEP, 0.28), smoothstep(0.04, 0.36, -washMottle) * 0.40 * uWashStrength);

  // Dark watercolor "puddle" edge along the continental slope where depth changes steeply
  float depthGrad = length(vec2(dFdx(depthMeters), dFdy(depthMeters))) / max(length(fwidth(vWorldPos.xz)), 0.08);
  float slopeIntensity = max(smoothstep(0.06, 0.36, length(sbXY)), smoothstep(15.0, 80.0, depthGrad));
  float slopeBand = smoothstep(160.0, 540.0, depthMeters) * (1.0 - smoothstep(2500.0, 3800.0, depthMeters));
  float puddleEdge = slopeIntensity * slopeBand * (0.65 + 0.65 * lowNoise) * (1.0 - edgeFactor);
  waterCol = mix(waterCol, waterCol * 0.76 + DEEP * 0.08, puddleEdge * 0.55 * uWashStrength);

  // ---------------------------------------------------------------------------
  // 3. Wave normal maps (two repeatable noise textures scrolled with uTime)
  //    Domain-warped by low-frequency noise and rotated to prevent any grid pattern.
  //    Used ONLY for Fresnel (layer 4) and sun glint (layer 5), never base color.
  // ---------------------------------------------------------------------------
  float camDist = length(cameraPosition - vWorldPos);
  vec2 warp = vec2(lowNoise - 0.5, worldPaper.g - 0.7) * 0.55;
  vec2 waveUvA = vWorldPos.xz * 0.022 + warp + vec2(0.018, 0.009) * uTime;
  vec2 rotXZ = vec2(
    0.8 * vWorldPos.x - 0.6 * vWorldPos.z,
    0.6 * vWorldPos.x + 0.8 * vWorldPos.z
  );
  vec2 waveUvB = rotXZ * 0.031 - warp * 0.8 + vec2(-0.014, 0.016) * uTime;
  // Samples 3 & 4: Dual wave normals (RGB) + tileable brushstroke mask (A)
  vec4 waveSampleA = texture2D(uWaveNormA, waveUvA);
  vec4 waveSampleB = texture2D(uWaveNormB, waveUvB);
  vec3 wnA = waveSampleA.rgb * 2.0 - 1.0;
  vec3 wnB = waveSampleB.rgb * 2.0 - 1.0;
  // Fade wave normal perturbation in the far distance to prevent horizon Moire/corduroy
  float waveDistFade = 1.0 - smoothstep(280.0, 850.0, camDist);
  float effWaveStrength = uWaveStrength * (0.18 + 0.82 * waveDistFade);
  vec3 waveNormal = normalize(vec3(
    (wnA.x + wnB.x) * effWaveStrength,
    1.0,
    (wnA.y + wnB.y) * effWaveStrength
  ));

  // ---------------------------------------------------------------------------
  // 4. Fresnel & pale sky reflection (stronger at low grazing angles, zero top-down)
  // ---------------------------------------------------------------------------
  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  float nDotV = clamp(dot(waveNormal, viewDir), 0.0, 1.0);
  // Zero out vertical view contribution so cenital (0 deg) preserves deep watercolor
  float grazing = smoothstep(0.22, 0.72, 1.0 - viewDir.y);
  float fresnel = pow(1.0 - nDotV, 3.8) * grazing;
  vec3 skyCol = mix(GLACIER, mix(ICE, PAPER_SRGB, 0.55), 0.60);
  waterCol = mix(waterCol, skyCol, fresnel * uFresnelStrength);

  // ---------------------------------------------------------------------------
  // 5. Solar specular glint cut into hand-painted brushstrokes by noise mask
  // ---------------------------------------------------------------------------
  vec3 halfVec = normalize(uSunDir + viewDir);
  float specRaw = pow(max(dot(waveNormal, halfVec), 0.0), 72.0) * grazing;
  float brushNoise = mix(waveSampleA.a, waveSampleB.a, 0.5) * 0.60 + lowNoise * 0.40;
  float brushCut = smoothstep(0.52, 0.68, brushNoise);
  float glint = smoothstep(0.08, 0.36, specRaw * (0.5 + 0.9 * brushCut)) * brushCut;
  vec3 glintCol = mix(ICE, PAPER_SRGB, 0.25);
  waterCol = mix(waterCol, glintCol, glint * uSunGlintStrength);

  // ---------------------------------------------------------------------------
  // 6. Nautical chart "~" ink wave marks in open ocean (world space, fwidth fade)
  // ---------------------------------------------------------------------------
  vec2 waveGrid = vWorldPos.xz / 15.0;
  float gridFw = fwidth(waveGrid.x);
  float inkWaveZoomFade = (1.0 - smoothstep(0.018, 0.036, gridFw)) * (1.0 - smoothstep(320.0, 620.0, camDist));
  if (inkWaveZoomFade > 0.001 && coastDist > 1.8) {
    vec2 cellId = floor(waveGrid);
    vec2 cellUv = fract(waveGrid) - 0.5;
    vec2 h = hash22(cellId);
    if (h.x < 0.42) {
      vec2 p = cellUv - (h - 0.5) * 0.36;
      float ang = (h.y - 0.5) * 0.32;
      float ca = cos(ang), sa = sin(ang);
      p = vec2(ca * p.x - sa * p.y, sa * p.x + ca * p.y);
      vec2 sp = p * vec2(2.6, 4.6);
      if (abs(sp.x) < 1.0) {
        float tildeY = 0.30 * sin(sp.x * 3.14159) * (1.0 - 0.20 * sp.x * sp.x);
        float fwY = max(fwidth(sp.y), 1e-3);
        float endTaper = smoothstep(1.0, 0.45, abs(sp.x));
        float halfW = 1.05 * endTaper;
        float distPx = abs(sp.y - tildeY) / fwY;
        float stroke = 1.0 - smoothstep(halfW - 0.45, halfW + 0.55, distPx);

        float phase = 0.5 + 0.5 * sin(uTime * 0.65 + h.x * 37.0 + h.y * 23.0);
        float timeVis = smoothstep(0.10, 0.52, phase);
        float openWater = smoothstep(1.8, 3.2, coastDist);

        // Dark --ink stroke with a subtle pale highlight along the upper crest
        vec3 markCol = mix(INK * 0.75, mix(GLACIER, ICE, 0.72), step(sp.y, tildeY) * 0.50);
        waterCol = mix(waterCol, markCol, stroke * inkWaveZoomFade * timeVis * openWater * uInkWavesStrength);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 7. Pencil isobaths every 500 m and 2000 m when zoomed in (same contourFade as Terrain)
  // ---------------------------------------------------------------------------
  float contourFade = (1.0 - smoothstep(260.0, 480.0, camDist)) * (1.0 - edgeFactor);
  if (depthMeters > 80.0 && contourFade > 0.001) {
    float coord500 = depthMeters / 500.0;
    float gradGuard = smoothstep(0.0004, 0.0025, fwidth(coord500));
    float minorIso = periodicLine(coord500, 0.50);
    float majorIso = periodicLine(depthMeters / 2000.0, 0.78);
    float isoStrength = max(minorIso * 0.38, majorIso * 0.62) * gradGuard * contourFade * uIsobarsStrength;
    // Dark pencil on bright shallow shelf; pale etched slate line on dark deep slope for contrast
    vec3 isoCol = mix(mix(PENCIL, INK, 0.65), mix(GLACIER, ICE, 0.50), smoothstep(850.0, 2000.0, depthMeters) * 0.65);
    waterCol = mix(waterCol, isoCol, isoStrength);
  }

  // ---------------------------------------------------------------------------
  // 8. Coastal and ice-shelf barrier surf foam (channel A + noise + uTime)
  //    Paper-white bands hugging the shore (< 1.4 map units) with a soft ink rim
  // ---------------------------------------------------------------------------
  if (coastDist < 1.65 && edgeFactor < 0.99) {
    float hfNoise = (valueNoise(vWorldPos.xz * 0.45) - 0.5) * 0.32
                  + (valueNoise(vWorldPos.xz * 1.15) - 0.5) * 0.18;
    float dCoast = max(0.0, coastDist + hfNoise * smoothstep(0.0, 0.8, coastDist));

    float shoreBand = 1.0 - smoothstep(0.14, 0.58 + 0.10 * sin(uTime * 1.4 + lowNoise * 6.28), dCoast);

    float wavePhase = dCoast * 2.2 + uTime * 0.70 + hfNoise * 1.2;
    float alongBreak = smoothstep(0.32, 0.65, valueNoise(vWorldPos.xz * 0.22 + vec2(uTime * 0.05, 0.0)));
    float ribbon = smoothstep(0.52, 0.88, sin(wavePhase * 6.28318))
      * smoothstep(0.22, 0.50, dCoast)
      * (1.0 - smoothstep(0.85, 1.38, dCoast))
      * alongBreak;

    float validWater = smoothstep(0.0, 0.012, rNorm);
    float foam = clamp(shoreBand + ribbon * 0.85, 0.0, 1.0) * validWater * (1.0 - edgeFactor);

    float inkRim = smoothstep(0.06, 0.26, foam) * (1.0 - smoothstep(0.26, 0.56, foam));
    float foamBody = smoothstep(0.22, 0.58, foam);
    vec3 foamPaperWhite = mix(PAPER_SRGB, ICE, 0.65);

    waterCol = mix(waterCol, INK, inkRim * 0.62 * uFoamStrength);
    waterCol = mix(waterCol, foamPaperWhite, foamBody * 0.92 * uFoamStrength);
  }

  // ---------------------------------------------------------------------------
  // 9. Exponential distance fog towards paper + screen-space paper grain (matching Terrain)
  // ---------------------------------------------------------------------------
  // Convert perceptual sRGB watercolor to Linear-sRGB for Three.js output pipeline,
  // then apply screen-space paper grain and blend with linear uFogColor.
  vec3 waterLinear = srgbToLinear(waterCol);
  vec3 screenPaper = texture2D(uPaperTex, gl_FragCoord.xy / 512.0).rgb;
  waterLinear = mix(waterLinear, waterLinear * screenPaper * 1.18, uPaperGrainStrength);

  float fog = computeFogFactor(vWorldPos);
  vec3 finalCol = mix(waterLinear, uFogColor, fog);

  gl_FragColor = vec4(finalCol, 1.0);
  // Shading is done in linear space (sRGB textures decode on sampling). Encode for the screen
  // when drawing straight to it; into the post-processing buffer this is a no-op.
  #include <colorspace_fragment>
}
`;
