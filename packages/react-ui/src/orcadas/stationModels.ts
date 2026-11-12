import { BufferAttribute, BufferGeometry, PlaneGeometry } from 'three';
import { createSeededRng } from '@antartida/core';
import { buildBoxGeometry, type Box } from '../voyage/vehicles.ts';
import { SEA_MODELS } from '../voyage/sightingModels.ts';

// Shared muted palette matching voyage/sightingModels.ts and voyage/vehicles.ts
export const VOXEL_PALETTE = {
  BLACK: 0x1f2a36,
  WHITE: 0xf7fafb,
  ROCK: 0x8a8f8c,
  ROCK_DARK: 0x656a68,
  ROCK_LIGHT: 0x9a9f9b,
  ICE: 0xe9f1f4,
  ICE_BLUE: 0xb6d3e3,
  ORANGE: 0xd9822b,
  RED: 0xc8472a,
  RED_DARK: 0x96351e,
  CREAM: 0xf1e6c8,
  WOOD: 0x8a6a4a,
  WOOD_LIGHT: 0xc49a6c,
  GRASS: 0x9aa86a,
  SEA_GREY: 0x6f7f8c,
  BROWN: 0x6b5443,
  BROWN_DARK: 0x4d3b2f,
  WHALE_GREY: 0x55606b,
  LAMP: 0xf2c14e,
  ZINC: 0x7d868c,
  SKY: 0x7fb6dc,
  NAVY_ROOF: 0x1e3e5c,
  WINDOW_DAY: 0xc9dbe6,
  SEAL_DARK: 0x4f5a63,
  SEAL_BELLY: 0x9aa6ae,
  SEAL_SPOT: 0xc9d0d4,
} as const;

const {
  BLACK,
  WHITE,
  ROCK,
  ROCK_DARK,
  ROCK_LIGHT,
  ICE,
  ICE_BLUE,
  ORANGE,
  RED,
  RED_DARK,
  CREAM,
  WOOD,
  WOOD_LIGHT,
  SEA_GREY,
  BROWN,
  BROWN_DARK,
  WHALE_GREY,
  LAMP,
  ZINC,
  SKY,
  NAVY_ROOF,
  WINDOW_DAY,
  SEAL_DARK,
  SEAL_BELLY,
  SEAL_SPOT,
} = VOXEL_PALETTE;

export interface SeaIcePlate {
  x: number;
  z: number;
  radius: number;
  rotY: number;
  threshold: number;
}

export interface IcebergInstance {
  x: number;
  z: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  rotY: number;
  phase: number;
  variant: 'tabular' | 'pinnacle';
}

export interface PenguinInstance {
  x: number;
  y: number;
  z: number;
  rotY: number;
  phase: number;
  speed: number;
  mode: 'walk' | 'slide';
  species: 'adelie' | 'chinstrap';
  lineIndex: number;
}

export function offsetBoxes(
  boxes: readonly Box[],
  dx: number,
  dy: number,
  dz: number,
  scale = 1
): Box[] {
  return boxes.map(([cx, cy, cz, sx, sy, sz, col]) => [
    dx + cx * scale,
    dy + cy * scale,
    dz + cz * scale,
    sx * scale,
    sy * scale,
    sz * scale,
    col,
  ]);
}

export function mirrorZBoxes(boxes: readonly Box[]): Box[] {
  return boxes.map(([cx, cy, cz, sx, sy, sz, col]) => [cx, cy, -cz, sx, sy, sz, col]);
}

// ============================================================================
// 1. FAUNA VOXEL MODELS (18 to 26 boxes per model)
// ============================================================================

/**
 * Standing penguin helper (+x is beak/front, +y is up, feet rest on y = 0).
 * Clear upright silhouette with black back/tail, wide white chest/belly, orange webbed feet,
 * pointed beak, side flippers, and species-specific facial markings.
 */
function buildStandingPenguinBoxes(species: 'adelie' | 'chinstrap'): Box[] {
  const faceMarks: Box[] =
    species === 'adelie'
      ? [
          // Adélie: solid black head with crisp white eye rings and black pupils
          [0.05, 0.62, 0.098, 0.055, 0.055, 0.012, WHITE],
          [0.05, 0.62, -0.098, 0.055, 0.055, 0.012, WHITE],
          [0.055, 0.62, 0.105, 0.024, 0.024, 0.008, BLACK],
          [0.055, 0.62, -0.105, 0.024, 0.024, 0.008, BLACK],
          // Reddish-orange feathered base of bill
          [0.12, 0.60, 0, 0.06, 0.042, 0.056, RED],
          [0.165, 0.595, 0, 0.055, 0.028, 0.038, ORANGE],
        ]
      : [
          // Chinstrap: white face cheeks & throat, black crown, thin black strap under chin
          [0.045, 0.59, 0, 0.14, 0.11, 0.196, WHITE],
          [0.065, 0.62, 0.101, 0.026, 0.026, 0.01, BLACK],
          [0.065, 0.62, -0.101, 0.026, 0.026, 0.01, BLACK],
          // Characteristic thin black chinstrap line on both cheeks and under chin
          [0.04, 0.565, 0.101, 0.022, 0.09, 0.008, BLACK],
          [0.04, 0.565, -0.101, 0.022, 0.09, 0.008, BLACK],
          [0.075, 0.532, 0, 0.045, 0.02, 0.202, BLACK],
          // Black bill with orange lower base
          [0.13, 0.60, 0, 0.075, 0.04, 0.052, BLACK],
          [0.175, 0.595, 0, 0.05, 0.026, 0.036, BLACK],
        ];

  return [
    // Webbed feet & ankle shanks
    [0.05, 0.02, 0.075, 0.16, 0.04, 0.09, ORANGE],
    [0.05, 0.02, -0.075, 0.16, 0.04, 0.09, ORANGE],
    [0.12, 0.015, 0.075, 0.05, 0.028, 0.105, ORANGE],
    [0.12, 0.015, -0.075, 0.05, 0.028, 0.105, ORANGE],
    [0.01, 0.06, 0.07, 0.07, 0.06, 0.065, WHITE],
    [0.01, 0.06, -0.07, 0.07, 0.06, 0.065, WHITE],
    // Stiff tail wedge at -x
    [-0.14, 0.07, 0, 0.12, 0.045, 0.11, BLACK],
    [-0.19, 0.045, 0, 0.08, 0.03, 0.075, BLACK],
    // Stepped black back & body core
    [-0.01, 0.19, 0, 0.23, 0.22, 0.26, BLACK],
    [-0.01, 0.37, 0, 0.22, 0.20, 0.24, BLACK],
    [-0.005, 0.51, 0, 0.19, 0.12, 0.21, BLACK],
    // Head & crown
    [0.01, 0.61, 0, 0.18, 0.13, 0.19, BLACK],
    [0.005, 0.685, 0, 0.14, 0.035, 0.15, BLACK],
    // Broad bright white belly & chest wrapping forward (+x)
    [0.055, 0.19, 0, 0.14, 0.20, 0.245, WHITE],
    [0.06, 0.36, 0, 0.135, 0.20, 0.225, WHITE],
    [0.055, 0.49, 0, 0.12, 0.10, 0.19, WHITE],
    // Articulated-look side flippers (upper wing + tapered lower tip, left & right)
    [-0.01, 0.38, 0.145, 0.11, 0.18, 0.036, BLACK],
    [0.01, 0.24, 0.152, 0.085, 0.15, 0.032, BLACK],
    [0.03, 0.31, 0.148, 0.03, 0.24, 0.038, WHITE],
    [-0.01, 0.38, -0.145, 0.11, 0.18, 0.036, BLACK],
    [0.01, 0.24, -0.152, 0.085, 0.15, 0.032, BLACK],
    [0.03, 0.31, -0.148, 0.03, 0.24, 0.038, WHITE],
    ...faceMarks,
  ];
}

export const ADELIE_PENGUIN_BOXES: readonly Box[] = buildStandingPenguinBoxes('adelie');
export const CHINSTRAP_PENGUIN_BOXES: readonly Box[] = buildStandingPenguinBoxes('chinstrap');

/**
 * Penguin tobogganing on its belly (+x forward down the slope, head raised looking ahead).
 * 20 boxes.
 */
export const SLIDING_PENGUIN_BOXES: readonly Box[] = [
  // White belly sliding on snow
  [0, 0.05, 0, 0.44, 0.08, 0.24, WHITE],
  [0.14, 0.08, 0, 0.22, 0.09, 0.21, WHITE],
  // Black back over the torso
  [-0.02, 0.13, 0, 0.44, 0.11, 0.23, BLACK],
  [-0.26, 0.10, 0, 0.12, 0.06, 0.14, BLACK],
  [-0.34, 0.08, 0, 0.09, 0.035, 0.09, BLACK],
  // Outstretched balancing flippers on both sides
  [0.04, 0.09, 0.17, 0.13, 0.03, 0.14, BLACK],
  [0.02, 0.08, 0.27, 0.09, 0.025, 0.10, BLACK],
  [0.08, 0.09, 0.19, 0.03, 0.032, 0.18, WHITE],
  [0.04, 0.09, -0.17, 0.13, 0.03, 0.14, BLACK],
  [0.02, 0.08, -0.27, 0.09, 0.025, 0.10, BLACK],
  [0.08, 0.09, -0.19, 0.03, 0.032, 0.18, WHITE],
  // Raised neck & head looking forward (+x)
  [0.22, 0.18, 0, 0.15, 0.14, 0.18, BLACK],
  [0.25, 0.16, 0, 0.12, 0.11, 0.185, WHITE],
  [0.25, 0.25, 0, 0.15, 0.12, 0.16, BLACK],
  // Eye rings
  [0.28, 0.26, 0.082, 0.045, 0.045, 0.01, WHITE],
  [0.28, 0.26, -0.082, 0.045, 0.045, 0.01, WHITE],
  // Forward beak
  [0.35, 0.24, 0, 0.07, 0.038, 0.048, RED],
  [0.40, 0.235, 0, 0.05, 0.026, 0.034, ORANGE],
  // Orange webbed feet kicking behind (-x)
  [-0.32, 0.04, 0.07, 0.12, 0.035, 0.075, ORANGE],
  [-0.32, 0.04, -0.07, 0.12, 0.035, 0.075, ORANGE],
];

/**
 * Weddell seal resting on beach/ice (+x head, +y up). Mottled dark slate back,
 * silver-spotted pale belly, raised head with whiskers/eyes, front & hind flippers. (24 boxes)
 */
export const WEDDELL_SEAL_BOXES: readonly Box[] = [
  // Torso segments tapering front and rear
  [0, 0.14, 0, 0.46, 0.20, 0.28, SEAL_DARK],
  [0.22, 0.16, 0, 0.20, 0.21, 0.24, SEAL_DARK],
  [-0.24, 0.12, 0, 0.20, 0.16, 0.22, SEAL_DARK],
  [-0.38, 0.09, 0, 0.14, 0.11, 0.15, SEAL_DARK],
  [0.02, 0.245, 0, 0.36, 0.03, 0.20, 0x3d4852],
  // Pale silver belly and throat
  [0.06, 0.06, 0, 0.48, 0.07, 0.24, SEAL_BELLY],
  [0.25, 0.11, 0, 0.18, 0.10, 0.20, SEAL_SPOT],
  [-0.18, 0.055, 0, 0.22, 0.05, 0.18, SEAL_BELLY],
  // Characteristic Weddell silver flank spots
  [0.08, 0.14, 0.142, 0.07, 0.05, 0.012, SEAL_SPOT],
  [-0.06, 0.12, 0.142, 0.08, 0.045, 0.012, SEAL_SPOT],
  [-0.18, 0.11, 0.112, 0.06, 0.04, 0.012, SEAL_SPOT],
  [0.06, 0.14, -0.142, 0.07, 0.05, 0.012, SEAL_SPOT],
  [-0.08, 0.12, -0.142, 0.08, 0.045, 0.012, SEAL_SPOT],
  [-0.19, 0.11, -0.112, 0.06, 0.04, 0.012, SEAL_SPOT],
  // Raised neck, rounded head, snout & nose
  [0.33, 0.25, 0, 0.15, 0.15, 0.17, SEAL_DARK],
  [0.42, 0.24, 0, 0.09, 0.09, 0.11, 0x5d6973],
  [0.47, 0.245, 0, 0.025, 0.038, 0.048, BLACK],
  [0.43, 0.21, 0, 0.07, 0.03, 0.09, SEAL_SPOT],
  // Large dark eyes
  [0.37, 0.285, 0.086, 0.028, 0.028, 0.01, BLACK],
  [0.37, 0.285, -0.086, 0.028, 0.028, 0.01, BLACK],
  // Front flippers
  [0.18, 0.05, 0.17, 0.14, 0.035, 0.11, 0x3d4852],
  [0.18, 0.05, -0.17, 0.14, 0.035, 0.11, 0x3d4852],
  // Splayed hind flippers
  [-0.48, 0.06, 0.07, 0.15, 0.035, 0.10, 0x3d4852],
  [-0.48, 0.06, -0.07, 0.15, 0.035, 0.10, 0x3d4852],
];

/**
 * Southern elephant seal (Mirounga leonina) resting on gravel beach (+x head, +y up).
 * Heavy warm brown torso, raised bull chest, overhanging proboscis/trunk. (26 boxes)
 */
export const ELEPHANT_SEAL_BOXES: readonly Box[] = [
  // Massive warm-brown body core
  [-0.02, 0.16, 0, 0.52, 0.25, 0.34, BROWN],
  [0.24, 0.20, 0, 0.24, 0.27, 0.30, BROWN],
  [-0.28, 0.13, 0, 0.24, 0.19, 0.26, BROWN],
  [-0.44, 0.09, 0, 0.16, 0.13, 0.18, 0x5c4637],
  [0.02, 0.29, 0, 0.40, 0.035, 0.24, BROWN_DARK],
  // Lighter tan-ochre belly & chest shields
  [0.04, 0.06, 0, 0.54, 0.08, 0.28, 0xa6896a],
  [0.28, 0.16, 0, 0.18, 0.18, 0.26, WOOD],
  [0.32, 0.24, 0, 0.16, 0.16, 0.24, 0x9c7a58],
  // Creased neck rolls
  [0.30, 0.31, 0, 0.18, 0.12, 0.22, WOOD],
  // Broad bull head & brow
  [0.38, 0.36, 0, 0.16, 0.14, 0.19, BROWN],
  [0.41, 0.42, 0, 0.11, 0.04, 0.15, BROWN_DARK],
  // Characteristic overhanging proboscis (trunk)
  [0.48, 0.35, 0, 0.09, 0.09, 0.11, 0x5c4637],
  [0.53, 0.30, 0, 0.06, 0.11, 0.09, BROWN_DARK],
  [0.54, 0.24, 0, 0.045, 0.06, 0.075, BLACK],
  // Lower jaw & pink-red mouth crease
  [0.45, 0.27, 0, 0.10, 0.04, 0.12, BROWN_DARK],
  [0.47, 0.295, 0, 0.07, 0.02, 0.09, RED],
  // Eyes
  [0.41, 0.38, 0.096, 0.028, 0.028, 0.012, BLACK],
  [0.41, 0.38, -0.096, 0.028, 0.028, 0.012, BLACK],
  // Heavy front flippers with dark tips
  [0.20, 0.06, 0.20, 0.18, 0.045, 0.13, BROWN_DARK],
  [0.24, 0.05, 0.27, 0.10, 0.03, 0.06, BLACK],
  [0.20, 0.06, -0.20, 0.18, 0.045, 0.13, BROWN_DARK],
  [0.24, 0.05, -0.27, 0.10, 0.03, 0.06, BLACK],
  // Hind tail & dual tail flukes
  [-0.52, 0.07, 0, 0.10, 0.08, 0.12, BROWN_DARK],
  [-0.60, 0.07, 0.08, 0.16, 0.04, 0.11, BROWN_DARK],
  [-0.60, 0.07, -0.08, 0.16, 0.04, 0.11, BROWN_DARK],
  [-0.66, 0.08, 0, 0.08, 0.03, 0.22, BLACK],
];

/** Where a bird wing joins the body: turns around this pivot. */
export const BIRD_WING_ROOT = [0.02, 0.05, 0.06] as const;

export interface BirdVoxelModel {
  body: readonly Box[];
  wing: readonly Box[];
  flap: readonly [reach: number, speed: number];
}

/**
 * Brown skua (Stercorarius antarcticus): heavy dark brown body, warm buff breast,
 * hooked dark bill, and broad wings with distinct white primary flashes. (22 boxes total)
 */
export const SKUA_MODEL: BirdVoxelModel = {
  body: [
    [0, 0, 0, 0.36, 0.13, 0.16, BROWN],
    [0.20, 0.015, 0, 0.15, 0.11, 0.13, BROWN],
    [0.31, 0.045, 0, 0.13, 0.11, 0.11, BROWN_DARK],
    [0.41, 0.035, 0, 0.11, 0.04, 0.045, BLACK],
    [0.46, 0.018, 0, 0.035, 0.035, 0.04, BLACK],
    [0.34, 0.075, 0.056, 0.026, 0.026, 0.01, BLACK],
    [0.34, 0.075, -0.056, 0.026, 0.026, 0.01, BLACK],
    [-0.21, 0, 0, 0.15, 0.095, 0.12, BROWN],
    [-0.32, 0.008, 0, 0.13, 0.04, 0.15, BROWN_DARK],
    [-0.41, 0.01, 0, 0.08, 0.03, 0.22, BROWN_DARK],
    [0.03, -0.06, 0, 0.42, 0.035, 0.12, WOOD],
    [-0.12, -0.07, 0, 0.08, 0.03, 0.09, BLACK],
  ],
  wing: [
    [0.02, 0, 0.11, 0.21, 0.035, 0.22, BROWN],
    [-0.01, 0.005, 0.32, 0.17, 0.03, 0.22, BROWN],
    [0.02, 0.008, 0.44, 0.08, 0.032, 0.12, WHITE],
    [-0.05, 0.005, 0.52, 0.13, 0.026, 0.20, BROWN_DARK],
    [-0.10, 0, 0.68, 0.085, 0.022, 0.15, BROWN_DARK],
  ],
  flap: [0.24, 3.2],
};

/**
 * Snow petrel (Pagodroma nivea): pure snow-white plumage, coal-black eyes,
 * short black bill, and long narrow gliding wings. (22 boxes total)
 */
export const SNOW_PETREL_MODEL: BirdVoxelModel = {
  body: [
    [0, 0, 0, 0.34, 0.11, 0.14, WHITE],
    [0.19, 0.01, 0, 0.14, 0.095, 0.11, WHITE],
    [0.30, 0.038, 0, 0.12, 0.095, 0.095, WHITE],
    [0.39, 0.028, 0, 0.09, 0.032, 0.038, BLACK],
    [0.43, 0.014, 0, 0.03, 0.028, 0.032, BLACK],
    [0.33, 0.068, 0.048, 0.025, 0.025, 0.01, BLACK],
    [0.33, 0.068, -0.048, 0.025, 0.025, 0.01, BLACK],
    [-0.20, 0, 0, 0.14, 0.085, 0.11, WHITE],
    [-0.31, 0.005, 0, 0.12, 0.035, 0.14, ICE],
    [-0.40, 0.008, 0, 0.08, 0.025, 0.20, WHITE],
    [0.02, -0.052, 0, 0.40, 0.03, 0.10, ICE],
    [-0.10, -0.062, 0, 0.07, 0.025, 0.07, SEA_GREY],
  ],
  wing: [
    [0.02, 0, 0.11, 0.19, 0.03, 0.22, WHITE],
    [-0.01, 0.005, 0.32, 0.15, 0.028, 0.22, WHITE],
    [-0.03, 0.006, 0.42, 0.13, 0.026, 0.14, ICE],
    [-0.06, 0.005, 0.54, 0.11, 0.024, 0.18, WHITE],
    [-0.11, 0, 0.69, 0.075, 0.02, 0.14, ICE],
  ],
  flap: [0.16, 2.4],
};

// ============================================================================
// 2. STATION BUILDINGS & INSTRUMENTS VOXEL MODELS (16 to 54 boxes per model)
// ============================================================================

/**
 * 1. Omond House (1903 Scottish expedition stone cabin).
 * Thick dry-stone perimeter pirca walls, stepped timber & canvas roof, entrance porch,
 * stovepipe chimney, snow drifts, and deep-set window. (38 boxes)
 */
export function buildOmondBoxes(isNight: boolean): Box[] {
  const winCol = isNight ? LAMP : WINDOW_DAY;
  return [
    // Dry-stone footing & thick multi-course stone walls
    [0, 0.12, 0, 2.65, 0.24, 2.05, ROCK_DARK],
    [0, 0.38, 0, 2.45, 0.30, 1.85, ROCK],
    [0, 0.68, 0, 2.40, 0.32, 1.80, 0x767b78],
    [0, 0.98, 0, 2.44, 0.28, 1.84, ROCK],
    // Corner stone quoins & perimeter pirca buttresses
    [-1.18, 0.56, 0.88, 0.22, 0.92, 0.22, ROCK_DARK],
    [1.18, 0.56, 0.88, 0.22, 0.92, 0.22, ROCK_DARK],
    [-1.18, 0.56, -0.88, 0.22, 0.92, 0.22, ROCK_DARK],
    [1.18, 0.56, -0.88, 0.22, 0.92, 0.22, ROCK_DARK],
    [-1.28, 0.32, 0, 0.18, 0.52, 1.35, 0x767b78],
    [1.28, 0.32, 0, 0.18, 0.52, 1.35, 0x767b78],
    [0, 0.32, -0.98, 1.85, 0.52, 0.18, ROCK_DARK],
    // Textured stone blocks on walls
    [-0.65, 0.55, 0.92, 0.42, 0.22, 0.06, ROCK_LIGHT],
    [0.72, 0.78, 0.92, 0.38, 0.20, 0.06, ROCK_DARK],
    [-0.55, 0.82, -0.92, 0.48, 0.22, 0.06, ROCK_LIGHT],
    [0.62, 0.48, -0.92, 0.44, 0.22, 0.06, ROCK_LIGHT],
    // Stepped pitched timber & canvas roof
    [0, 1.18, 0, 2.66, 0.12, 2.06, BROWN_DARK],
    [0, 1.30, 0, 2.38, 0.12, 1.76, BROWN],
    [0, 1.42, 0, 2.08, 0.12, 1.46, BROWN_DARK],
    [0, 1.54, 0, 1.76, 0.12, 1.14, BROWN],
    [0, 1.66, 0, 1.44, 0.12, 0.82, BROWN_DARK],
    [0, 1.77, 0, 1.16, 0.10, 0.48, WOOD],
    [0, 1.85, 0, 0.96, 0.08, 0.20, BROWN_DARK],
    // Iron stovepipe chimney on roof
    [-0.55, 1.92, -0.22, 0.22, 0.42, 0.22, BLACK],
    [-0.55, 2.16, -0.22, 0.30, 0.06, 0.30, ZINC],
    // Front wooden entrance vestibule (+z)
    [-0.18, 0.46, 1.08, 0.82, 0.88, 0.52, WOOD],
    [-0.18, 0.94, 1.10, 0.92, 0.10, 0.58, BROWN_DARK],
    [-0.18, 1.02, 1.08, 0.68, 0.08, 0.54, BROWN],
    [-0.18, 0.42, 1.35, 0.48, 0.74, 0.05, BROWN_DARK],
    [-0.02, 0.42, 1.38, 0.08, 0.08, 0.04, BLACK],
    [-0.18, 0.06, 1.48, 0.68, 0.12, 0.28, ROCK_DARK],
    // Framed window on right front wall
    [0.68, 0.66, 0.93, 0.46, 0.42, 0.06, CREAM],
    [0.68, 0.66, 0.95, 0.36, 0.32, 0.05, winCol],
    [0.68, 0.66, 0.97, 0.04, 0.34, 0.04, BLACK],
    [0.68, 0.66, 0.97, 0.34, 0.04, 0.04, BLACK],
    // Snow drifts along roof eaves and stone base
    [-0.85, 1.25, 0.82, 0.72, 0.06, 0.28, WHITE],
    [0.75, 1.25, -0.78, 0.82, 0.06, 0.28, ICE],
    [-1.22, 0.10, 0.75, 0.55, 0.14, 0.45, WHITE],
    [1.15, 0.10, -0.72, 0.62, 0.14, 0.48, ICE],
  ];
}

/**
 * 2. Casa Moneta (1905 wooden gable house with brick chimney).
 * Stone plinth, warm timber clapboard walls, cream corner trim, stepped red gable roof,
 * brick chimney, entrance porch, and multi-pane windows. (48 boxes)
 */
export function buildMonetaBoxes(isNight: boolean): Box[] {
  const winCol = isNight ? LAMP : WINDOW_DAY;
  return [
    // Stone foundation plinth
    [0, 0.12, 0, 3.64, 0.24, 2.44, ROCK_DARK],
    [0, 0.26, 0, 3.56, 0.08, 2.36, ROCK],
    // Main horizontal timber walls (layered for clapboard texture)
    [0, 0.62, 0, 3.44, 0.68, 2.24, WOOD_LIGHT],
    [0, 1.18, 0, 3.44, 0.52, 2.24, 0xba8e60],
    [0, 0.94, 0, 3.48, 0.06, 2.28, WOOD],
    // Cream corner pilasters & wall trim
    [-1.70, 0.85, 1.10, 0.12, 1.18, 0.12, CREAM],
    [1.70, 0.85, 1.10, 0.12, 1.18, 0.12, CREAM],
    [-1.70, 0.85, -1.10, 0.12, 1.18, 0.12, CREAM],
    [1.70, 0.85, -1.10, 0.12, 1.18, 0.12, CREAM],
    [0, 1.44, 0, 3.54, 0.08, 2.34, CREAM],
    // Stepped oxide-red gable roof (ridge along X)
    [0, 1.54, 0, 3.72, 0.14, 2.52, RED],
    [0, 1.68, 0, 3.68, 0.14, 2.16, RED_DARK],
    [0, 1.82, 0, 3.64, 0.14, 1.80, RED],
    [0, 1.96, 0, 3.60, 0.14, 1.44, RED_DARK],
    [0, 2.10, 0, 3.56, 0.14, 1.08, RED],
    [0, 2.24, 0, 3.52, 0.14, 0.72, RED_DARK],
    [0, 2.36, 0, 3.56, 0.12, 0.36, RED],
    [0, 2.45, 0, 3.60, 0.08, 0.16, CREAM],
    // Gable timber triangle infill on West and East ends
    [0, 1.86, 0, 3.40, 0.56, 1.24, WOOD_LIGHT],
    // Tall brick & metal chimney at [0.95, y, -0.35]
    [0.95, 2.35, -0.35, 0.38, 0.82, 0.38, RED_DARK],
    [0.95, 2.78, -0.35, 0.44, 0.08, 0.44, BLACK],
    [0.95, 2.90, -0.35, 0.24, 0.20, 0.24, ZINC],
    // Front entrance vestibule (+z at x = 0)
    [0, 0.68, 1.32, 0.92, 0.96, 0.48, WOOD_LIGHT],
    [0, 1.20, 1.34, 1.02, 0.10, 0.56, RED],
    [0, 1.30, 1.32, 0.74, 0.10, 0.52, RED_DARK],
    [0, 0.62, 1.57, 0.48, 0.82, 0.05, BROWN_DARK],
    [0.16, 0.60, 1.60, 0.06, 0.08, 0.04, LAMP],
    [0, 0.14, 1.68, 0.78, 0.16, 0.30, WOOD],
    [0, 0.05, 1.84, 0.84, 0.10, 0.26, ROCK],
    // Front left window (x = -1.05)
    [-1.05, 0.88, 1.13, 0.58, 0.54, 0.06, CREAM],
    [-1.05, 0.88, 1.15, 0.46, 0.42, 0.05, winCol],
    [-1.05, 0.88, 1.17, 0.04, 0.44, 0.04, BLACK],
    [-1.05, 0.88, 1.17, 0.44, 0.04, 0.04, BLACK],
    // Front right window (x = 1.05)
    [1.05, 0.88, 1.13, 0.58, 0.54, 0.06, CREAM],
    [1.05, 0.88, 1.15, 0.46, 0.42, 0.05, winCol],
    [1.05, 0.88, 1.17, 0.04, 0.44, 0.04, BLACK],
    [1.05, 0.88, 1.17, 0.44, 0.04, 0.04, BLACK],
    // Back windows (-z)
    [-0.95, 0.88, -1.13, 0.54, 0.50, 0.06, CREAM],
    [-0.95, 0.88, -1.15, 0.42, 0.38, 0.05, winCol],
    [0.95, 0.88, -1.13, 0.54, 0.50, 0.06, CREAM],
    [0.95, 0.88, -1.15, 0.42, 0.38, 0.05, winCol],
    // Side gable windows (-x and +x)
    [-1.73, 0.88, 0, 0.06, 0.52, 0.52, CREAM],
    [-1.75, 0.88, 0, 0.05, 0.40, 0.40, winCol],
    [1.73, 0.88, 0, 0.06, 0.52, 0.52, CREAM],
    [1.75, 0.88, 0, 0.05, 0.40, 0.40, winCol],
    // Historic monument plaque & snow trim
    [0.54, 0.78, 1.14, 0.22, 0.16, 0.04, ORANGE],
    [-1.10, 1.60, 1.12, 0.95, 0.05, 0.22, WHITE],
    [1.10, 1.60, -1.12, 0.95, 0.05, 0.22, ICE],
  ];
}

/**
 * 3. Radio Telegraphy Masts (1927 twin steel lattice towers + multi-wire antenna).
 * 46 boxes.
 */
export function buildRadioMastsBoxes(): Box[] {
  const towerAt = (mx: number): Box[] => [
    // Concrete & stone anchor pad
    [mx, 0.14, 0, 0.86, 0.28, 0.86, ROCK_DARK],
    [mx, 0.32, 0, 0.64, 0.12, 0.64, ROCK],
    // 4 corner lattice legs rising & tapering in 3 sections
    [mx - 0.20, 1.35, 0.20, 0.09, 2.0, 0.09, BLACK],
    [mx + 0.20, 1.35, 0.20, 0.09, 2.0, 0.09, BLACK],
    [mx - 0.20, 1.35, -0.20, 0.09, 2.0, 0.09, BLACK],
    [mx + 0.20, 1.35, -0.20, 0.09, 2.0, 0.09, BLACK],
    [mx - 0.14, 3.25, 0.14, 0.08, 2.0, 0.08, BLACK],
    [mx + 0.14, 3.25, 0.14, 0.08, 2.0, 0.08, BLACK],
    [mx - 0.14, 3.25, -0.14, 0.08, 2.0, 0.08, BLACK],
    [mx + 0.14, 3.25, -0.14, 0.08, 2.0, 0.08, BLACK],
    [mx - 0.08, 5.05, 0.08, 0.07, 1.8, 0.07, BLACK],
    [mx + 0.08, 5.05, 0.08, 0.07, 1.8, 0.07, BLACK],
    [mx - 0.08, 5.05, -0.08, 0.07, 1.8, 0.07, BLACK],
    [mx + 0.08, 5.05, -0.08, 0.07, 1.8, 0.07, BLACK],
    // Horizontal lattice cross-braces up the tower
    [mx, 1.0, 0, 0.50, 0.07, 0.50, WHALE_GREY],
    [mx, 2.0, 0, 0.44, 0.07, 0.44, WHALE_GREY],
    [mx, 3.0, 0, 0.36, 0.07, 0.36, WHALE_GREY],
    [mx, 4.0, 0, 0.30, 0.07, 0.30, WHALE_GREY],
    [mx, 5.0, 0, 0.24, 0.07, 0.24, WHALE_GREY],
    // Top spreader beam & white ceramic insulators
    [mx, 5.95, 0, 0.22, 0.12, 1.45, BLACK],
    [mx, 6.06, 0.62, 0.12, 0.14, 0.12, WHITE],
    [mx, 6.06, -0.62, 0.12, 0.14, 0.12, WHITE],
  ];

  return [
    ...towerAt(-5.6),
    ...towerAt(7.2),
    // Twin horizontal dipole wires & vertical feeder drop
    [0.8, 6.06, 0.62, 12.8, 0.04, 0.04, BLACK],
    [0.8, 6.06, -0.62, 12.8, 0.04, 0.04, BLACK],
    [0.8, 6.06, 0, 0.06, 0.06, 1.28, ZINC],
    [2.2, 4.1, 0.62, 0.04, 3.8, 0.04, BLACK],
  ];
}

/**
 * 4. Modern Station Modules (2000+ red-orange pavilion, stilts, radome, lit windows).
 * 33 boxes.
 */
export function buildModernModulesBoxes(isNight: boolean): Box[] {
  const winCol = isNight ? LAMP : WINDOW_DAY;
  return [
    // Concrete footings & steel stilts elevating main pavilion
    [-1.5, 0.16, 0.8, 0.28, 0.32, 0.28, ZINC],
    [0, 0.16, 0.8, 0.28, 0.32, 0.28, ZINC],
    [1.5, 0.16, 0.8, 0.28, 0.32, 0.28, ZINC],
    [-1.5, 0.16, -0.8, 0.28, 0.32, 0.28, ZINC],
    [0, 0.16, -0.8, 0.28, 0.32, 0.28, ZINC],
    [1.5, 0.16, -0.8, 0.28, 0.32, 0.28, ZINC],
    [0, 0.34, 0, 4.05, 0.10, 2.28, BLACK],
    // Main orange-red insulated container pavilion
    [0, 0.98, 0, 3.92, 1.22, 2.16, RED],
    [0, 0.52, 0, 3.98, 0.12, 2.22, RED_DARK],
    // Vertical structural ribs on walls
    [-1.88, 0.98, 0, 0.10, 1.24, 2.22, RED_DARK],
    [-0.65, 0.98, 0, 0.08, 1.24, 2.20, RED_DARK],
    [0.65, 0.98, 0, 0.08, 1.24, 2.20, RED_DARK],
    [1.88, 0.98, 0, 0.10, 1.24, 2.22, RED_DARK],
    // Dark navy insulated roof with overhang & snow guard
    [0, 1.66, 0, 4.18, 0.16, 2.42, NAVY_ROOF],
    [0, 1.78, 0, 3.96, 0.10, 2.20, 0x162f47],
    // Roof ventilation ducts & white satellite telecom radome
    [-1.15, 1.96, -0.35, 0.48, 0.28, 0.48, ZINC],
    [1.15, 1.92, -0.40, 0.56, 0.18, 0.56, ZINC],
    [1.15, 2.18, -0.40, 0.62, 0.42, 0.62, WHITE],
    [1.15, 2.42, -0.40, 0.42, 0.16, 0.42, ICE],
    // 4 front windows (+z) with dark frames & glowing/daylight panes
    [-1.32, 1.04, 1.09, 0.48, 0.46, 0.05, BLACK],
    [-1.32, 1.04, 1.11, 0.38, 0.36, 0.05, winCol],
    [-0.44, 1.04, 1.09, 0.48, 0.46, 0.05, BLACK],
    [-0.44, 1.04, 1.11, 0.38, 0.36, 0.05, winCol],
    [0.44, 1.04, 1.09, 0.48, 0.46, 0.05, BLACK],
    [0.44, 1.04, 1.11, 0.38, 0.36, 0.05, winCol],
    [1.32, 1.04, 1.09, 0.48, 0.46, 0.05, BLACK],
    [1.32, 1.04, 1.11, 0.38, 0.36, 0.05, winCol],
    // Side entrance door & metal stair platform (-x)
    [-1.98, 0.88, 0.25, 0.06, 0.88, 0.52, CREAM],
    [-2.25, 0.40, 0.25, 0.52, 0.08, 0.72, ZINC],
    [-2.25, 0.20, 0.72, 0.48, 0.28, 0.42, ZINC],
    [-2.48, 0.68, 0.25, 0.05, 0.54, 0.72, BLACK],
    // Fuel tank beside modern module
    [2.45, 0.62, -0.4, 0.68, 0.68, 1.25, RED_DARK],
    [2.45, 0.20, -0.4, 0.56, 0.28, 1.10, ZINC],
  ];
}

/**
 * Secondary ochre-gold science laboratory module (LABORC), centered on its own origin.
 * 17 boxes, voxel minimum passed (boxes >= 12, colors >= 2, windows present).
 */
export function buildLaborcBoxes(isNight: boolean): Box[] {
  const winCol = isNight ? LAMP : WINDOW_DAY;
  return [
    // Foundation supports
    [0, 0.16, 0, 2.95, 0.32, 1.95, ROCK_DARK],
    // Main container body & base trim
    [0, 0.88, 0, 2.84, 1.14, 1.84, ORANGE],
    [0, 0.42, 0, 2.90, 0.10, 1.90, BROWN],
    // Roof & cap
    [0, 1.50, 0, 3.04, 0.16, 2.04, NAVY_ROOF],
    [0, 1.62, 0, 2.80, 0.08, 1.80, 0x162f47],
    // Structural ribs
    [-1.38, 0.88, 0, 0.08, 1.16, 1.88, BROWN],
    [1.38, 0.88, 0, 0.08, 1.16, 1.88, BROWN],
    // Windows (+z)
    [-0.65, 0.94, 0.93, 0.46, 0.42, 0.05, BLACK],
    [-0.65, 0.94, 0.95, 0.36, 0.32, 0.05, winCol],
    [0.65, 0.94, 0.93, 0.46, 0.42, 0.05, BLACK],
    [0.65, 0.94, 0.95, 0.36, 0.32, 0.05, winCol],
    // Windows (-z)
    [-0.65, 0.94, -0.93, 0.46, 0.42, 0.05, BLACK],
    [-0.65, 0.94, -0.95, 0.36, 0.32, 0.05, winCol],
    [0.65, 0.94, -0.93, 0.46, 0.42, 0.05, BLACK],
    [0.65, 0.94, -0.95, 0.36, 0.32, 0.05, winCol],
    // Solar panel & exhaust stack
    [-0.75, 1.72, 0, 0.72, 0.08, 0.92, BLACK],
    [0.85, 1.82, -0.3, 0.18, 0.42, 0.18, ZINC],
  ];
}

/**
 * 5. Meteorological Stevenson Screen (abrigo meteorológico de celosías sobre patas).
 * 4 legs with cross-bracing, louvered white walls, ventilated double roof, and wooden steps. (34 boxes)
 */
export const STEVENSON_SCREEN_BOXES: readonly Box[] = [
  // 4 stone footing pads
  [-0.44, 0.05, -0.38, 0.22, 0.10, 0.22, ROCK_DARK],
  [0.44, 0.05, -0.38, 0.22, 0.10, 0.22, ROCK_DARK],
  [-0.44, 0.05, 0.38, 0.22, 0.10, 0.22, ROCK_DARK],
  [0.44, 0.05, 0.38, 0.22, 0.10, 0.22, ROCK_DARK],
  // 4 white wooden legs
  [-0.44, 0.52, -0.38, 0.11, 0.88, 0.11, WHITE],
  [0.44, 0.52, -0.38, 0.11, 0.88, 0.11, WHITE],
  [-0.44, 0.52, 0.38, 0.11, 0.88, 0.11, WHITE],
  [0.44, 0.52, 0.38, 0.11, 0.88, 0.11, WHITE],
  // Leg cross-bars
  [0, 0.38, -0.38, 0.88, 0.07, 0.07, ICE],
  [0, 0.38, 0.38, 0.88, 0.07, 0.07, ICE],
  [-0.44, 0.46, 0, 0.07, 0.07, 0.76, ICE],
  [0.44, 0.46, 0, 0.07, 0.07, 0.76, ICE],
  // Screen floor platform & main cabinet core (dark shadow core behind white louvers)
  [0, 0.94, 0, 1.12, 0.08, 0.94, ICE],
  [0, 1.36, 0, 0.98, 0.78, 0.80, SEA_GREY],
  // Corner posts of louvered cabinet
  [-0.50, 1.36, 0.41, 0.09, 0.80, 0.09, WHITE],
  [0.50, 1.36, 0.41, 0.09, 0.80, 0.09, WHITE],
  [-0.50, 1.36, -0.41, 0.09, 0.80, 0.09, WHITE],
  [0.50, 1.36, -0.41, 0.09, 0.80, 0.09, WHITE],
  // Horizontal louver slats (celosías) wrapping all 4 sides at 5 heights
  [0, 1.06, 0, 1.06, 0.07, 0.88, WHITE],
  [0, 1.21, 0, 1.06, 0.07, 0.88, WHITE],
  [0, 1.36, 0, 1.06, 0.07, 0.88, WHITE],
  [0, 1.51, 0, 1.06, 0.07, 0.88, WHITE],
  [0, 1.66, 0, 1.06, 0.07, 0.88, WHITE],
  // Front door frame & latch (+z)
  [0, 1.36, 0.45, 0.86, 0.74, 0.03, WHITE],
  [0, 1.16, 0.47, 0.74, 0.04, 0.03, SEA_GREY],
  [0, 1.36, 0.47, 0.74, 0.04, 0.03, SEA_GREY],
  [0, 1.56, 0.47, 0.74, 0.04, 0.03, SEA_GREY],
  [0.36, 1.36, 0.48, 0.05, 0.10, 0.04, BLACK],
  // Ventilated double roof with overhang
  [0, 1.79, 0, 1.18, 0.06, 1.00, ICE],
  [0, 1.88, -0.02, 1.28, 0.08, 1.10, WHITE],
  [0, 1.95, -0.04, 1.16, 0.06, 0.92, ICE],
  // Front 2-step wooden observer staircase
  [0, 0.34, 0.68, 0.68, 0.10, 0.32, WOOD_LIGHT],
  [0, 0.18, 0.90, 0.68, 0.10, 0.32, WOOD_LIGHT],
  [0, 0.18, 0.76, 0.62, 0.28, 0.48, WOOD],
];

/**
 * 6. Wind Mast & Anemometer (fixed mast + rotating vane + rotating 3-cup Robinson rotor).
 * 16 + 7 + 9 = 32 boxes total.
 */
export const WIND_MAST_BASE_BOXES: readonly Box[] = [
  // Stone/concrete base & guy-wire collar
  [0, 0.14, 0, 0.76, 0.28, 0.76, ROCK_DARK],
  [0, 0.34, 0, 0.50, 0.16, 0.50, ROCK],
  // Stepped steel mast shaft
  [0, 1.35, 0, 0.18, 1.90, 0.18, BLACK],
  [0, 2.95, 0, 0.14, 1.40, 0.14, BLACK],
  [0, 3.95, 0, 0.10, 0.80, 0.10, ZINC],
  // Recorder junction box near base
  [0.16, 1.15, 0, 0.18, 0.34, 0.26, CREAM],
  [0.17, 1.15, 0, 0.18, 0.26, 0.18, ORANGE],
  // Climbing rungs up the mast
  [0, 0.85, 0.14, 0.28, 0.04, 0.04, ZINC],
  [0, 1.45, -0.14, 0.28, 0.04, 0.04, ZINC],
  [0, 2.05, 0.14, 0.26, 0.04, 0.04, ZINC],
  [0, 2.65, -0.14, 0.24, 0.04, 0.04, ZINC],
  [0, 3.25, 0.12, 0.22, 0.04, 0.04, ZINC],
  // Fixed cardinal direction cross-arms below the vane
  [0, 3.55, 0, 0.92, 0.05, 0.05, ZINC],
  [0, 3.55, 0, 0.05, 0.05, 0.92, ZINC],
  // Guy-wire anchor blocks on ground
  [-0.65, 0.06, 0.65, 0.18, 0.12, 0.18, ROCK_DARK],
  [0.65, 0.06, -0.65, 0.18, 0.12, 0.18, ROCK_DARK],
];

export const WIND_VANE_BOXES: readonly Box[] = [
  // Central rotating collar & horizontal boom
  [0, 0, 0, 0.16, 0.14, 0.16, ZINC],
  [0, 0, 0, 1.12, 0.05, 0.05, BLACK],
  // Pointed arrow head (+x)
  [0.52, 0, 0, 0.18, 0.10, 0.10, ORANGE],
  [0.64, 0, 0, 0.12, 0.06, 0.06, RED],
  // Split tail fin (-x)
  [-0.46, 0.04, 0, 0.26, 0.22, 0.04, BLACK],
  [-0.56, 0.08, 0.05, 0.16, 0.18, 0.03, ORANGE],
  [-0.56, 0.08, -0.05, 0.16, 0.18, 0.03, ORANGE],
];

export const WIND_CUPS_BOXES: readonly Box[] = [
  // Central rotor hub & spindle
  [0, -0.06, 0, 0.10, 0.22, 0.10, ZINC],
  [0, 0.04, 0, 0.18, 0.08, 0.18, BLACK],
  // Arm 1 (+x) + voxel cup
  [0.28, 0.04, 0, 0.48, 0.04, 0.04, BLACK],
  [0.54, 0.04, 0, 0.16, 0.16, 0.16, RED],
  [0.54, 0.04, 0.05, 0.10, 0.10, 0.08, BLACK],
  // Arm 2 (-x, +z) + voxel cup
  [-0.14, 0.04, 0.24, 0.04, 0.04, 0.48, BLACK],
  [-0.27, 0.04, 0.46, 0.16, 0.16, 0.16, RED],
  // Arm 3 (-x, -z) + voxel cup
  [-0.14, 0.04, -0.24, 0.04, 0.04, 0.48, BLACK],
  [-0.27, 0.04, -0.46, 0.16, 0.16, 0.16, RED],
];

/**
 * 7. Argentine Flagpole (stepped stone cairn + white mast + 5 articulated flag segments).
 * 16 base boxes + 20 flag boxes = 36 boxes total.
 */
export const FLAGPOLE_BASE_BOXES: readonly Box[] = [
  // Stepped dry-stone cairn base
  [0, 0.10, 0, 1.32, 0.20, 1.32, ROCK_DARK],
  [0, 0.20, 0, 1.12, 0.22, 1.12, ROCK],
  [0, 0.36, 0, 0.92, 0.20, 0.92, 0x767b78],
  [0, 0.50, 0, 0.68, 0.16, 0.68, ROCK_LIGHT],
  [-0.55, 0.16, 0.52, 0.24, 0.22, 0.24, ROCK],
  [0.52, 0.16, -0.55, 0.24, 0.22, 0.24, ROCK_DARK],
  // White stepped flagpole mast
  [0, 1.45, 0, 0.18, 1.80, 0.18, WHITE],
  [0, 2.95, 0, 0.15, 1.50, 0.15, WHITE],
  [0, 4.15, 0, 0.12, 1.20, 0.12, ICE],
  // Mast collar, cleat & halyard rope
  [0, 0.64, 0, 0.28, 0.12, 0.28, ZINC],
  [0.11, 1.25, 0, 0.08, 0.18, 0.06, BLACK],
  [0.09, 2.65, 0, 0.03, 2.80, 0.03, CREAM],
  // Top truck pulley & golden finial ball
  [0, 4.78, 0, 0.20, 0.08, 0.20, ZINC],
  [0, 4.90, 0, 0.22, 0.20, 0.22, LAMP],
  // Small plaque on cairn
  [0, 0.36, 0.48, 0.28, 0.16, 0.04, ORANGE],
  [0, 0.36, 0.50, 0.22, 0.10, 0.03, BLACK],
];

/**
 * Builds 5 articulated vertical segments of the voxel Argentine flag so they can wave
 * in the wind by rigid parts. Total across the 5 segments = 20 boxes.
 */
export function buildFlagSegmentGeometries(): BufferGeometry[] {
  const segWidth = 0.38;
  const segments: Box[][] = [0, 1, 2, 3, 4].map((idx) => {
    const cx = segWidth / 2;
    const thick = idx === 0 ? 0.07 : 0.055;
    const base: Box[] = [
      // Top celeste stripe
      [cx, 0.36, 0, segWidth + 0.02, 0.36, thick, SKY],
      // Middle white stripe
      [cx, 0.0, 0, segWidth + 0.02, 0.36, thick, WHITE],
      // Bottom celeste stripe
      [cx, -0.36, 0, segWidth + 0.02, 0.36, thick, SKY],
    ];
    // Sol de Mayo on segments 1 and 2
    if (idx === 1) {
      base.push([cx + 0.06, 0.0, 0, 0.22, 0.22, thick + 0.025, LAMP]);
      base.push([cx + 0.06, 0.0, 0, 0.28, 0.10, thick + 0.018, ORANGE]);
    } else if (idx === 2) {
      base.push([cx - 0.06, 0.0, 0, 0.22, 0.22, thick + 0.025, LAMP]);
      base.push([cx - 0.06, 0.0, 0, 0.10, 0.28, thick + 0.018, ORANGE]);
    } else {
      // Subtle cloth seam / border detail so every segment has 4 boxes
      base.push([cx, 0.53, 0, segWidth, 0.03, thick + 0.006, ICE]);
    }
    return base;
  });

  return segments.map((boxes) => buildBoxGeometry(boxes));
}

/**
 * 8. Supply Crates & Fuel Drums (cajones de campaña sobre pallet).
 * 22 boxes.
 */
export const SUPPLY_CRATES_BOXES: readonly Box[] = [
  // Wooden pallet base
  [0, 0.05, 0, 1.85, 0.10, 1.35, WOOD],
  [0, 0.11, 0, 1.78, 0.04, 1.28, BROWN],
  // Large wooden crate 1
  [-0.38, 0.42, 0.12, 0.86, 0.60, 0.72, WOOD_LIGHT],
  [-0.38, 0.73, 0.12, 0.90, 0.06, 0.76, WOOD],
  [-0.78, 0.42, 0.46, 0.08, 0.62, 0.08, BROWN],
  [0.02, 0.42, 0.46, 0.08, 0.62, 0.08, BROWN],
  [-0.38, 0.46, 0.49, 0.42, 0.12, 0.03, BLACK],
  // Medium wooden crate 2 beside it
  [0.44, 0.36, 0.18, 0.66, 0.48, 0.62, WOOD],
  [0.44, 0.61, 0.18, 0.70, 0.05, 0.66, BROWN],
  [0.44, 0.38, 0.50, 0.34, 0.10, 0.03, CREAM],
  // Upper stacked small crate 3
  [-0.28, 0.96, 0.08, 0.58, 0.42, 0.52, CREAM],
  [-0.28, 1.18, 0.08, 0.62, 0.05, 0.56, WOOD],
  [-0.28, 0.96, 0.35, 0.28, 0.08, 0.03, BLACK],
  // Folded grey canvas tarpaulin
  [0.38, 0.72, 0.15, 0.54, 0.18, 0.48, SEA_GREY],
  [0.38, 0.82, 0.15, 0.44, 0.08, 0.38, ZINC],
  // 2 Antarctic fuel drums at back (-z)
  [-0.45, 0.46, -0.42, 0.44, 0.70, 0.44, RED],
  [-0.45, 0.46, -0.42, 0.48, 0.08, 0.48, ZINC],
  [-0.45, 0.82, -0.42, 0.46, 0.05, 0.46, BLACK],
  [0.12, 0.46, -0.42, 0.44, 0.70, 0.44, RED_DARK],
  [0.12, 0.46, -0.42, 0.48, 0.08, 0.48, ZINC],
  [0.12, 0.82, -0.42, 0.46, 0.05, 0.46, BLACK],
  // Snow drift on crate corner
  [-0.52, 0.76, -0.10, 0.36, 0.06, 0.32, WHITE],
];

/**
 * 9. Station Whaleboat / Chalupa pulled up on the gravel shore (+x bow, +y up).
 * 24 boxes.
 */
export const STATION_BOAT_BOXES: readonly Box[] = [
  // Keel, stem (+x) and sternpost (-x)
  [0, 0.06, 0, 2.30, 0.12, 0.16, BROWN_DARK],
  [1.18, 0.28, 0, 0.18, 0.48, 0.16, BROWN_DARK],
  [-1.16, 0.26, 0, 0.18, 0.44, 0.18, BROWN_DARK],
  // Stepped red lower hull
  [0, 0.16, 0, 1.92, 0.16, 0.82, RED],
  [0.82, 0.18, 0, 0.48, 0.16, 0.56, RED],
  [-0.82, 0.18, 0, 0.48, 0.16, 0.58, RED],
  [1.06, 0.22, 0, 0.24, 0.18, 0.32, RED],
  [-1.04, 0.22, 0, 0.24, 0.18, 0.36, RED],
  // White upper hull strakes (port & starboard)
  [0, 0.32, 0.42, 1.88, 0.16, 0.10, WHITE],
  [0, 0.32, -0.42, 1.88, 0.16, 0.10, WHITE],
  [0.84, 0.34, 0.26, 0.46, 0.16, 0.10, WHITE],
  [0.84, 0.34, -0.26, 0.46, 0.16, 0.10, WHITE],
  [-0.84, 0.34, 0.26, 0.46, 0.16, 0.10, WHITE],
  [-0.84, 0.34, -0.26, 0.46, 0.16, 0.10, WHITE],
  // Wooden gunwale trim & interior floorboards
  [0, 0.42, 0.44, 1.92, 0.06, 0.12, WOOD],
  [0, 0.42, -0.44, 1.92, 0.06, 0.12, WOOD],
  [0, 0.20, 0, 1.72, 0.06, 0.66, WOOD_LIGHT],
  // 4 wooden rowing thwarts (benches)
  [-0.62, 0.32, 0, 0.18, 0.06, 0.72, WOOD_LIGHT],
  [-0.18, 0.32, 0, 0.18, 0.06, 0.80, WOOD_LIGHT],
  [0.26, 0.32, 0, 0.18, 0.06, 0.80, WOOD_LIGHT],
  [0.68, 0.32, 0, 0.18, 0.06, 0.64, WOOD_LIGHT],
  // Pair of wooden oars resting across thwarts + coiled bow rope
  [-0.08, 0.38, 0.16, 1.48, 0.05, 0.07, WOOD],
  [-0.08, 0.38, -0.16, 1.48, 0.05, 0.07, WOOD],
  [0.98, 0.36, 0, 0.22, 0.08, 0.22, CREAM],
];

/**
 * 10. Voxel Icebergs (reused from sightingModels SEA_MODELS)
 * and Sea-Ice Floe slabs (16 boxes).
 */
export const ICEBERG_TABULAR_BOXES: readonly Box[] = new Proxy([] as unknown as Box[], {
  get(_target, prop) {
    return (SEA_MODELS['iceberg-lg'] as unknown as Record<string | symbol, unknown>)[prop];
  },
});
export const ICEBERG_PINNACLE_BOXES: readonly Box[] = new Proxy([] as unknown as Box[], {
  get(_target, prop) {
    return (SEA_MODELS['iceberg-sm'] as unknown as Record<string | symbol, unknown>)[prop];
  },
});

/**
 * Faceted voxel sea-ice floe (bandejón de hielo marino) with pressure-ridge rim. (16 boxes)
 */
export const SEA_ICE_FLOE_BOXES: readonly Box[] = [
  // Submerged pale-blue underside
  [0, -0.04, 0, 1.72, 0.08, 1.48, ICE_BLUE],
  // Main polygonal-feel stepped slab
  [0, 0.04, 0, 1.66, 0.10, 1.42, WHITE],
  [0.12, 0.04, 0.06, 1.32, 0.11, 1.68, WHITE],
  [-0.10, 0.04, -0.08, 1.84, 0.10, 1.12, ICE],
  [0.38, 0.04, -0.34, 0.96, 0.10, 0.96, WHITE],
  [-0.42, 0.04, 0.32, 0.92, 0.10, 0.92, ICE],
  // Raised snow & pressure-ridge rims along floe edges
  [-0.64, 0.11, 0.12, 0.42, 0.07, 0.86, WHITE],
  [0.58, 0.11, -0.14, 0.38, 0.07, 0.82, ICE],
  [0.08, 0.11, 0.62, 0.88, 0.07, 0.34, WHITE],
  [-0.12, 0.11, -0.58, 0.84, 0.07, 0.32, ICE],
  // Central snow hummock & tilted ice blocks
  [0.06, 0.10, -0.04, 0.76, 0.06, 0.68, WHITE],
  [-0.22, 0.14, -0.18, 0.28, 0.08, 0.24, ICE_BLUE],
  [0.28, 0.13, 0.22, 0.24, 0.07, 0.26, WHITE],
  // Small satellite brash pieces
  [0.98, 0.02, 0.36, 0.26, 0.08, 0.28, ICE],
  [-0.96, 0.02, -0.32, 0.28, 0.08, 0.24, WHITE],
  [0.18, 0.02, -0.94, 0.30, 0.08, 0.24, ICE_BLUE],
];

// ============================================================================
// 3. TERRAIN & INSTANCE GENERATORS
// ============================================================================

function hash2D(ix: number, iz: number, seed: number): number {
  let n = ix * 374761393 + iz * 668265263 + seed * 1442695041;
  n = (n ^ (n >> 13)) * 1274126177;
  return ((n ^ (n >> 16)) >>> 0) / 4294967296;
}

function smoothNoise2D(x: number, z: number, seed: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);

  const a = hash2D(ix, iz, seed);
  const b = hash2D(ix + 1, iz, seed);
  const c = hash2D(ix, iz + 1, seed);
  const d = hash2D(ix + 1, iz + 1, seed);

  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}

function fbm2D(x: number, z: number, seed: number): number {
  let val = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < 4; i++) {
    val += amp * smoothNoise2D(x * freq, z * freq, seed + i * 31);
    freq *= 2.05;
    amp *= 0.5;
  }
  return val;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Evaluates terrain elevation (y in world units, sea level = 0) and surface weights
 * [gravel, snow, rock] at world coordinates (x, z) on the Laurie Island isthmus.
 */
export function evaluateIsthmusTerrain(
  x: number,
  z: number,
  seed = 19040222
): { y: number; gravel: number; snow: number; rock: number } {
  const nLow = fbm2D(x * 0.08, z * 0.08, seed);
  const nMid = fbm2D(x * 0.22, z * 0.22, seed + 101);

  // 1. Central isthmus saddle between Bahía Uruguay (-Z) and Bahía Scotia (+Z)
  const isthmusXMask = 1 - smoothstep(14, 26, Math.abs(x));
  const beachHalfWidth = 9.2 + 1.8 * smoothstep(6, 16, Math.abs(x)) + (nLow - 0.5) * 1.6;
  const isthmusZProfile = Math.exp(-Math.pow(z / beachHalfWidth, 2) * 1.45);
  const isthmusHeight = (2.35 * isthmusZProfile - 0.72) * isthmusXMask;

  // Flatten the central station plateau around [-8..7, -4..4] so buildings sit cleanly at y = 1.45
  const stationPad =
    (1 - smoothstep(6.8, 11.8, Math.abs(x))) * (1 - smoothstep(3.8, 7.6, Math.abs(z)));

  // 2. Western headland (Mossman Peninsula side, x < -11) — prominent glacier-draped ridge
  const westAdvance = smoothstep(-9.5, -32, x);
  const westZEnvelope = Math.exp(-Math.pow((z + 1.0) / 28, 2));
  const westRidge =
    westAdvance *
    westZEnvelope *
    (15.5 + 9.5 * nLow + 4.2 * Math.abs(nMid - 0.5));

  // 3. Eastern mountain massif & outlet glacier (x > 9.5) — tall glaciated peaks framing the bay
  const eastAdvance = smoothstep(9.0, 32, x);
  const eastZEnvelope = Math.exp(-Math.pow((z - 0.5) / 30, 2));
  const eastMassif =
    eastAdvance *
    eastZEnvelope *
    (18.0 + 11.5 * nLow + 4.6 * Math.abs(nMid - 0.5));

  // Penguin colony terrace on the lower SE slope around (8.8, 5.2)
  const colonyDist = Math.hypot((x - 8.8) / 5.2, (z - 5.2) / 5.2);
  const colonyTerrace = Math.max(0, 1 - colonyDist * colonyDist) * 1.65;

  // Combine elevation
  let y = isthmusHeight + westRidge + eastMassif + colonyTerrace;
  if (stationPad > 0.01) {
    y = y * (1 - stationPad * 0.72) + 1.45 * (stationPad * 0.72);
  }

  // Deepen open bays outside the headlands so northern & southern horizons stay clear ocean
  const bayOpenMask =
    (1 - smoothstep(11.5, 22, Math.abs(x))) * smoothstep(8.5, 15.5, Math.abs(z));
  y -= bayOpenMask * 2.8;

  // Surface category weights (separate channels: gravel, snow, rock)
  const isGlacierValley =
    smoothstep(7.5, 18.5, Math.abs(x)) * (1 - smoothstep(4, 20, Math.abs(z)));
  const isSteep = smoothstep(2.8, 9.0, y) * (1 - isGlacierValley * 0.68);
  const snowPatch = smoothstep(0.28, 0.50, nLow + y * 0.09 + isGlacierValley * 0.62);

  const rock = Math.min(1, Math.max(0, isSteep * 0.74));
  const snow = Math.min(
    1,
    Math.max(0, (1 - rock * 0.52) * Math.max(snowPatch, smoothstep(2.2, 6.8, y)))
  );
  const gravel = Math.max(0.05, 1 - Math.min(0.95, rock + snow * 0.88));

  return { y, gravel, snow, rock };
}

export function createIsthmusTerrainGeometry(seed = 19040222): BufferGeometry {
  const geo = new PlaneGeometry(130, 130, 56, 56);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position;
  const count = pos.count;
  const surface = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const { y, gravel, snow, rock } = evaluateIsthmusTerrain(x, z, seed);
    pos.setY(i, y);
    surface[i * 3] = gravel;
    surface[i * 3 + 1] = snow;
    surface[i * 3 + 2] = rock;
  }

  pos.needsUpdate = true;
  geo.setAttribute('aSurface', new BufferAttribute(surface, 3));
  geo.computeVertexNormals();
  return geo;
}

export function generateSeaIcePlates(seed = 190406): SeaIcePlate[] {
  const rng = createSeededRng(seed);
  const plates: SeaIcePlate[] = [];

  // Place faceted sea-ice floes across Bahía Scotia (+Z) and Bahía Uruguay (-Z),
  // closing progressively from the coastline outward as seaIce goes from 0 -> 1.
  for (const baySign of [1, -1]) {
    for (let row = 0; row < 7; row++) {
      const zBase = baySign * (10.2 + row * 4.2);
      const cols = 9 + row * 2;
      for (let col = 0; col < cols; col++) {
        const spanX = 15 + row * 3.2;
        const u = (col + 0.5) / cols - 0.5;
        const x = u * spanX * 2 + (rng() - 0.5) * 2.1;
        const z = zBase + (rng() - 0.5) * 1.9;
        const { y } = evaluateIsthmusTerrain(x, z);
        if (y > -0.12) continue;

        // Shore-hugging floes freeze first (low threshold); outer bay freezes later
        const distFromShore = row / 6.5;
        const edgeBonus = Math.max(0, 0.16 - Math.abs(u) * 0.28);
        const threshold = Math.min(
          0.92,
          Math.max(0.04, distFromShore * 0.72 + edgeBonus + (rng() - 0.5) * 0.12)
        );
        plates.push({
          x,
          z,
          radius: 1.45 + rng() * 1.55,
          rotY: rng() * Math.PI * 2,
          threshold,
        });
      }
    }
  }

  return plates;
}

export function generateIcebergs(seed = 190409): IcebergInstance[] {
  const rng = createSeededRng(seed);
  const coords: readonly [number, number, number, 'tabular' | 'pinnacle'][] = [
    // Northern bay (Bahía Uruguay, -Z — directly in the camera's horizon view!)
    [-8.5, -20.5, 1.65, 'tabular'],
    [5.8, -23.5, 1.85, 'pinnacle'],
    [-1.2, -29.0, 2.15, 'tabular'],
    [13.2, -26.0, 1.55, 'pinnacle'],
    [-15.5, -25.0, 1.60, 'pinnacle'],
    // Southern bay (Bahía Scotia, +Z)
    [-9.2, 20.5, 1.45, 'pinnacle'],
    [7.5, 23.5, 1.65, 'tabular'],
    [-2.0, 29.5, 1.90, 'tabular'],
    [14.0, 27.0, 1.35, 'pinnacle'],
  ];

  return coords.map(([x, z, s, variant]) => ({
    x,
    z,
    scaleX: s * (0.92 + rng() * 0.28),
    scaleY: s * (0.88 + rng() * 0.34),
    scaleZ: s * (0.90 + rng() * 0.28),
    rotY: rng() * Math.PI * 2,
    phase: rng() * Math.PI * 2,
    variant,
  }));
}

/**
 * Generates a penguin colony on the eastern slope and beach path of Laurie Island:
 * - A clear marching line ('walk') of upright Adélie and Chinstrap penguins waddling in file
 * - Several penguins tobogganing on their bellies ('slide') down the snowy slope.
 */
export function generatePenguinColony(seed = 190411): PenguinInstance[] {
  const rng = createSeededRng(seed);
  const penguins: PenguinInstance[] = [];

  // 12 upright penguins marching in a winding line along the lower SE slope & beach terrace
  const marchCount = 12;
  for (let i = 0; i < marchCount; i++) {
    const t = i / (marchCount - 1);
    const x = 6.2 + t * 5.6 + Math.sin(t * Math.PI * 2) * 0.45;
    const z = 7.4 - t * 4.2 + Math.cos(t * Math.PI * 1.5) * 0.35;
    const nextT = Math.min(1, t + 0.08);
    const nx = 6.2 + nextT * 5.6 + Math.sin(nextT * Math.PI * 2) * 0.45;
    const nz = 7.4 - nextT * 4.2 + Math.cos(nextT * Math.PI * 1.5) * 0.35;
    // Beak points to +x in local space, so rotY = atan2(-(nz - z), nx - x)
    const heading = Math.atan2(-(nz - z), nx - x);
    const { y } = evaluateIsthmusTerrain(x, z);
    penguins.push({
      x,
      y: Math.max(0.42, y),
      z,
      rotY: heading + (rng() - 0.5) * 0.25,
      phase: i * 0.65,
      speed: 0.95 + (i % 3) * 0.12,
      mode: 'walk',
      species: i % 2 === 0 ? 'adelie' : 'chinstrap',
      lineIndex: i,
    });
  }

  // 4 penguins tobogganing on their bellies down the snow slope toward the beach
  const slideCoords: readonly [number, number][] = [
    [9.4, 5.8],
    [10.8, 6.4],
    [11.6, 5.1],
    [8.2, 6.6],
  ];
  for (let i = 0; i < slideCoords.length; i++) {
    const [x, z] = slideCoords[i];
    const { y } = evaluateIsthmusTerrain(x, z);
    penguins.push({
      x,
      y: Math.max(0.55, y),
      z,
      // Point downhill toward the southern beach (-x, +z)
      rotY: -Math.PI * 0.68 + (rng() - 0.5) * 0.2,
      phase: i * 1.4,
      speed: 0.85 + rng() * 0.35,
      mode: 'slide',
      species: i % 2 === 0 ? 'adelie' : 'chinstrap',
      lineIndex: marchCount + i,
    });
  }

  return penguins;
}

export function generateSnowParticles(count: number, seed = 190412): Float32Array {
  const rng = createSeededRng(seed);
  const data = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    data[i * 3] = (rng() - 0.5) * 56;
    data[i * 3 + 1] = rng() * 18 + 0.4;
    data[i * 3 + 2] = (rng() - 0.5) * 56;
  }
  return data;
}
