// Editorial proposals. A coordinate belongs here only after source verification.
// Null coordinates deliberately prevent unapproved expedition markers.
export const expeditions = [
  {
    id: 'fosiles', number: '01', title: 'Fósiles', category: 'Un pasado inesperado', icon: 'fossil', color: '#edc79b',
    description: '¿Qué historias puede guardar una roca bajo el hielo? Una invitación a explorar el pasado antártico.',
    location: null, status: 'Ubicación por definir',
    question: '¿Cómo reconstruimos un paisaje que ya no existe?',
    steps: [
      ['Observar', 'Mirar una muestra y registrar sus formas, texturas y contexto.'],
      ['Preguntar', 'Pensar qué evidencias harían falta para interpretar ese hallazgo.'],
      ['Reconstruir', 'Comparar hipótesis sobre el paisaje del pasado y reconocer sus límites.'],
    ],
    note: 'Guion ilustrativo para debatir. Falta elegir el sitio, las muestras y las fuentes con el equipo científico. No representa un hallazgo ni una campaña real.',
  },
  {
    id: 'oceano', number: '02', title: 'Océano', category: 'Conectar lo invisible', icon: 'waves', color: '#8bced7',
    description: 'Asomarnos al agua que rodea el continente y pensar cómo se estudia un ambiente en movimiento.',
    location: null, status: 'Ubicación por definir',
    question: '¿Qué podemos descubrir tomando una muestra de agua?',
    steps: [['Elegir una pregunta', 'Definir qué queremos observar en el océano.'], ['Diseñar el muestreo', 'Conversar sobre instrumentos, profundidades y tiempos.'], ['Leer los datos', 'Imaginar cómo comparar observaciones sin confundirlas con conclusiones.']],
    note: 'Propuesta narrativa. No hay estación de muestreo, ruta ni resultados científicos asignados.',
  },
  {
    id: 'poncho', number: '03', title: 'Poncho', category: 'Una historia por construir', icon: 'sparkles', color: '#c4b6e8',
    description: 'Un espacio reservado para la propuesta Poncho. El contenido y su recorrido los vamos a definir en equipo.',
    location: null, status: 'Contenido y ubicación pendientes',
    question: '¿Qué historia queremos contar con Poncho?',
    steps: [['Definir', 'Acordar qué es Poncho y a quién estará dirigida esta experiencia.'], ['Construir', 'Elegir la historia, sus protagonistas y sus materiales.'], ['Ubicar', 'Agregar un punto al mapa solo cuando exista una localización validada.']],
    note: 'El nombre proviene del planteo del proyecto. No se le atribuye identidad, ubicación ni información científica.',
  },
  {
    id: 'ushuaia', number: '04', title: 'Desde Ushuaia', category: 'El viaje también cuenta', icon: 'ship', color: '#e6b6aa',
    description: 'Imaginar la preparación de una campaña desde Ushuaia: las preguntas, los equipos y la vida durante el viaje.',
    location: null, status: 'Ruta y destino por definir',
    question: '¿Qué hace falta antes de partir?',
    steps: [['Preparar', 'Definir objetivos, equipo y materiales de la campaña.'], ['Viajar', 'Construir el relato de la travesía con el equipo.'], ['Llegar', 'Elegir el destino y documentar su localización antes de dibujar una ruta.']],
    note: 'Campaña conceptual. Ushuaia es el origen propuesto; no se ha definido una expedición concreta, fecha, embarcación ni destino. No se dibuja una ruta ficticia.',
  },
  {
    id: 'orcadas', number: '05', title: 'Base Orcadas', category: 'Observar, día tras día', icon: 'flag', color: '#9ce0c9',
    description: 'Acercarnos a la isla Laurie y descubrir una base con una larga historia de observación científica.',
    location: [-44.7166666667, -60.75], status: 'Referencia geográfica verificada',
    locationLabel: 'Isla Laurie · Orcadas del Sur', coordinatesLabel: '60°45′ S · 44°43′ O',
    question: '¿Qué nos enseña observar un lugar durante generaciones?',
    steps: [['Ubicar', 'La Base Orcadas se encuentra en la isla Laurie, en las Orcadas del Sur.'], ['Conocer', 'La estación pasó a manos argentinas el 22 de febrero de 1904.'], ['Investigar', 'Su historia y las observaciones que se realizan allí pueden convertirse en el eje de esta expedición.']],
    note: 'La ubicación corresponde a la base, no al punto de partida de una expedición confirmada. El recorrido educativo es una propuesta del prototipo.',
    sources: [
      { label: 'Armada Argentina · coordenadas de la base', url: 'https://www.argentina.gob.ar/armada/antartida/bases-permanentes' },
      { label: 'Cancillería Argentina · historia y ubicación', url: 'https://cancilleria.gob.ar/es/iniciativas/dna/antartida-argentina/bases/orcadas' },
    ],
  },
]
