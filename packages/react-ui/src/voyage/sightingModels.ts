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

const bird = (body: number, wings: number, belly: number): Box[] => [
  [0, 0, 0, 0.5, 0.11, 0.12, body],
  [0, -0.04, 0, 0.42, 0.04, 0.1, belly],
  [0.3, 0.03, 0, 0.14, 0.1, 0.1, body],
  [0.42, 0.02, 0, 0.12, 0.04, 0.04, ORANGE],
  [0, 0.04, 0, 0.2, 0.03, 1.1, wings],
  [-0.3, 0.01, 0, 0.14, 0.04, 0.1, wings],
];

const dolphin = (back: number, side: number): Box[] => [
  [0, 0, 0, 0.7, 0.16, 0.16, back],
  [0, -0.06, 0, 0.6, 0.06, 0.17, side],
  [0.42, -0.02, 0, 0.16, 0.07, 0.08, back],
  [-0.02, 0.13, 0, 0.14, 0.1, 0.03, back],
  [-0.42, 0, 0, 0.16, 0.08, 0.08, back],
  [-0.52, 0, 0, 0.08, 0.03, 0.3, back],
];

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

/** A seal resting: on a rock in the Beagle Channel, on an ice floe in Antarctica. */
const seal = (body: number, ground: number): Box[] => [
  [0, 0, 0, 1, 0.08, 0.7, ground],
  [0, 0.14, 0, 0.6, 0.16, 0.22, body],
  [0.34, 0.2, 0, 0.16, 0.16, 0.16, body],
  [0.44, 0.18, 0, 0.05, 0.06, 0.08, BLACK],
  [-0.34, 0.1, 0, 0.12, 0.05, 0.26, body],
];

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

const MODELS: Record<string, readonly Box[]> = {
  eclaireurs: TOWER,
  'san-juan': HOUSE,
  martillo: COLONY,
  cormoran: bird(BLACK, BLACK, WHITE),
  albatros: bird(WHITE, BLACK, WHITE),
  'petrel-gigante': bird(BROWN, BROWN, BROWN),
  'petrel-damero': bird(BLACK, WHITE, WHITE),
  lobos: seal(BROWN, ROCK),
  leopardo: seal(SEA_GREY, ICE),
  cangrejera: seal(CREAM, ICE),
  weddell: seal(0x4f5a63, ICE),
  'delfin-austral': dolphin(0x3d4852, 0xc9d0d4),
  'delfin-cruzado': dolphin(BLACK, WHITE),
  jorobada: WHALE,
  barbijo: PENGUIN,
  adelia: PENGUIN,
};

export const buildSightingGeometry = (s: Sighting): BufferGeometry | null => (MODELS[s.id] ? buildBoxGeometry(MODELS[s.id]) : null);

/**
 * Moves the model inside its spot, in model units, `time` in seconds: birds glide in circles,
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
