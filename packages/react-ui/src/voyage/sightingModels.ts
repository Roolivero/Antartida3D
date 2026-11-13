import type { BufferGeometry, Object3D } from 'three';
import { createSeededRng, type Sighting } from '@antartida/core';
import { buildBoxGeometry, type Box } from './vehicles.ts';
import {
  buildModuleBoxes,
  buildOmondBoxes,
  buildRadioTowerBoxes,
  FLAGPOLE_BASE_BOXES,
  FLAG_SEGMENT_BOXES,
  FLAG_SEGMENT_WIDTH,
  SEA_ICE_FLOE_A,
  SEA_ICE_FLOE_B,
  SEA_ICE_FLOE_C,
  SEA_ICE_FLOE_D,
  STATION_BOAT_BOXES,
} from '../orcadas/stationModels.ts';
import { assemblePenguinBoxes, buildRookeryBoxes } from '../orcadas/penguins.ts';
import { assembleWeddellSealBoxes, assembleElephantSealBoxes } from '../orcadas/seals.ts';

// Approximate colors. The models are illustrations, not portraits: one unit is about the length of the model.
const BLACK = 0x1f2a36;
const WHITE = 0xf7fafb;
const ROCK = 0x8a8f8c;
const ICE = 0xe9f1f4;
const ORANGE = 0xd9822b;
const RED = 0xc8472a;
const CREAM = 0xf1e6c8;
const WOOD = 0x8a6a4a;
const GRASS = 0x9aa86a;
const SEA_GREY = 0x6f7f8c;
const BROWN = 0x6b5443;
const WHALE_GREY = 0x55606b;
const LAMP = 0xf2c14e;
const ZINC = 0x7d868c;
const SKY = 0x7fb6dc;
const RED_DARK = 0x96351e;
const NAVY_ROOF = 0x1e3e5c;
const ROCK_DARK = 0x656a68;
const WOOD_LIGHT = 0xc49a6c;
// Emperor penguin: the yellow of its ear patch and the pale yellow of its upper chest.
const EMPEROR_YELLOW = 0xf2c14e;
const EMPEROR_CHEST = 0xf6e7a8;
const EMPEROR_BILL = 0xe59a6b;

interface Model {
  body: readonly Box[];
  /** Right wing (towards +z), measured from its root at WING_ROOT; the left one is its mirror. */
  wing?: readonly Box[];
  /** How far (radians) and how fast (radians per second) the wings beat. */
  flap?: readonly [reach: number, speed: number];
}

/** Where a wing joins the body: it turns around this point. */
export const WING_ROOT = [0.02, 0.05, 0.06] as const;

/** Seabird seen mostly from above: tapered body, hooked bill, long narrow wings swept back in steps. */
const bird = (body: number, wings: number, belly: number, tips: number, flap: readonly [number, number]): Model => ({
  body: [
    [0, 0, 0, 0.34, 0.12, 0.14, body],
    [0.2, 0.01, 0, 0.14, 0.1, 0.11, body],
    [0.31, 0.04, 0, 0.12, 0.1, 0.09, body],
    [0.42, 0.03, 0, 0.12, 0.035, 0.04, ORANGE],
    [0.47, 0.012, 0, 0.03, 0.03, 0.035, ORANGE],
    [0.345, 0.075, 0.046, 0.025, 0.025, 0.01, BLACK],
    [0.345, 0.075, -0.046, 0.025, 0.025, 0.01, BLACK],
    [-0.2, 0, 0, 0.14, 0.09, 0.11, body],
    [-0.31, 0.005, 0, 0.12, 0.035, 0.12, wings],
    [-0.4, 0.005, 0, 0.07, 0.025, 0.17, tips],
    [0.02, -0.055, 0, 0.42, 0.03, 0.1, belly],
  ],
  wing: [
    [0.02, 0, 0.11, 0.2, 0.03, 0.22, wings],
    [-0.01, 0.005, 0.32, 0.16, 0.028, 0.22, wings],
    [-0.05, 0.005, 0.52, 0.12, 0.025, 0.2, wings],
    [-0.1, 0, 0.68, 0.08, 0.02, 0.14, tips],
  ],
  flap,
});

/** Dolphin: body thinning to the tail, beak, stepped dorsal fin, flippers, flukes, and a patch on each side. */
const dolphin = (back: number, belly: number, patch: number): Model => ({
  body: [
    [0.05, 0, 0, 0.34, 0.17, 0.15, back],
    [0.26, -0.005, 0, 0.14, 0.15, 0.13, back],
    [0.37, -0.01, 0, 0.1, 0.12, 0.11, back],
    [0.46, -0.035, 0, 0.1, 0.05, 0.06, back],
    [-0.17, 0, 0, 0.16, 0.14, 0.12, back],
    [-0.31, 0, 0, 0.14, 0.1, 0.08, back],
    [-0.42, 0, 0, 0.1, 0.07, 0.05, back],
    [-0.5, 0, 0, 0.06, 0.025, 0.08, back],
    [-0.52, 0, 0.09, 0.09, 0.025, 0.12, back],
    [-0.52, 0, -0.09, 0.09, 0.025, 0.12, back],
    [0, 0.115, 0, 0.14, 0.06, 0.03, back],
    [-0.03, 0.165, 0, 0.08, 0.05, 0.03, back],
    [0.2, -0.085, 0.1, 0.1, 0.025, 0.1, back],
    [0.2, -0.085, -0.1, 0.1, 0.025, 0.1, back],
    [0.1, -0.075, 0, 0.5, 0.04, 0.13, belly],
    [0.2, 0, 0.078, 0.2, 0.08, 0.01, patch],
    [0.2, 0, -0.078, 0.2, 0.08, 0.01, patch],
    [-0.2, 0.01, 0.063, 0.2, 0.07, 0.01, patch],
    [-0.2, 0.01, -0.063, 0.2, 0.07, 0.01, patch],
    [0.39, 0.02, 0.057, 0.025, 0.025, 0.01, BLACK],
    [0.39, 0.02, -0.057, 0.025, 0.025, 0.01, BLACK],
  ],
});

// Humpback whale: body thinning to the tail, flat head, very long white flippers, white under the flukes.
const WHALE: Box[] = [
  [0.02, 0, 0, 0.36, 0.24, 0.24, WHALE_GREY],
  [0.27, -0.01, 0, 0.18, 0.22, 0.22, WHALE_GREY],
  [0.42, -0.03, 0, 0.14, 0.17, 0.19, WHALE_GREY],
  [0.52, -0.05, 0, 0.08, 0.11, 0.14, WHALE_GREY],
  [-0.22, 0.01, 0, 0.18, 0.19, 0.18, WHALE_GREY],
  [-0.38, 0.02, 0, 0.16, 0.13, 0.11, WHALE_GREY],
  [-0.5, 0.03, 0, 0.1, 0.08, 0.06, WHALE_GREY],
  [-0.57, 0.035, 0, 0.07, 0.03, 0.08, WHALE_GREY],
  [-0.58, 0.035, 0.1, 0.1, 0.03, 0.16, WHALE_GREY],
  [-0.58, 0.035, -0.1, 0.1, 0.03, 0.16, WHALE_GREY],
  [-0.62, 0.035, 0.2, 0.06, 0.025, 0.08, WHALE_GREY],
  [-0.62, 0.035, -0.2, 0.06, 0.025, 0.08, WHALE_GREY],
  [-0.58, 0.018, 0.1, 0.08, 0.01, 0.14, WHITE],
  [-0.58, 0.018, -0.1, 0.08, 0.01, 0.14, WHITE],
  [-0.14, 0.14, 0, 0.1, 0.05, 0.04, WHALE_GREY],
  [0.2, -0.1, 0.19, 0.12, 0.03, 0.16, WHITE],
  [0.2, -0.1, -0.19, 0.12, 0.03, 0.16, WHITE],
  [0.14, -0.1, 0.33, 0.1, 0.025, 0.14, WHITE],
  [0.14, -0.1, -0.33, 0.1, 0.025, 0.14, WHITE],
  [0.22, -0.115, 0, 0.5, 0.03, 0.2, WHITE],
  [0.44, 0.02, 0.097, 0.03, 0.03, 0.01, BLACK],
  [0.44, 0.02, -0.097, 0.03, 0.03, 0.01, BLACK],
];

// Orca: black, white belly and eye patches, grey saddle, tall dorsal fin.
const ORCA: Box[] = [
  [0.04, 0, 0, 0.36, 0.22, 0.2, BLACK],
  [0.28, -0.01, 0, 0.16, 0.2, 0.18, BLACK],
  [0.41, -0.03, 0, 0.12, 0.15, 0.15, BLACK],
  [0.5, -0.05, 0, 0.07, 0.09, 0.1, BLACK],
  [-0.2, 0.01, 0, 0.18, 0.17, 0.15, BLACK],
  [-0.36, 0.02, 0, 0.16, 0.11, 0.09, BLACK],
  [-0.48, 0.03, 0, 0.1, 0.06, 0.05, BLACK],
  [-0.56, 0.03, 0.09, 0.1, 0.03, 0.15, BLACK],
  [-0.56, 0.03, -0.09, 0.1, 0.03, 0.15, BLACK],
  [-0.55, 0.03, 0, 0.07, 0.03, 0.06, BLACK],
  [0.04, 0.17, 0, 0.14, 0.12, 0.035, BLACK],
  [0.02, 0.28, 0, 0.09, 0.12, 0.035, BLACK],
  [0, 0.37, 0, 0.05, 0.08, 0.035, BLACK],
  [-0.1, 0.112, 0, 0.14, 0.01, 0.14, 0x8e989f],
  [0.2, -0.09, 0.12, 0.14, 0.03, 0.12, BLACK],
  [0.2, -0.09, -0.12, 0.14, 0.03, 0.12, BLACK],
  [0.2, -0.105, 0, 0.5, 0.03, 0.16, WHITE],
  [0.4, 0.02, 0.077, 0.08, 0.04, 0.01, WHITE],
  [0.4, 0.02, -0.077, 0.08, 0.04, 0.01, WHITE],
  [-0.2, -0.04, 0.077, 0.14, 0.06, 0.01, WHITE],
  [-0.2, -0.04, -0.077, 0.14, 0.06, 0.01, WHITE],
];

/** A seal resting with its head up: on a rock in the Beagle Channel, on an ice floe in Antarctica. */
const seal = (body: number, belly: number, ground: number): Model => ({
  body: [
    [0, 0, 0, 1, 0.08, 0.7, ground],
    [0, 0.14, 0, 0.44, 0.17, 0.22, body],
    [0.22, 0.17, 0, 0.14, 0.2, 0.18, body],
    [0.33, 0.27, 0, 0.13, 0.13, 0.13, body],
    [0.41, 0.25, 0, 0.06, 0.07, 0.08, body],
    [0.445, 0.255, 0, 0.02, 0.03, 0.04, BLACK],
    [0.37, 0.3, 0.066, 0.025, 0.025, 0.01, BLACK],
    [0.37, 0.3, -0.066, 0.025, 0.025, 0.01, BLACK],
    [-0.27, 0.12, 0, 0.18, 0.12, 0.16, body],
    [-0.4, 0.09, 0.06, 0.12, 0.04, 0.1, body],
    [-0.4, 0.09, -0.06, 0.12, 0.04, 0.1, body],
    [0.18, 0.07, 0.14, 0.12, 0.04, 0.1, body],
    [0.18, 0.07, -0.14, 0.12, 0.04, 0.1, body],
    [0.1, 0.075, 0, 0.36, 0.05, 0.18, belly],
  ],
});

type PenguinFace = 'strap' | 'ring' | 'band';

/**
 * A penguin standing at (x, z), `k` times the full size. The face tells the species apart:
 * chinstrap (white face, thin black strap), Adélie (white ring around the eye), Magellanic (white band).
 */
export const penguinAt = (x: number, z: number, k: number, face: PenguinFace): Box[] => {
  const at = (cx: number, cy: number, cz: number, sx: number, sy: number, sz: number, color: number): Box =>
    [x + cx * k, 0.04 + cy * k, z + cz * k, sx * k, sy * k, sz * k, color];
  const marks: Box[] = face === 'strap'
    ? [at(0.07, 0.53, 0, 0.05, 0.1, 0.15, WHITE), at(0.09, 0.485, 0, 0.03, 0.02, 0.16, BLACK)]
    : face === 'ring'
      ? [at(0.05, 0.56, 0.081, 0.04, 0.04, 0.005, WHITE), at(0.05, 0.56, -0.081, 0.04, 0.04, 0.005, WHITE)]
      : [at(0.02, 0.51, 0, 0.165, 0.03, 0.165, WHITE), at(0.085, 0.4, 0, 0.03, 0.03, 0.19, BLACK)];
  return [
    at(0, 0.16, 0, 0.2, 0.26, 0.24, BLACK),
    at(0, 0.38, 0, 0.18, 0.2, 0.2, BLACK),
    at(0.01, 0.54, 0, 0.16, 0.14, 0.16, BLACK),
    // White front that wraps round to the sides.
    at(0.05, 0.25, 0, 0.125, 0.4, 0.245, WHITE),
    at(0.12, 0.54, 0, 0.08, 0.04, 0.05, BLACK),
    at(0.05, 0.02, 0.06, 0.14, 0.04, 0.08, ORANGE),
    at(0.05, 0.02, -0.06, 0.14, 0.04, 0.08, ORANGE),
    at(0, 0.32, 0.135, 0.1, 0.3, 0.035, BLACK),
    at(0, 0.32, -0.135, 0.1, 0.3, 0.035, BLACK),
    at(-0.12, 0.06, 0, 0.08, 0.04, 0.08, BLACK),
    ...marks,
  ];
};

/**
 * An emperor penguin standing at (x, z), `k` times the full size. Taller and heavier than the
 * others, with its own marks: a yellow and orange patch behind each ear, a pale yellow upper
 * chest, a long thin bill with an orange streak, and dark feet.
 */
export const emperorAt = (x: number, z: number, k: number): Box[] => {
  const at = (cx: number, cy: number, cz: number, sx: number, sy: number, sz: number, color: number): Box =>
    [x + cx * k, 0.04 + cy * k, z + cz * k, sx * k, sy * k, sz * k, color];
  return [
    at(0, 0.2, 0, 0.24, 0.34, 0.28, BLACK),
    at(0, 0.5, 0, 0.21, 0.28, 0.24, BLACK),
    at(0.01, 0.73, 0, 0.17, 0.18, 0.17, BLACK),
    // White front that wraps round to the sides, pale yellow where it meets the neck.
    at(0.06, 0.3, 0, 0.14, 0.46, 0.285, WHITE),
    at(0.07, 0.57, 0, 0.12, 0.1, 0.2, EMPEROR_CHEST),
    // Ear patches: yellow, turning orange towards the back of the head.
    at(0.02, 0.7, 0.088, 0.09, 0.1, 0.01, EMPEROR_YELLOW),
    at(0.02, 0.7, -0.088, 0.09, 0.1, 0.01, EMPEROR_YELLOW),
    at(-0.03, 0.72, 0.089, 0.05, 0.06, 0.01, ORANGE),
    at(-0.03, 0.72, -0.089, 0.05, 0.06, 0.01, ORANGE),
    at(0.06, 0.77, 0.087, 0.025, 0.025, 0.01, WHITE),
    at(0.06, 0.77, -0.087, 0.025, 0.025, 0.01, WHITE),
    // Long bill, curved down, with the orange streak of the lower half.
    at(0.14, 0.73, 0, 0.12, 0.035, 0.045, BLACK),
    at(0.14, 0.712, 0, 0.1, 0.015, 0.05, EMPEROR_BILL),
    at(0.05, 0.02, 0.07, 0.15, 0.04, 0.09, BLACK),
    at(0.05, 0.02, -0.07, 0.15, 0.04, 0.09, BLACK),
    at(0, 0.42, 0.155, 0.11, 0.38, 0.035, BLACK),
    at(0, 0.42, -0.155, 0.11, 0.38, 0.035, BLACK),
    at(-0.13, 0.06, 0, 0.09, 0.05, 0.09, BLACK),
  ];
};

const penguin = (face: PenguinFace): Box[] => [
  [0, 0, 0, 0.8, 0.08, 0.6, ICE],
  [-0.3, 0.02, 0.2, 0.3, 0.08, 0.3, ICE],
  ...penguinAt(0.05, 0, 1, face),
];

/** The colony of Isla Martillo: a low island with Magellanic penguins on it. */
const COLONY: Box[] = [
  [0, 0, 0, 1.1, 0.08, 0.8, GRASS],
  [0.1, 0.03, 0.05, 0.8, 0.06, 0.5, 0xb3a878],
  [-0.45, 0.02, -0.3, 0.3, 0.1, 0.25, ROCK],
  ...penguinAt(-0.3, -0.12, 0.5, 'band'), ...penguinAt(0, 0.15, 0.5, 'band'), ...penguinAt(0.3, -0.1, 0.5, 'band'),
  ...penguinAt(-0.15, 0.28, 0.5, 'band'), ...penguinAt(0.25, 0.25, 0.5, 'band'), ...penguinAt(0.05, -0.25, 0.5, 'band'),
];

/** Rocky islet both lighthouses stand on. */
const ISLET: Box[] = [
  [0, 0.04, 0, 0.95, 0.08, 0.75, ROCK],
  [0.05, 0.1, -0.02, 0.7, 0.06, 0.55, 0x9a9f9b],
  [-0.36, 0.1, 0.24, 0.2, 0.1, 0.2, 0x767b78],
  [0.38, 0.09, -0.26, 0.16, 0.08, 0.16, 0x767b78],
];

// Les Éclaireurs, from photos: stone tower that narrows upwards, red with a white band, black lantern.
const TOWER: Box[] = [
  ...ISLET,
  [0, 0.18, 0, 0.27, 0.1, 0.27, RED],
  [0, 0.28, 0, 0.255, 0.1, 0.255, RED],
  [0, 0.38, 0, 0.24, 0.1, 0.24, WHITE],
  [0, 0.48, 0, 0.225, 0.1, 0.225, WHITE],
  [0, 0.58, 0, 0.21, 0.1, 0.21, RED],
  [0, 0.68, 0, 0.2, 0.1, 0.2, RED],
  [0.136, 0.2, 0, 0.01, 0.12, 0.07, BLACK],
  [0.122, 0.48, 0, 0.01, 0.05, 0.04, BLACK],
  [0, 0.745, 0, 0.3, 0.03, 0.3, BLACK],
  [0, 0.82, 0, 0.15, 0.12, 0.15, LAMP],
  [0.076, 0.82, 0.076, 0.02, 0.12, 0.02, BLACK],
  [0.076, 0.82, -0.076, 0.02, 0.12, 0.02, BLACK],
  [-0.076, 0.82, 0.076, 0.02, 0.12, 0.02, BLACK],
  [-0.076, 0.82, -0.076, 0.02, 0.12, 0.02, BLACK],
  [0, 0.9, 0, 0.2, 0.04, 0.2, BLACK],
  [0, 0.94, 0, 0.1, 0.04, 0.1, BLACK],
  [0, 0.99, 0, 0.02, 0.06, 0.02, BLACK],
];

// San Juan de Salvamento, from photos of its replica: low eight-sided wooden house, windows for the
// lamps on one side, stepped roof with a ball on top, flagpole.
const HOUSE: Box[] = [
  ...ISLET,
  [0, 0.25, 0, 0.56, 0.24, 0.3, CREAM],
  [0, 0.25, 0, 0.3, 0.24, 0.56, CREAM],
  [0, 0.25, 0, 0.46, 0.24, 0.46, CREAM],
  [0.282, 0.29, 0, 0.01, 0.07, 0.22, LAMP],
  [0.232, 0.29, 0.19, 0.01, 0.07, 0.08, LAMP],
  [0.232, 0.29, -0.19, 0.01, 0.07, 0.08, LAMP],
  [-0.282, 0.21, 0, 0.01, 0.16, 0.08, WOOD],
  [0, 0.385, 0, 0.62, 0.03, 0.34, ZINC],
  [0, 0.385, 0, 0.34, 0.03, 0.62, ZINC],
  [0, 0.385, 0, 0.5, 0.03, 0.5, ZINC],
  [0, 0.43, 0, 0.38, 0.06, 0.38, ZINC],
  [0, 0.49, 0, 0.24, 0.06, 0.24, ZINC],
  [0, 0.55, 0, 0.12, 0.06, 0.12, ZINC],
  [0, 0.62, 0, 0.1, 0.1, 0.1, BLACK],
  [-0.38, 0.4, 0.26, 0.02, 0.6, 0.02, BLACK],
  [-0.31, 0.66, 0.26, 0.12, 0.03, 0.01, SKY],
  [-0.31, 0.63, 0.26, 0.12, 0.03, 0.01, WHITE],
  [-0.31, 0.6, 0.26, 0.12, 0.03, 0.01, SKY],
];

const MODELS: Record<string, Model> = {
  eclaireurs: { body: TOWER },
  'san-juan': { body: HOUSE },
  martillo: { body: COLONY },
  // The cormorant beats its wings fast; albatrosses and petrels glide and barely move them.
  cormoran: bird(BLACK, BLACK, WHITE, BLACK, [0.5, 9]),
  albatros: bird(WHITE, WHITE, WHITE, BLACK, [0.08, 1.2]),
  'petrel-gigante': bird(BROWN, BROWN, 0x8a7460, BROWN, [0.12, 1.6]),
  'petrel-damero': bird(BLACK, WHITE, WHITE, BLACK, [0.3, 5]),
  lobos: seal(BROWN, 0x8a6f58, ROCK),
  leopardo: seal(SEA_GREY, 0xc9d0d4, ICE),
  cangrejera: seal(CREAM, WHITE, ICE),
  weddell: seal(0x4f5a63, 0x8e989f, ICE),
  'delfin-austral': dolphin(0x3d4852, WHITE, 0xa9b3ba),
  'delfin-cruzado': dolphin(BLACK, WHITE, WHITE),
  jorobada: { body: WHALE },
  orca: { body: ORCA },
  barbijo: { body: penguin('strap') },
  adelia: { body: penguin('ring') },
};

/** A house with a zinc roof in two steps, standing on y = 0. */
const cottage = (x: number, z: number, w: number, h: number, d: number, wall: number, y = 0): Box[] => [
  [x, y + h / 2, z, w, h, d, wall],
  [x, y + h + 0.015, z, w + 0.04, 0.03, d + 0.04, ZINC],
  [x, y + h + 0.045, z, w + 0.04, 0.03, d * 0.5, ZINC],
  [x + w * 0.2, y + h * 0.55, z + d / 2 + 0.003, w * 0.22, h * 0.3, 0.006, LAMP],
  [x - w * 0.2, y + h * 0.4, z + d / 2 + 0.003, w * 0.18, h * 0.8, 0.006, WOOD],
];

/**
 * The yellow and red church of the town center, with its tower: the building that tells Ushuaia
 * from any other town. Modelled from a photo; standing on y = 0, front towards +z, tower at -x.
 */
const church = (x: number, z: number, y: number): Box[] => [
  // Nave: red base, yellow walls, red roof in steps.
  [x + 0.12, y + 0.03, z, 0.46, 0.06, 0.24, RED],
  [x + 0.12, y + 0.13, z, 0.44, 0.14, 0.22, LAMP],
  [x + 0.12, y + 0.215, z, 0.48, 0.03, 0.26, RED],
  [x + 0.12, y + 0.245, z, 0.48, 0.03, 0.17, RED],
  [x + 0.12, y + 0.275, z, 0.48, 0.03, 0.08, RED],
  // Red buttresses and tall windows on the side seen from the water.
  ...[0, 0.12, 0.24, 0.34].map((dx): Box => [x + dx, y + 0.1, z + 0.113, 0.025, 0.2, 0.012, RED]),
  ...[0.06, 0.18, 0.29].map((dx): Box => [x + dx, y + 0.14, z + 0.112, 0.03, 0.09, 0.008, WHITE]),
  // Tower: yellow shaft, red belfry corners, red roof to a point, cross.
  [x - 0.16, y + 0.05, z + 0.02, 0.16, 0.1, 0.16, RED],
  [x - 0.16, y + 0.27, z + 0.02, 0.14, 0.4, 0.14, LAMP],
  [x - 0.16, y + 0.31, z + 0.092, 0.035, 0.035, 0.008, WHITE],
  [x - 0.16, y + 0.42, z + 0.092, 0.07, 0.06, 0.008, WHITE],
  [x - 0.16, y + 0.485, z + 0.02, 0.19, 0.03, 0.19, RED],
  [x - 0.16, y + 0.53, z + 0.02, 0.14, 0.06, 0.14, RED],
  [x - 0.16, y + 0.59, z + 0.02, 0.09, 0.06, 0.09, RED],
  [x - 0.16, y + 0.645, z + 0.02, 0.045, 0.05, 0.045, RED],
  [x - 0.16, y + 0.72, z + 0.02, 0.012, 0.1, 0.012, WHITE],
  [x - 0.16, y + 0.735, z + 0.02, 0.05, 0.012, 0.012, WHITE],
];

/** Tops of the chimneys of the town, where the smoke comes out. */
export const TOWN_CHIMNEYS: readonly (readonly [number, number, number])[] = [[-0.52, 0.36, -0.02], [0.2, 0.5, -0.32], [0.62, 0.33, 0.02]];

/**
 * Ushuaia at the start of the trip: its yellow and red church among coloured houses with zinc roofs
 * on a slope, seen from the bay (+z). An illustration of the town, not a map of its buildings.
 */
const TOWN: Box[] = [
  // Ground under the town, down to the water.
  [0, -0.06, -0.1, 1.7, 0.12, 0.92, GRASS],
  [0, 0.02, 0.05, 1.7, 0.04, 0.62, GRASS],
  [0, 0.07, -0.3, 1.5, 0.14, 0.4, GRASS],
  // Front row, by the water.
  ...cottage(-0.6, 0.12, 0.26, 0.16, 0.2, RED, 0.04),
  ...church(-0.12, 0.14, 0.04),
  ...cottage(0.4, 0.17, 0.2, 0.13, 0.16, LAMP, 0.04),
  ...cottage(0.68, 0.12, 0.24, 0.15, 0.2, ORANGE, 0.04),
  // Back row, up the slope.
  ...cottage(-0.45, -0.3, 0.26, 0.15, 0.18, WHITE, 0.14),
  ...cottage(-0.12, -0.3, 0.22, 0.17, 0.18, SKY, 0.14),
  ...cottage(0.2, -0.32, 0.26, 0.2, 0.2, RED, 0.14),
  ...cottage(0.54, -0.3, 0.24, 0.14, 0.18, CREAM, 0.14),
  // Chimneys, under TOWN_CHIMNEYS.
  [-0.52, 0.3, -0.02, 0.04, 0.12, 0.04, BROWN],
  [0.2, 0.44, -0.32, 0.04, 0.12, 0.04, BROWN],
  [0.62, 0.27, 0.02, 0.04, 0.12, 0.04, BROWN],
];

export const buildTownGeometry = () => buildBoxGeometry(TOWN);

/** Antarctic minke whale: slimmer than the humpback, pointed head, small fin far back, white band on the flipper. */
const MINKE: Box[] = [
  [0.02, 0, 0, 0.4, 0.17, 0.17, 0x3d4852],
  [0.28, -0.01, 0, 0.16, 0.15, 0.15, 0x3d4852],
  [0.41, -0.03, 0, 0.12, 0.11, 0.12, 0x3d4852],
  [0.5, -0.045, 0, 0.08, 0.07, 0.08, 0x3d4852],
  [-0.24, 0.01, 0, 0.18, 0.14, 0.13, 0x3d4852],
  [-0.4, 0.02, 0, 0.16, 0.09, 0.08, 0x3d4852],
  [-0.52, 0.03, 0, 0.1, 0.05, 0.05, 0x3d4852],
  [-0.59, 0.035, 0.08, 0.09, 0.025, 0.14, 0x3d4852],
  [-0.59, 0.035, -0.08, 0.09, 0.025, 0.14, 0x3d4852],
  [-0.22, 0.1, 0, 0.07, 0.06, 0.03, 0x3d4852],
  [0.18, -0.06, 0.12, 0.1, 0.025, 0.1, 0x3d4852],
  [0.18, -0.06, -0.12, 0.1, 0.025, 0.1, 0x3d4852],
  [0.18, -0.06, 0.15, 0.05, 0.027, 0.04, WHITE],
  [0.18, -0.06, -0.15, 0.05, 0.027, 0.04, WHITE],
  [0.16, -0.085, 0, 0.56, 0.03, 0.14, WHITE],
  [0.43, 0.005, 0.062, 0.03, 0.03, 0.01, BLACK],
  [0.43, 0.005, -0.062, 0.03, 0.03, 0.01, BLACK],
];

/** The blow of a whale: a low, bushy cloud, shown only while it breathes. An effect, not a model. */
const SPOUT: Box[] = [
  [0, 0.04, 0, 0.05, 0.08, 0.05, WHITE],
  [0.01, 0.12, 0.03, 0.07, 0.08, 0.07, WHITE],
  [-0.01, 0.12, -0.03, 0.07, 0.08, 0.07, WHITE],
  [0.02, 0.2, 0.06, 0.06, 0.06, 0.06, WHITE],
  [-0.02, 0.2, -0.06, 0.06, 0.06, 0.06, WHITE],
];

const ICE_SHADE = 0xc5dbe6;

/** Pale turquoise of the ice seen through shallow water: the foot that spreads under an iceberg. */
const ICE_SUBMERGED = 0x9fd6dc;
/** Wall of an iceberg: bluer than snow, so the baked face shading reads as ice and not as grey stone. */
const ICE_WALL = 0xb4d5ea;

/** Side of one ice column, in model units. */
const ICE_CELL = 0.1;
/** Height step of the columns: heights snap to it, so the ice breaks into terraces and not into a ramp. */
const ICE_STEP = 0.035;

/**
 * An iceberg as a field of square ice columns over a ragged footprint. Straight walls, a flat roof
 * and dark slits read as a building, so the outline is broken column by column, the rim steps down
 * to the water and nothing is darker than wet ice. `height(u, v)` gets the cell position in -1..1
 * along the length and the width and returns the ice height there, or 0 for open water.
 */
function iceberg(cols: number, rows: number, seed: number, height: (u: number, v: number, noise: number) => number): Box[] {
  const rng = createSeededRng(seed);
  const length = cols * ICE_CELL;
  const width = rows * ICE_CELL;
  const boxes: Box[] = [
    // Submerged foot, wider than the ice above the water
    [0, 0.006, 0, length * 0.92, 0.012, width * 0.8, ICE_SUBMERGED],
    [length * 0.06, 0.006, width * 0.05, length * 0.7, 0.012, width, ICE_SUBMERGED],
  ];
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const u = ((i + 0.5) / cols) * 2 - 1;
      const v = ((j + 0.5) / rows) * 2 - 1;
      const h = Math.round(height(u, v, rng()) / ICE_STEP) * ICE_STEP;
      if (h <= 0) continue;
      const x = (u * length) / 2;
      const z = (v * width) / 2;
      // The lowest terrace is washed by the waves: wet, bluer ice with no snow on it.
      const low = h <= ICE_STEP;
      boxes.push([x, h / 2, z, ICE_CELL, h, ICE_CELL, low ? ICE_SHADE : ICE_WALL]);
      if (!low) boxes.push([x, h + 0.005, z, ICE_CELL, 0.01, ICE_CELL, WHITE]);
    }
  }
  // Calved fragments drifting next to it
  boxes.push(
    [length * 0.6, 0.02, width * 0.38, 0.09, 0.045, 0.07, ICE_WALL],
    [length * 0.66, 0.012, width * 0.2, 0.05, 0.03, 0.05, WHITE],
    [-length * 0.6, 0.018, -width * 0.36, 0.07, 0.04, 0.09, ICE_WALL],
  );
  return boxes;
}

/**
 * Tabular iceberg: a wide plateau that broke off an ice shelf. The plateau is level, the rim falls
 * to the sea in terraces, and one end has collapsed.
 */
const ICEBERG_TABULAR: Box[] = iceberg(11, 7, 190421, (u, v, noise) => {
  const edge = 1 - Math.hypot(u * 0.95, v) - (noise - 0.5) * 0.34 + (u > 0.3 && v < 0 ? -0.22 : 0);
  if (edge <= 0) return 0;
  return Math.min(0.21, ICE_STEP + edge * 0.62);
});

/**
 * Small weathered iceberg: a tall peak off centre, a lower second peak past a saddle, and melted
 * terraces around them.
 */
const ICEBERG_PEAKS: Box[] = iceberg(8, 6, 190422, (u, v, noise) => {
  // Each peak falls as a sheer cliff on its west side and as a long melted slope on the east one.
  const peak = (cu: number, cv: number, top: number, reach: number) =>
    top * Math.max(0, 1 - Math.hypot((u - cu) * (u < cu ? 2.6 : 1), v - cv) / reach) ** 1.5;
  const h = Math.max(peak(-0.45, -0.15, 0.5, 1.15), peak(0.45, 0.4, 0.27, 0.6)) + (noise - 0.5) * 0.09;
  return h < 0.03 ? 0 : h;
});

/** Emperor penguins on a floe of sea ice: the point of the map is «Pingüino emperador». */
const FLOE_PENGUINS: Box[] = [
  [0, 0, 0, 1, 0.08, 0.7, ICE],
  [0.05, 0.045, 0.02, 0.8, 0.03, 0.5, WHITE],
  [-0.42, 0.01, 0.3, 0.26, 0.06, 0.2, ICE_SHADE],
  ...emperorAt(-0.22, -0.1, 0.5), ...emperorAt(0.08, 0.12, 0.5), ...emperorAt(0.3, -0.12, 0.5),
];

/** One emperor penguin on a small floe, for the card of its point. */
const EMPEROR: Box[] = [
  [0, 0, 0, 0.7, 0.08, 0.56, ICE],
  [0.03, 0.045, 0.01, 0.52, 0.03, 0.4, WHITE],
  ...emperorAt(0, 0, 0.82),
];

/**
 * Models of the sea life and ice that live on the map outside the trip. Every model of the app is
 * built this way (see docs/diseno/estilo-voxel.md): boxes, flat colors, no textures.
 */
export const SEA_MODELS = {
  humpback: WHALE,
  orca: ORCA,
  minke: MINKE,
  penguins: FLOE_PENGUINS,
  emperor: EMPEROR,
  seal: seal(SEA_GREY, 0xc9d0d4, ICE).body,
  'iceberg-lg': ICEBERG_TABULAR,
  'iceberg-sm': ICEBERG_PEAKS,
} as const satisfies Record<string, readonly Box[]>;
export type SeaModelId = keyof typeof SEA_MODELS;

/**
 * Minimal block model of Estación Orcadas on Laurie Island:
 * two houses (Casa Moneta and modern orange module), Argentine flagpole with waving flag,
 * and a pair of Adélie & Chinstrap penguins on the terrace. (42 boxes, 12 colors).
 */
export const ORCADAS_SITE: Box[] = [
  // Ground footing / rock terrace on Laurie Island isthmus
  [0, 0.02, 0, 1.4, 0.04, 1.1, ROCK],
  [-0.1, 0.05, 0.1, 0.8, 0.04, 0.6, ICE],
  // House 1: Casa Moneta (historic timber cabin, stepped red roof, chimney, window)
  [-0.32, 0.16, 0.08, 0.44, 0.22, 0.3, WOOD_LIGHT],
  [-0.32, 0.29, 0.08, 0.48, 0.06, 0.34, RED],
  [-0.32, 0.34, 0.08, 0.44, 0.04, 0.22, RED_DARK],
  [-0.32, 0.38, 0.08, 0.44, 0.04, 0.1, RED],
  [-0.18, 0.41, 0.02, 0.05, 0.12, 0.05, BLACK],
  [-0.32, 0.16, 0.235, 0.07, 0.08, 0.01, LAMP],
  // House 2: Modern orange container pavilion (orange walls, dark navy roof, radome, window)
  [0.32, 0.15, -0.12, 0.42, 0.2, 0.26, ORANGE],
  [0.32, 0.26, -0.12, 0.46, 0.05, 0.3, NAVY_ROOF],
  [0.32, 0.15, 0.015, 0.07, 0.07, 0.01, LAMP],
  [0.38, 0.31, -0.12, 0.08, 0.07, 0.08, WHITE],
  // Argentine flagpole (stone cairn base, white mast, waving flag with Sol de Mayo)
  [0.08, 0.1, 0.28, 0.14, 0.14, 0.14, ROCK_DARK],
  [0.08, 0.38, 0.28, 0.02, 0.44, 0.02, WHITE],
  [0.17, 0.54, 0.28, 0.16, 0.04, 0.01, SKY],
  [0.17, 0.5, 0.28, 0.16, 0.04, 0.01, WHITE],
  [0.17, 0.46, 0.28, 0.16, 0.04, 0.01, SKY],
  [0.17, 0.5, 0.28, 0.04, 0.04, 0.012, LAMP],
  // Two penguins standing on the rock terrace (Adélie and Chinstrap)
  ...penguinAt(-0.15, 0.35, 0.32, 'ring'),
  ...penguinAt(0.12, -0.32, 0.32, 'strap'),
];

/** Every model of this file by name, for the test of least detail. */
export const SCENE_MODELS: Readonly<Record<string, readonly Box[]>> = {
  ...Object.fromEntries(Object.entries(MODELS).map(([id, m]) => [id, [...m.body, ...(m.wing ?? []), ...(m.wing ?? [])]])),
  ...Object.fromEntries(Object.entries(SEA_MODELS).map(([id, boxes]) => [`sea:${id}`, boxes])),
  ushuaia: TOWN,
  orcadas: ORCADAS_SITE,
  // Orcadas station models: getters, because stationModels.ts imports this module (cycle).
  get moduleRound() {
    return buildModuleBoxes(4.8, 1.7, 0.67, 'orange', 'round', false);
  },
  get moduleGabled() {
    return buildModuleBoxes(3.2, 1.8, 0.5, 'orange', 'gabled', false);
  },
  get moduleFlat() {
    return buildModuleBoxes(6.2, 1.6, 0.5, 'unknown', 'flat', false);
  },
  get omond() {
    return buildOmondBoxes(false);
  },
  get radioTower() {
    return buildRadioTowerBoxes(5);
  },
  get orcadasAdelie() {
    return assemblePenguinBoxes('adelie');
  },
  get orcadasChinstrap() {
    return assemblePenguinBoxes('chinstrap');
  },
  get orcadasFlag() {
    // Pole and the 5 flag segments laid flat, side by side as at rest.
    return [
      ...FLAGPOLE_BASE_BOXES,
      ...FLAG_SEGMENT_BOXES.flatMap((seg, i) =>
        seg.map(([x, y, z, sx, sy, sz, c]) => [x + i * FLAG_SEGMENT_WIDTH, y + 3.95, z, sx, sy, sz, c] as Box)
      ),
    ];
  },
  get rookery() {
    return buildRookeryBoxes();
  },
  get orcadasFloeA() {
    return SEA_ICE_FLOE_A;
  },
  get orcadasFloeB() {
    return SEA_ICE_FLOE_B;
  },
  get orcadasFloeC() {
    return SEA_ICE_FLOE_C;
  },
  get orcadasFloeD() {
    return SEA_ICE_FLOE_D;
  },
  get orcadasWeddellSeal() {
    return assembleWeddellSealBoxes();
  },
  get orcadasElephantSeal() {
    return assembleElephantSealBoxes();
  },
  get orcadasBoat() {
    return STATION_BOAT_BOXES;
  },
};

export const buildSeaGeometry = (id: SeaModelId) => buildBoxGeometry(SEA_MODELS[id]);
export const buildSpoutGeometry = () => buildBoxGeometry(SPOUT);

export interface SightingGeometry {
  body: BufferGeometry;
  /** Right and left wing, each measured from its root. */
  wings?: readonly [BufferGeometry, BufferGeometry];
}

export function buildSightingGeometry(s: Sighting): SightingGeometry | null {
  const model = MODELS[s.id];
  if (!model) return null;
  const mirror = (boxes: readonly Box[]): Box[] => boxes.map(([x, y, z, ...rest]) => [x, y, -z, ...rest]);
  return {
    body: buildBoxGeometry(model.body),
    wings: model.wing && [buildBoxGeometry(model.wing), buildBoxGeometry(mirror(model.wing))],
  };
}

/**
 * Moves the model inside its spot, in model units, `time` in seconds: birds fly in circles,
 * dolphins jump, the whale comes up to breathe, seals and penguins rock. ILLUSTRATIVE: no source
 * backs these movements. A place stays still.
 */
export function moveSighting(model: Object3D, s: Sighting, time: number): void {
  if (s.place) return;
  if (s.icon === 'bird') {
    const a = time * 0.8;
    model.position.set(Math.cos(a) * 0.45, 0.75 + Math.sin(time * 1.7) * 0.06, Math.sin(a) * 0.45);
    model.rotation.set(0.3, -a - Math.PI / 2, 0, 'YXZ');
    model.scale.setScalar(0.7);
    // The wings (second and third child) beat around their roots, slightly raised at rest.
    const [reach, speed] = MODELS[s.id]?.flap ?? [0, 0];
    const lift = 0.1 + Math.sin(time * speed) * reach;
    if (model.children[1]) model.children[1].rotation.x = -lift;
    if (model.children[2]) model.children[2].rotation.x = lift;
  } else if (s.icon === 'dolphin') {
    const p = (time * 0.45) % 1;
    model.position.set((p - 0.5) * 1.1, Math.sin(p * Math.PI) * 0.55 - 0.15, 0);
    model.rotation.z = Math.cos(p * Math.PI) * 0.9;
    model.scale.setScalar(0.8);
  } else if (s.icon === 'whale') {
    model.position.y = 0.16 + Math.sin(time * 0.6) * 0.07;
    model.rotation.z = Math.sin(time * 0.6 + 1) * 0.15;
  } else {
    model.position.y = 0.04 + Math.sin(time * 1.3) * 0.015;
    model.rotation.x = Math.sin(time * (s.icon === 'penguin' ? 3 : 1.1)) * (s.icon === 'penguin' ? 0.1 : 0.04);
  }
}
