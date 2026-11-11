import { Effect, EffectAttribute } from 'postprocessing';
import { wrapEffect } from '@react-three/postprocessing';
import { Uniform, Vector2 } from 'three';

const fragmentShader = /* glsl */ `
uniform vec2 uResolution;

float getDepth(vec2 coord) {
  return readDepth(coord);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
  if (depth >= 0.9999) {
    outputColor = inputColor;
    return;
  }

  vec2 texel = 1.0 / uResolution;

  // Static pseudo-noise displacement for hand-drawn ink wobble
  float noise = sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453;
  vec2 jitter = (vec2(fract(noise), fract(noise * 1.21)) - 0.5) * texel * 0.8;
  vec2 coord = uv + jitter;

  float dC = getDepth(coord);
  if (dC >= 0.9999) {
    outputColor = inputColor;
    return;
  }

  // Cross Laplacian (2nd derivative): 0.0 on planar ramps, non-zero on ridges and step cliffs
  float dL = getDepth(coord + vec2(-texel.x, 0.0));
  float dR = getDepth(coord + vec2(texel.x, 0.0));
  float dU = getDepth(coord + vec2(0.0, -texel.y));
  float dD = getDepth(coord + vec2(0.0, texel.y));

  float lap = abs(dL + dR + dU + dD - 4.0 * dC);

  // Diagonal samples
  float d00 = getDepth(coord + vec2(-texel.x, -texel.y));
  float d20 = getDepth(coord + vec2(texel.x, -texel.y));
  float d02 = getDepth(coord + vec2(-texel.x, texel.y));
  float d22 = getDepth(coord + vec2(texel.x, texel.y));

  float lapDiag = abs(d00 + d20 + d02 + d22 - 4.0 * dC);
  float edge = max(lap, lapDiag * 0.5);

  // Ink stroke in --ink (#1F2A36)
  float ink = smoothstep(0.0015, 0.006, edge);
  vec3 col = mix(inputColor.rgb, vec3(0.12, 0.16, 0.21), ink * 0.75);

  outputColor = vec4(col, inputColor.a);
}
`;

export class InkEffectImpl extends Effect {
  constructor() {
    super('InkEffect', fragmentShader, {
      attributes: EffectAttribute.DEPTH,
      uniforms: new Map([
        [
          'uResolution',
          new Uniform(
            new Vector2(
              typeof window !== 'undefined' ? window.innerWidth : 1440,
              typeof window !== 'undefined' ? window.innerHeight : 900
            )
          ),
        ],
      ]),
    });
  }

  setSize(width: number, height: number) {
    const u = this.uniforms.get('uResolution');
    if (u) u.value.set(width, height);
  }
}

export const InkEffect = wrapEffect(InkEffectImpl);
