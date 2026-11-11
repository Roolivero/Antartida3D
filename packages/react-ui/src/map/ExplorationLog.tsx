import { AVAILABLE_COUNT } from '@antartida/core';

export function ExplorationLog({ explored }: { explored: readonly string[] }) {
  const text = `${explored.length}/${AVAILABLE_COUNT}`;
  return (
    <div className="reg" role="status" aria-label={`Registro de exploración: ${text} expediciones disponibles`}>
      <small>Registro de exploración</small>
      <b>{text} expediciones</b>
      <div className="bar"><i style={{ width: `${(100 * explored.length) / AVAILABLE_COUNT}%` }} /></div>
    </div>
  );
}
