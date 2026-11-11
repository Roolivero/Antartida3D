import { fogParsChunk } from './fog.glsl.ts';

export const seaLifeVertexShader = /* glsl */ `
attribute vec2 aCenter;
attribute float aSprite;
attribute float aKind;
attribute float aPhase;
attribute float aSpeed;
attribute float aRadius;
attribute float aScale;
attribute float aSeed;

uniform float uTime;
uniform float uViewportHeight;
uniform float uFovTan;
uniform vec2 uRoutePoints[ROUTE_SAMPLES];
uniform vec4 uSpriteRects[11];
uniform vec2 uSpriteAnchors[11];

varying vec2 vUv;
varying float vAlpha;
varying vec3 vWorldPos;

float fractSin(float val) {
  return fract(sin(val) * 43758.5453123);
}

vec2 whaleCyclePos(vec2 center, float radius, float seed, float cycleIdx) {
  if (cycleIdx <= 0.5) {
    return center;
  }
  float h1 = fractSin(seed * 12.9898 + cycleIdx * 78.233);
  float h2 = fractSin(seed * 39.346 + cycleIdx * 11.135);
  float ang = h1 * 6.2831853;
  float dist = radius * (0.2 + 0.65 * h2);
  return center + vec2(cos(ang), sin(ang)) * dist;
}

// Linear walk of the shared route polyline (IRIZAR_ROUTE_POLYLINE). Mirrors routePointAt in
// packages/core/src/sea.ts. Uniform arrays can be indexed dynamically in the vertex shader.
void evalRoute(float t, out vec2 pos, out vec2 tanDir) {
  float f = clamp(t, 0.0, 1.0) * float(ROUTE_SAMPLES - 1);
  int i = int(min(floor(f), float(ROUTE_SAMPLES - 2)));
  float s = f - float(i);
  vec2 a = uRoutePoints[i];
  vec2 b = uRoutePoints[i + 1];
  pos = mix(a, b, s);
  tanDir = normalize(b - a + vec2(1e-5, 0.0));
}

void main() {
  int kind = int(aKind + 0.5);
  int spriteIdx = int(aSprite + 0.5);

  vec2 mapPos = aCenter;
  float alpha = 1.0;
  float scaleMul = 1.0;
  float rotAngle = 0.0;
  float flipX = 1.0;
  float bobY = 0.0;
  float minPx = 42.0 * aScale;
  float maxPx = 92.0 * aScale;

  if (kind == 0) {
    // Humpback whale: 24..28 s cycle -> spout (2), back (0), tail dive (1), submerged
    // Matches whaleCycleState(p, 'humpback') in packages/core/src/sea.ts
    float cyclePos = uTime * aSpeed + aPhase;
    float cycleIdx = floor(cyclePos);
    float p = fract(cyclePos);
    mapPos = whaleCyclePos(aCenter, aRadius, aSeed, cycleIdx);

    float dirSign = fractSin(aSeed * 7.13 + cycleIdx * 3.7) < 0.5 ? 1.0 : -1.0;
    flipX = dirSign;
    mapPos.x += (p - 0.46) * 4.5 * dirSign;

    if (p >= 0.08 && p < 0.30) {
      spriteIdx = 2;
      float u = (p - 0.08) / 0.22;
      alpha = smoothstep(0.0, 0.35, u) * (1.0 - smoothstep(0.65, 1.0, u));
      bobY = -0.22 + 0.26 * sin(u * 3.14159265);
      rotAngle = (u - 0.5) * 0.12 * dirSign;
    } else if (p >= 0.35 && p < 0.57) {
      spriteIdx = 0;
      float u = (p - 0.35) / 0.22;
      alpha = smoothstep(0.0, 0.35, u) * (1.0 - smoothstep(0.65, 1.0, u));
      bobY = -0.22 + 0.26 * sin(u * 3.14159265);
      rotAngle = (u - 0.5) * 0.22 * dirSign;
    } else if (p >= 0.62 && p < 0.84) {
      spriteIdx = 1;
      float u = (p - 0.62) / 0.22;
      alpha = smoothstep(0.0, 0.35, u) * (1.0 - smoothstep(0.65, 1.0, u));
      bobY = -0.22 + 0.28 * sin(u * 3.14159265);
      rotAngle = (u - 0.4) * 0.20 * dirSign;
    } else {
      alpha = 0.0;
      bobY = -0.22;
    }
  } else if (kind == 1) {
    // Orca pod member: staggered surfacing cycle with fade-in/out and rising/sinking arc
    // Matches whaleCycleState(p, 'orca') in packages/core/src/sea.ts
    float cyclePos = uTime * aSpeed + aPhase;
    float cycleIdx = floor(cyclePos);
    float p = fract(cyclePos);
    float dirSign = fractSin(aSeed * 7.13 + cycleIdx * 3.7) < 0.5 ? 1.0 : -1.0;
    flipX = dirSign;
    mapPos = aCenter + vec2((p - 0.43) * 6.0 * dirSign, 0.0);

    if (p >= 0.10 && p < 0.76) {
      float u = (p - 0.10) / 0.66;
      alpha = smoothstep(0.0, 0.28, u) * (1.0 - smoothstep(0.72, 1.0, u));
      bobY = -0.22 + 0.26 * sin(u * 3.14159265);
      rotAngle = (u - 0.5) * 0.20 * dirSign;
    } else {
      alpha = 0.0;
      bobY = -0.22;
    }
    minPx = 38.0 * aScale;
    maxPx = 82.0 * aScale;
  } else if (kind == 2) {
    // Antarctic Minke whale: sleek surfacing cycle with fade-in/out
    // Matches whaleCycleState(p, 'minke') in packages/core/src/sea.ts
    float cyclePos = uTime * aSpeed + aPhase;
    float cycleIdx = floor(cyclePos);
    float p = fract(cyclePos);
    mapPos = whaleCyclePos(aCenter, aRadius, aSeed, cycleIdx);
    float dirSign = fractSin(aSeed * 5.3 + cycleIdx * 11.1) < 0.5 ? 1.0 : -1.0;
    flipX = dirSign;
    mapPos.x += (p - 0.45) * 5.5 * dirSign;
    if (p >= 0.12 && p < 0.78) {
      float u = (p - 0.12) / 0.66;
      alpha = smoothstep(0.0, 0.28, u) * (1.0 - smoothstep(0.72, 1.0, u));
      bobY = -0.22 + 0.26 * sin(u * 3.14159265);
      rotAngle = (u - 0.5) * 0.18 * dirSign;
    } else {
      alpha = 0.0;
      bobY = -0.22;
    }
    minPx = 38.0 * aScale;
    maxPx = 80.0 * aScale;
  } else if (kind == 3 || kind == 4) {
    // Penguins on ice floe (3) & Leopard seal on sea ice (4): continuous lemniscate drift + gentle sway
    float driftT = (uTime * aSpeed + aPhase) * 6.2831853;
    mapPos = aCenter + vec2(cos(driftT), sin(2.0 * driftT) * 0.5) * aRadius;
    float swayT = uTime * 1.15 + aPhase * 6.2831853;
    rotAngle = sin(swayT) * 0.035;
    bobY = sin(swayT * 1.2) * 0.025;
    minPx = 42.0 * aScale;
    maxPx = 86.0 * aScale;
  } else if (kind == 5) {
    // Tabular iceberg: continuous periodic lemniscate drift without resets
    float driftT = (uTime * aSpeed + aPhase) * 6.2831853;
    mapPos = aCenter + vec2(cos(driftT), sin(2.0 * driftT) * 0.5) * aRadius;
    rotAngle = sin(uTime * 0.4 + aPhase * 6.2831853) * 0.018;
    minPx = 44.0 * aScale;
    maxPx = 96.0 * aScale;
  } else if (kind == 6 || kind == 7) {
    // ARA Almirante Irizar (6) & trailing wake (7) round-trip along Ushuaia-Marambio Bezier route
    // Matches irizarStateAtTime in packages/core/src/sea.ts
    float c = fract(uTime * aSpeed + aPhase);
    float routeT = 0.0;
    float navSpeed = 0.0;
    float dirSign = 1.0;

    if (c < 0.40) {
      float u = c / 0.40;
      routeT = u * u * (3.0 - 2.0 * u);
      navSpeed = 4.0 * u * (1.0 - u);
      dirSign = 1.0;
    } else if (c < 0.50) {
      routeT = 1.0;
      navSpeed = 0.0;
      dirSign = 1.0;
    } else if (c < 0.90) {
      float u = (c - 0.50) / 0.40;
      routeT = 1.0 - u * u * (3.0 - 2.0 * u);
      navSpeed = 4.0 * u * (1.0 - u);
      dirSign = -1.0;
    } else {
      routeT = 0.0;
      navSpeed = 0.0;
      dirSign = -1.0;
    }

    vec2 rPos;
    vec2 rTan;
    evalRoute(routeT, rPos, rTan);
    mapPos = rPos;
    vec2 heading = rTan * dirSign;

    // Project heading into camera view space to orient the billboard along its course
    vec3 worldTan = normalize(vec3(heading.x, 0.0, heading.y));
    vec3 viewTan = (viewMatrix * vec4(worldTan, 0.0)).xyz;
    flipX = viewTan.x < 0.0 ? -1.0 : 1.0;
    rotAngle = clamp(atan(viewTan.y, max(abs(viewTan.x), 0.15)), -0.45, 0.45) * flipX;
    bobY = sin(uTime * 2.0) * 0.025 * navSpeed;
    if (kind == 6) {
      minPx = 54.0;
      maxPx = 112.0;
    } else {
      minPx = 52.0;
      maxPx = 108.0;
      alpha = navSpeed * (0.90 + 0.10 * sin(uTime * 3.2));
    }
  }

  vec4 rect = uSpriteRects[spriteIdx];
  vec2 anchor = uSpriteAnchors[spriteIdx];

  // Sample UV inside the sprite's atlas cell (flipY = false on texture, so v=0 is top, v=1 is bottom)
  float uCoord = flipX > 0.0 ? uv.x : (1.0 - uv.x);
  float vCoord = 1.0 - uv.y;
  vUv = vec2(mix(rect.x, rect.z, uCoord), mix(rect.y, rect.w, vCoord));
  vAlpha = kind == 7 ? alpha * mix(0.28, 1.0, uCoord) : alpha;

  if (alpha <= 0.005 || scaleMul <= 0.01) {
    vWorldPos = vec3(0.0);
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    return;
  }

  vec3 worldCenter = vec3(mapPos.x - 500.0, 0.55, mapPos.y - 500.0);
  float camDist = length(cameraPosition - worldCenter);

  // Screen-space size clamping (minPx..maxPx) so sprites stay legible from afar and bounded close-up
  float pxPerWorldUnit = uViewportHeight / max(2.0 * camDist * uFovTan, 1.0);
  float naturalWorldSize = 28.0 * aScale * scaleMul;
  float unclampedPx = naturalWorldSize * pxPerWorldUnit;
  float targetPx = clamp(unclampedPx, minPx * scaleMul, maxPx * scaleMul);
  float worldSize = targetPx / max(pxPerWorldUnit, 1e-4);

  // Camera right and up vectors in world space for spherical billboard
  vec3 camRight = normalize(vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]));
  vec3 camUp = normalize(vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]));

  // Anchor-relative local quad coordinates (waterline at anchorY)
  vec2 localPos = vec2(
    position.x - (anchor.x - 0.5) * flipX,
    position.y + (anchor.y - 0.5)
  );
  if (kind == 7) {
    // Attach the turbulent stern prop-wash directly behind the ship's stern at all zoom levels
    localPos.x -= 0.36 * flipX;
  }

  float ca = cos(rotAngle);
  float sa = sin(rotAngle);
  vec2 rotPos = vec2(
    ca * localPos.x - sa * localPos.y,
    sa * localPos.x + ca * localPos.y + bobY
  );

  vec3 vertexWorld = worldCenter
    + camRight * (rotPos.x * worldSize)
    + camUp * (rotPos.y * worldSize);

  // Slide vertices below y = 0.12 along the exact camera ray so they stay above the ocean plane
  // (y = -0.05) in the depth buffer without squashing the billboard on screen.
  if (vertexWorld.y < 0.12) {
    vec3 toCamRay = cameraPosition - vertexWorld;
    float tLift = (0.12 - vertexWorld.y) / max(toCamRay.y, 1.0);
    vertexWorld += toCamRay * clamp(tLift, 0.0, 0.85);
  }

  vWorldPos = vertexWorld;

  // Pull ship (kind 6) and wake (kind 7) slightly along the exact camera ray so coastal
  // relief at the Ushuaia and Marambio mooring endpoints never clips the hull in the depth buffer,
  // while keeping screen position, pixel size, and vWorldPos fog invariant.
  if (kind == 6 || kind == 7) {
    float rayPull = kind == 6 ? 0.14 : 0.13;
    vertexWorld = mix(vertexWorld, cameraPosition, rayPull);
  }

  gl_Position = projectionMatrix * viewMatrix * vec4(vertexWorld, 1.0);
}
`;

export const seaLifeFragmentShader = /* glsl */ `
precision highp float;

uniform sampler2D uAtlas;
uniform sampler2D uPaperTex;

${fogParsChunk}

varying vec2 vUv;
varying float vAlpha;
varying vec3 vWorldPos;

void main() {
  vec4 tex = texture2D(uAtlas, vUv);
  float spriteAlpha = smoothstep(0.06, 0.72, tex.a);
  float outAlpha = spriteAlpha * vAlpha;

  if (outAlpha < 0.01) {
    discard;
  }

  // Compensate for transparent-border dark bleed in mipmaps while keeping exact palette colors
  vec3 col = clamp(tex.rgb / max(tex.a, 0.45), 0.0, 1.0);

  // Subtle screen-space paper grain to integrate seamlessly with the painted ocean & terrain
  vec3 paper = texture2D(uPaperTex, gl_FragCoord.xy / 512.0).rgb;
  col = mix(col, col * paper * 1.16, 0.20);

  // Blend into distance paper fog just like the ocean and terrain
  float fog = computeFogFactor(vWorldPos);
  col = mix(col, uFogColor, fog);

  gl_FragColor = vec4(col, outAlpha);
  #include <colorspace_fragment>
}
`;
