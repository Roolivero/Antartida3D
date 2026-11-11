export function ViewToggle({
  mode,
  onChange,
}: {
  mode: '2d' | '3d';
  onChange: (mode: '2d' | '3d') => void;
}) {
  return (
    <div className="view-toggle" role="group" aria-label="Modo de vista">
      <button
        type="button"
        className={'chip' + (mode === '2d' ? ' active' : '')}
        aria-pressed={mode === '2d'}
        onClick={() => onChange('2d')}
      >
        Mapa 2D
      </button>
      <button
        type="button"
        className={'chip' + (mode === '3d' ? ' active' : '')}
        aria-pressed={mode === '3d'}
        onClick={() => onChange('3d')}
      >
        Relieve 3D
      </button>
    </div>
  );
}
