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
  targetSpecies?: 'irizar' | 'humpback' | 'iceberg' | 'penguins';
  /** Fallback map position in [0..1000] space if no sea life instance is active. */
  fallbackX: number;
  fallbackY: number;
}

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
];
