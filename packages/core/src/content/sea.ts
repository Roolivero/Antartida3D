import { DRAKE_STORM } from '../storm.ts';
import { VOYAGE_SOURCES, VOYAGE_SOURCES_CONSULTED, type VoyageSourceCode } from './ushuaia.ts';

export interface Source {
  label: string;
  url?: string;
  org: string;
  consulted?: string;
}

export interface SeaPoint {
  id: string;
  title: string;
  place: string;
  desc: string;
  sources: readonly Source[];
  pending?: boolean;
  /** Anchor type: either tracks the Irizar route or attaches to an instance species. */
  targetSpecies?: 'irizar' | 'humpback' | 'iceberg' | 'penguins' | 'orca' | 'minke' | 'seal';
  /** Fallback map position in [0..1000] space if no sea life instance is active. */
  fallbackX: number;
  fallbackY: number;
  /** Tag of the card. Without it the point is sea life. */
  tag?: string;
  /** The marker floats over something drawn: at this world height, and only while that thing is this wide (map units) and big enough on screen. */
  over?: { height: number; width: number };
}

/** A source of the trip from Ushuaia, as a source of a sea point: the catalogue stays in one place. */
const voyageSource = (code: VoyageSourceCode): Source => {
  const source: { org: string; title: string; url: string; consulted?: string } = VOYAGE_SOURCES[code];
  return { label: source.title, url: source.url, org: source.org, consulted: source.consulted ?? VOYAGE_SOURCES_CONSULTED };
};

export const SEA_POINTS: readonly SeaPoint[] = [
  {
    id: 'sea-irizar',
    title: 'Rompehielos ARA Almirante Irízar',
    place: 'Ruta Ushuaia - Antártida',
    desc: 'El rompehielos de la Armada Argentina abastece las bases antárticas y traslada personal científico a través del Pasaje de Drake. Su casco reforzado le permite abrir camino en campos de hielo marino para sostener la presencia y la investigación antártica.',
    targetSpecies: 'irizar',
    fallbackX: 110,
    fallbackY: 340,
    sources: [
      {
        label: 'Armada Argentina · Campaña Antártica',
        url: 'https://www.argentina.gob.ar/armada/antartida/campana-antartica',
        org: 'Armada Argentina',
        consulted: '2026-11-11',
      },
    ],
  },
  {
    id: 'sea-ballena',
    title: 'Ballena jorobada',
    place: 'Océano Austral y Península Antártica',
    desc: 'Durante los meses de verano austral, las ballenas jorobadas migran miles de kilómetros desde zonas tropicales de reproducción hasta las frías y productivas aguas antárticas. Se alimentan principalmente de enjambres de krill filtrando enormes volúmenes de agua marina mediante sus barbas.',
    targetSpecies: 'humpback',
    fallbackX: 160,
    fallbackY: 380,
    sources: [
      {
        label: 'NOAA Fisheries · Humpback Whale species profile',
        url: 'https://www.fisheries.noaa.gov/species/humpback-whale',
        org: 'NOAA Fisheries',
        consulted: '2026-11-11',
      },
      {
        label: 'Armada Argentina · Fauna y Flora antártica',
        url: 'https://www.argentina.gob.ar/armada/antartida/fauna-y-flora',
        org: 'Armada Argentina',
        consulted: '2026-11-11',
      },
    ],
  },
  {
    id: 'sea-tempano',
    title: 'Témpano tabular',
    place: 'Mares de Weddell y Bellingshausen',
    desc: 'Un témpano es una masa de hielo desprendida de glaciares o barreras de hielo flotante. Los témpanos tabulares se distinguen por su cima plana y paredes verticales empinadas, derivando lentamente con las corrientes marinas y los vientos del Océano Austral.',
    targetSpecies: 'iceberg',
    fallbackX: 280,
    fallbackY: 260,
    sources: [
      {
        label: 'NOAA National Ocean Service · What is an iceberg?',
        url: 'https://oceanservice.noaa.gov/facts/iceberg.html',
        org: 'NOAA National Ocean Service',
        consulted: '2026-11-11',
      },
    ],
  },
  {
    id: 'sea-pinguino',
    title: 'Pingüino emperador',
    place: 'Hielo marino costero antártico',
    desc: 'El pingüino emperador es una de las dos únicas especies de pingüino estrictamente antárticas, anidando en colonias sobre el hielo marino alrededor de la costa continental. Los censos científicos apoyados en imágenes satelitales han permitido identificar y monitorear decenas de colonias reproductivas en todo el continente.',
    targetSpecies: 'penguins',
    fallbackX: 725,
    fallbackY: 180,
    sources: [
      {
        label: 'Fretwell et al. 2012 · An Emperor Penguin Population Estimate from Space (PLOS ONE)',
        url: 'https://doi.org/10.1371/journal.pone.0033751',
        org: 'PLOS ONE / British Antarctic Survey',
        consulted: '2026-11-11',
      },
      {
        label: 'Armada Argentina · Fauna y Flora antártica',
        url: 'https://www.argentina.gob.ar/armada/antartida/fauna-y-flora',
        org: 'Armada Argentina',
        consulted: '2026-11-11',
      },
    ],
  },
  // Same text and source as the sighting of the trip from Ushuaia (SIGHTINGS in ushuaia.ts).
  {
    id: 'sea-orca',
    title: 'Orca',
    place: 'Aguas de la Península Antártica',
    desc: 'Nace en un grupo familiar y se queda en él toda la vida. Caza en manada, muy coordinada, como los lobos: peces, calamares, pingüinos, focas y hasta otras ballenas. Los machos llegan a 9,75 m.',
    targetSpecies: 'orca',
    fallbackX: 130,
    fallbackY: 600,
    sources: [voyageSource('I16')],
  },
  {
    id: 'sea-minke',
    title: 'Ballena minke',
    place: 'Aguas antárticas y hielo marino',
    desc: 'Es una de las ballenas con barbas más chicas: llega a casi 9 metros de largo y unas 10 toneladas. En aguas antárticas come casi solo krill. Es muy curiosa: suele nadar varias veces alrededor de una embarcación chica y se desvía para acercarse a un barco en marcha. En verano prefiere el hielo marino abierto.',
    targetSpecies: 'minke',
    fallbackX: 260,
    fallbackY: 740,
    sources: [
      {
        label: 'Australian Antarctic Program · Minke whale',
        url: 'https://www.antarctica.gov.au/about-antarctica/animals/whales/minke-whale/',
        org: 'Australian Antarctic Division',
        consulted: '2026-11-13',
      },
    ],
  },
  // Same text and source as the sighting of the trip from Ushuaia (SIGHTINGS in ushuaia.ts).
  {
    id: 'sea-leopardo',
    title: 'Foca leopardo',
    place: 'Hielo marino antártico',
    desc: 'Caza pingüinos y los sacude para sacarles la piel. Las hembras superan los 3,5 m y los 500 kg.',
    targetSpecies: 'seal',
    fallbackX: 140,
    fallbackY: 550,
    sources: [voyageSource('I16')],
  },
  // Last, on purpose: it is hidden in the home view, and the first sea marker has to be one that shows there.
  {
    id: 'sea-drake',
    title: 'Pasaje de Drake',
    place: '¿Por qué hay tormenta?',
    // Same facts as the Drake milestone of the trip from Ushuaia (sources O46 and I6).
    desc: 'Unos 800 km de mar abierto entre el Cabo de Hornos y las islas Shetland del Sur. Tiene fama de ser uno de los mares más bravos del planeta: es famoso por sus temporales. Acá se registraron vientos de más de 50 nudos y olas de 10 metros. La tormenta dibujada en el mapa es ilustrativa: no muestra el tiempo de hoy ni el lugar exacto de un temporal.',
    tag: 'Mar y clima',
    over: { height: DRAKE_STORM.cloudBase + 4, width: 2 * DRAKE_STORM.radius },
    fallbackX: DRAKE_STORM.x,
    fallbackY: DRAKE_STORM.y,
    sources: [voyageSource('O46'), voyageSource('I6')],
  },
];
