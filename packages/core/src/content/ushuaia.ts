/**
 * Content of the expedition "Desde Ushuaia" (issue #4): the one-way trip from Ushuaia to Antarctica
 * on the Argentine scientific transports. Every text comes from docs/expediciones/desde-ushuaia.md;
 * source codes point to docs/expediciones/desde-ushuaia-fuentes.md.
 */

/**
 * What a statement is. The interface tells them apart without labels: a real fact cites its source
 * by number, an estimate starts with «Aproximadamente» and says it is our own calculation, and an
 * illustrative note says so in its own words.
 */
export type VoyageDataKind = 'real' | 'estimate' | 'illustrative';

export interface VoyageSource {
  org: string;
  title: string;
  url: string;
}

/** Date every source below was read. */
export const VOYAGE_SOURCES_CONSULTED = '2026-11-11';

export const VOYAGE_SOURCES = {
  U1: { org: 'Bujalesky, Aliotta e Isla (CADIC-CONICET, IADO-CONICET, UNMdP)', title: '«Facies del subfondo del canal Beagle», Revista de la Asociación Geológica Argentina 59(1), 2004', url: 'https://revista.geologica.org.ar/raga/article/download/1341/1393/4919' },
  U2: { org: 'Caselli y Agusto (FCEN-UBA)', title: 'Artículo sobre Isla Decepción, Revista de la Asociación Geológica Argentina 59(3), 2004', url: 'https://revista.geologica.org.ar/raga/article/download/1456/1438/5026' },
  U3: { org: 'Morgavi, Cohen y Vereda (UNTDF y CONICET)', title: '«Competitividad de Ushuaia como puerta de entrada…», Aportes y Transferencias 18(1), 2020', url: 'https://eco.mdp.edu.ar/revistas/index.php/aportes/article/download/291/265/638' },
  U4: { org: 'Vereda, Jensen (UNTDF) y Fontana (IAA)', title: '«La evolución del turismo antártico y su relación con las políticas públicas nacionales y provinciales», Registros 15(2), 2019', url: 'https://revistasfaud.mdp.edu.ar/registros/article/download/329/217/2090' },
  U7: { org: 'Boy, C. C. (FCEN-UBA)', title: 'Crecimiento en el delfín austral, tesis de licenciatura, 1999', url: 'https://bibliotecadigital.exactas.uba.ar/download/seminario/seminario_nBIO000645_Boy.pdf' },
  U8: { org: 'Juáres, M. A. (FCNyM-UNLP; dirigida por N. Coria, IAA)', title: 'Tesis doctoral sobre Punta Stranger, isla 25 de Mayo, 2013', url: 'https://api.naturalis.fcnym.unlp.edu.ar/server/api/core/bitstreams/f2325bfb-7b91-4f81-b3a3-dfc682923ed5/content' },
  O2: { org: 'Armada Argentina', title: 'Bases antárticas permanentes', url: 'https://www.argentina.gob.ar/armada/antartida/bases-permanentes' },
  O5: { org: 'Armada Argentina', title: 'Ficha del rompehielos ARA «Almirante Irízar» (Q-5)', url: 'https://www.argentina.gob.ar/armada/superficie/unidades/rompehielos/rompehielos-ara-almirante-irizar-q-5' },
  O6: { org: 'Armada Argentina', title: 'Ficha del aviso ARA «Puerto Argentino» (A-21)', url: 'https://www.argentina.gob.ar/armada/superficie/unidades/avisos/aviso-ara-puerto-argentino-21' },
  O7: { org: 'Armada Argentina', title: 'Nota «Regreso de la Antártida del aviso ARA Puerto Argentino» (07-04-2026)', url: 'https://www.argentina.gob.ar/noticias/regreso-de-la-antartida-el-aviso-ara-puerto-argentino' },
  O10: { org: 'Cancillería — Dirección Nacional del Antártico', title: 'Logística y medios de transporte', url: 'https://cancilleria.gob.ar/es/iniciativas/dna/antartida-argentina/logistica-y-medios-de-transporte' },
  O12: { org: 'Cancillería — Dirección Nacional del Antártico', title: 'Línea histórica 1957-1990', url: 'https://cancilleria.gob.ar/es/iniciativas/dna/historia-y-patrimonio/linea-historica/1957-1990' },
  O13: { org: 'Cancillería (Embajada en Uruguay)', title: '«45 años del primer aterrizaje de un Hércules C-130 en Marambio»', url: 'https://eurug.cancilleria.gob.ar/es/content/45-a%C3%B1os-del-primer-aterrizaje-de-un-h%C3%A9rcules-c-130-en-marambio' },
  O14: { org: 'Fuerza Aérea Argentina', title: 'Escuadrón I C-130 Hércules (2023)', url: 'https://www.argentina.gob.ar/noticias/escuadron-i-c-130-hercules-un-pilar-fundamental-para-la-aviacion-militar-argentina' },
  O16: { org: 'Gobierno nacional', title: '«Finalizó la tercera etapa de la Campaña Antártica de Verano» (10-04-2025)', url: 'https://www.argentina.gob.ar/noticias/finalizo-la-tercera-etapa-de-la-campana-antartica-de-verano' },
  O20: { org: 'CADIC-CONICET (Ushuaia)', title: 'Mes de la biodiversidad 2021 (fauna del Beagle)', url: 'https://cadic.conicet.gov.ar/mesdelabiodiversidad-2021/' },
  O22: { org: 'Armada Argentina', title: '«Inició la última etapa de la Campaña Antártica de Verano 2025-26» (11-03-2026)', url: 'https://www.argentina.gob.ar/noticias/inicio-la-ultima-etapa-de-la-campana-antartica-de-verano-2025-26' },
  O24: { org: 'Armada Argentina', title: '«El rompehielos ARA Almirante Irízar completó las operaciones en la Base Antártica Conjunta [Marambio]» (30-12-2025)', url: 'https://www.argentina.gob.ar/noticias/el-rompehielos-ara-almirante-irizar-completo-las-operaciones-en-la-base-antartica-conjunta' },
  O30: { org: 'Rosciano, Svagelj y Raya Rey (CADIC y CENPAT-CONICET)', title: 'Revista de Biología Marina y Oceanografía 48(1), 2013 (cormorán imperial en el Beagle)', url: 'https://www.redalyc.org/pdf/479/47926382012.pdf' },
  O31: { org: 'Meza y Ochoa (IMARPE, Perú)', title: 'Boletín del Instituto del Mar del Perú 36(1), 2021: aves en Bransfield e isla Elefante, campaña ANTAR XXVI', url: 'https://revistas.imarpe.gob.pe/index.php/boletin/article/download/319/304/595' },
  O32: { org: 'Aguilar-Arakaki y Ochoa-Madrid (IMARPE, Perú)', title: 'Boletín del Instituto del Mar del Perú 37(1), 2022: cetáceos de la campaña ANTAR XXVI', url: 'https://revistas.imarpe.gob.pe/index.php/boletin/article/download/361/354/660' },
  O33: { org: 'CONICET (CADIC-CONICET)', title: '«Pingüinos en plan de ahorro de energía» (28-11-2012)', url: 'https://www.conicet.gov.ar/pinguinos-en-plan-de-ahorro-de-energia/' },
  O34: { org: 'Armada Argentina', title: '«Día Nacional de la Isla de los Estados» (10-08-2022)', url: 'https://www.argentina.gob.ar/node/331249' },
  O35: { org: 'Gobierno de Tierra del Fuego (Instituto Fueguino de Turismo)', title: '«El Instituto Fueguino de Turismo invita a recorrer la historia del faro Les Eclaireurs a través de imágenes» (22-12-2020)', url: 'https://www.tierradelfuego.gob.ar/blog/2020/12/22/el-instituto-fueguino-de-turismo-invita-a-recorrer-la-historia-del-faro-les-eclaireurs-a-traves-de-imagenes/' },
  O36: { org: 'Santos, Hinke, Coria, Fusaro, Silvestro y Juares (Instituto Antártico Argentino, CONICET, UNLP, NOAA)', title: '«Abundance estimation of Adélie penguins at the Esperanza/Hope Bay mega colony», Polar Biology, 2018', url: 'https://ri.conicet.gov.ar/handle/11336/81406' },
  O37: { org: 'Negrete, Soibelzon, Soibelzon y Lusky (Instituto Antártico Argentino, UNLP, CONICET)', title: '«New records of mummified crabeater seals on islands bordering Admiralty Sound, Weddell Sea», Antarctic Science, 2019 (resumen)', url: 'https://ri.conicet.gov.ar/handle/11336/128016' },
  O38: { org: 'Daneri, Negri, Coria, Negrete, Libertelli y Corbalán (MACN-CONICET e Instituto Antártico Argentino)', title: '«Fish prey of Weddell seals, Leptonychotes weddellii, at Hope Bay, Antarctic Peninsula, during the late summer», Polar Biology, 2018', url: 'https://ri.conicet.gov.ar/handle/11336/93207' },
  I1: { org: 'Secretaría del Tratado Antártico', title: 'Tratado Antártico (1959), art. VI', url: 'https://documents.ats.aq/keydocs/vol_1/vol1_2_AT_Antarctic_Treaty_e.pdf' },
  I5: { org: 'NASA Earth Observatory', title: '«Cape Horn: A Mariner\'s Nightmare» (24-12-2017)', url: 'https://science.nasa.gov/earth/earth-observatory/cape-horn-a-mariners-nightmare-91472/' },
  I6: { org: 'Eos / AGU', title: '«Notorious ocean current is far stronger than previously thought» (27-12-2016)', url: 'https://eos.org/research-spotlights/notorious-ocean-current-is-far-stronger-than-previously-thought' },
  I7: { org: 'NSIDC', title: 'Antarctic polar front', url: 'https://nsidc.org/learn/cryosphere-glossary/antarctic-polar-front' },
  I8: { org: 'NOAA Institutional Repository', title: 'Freeman y Lovenduski, ESSD 8, 2016', url: 'https://repository.library.noaa.gov/view/noaa/24331' },
  I9: { org: 'Plan de gestión ZAEA n.º 4 (ATCM XXVIII, 2005)', title: 'Isla Decepción', url: 'https://www.deceptionisland.aq/documents/asma.pdf' },
  I11: { org: 'ACAP', title: 'Species assessment: Wandering Albatross (2009)', url: 'https://www.acap.aq/acap-species/304-wandering-albatross/file' },
  I12: { org: 'ACAP', title: 'Species assessment: Southern Giant Petrel (2010)', url: 'https://www.acap.aq/acap-species/288-southern-giant-petrel/file' },
  I14: { org: 'Ministerio del Medio Ambiente de Chile', title: 'Ficha RCE 13 de Lagenorhynchus cruciger', url: 'https://clasificacionespecies.mma.gob.cl/wp-content/uploads/2019/10/Lagenorhynchus_cruciger_FIN_13RCE.pdf' },
  I19: { org: 'Kampp, K.', title: '«Seabird observations from the South and Central Atlantic Ocean, Antarctica to 30°N, March-April 1998 and 2000», Atlantic Seabirds 3(1), 2001', url: 'https://natuurtijdschriften.nl/pub/546113/ASB2001003001001.pdf' },
  I20: { org: 'Santora, J. A.', title: '«Habitat use of hourglass dolphins near the South Shetland Islands, Antarctica», 2011 (doi:10.1007/s00300-011-1133-8; copia abierta en Zenodo)', url: 'https://zenodo.org/records/1232673' },
  I21: { org: 'Woodman, Borras-Chavez, Goebel, Torres, Aguayo y Krause (NOAA Fisheries, SWFSC)', title: '«CS-PHOC: weekly census counts of Southern Ocean phocids at Cape Shirreff, Livingston Island», Scientific Data 11(1), 2024', url: 'https://repository.library.noaa.gov/view/noaa/65765' },
  I16: { org: 'Australian Antarctic Division', title: 'Fichas de especie: focas y pingüinos antárticos', url: 'https://www.antarctica.gov.au/about-antarctica/animals/' },
} as const satisfies Record<string, VoyageSource>;

export type VoyageSourceCode = keyof typeof VOYAGE_SOURCES;

/** Sources in the order of the sources page; a fact cites them by their number there. */
export const VOYAGE_SOURCE_CODES = Object.keys(VOYAGE_SOURCES) as VoyageSourceCode[];
export const voyageSourceNumber = (code: VoyageSourceCode) => VOYAGE_SOURCE_CODES.indexOf(code) + 1;

/** One statement with what it is and where it comes from. Estimates explain their own calculation. */
export interface VoyageFact {
  text: string;
  kind: VoyageDataKind;
  sources: readonly VoyageSourceCode[];
}

export type TransportId = 'irizar' | 'hercules' | 'puerto-argentino';
export type TransportKind = 'ship' | 'plane';

export interface Transport {
  id: TransportId;
  kind: TransportKind;
  name: string;
  type: string;
  /** One line for the picker. */
  pitch: string;
  facts: readonly VoyageFact[];
}

export const TRANSPORTS: readonly Transport[] = [
  {
    id: 'irizar',
    kind: 'ship',
    name: 'ARA Almirante Irízar',
    type: 'Rompehielos',
    pitch: 'El buque insignia de la campaña antártica. Lleva carga, combustible y dos helicópteros.',
    facts: [
      { text: 'Es «el buque insignia del Comando Conjunto Antártico». Mide 121,3 m de largo y navega a 14 nudos.', kind: 'real', sources: ['O5'] },
      { text: 'En marzo de 2026 salió de Ushuaia con 65 toneladas de carga y 260 tambores y tubos de combustible, gas y aceites para las bases.', kind: 'real', sources: ['O22'] },
      { text: 'Lleva dos helicópteros Sea King. En Marambio, que está sobre una meseta, la carga pasa del buque a la base en helicóptero.', kind: 'real', sources: ['O16', 'O24'] },
      { text: 'Aproximadamente 39 horas lleva recorrer los 1.000 km hasta la Península a 14 nudos (cálculo propio).', kind: 'estimate', sources: [] },
    ],
  },
  {
    id: 'hercules',
    kind: 'plane',
    name: 'Hércules C-130',
    type: 'Avión de carga',
    pitch: 'El puente aéreo de la Fuerza Aérea. Cruza en horas y aterriza en la pista de Marambio.',
    facts: [
      { text: 'Los C-130 cubren el cruce entre «Río Gallegos o Ushuaia» y la Base Marambio.', kind: 'real', sources: ['O10'] },
      { text: 'Desde Río Gallegos el vuelo dura unas tres horas y media.', kind: 'real', sources: ['O14'] },
      { text: 'El primer C-130 aterrizó en Marambio el 11 de abril de 1970.', kind: 'real', sources: ['O13'] },
      { text: 'Aproximadamente 1.230 km separan Ushuaia de Marambio en línea recta (cálculo propio).', kind: 'estimate', sources: [] },
    ],
  },
  {
    id: 'puerto-argentino',
    kind: 'ship',
    name: 'ARA Puerto Argentino',
    type: 'Aviso',
    pitch: 'Un buque de servicio antártico. Patrulla, mantiene balizas y abastece bases.',
    facts: [
      { text: 'En la campaña 2025/26 hizo patrullas, mantuvo balizas y abasteció bases. También fue Buque de Estación desde Ushuaia.', kind: 'real', sources: ['O7'] },
      { text: 'Mide 81,37 m de largo, navega a 15 nudos y puede pasar 40 días en el mar a 12 nudos.', kind: 'real', sources: ['O6'] },
      { text: 'En la etapa final zarpó de Ushuaia junto al Irízar.', kind: 'real', sources: ['O22'] },
    ],
  },
];

/**
 * Where a milestone sits on the trip: the point of the path closest to a [lon, lat] anchor, or the
 * first point at or south of a latitude.
 */
export type MilestoneAnchor = readonly [lon: number, lat: number] | { readonly lat: number };

export interface Milestone {
  id: string;
  title: string;
  anchor: MilestoneAnchor;
  /** Transports that pass by it. */
  kinds: readonly TransportKind[];
  /** Explorar: the essential, one or two sentences. */
  essential: VoyageFact;
  /** Profundizar: «Saber más». */
  more: readonly VoyageFact[];
}

const BOTH: readonly TransportKind[] = ['ship', 'plane'];

/** In trip order. The first one opens at departure and the last one on arrival. */
export const MILESTONES: readonly Milestone[] = [
  {
    id: 'beagle',
    title: 'Ushuaia y el Canal Beagle',
    anchor: [-68.3, -54.81],
    kinds: BOTH,
    essential: { text: 'Ushuaia está a unos 1.000 km de la Península Antártica. El Canal Beagle es su salida al mar: del otro lado se ven las islas Hoste y Navarino.', kind: 'real', sources: ['U3', 'U1'] },
    more: [
      { text: 'El canal mide unos 180 km y une el Pacífico con el Atlántico. Tiene 5 km de ancho medio y hasta 300 m de profundidad.', kind: 'real', sources: ['U1'] },
      { text: 'Es un valle que el hielo cubrió en la última glaciación.', kind: 'real', sources: ['U1'] },
      { text: 'Ushuaia tiene «características naturales de puerto de aguas profundas y bahía abrigada».', kind: 'real', sources: ['U4'] },
    ],
  },
  {
    id: 'mar-abierto',
    title: 'La salida al mar abierto',
    anchor: [-66.85, -55.32],
    kinds: ['ship'],
    essential: { text: 'Entre las montañas hay un camino de agua. El canal se abre al Atlántico por su boca oriental y desde ahí el buque gira hacia el sur.', kind: 'real', sources: ['U1'] },
    more: [
      { text: 'El paso más angosto es el paso Mackinlay, junto a la isla Gable: 1,8 km de ancho y solo 30 m de profundidad.', kind: 'real', sources: ['U1'] },
      { text: 'La boca oriental del canal está cerca de los 66°30′ de longitud oeste.', kind: 'real', sources: ['U1'] },
    ],
  },
  {
    id: 'hornos',
    title: 'Cabo de Hornos',
    anchor: [-67.47, -56.22],
    kinds: ['ship'],
    essential: { text: 'El último pedazo de tierra de América. Cientos de barcos se hundieron en estas aguas.', kind: 'real', sources: ['I5'] },
    more: [
      { text: 'El holandés Willem Schouten trazó por primera vez un rumbo alrededor del cabo en 1616.', kind: 'real', sources: ['I5'] },
      { text: 'Al sudoeste el fondo del mar sube de 4.020 m a 100 m en pocos kilómetros. Con los vientos del oeste, eso levanta olas enormes.', kind: 'real', sources: ['I5'] },
    ],
  },
  {
    id: 'drake',
    title: 'Pasaje de Drake',
    anchor: { lat: -57.6 },
    kinds: BOTH,
    essential: { text: 'Unos 800 km de mar abierto entre el Cabo de Hornos y las islas Shetland del Sur. Por acá pasa la corriente más caudalosa del planeta.', kind: 'real', sources: ['I6'] },
    more: [
      { text: 'La Corriente Circumpolar Antártica mueve en promedio 173,3 millones de metros cúbicos de agua por segundo, medidos entre 2007 y 2011. Es un 30 % más de lo que se creía.', kind: 'real', sources: ['I6'] },
      { text: 'En la campaña 2024/25 el Irízar cruzó el Drake «en menos de dos días», a 14 nudos de promedio.', kind: 'real', sources: ['O16'] },
    ],
  },
  {
    id: 'convergencia',
    title: 'Convergencia Antártica',
    anchor: { lat: -58.9 },
    kinds: BOTH,
    essential: { text: 'Una frontera invisible en el mar: el agua fría antártica se encuentra con agua más templada. En el frente, la superficie del mar ronda los 5 a 6 °C.', kind: 'real', sources: ['I7'] },
    more: [
      { text: 'Es el límite norte de la zona antártica. Alrededor del continente se ubica entre los 44° y los 64° de latitud sur.', kind: 'real', sources: ['I7', 'I8'] },
      { text: 'El punto del viaje donde aparece este cartel es ilustrativo: no hay fuente que dé su posición exacta en el Drake.', kind: 'illustrative', sources: [] },
    ],
  },
  {
    id: 'paralelo-60',
    title: 'Paralelo 60° Sur',
    anchor: { lat: -60 },
    kinds: BOTH,
    essential: { text: 'Desde esta línea hacia el sur rige el Tratado Antártico. Argentina es uno de sus 12 firmantes originales.', kind: 'real', sources: ['I1', 'O12'] },
    more: [
      { text: 'El Tratado se aplica al sur de los 60° de latitud sur, incluidas todas las barreras de hielo (artículo VI).', kind: 'real', sources: ['I1'] },
    ],
  },
  {
    id: 'shetland',
    title: 'Islas Shetland del Sur',
    anchor: [-59.28, -62.54],
    kinds: ['ship'],
    essential: { text: 'Primera tierra antártica. Cerca está la Isla Decepción: un volcán inundado con forma de herradura, donde los barcos entran por una sola abertura.', kind: 'real', sources: ['I9'] },
    more: [
      { text: 'La entrada a Decepción, los Fuelles de Neptuno, mide unos 500 m de ancho.', kind: 'real', sources: ['I9'] },
      { text: 'En Decepción se registraron erupciones en 1842, 1967, 1969 y 1970.', kind: 'real', sources: ['U2'] },
    ],
  },
  {
    id: 'marambio',
    title: 'Base Marambio',
    anchor: [-56.62, -64.23],
    kinds: BOTH,
    essential: { text: 'Llegaste. Marambio es la única base argentina con pista para aviones de carga y pasajeros, a unos 200 m sobre el mar.', kind: 'real', sources: ['O2', 'O24'] },
    more: [
      { text: 'Se fundó el 29 de octubre de 1969.', kind: 'real', sources: ['O2'] },
      { text: 'Fue «la primera pista de aterrizaje de tierra, precisamente permafrost, en el Continente Antártico».', kind: 'real', sources: ['O12'] },
    ],
  },
];

/** Tourism is only context here: it is not a playable transport. */
export const VOYAGE_TOURISM_NOTE: VoyageFact = {
  text: 'Por Ushuaia también pasa entre el 85 % y el 90 % del turismo antártico. Acá viajás en los medios de la ciencia.',
  kind: 'real',
  sources: ['U3'],
};

export type SightingIcon = 'bird' | 'penguin' | 'whale' | 'dolphin' | 'seal' | 'lighthouse';

/** An animal the traveller may spot from a ship. Only species with an open, read source. */
export interface Sighting {
  id: string;
  name: string;
  latin: string;
  icon: SightingIcon;
  /** Point of the sea route it shows up near, as [lon, lat]. */
  anchor: readonly [lon: number, lat: number];
  /** Map units to the side of the route (positive: starboard). Small inside the Beagle Channel. */
  offset: number;
  /** The Beagle Channel is a short stretch of the trip: its animals stay in view for less of it. */
  brief?: boolean;
  /**
   * A place, not an animal: it is drawn here, at its own approximate position as [lon, lat],
   * instead of beside the route. `latin` then says where it is.
   */
  place?: readonly [lon: number, lat: number];
  fact: VoyageFact;
}

/**
 * In trip order: more of them the farther south. ILLUSTRATIVE positions: no source says where an
 * animal is at a given moment; the zone is the one the source names or a latitude range.
 */
export const SIGHTINGS: readonly Sighting[] = [
  // Beagle Channel
  { id: 'cormoran', name: 'Cormorán imperial', latin: 'Leucocarbo atriceps', icon: 'bird', anchor: [-68, -54.89], offset: -0.2, brief: true,
    fact: { text: 'Es el ave marina más abundante del canal. En el verano 2008-09 anidaba en 5 islas del sector argentino, con 7.703 nidos activos.', kind: 'real', sources: ['O20', 'O30'] } },
  { id: 'eclaireurs', name: 'Faro Les Éclaireurs', latin: 'Canal Beagle', icon: 'lighthouse', anchor: [-67.88, -54.89], offset: 0, brief: true, place: [-68.083, -54.871],
    fact: { text: 'Es una torre de piedra de 11 m, pintada de rojo y blanco. Entró en servicio el 23 de diciembre de 1920. El nombre de los islotes, «los exploradores», se lo puso el capitán francés Louis Ferdinand Martial.', kind: 'real', sources: ['O35'] } },
  { id: 'lobos', name: 'Lobos marinos', latin: 'dos especies', icon: 'seal', anchor: [-67.66, -54.905], offset: 0.2, brief: true,
    fact: { text: 'Dos especies viven en las islas del canal: el lobo marino sudamericano todo el año y el de dos pelos entre febrero y agosto.', kind: 'real', sources: ['O20'] } },
  { id: 'martillo', name: 'Pingüinera de Isla Martillo', latin: 'Canal Beagle · pingüino de Magallanes', icon: 'penguin', anchor: [-67.38, -54.92], offset: 0, brief: true, place: [-67.383, -54.905],
    fact: { text: 'Es la colonia de pingüinos de Magallanes más cercana a Ushuaia, a unos 40 km al este. Investigadores del CADIC-CONICET vieron que aprovechan las corrientes de marea para ir y volver de los sitios donde comen.', kind: 'real', sources: ['O33'] } },
  { id: 'delfin-austral', name: 'Delfín austral', latin: 'Lagenorhynchus australis', icon: 'dolphin', anchor: [-66.78, -55.03], offset: -0.22, brief: true,
    fact: { text: 'Es un delfín costero del archipiélago fueguino: llega hasta el Cabo de Hornos. Se lo ve en los bosques de macroalgas o cerca de ellos.', kind: 'real', sources: ['U7'] } },
  { id: 'san-juan', name: 'Faro San Juan de Salvamento', latin: 'Isla de los Estados · lejos de esta ruta, al este', icon: 'lighthouse', anchor: [-66.4, -55.2], offset: 0, place: [-63.82, -54.73],
    fact: { text: 'Fue bautizado «Faro del Fin del Mundo». Lo puso en servicio el 25 de mayo de 1884 la División Expedicionaria al Atlántico Sur, al mando del comodoro Augusto Lasserre. Es Monumento Histórico Nacional.', kind: 'real', sources: ['O34'] } },
  // Drake Passage
  { id: 'albatros', name: 'Albatros errante', latin: 'Diomedea exulans', icon: 'bird', anchor: [-66.45, -57.3], offset: 4,
    fact: { text: 'Los que crían en Georgias del Sur se mueven desde el sur de Brasil hasta la Península Antártica. Para alimentarse se alejan hasta 4.000 km de su colonia. En marzo de 1998 y de 2000 se lo contó desde un barco en el Pasaje de Drake.', kind: 'real', sources: ['I11', 'I19'] } },
  { id: 'petrel-gigante', name: 'Petrel gigante del sur', latin: 'Macronectes giganteus', icon: 'bird', anchor: [-66.33, -58.6], offset: -4.5,
    fact: { text: 'Es carroñero: en lo que regurgitan sus pichones aparecen sobre todo restos de pingüino y también carne de foca. En marzo de 1998 y de 2000 se lo contó desde un barco en el Pasaje de Drake.', kind: 'real', sources: ['I12', 'I19'] } },
  { id: 'delfin-cruzado', name: 'Delfín cruzado', latin: 'Lagenorhynchus cruciger', icon: 'dolphin', anchor: [-63.4, -60.75], offset: 4,
    fact: { text: 'Vive en mar abierto alrededor de toda la Antártida, de los 45° a cerca de los 68° de latitud sur. Nada en la proa de los barcos dando saltos. Entre 2003 y 2011 se lo vio en aguas profundas del sur del Pasaje de Drake, al norte de las Shetland del Sur, casi siempre en grupos de 2 a 6.', kind: 'real', sources: ['I14', 'I20'] } },
  // South Shetlands and Bransfield Strait
  { id: 'leopardo', name: 'Foca leopardo', latin: 'Hydrurga leptonyx', icon: 'seal', anchor: [-60, -61.95], offset: 3,
    fact: { text: 'Caza pingüinos y los sacude para sacarles la piel. Las hembras superan los 3,5 m y los 500 kg. Desde 1997 se la cuenta cada semana del verano en el cabo Shirreff, isla Livingston.', kind: 'real', sources: ['I16', 'I21'] } },
  { id: 'barbijo', name: 'Pingüino barbijo', latin: 'Pygoscelis antarcticus', icon: 'penguin', anchor: [-59.33, -62.32], offset: -3,
    fact: { text: 'Anida en la Península y en islas al sur de la Convergencia Antártica. La campaña científica peruana ANTAR XXVI (verano 2018-19) contó 472; los pingüinos se vieron sobre todo en el Estrecho de Bransfield.', kind: 'real', sources: ['U8', 'O31'] } },
  { id: 'jorobada', name: 'Ballena jorobada', latin: 'Megaptera novaeangliae', icon: 'whale', anchor: [-58.6, -62.75], offset: 4,
    fact: { text: 'Fue el cetáceo más abundante de la campaña científica peruana ANTAR XXVI (verano 2018-19): 207 individuos, sobre todo en el Estrecho de Bransfield.', kind: 'real', sources: ['O32'] } },
  { id: 'orca', name: 'Orca', latin: 'Orcinus orca', icon: 'whale', anchor: [-58.1, -62.9], offset: -4,
    fact: { text: 'La campaña científica peruana ANTAR XXVI (verano 2018-19) la vio una vez en el Estrecho de Bransfield, cerca de la isla Trinidad: eran 2 orcas.', kind: 'real', sources: ['O32'] } },
  { id: 'petrel-damero', name: 'Petrel damero', latin: 'Daption capense', icon: 'bird', anchor: [-57.6, -63.05], offset: 4.5,
    fact: { text: 'Fue el ave más abundante de la campaña ANTAR XXVI (verano 2018-19) en Bransfield e isla Elefante: 809 individuos.', kind: 'real', sources: ['O31'] } },
  // Peninsula coast and northern Weddell Sea
  { id: 'adelia', name: 'Pingüino de Adelia', latin: 'Pygoscelis adeliae', icon: 'penguin', anchor: [-56.72, -63.3], offset: 2.5,
    fact: { text: 'Arma el nido con piedritas y nada a entre 4 y 8 km/h. En Bahía Esperanza, en la punta de la Península, está una de sus colonias más grandes: unas 104.000 parejas en el verano 2012-13.', kind: 'real', sources: ['I16', 'O36'] } },
  { id: 'weddell', name: 'Foca de Weddell', latin: 'Leptonychotes weddellii', icon: 'seal', anchor: [-56.38, -63.57], offset: 3,
    fact: { text: 'Es el mamífero que vive permanentemente más al sur. Bucea hasta 720 m y 45 minutos, y abre agujeros en el hielo con los dientes. En Bahía Esperanza se estudió qué come: sobre todo un pez, el plateado antártico.', kind: 'real', sources: ['I16', 'O38'] } },
  { id: 'cangrejera', name: 'Foca cangrejera', latin: 'Lobodon carcinophagus', icon: 'seal', anchor: [-56.4, -63.85], offset: 3,
    fact: { text: 'No come cangrejos sino krill, que filtra con dientes especiales. Con unos 15 millones, es la foca más abundante. Relevamientos aéreos de 2015 a 2017 la contaron en el estrecho Bouchard, junto a la isla Marambio.', kind: 'real', sources: ['I16', 'O37'] } },
];

/** Shown with the sightings: where an animal appears on the map is not data. */
/** What the card of a place says about where it is drawn. Animals carry no note: the trip says it once, before it starts. */
export const sightingNote = (s: Sighting) => (s.place ? 'Posición aproximada en el mapa.' : null);
export const FAUNA_COUNT = SIGHTINGS.filter((s) => !s.place).length;
export const PLACES_COUNT = SIGHTINGS.length - FAUNA_COUNT;

/** Shown while travelling: the drawn path is not the real track of any ship or plane. */
export const VOYAGE_ROUTE_NOTE = 'La ruta dibujada, el punto exacto donde aparece cada animal y sus movimientos son ilustrativos. Los vehículos, animales y lugares se ven con tamaño exagerado.';
