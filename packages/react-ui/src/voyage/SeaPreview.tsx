import type { SeaPoint } from '@antartida/core';
import { ModelPreview, type PreviewMotion } from './ModelPreview.tsx';
import { SEA_MODELS } from './sightingModels.ts';
import { VEHICLE_MODELS, type Box } from './vehicles.ts';

type Species = NonNullable<SeaPoint['targetSpecies']>;

/** Block model and movement of each sea point. The models do not turn: the animal is seen as on the map. */
const PREVIEWS: Record<Species, { boxes: readonly Box[]; motion: PreviewMotion; lift?: number }> = {
  humpback: { boxes: SEA_MODELS.humpback, motion: 'swim' },
  penguins: { boxes: SEA_MODELS.emperor, motion: 'sway', lift: 0.22 },
  irizar: { boxes: VEHICLE_MODELS.irizar, motion: 'still' },
  iceberg: { boxes: SEA_MODELS['iceberg-lg'], motion: 'still' },
};

/** View of the block model of a sea point, for its card. */
export function SeaPreview({ species, reduced }: { species: Species; reduced: boolean }) {
  return <ModelPreview {...PREVIEWS[species]} reduced={reduced} sea />;
}
