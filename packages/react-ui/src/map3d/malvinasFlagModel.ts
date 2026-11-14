// Authored in Blender with scripts/build-malvinas-flag.py. Static, y up, base at y = 0.
import type { Box } from '../voyage/vehicles.ts';

const ZINC = 0x7d868c;
const ICE = 0xe9f1f4;
const WHITE = 0xf7fafb;
const SKY = 0x7fb6dc;
const LAMP = 0xf2c14e;

export const MALVINAS_FLAG_BOXES: readonly Box[] = [
  [0, 0.49, -0, 0.024, 0.98, 0.024, ZINC],
  [-0.008, 0.49, 0.014, 0.008, 0.98, 0.006, ICE],
  [0.335, 0.966, -0, 0.69, 0.022, 0.022, ZINC],
  [0, 0.989, -0, 0.035, 0.022, 0.035, ICE],
  [0, 0.95, -0, 0.04, 0.025, 0.04, WHITE],
  [0, 0.56, -0, 0.04, 0.025, 0.04, WHITE],
  [0.34, 0.885, -0, 0.63, 0.13, 0.014, SKY],
  [0.34, 0.755, -0, 0.63, 0.13, 0.014, WHITE],
  [0.34, 0.625, -0, 0.63, 0.13, 0.014, SKY],
  [0.34, 0.755, -0, 0.05, 0.05, 0.022, LAMP],
  [0.34, 0.755, -0, 0.096, 0.014, 0.02, LAMP],
  [0.34, 0.755, -0, 0.014, 0.096, 0.02, LAMP],
  [0.309, 0.724, -0, 0.016, 0.016, 0.02, LAMP],
  [0.309, 0.786, -0, 0.016, 0.016, 0.02, LAMP],
  [0.371, 0.724, -0, 0.016, 0.016, 0.02, LAMP],
  [0.371, 0.786, -0, 0.016, 0.016, 0.02, LAMP],
];
