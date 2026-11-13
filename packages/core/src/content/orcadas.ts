import type { Chapter } from '../orcadas.ts';

export const ORCADAS_GUIDING_QUESTION = '¿Cuánto cambió el clima de la isla Laurie en 120 años?';

/** Short chapter names (buttons, Sources panel) and panel headings. Single source for the UI. */
export const CHAPTER_NAMES: Record<Chapter, string> = {
  arrival: 'Llegar',
  observation: 'Observar',
  journey: 'Viajar',
  answer: 'Responder',
};

export const CHAPTER_HEADINGS: Record<Chapter, string> = {
  // The top bar already names the station: the first chapter opens with the question.
  arrival: ORCADAS_GUIDING_QUESTION,
  observation: 'Observación del día',
  journey: 'Viaje en el tiempo',
  answer: 'La respuesta',
};

export type FactKind = 'real' | 'sim' | 'recon' | 'calc';

export const FACT_KIND_LABEL: Record<FactKind, string> = {
  real: 'Dato real',
  sim: 'Simulación',
  recon: 'Reconstrucción',
  calc: 'Cálculo',
};

export interface OrcadasSource {
  id: string;
  label: string;
  /** Short name for the clickable reference under each fact. */
  short: string;
  org: string;
  url: string;
  consulted: string;
  license?: string;
  verified: boolean;
}

/**
 * Where a fact is shown: a chapter, the month strip that stays on screen in every chapter,
 * or the scene label («Reconstrucción ilustrada»).
 */
export type FactPlace = Chapter | 'months' | 'scene';

export interface OrcadasFact {
  id: string;
  chapter: FactPlace;
  kind: FactKind;
  title?: string;
  text: string;
  sourceIds: readonly string[];
}

export const ORCADAS_SOURCES: readonly OrcadasSource[] = [
  {
    id: 'cancilleria',
    label: 'Base Orcadas',
    short: 'Cancillería',
    org: 'Cancillería Argentina · Dirección Nacional del Antártico',
    url: 'https://cancilleria.gob.ar/es/iniciativas/dna/antartida-argentina/bases/orcadas',
    consulted: '11 de noviembre de 2026',
    verified: true,
  },
  {
    id: 'armada',
    label: 'Bases permanentes',
    short: 'Armada',
    org: 'Armada Argentina',
    url: 'https://www.argentina.gob.ar/armada/antartida/bases-permanentes',
    consulted: '11 de noviembre de 2026',
    verified: true,
  },
  {
    id: 'reader',
    label: 'READER: datos de superficie de Orcadas',
    short: 'SCAR READER',
    org: 'SCAR · British Antarctic Survey',
    url: 'https://legacy.bas.ac.uk/met/READER/surface/Orcadas.All.temperature.html',
    consulted: '11 de noviembre de 2026',
    license: 'Open Government Licence v3.0',
    verified: true,
  },
  {
    id: 'zazulie2010',
    label: 'Zazulie, Rusticucci y Solomon (2010)',
    short: 'Zazulie y otros (2010)',
    org: 'Journal of Climate 23(1)',
    url: 'https://doi.org/10.1175/2009JCLI3074.1',
    consulted: '11 de noviembre de 2026',
    verified: true,
  },
  {
    id: 'mossman1907',
    label: 'R. C. Mossman (1907)',
    short: 'Mossman (1907)',
    org: 'Report on the Scientific Results of the Voyage of S.Y. Scotia, vol. II, Meteorology',
    url: 'https://archive.org/details/reportonscientif02scot',
    consulted: '12 de noviembre de 2026',
    verified: true,
  },
  {
    id: 'oscar',
    label: 'OMM · OSCAR/Surface, estación 88968',
    short: 'OMM',
    org: 'OMM',
    url: 'https://oscar.wmo.int/surface/#/search/station/stationReportDetails/12480',
    consulted: '11 de noviembre de 2026',
    verified: true,
  },
  {
    id: 'comnap',
    label: 'Antarctic Station Catalogue (Argentina)',
    short: 'COMNAP',
    org: 'COMNAP',
    url: 'https://www.comnap.aq/s/Argentina_Catalogue_Aug2017.pdf',
    consulted: '12 de noviembre de 2026',
    verified: true,
  },
  {
    id: 'hsm42',
    label: 'Sitio y Monumento Histórico N.º 42',
    short: 'Tratado Antártico',
    org: 'Secretaría del Tratado Antártico',
    url: 'https://www.ats.aq/devph/en/apa-database/119',
    consulted: '12 de noviembre de 2026',
    verified: true,
  },
] as const;

const SOURCE_MAP = new Map<string, OrcadasSource>(
  ORCADAS_SOURCES.map((src) => [src.id, src])
);

export const ORCADAS_FACTS: readonly OrcadasFact[] = [
  // arrival
  {
    id: 'arrival-istmo',
    chapter: 'arrival',
    kind: 'real',
    title: 'Ubicación de la base',
    text: 'La base está en el istmo Ibarguren, entre la bahía Scotia y la bahía Uruguay, en la isla Laurie, Orcadas del Sur.',
    sourceIds: ['cancilleria'],
  },
  {
    id: 'arrival-antiguedad',
    chapter: 'arrival',
    kind: 'real',
    title: 'La base más antigua',
    text: 'Es la presencia humana estable más antigua de la Antártida y la más antigua de todas sus bases.',
    sourceIds: ['cancilleria', 'armada'],
  },
  {
    id: 'arrival-coordenadas',
    chapter: 'arrival',
    kind: 'real',
    title: 'Coordenadas',
    text: 'Coordenadas 60° 45′ S, 44° 43′ O.',
    sourceIds: ['armada'],
  },
  {
    id: 'arrival-fauna',
    chapter: 'arrival',
    kind: 'real',
    title: 'Fauna',
    text: 'Fauna: pingüinos barbijo y adelia; skúas, gaviota cocinera, petreles de las tormentas, petrel de las nieves y petrel damero; elefantes marinos, lobo fino antártico, focas de Weddell y cangrejeras.',
    sourceIds: ['cancilleria'],
  },
  {
    id: 'arrival-transporte',
    chapter: 'arrival',
    kind: 'real',
    title: 'Cómo se llega',
    text: 'A la base se llega en buque o en helicóptero, con unas 25 visitas de buques por año entre noviembre y marzo. No tiene muelle: cuenta con dos botes Zodiac con motor fuera de borda y con playas aptas para desembarcar botes chicos.',
    sourceIds: ['comnap'],
  },
  {
    id: 'arrival-elevacion',
    chapter: 'arrival',
    kind: 'real',
    title: 'Elevación',
    text: 'La base está a 8 m sobre el nivel del mar, y el barómetro de la estación meteorológica, a 12 m.',
    sourceIds: ['comnap', 'oscar'],
  },
  {
    id: 'arrival-diorama',
    chapter: 'scene',
    kind: 'recon',
    title: 'Diorama de la estación',
    text: 'El diorama de la estación es una reconstrucción ilustrada, no un modelo a escala.',
    sourceIds: [],
  },

  // observation
  {
    id: 'obs-registro-1903',
    chapter: 'observation',
    kind: 'real',
    title: 'Registro centenario',
    text: 'El registro mensual de temperatura empieza en abril de 1903 y sigue hasta hoy.',
    sourceIds: ['reader'],
  },
  {
    id: 'obs-simulacion',
    chapter: 'observation',
    kind: 'sim',
    title: 'Observación del día',
    text: 'La observación del día es una simulación sorteada dentro del clima real del mes.',
    sourceIds: [],
  },
  {
    id: 'obs-estacion-centenaria',
    chapter: 'observation',
    kind: 'real',
    title: 'Reconocimiento OMM',
    text: 'La Organización Meteorológica Mundial la reconoce como estación de observación centenaria: una de las que miden el tiempo desde hace más de cien años. Su identificador es 0-20000-0-88968.',
    sourceIds: ['oscar'],
  },
  {
    id: 'obs-instrumental-1903',
    chapter: 'observation',
    kind: 'real',
    title: 'Instrumental de 1903',
    text: 'En 1903 la estación de Omond House tenía cuatro abrigos meteorológicos con termómetros seco y húmedo, de máxima y de mínima, termógrafos e higrógrafo Richard, un barómetro de modelo Kew y un heliógrafo Campbell-Stokes. El anemómetro de cazoletas Robinson estaba en la cubierta del Scotia, anclado en la bahía.',
    sourceIds: ['mossman1907'],
  },

  // months (month strip)
  {
    id: 'year-sol-luz',
    chapter: 'months',
    kind: 'calc',
    title: 'Luz solar',
    text: 'Las horas de luz y la altura del sol son un cálculo astronómico para 60° 44′ S.',
    sourceIds: [],
  },
  {
    id: 'year-hielo-bahia',
    chapter: 'months',
    kind: 'sim',
    title: 'Hielo en la bahía',
    text: 'Cuánto hielo cubre la bahía cada mes es una simulación ilustrativa, no una medición.',
    sourceIds: [],
  },
  {
    id: 'year-hielo-octubre',
    chapter: 'months',
    kind: 'real',
    title: 'Deshielo',
    text: 'El hielo marino frente a la estación se rompe en octubre.',
    sourceIds: ['comnap'],
  },
  {
    id: 'year-fauna-meses',
    chapter: 'months',
    kind: 'sim',
    title: 'Presencia de fauna',
    text: 'La presencia de animales por mes es ilustrativa.',
    sourceIds: [],
  },

  // journey: eras
  {
    id: 'eras-expedicion-bruce',
    chapter: 'journey',
    kind: 'real',
    title: 'Expedición escocesa',
    text: 'La expedición escocesa de William Speirs Bruce inauguró el observatorio el 1 de abril de 1903.',
    sourceIds: ['cancilleria'],
  },
  {
    id: 'eras-decreto-1904',
    chapter: 'journey',
    kind: 'real',
    title: 'Decreto 3073',
    text: 'El decreto 3073 del 2 de enero de 1904 aceptó las instalaciones y las asignó a la Oficina Meteorológica Argentina.',
    sourceIds: ['cancilleria'],
  },
  {
    id: 'eras-traspaso-1904',
    chapter: 'journey',
    kind: 'real',
    title: 'Bandera argentina ininterrumpida',
    text: 'El 22 de febrero de 1904 pasó a manos argentinas y desde entonces la bandera flamea sin interrupción.',
    sourceIds: ['cancilleria'],
  },
  {
    id: 'eras-hugo-acuna',
    chapter: 'journey',
    kind: 'real',
    title: 'Hugo Acuña',
    text: 'Hugo Acuña, joven estafeta a cargo de la oficina postal, integró esa primera dotación y escribió un diario de su invernada.',
    sourceIds: ['cancilleria'],
  },
  {
    id: 'eras-casa-moneta-1905',
    chapter: 'journey',
    kind: 'real',
    title: 'Casa Moneta',
    text: 'En 1905 se sumó una casa principal al observatorio de piedra de 1903 (Casa Omond); hoy es museo y se llama Casa Moneta.',
    sourceIds: ['cancilleria'],
  },
  {
    id: 'eras-radio-1927',
    chapter: 'journey',
    kind: 'real',
    title: 'Estación radiotelegráfica',
    text: 'En 1927 se inauguró la primera estación radiotelegráfica antártica, con la primera comunicación por radio entre la Antártida y el territorio argentino americano.',
    sourceIds: ['cancilleria'],
  },
  {
    id: 'eras-dotacion-nativa-1927',
    chapter: 'journey',
    kind: 'real',
    title: 'Primera dotación nativa',
    text: 'En 1927 fue la primera dotación integrada por argentinos nativos, con José Moneta como jefe.',
    sourceIds: ['armada'],
  },
  {
    id: 'eras-jose-moneta',
    chapter: 'journey',
    kind: 'real',
    title: 'José Manuel Moneta',
    text: 'José Manuel Moneta, técnico del Servicio Meteorológico, invernó cuatro años, escribió «Cuatro años en las Orcadas del Sur» y filmó en 1927 «Entre los hielos de las Islas Orcadas».',
    sourceIds: ['cancilleria'],
  },
  {
    id: 'eras-unica-base',
    chapter: 'journey',
    kind: 'real',
    title: 'Presencia solitaria',
    text: 'Durante cuarenta años fue la única base argentina y la única de las Orcadas del Sur.',
    sourceIds: ['cancilleria'],
  },
  {
    id: 'eras-traspaso-armada',
    chapter: 'journey',
    kind: 'real',
    title: 'Destacamento Naval',
    text: 'En 1951 el observatorio pasó a jurisdicción de la Armada como Destacamento Naval Orcadas del Sur (1951 según la Armada, 1952 según Cancillería).',
    sourceIds: ['armada', 'cancilleria'],
  },

  // journey: century
  {
    id: 'century-promedios-temp',
    chapter: 'journey',
    kind: 'calc',
    title: 'Promedios térmicos',
    text: 'Mes más frío promedio: julio (-10,0 °C); más cálido: febrero (+0,8 °C).',
    sourceIds: ['reader'],
  },
  {
    id: 'century-record-frio',
    chapter: 'journey',
    kind: 'real',
    title: 'Récord de frío',
    text: 'Mes más frío del registro: julio de 1930 (-21,2 °C).',
    sourceIds: ['reader'],
  },
  {
    id: 'century-tendencia-zazulie',
    chapter: 'journey',
    kind: 'real',
    title: 'Tendencia estacional',
    text: 'Un estudio del registro diario de Orcadas no encontró tendencias significativas entre 1903 y 1950, y sí un calentamiento significativo en las cuatro estaciones del año desde 1950.',
    sourceIds: ['zazulie2010'],
  },

  // answer
  {
    id: 'done-monumento-hsm42',
    chapter: 'answer',
    kind: 'real',
    title: 'Sitio y Monumento Histórico N.º 42',
    text: 'Casa Moneta, Casa Omond y un cementerio contiguo forman el Sitio y Monumento Histórico N.º 42 del Tratado Antártico.',
    sourceIds: ['cancilleria', 'hsm42'],
  },
  {
    id: 'done-laborc-actual',
    chapter: 'answer',
    kind: 'real',
    title: 'Ciencia actual y LABORC',
    text: 'Hoy se estudia meteorología de superficie y de altura, geología, glaciología, geofísica, magnetismo, atmósfera y biología; gran parte en el laboratorio LABORC.',
    sourceIds: ['cancilleria'],
  },
] as const;

/** A 'real' fact is shown only if every one of its sources is verified; other kinds are always shown, labelled. */
export function isPublishable(fact: OrcadasFact): boolean {
  if (fact.kind !== 'real') return true;
  if (fact.sourceIds.length === 0) return false;
  return fact.sourceIds.every((id) => SOURCE_MAP.get(id)?.verified === true);
}

export function factsFor(chapter: FactPlace): OrcadasFact[] {
  return ORCADAS_FACTS.filter((fact) => fact.chapter === chapter && isPublishable(fact));
}

export function sourcesOf(fact: OrcadasFact): OrcadasSource[] {
  return fact.sourceIds
    .map((id) => SOURCE_MAP.get(id))
    .filter((src): src is OrcadasSource => src !== undefined);
}

export type BuildingId = 'omond' | 'flag' | 'windMast' | 'moneta' | 'radioMast' | 'modern';
export type EraId = 'omond' | 'traspaso' | 'moneta' | 'radio' | 'navy' | 'today';

export interface OrcadasEra {
  id: EraId;
  fromYear: number;
  /** True when `fromYear` is only an illustrative boundary without a source: the UI hides the year. */
  illustrativeStart?: boolean;
  title: string;
  summary: string;
  buildings: readonly BuildingId[];
  factIds: readonly string[];
}

export const ORCADAS_ERAS: readonly OrcadasEra[] = [
  {
    id: 'omond',
    fromYear: 1903,
    title: 'Casa Omond',
    summary: 'Observatorio meteorológico de piedra inaugurado por la expedición escocesa de Bruce.',
    // In 1903 the anemometer stood on the Scotia's deck, not on land (Mossman 1907), and no flag flew yet.
    buildings: ['omond'],
    factIds: ['eras-expedicion-bruce'],
  },
  {
    id: 'traspaso',
    fromYear: 1904,
    title: 'Traspaso a la Argentina',
    summary: 'El observatorio pasa a manos argentinas y se iza la bandera.',
    buildings: ['omond', 'flag'],
    factIds: ['eras-decreto-1904', 'eras-traspaso-1904', 'eras-hugo-acuna'],
  },
  {
    id: 'moneta',
    fromYear: 1905,
    title: 'Casa Moneta',
    summary: 'Se suma la casa de madera principal junto al observatorio de piedra.',
    // The land wind mast from 1905 is a reconstruction: its start year is [Fuente a definir].
    buildings: ['omond', 'flag', 'windMast', 'moneta'],
    factIds: ['eras-casa-moneta-1905'],
  },
  {
    id: 'radio',
    fromYear: 1927,
    title: 'Primera estación de radio',
    summary: 'Primera estación radiotelegráfica antártica y dotación de argentinos nativos.',
    buildings: ['omond', 'flag', 'windMast', 'moneta', 'radioMast'],
    factIds: [
      'eras-radio-1927',
      'eras-dotacion-nativa-1927',
      'eras-jose-moneta',
      'eras-unica-base',
      'century-record-frio',
    ],
  },
  {
    id: 'navy',
    fromYear: 1951,
    title: 'Destacamento Naval',
    summary: 'El observatorio pasa a jurisdicción de la Armada Argentina.',
    buildings: ['omond', 'flag', 'windMast', 'moneta', 'radioMast'],
    factIds: ['eras-traspaso-armada', 'century-tendencia-zazulie'],
  },
  {
    // No sourced date was found for LABORC or the current modules (Cancillería, COMNAP, Nov 2026):
    // 2000 is only the internal boundary of the era and is never shown as a date.
    id: 'today',
    fromYear: 2000,
    illustrativeStart: true,
    title: 'Hoy',
    summary: 'Investigación multidisciplinaria en el laboratorio LABORC y monitoreo ambiental.',
    buildings: ['omond', 'flag', 'windMast', 'moneta', 'radioMast', 'modern'],
    factIds: ['century-promedios-temp'],
  },
] as const;

export type OrcadasHotspotId = 'screen' | 'mast' | 'house' | 'flag' | 'bay' | 'colony' | 'boat';

export interface OrcadasTourStop {
  id: string;
  chapter: Chapter;
  spot: OrcadasHotspotId | 'overview';
  factId: string;
  /** Short 1-2 line summary (<= 120 chars), derived only from the fact text. */
  line: string;
  /** Journey stops only: the year the stop sets ('now' = maxYear). */
  year?: number | 'now';
  /**
   * Facts folded under the stop's «Saber más»: what the line leaves out. The stop's own fact is
   * listed only when the line shortens it; otherwise «Saber más» would repeat the line.
   */
  more: readonly string[];
}

export const ORCADAS_TOUR: readonly OrcadasTourStop[] = [
  // arrival
  {
    id: 'arrival-istmo',
    chapter: 'arrival',
    spot: 'overview',
    factId: 'arrival-istmo',
    line: 'La base está en el istmo Ibarguren, entre las bahías Scotia y Uruguay, en la isla Laurie.',
    more: ['arrival-coordenadas', 'arrival-elevacion'],
  },
  {
    id: 'arrival-antiguedad',
    chapter: 'arrival',
    spot: 'flag',
    factId: 'arrival-antiguedad',
    line: 'Es la presencia humana estable más antigua de la Antártida.',
    more: [],
  },
  {
    id: 'arrival-monumento',
    chapter: 'arrival',
    spot: 'house',
    factId: 'done-monumento-hsm42',
    line: 'Casa Omond y Casa Moneta forman, con un cementerio, el Sitio y Monumento Histórico N.º 42.',
    more: [],
  },
  {
    id: 'arrival-fauna',
    chapter: 'arrival',
    spot: 'colony',
    factId: 'arrival-fauna',
    line: 'Viven pingüinos barbijo y adelia, skúas, petreles, elefantes marinos y focas de Weddell.',
    more: ['arrival-fauna'],
  },

  // observation
  {
    id: 'obs-abrigo',
    chapter: 'observation',
    spot: 'screen',
    factId: 'obs-instrumental-1903',
    line: 'En 1903 había cuatro abrigos meteorológicos con termómetros seco y húmedo, de máxima y de mínima.',
    more: ['obs-instrumental-1903', 'obs-registro-1903', 'obs-simulacion'],
  },

  // journey
  {
    id: 'journey-1903',
    chapter: 'journey',
    spot: 'overview',
    factId: 'eras-expedicion-bruce',
    year: 1903,
    line: 'La expedición escocesa de Bruce inauguró el observatorio el 1 de abril de 1903.',
    more: ['eras-decreto-1904', 'eras-traspaso-1904', 'eras-hugo-acuna', 'eras-casa-moneta-1905'],
  },
  {
    id: 'journey-1927',
    chapter: 'journey',
    spot: 'overview',
    factId: 'eras-radio-1927',
    year: 1927,
    line: 'En 1927 se inauguró la primera estación radiotelegráfica antártica.',
    more: ['eras-radio-1927', 'eras-dotacion-nativa-1927', 'eras-jose-moneta'],
  },
  {
    id: 'journey-1951',
    chapter: 'journey',
    spot: 'overview',
    factId: 'eras-traspaso-armada',
    year: 1951,
    line: 'En 1951 pasó a la Armada como Destacamento Naval (1952 según Cancillería).',
    more: ['eras-unica-base'],
  },
  {
    id: 'journey-now',
    chapter: 'journey',
    spot: 'overview',
    factId: 'century-tendencia-zazulie',
    year: 'now',
    line: 'Desde 1950 el registro muestra un calentamiento significativo en las cuatro estaciones.',
    more: ['century-tendencia-zazulie', 'century-promedios-temp', 'century-record-frio'],
  },
] as const;

const FACT_MAP = new Map<string, OrcadasFact>(ORCADAS_FACTS.map((f) => [f.id, f]));
const TOUR_FACT_IDS = new Set(ORCADAS_TOUR.flatMap((stop) => [stop.factId, ...stop.more]));

export function factById(id: string): OrcadasFact | null {
  return FACT_MAP.get(id) ?? null;
}

/** Publishable guided-tour stops for a chapter, in declared order. */
export function tourStops(chapter: Chapter): OrcadasTourStop[] {
  return ORCADAS_TOUR.filter((stop) => {
    if (stop.chapter !== chapter) return false;
    const fact = FACT_MAP.get(stop.factId);
    return fact !== undefined && isPublishable(fact);
  });
}

/** Publishable facts folded under a stop's «Saber más», in declared order. */
export function stopMoreFacts(stop: OrcadasTourStop): OrcadasFact[] {
  return stop.more
    .map((id) => FACT_MAP.get(id))
    .filter((f): f is OrcadasFact => f !== undefined && isPublishable(f));
}

/** Guided-tour stop at `index` for `chapter`, or null if out of range. */
export function tourStop(chapter: Chapter, index: number): OrcadasTourStop | null {
  const stops = tourStops(chapter);
  const idx = Math.trunc(index);
  if (idx < 0 || idx >= stops.length) return null;
  return stops[idx];
}

/** Facts shown on each scene hotspot card. Explicit ids: one fact never appears on two hotspots. */
export const ORCADAS_HOTSPOT_FACTS: Record<OrcadasHotspotId, readonly string[]> = {
  screen: ['obs-instrumental-1903'],
  mast: ['obs-estacion-centenaria'],
  house: ['arrival-coordenadas'],
  flag: ['arrival-antiguedad'],
  bay: ['year-hielo-octubre'],
  boat: ['arrival-transporte'],
  colony: ['arrival-fauna'],
};

/** Facts a panel shows at once; the rest go folded under «Saber más». */
export const PANEL_VISIBLE_FACTS = 2;

/**
 * Facts for a panel (a chapter or the month strip): never the ones a hotspot card or a tour stop
 * shows, so the same fact is not on screen twice. Split into the visible ones and the folded rest.
 */
export function panelFacts(facts: readonly OrcadasFact[]): {
  visible: OrcadasFact[];
  more: OrcadasFact[];
} {
  const onHotspots = new Set(Object.values(ORCADAS_HOTSPOT_FACTS).flat());
  const own = facts.filter((f) => !onHotspots.has(f.id) && !TOUR_FACT_IDS.has(f.id));
  return { visible: own.slice(0, PANEL_VISIBLE_FACTS), more: own.slice(PANEL_VISIBLE_FACTS) };
}

/** Publishable facts of a hotspot, in declared order. */
export function hotspotFacts(id: OrcadasHotspotId): OrcadasFact[] {
  return ORCADAS_HOTSPOT_FACTS[id]
    .map((factId) => ORCADAS_FACTS.find((f) => f.id === factId))
    .filter((f): f is OrcadasFact => f !== undefined && isPublishable(f));
}

/** Scene element a hotspot points at, when that element depends on the era. */
export const HOTSPOT_BUILDING: Partial<Record<OrcadasHotspotId, BuildingId>> = {
  flag: 'flag',
  mast: 'windMast',
};

/** Facts of the journey chapter for the active era, in the era's order. */
export function journeyFacts(year: number): OrcadasFact[] {
  return eraAt(year)
    .factIds.map((id) => ORCADAS_FACTS.find((f) => f.id === id))
    .filter((f): f is OrcadasFact => f !== undefined && isPublishable(f));
}

export function eraAt(year: number): OrcadasEra {
  for (let i = ORCADAS_ERAS.length - 1; i >= 0; i--) {
    if (year >= ORCADAS_ERAS[i].fromYear) {
      return ORCADAS_ERAS[i];
    }
  }
  return ORCADAS_ERAS[0];
}

/** Illustrative sea-ice cover of the bay per month (1..12), 0..1. Simulation, not data. */
export function seaIceAt(month: number): number {
  switch (month) {
    case 1:
    case 2:
    case 3:
    case 4:
    case 12:
      return 0;
    case 5:
    case 11:
      return 0.3;
    case 6:
    case 10:
      return 0.7;
    case 7:
    case 8:
    case 9:
      return 1;
    default:
      return 0;
  }
}

export interface OrcadasAnimal {
  id: 'adelie' | 'chinstrap' | 'weddell' | 'elephant' | 'skua' | 'snowPetrel';
  name: string;
  months: readonly number[]; /* illustrative presence */
}

export const ORCADAS_FAUNA: readonly OrcadasAnimal[] = [
  {
    id: 'adelie',
    name: 'Pingüino adelia',
    months: [10, 11, 12, 1, 2, 3],
  },
  {
    id: 'chinstrap',
    name: 'Pingüino barbijo',
    months: [10, 11, 12, 1, 2, 3],
  },
  {
    id: 'weddell',
    name: 'Foca de Weddell',
    months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  },
  {
    id: 'elephant',
    name: 'Elefante marino',
    months: [10, 11, 12, 1, 2, 3, 4],
  },
  {
    id: 'skua',
    name: 'Skúa',
    months: [10, 11, 12, 1, 2, 3],
  },
  {
    id: 'snowPetrel',
    name: 'Petrel de las nieves',
    months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  },
] as const;

export const MONTH_NAMES: readonly string[] = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const;
