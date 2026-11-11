import { fogParsChunk, periodicLineChunk } from './fog.glsl.ts';

export const fuegiaVertexShader = /* glsl */ `
attribute float aHeight; // land height or, on water, depth (m)
attribute float aLand;   // 1 on land, 0 on water
attribute float aShore;  // on water: distance to the shore as a fraction of the painted reach

varying float vHeight;
varying float vLand;
varying float vShore;
varying vec3 vNormal;
varying vec3 vWorldPos;

void main() {
  vHeight = aHeight;
  vLand = aLand;
  vShore = aShore;
  vNormal = normal;
  vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/**
 * Painted land for Tierra del Fuego and southern Patagonia. Unlike the Antarctic terrain there are
 * no baked textures: shading uses the mesh normals and the color is a tint by altitude
 * (lowland, rock, high snow), not land cover. The water close to the shore is painted here too,
 * by depth, and fades into the ocean plane.
 */
export const fuegiaFragmentShader = /* glsl */ `
precision highp float;

uniform sampler2D uPaperTex;
uniform vec3 uSunDir;
uniform float uContour;
uniform float uEdgeStart; // map-space radius from the pole where the data starts to end
uniform float uEdgeEnd;
uniform float uAbsorb;
uniform float uWaterFade; // outer fraction of the painted water that fades out

${fogParsChunk}

varying float vHeight;
varying float vLand;
varying float vShore;
varying vec3 vNormal;
varying vec3 vWorldPos;

// Palette from tokens.css and the 2D watercolor: South America wash, --deep, --pencil, --ink, --ice.
const vec3 LOWLAND = vec3(0.851, 0.769, 0.612);
const vec3 ROCK = vec3(0.62, 0.52, 0.42);
const vec3 SNOW = vec3(0.969, 0.980, 0.984);
const vec3 DEEP = vec3(0.118, 0.243, 0.361);
const vec3 PENCIL = vec3(0.369, 0.396, 0.424);
const vec3 INK = vec3(0.122, 0.165, 0.212);
// Same water palette and depth absorption as ocean.glsl.ts.
const vec3 SHALLOW = vec3(0.530, 0.725, 0.795);
const vec3 MID = vec3(0.265, 0.445, 0.590);
const vec3 ABYSS = vec3(0.125, 0.252, 0.378);

${periodicLineChunk}

void main() {
  // The dataset ends at 50° S: dissolve into the ocean plane instead of stopping in a line.
  float alpha = 1.0 - smoothstep(uEdgeStart, uEdgeEnd, length(vWorldPos.xz));
  vec3 col;

  // vLand is interpolated across shore triangles: its 0.5 level is the coastline.
  if (vLand < 0.5) {
    // On a shore triangle the height attribute mixes depth and land height: stay shallow there.
    float depth = vHeight * (1.0 - smoothstep(0.0, 0.5, vLand));
    col = mix(SHALLOW, MID, 1.0 - exp(-depth * uAbsorb * 0.95));
    col = mix(col, ABYSS, 1.0 - exp(-max(depth - 280.0, 0.0) * uAbsorb * 0.34));
    alpha *= 1.0 - smoothstep(1.0 - uWaterFade, 1.0, vShore);
  } else {
    col = mix(LOWLAND, ROCK, smoothstep(250.0, 900.0, vHeight));
    col = mix(col, SNOW, smoothstep(1000.0, 1500.0, vHeight));

    // Same raking NW sun and soft fills as the Antarctic terrain, relative to flat ground.
    vec3 normal = normalize(vNormal);
    vec3 fillW = normalize(vec3(-0.82, 0.57, 0.0));
    vec3 fillN = normalize(vec3(0.0, 0.57, -0.82));
    float lit = 0.7 * max(dot(normal, uSunDir), 0.0) + 0.15 * max(dot(normal, fillW), 0.0) + 0.15 * max(dot(normal, fillN), 0.0);
    float flatLit = 0.7 * uSunDir.y + 0.3 * 0.57;
    float L = 1.0 + (lit / flatLit - 1.0) * 1.3;

    float dark = clamp(1.0 - L, 0.0, 1.0);
    col = mix(col, col * mix(vec3(1.0), DEEP * 1.6 + 0.12, 0.85), smoothstep(0.0, 0.9, dark));
    col += vec3(0.05, 0.04, 0.02) * clamp(L - 1.0, 0.0, 1.0);

    // Contours, only when close.
    float contourFade = 1.0 - smoothstep(60.0, 140.0, length(cameraPosition - vWorldPos));
    if (vHeight > 20.0 && contourFade > 0.0) {
      col = mix(col, PENCIL, periodicLine(vHeight / uContour, 0.4) * 0.16 * contourFade);
    }
  }

  // Inked shoreline of constant screen width: the depth-based ink effect cannot see a coast at sea level.
  float w = max(fwidth(vLand), 1e-5);
  col = mix(col, INK, (1.0 - smoothstep(0.6, 1.6, abs(vLand - 0.5) / w)) * 0.8);

  col = mix(col, uFogColor, computeFogFactor(vWorldPos));

  vec3 paper = texture2D(uPaperTex, gl_FragCoord.xy / 512.0).rgb;
  col = mix(col, col * paper * 1.2, 0.3);

  gl_FragColor = vec4(col, alpha);
  // Shading is done in linear space; encode for the screen when drawing straight to it.
  #include <colorspace_fragment>
}
`;
