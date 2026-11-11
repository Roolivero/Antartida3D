import { fogParsChunk, periodicLineChunk } from './fog.glsl.ts';

export const paintedTerrainVertexShader = /* glsl */ `
uniform vec4 uBounds; // minX, maxX, minY, maxY
uniform float uVerticalExaggeration;

attribute float aHeight;
attribute float aMask;
attribute float aShelf;

varying vec2 vMapUV;
varying vec2 vTerrainUV;
varying float vHeight;
varying float vMask;
varying float vShelf;
varying vec3 vWorldPos;
varying vec2 vGeomSlope;

const float MAP_PAD = 120.0;
const float MAP_SPAN = 1240.0;

void main() {
  vHeight = aHeight;
  vMask = aMask;
  vShelf = aShelf;
  vGeomSlope = normal.xz;

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
varying float vShelf;
varying vec3 vWorldPos;
varying vec2 vGeomSlope;

// Palette from packages/core/src/styles/tokens.css (converted from sRGB hex to linear RGB):
// --ice: #F7FAFB -> linear (0.936, 0.958, 0.966)
// --glacier: #7FA8C4 -> linear (0.212, 0.392, 0.554); sRGB (0.498, 0.659, 0.769)
// --deep: #1E3E5C -> sRGB (0.118, 0.243, 0.361)
// --ink: #1F2A36 -> linear (0.014, 0.023, 0.037); sRGB (0.122, 0.165, 0.212)
// --pencil: #5E656C -> sRGB (0.369, 0.396, 0.424)
// --paper: #EAE0D0 -> linear (0.823, 0.745, 0.631)
// --ocre: #B8742A -> linear (0.479, 0.175, 0.023)
const vec3 ICE_COL = vec3(0.936, 0.958, 0.966);
// Derived from --ice (#F7FAFB) mixed 18% toward --glacier (#7FA8C4) for cool glacier-blue plateau tone:
const vec3 ICE_COOL = vec3(0.805, 0.878, 0.932);
// Derived from --glacier (#7FA8C4) mixed with --ice (#F7FAFB) for floating ice shelves and blue shadows:
const vec3 GLACIER = vec3(0.498, 0.659, 0.769);
const vec3 DEEP = vec3(0.118, 0.243, 0.361);
const vec3 INK = vec3(0.085, 0.125, 0.175); // --ink (#1F2A36) cartographic stroke tone
const vec3 PENCIL = vec3(0.369, 0.396, 0.424);
// Derived from --pencil (#5E656C) + --ocre (#B8742A) + --paper (#EAE0D0) for exposed rock:
const vec3 ROCK_WARM = vec3(0.58, 0.49, 0.40);

${periodicLineChunk}

void main() {
  // Relief texture: RGB = baked normal, A = signed distance to Bedmap3 coastline (in map units,
  // encoded as round(32 + sdfMap * 32) / 255 so 32/255 = 0.0 at the exact ice/rock-ocean edge).
  vec4 reliefSample = texture2D(uReliefTex, vTerrainUV);
  float coastSdf = (reliefSample.a * 255.0 - 32.0) / 32.0;

  // Discard ocean-side skirt beyond the Bedmap3 mask boundary so the ocean and its coastal foam
  // meet the relief cleanly without stair-stepped triangles or floating fragments.
  if (coastSdf < -0.18 || (coastSdf < -0.02 && vHeight < 1.0)) {
    discard;
  }

  // 1. Base color: cold bluish-white (--ice / --glacier) on ice, warm earth on exposed rock (vMask > 3.5).
  vec3 paintCol = texture2D(uPaintTex, vMapUV).rgb;
  // Floating ice shelves (Bedmap3 mask 3), from their own 0/1 attribute: an interpolated vMask
  // passes through 3 between rock (4) and grounded ice (1) and would tint mountain slopes.
  // Interpolation fades the shelf tone in over about one mesh cell, with no hard edge.
  float shelfFactor = smoothstep(0.15, 0.85, vShelf);
  vec3 col;
  if (vMask > 3.5) {
    col = mix(paintCol, ROCK_WARM, 0.58);
  } else {
    float e = smoothstep(0.0, 3600.0, vHeight);
    // Grounded ice blends from cool glacier-white near the coast to crisp --ice on the high dome;
    // floating ice shelves carry a colder --glacier wash so the shelf reads apart from grounded ice.
    vec3 iceBase = mix(ICE_COOL, ICE_COL, e);
    iceBase = mix(iceBase, mix(GLACIER, ICE_COL, 0.5), shelfFactor * 0.9);
    // Keep subtle pigment variation from uPaintTex internally, but suppress it near the coast
    // where Natural Earth's 2D shelf path differs from Bedmap3.
    float interiorBlend = smoothstep(1.5, 8.0, coastSdf) * 0.16;
    vec3 coolPaint = mix(ICE_COOL, ICE_COL, dot(paintCol, vec3(0.299, 0.587, 0.114)));
    col = mix(iceBase, coolPaint, interiorBlend);
  }

  // 2. Relief: baked normal (RGB) plus ambient occlusion (R) and sun shadow (G).
  vec3 n = normalize(reliefSample.rgb * 2.0 - 1.0);
  vec3 normal = normalize(vec3(n.x, n.z, n.y));
  vec2 light = texture2D(uLightTex, vTerrainUV).rg;
  float ao = light.r;
  float shadow = light.g;

  // Raking NW sun plus soft W and N fills (multi-directional hillshade), relative to flat ground.
  vec3 fillW = normalize(vec3(-0.82, 0.57, 0.0));
  vec3 fillN = normalize(vec3(0.0, 0.57, -0.82));
  float direct = max(dot(normal, uSunDir), 0.0) * mix(0.42, 1.0, shadow);
  float lit = 0.68 * direct + 0.16 * max(dot(normal, fillW), 0.0) + 0.16 * max(dot(normal, fillN), 0.0);
  float flatLit = 0.68 * uSunDir.y + 0.32 * 0.57; // "flat" is reserved in GLSL 3
  float L = (lit / flatLit) * mix(1.0, ao, 0.72);
  // Moderate tone stretch (1.35 instead of 1.7) so slopes read clearly without harsh black/white contrast.
  L = 1.0 + (L - 1.0) * 1.35;

  // Shadows and relief hollows (1.0 - ao): blue light absorption in ice (--glacier / --deep),
  // warmer slate shadow on exposed rock.
  float dark = clamp(1.0 - L, 0.0, 1.0);
  float hollow = clamp(1.0 - ao, 0.0, 1.0);
  if (vMask < 3.5) {
    vec3 iceShadow = mix(GLACIER * 0.85, DEEP * 1.32 + vec3(0.05, 0.12, 0.20), smoothstep(0.12, 0.82, dark));
    col = mix(col, col * iceShadow, smoothstep(0.0, 0.90, dark) * 0.76);
    // Blue absorption pooled in basins, glacier valleys, and ice hollows:
    // Shelves are flat floating ice: lighter pooling keeps them smooth next to the grounded relief.
    col = mix(col, mix(GLACIER, DEEP, 0.42), hollow * 0.40 * (1.0 - 0.5 * shelfFactor));
    // Sunlit ice slopes brighten toward crisp cold --ice (never warm cream):
    col = mix(col, ICE_COL, clamp(L - 1.0, 0.0, 1.0) * 0.40);
  } else {
    col = mix(col, col * mix(vec3(1.0), DEEP * 1.55 + 0.12, 0.82), smoothstep(0.0, 0.9, dark));
    col += vec3(0.04, 0.03, 0.015) * clamp(L - 1.0, 0.0, 1.0);
  }

  vec2 grad = n.xy;
  float slope = length(grad);
  // Smooth slope direction from vertex normals blended gently with normal map so stroke
  // coordinates never suffer from texel-to-texel phase speckle on curved ridges.
  vec2 smoothGrad = mix(vGeomSlope, grad, 0.2);
  float smoothSlopeLen = max(length(smoothGrad), 0.001);
  vec2 fallDir = smoothGrad / smoothSlopeLen;
  vec2 acrossDir = vec2(-fallDir.y, fallDir.x);

  float camDist = length(cameraPosition - vWorldPos);
  float contourFade = 1.0 - smoothstep(260.0, 480.0, camDist);
  float worldPixelScale = fwidth(vWorldPos.x) + fwidth(vWorldPos.z);

  // 3. Hachures: strokes following the fall line on the shaded side of steep slopes.
  // Project onto 4 fixed constant-direction stroke families weighted by slope orientation so
  // strokes never suffer from (grad(across) * vWorldPos) lever-arm phase distortion far from origin.
  if (slope > 0.025) {
    float fade = 1.0 - smoothstep(0.18, 0.38, worldPixelScale * 2.0);
    float strength = smoothstep(0.035, 0.28, slope) * smoothstep(0.18, 0.78, dark) * fade;
    if (strength > 0.01) {
      vec2 d0 = vec2(1.0, 0.0);
      vec2 d1 = vec2(0.7071, 0.7071);
      vec2 d2 = vec2(0.0, 1.0);
      vec2 d3 = vec2(-0.7071, 0.7071);
      vec4 w = pow(
        abs(vec4(dot(acrossDir, d0), dot(acrossDir, d1), dot(acrossDir, d2), dot(acrossDir, d3))),
        vec4(4.0)
      );
      w /= max(w.x + w.y + w.z + w.w, 0.001);
      float hStroke =
        w.x * periodicLine(dot(vWorldPos.xz, d0) * 2.1, 0.55) +
        w.y * periodicLine(dot(vWorldPos.xz, d1) * 2.1, 0.55) +
        w.z * periodicLine(dot(vWorldPos.xz, d2) * 2.1, 0.55) +
        w.w * periodicLine(dot(vWorldPos.xz, d3) * 2.1, 0.55);
      vec3 hachureTint = vMask < 3.5 ? mix(GLACIER, DEEP, 0.58) : PENCIL * 1.35;
      col = mix(col, col * hachureTint, hStroke * strength * 0.48);
    }
  }

  // 4. Sastrugi (wind-carved ice ripples) & crevasses on steep coastal/glacier ice — only visible
  // up close using the same distance fade (contourFade) as contour lines.
  if (contourFade > 0.0 && vMask < 3.5) {
    // 4a. Sastrugi: elongated wind-swept undulations in soft glacier/pencil ink + crisp --ice crests
    // across gentle/moderate ice sheet and shelf surfaces.
    float flatIce = 1.0 - smoothstep(0.08, 0.20, slope);
    if (flatIce > 0.0) {
      vec2 windUv = vWorldPos.xz * 0.42;
      float warp = sin(windUv.x * 0.55 + windUv.y * 0.40) * 1.15 + cos(windUv.y * 0.65 - windUv.x * 0.35) * 0.75;
      float sastrugiCoord = windUv.x * 0.82 + windUv.y * 1.48 + warp;
      float sRow = floor(sastrugiCoord + 0.5);
      // Break wind ripples into finite hand-drawn sastrugi crescents/undulations:
      float patchMask = smoothstep(
        0.12,
        0.58,
        sin(windUv.x * 0.72 - windUv.y * 0.48 + sRow * 1.3) *
          cos(windUv.x * 0.44 + windUv.y * 0.82 - sRow * 0.7)
      );
      float sastrugiLine = periodicLine(sastrugiCoord, 0.50) * patchMask;
      float sastrugiCrest = periodicLine(sastrugiCoord + 0.15, 0.46) * patchMask;
      float sastrugiStrength = contourFade * flatIce * 0.42;
      col = mix(col, mix(GLACIER, PENCIL, 0.45), sastrugiLine * sastrugiStrength);
      col = mix(col, ICE_COL, sastrugiCrest * sastrugiStrength * 0.88);
    }

    // 4b. Crevasses: short ink strokes perpendicular to the fall line on steeper ice slopes
    // near the coast and along outlet glaciers. Using vHeight for the along-slope coordinate
    // guarantees strokes are strictly perpendicular to the slope everywhere without lever-arm kinks.
    float coastalZone = (1.0 - smoothstep(55.0, 130.0, coastSdf)) * (1.0 - smoothstep(2000.0, 3000.0, vHeight));
    float crevasseSlope = smoothstep(0.028, 0.095, slope) * (1.0 - smoothstep(0.28, 0.45, slope));
    if (coastalZone * crevasseSlope > 0.01) {
      float alongCoord =
        vHeight / 28.0 +
        sin(vWorldPos.x * 0.38 + vWorldPos.z * 0.32) * 0.24 +
        cos(vWorldPos.z * 0.44 - vWorldPos.x * 0.26) * 0.16;
      float rowId = floor(alongCoord + 0.5);
      vec2 dashUv = vWorldPos.xz * 0.52 + vec2(rowId * 1.43, rowId * 2.17);
      // Segment gate breaks lines into short transverse crevasse gashes (~3-5 world units wide):
      float segGate = smoothstep(0.22, 0.56, sin(dashUv.x) * cos(dashUv.y));
      float crevasseLine = periodicLine(alongCoord, 0.58) * segGate;
      float crevasseRim = periodicLine(alongCoord - 0.14, 0.50) * segGate;
      float crevasseStrength = contourFade * coastalZone * crevasseSlope * 0.72;
      col = mix(col, GLACIER * 0.80, crevasseRim * crevasseStrength * 0.65);
      col = mix(col, mix(DEEP, INK, 0.68), crevasseLine * crevasseStrength);
    }
  }

  // 5. Contours: faint pencil aid that only appears when zoomed in.
  if (vHeight > 20.0 && contourFade > 0.0) {
    float minor = periodicLine(vHeight / uContour, 0.4);
    float major = periodicLine(vHeight / (uContour * 4.0), 0.55);
    vec3 contourCol = vMask < 3.5 ? mix(PENCIL, DEEP, 0.35) : PENCIL;
    col = mix(col, contourCol, max(minor * 0.15, major * 0.25) * contourFade);
  }

  // 6. Barrier ice cliffs & coastal wall: on the seaward margin of ice shelves and coastal ice,
  // shade the front face as a blue ice cliff (--deep / --glacier) with horizontal strata layers
  // and a bright --ice crest cornice that meets the ocean's coastal foam.
  if (vMask < 3.5) {
    float shelfFrontWidth = mix(1.25, 2.25, shelfFactor);
    float cliffBand = 1.0 - smoothstep(0.04, shelfFrontWidth, coastSdf);
    float steepWall = smoothstep(0.03, 0.18, slope) * (1.0 - smoothstep(0.6, 3.0, coastSdf));
    float cliffFactor = clamp(max(cliffBand, steepWall * 0.85), 0.0, 1.0);
    if (cliffFactor > 0.01) {
      float wallProgress = clamp(coastSdf / max(shelfFrontWidth, 0.5), 0.0, 1.0);
      // Vertical blue cliff gradient: --deep near the waterline, --glacier mid-wall, --ice at the top rim
      vec3 cliffTone = mix(DEEP * 1.12, GLACIER * 0.95, smoothstep(0.0, 0.70, wallProgress));
      cliffTone = mix(cliffTone, ICE_COL, smoothstep(0.74, 0.98, wallProgress));
      // Horizontal strata bands along the barrier face:
      float strataCoord = coastSdf * 1.85 + vHeight / 14.0;
      float strataFine = periodicLine(strataCoord, 0.54);
      float strataBold = periodicLine(strataCoord * 0.5, 0.64);
      float strataMask = (1.0 - smoothstep(0.76, 0.98, wallProgress)) * smoothstep(-0.08, 0.10, coastSdf);
      cliffTone = mix(cliffTone, mix(DEEP, INK, 0.48), max(strataFine * 0.42, strataBold * 0.62) * strataMask);
      // Crisp bright --ice cornice line along the top edge of the barrier cliff:
      float cornice = 1.0 - smoothstep(0.0, 0.20, abs(wallProgress - 0.86));
      cliffTone = mix(cliffTone, ICE_COL, cornice * 0.68);
      col = mix(col, cliffTone, cliffFactor * 0.88);
    }
  }

  // 7. Ice sheen: raking solar glint + grazing-angle Fresnel on smooth ice, never on rock or in shadow.
  if (vMask < 3.5) {
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    vec3 halfVec = normalize(uSunDir + viewDir);
    float ndotv = clamp(dot(normal, viewDir), 0.0, 1.0);
    float fresnel = pow(1.0 - ndotv, 2.8);
    float specTight = pow(max(dot(normal, halfVec), 0.0), 32.0);
    float specBroad = pow(max(dot(normal, halfVec), 0.0), 9.0);
    // No extra glint on shelves: a boosted sheen washed their colder tone back to white.
    float glint = (specTight * 0.26 + specBroad * fresnel * 0.32 + fresnel * 0.12) * shadow;
    // Soft roll-off so the highlight reads as cold ice sheen without clipping/burning to pure white:
    vec3 glintCol = mix(GLACIER, ICE_COL, 0.86);
    col = mix(col, glintCol, clamp(glint, 0.0, 0.48));
  }

  // 8. Real Bedmap3 coastline ink stroke (Step 23a): fine cartographic --ink edge right on the
  // Bedmap3 mask boundary (coastSdf == 0), screen-space adaptive so it never breaks or floats.
  float sdfWidth = max(fwidth(coastSdf), 0.055);
  float coastInk = 1.0 - smoothstep(0.0, sdfWidth * 1.25, abs(coastSdf - sdfWidth * 0.15));
  col = mix(col, INK, coastInk * 0.66);

  // 9. Exponential fog towards paper color (matching ocean shader)
  float fog = computeFogFactor(vWorldPos);
  col = mix(col, uFogColor, fog);

  // 10. Paper grain, fixed to the screen like the 2D grain overlay.
  // On ice (vMask < 3.5), use neutral paper luminance so --paper (#EAE0D0) does not warm-tint the ice.
  vec3 paper = texture2D(uPaperTex, gl_FragCoord.xy / 512.0).rgb;
  float paperLum = dot(paper, vec3(0.299, 0.587, 0.114));
  vec3 paperMod = vMask < 3.5 ? vec3(paperLum) : paper;
  col = mix(col, col * paperMod * 1.18, 0.25);

  gl_FragColor = vec4(col, 1.0);
  // Shading is done in linear space (sRGB textures decode on sampling). Encode for the screen
  // when drawing straight to it; into the post-processing buffer this is a no-op.
  #include <colorspace_fragment>
}
`;
