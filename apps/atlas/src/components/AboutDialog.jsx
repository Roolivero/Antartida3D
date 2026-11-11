import { ExternalLink, Globe2, Hand, Layers3, MapPin, Mouse, Move, MountainSnow, X } from 'lucide-react'
import { useEffect, useRef } from 'react'

export default function AboutDialog({ kind, onClose }) {
  const ref = useRef()
  useEffect(() => {
    const dialog = ref.current
    if (kind && !dialog.open) dialog.showModal()
    if (!kind && dialog.open) dialog.close()
  }, [kind])
  const help = kind === 'help'
  return <dialog ref={ref} className="about-dialog" aria-labelledby="about-title" onCancel={e => { e.preventDefault(); onClose() }} onClick={e => {
    if (e.target !== ref.current) return
    const rect = ref.current.getBoundingClientRect()
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) onClose()
  }}>
    <div className="dialog-top"><span className="eyebrow">{help ? 'UNA GUÍA PARA EMPEZAR' : 'ANTÁRTIDA POR DESCUBRIR'}</span><button className="icon-button" onClick={onClose} aria-label="Cerrar información"><X size={20} /></button></div>
    <div className="dialog-title-icon">{help ? <Hand size={34} strokeWidth={1.2} /> : <MountainSnow size={36} strokeWidth={1.2} />}</div>
    <h2 id="about-title">{help ? 'Dejá que la curiosidad te lleve.' : 'La ciencia también es un viaje.'}</h2>
    <p className="dialog-intro">{help ? 'El mapa es tu punto de partida. Podés recorrerlo a tu ritmo y abrir cualquiera de las cinco propuestas.' : 'Un atlas para conectar lugares, personas y preguntas sobre la Antártida. Una invitación a descubrir cómo llegamos a saber lo que sabemos.'}</p>
    {help ? <div className="dialog-sections">
      <section><Move size={23} /><div><h3>Movete por el continente</h3><p>Arrastrá para girar en 3D o desplazarte en 2D. Usá la rueda o los botones + y − para acercarte. En 3D también podés pellizcar con dos dedos.</p></div></section>
      <section><MapPin size={23} /><div><h3>Seguí una pregunta</h3><p>Elegí una expedición desde la lista. Base Orcadas también tiene un marcador en el mapa. Las otras propuestas esperan una ubicación definida.</p></div></section>
      <section><Mouse size={23} /><div><h3>Encontrá tu forma de explorar</h3><p>Cambiá entre 2D y 3D, elegí qué etiquetas ver o recuperá la vista general. Con el foco en el mapa, usá las flechas y las teclas + y −. Escape cierra la ficha.</p></div></section>
    </div> : <div className="dialog-sections">
      <section><Globe2 size={23} /><div><h3>Una geografía con fuentes</h3><p>El contorno proviene de Natural Earth (1:50 millones, dominio público). La vista polar no representa límites políticos ni el frente actual del hielo.</p><a href="https://www.naturalearthdata.com/about/terms-of-use/" target="_blank" rel="noreferrer">Natural Earth · datos y licencia<ExternalLink size={13} /></a></div></section>
      <section><Layers3 size={23} /><div><h3>Un relieve para imaginar</h3><p>Las alturas, las montañas y el espesor son ilustrativos. No provienen de mediciones de elevación. Las etiquetas de regiones son orientativas.</p></div></section>
      <section><MapPin size={23} /><div><h3>Cinco propuestas en construcción</h3><p>Este prototipo permite evaluar el mapa y la navegación. Conserva los guiones iniciales de las expediciones. Solo Base Orcadas tiene una ubicación documentada; las actividades y los contenidos se definirán con el equipo.</p></div></section>
    </div>}
    <div className="dialog-footer"><span>DESDE USHUAIA · CON CURIOSIDAD</span><span>PROTOTIPO 0.1</span></div>
  </dialog>
}
