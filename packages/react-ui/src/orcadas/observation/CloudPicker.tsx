import { useId } from 'react';

const ROMAN_OKTAS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'] as const;

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function sectorPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const start = polarToCartesian(cx, cy, r, startDeg);
  const end = polarToCartesian(cx, cy, r, endDeg);
  return `M ${cx} ${cy} L ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 0 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)} Z`;
}

export function CloudPicker({
  cloudOktas,
  draftOktas,
  onSelectOktas,
}: {
  cloudOktas: number;
  draftOktas: number;
  onSelectOktas: (oktas: number) => void;
}) {
  const uid = useId().replace(/:/g, '');
  const skyGradId = `cloud-sky-${uid}`;
  const domeClipId = `cloud-dome-${uid}`;

  const cx = 114;
  const cy = 104;
  const r = 78;

  return (
    <div className="orc-obs-plate">
      <svg
        className="orc-obs-svg"
        viewBox="0 0 380 208"
        role="img"
        aria-label="Bóveda celeste dividida en ocho octavas para contar la cobertura de nubes"
      >
        <defs>
          <radialGradient id={skyGradId} cx="45%" cy="40%" r="65%">
            <stop offset="0%" stopColor="#E5F0F7" />
            <stop offset="65%" stopColor="#B8D2E3" />
            <stop offset="100%" stopColor="#89AFC9" />
          </radialGradient>
          <clipPath id={domeClipId}>
            <circle cx={cx} cy={cy} r={r} />
          </clipPath>
        </defs>

        {/* Outer parchment wash */}
        <rect x="6" y="6" width="368" height="196" rx="10" fill="#FBF4E6" fillOpacity="0.6" />

        {/* Sky dome base */}
        <circle
          cx={cx}
          cy={cy}
          r={r + 5}
          fill="#C0862F"
          stroke="#1F2A36"
          strokeWidth="1.6"
        />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill={`url(#${skyGradId})`}
          stroke="#1F2A36"
          strokeWidth="1.5"
        />

        {/* 8 interactive sky sectors (octas) */}
        <g clipPath={`url(#${domeClipId})`}>
          {ROMAN_OKTAS.map((_, idx) => {
            const startDeg = idx * 45;
            const endDeg = (idx + 1) * 45;
            const midDeg = startDeg + 22.5;
            const isCloudCovered = idx < cloudOktas;
            const isUserSelected = idx < draftOktas;
            const d = sectorPath(cx, cy, r, startDeg, endDeg);
            const cloudCenter = polarToCartesian(cx, cy, r * 0.56, midDeg);
            const innerCloud = polarToCartesian(cx, cy, r * 0.34, midDeg - 7);
            const outerCloud = polarToCartesian(cx, cy, r * 0.72, midDeg + 6);
            const checkPos = polarToCartesian(cx, cy, r * 0.82, midDeg);

            return (
              <g
                key={idx}
                className={`orc-obs-okta-sector${isUserSelected ? ' is-counted' : ''}`}
                onClick={() => {
                  const next = draftOktas === idx + 1 ? idx : idx + 1;
                  onSelectOktas(next);
                }}
              >
                {/* Interactive sector hit area */}
                <path
                  d={d}
                  fill={isUserSelected ? 'rgba(192, 134, 47, 0.22)' : 'transparent'}
                  stroke="#1F2A36"
                  strokeWidth="1"
                  strokeDasharray="3 2"
                />

                {/* Drawn Antarctic stratocumulus clouds inside covered sectors */}
                {isCloudCovered && (
                  <g pointerEvents="none">
                    <circle
                      cx={outerCloud.x}
                      cy={outerCloud.y}
                      r="17"
                      fill="#E2E9EE"
                      stroke="#1F2A36"
                      strokeWidth="1.1"
                    />
                    <circle
                      cx={cloudCenter.x}
                      cy={cloudCenter.y}
                      r="20"
                      fill="#F7FAFB"
                      stroke="#1F2A36"
                      strokeWidth="1.2"
                    />
                    <circle
                      cx={innerCloud.x}
                      cy={innerCloud.y}
                      r="14"
                      fill="#FBF4E6"
                      stroke="#1F2A36"
                      strokeWidth="1.1"
                    />
                    {/* Ink shading lines inside cloud mass */}
                    <line
                      x1={cloudCenter.x - 9}
                      y1={cloudCenter.y + 5}
                      x2={cloudCenter.x + 9}
                      y2={cloudCenter.y + 5}
                      stroke="#5E656C"
                      strokeWidth="1"
                      strokeLinecap="round"
                    />
                    <line
                      x1={outerCloud.x - 6}
                      y1={outerCloud.y + 4}
                      x2={outerCloud.x + 7}
                      y2={outerCloud.y + 4}
                      stroke="#5E656C"
                      strokeWidth="0.9"
                      strokeLinecap="round"
                    />
                  </g>
                )}

                {/* User count marker dot near rim when counted */}
                {isUserSelected && (
                  <g pointerEvents="none">
                    <circle
                      cx={checkPos.x}
                      cy={checkPos.y}
                      r="6"
                      fill="#C0862F"
                      stroke="#1F2A36"
                      strokeWidth="1.3"
                    />
                    <path
                      d={`M ${checkPos.x - 2.5} ${checkPos.y} L ${checkPos.x - 0.5} ${checkPos.y + 2.2} L ${checkPos.x + 3} ${checkPos.y - 2.2}`}
                      fill="none"
                      stroke="#1F2A36"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </g>
                )}
              </g>
            );
          })}

          {/* Sector divider lines */}
          {[0, 45, 90, 135].map((deg) => {
            const p1 = polarToCartesian(cx, cy, r, deg);
            const p2 = polarToCartesian(cx, cy, r, deg + 180);
            return (
              <line
                key={deg}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke="#1F2A36"
                strokeWidth="1.2"
                strokeDasharray="3 2"
                pointerEvents="none"
              />
            );
          })}
        </g>

        {/* Roman numeral labels around the sky dome rim */}
        {ROMAN_OKTAS.map((roman, idx) => {
          const midDeg = idx * 45 + 22.5;
          const pos = polarToCartesian(cx, cy, r + 14, midDeg);
          return (
            <text
              key={roman}
              x={pos.x}
              y={pos.y + 3.5}
              textAnchor="middle"
              className="orc-obs-svg-rose-point"
            >
              {roman}
            </text>
          );
        })}

        {/* Right panel: visual explanation & touch instructions */}
        <g transform="translate(216, 20)">
          <rect
            x="0"
            y="0"
            width="150"
            height="168"
            rx="10"
            fill="#FBF4E6"
            stroke="#1F2A36"
            strokeWidth="1.5"
          />
          <text x="75" y="22" textAnchor="middle" className="orc-obs-svg-tag">
            Espejo de octavas
          </text>

          {/* Legend items */}
          <g transform="translate(14, 36)">
            <circle cx="10" cy="8" r="8" fill="#F7FAFB" stroke="#1F2A36" strokeWidth="1.2" />
            <text x="26" y="12" className="orc-obs-svg-legend">
              Octava con nubes
            </text>

            <circle cx="10" cy="30" r="8" fill="#B8D2E3" stroke="#1F2A36" strokeWidth="1.2" />
            <text x="26" y="34" className="orc-obs-svg-legend">
              Cielo despejado
            </text>

            <circle cx="10" cy="52" r="6" fill="#C0862F" stroke="#1F2A36" strokeWidth="1.2" />
            <text x="26" y="56" className="orc-obs-svg-legend">
              Octava marcada
            </text>
          </g>

          <line x1="12" y1="104" x2="138" y2="104" stroke="#1F2A36" strokeWidth="0.8" strokeDasharray="3 2" />

          <text x="75" y="124" textAnchor="middle" className="orc-obs-svg-hand">
            Tocá las partes del cielo
          </text>
          <text x="75" y="142" textAnchor="middle" className="orc-obs-svg-hand">
            o usá el deslizador
          </text>

          {/* Clickable 0-oktas reset pill inside SVG */}
          <g
            className="orc-obs-okta-sector"
            onClick={() => onSelectOktas(0)}
          >
            <rect
              x="22"
              y="147"
              width="106"
              height="16"
              rx="8"
              fill={draftOktas === 0 ? '#1E3E5C' : '#E7F0F5'}
              stroke="#1F2A36"
              strokeWidth="1"
            />
            <text
              x="75"
              y="158"
              textAnchor="middle"
              className="orc-obs-svg-scale-sub"
              fill={draftOktas === 0 ? '#F7FAFB' : '#1F2A36'}
            >
              Marcar cielo despejado
            </text>
          </g>
        </g>
      </svg>
    </div>
  );
}
