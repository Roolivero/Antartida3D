export type Tier = 'A' | 'B' | 'C';

export interface MapPoint {
  id: string;
  tier: Tier;
  title: string;
  place: string;
  /** Position in the 0..1000 map space (polar stereographic, see projection.ts). */
  x: number;
  y: number;
  q: string;
}

export const PTS: readonly MapPoint[] = [
  { id: 'fosiles', tier: 'B', title: 'Fósiles', place: 'Isla Marambio', x: 196, y: 300, q: '¿Cómo era la Antártida antes del hielo?' },
  { id: 'oceano', tier: 'B', title: 'Océano', place: 'Mar de Weddell', x: 322, y: 322, q: '¿Qué pasa debajo del hielo marino del Mar de Weddell?' },
  { id: 'poncho', tier: 'B', title: 'Poncho', place: 'Península Antártica · ubicación a definir', x: 196, y: 352, q: '¿Qué historia puede contar un poncho en la Antártida?' },
  { id: 'campana', tier: 'A', title: 'Desde Ushuaia', place: 'Ushuaia', x: 31.4, y: 313.5, q: '¿Cómo se llega desde Ushuaia hasta la Antártida?' },
  { id: 'orcadas', tier: 'A', title: 'Estación Orcadas', place: 'Islas Orcadas del Sur', x: 208, y: 205, q: '¿Cómo es pasar un invierno entero en Orcadas?' },
  { id: 'polo', tier: 'C', title: 'El Polo Sur', place: 'Centro del continente', x: 500, y: 500, q: '¿Qué hay en el punto más austral del planeta?' },
  { id: 'testigos', tier: 'C', title: 'Testigos de hielo', place: 'Domo C', x: 674, y: 614, q: '¿Cómo puede el hielo guardar aire de otras épocas?' },
  { id: 'vostok', tier: 'C', title: 'Un lago bajo el hielo', place: 'Lago Vostok', x: 667, y: 548, q: '¿Puede haber agua líquida debajo de kilómetros de hielo?' },
  { id: 'erebus', tier: 'C', title: 'Volcán en el hielo', place: 'Monte Erebus, Isla de Ross', x: 539, y: 670, q: '¿Cómo conviven un volcán activo y el hielo?' },
  { id: 'thwaites', tier: 'C', title: 'Glaciares que cambian', place: 'Glaciar Thwaites, Mar de Amundsen', x: 301, y: 557, q: '¿Por qué la ciencia sigue tan de cerca a este glaciar?' },
  { id: 'belgrano', tier: 'C', title: 'Base Belgrano II', place: 'Sur del Mar de Weddell', x: 404, y: 361, q: '¿Cómo se trabaja tan cerca del Polo?' },
  { id: 'emperador', tier: 'C', title: 'Colonias de pingüino emperador', place: 'Costa de Tierra de la Reina Maud', x: 593, y: 245, q: '¿Cómo pasan el invierno polar los pingüinos emperador?' },
];

export const TIER: Record<Tier, string> = { A: 'Expedición disponible', B: 'Ampliación prevista', C: 'Próximamente' };

export const ORCADAS_POINT = PTS.find((p) => p.id === 'orcadas')!;
export const EXPEDITION_POINT = ORCADAS_POINT;
/** The trip from Ushuaia happens on the map itself, not on a separate screen. */
export const VOYAGE_POINT = PTS.find((p) => p.id === 'campana')!;
export const AVAILABLE_COUNT = PTS.filter((p) => p.tier === 'A').length;
