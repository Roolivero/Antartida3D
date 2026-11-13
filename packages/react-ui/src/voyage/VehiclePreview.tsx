import type { TransportId } from '@antartida/core';
import { ModelPreview } from './ModelPreview.tsx';
import { VEHICLE_MODELS } from './vehicles.ts';

/** Small turntable of the picked vehicle, as in a game's vehicle select. */
export function VehiclePreview({ id, reduced }: { id: TransportId; reduced: boolean }) {
  return <ModelPreview boxes={VEHICLE_MODELS[id]} motion="turn" reduced={reduced} />;
}
