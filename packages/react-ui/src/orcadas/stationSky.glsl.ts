export const stationSkyVertexShader = /* glsl */ `
varying vec3 vWorldDir;
varying vec3 vWorldPos;

void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPos = worldPos.xyz;
  vWorldDir = normalize(position);
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

export const stationSkyFragmentShader = /* glsl */ `
precision highp float;

uniform vec3 uSunDir;
uniform float uCloudCover;
uniform float uTime;
uniform vec2 uWindVec;

varying vec3 vWorldDir;
varying vec3 vWorldPos;

vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}

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

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 rot = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 4; i++) {
    v += a * valueNoise(p);
    p = rot * p * 2.03 + vec2(7.1, 3.4);
    a *= 0.5;
  }
  return v;
}

vec3 srgbToLinear(vec3 c) {
  return pow(clamp(c, 0.0, 1.0), vec3(2.2));
}

void main() {
  vec3 dir = normalize(vWorldDir);
  float elev = clamp(dir.y, -0.2, 1.0);
  float sunEl = uSunDir.y;

  // Palette in sRGB matching tokens.css & voxel palette
  vec3 paperCol = vec3(0.953, 0.922, 0.867);   // #F3EBDD
  vec3 iceCol = vec3(0.969, 0.980, 0.984);     // #F7FAFB
  vec3 skyBlueCol = vec3(0.365, 0.576, 0.765); // #5D93C3
  vec3 glacierCol = vec3(0.498, 0.659, 0.769); // #7FA8C4
  vec3 deepCol = vec3(0.118, 0.243, 0.361);    // #1E3E5C
  vec3 nightDeep = vec3(0.055, 0.114, 0.192);  // #0E1D31
  vec3 inkCol = vec3(0.122, 0.165, 0.212);     // #1F2A36
  vec3 goldCol = vec3(0.949, 0.757, 0.306);    // #F2C14E
  vec3 ocreCol = vec3(0.851, 0.510, 0.169);    // #D9822B
  vec3 oxideCol = vec3(0.784, 0.278, 0.165);   // #C8472A

  // Distinct solar regimes:
  // 1. High summer day (sunEl > 0.22)
  // 2. Long golden twilight / low polar sun (-0.09 < sunEl < 0.25)
  // 3. Polar night (sunEl < -0.02)
  float dayFactor = smoothstep(-0.04, 0.26, sunEl);
  float twilightFactor = smoothstep(-0.14, 0.04, sunEl) * (1.0 - smoothstep(0.08, 0.28, sunEl));
  float nightFactor = 1.0 - smoothstep(-0.10, 0.01, sunEl);

  vec3 dayZenith = mix(deepCol, skyBlueCol, 0.58);
  vec3 dayMid = mix(skyBlueCol, glacierCol, 0.52);
  vec3 dayHorizon = mix(paperCol, iceCol, 0.42);

  vec3 twiZenith = mix(deepCol, inkCol, 0.38);
  vec3 twiMid = mix(ocreCol, glacierCol, 0.38);
  vec3 twiHorizon = mix(goldCol, mix(ocreCol, oxideCol, 0.45), 0.52);

  vec3 nightZenith = nightDeep;
  vec3 nightMid = mix(nightDeep, deepCol, 0.52);
  vec3 nightHorizon = mix(deepCol * 0.85, glacierCol * 0.42, 0.38);

  vec3 zenithCol = mix(mix(nightZenith, twiZenith, twilightFactor), dayZenith, dayFactor);
  vec3 midCol = mix(mix(nightMid, twiMid, twilightFactor), dayMid, dayFactor);
  vec3 horizonCol = mix(mix(nightHorizon, twiHorizon, twilightFactor), dayHorizon, dayFactor);

  // Subtle faceted sky bands so the dome harmonizes with the faceted diorama
  float rawH = clamp(max(elev, 0.0), 0.0, 1.0);
  float steppedH = mix(rawH, floor(rawH * 14.0) / 14.0, 0.18);
  float lowerMix = smoothstep(0.0, 0.32, steppedH);
  float upperMix = smoothstep(0.24, 0.82, steppedH);
  vec3 skyCol = mix(horizonCol, midCol, lowerMix);
  skyCol = mix(skyCol, zenithCol, upperMix);

  // Directional golden solar glow along the horizon
  float sunCos = dot(dir, normalize(uSunDir));
  float hCurve = pow(clamp(1.0 - max(elev, 0.0), 0.0, 1.0), 2.0);
  float sunAzGlow = pow(clamp(sunCos * 0.5 + 0.5, 0.0, 1.0), 3.2) * hCurve;
  vec3 glowTone = mix(goldCol, mix(ocreCol, oxideCol, 0.35), twilightFactor);
  skyCol = mix(skyCol, glowTone, sunAzGlow * (0.68 * twilightFactor + 0.24 * dayFactor));

  // Polar night stars & subtle southern airglow
  if (nightFactor > 0.02 && elev > 0.02) {
    vec2 starUv = dir.xz / (dir.y + 0.38) * 52.0;
    vec2 starCell = floor(starUv);
    vec2 starFrac = fract(starUv) - 0.5;
    vec2 sh = hash22(starCell);
    float dStar = length(starFrac - (sh - 0.5) * 0.56);
    float starBright = smoothstep(0.11, 0.018, dStar) * step(0.76, sh.x);
    float twinkle = 0.72 + 0.28 * sin(uTime * 2.1 + sh.y * 45.0);
    vec3 starCol = mix(iceCol, goldCol, step(0.92, sh.y) * 0.45);
    skyCol = mix(
      skyCol,
      starCol,
      starBright * twinkle * nightFactor * smoothstep(0.02, 0.18, elev)
    );
  }

  // Solar disc & warm watercolor halo when above the horizon
  if (sunEl > -0.05) {
    float sunVis = smoothstep(-0.05, 0.02, sunEl) * (1.0 - uCloudCover * 0.65);
    float halo = pow(clamp(sunCos, 0.0, 1.0), 42.0) * 0.55;
    float disc = smoothstep(0.9972, 0.9988, sunCos);
    float discRim = smoothstep(0.9962, 0.9972, sunCos) - disc;
    vec3 sunCol = mix(goldCol, iceCol, smoothstep(0.04, 0.28, sunEl));
    skyCol = mix(skyCol, sunCol, halo * sunVis);
    skyCol = mix(skyCol, inkCol, discRim * 0.45 * sunVis);
    skyCol = mix(skyCol, mix(goldCol, iceCol, 0.65), disc * sunVis);
  }

  // Faceted / stepped watercolor clouds controlled by uCloudCover (0..1 from cloudOktas 0..8)
  if (uCloudCover > 0.01 && elev > 0.01) {
    vec2 domeUv = dir.xz / (dir.y + 0.30) * 1.40 + uWindVec * uTime * 0.014;
    // Quantize UV slightly for a subtle faceted block feel inside the watercolor clouds
    vec2 cellUv = mix(domeUv, floor(domeUv * 18.0) / 18.0, 0.22);
    float n1 = fbm(cellUv);
    float n2 = fbm(domeUv * 2.15 - vec2(1.7, 2.3));
    float cloudField = n1 * 0.70 + n2 * 0.30;

    float threshold = mix(0.74, 0.22, clamp(uCloudCover, 0.0, 1.0));
    float cloudMask = smoothstep(threshold - 0.07, threshold + 0.12, cloudField);
    float horizonFade = smoothstep(0.01, 0.15, elev);
    cloudMask *= horizonFade;

    vec3 dayCloudLit = mix(paperCol, iceCol, 0.55);
    vec3 twiCloudLit = mix(goldCol, mix(ocreCol, paperCol, 0.45), 0.55);
    vec3 nightCloudLit = mix(deepCol, glacierCol, 0.35);
    vec3 cloudLit = mix(mix(nightCloudLit, twiCloudLit, twilightFactor), dayCloudLit, dayFactor);

    vec3 dayCloudShad = mix(glacierCol, deepCol, 0.42);
    vec3 twiCloudShad = mix(deepCol, oxideCol, 0.36);
    vec3 nightCloudShad = nightDeep * 1.15;
    vec3 cloudShadow = mix(mix(nightCloudShad, twiCloudShad, twilightFactor), dayCloudShad, dayFactor);

    float rawBelly = smoothstep(threshold - 0.04, threshold + 0.22, n1);
    float steppedBelly = floor(rawBelly * 4.0) / 3.0;
    vec3 cloudCol = mix(cloudShadow, cloudLit, mix(rawBelly, steppedBelly, 0.45));

    float cloudRim = smoothstep(0.08, 0.26, cloudMask) * (1.0 - smoothstep(0.26, 0.56, cloudMask));
    cloudCol = mix(cloudCol, inkCol, cloudRim * 0.25);

    skyCol = mix(skyCol, cloudCol, cloudMask * 0.90);
  }

  // Subtle screen-space paper grain
  vec2 pHash = hash22(floor(gl_FragCoord.xy * 0.5));
  float grain = (pHash.x - 0.5) * 0.025;
  vec3 linearCol = srgbToLinear(skyCol + grain);

  gl_FragColor = vec4(linearCol, 1.0);
  #include <colorspace_fragment>
}
`;

export const stationTerrainVertexShader = /* glsl */ `
attribute vec3 aSurface; // x = gravel/moraine, y = snow/glacier, z = dark rock

varying vec3 vWorldPos;
varying vec3 vNormal;
varying vec3 vSurface;

void main() {
  vSurface = aSurface;
  vNormal = normalize(mat3(modelMatrix) * normal);
  vec4 world4 = modelMatrix * vec4(position, 1.0);
  vWorldPos = world4.xyz;
  gl_Position = projectionMatrix * viewMatrix * world4;
}
`;

export const stationTerrainFragmentShader = /* glsl */ `
precision highp float;

uniform vec3 uSunDir;
uniform float uAmbient;

varying vec3 vWorldPos;
varying vec3 vNormal;
varying vec3 vSurface;

vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}

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

float periodicLine(float coord, float widthPx) {
  float dist = abs(fract(coord - 0.5) - 0.5);
  float fw = max(fwidth(coord), 1e-4);
  return 1.0 - smoothstep(0.0, fw * widthPx, dist);
}

vec3 srgbToLinear(vec3 c) {
  return pow(clamp(c, 0.0, 1.0), vec3(2.2));
}

void main() {
  // Faceted triangle normal blended with vertex normal for a crisp voxel/low-poly relief feel
  vec3 dx = dFdx(vWorldPos);
  vec3 dy = dFdy(vWorldPos);
  vec3 faceN = normalize(cross(dx, dy));
  if (faceN.y < 0.0) faceN = -faceN;
  vec3 n = normalize(mix(normalize(vNormal), faceN, 0.76));

  vec3 w = vSurface / max(vSurface.x + vSurface.y + vSurface.z, 0.001);

  // Palette in sRGB
  vec3 paperCol = vec3(0.953, 0.922, 0.867);
  vec3 iceCol = vec3(0.969, 0.980, 0.984);
  vec3 glacierCol = vec3(0.498, 0.659, 0.769);
  vec3 deepCol = vec3(0.118, 0.243, 0.361);
  vec3 inkCol = vec3(0.122, 0.165, 0.212);
  vec3 pencilCol = vec3(0.369, 0.396, 0.424);
  vec3 gravelCol = vec3(0.51, 0.46, 0.40);
  vec3 rockCol = vec3(0.32, 0.34, 0.36);
  vec3 goldCol = vec3(0.949, 0.757, 0.306);
  vec3 ocreCol = vec3(0.851, 0.510, 0.169);

  // Quantized noise cells for faceted ground patches
  vec2 cellXz = floor(vWorldPos.xz * 1.25) / 1.25;
  float patchN = valueNoise(cellXz * 0.45);
  vec3 snowTone = mix(iceCol, mix(glacierCol, iceCol, 0.58), (1.0 - patchN) * 0.38);
  vec3 gravelTone = mix(gravelCol, mix(paperCol, pencilCol, 0.52), patchN * 0.36);
  vec3 rockTone = mix(rockCol, inkCol * 1.35, (1.0 - patchN) * 0.42);

  vec3 baseCol = w.x * gravelTone + w.y * snowTone + w.z * rockTone;

  // Stepped faceted illumination
  float sunEl = uSunDir.y;
  float dayFactor = smoothstep(-0.04, 0.26, sunEl);
  float twilightFactor = smoothstep(-0.14, 0.04, sunEl) * (1.0 - smoothstep(0.08, 0.28, sunEl));
  float nightFactor = 1.0 - smoothstep(-0.10, 0.01, sunEl);

  vec3 lightDir = normalize(vec3(uSunDir.x, max(uSunDir.y, 0.14), uSunDir.z));
  float ndotl = max(dot(n, lightDir), 0.0);
  float bands = mix(ndotl, floor(ndotl * 4.0) / 3.5, 0.58);
  float lit = clamp(uAmbient + (1.0 - uAmbient) * bands, 0.22, 1.15);

  vec3 shadowTint = mix(mix(deepCol, pencilCol, 0.42), mix(glacierCol, deepCol, 0.48), w.y);
  vec3 col = mix(baseCol * shadowTint * 1.32, baseCol, smoothstep(0.22, 0.92, lit));

  // Apply golden sunset tint on sunlit facets or cool polar-night moonlight tint
  vec3 sunTint = mix(vec3(1.0), mix(goldCol, ocreCol, 0.35) * 1.12, twilightFactor * (0.45 + 0.55 * bands));
  vec3 nightTint = vec3(0.42, 0.56, 0.74);
  col *= mix(sunTint, nightTint, nightFactor * 0.85);

  // Elevation contour lines & slope hachures
  float slope = 1.0 - clamp(n.y, 0.0, 1.0);
  if (vWorldPos.y > 0.35) {
    float contour = periodicLine(vWorldPos.y / 2.1, 1.1);
    col = mix(col, mix(pencilCol, deepCol, w.y * 0.5), contour * 0.24);
  }
  if (slope > 0.22) {
    float hachure = periodicLine((vWorldPos.x + vWorldPos.z) * 1.55, 1.15);
    col = mix(col, inkCol, hachure * smoothstep(0.22, 0.62, slope) * 0.28);
  }

  // Shoreline ink stroke where land meets sea (y ~ 0.10)
  float shoreDist = abs(vWorldPos.y - 0.12);
  float shoreStroke = 1.0 - smoothstep(0.0, 0.16, shoreDist);
  col = mix(col, inkCol, shoreStroke * 0.68);

  // Distance wash matching time of day
  float dist = length(vWorldPos.xz);
  float fog = smoothstep(50.0, 92.0, dist);
  vec3 fogCol = mix(
    mix(deepCol * 0.52, mix(ocreCol, paperCol, 0.55), twilightFactor),
    paperCol,
    dayFactor
  );
  col = mix(col, fogCol, fog * 0.76);

  vec2 gHash = hash22(floor(gl_FragCoord.xy * 0.5));
  col += (gHash.x - 0.5) * 0.022;

  gl_FragColor = vec4(srgbToLinear(col), 1.0);
  #include <colorspace_fragment>
}
`;

export const stationWaterVertexShader = /* glsl */ `
uniform float uTime;
uniform float uWindSpeed;
uniform float uSeaIce;

// Signed distance to the stage coast (core worldCoastDistance): > 0 on land, < 0 at sea.
attribute float aCoast;

varying vec3 vWorldPos;
varying vec2 vUv;
varying float vOffshore;

void main() {
  vUv = uv;
  vOffshore = -aCoast;
  vec4 world4 = modelMatrix * vec4(position, 1.0);
  // Sea ice dampens open-water swell
  float iceDamp = 1.0 - clamp(uSeaIce, 0.0, 1.0) * 0.85;
  float waveAmp = clamp(uWindSpeed / 80.0, 0.02, 0.22) * iceDamp;
  float w = sin(world4.x * 0.45 + uTime * 1.8) * cos(world4.z * 0.38 + uTime * 1.4) * waveAmp;
  // No swell on the beach: the waves grow away from the shore.
  float shoreMask = smoothstep(0.5, 4.0, -aCoast);
  world4.y += w * shoreMask;
  vWorldPos = world4.xyz;
  gl_Position = projectionMatrix * viewMatrix * world4;
}
`;

export const stationWaterFragmentShader = /* glsl */ `
precision highp float;

uniform float uTime;
uniform vec3 uSunDir;
uniform float uWindSpeed;
uniform vec2 uWindVec;
uniform float uSeaIce;

varying vec3 vWorldPos;
varying vec2 vUv;
varying float vOffshore;

vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}

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

// Multi-octave value noise for continuous fast-ice texture and ragged edges
float iceFbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 rot = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 3; i++) {
    v += a * valueNoise(p);
    p = rot * p * 2.05 + vec2(3.1, 1.7);
    a *= 0.5;
  }
  return v;
}

vec3 srgbToLinear(vec3 c) {
  return pow(clamp(c, 0.0, 1.0), vec3(2.2));
}

void main() {
  vec3 paperCol = vec3(0.953, 0.922, 0.867);
  vec3 iceCol = vec3(0.969, 0.980, 0.984);
  vec3 glacierCol = vec3(0.498, 0.659, 0.769);
  vec3 deepCol = vec3(0.118, 0.243, 0.361);
  vec3 inkCol = vec3(0.122, 0.165, 0.212);
  vec3 goldCol = vec3(0.949, 0.757, 0.306);
  vec3 ocreCol = vec3(0.851, 0.510, 0.169);

  float sunEl = uSunDir.y;
  float dayFactor = smoothstep(-0.04, 0.26, sunEl);
  float twilightFactor = smoothstep(-0.14, 0.04, sunEl) * (1.0 - smoothstep(0.08, 0.28, sunEl));
  float nightFactor = 1.0 - smoothstep(-0.10, 0.01, sunEl);

  // Distance from the stage shore, in world units
  float offshore = max(vOffshore, 0.0);
  float bayDepth = clamp(offshore / 16.0, 0.0, 1.0);

  vec3 shallowCol = mix(glacierCol, vec3(0.42, 0.66, 0.76), 0.5);
  vec3 waterCol = mix(shallowCol, deepCol, smoothstep(0.0, 0.85, bayDepth));

  // Time-of-day water tint (golden reflections at twilight, deep indigo at polar night)
  waterCol = mix(waterCol, mix(waterCol, ocreCol, 0.28), twilightFactor);
  waterCol *= mix(0.42, 1.0, 1.0 - nightFactor);

  // Faceted wave cells & whitecaps
  vec2 flowUv = vWorldPos.xz * 0.32 - uWindVec * uTime * 0.32;
  vec2 facetUv = floor(flowUv * 4.5) / 4.5;
  float rippleA = valueNoise(flowUv);
  float rippleB = valueNoise(vWorldPos.xz * 0.55 + vec2(uTime * 0.35, -uTime * 0.28));
  float facetShimmer = valueNoise(facetUv);
  float wavePattern = rippleA * 0.50 + rippleB * 0.30 + facetShimmer * 0.20;

  float whitecapThresh = mix(0.82, 0.58, clamp(uWindSpeed / 65.0, 0.0, 1.0));
  float whitecap = smoothstep(whitecapThresh, whitecapThresh + 0.07, wavePattern) * (1.0 - uSeaIce * 0.85);
  waterCol = mix(waterCol, mix(paperCol, iceCol, 0.68), whitecap * 0.70);

  // Nautical ink wave strokes
  float inkRipple = smoothstep(0.48, 0.52, fract(wavePattern * 3.5)) * (1.0 - smoothstep(0.52, 0.57, fract(wavePattern * 3.5)));
  waterCol = mix(waterCol, inkCol, inkRipple * 0.22 * (1.0 - uSeaIce * 0.7));

  // Coastal surf foam near the northern and southern beaches of the isthmus
  {
    float beachBand = 1.0 - smoothstep(0.2, 2.6, offshore);
    float surf = smoothstep(0.35, 0.75, sin(abs(vWorldPos.z) * 2.2 - uTime * 2.1 + rippleA * 3.0)) * beachBand;
    waterCol = mix(waterCol, mix(paperCol, iceCol, 0.72), surf * 0.75 * (1.0 - uSeaIce * 0.6));
  }

  // Fast-ice sheet and closing bay (uSeaIce: 0 = open summer bay, 0.3 = shore floes, 0.7 = pack with leads, 1.0 = fast-ice sheet)
  if (uSeaIce > 0.02) {
    // Fast ice: the solid sheet grows from the shore. Same rule as iceThreshold (stationModels.ts):
    // a point freezes at seaIce = offshore / 14 * 0.9; floes (box plates) drift in a band of 0.5
    // ahead of it, so the sheet covers the points that froze more than 0.5 earlier.
    float edgeNoise = (iceFbm(vWorldPos.xz * 0.24 + vec2(1.7, 4.3)) - 0.5) * 0.34
                    + (valueNoise(vWorldPos.xz * 0.58 + vec2(-3.1, 7.5)) - 0.5) * 0.16;
    float freezeAt = clamp(offshore / 14.0 * 0.9 + edgeNoise, 0.03, 0.97);
    // With the bay closed (July to September) the whole bay is ice; floes stay as ridges on it.
    float sheetFrozen = max(smoothstep(0.0, 0.06, uSeaIce - 0.5 - freezeAt), smoothstep(0.9, 1.0, uSeaIce));

    // Continuous fast-ice sheet: white to pale blue-grey with soft low-frequency noise (snow cover vs bare ice)
    float snowNoise = valueNoise(vWorldPos.xz * 0.08 + vec2(2.3, 5.7)) * 0.65
                    + valueNoise(vWorldPos.xz * 0.18 + vec2(-4.2, 1.6)) * 0.35;
    vec3 bareIceCol = mix(glacierCol * 1.15, iceCol, 0.52);
    vec3 snowCoverCol = mix(iceCol, paperCol, 0.22);
    vec3 sheetBase = mix(bareIceCol, snowCoverCol, smoothstep(0.32, 0.68, snowNoise));

    // Soft pressure-ridge streaks
    float ridgeNoise = valueNoise(vec2(vWorldPos.x * 0.14 + vWorldPos.z * 0.08, vWorldPos.z * 0.32) + vec2(7.1, 2.8));
    float ridgeStreak = smoothstep(0.68, 0.78, ridgeNoise) * (1.0 - smoothstep(0.78, 0.88, ridgeNoise));
    sheetBase = mix(sheetBase, iceCol * 1.05, ridgeStreak * 0.45);

    // A few long thin irregular cracks/leads: ridged noise 1 - abs(noise) thresholded thin, darker blue-grey, not ink-black, not closed polygons
    float cN1 = valueNoise(vWorldPos.xz * 0.11 + vec2(8.2, 3.4)) * 2.0 - 1.0;
    float cN2 = valueNoise(vWorldPos.xz * 0.15 + vec2(-5.6, 9.1)) * 2.0 - 1.0;
    float ridge1 = 1.0 - abs(cN1);
    float ridge2 = 1.0 - abs(cN2);
    float crack1 = smoothstep(0.955, 0.988, ridge1);
    float crack2 = smoothstep(0.96, 0.992, ridge2);
    // Large-scale mask so cracks are sparse long fissures, not dense grid
    float crackMask = max(crack1, crack2) * smoothstep(0.42, 0.75, valueNoise(vWorldPos.xz * 0.045 + vec2(1.9, -6.3)));
    // In deep winter (seaIce -> 1.0) cracks freeze over into seams
    crackMask *= (1.0 - smoothstep(0.85, 1.0, uSeaIce) * 0.75);
    vec3 leadCol = mix(deepCol * 1.1, glacierCol, 0.42);
    sheetBase = mix(sheetBase, leadCol, crackMask * 0.82);

    // Time-of-day tint to sea-ice sheet
    sheetBase *= mix(vec3(1.0), mix(goldCol, paperCol, 0.45), twilightFactor * 0.45);
    sheetBase *= mix(1.0, 0.55, nightFactor);

    waterCol = mix(waterCol, sheetBase, sheetFrozen * smoothstep(0.02, 0.14, uSeaIce));
  }

  // Distance fog toward horizon
  float dist = length(vWorldPos.xz);
  float fog = smoothstep(50.0, 92.0, dist);
  vec3 fogCol = mix(
    mix(deepCol * 0.52, mix(ocreCol, paperCol, 0.55), twilightFactor),
    paperCol,
    dayFactor
  );
  waterCol = mix(waterCol, fogCol, fog * 0.82);

  gl_FragColor = vec4(srgbToLinear(waterCol), 1.0);
  #include <colorspace_fragment>
}
`;


