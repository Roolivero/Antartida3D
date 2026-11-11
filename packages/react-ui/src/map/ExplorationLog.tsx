export function ExplorationLog({ explored }: { explored: boolean }) {
  const text = explored ? '1/1' : '0/1';
  return (
    <div className="reg" role="status" aria-label={`Registro de exploración: ${text} expediciones disponibles`}>
      <small>Registro de exploración</small>
      <b>{text} expediciones</b>
      <div className="bar"><i style={{ width: explored ? '100%' : '0%' }} /></div>
    </div>
  );
}
