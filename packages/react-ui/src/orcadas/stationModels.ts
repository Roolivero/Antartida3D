import { BufferAttribute, BufferGeometry, PlaneGeometry } from 'three';
import {
  DIORAMA_METERS_PER_UNIT,
  createSeededRng,
  STAGE_HALF_EXTENT,
  STATION_GROUND_Y,
  STATION_LAYOUT,
  worldCoastDistance,
  type RoofShape,
  type SiteColour,
} from '@antartida/core';
import { buildBoxGeometry, type Box } from '../voyage/vehicles.ts';
import { SEA_MODELS } from '../voyage/sightingModels.ts';

/** Building colours: orange from OpenStreetMap Maxar imagery, neutral grey for unassigned modules. */
export const OSM_ORANGE = 0xff4500;
export const UNKNOWN_BUILDING_COLOUR = 0x82888a;

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
  CREAM,
  WOOD,
  WOOD_LIGHT,
  SEA_GREY,
  BROWN,
  BROWN_DARK,
  LAMP,
  ZINC,
  SKY,
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

export function resolveBuildingColour(colour?: SiteColour): number {
  switch (colour) {
    case 'orange':
      return OSM_ORANGE;
    case 'black':
      return VOXEL_PALETTE.BLACK;
    case 'stone':
      return VOXEL_PALETTE.ROCK;
    case 'unknown':
    default:
      return UNKNOWN_BUILDING_COLOUR;
  }
}

/**
 * Generic modular station building with real measured dimensions.
 * Long side along local +x, base at y = 0, centered on origin.
 */
export function buildModuleBoxes(
  length: number,
  width: number,
  height: number,
  colour?: SiteColour,
  roof: RoofShape = 'flat',
  isNight = false
): Box[] {
  const bodyCol = resolveBuildingColour(colour);
  const winCol = isNight ? LAMP : WINDOW_DAY;
  // Photos: buildings on a black plinth (stilts), walls with a row of small windows.
  const plinthH = Math.max(0.08, height * 0.16);
  const roofH = roof === 'flat' ? height * 0.12 : height * 0.42;
  const wallH = height - plinthH - roofH;
  const y0 = plinthH + wallH;
  const winS = Math.min(0.2, wallH * 0.42);
  const winY = plinthH + wallH * 0.58;
  const doorW = Math.min(0.24, width * 0.3);
  const doorH = Math.min(wallH * 0.82, 0.42);

  const boxes: Box[] = [
    [0, plinthH / 2, 0, length * 0.96, plinthH, width * 0.9, BLACK],
    [0, plinthH + wallH / 2, 0, length, wallH, width, bodyCol],
    // Door on the short end (+x), with a black frame and a step
    [length / 2 + 0.012, plinthH + doorH / 2, 0, 0.03, doorH + 0.04, doorW + 0.05, BLACK],
    [length / 2 + 0.022, plinthH + doorH / 2, 0, 0.02, doorH, doorW, CREAM],
    [length / 2 + 0.09, plinthH * 0.5, 0, 0.16, plinthH, doorW + 0.08, ZINC],
  ];
  // A row of windows along both long sides, about one every 0.55 units.
  const count = Math.max(1, Math.floor((length - 0.3) / 0.55));
  for (let i = 0; i < count; i++) {
    const x = -length / 2 + ((i + 0.5) * length) / count;
    for (const side of [1, -1]) {
      const z = (side * width) / 2;
      boxes.push(
        [x, winY, z + side * 0.012, winS + 0.04, winS + 0.04, 0.02, BLACK],
        [x, winY, z + side * 0.022, winS, winS, 0.02, winCol]
      );
    }
  }

  if (roof === 'round') {
    // Vault: three stepped layers, darker eaves along the walls.
    boxes.push(
      [0, y0 + roofH * 0.08, 0, length + 0.06, roofH * 0.16, width + 0.06, BLACK],
      [0, y0 + roofH * 0.3, 0, length + 0.04, roofH * 0.3, width * 0.92, bodyCol],
      [0, y0 + roofH * 0.6, 0, length + 0.02, roofH * 0.3, width * 0.68, bodyCol],
      [0, y0 + roofH * 0.86, 0, length, roofH * 0.24, width * 0.36, bodyCol]
    );
    // Seams of the curved roof panels, about one every 0.9 units.
    const seams = Math.floor(length / 0.9);
    for (let i = 1; i <= seams; i++) {
      const x = -length / 2 + (i * length) / (seams + 1);
      boxes.push([x, y0 + roofH * 0.62, 0, 0.035, roofH * 0.62, width * 0.94, BLACK]);
    }
  } else if (roof === 'gabled') {
    // Two slopes in steps, with a dark ridge.
    boxes.push(
      [0, y0 + roofH * 0.08, 0, length + 0.08, roofH * 0.16, width + 0.1, BLACK],
      [0, y0 + roofH * 0.3, 0, length + 0.06, roofH * 0.28, width * 0.82, bodyCol],
      [0, y0 + roofH * 0.56, 0, length + 0.04, roofH * 0.26, width * 0.52, bodyCol],
      [0, y0 + roofH * 0.8, 0, length + 0.02, roofH * 0.22, width * 0.24, bodyCol],
      [0, y0 + roofH * 0.95, 0, length + 0.04, roofH * 0.1, width * 0.1, BLACK]
    );
  } else {
    // Flat roof with a parapet and a small vent.
    boxes.push(
      [0, y0 + roofH / 2, 0, length + 0.04, roofH, width + 0.04, BLACK],
      [-length * 0.25, y0 + roofH + 0.06, 0, Math.min(0.3, length * 0.15), 0.12, width * 0.3, ZINC]
    );
  }
  return boxes;
}

/**
 * 1. Omond House (1903 Scottish expedition stone cabin).
 * Real plan 9.0 x 4.6 m. The Antarctic Treaty Secretariat (HSM 42) states that the
 * stone walls are partially standing.
 */
export function buildOmondBoxes(_isNight = false): Box[] {
  const l = 9.0 / DIORAMA_METERS_PER_UNIT;
  const w = 4.6 / DIORAMA_METERS_PER_UNIT;
  const t = 0.16;
  const boxes: Box[] = [
    // Stone floor inside the ruin
    [0, 0.03, 0, l, 0.06, w, ROCK_DARK],
    // Back wall, still standing almost whole, with a broken top
    [0, 0.3, -w / 2 + t / 2, l, 0.5, t, ROCK],
    [-l * 0.3, 0.6, -w / 2 + t / 2, l * 0.35, 0.12, t, ROCK_LIGHT],
    [l * 0.2, 0.58, -w / 2 + t / 2, l * 0.25, 0.08, t, ROCK],
    // Side walls stepping down towards the front
    [-l / 2 + t / 2, 0.24, 0, t, 0.42, w, ROCK_LIGHT],
    [-l / 2 + t / 2, 0.5, -w * 0.2, t, 0.12, w * 0.5, ROCK],
    [l / 2 - t / 2, 0.2, -w * 0.1, t, 0.34, w * 0.8, ROCK],
    // Front wall: only low stretches remain, with the gap of the old door
    [-l * 0.3, 0.13, w / 2 - t / 2, l * 0.38, 0.2, t, ROCK],
    [l * 0.33, 0.1, w / 2 - t / 2, l * 0.3, 0.14, t, ROCK_DARK],
    // Stone chimney stub at the west end
    [-l / 2 + 0.2, 0.7, -w / 2 + 0.2, 0.3, 0.3, 0.3, ROCK_DARK],
    // Fallen stones and a weathered beam inside
    [0.15, 0.1, 0.05, 0.3, 0.12, 0.22, ROCK_LIGHT],
    [-0.3, 0.09, 0.15, 0.2, 0.1, 0.2, ROCK],
    [0.1, 0.13, -0.15, l * 0.5, 0.06, 0.08, WOOD],
    // Small plaque of the historic site (HSM 42) by the doorway
    [0.02, 0.18, w / 2 + 0.12, 0.05, 0.36, 0.05, BROWN_DARK],
    [0.02, 0.38, w / 2 + 0.12, 0.3, 0.18, 0.04, CREAM],
    // Snow drifted against the back wall
    [l * 0.1, 0.07, -w / 2 + t + 0.1, l * 0.6, 0.08, 0.18, ICE],
  ];
  return boxes;
}

/**
 * 6. Single lattice radio tower (red and white sections per reference photos).
 */
export function buildRadioTowerBoxes(height = 30 / DIORAMA_METERS_PER_UNIT): Box[] {
  const boxes: Box[] = [
    // Concrete foundation pad
    [0, 0.08, 0, 0.6, 0.16, 0.6, ROCK_DARK],
    [0, 0.18, 0, 0.44, 0.08, 0.44, ROCK],
  ];
  const sections = 7;
  const secH = (height - 0.22) / sections;
  for (let s = 0; s < sections; s++) {
    const col = s % 2 === 0 ? RED : WHITE;
    const yBot = 0.22 + s * secH;
    const taper = 1 - (s / sections) * 0.65;
    const legOffset = 0.18 * taper;
    const legThick = Math.max(0.035, 0.06 * taper);
    boxes.push([-legOffset, yBot + secH / 2, -legOffset, legThick, secH, legThick, col]);
    boxes.push([legOffset, yBot + secH / 2, -legOffset, legThick, secH, legThick, col]);
    boxes.push([-legOffset, yBot + secH / 2, legOffset, legThick, secH, legThick, col]);
    boxes.push([legOffset, yBot + secH / 2, legOffset, legThick, secH, legThick, col]);
    boxes.push([0, yBot + secH, 0, legOffset * 2.2, legThick * 0.8, legOffset * 2.2, col]);
  }
  boxes.push([0, height + 0.15, 0, 0.04, 0.30, 0.04, BLACK]);
  return boxes;
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

const lerpNumber = (a: number, b: number, t: number) => a + (b - a) * t;

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** Half side of the terrain square, in world units. */
export const TERRAIN_HALF_EXTENT = STAGE_HALF_EXTENT;

/**
 * Rocky knoll of the penguin colony (reconstruction: no source places the colony). It sits on
 * the left end of the stage, above Bahía Scotia, so the penguins can toboggan down to the water.
 */
export const PENGUIN_KNOLL = {
  center: [-7.4, 1.0] as const,
  /** Radius of the flat top where the nests are, in world units. */
  topRadius: 1.4,
  /** Radius where the knoll meets the ground. */
  footRadius: 3.2,
  /** Height of the top above the surrounding ground. */
  height: 1.1,
} as const;

/** 0 to 1: how much a point belongs to the station pad (flat ground around each footprint). */
function padWeight(x: number, z: number): number {
  let w = 0;
  for (const e of STATION_LAYOUT) {
    if (e.id === 'boat') continue;
    const r = Math.hypot(e.footprint[0], e.footprint[1]) / 2;
    const d = Math.hypot(x - e.position[0], z - e.position[2]) - r;
    w = Math.max(w, 1 - smoothstep(0.4, 1.8, d));
  }
  return w;
}

/** 0 to 1 height profile of the colony knoll: flat top, smooth flanks. */
export function knollProfile(x: number, z: number): number {
  const { center, topRadius, footRadius } = PENGUIN_KNOLL;
  const r = Math.hypot(x - center[0], z - center[1]);
  return 1 - smoothstep(topRadius, footRadius, r);
}

/**
 * Terrain elevation (y in world units, sea level = 0) and surface weights [gravel, snow, rock]
 * at world coordinates (x, z). Coast from OpenStreetMap; the relief of the hills and the colony
 * knoll is a reconstruction (no elevation model was checked).
 */
export function evaluateIsthmusTerrain(
  x: number,
  z: number,
  seed = 19040222
): { y: number; gravel: number; snow: number; rock: number } {
  // The diorama ends like a model on a table: the land sinks into the sea near the border.
  const border = smoothstep(TERRAIN_HALF_EXTENT - 1, TERRAIN_HALF_EXTENT - 7, Math.max(Math.abs(x), Math.abs(z)));
  const d = Math.min(worldCoastDistance(x, z), lerpNumber(-2, 40, border));
  const nLow = fbm2D(x * 0.35, z * 0.35, seed);

  if (d < 0) {
    return { y: Math.max(-3, d * 0.9), gravel: 0.8, snow: 0.1, rock: 0.1 };
  }

  // A gravel beach about 15 m wide rises to the station pad.
  const beach = smoothstep(0, 1.3, d);
  const pad = padWeight(x, z);
  let y = beach * STATION_GROUND_Y;

  // Hills close the stage at both ends of the isthmus; they slope down to the bays.
  const ends = smoothstep(10, 24, Math.abs(x));
  const hill = ends * smoothstep(0, 5, d) * (4 + 6 * nLow);
  const knoll = knollProfile(x, z) * PENGUIN_KNOLL.height;
  const bumps = (nLow - 0.5) * 0.5 * smoothstep(0.5, 2.5, d);
  y += (hill + bumps) * (1 - pad) + knoll;

  // Surface: grey gravel on the pad and the beaches, rock on steep ground, snow up high and on
  // the knoll's seaward flank, where the penguins toboggan.
  const rise = y - STATION_GROUND_Y;
  const slide = slideSnow(x, z);
  // Snow covers the hills above an irregular line; bare rock shows only on the lower slopes.
  const snowLine = smoothstep(0.25, 1.2, rise + (nLow - 0.5) * 1.4) * smoothstep(9.5, 13, Math.abs(x));
  const rock =
    Math.min(1, smoothstep(0.6, 2.4, rise) * 0.7 + knollProfile(x, z) * 0.55) * (1 - slide) * (1 - snowLine);
  const snowPatch = smoothstep(0.5, 0.62, nLow + rise * 0.05) * (1 - pad);
  const snow = Math.min(1, Math.max(snowPatch, snowLine, slide));
  const gravel = Math.max(0.05, 1 - Math.min(0.95, rock + snow * 0.9));
  return { y, gravel, snow, rock };
}

/** Snow strip on the knoll's flank facing Bahía Uruguay, where the penguins slide. */
function slideSnow(x: number, z: number): number {
  const [cx, cz] = PENGUIN_KNOLL.center;
  const [dx, dz] = SLIDE_DIRECTION;
  const along = (x - cx) * dx + (z - cz) * dz;
  const across = Math.abs((x - cx) * dz - (z - cz) * dx);
  return 0.65 * (1 - smoothstep(0.45, 0.8, across)) * smoothstep(0.8, 1.4, along) * (1 - smoothstep(4.2, 5, along));
}

/** Unit vector from the knoll to the nearest water (down the coast-distance gradient). */
export const SLIDE_DIRECTION: readonly [number, number] = (() => {
  const [cx, cz] = PENGUIN_KNOLL.center;
  const h = 0.05;
  const gx = (worldCoastDistance(cx + h, cz) - worldCoastDistance(cx - h, cz)) / (2 * h);
  const gz = (worldCoastDistance(cx, cz + h) - worldCoastDistance(cx, cz - h)) / (2 * h);
  const g = Math.hypot(gx, gz);
  return [-gx / g, -gz / g];
})();

/** Terrain plane covering the stage; 180 segments is about 0.55 units per segment. */
export function createIsthmusTerrainGeometry(seed = 19040222): BufferGeometry {
  const side = 2 * TERRAIN_HALF_EXTENT;
  const segments = 180;
  const geo = new PlaneGeometry(side, side, segments, segments);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position;
  const count = pos.count;
  const surface = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const { y, gravel, snow, rock } = evaluateIsthmusTerrain(pos.getX(i), pos.getZ(i), seed);
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

/** Sea-ice plates in both bays; each appears when seaIce passes its threshold (near shore first). */
export function generateSeaIcePlates(seed = 190406): SeaIcePlate[] {
  const rng = createSeededRng(seed);
  const plates: SeaIcePlate[] = [];
  const e = TERRAIN_HALF_EXTENT;
  for (let gx = -e; gx <= e; gx += 2.4) {
    for (let gz = -e; gz <= e; gz += 2.4) {
      const x = gx + (rng() - 0.5) * 1.4;
      const z = gz + (rng() - 0.5) * 1.4;
      const d = worldCoastDistance(x, z);
      if (d >= -0.8) continue;
      const offshore = Math.min(1, (-d - 0.8) / 12);
      plates.push({
        x,
        z,
        radius: 0.7 + rng() * 0.7,
        rotY: rng() * Math.PI * 2,
        threshold: Math.min(0.92, Math.max(0.05, offshore * 0.75 + (rng() - 0.5) * 0.15)),
      });
    }
  }
  return plates;
}

/** A few icebergs grounded or drifting in both bays, at least 2.5 units off the coast. */
export function generateIcebergs(seed = 190409): IcebergInstance[] {
  const rng = createSeededRng(seed);
  const coords: readonly [number, number, number, 'tabular' | 'pinnacle'][] = [
    // Bahía Uruguay, behind the stage
    [-7, -10, 1.1, 'tabular'],
    [3, -13, 0.9, 'pinnacle'],
    [11, -9, 1.2, 'tabular'],
    // Bahía Scotia, in front
    [-12, 10, 1.0, 'pinnacle'],
    [10, 9, 1.1, 'tabular'],
  ];
  return coords
    .filter(([x, z]) => worldCoastDistance(x, z) < -2.5)
    .map(([x, z, s, variant]) => ({
      x,
      z,
      scaleX: s * (0.92 + rng() * 0.28),
      scaleY: s * (0.88 + rng() * 0.34),
      scaleZ: s * (0.9 + rng() * 0.28),
      rotY: rng() * Math.PI * 2,
      phase: rng() * Math.PI * 2,
      variant,
    }));
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
