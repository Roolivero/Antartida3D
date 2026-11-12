import type { BufferGeometry, Object3D } from 'three';
import type { Sighting } from '@antartida/core';
import { buildBoxGeometry, type Box } from './vehicles.ts';

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
const penguinAt = (x: number, z: number, k: number, face: PenguinFace): Box[] => {
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

/** Tabular iceberg: flat top, sheer walls, a blue line where the water wears it. */
const ICEBERG_TABULAR: Box[] = [
  [0, 0.01, 0, 1, 0.04, 0.66, ICE_SHADE],
  [0, 0.12, 0, 0.94, 0.2, 0.6, ICE],
  [0.05, 0.24, 0.02, 0.8, 0.06, 0.5, WHITE],
  [-0.2, 0.29, -0.05, 0.4, 0.05, 0.34, WHITE],
  [0.47, 0.1, 0.1, 0.06, 0.14, 0.3, ICE_SHADE],
  [-0.47, 0.08, -0.12, 0.06, 0.1, 0.26, ICE_SHADE],
  [0.2, 0.1, 0.31, 0.3, 0.14, 0.04, ICE_SHADE],
  [-0.25, 0.09, -0.31, 0.26, 0.12, 0.04, ICE_SHADE],
  [0.3, 0.275, 0.12, 0.16, 0.012, 0.03, SKY],
  [-0.1, 0.275, 0.18, 0.1, 0.012, 0.03, SKY],
  [0.58, 0.02, -0.2, 0.14, 0.05, 0.14, ICE],
  [-0.6, 0.02, 0.22, 0.1, 0.04, 0.1, ICE],
];

/** Small iceberg worn into peaks. */
const ICEBERG_PEAKS: Box[] = [
  [0, 0.01, 0, 0.8, 0.04, 0.56, ICE_SHADE],
  [0, 0.08, 0, 0.66, 0.12, 0.44, ICE],
  [-0.14, 0.2, 0.02, 0.3, 0.14, 0.26, ICE],
  [-0.16, 0.33, 0.02, 0.2, 0.12, 0.18, WHITE],
  [-0.17, 0.44, 0.02, 0.1, 0.1, 0.1, WHITE],
  [0.2, 0.18, -0.04, 0.22, 0.1, 0.2, ICE],
  [0.21, 0.27, -0.04, 0.12, 0.08, 0.12, WHITE],
  [0.02, 0.16, 0.16, 0.14, 0.05, 0.08, ICE_SHADE],
  [0.32, 0.09, 0.2, 0.06, 0.1, 0.04, ICE_SHADE],
  [-0.33, 0.09, -0.2, 0.06, 0.1, 0.04, ICE_SHADE],
  [-0.05, 0.215, 0.152, 0.1, 0.012, 0.01, SKY],
  [0.5, 0.02, 0.1, 0.12, 0.05, 0.1, ICE],
];

/** Penguins on a floe of sea ice. */
const FLOE_PENGUINS: Box[] = [
  [0, 0, 0, 1, 0.08, 0.7, ICE],
  [0.05, 0.045, 0.02, 0.8, 0.03, 0.5, WHITE],
  [-0.42, 0.01, 0.3, 0.26, 0.06, 0.2, ICE_SHADE],
  ...penguinAt(-0.22, -0.1, 0.55, 'ring'), ...penguinAt(0.08, 0.12, 0.55, 'ring'), ...penguinAt(0.3, -0.12, 0.55, 'ring'),
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
  seal: seal(SEA_GREY, 0xc9d0d4, ICE).body,
  'iceberg-lg': ICEBERG_TABULAR,
  'iceberg-sm': ICEBERG_PEAKS,
} as const satisfies Record<string, readonly Box[]>;
export type SeaModelId = keyof typeof SEA_MODELS;

/** Every model of this file by name, for the test of least detail. */
export const SCENE_MODELS: Readonly<Record<string, readonly Box[]>> = {
  ...Object.fromEntries(Object.entries(MODELS).map(([id, m]) => [id, [...m.body, ...(m.wing ?? []), ...(m.wing ?? [])]])),
  ...Object.fromEntries(Object.entries(SEA_MODELS).map(([id, boxes]) => [`sea:${id}`, boxes])),
  ushuaia: TOWN,
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
