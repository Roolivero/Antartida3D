import { describe, expect, it } from 'vitest';
import { SCENE_MODELS } from '../src/voyage/sightingModels.ts';
import { VEHICLE_MODELS, VOXEL_MIN_BOXES, VOXEL_MIN_COLORS } from '../src/voyage/vehicles.ts';

const models = { ...VEHICLE_MODELS, ...SCENE_MODELS };

describe('voxel models (docs/diseno/estilo-voxel.md)', () => {
  it('registers the vehicles, the animals, the ice and the town', () => {
    expect(Object.keys(models).length).toBeGreaterThan(25);
  });

  for (const [name, boxes] of Object.entries(models)) {
    it(`${name} has the least detail`, () => {
      expect(boxes.length, 'boxes').toBeGreaterThanOrEqual(VOXEL_MIN_BOXES);
      expect(new Set(boxes.map((b) => b[6])).size, 'colors').toBeGreaterThanOrEqual(VOXEL_MIN_COLORS);
    });

    it(`${name} is made of boxes with a size and a solid color`, () => {
      for (const [, , , sx, sy, sz, color] of boxes) {
        expect(Math.min(sx, sy, sz)).toBeGreaterThan(0);
        expect(Number.isInteger(color) && color >= 0 && color <= 0xffffff).toBe(true);
      }
    });
  }
});
