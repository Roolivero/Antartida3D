import type { BuildingId } from './orcadas.ts';

/**
 * Measured site of Orcadas station (plan phase 5, G1 approved on 12 Nov 2026).
 * Local metres: origin at the WMO station 0-20000-0-88968 (OSCAR: -60.73775, -44.73846),
 * x to the east, z to the north. See docs/orcadas-emplazamiento.md.
 *
 * Footprints, centres and bearings come from OpenStreetMap (ODbL 1.0, © colaboradores de
 * OpenStreetMap), drawn over Maxar imagery in 2019. The coastline in OSM comes from the
 * Antarctic Digital Database and is coarser than the buildings (about ±10 m).
 */

/** Half side of the square site that the scene shows, in metres. */
export const SITE_HALF_EXTENT_M = 420;

export type SiteKind =
  | 'omond'
  | 'moneta'
  | 'module'
  | 'generator'
  | 'fuelTank'
  | 'cemetery'
  | 'helipad'
  | 'radioTower'
  | 'flag'
  | 'screen'
  | 'windMast'
  | 'boat';

export type RoofShape = 'round' | 'gabled' | 'flat';

/** Colours named in OSM `building:colour` or seen in the reference photos. */
export type SiteColour = 'orange' | 'black' | 'unknown' | 'stone';

export type SiteConfidence = 'medido' | 'estimado';

export interface SiteElement {
  id: string;
  kind: SiteKind;
  /** Name shown in the UI; only when a source names the element. */
  name?: string;
  /** Centre in local metres [east, north]. */
  center: readonly [number, number];
  /** Plan size in metres: [long side, short side]. */
  footprint: readonly [number, number];
  /** Compass bearing of the long side, degrees (0 = north, 90 = east). */
  bearingDeg: number;
  /** Height in metres (estimated from photos: one level). */
  heightM: number;
  colour?: SiteColour;
  roof?: RoofShape;
  /** Era group that shows the element; undefined = always shown. */
  era?: BuildingId;
  /** Where the position comes from; null = [Fuente a definir], the element is not drawn. */
  source: string | null;
  confidence: SiteConfidence | null;
}

const OSM = 'OpenStreetMap (ODbL), trazado sobre imágenes Maxar 2019';
const ONE_LEVEL_M = 3;
const PAVILION_M = 4;

function module(
  osmId: number,
  center: readonly [number, number],
  footprint: readonly [number, number],
  bearingDeg: number,
  colour: SiteColour,
  roof: RoofShape
): SiteElement {
  return {
    id: `module-${osmId}`,
    kind: 'module',
    center,
    footprint,
    bearingDeg,
    heightM: roof === 'round' ? PAVILION_M : ONE_LEVEL_M,
    colour,
    roof,
    era: 'modern',
    source: `${OSM}, way ${osmId}`,
    confidence: 'medido',
  };
}

function tower(osmNode: number, center: readonly [number, number]): SiteElement {
  return {
    id: `tower-${osmNode}`,
    kind: 'radioTower',
    center,
    footprint: [2, 2],
    bearingDeg: 0,
    // OSM gives no height: 15 m is illustrative, not measured.
    heightM: 15,
    era: 'radioMast',
    source: `${OSM}, node ${osmNode}`,
    confidence: 'medido',
  };
}

export const SITE_ELEMENTS: readonly SiteElement[] = [
  {
    id: 'omond',
    kind: 'omond',
    name: 'Casa Omond',
    center: [97, -206],
    footprint: [9.0, 4.6],
    bearingDeg: 45,
    heightM: ONE_LEVEL_M,
    colour: 'stone',
    roof: 'flat',
    era: 'omond',
    source: `${OSM}, way 700625941 («Omond House»); HSM 42 (Secretaría del Tratado Antártico)`,
    confidence: 'medido',
  },
  {
    // Casa Moneta has no name in OSM and no source places it: [Fuente a definir], not drawn.
    id: 'moneta',
    kind: 'moneta',
    name: 'Casa Moneta',
    center: [0, 0],
    footprint: [1, 1],
    bearingDeg: 0,
    heightM: ONE_LEVEL_M,
    era: 'moneta',
    source: null,
    confidence: null,
  },
  {
    id: 'cemetery',
    kind: 'cemetery',
    name: 'Cementerio',
    center: [-141, -49],
    footprint: [20.3, 19.9],
    bearingDeg: 10,
    heightM: 1,
    era: 'omond',
    source: `${OSM}, way 700625939; HSM 42 (doce tumbas, la primera de 1903)`,
    confidence: 'medido',
  },
  {
    id: 'generator',
    kind: 'generator',
    name: 'Usina',
    center: [80, -167],
    footprint: [9.0, 6.6],
    bearingDeg: 143,
    heightM: ONE_LEVEL_M,
    colour: 'unknown',
    roof: 'gabled',
    era: 'modern',
    source: `${OSM}, way 700625940`,
    confidence: 'medido',
  },
  {
    id: 'fuelTank',
    kind: 'fuelTank',
    name: 'Tanques de combustible',
    center: [79, -187],
    footprint: [10.0, 7.9],
    bearingDeg: 129,
    heightM: ONE_LEVEL_M,
    era: 'modern',
    source: `${OSM}, way 700625942`,
    confidence: 'medido',
  },
  {
    id: 'helipad',
    kind: 'helipad',
    name: 'Helipuerto',
    center: [152, -80],
    footprint: [13.5, 13.5],
    bearingDeg: 0,
    heightM: 0.2,
    era: 'modern',
    source: `${OSM}, way 1198904156`,
    confidence: 'medido',
  },
  module(360745959, [110, -40], [29.2, 10.6], 135, 'orange', 'round'),
  module(360745960, [69, -107], [48.4, 9.6], 138, 'unknown', 'flat'),
  module(360745961, [81, -14], [8.1, 6.2], 136, 'orange', 'round'),
  module(360745962, [33, -55], [10.6, 10.4], 138, 'orange', 'gabled'),
  module(360745963, [63, -149], [7.4, 6.6], 139, 'orange', 'round'),
  module(360745964, [25, -84], [5.4, 3.8], 47, 'orange', 'flat'),
  module(360745965, [20, -67], [10.5, 8.9], 138, 'orange', 'gabled'),
  module(360745966, [5, 33], [37.2, 7.8], 136, 'black', 'gabled'),
  module(360745967, [38, -77], [11.2, 10.2], 48, 'orange', 'gabled'),
  module(360745969, [4, -82], [19.2, 10.7], 48, 'orange', 'gabled'),
  module(360745970, [51, 2], [13.1, 5.5], 164, 'black', 'flat'),
  module(360745971, [35, 18], [14.0, 9.8], 138, 'orange', 'gabled'),
  module(360745972, [6, 80], [7.7, 5.3], 50, 'orange', 'flat'),
  module(711216662, [29, 76], [4.5, 3.9], 46, 'unknown', 'flat'),
  module(711216663, [59, 45], [10.9, 4.4], 52, 'unknown', 'flat'),
  module(711216664, [122, -25], [5.3, 5.0], 127, 'unknown', 'flat'),
  module(711216665, [-108, -46], [4.5, 3.7], 0, 'unknown', 'flat'),
  module(711216666, [-86, -24], [9.1, 3.9], 91, 'unknown', 'flat'),
  tower(3653005101, [48, 34]),
  tower(3653005104, [56, 25]),
  tower(3653005111, [-26, 9]),
  tower(3653005115, [-15, -7]),
  tower(3653006043, [92, -85]),
  {
    id: 'screen',
    kind: 'screen',
    name: 'Abrigo meteorológico',
    center: [0, 0],
    footprint: [1.2, 1.2],
    bearingDeg: 0,
    heightM: 2,
    source: 'OMM OSCAR/Surface, estación 0-20000-0-88968 (posición de la estación)',
    confidence: 'medido',
  },
  {
    // No source places the wind mast; it stands beside the screen, as a declared estimate.
    id: 'windMast',
    kind: 'windMast',
    name: 'Mástil de viento',
    center: [-8, 6],
    footprint: [1, 1],
    bearingDeg: 0,
    heightM: 10,
    era: 'windMast',
    source: 'Estimado junto a la estación OMM 0-20000-0-88968',
    confidence: 'estimado',
  },
  {
    id: 'flag',
    kind: 'flag',
    name: 'Mástil y pabellón',
    center: [86, -29],
    footprint: [1, 1],
    bearingDeg: 0,
    heightM: 8,
    era: 'flag',
    source:
      'Estimado por la geoetiqueta de la foto File:SeMo-218 (49435353546).jpg (Wikimedia Commons, CC BY-SA 2.0, 15 ene 2020)',
    confidence: 'estimado',
  },
  {
    // COMNAP lists two Zodiac boats and beaches suitable for small boats; the spot is an estimate.
    id: 'boat',
    kind: 'boat',
    name: 'Bote',
    center: [130, -120],
    footprint: [5, 2],
    bearingDeg: 135,
    heightM: 1,
    era: 'modern',
    source: 'Estimado: COMNAP (dos botes Zodiac, playas aptas para botes)',
    confidence: 'estimado',
  },
];

/** Elements with a source: the only ones the scene draws. */
export const DRAWN_SITE_ELEMENTS: readonly SiteElement[] = SITE_ELEMENTS.filter(
  (e) => e.source !== null
);

export function siteElement(id: string): SiteElement {
  const e = SITE_ELEMENTS.find((s) => s.id === id);
  if (!e) throw new Error(`Unknown site element: ${id}`);
  return e;
}

/**
 * Coastlines from OSM ways 233397237 (Bahía Uruguay, to the north-west) and
 * 233397832 + 233396829 + 233397808 (Bahía Scotia, to the south-east), in local metres.
 * Both keep the OSM direction: the land is on the left of each line and the bay on its right.
 */
export const COAST_URUGUAY_M: readonly (readonly [number, number])[] = [
  [44, 483], [54, 407], [53, 372], [50, 341], [40, 312], [26, 289], [-8, 242], [-18, 217],
  [-19, 189], [-30, 157], [-73, 103], [-125, 57], [-317, -45], [-373, -62], [-416, -64],
  [-444, -58], [-465, -47], [-478, -34], [-484, -21],
];

export const COAST_SCOTIA_M: readonly (readonly [number, number])[] = [
  [292, -488], [284, -467], [266, -442], [244, -405], [218, -387], [196, -356], [155, -324],
  [107, -274], [95, -256], [91, -237], [94, -217], [108, -202], [121, -166], [138, -141],
  [168, -102], [193, -68], [228, -28], [254, -2], [279, 19], [303, 42], [323, 57], [344, 73],
  [379, 97], [405, 111], [440, 121], [474, 123], [499, 123],
];

function segmentDistance(
  px: number,
  pz: number,
  a: readonly [number, number],
  b: readonly [number, number]
): { dist: number; cross: number } {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const len2 = dx * dx + dz * dz;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - a[0]) * dx + (pz - a[1]) * dz) / len2));
  const cx = a[0] + t * dx;
  const cz = a[1] + t * dz;
  return { dist: Math.hypot(px - cx, pz - cz), cross: dx * (pz - a[1]) - dz * (px - a[0]) };
}

/** Signed distance in metres to a coastline: positive on land (left of the line), negative at sea. */
function signedCoastDistance(
  line: readonly (readonly [number, number])[],
  x: number,
  z: number
): number {
  let best = { dist: Infinity, cross: 0 };
  for (let i = 0; i < line.length - 1; i++) {
    const s = segmentDistance(x, z, line[i], line[i + 1]);
    if (s.dist < best.dist) best = s;
  }
  return best.cross >= 0 ? best.dist : -best.dist;
}

/** Signed distance to the nearest coast, in metres: positive on land, negative in a bay. */
export function siteCoastDistanceM(x: number, z: number): number {
  return Math.min(
    signedCoastDistance(COAST_URUGUAY_M, x, z),
    signedCoastDistance(COAST_SCOTIA_M, x, z)
  );
}
