import { project } from '../projection.ts';

/** Illustrative anchor on land, also used by fuegia.test.ts; not a real flagpole location. */
export const MALVINAS_FLAG = {
  ...project(-58.8, -51.7),
  /** Fixed illustrative height in map/world units, independent of camera distance. */
  height: 11.76,
  label: 'Bandera argentina en las Islas Malvinas',
  description: 'Bandera en Malvinas: símbolo ilustrativo, ubicación y tamaño no reales.',
} as const;
