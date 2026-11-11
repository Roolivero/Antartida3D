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

const WHALE: Box[] = [
  [0, 0, 0, 0.8, 0.24, 0.26, WHALE_GREY],
  [0.42, -0.02, 0, 0.2, 0.2, 0.22, WHALE_GREY],
  [0.1, -0.11, 0, 0.6, 0.04, 0.22, WHITE],
  [-0.48, 0.02, 0, 0.2, 0.1, 0.1, WHALE_GREY],
  [-0.6, 0.04, 0, 0.1, 0.03, 0.4, WHALE_GREY],
  [0.15, -0.08, 0.2, 0.3, 0.03, 0.12, WHITE],
  [0.15, -0.08, -0.2, 0.3, 0.03, 0.12, WHITE],
  [-0.1, 0.14, 0, 0.1, 0.05, 0.04, WHALE_GREY],
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

const penguinAt = (x: number, z: number, k: number): Box[] => [
  [x, 0.04 + 0.23 * k, z, 0.2 * k, 0.46 * k, 0.24 * k, BLACK],
  [x + 0.06 * k, 0.04 + 0.21 * k, z, 0.12 * k, 0.36 * k, 0.18 * k, WHITE],
  [x, 0.04 + 0.52 * k, z, 0.18 * k, 0.14 * k, 0.18 * k, BLACK],
  [x + 0.12 * k, 0.04 + 0.52 * k, z, 0.08 * k, 0.04 * k, 0.05 * k, ORANGE],
  [x, 0.04 + 0.25 * k, z + 0.14 * k, 0.08 * k, 0.3 * k, 0.04 * k, BLACK],
  [x, 0.04 + 0.25 * k, z - 0.14 * k, 0.08 * k, 0.3 * k, 0.04 * k, BLACK],
];

const PENGUIN: Box[] = [[0, 0, 0, 0.8, 0.08, 0.6, ICE], ...penguinAt(0, 0, 1)];

/** The colony of Isla Martillo: a low island with penguins on it. */
const COLONY: Box[] = [
  [0, 0, 0, 1.1, 0.08, 0.8, GRASS],
  ...penguinAt(-0.3, -0.2, 0.5), ...penguinAt(0, 0.15, 0.5), ...penguinAt(0.3, -0.1, 0.5), ...penguinAt(-0.15, 0.28, 0.5), ...penguinAt(0.25, 0.25, 0.5),
];

// Red and white stone tower on an islet: Les Éclaireurs, from photos.
const TOWER: Box[] = [
  [0, 0.05, 0, 0.9, 0.1, 0.7, ROCK],
  [0, 0.2, 0, 0.24, 0.2, 0.24, RED],
  [0, 0.4, 0, 0.22, 0.2, 0.22, WHITE],
  [0, 0.6, 0, 0.2, 0.2, 0.2, RED],
  [0, 0.72, 0, 0.28, 0.04, 0.28, BLACK],
  [0, 0.8, 0, 0.14, 0.12, 0.14, CREAM],
  [0, 0.89, 0, 0.18, 0.06, 0.18, BLACK],
];

// Low wooden house with a stepped roof and a ball on top: San Juan de Salvamento, from photos of its replica.
const HOUSE: Box[] = [
  [0, 0.05, 0, 0.9, 0.1, 0.7, ROCK],
  [0, 0.22, 0, 0.5, 0.24, 0.5, CREAM],
  [0, 0.26, 0, 0.52, 0.08, 0.3, BLACK],
  [0, 0.38, 0, 0.56, 0.06, 0.56, WOOD],
  [0, 0.45, 0, 0.36, 0.08, 0.36, WOOD],
  [0, 0.53, 0, 0.18, 0.08, 0.18, WOOD],
  [0, 0.62, 0, 0.1, 0.1, 0.1, BLACK],
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
  barbijo: { body: PENGUIN },
  adelia: { body: PENGUIN },
};

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
