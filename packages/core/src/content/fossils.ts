export type FossilKind = 'shell' | 'leaf' | 'bone';

export interface Evidence {
  name: string;
  obs: string;
  kind: FossilKind;
}

export interface Hypothesis {
  text: string;
  fb: string;
}

export const STEP_NAMES = ['Pregunta', 'Excavación', 'Comparar', 'Conclusión', 'Regreso'] as const;

/** Dig spots as fractions of the dig container. */
export const SPOTS = [{ x: 0.23, y: 0.613 }, { x: 0.535, y: 0.753 }, { x: 0.795, y: 0.56 }] as const;

export const EV: readonly Evidence[] = [
  { name: 'Resto A · forma en espiral', obs: 'Una forma enrollada sobre sí misma, con costillas finas que salen del centro.', kind: 'shell' },
  { name: 'Resto B · marca de hoja', obs: 'Una marca plana con nervaduras, como si la roca hubiera guardado un molde.', kind: 'leaf' },
  { name: 'Resto C · fragmento de hueso', obs: 'Un trozo liso por fuera y con poros por dentro, más duro que la roca que lo rodea.', kind: 'bone' },
];

export const OPTS: readonly Hypothesis[] = [
  { text: 'Vivieron en un ambiente sin hielo, más templado que el actual.', fb: 'Es la hipótesis que vamos a mirar en la reconstrucción. Igual, hacen falta más datos para confirmarla.' },
  { text: 'Llegaron a la isla arrastrados por el hielo desde otro lugar.', fb: 'Es una buena duda: la ciencia la descarta o la confirma mirando en qué capa estaba cada resto.' },
  { text: 'Con tres restos todavía no alcanza para decir nada.', fb: 'Prudente. Tres pistas no cierran el caso, pero sí permiten proponer una idea para poner a prueba.' },
];

export const LEVELS = [
  { label: 'Explorar', sub: 'lo esencial' },
  { label: 'Descubrir', sub: 'ampliado' },
  { label: 'Profundizar', sub: 'datos y fuentes' },
] as const;

/** KNOW[step - 1][level] */
export const KNOW: readonly (readonly [string, string, string])[] = [
  ['Hoy la Antártida está cubierta casi por completo de hielo. Pero las rocas guardan pistas de cómo era antes. En esta expedición vas a buscarlas.',
   'Un fósil es un resto o una marca de un ser vivo que quedó guardado en la roca. Leer rocas es como leer un diario muy viejo: cada capa cuenta un momento distinto.',
   'Datos del sitio, edad de las rocas y equipos que trabajaron en la isla: [Fuente a definir].'],
  ['Limpiá la roca con cuidado. Cada resto aparece cuando sacás todo el sedimento que lo cubre.',
   'En una excavación de verdad se trabaja con pinceles, herramientas chicas y mucha paciencia. Cada pieza se registra antes de moverla.',
   'Esta excavación es una simulación educativa: las posiciones y formas de los restos son ilustrativas. Protocolo de campo: [Fuente a definir].'],
  ['Una sola pista no alcanza. Comparar varias ayuda a armar una idea más firme.',
   'Para relacionar restos, la ciencia se pregunta qué tienen en común, en qué capa estaban y si pudieron vivir en el mismo lugar y época.',
   'Criterios de comparación y bibliografía: [Fuente a definir].'],
  ['La ilustración junta lo que encontraste en una escena posible. No es una foto del pasado.',
   'Separar evidencia, interpretación y reconstrucción artística sirve para saber qué es seguro, qué es una idea basada en pruebas y qué es imaginación guiada.',
   'Asesoría científica de la reconstrucción: [Fuente a definir]. Ilustración: [Autoría a definir].'],
  ['Completaste la expedición. Al volver, el punto queda marcado en tu registro.',
   'Las próximas expediciones (océano, estaciones, hielo) se suman en futuras ampliaciones del mapa.',
   'Créditos, licencias y datos abiertos usados: [Fuente a definir].'],
];

/** Chip shown at the top of the knowledge panel for each level. */
export const KNOW_CHIPS = [
  { cls: 'chip sim', text: 'Lo esencial' },
  { cls: 'chip sim', text: 'Explicación ampliada' },
  { cls: 'chip real', text: 'Dato real · a completar' },
] as const;
