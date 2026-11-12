import { beaufort, compassPoint } from '@antartida/core';
import { useId } from 'react';

const COMPASS_16 = [
  'N',
  'NNE',
  'NE',
  'ENE',
  'E',
  'ESE',
  'SE',
  'SSE',
  'S',
  'SSO',
  'SO',
  'OSO',
  'O',
  'ONO',
  'NO',
  'NNO',
] as const;

export function WindMast({
  windKmh,
  windDirDeg,
  draftKmh,
  hasGuessed,
  reduced,
}: {
  windKmh: number;
  windDirDeg: number;
  draftKmh: number;
  hasGuessed: boolean;
  reduced: boolean;
}) {
  const uid = useId().replace(/:/g, '');
  const washId = `wind-wash-${uid}`;
  const dialClipId = `wind-dial-${uid}`;

  const rumbo = compassPoint(windDirDeg);
  const bf = beaufort(windKmh);

  // Rotation duration inversely proportional to windKmh (faster wind = shorter period)
  const spinDurationSec = windKmh <= 0 ? 0 : Math.max(0.32, 14 / Math.max(1, windKmh));

  // Compass rose geometry (left side)
  const roseCx = 94;
  const roseCy = 98;
  const roseR = 64;

  // Fine velocity counter / dial strip (bottom right)
  const dX = 194;
  const dY = 104;
  const dW = 172;
  const dH = 74;
  const centerKmh = Math.round(windKmh / 10) * 10;
  const pxPerKmh = 10;
  const dCx = dX + dW / 2;

  const xForKmh = (v: number) => dCx + (v - centerKmh) * pxPerKmh;
  const needleX = xForKmh(windKmh);
  const draftX = Math.max(dX + 8, Math.min(dX + dW - 8, xForKmh(draftKmh)));

  const minTick = Math.max(0, centerKmh - 9);
  const maxTick = Math.min(140, centerKmh + 9);
  const speedTicks: { v: number; x: number; isTen: boolean; isFive: boolean }[] = [];
  for (let v = minTick; v <= maxTick; v += 1) {
    const x = xForKmh(v);
    if (x >= dX + 6 && x <= dX + dW - 6) {
      speedTicks.push({
        v,
        x,
        isTen: v % 10 === 0,
        isFive: v % 5 === 0 && v % 10 !== 0,
      });
    }
  }

  return (
    <div className={`orc-obs-plate${reduced ? ' is-reduced' : ''}`}>
      <svg
        className="orc-obs-svg"
        viewBox="0 0 380 212"
        role="img"
        aria-label={`Ilustración de veleta sobre rosa de 16 rumbos apuntando a ${rumbo} y anemómetro de cazoletas con dial de velocidad`}
      >
        <defs>
          <linearGradient id={washId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#D6E5EF" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#F3EBDD" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#E8DEC9" stopOpacity="0.55" />
          </linearGradient>
          <clipPath id={dialClipId}>
            <rect x={dX + 2} y={dY + 2} width={dW - 4} height={dH - 4} rx="7" />
          </clipPath>
        </defs>

        {/* Watercolor background wash */}
        <rect x="6" y="6" width="368" height="200" rx="10" fill={`url(#${washId})`} />

        {/* LEFT: 16-Point Compass Rose (Rosa de 16 rumbos) & Weather Vane (Veleta) */}
        <g>
          <circle
            cx={roseCx}
            cy={roseCy}
            r={roseR + 12}
            fill="#FBF4E6"
            stroke="#1F2A36"
            strokeWidth="1.5"
          />
          <circle
            cx={roseCx}
            cy={roseCy}
            r={roseR}
            fill="none"
            stroke="#1F2A36"
            strokeWidth="1"
            strokeDasharray="2 2"
          />
          <circle
            cx={roseCx}
            cy={roseCy}
            r={roseR - 22}
            fill="none"
            stroke="#7FA8C4"
            strokeWidth="0.9"
          />

          {/* 16 compass points */}
          {COMPASS_16.map((pt, i) => {
            const deg = i * 22.5;
            const rad = ((deg - 90) * Math.PI) / 180;
            const isCardinal = i % 4 === 0;
            const isIntercardinal = i % 2 === 0 && !isCardinal;
            const inner = isCardinal ? 10 : isIntercardinal ? 18 : 30;
            const outer = roseR - (isCardinal ? 2 : isIntercardinal ? 5 : 9);
            const labelR = roseR + 6;
            const x1 = roseCx + Math.cos(rad) * inner;
            const y1 = roseCy + Math.sin(rad) * inner;
            const x2 = roseCx + Math.cos(rad) * outer;
            const y2 = roseCy + Math.sin(rad) * outer;
            const lx = roseCx + Math.cos(rad) * labelR;
            const ly = roseCy + Math.sin(rad) * labelR;

            return (
              <g key={pt}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={isCardinal ? '#1F2A36' : '#5E656C'}
                  strokeWidth={isCardinal ? 1.6 : isIntercardinal ? 1.1 : 0.7}
                />
                <text
                  x={lx}
                  y={ly + 2.8}
                  textAnchor="middle"
                  className={
                    isCardinal
                      ? 'orc-obs-svg-rose-cardinal'
                      : 'orc-obs-svg-rose-point'
                  }
                >
                  {pt}
                </text>
              </g>
            );
          })}

          {/* Weather Vane (Veleta) pointing to windDirDeg */}
          <g transform={`translate(${roseCx}, ${roseCy}) rotate(${windDirDeg})`}>
            {/* Vane tail fin (at bottom +y) */}
            <polygon
              points="-7,44 0,24 7,44 0,39"
              fill="#C0862F"
              stroke="#1F2A36"
              strokeWidth="1.3"
              strokeLinejoin="round"
            />
            {/* Vane shaft */}
            <line x1="0" y1="36" x2="0" y2="-46" stroke="#1F2A36" strokeWidth="2.4" />
            {/* Vane arrowhead pointing to wind direction (at top -y) */}
            <polygon
              points="0,-54 -6,-38 0,-42 6,-38"
              fill="#A4471F"
              stroke="#1F2A36"
              strokeWidth="1.3"
              strokeLinejoin="round"
            />
          </g>

          <circle
            cx={roseCx}
            cy={roseCy}
            r="5"
            fill="#C0862F"
            stroke="#1F2A36"
            strokeWidth="1.4"
          />

          <text x={roseCx} y="194" textAnchor="middle" className="orc-obs-svg-hand">
            Veleta: rumbo {rumbo} ({windDirDeg}°)
          </text>
        </g>

        {/* RIGHT TOP: Cup Anemometer (Anemómetro de cazoletas) */}
        <g>
          {/* Mast pole */}
          <rect
            x="276"
            y="54"
            width="8"
            height="46"
            rx="2"
            fill="#5E656C"
            stroke="#1F2A36"
            strokeWidth="1.4"
          />
          {/* Guy wires */}
          <line x1="276" y1="68" x2="236" y2="104" stroke="#5E656C" strokeWidth="1" strokeDasharray="3 2" />
          <line x1="284" y1="68" x2="324" y2="104" stroke="#5E656C" strokeWidth="1" strokeDasharray="3 2" />

          {/* Rotating 4-cup assembly (top-down angled perspective centered at 280, 52) */}
          <g transform="translate(280, 50)">
            <g
              className="orc-obs-anemo-rotor"
              style={
                !reduced && spinDurationSec > 0
                  ? { animationDuration: `${spinDurationSec.toFixed(2)}s` }
                  : { animation: 'none' }
              }
            >
              {/* Cross arms */}
              <line x1="-38" y1="0" x2="38" y2="0" stroke="#1F2A36" strokeWidth="2" />
              <line x1="0" y1="-38" x2="0" y2="38" stroke="#1F2A36" strokeWidth="2" />
              {/* 4 hemispherical cups */}
              <path
                d="M 32 -8 A 9 9 0 1 1 32 8 Z"
                fill="#C0862F"
                stroke="#1F2A36"
                strokeWidth="1.4"
              />
              <path
                d="M -32 8 A 9 9 0 1 1 -32 -8 Z"
                fill="#C0862F"
                stroke="#1F2A36"
                strokeWidth="1.4"
              />
              <path
                d="M -8 -32 A 9 9 0 1 1 8 -32 Z"
                fill="#A4471F"
                stroke="#1F2A36"
                strokeWidth="1.4"
              />
              <path
                d="M 8 32 A 9 9 0 1 1 -8 32 Z"
                fill="#A4471F"
                stroke="#1F2A36"
                strokeWidth="1.4"
              />
            </g>
            {/* Rotor hub cap */}
            <circle cx="0" cy="0" r="5.5" fill="#FBF4E6" stroke="#1F2A36" strokeWidth="1.5" />
          </g>

          <text x="215" y="24" className="orc-obs-svg-tag">
            Cazoletas
          </text>
        </g>

        {/* RIGHT BOTTOM: Mechanical Speed Counter / Dial (Contador de velocidad en km/h) */}
        <g>
          <rect
            x={dX}
            y={dY}
            width={dW}
            height={dH}
            rx="8"
            fill="#FBF4E6"
            stroke="#C0862F"
            strokeWidth="3.5"
          />
          <rect
            x={dX}
            y={dY}
            width={dW}
            height={dH}
            rx="8"
            fill="none"
            stroke="#1F2A36"
            strokeWidth="1.5"
          />

          <g clipPath={`url(#${dialClipId})`}>
            <text
              x={dCx}
              y={dY + 15}
              textAnchor="middle"
              className="orc-obs-svg-tag"
            >
              Contador · escala 1 km/h
            </text>

            {/* Baseline track */}
            <line
              x1={dX + 8}
              y1={dY + 46}
              x2={dX + dW - 8}
              y2={dY + 46}
              stroke="#1F2A36"
              strokeWidth="1.5"
            />

            {/* 1 km/h graduation ticks */}
            {speedTicks.map(({ v, x, isTen, isFive }) => (
              <g key={v}>
                <line
                  x1={x}
                  y1={dY + 46}
                  x2={x}
                  y2={dY + (isTen ? 26 : isFive ? 32 : 37)}
                  stroke="#1F2A36"
                  strokeWidth={isTen ? 2 : isFive ? 1.4 : 0.9}
                  strokeLinecap="round"
                />
                {isTen && (
                  <text
                    x={x}
                    y={dY + 62}
                    textAnchor="middle"
                    className="orc-obs-svg-scale-num"
                  >
                    {v}k
                  </text>
                )}
                {isFive && (
                  <text
                    x={x}
                    y={dY + 59}
                    textAnchor="middle"
                    className="orc-obs-svg-scale-sub"
                  >
                    +5
                  </text>
                )}
              </g>
            ))}

            {/* Mechanical needle marking windKmh */}
            <g>
              <line
                x1={needleX}
                y1={dY + 19}
                x2={needleX}
                y2={dY + 50}
                stroke="#A4471F"
                strokeWidth="1.8"
              />
              <polygon
                points={`${needleX},${dY + 45} ${needleX - 5},${dY + 22} ${needleX + 5},${dY + 22}`}
                fill="#A4471F"
                stroke="#1F2A36"
                strokeWidth="0.9"
              />
            </g>

            {/* User's movable cursor at draftKmh */}
            <g className="orc-obs-user-guide">
              <line
                x1={draftX}
                y1={dY + 24}
                x2={draftX}
                y2={dY + 68}
                stroke="#1E3E5C"
                strokeWidth="1.5"
                strokeDasharray="3 2"
              />
              <polygon
                points={`${draftX},${dY + 47} ${draftX - 4},${dY + 55} ${draftX + 4},${dY + 55}`}
                fill="#1E3E5C"
              />
            </g>
          </g>
        </g>
      </svg>

      {/* Beaufort scale is revealed ONLY AFTER the user records their wind reading */}
      {hasGuessed ? (
        <div className="orc-obs-beaufort" role="status">
          <strong>Escala Beaufort:</strong> fuerza {bf.force} · <span>{bf.name}</span> (rumbo{' '}
          {rumbo})
        </div>
      ) : (
        <div className="orc-obs-beaufort is-pending">
          <span>Anotá la velocidad del contador para revelar el grado en la escala Beaufort.</span>
        </div>
      )}
    </div>
  );
}
