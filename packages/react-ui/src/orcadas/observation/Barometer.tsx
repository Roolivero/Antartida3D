import { useId } from 'react';

export function Barometer({
  pressureHpa,
  draftHpa,
  reduced,
}: {
  pressureHpa: number;
  draftHpa: number;
  reduced: boolean;
}) {
  const uid = useId().replace(/:/g, '');
  const clipId = `baro-vernier-${uid}`;
  const washId = `baro-wash-${uid}`;

  // Dial center and radius
  const cx = 104;
  const cy = 106;
  const r = 78;

  // Map 950..1030 hPa to -135..+135 deg (where 0 deg is straight up)
  const minHpa = 950;
  const maxHpa = 1030;
  const angleForHpa = (hpa: number) => {
    const clamped = Math.max(minHpa, Math.min(maxHpa, hpa));
    return -135 + ((clamped - minHpa) / (maxHpa - minHpa)) * 270;
  };

  const needleDeg = angleForHpa(pressureHpa);
  const witnessDeg = angleForHpa(draftHpa);

  // Dial ticks every 2 hPa, major every 20 hPa, medium every 10 hPa
  const dialTicks: {
    hpa: number;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    lx: number;
    ly: number;
    isMajor: boolean;
    isMid: boolean;
  }[] = [];

  for (let h = minHpa; h <= maxHpa; h += 2) {
    const deg = angleForHpa(h);
    const rad = ((deg - 90) * Math.PI) / 180;
    const isMajor = (h - 950) % 20 === 0;
    const isMid = (h - 950) % 10 === 0 && !isMajor;
    const outerR = r - 7;
    const innerR = outerR - (isMajor ? 11 : isMid ? 8 : 4.5);
    const labelR = outerR - 20;
    dialTicks.push({
      hpa: h,
      x1: cx + Math.cos(rad) * outerR,
      y1: cy + Math.sin(rad) * outerR,
      x2: cx + Math.cos(rad) * innerR,
      y2: cy + Math.sin(rad) * innerR,
      lx: cx + Math.cos(rad) * labelR,
      ly: cy + Math.sin(rad) * labelR,
      isMajor,
      isMid,
    });
  }

  // Vernier zoom window on the right: centered on Math.round(pressureHpa)
  const centerHpa = Math.round(pressureHpa);
  const vX = 216;
  const vY = 26;
  const vW = 148;
  const vH = 160;
  const vCy = vY + vH / 2;
  const pxPerHpa = 52;

  const yForHpa = (h: number) => vCy - (h - centerHpa) * pxPerHpa;
  const needleY = yForHpa(pressureHpa);
  const draftY = Math.max(vY + 10, Math.min(vY + vH - 10, yForHpa(draftHpa)));

  const startTenth = (centerHpa - 2) * 10;
  const endTenth = (centerHpa + 2) * 10;
  const vernierTicks: { tenth: number; y: number; isMajor: boolean; isHalf: boolean }[] = [];
  for (let t = startTenth; t <= endTenth; t++) {
    const val = t / 10;
    const y = yForHpa(val);
    if (y >= vY - 4 && y <= vY + vH + 4) {
      const rem = Math.abs(t % 10);
      vernierTicks.push({
        tenth: t,
        y,
        isMajor: rem === 0,
        isHalf: rem === 5,
      });
    }
  }

  return (
    <div className={`orc-obs-plate${reduced ? ' is-reduced' : ''}`}>
      <svg
        className="orc-obs-svg"
        viewBox="0 0 380 208"
        role="img"
        aria-label="Ilustración del barómetro de estación con aguja sobre escala en hectopascales y visor de décimas"
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={vX + 2} y={vY + 2} width={vW - 4} height={vH - 4} rx="9" />
          </clipPath>
          <linearGradient id={washId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F4DDB3" stopOpacity="0.45" />
            <stop offset="55%" stopColor="#F3EBDD" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#D6E5EF" stopOpacity="0.5" />
          </linearGradient>
        </defs>

        {/* Watercolor background wash */}
        <rect x="6" y="6" width="368" height="196" rx="10" fill={`url(#${washId})`} />

        {/* Brass mounting ring at top of barometer */}
        <circle
          cx={cx}
          cy="17"
          r="8"
          fill="none"
          stroke="#C0862F"
          strokeWidth="3.5"
        />
        <circle
          cx={cx}
          cy="17"
          r="8"
          fill="none"
          stroke="#1F2A36"
          strokeWidth="1.2"
        />

        {/* Barometer circular brass case */}
        <circle
          cx={cx}
          cy={cy}
          r={r + 5}
          fill="#C0862F"
          stroke="#1F2A36"
          strokeWidth="1.8"
        />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="#FBF4E6"
          stroke="#1F2A36"
          strokeWidth="1.5"
        />
        <circle
          cx={cx}
          cy={cy}
          r={r - 6}
          fill="none"
          stroke="#1F2A36"
          strokeWidth="0.8"
          strokeDasharray="2 2"
        />

        {/* Weather regime inscriptions on the dial */}
        <text x={cx - 34} y={cy + 40} textAnchor="middle" className="orc-obs-svg-dial-word">
          TEMPESTAD
        </text>
        <text x={cx} y={cy - 30} textAnchor="middle" className="orc-obs-svg-dial-word">
          CAMBIO
        </text>
        <text x={cx + 34} y={cy + 40} textAnchor="middle" className="orc-obs-svg-dial-word">
          CALMA
        </text>
        <text x={cx} y={cy + 56} textAnchor="middle" className="orc-obs-svg-tag">
          hPa
        </text>

        {/* Radial dial ticks */}
        {dialTicks.map((t) => (
          <g key={t.hpa}>
            <line
              x1={t.x1}
              y1={t.y1}
              x2={t.x2}
              y2={t.y2}
              stroke="#1F2A36"
              strokeWidth={t.isMajor ? 1.8 : t.isMid ? 1.2 : 0.7}
            />
            {t.isMajor && (
              <text
                x={t.lx}
                y={t.ly + 3}
                textAnchor="middle"
                className="orc-obs-svg-dial-num"
              >
                {t.hpa}
              </text>
            )}
          </g>
        ))}

        {/* Brass reference / witness hand (aguja testigo controlled by draftHpa) */}
        <g transform={`translate(${cx}, ${cy}) rotate(${witnessDeg})`}>
          <line
            x1="0"
            y1="14"
            x2="0"
            y2={-(r - 12)}
            stroke="#C0862F"
            strokeWidth="2.2"
            strokeDasharray="4 2"
          />
          <circle cx="0" cy={-(r - 18)} r="3.2" fill="none" stroke="#C0862F" strokeWidth="1.8" />
        </g>

        {/* Main black iron pressure needle with micro-tremor */}
        <g transform={`translate(${cx}, ${cy}) rotate(${needleDeg})`}>
          <g className="orc-obs-baro-tremor">
            {/* Counterweight tail */}
            <line x1="0" y1="0" x2="0" y2="20" stroke="#1F2A36" strokeWidth="2.6" />
            <circle cx="0" cy="18" r="3.5" fill="#1F2A36" />
            {/* Main spear shaft */}
            <path
              d={`M -2.2 0 L -0.8 ${-(r - 9)} L 0 ${-(r - 4)} L 0.8 ${-(r - 9)} L 2.2 0 Z`}
              fill="#1F2A36"
            />
          </g>
        </g>

        {/* Center brass cap */}
        <circle cx={cx} cy={cy} r="6.5" fill="#C0862F" stroke="#1F2A36" strokeWidth="1.5" />
        <circle cx={cx} cy={cy} r="2.2" fill="#1F2A36" />

        {/* Sight lines connecting dial rim to Vernier zoom window */}
        <line
          x1={cx + r + 4}
          y1={cy - 28}
          x2={vX}
          y2={vY + 18}
          stroke="#1E3E5C"
          strokeWidth="1.2"
          strokeDasharray="4 3"
        />
        <line
          x1={cx + r + 4}
          y1={cy + 28}
          x2={vX}
          y2={vY + vH - 18}
          stroke="#1E3E5C"
          strokeWidth="1.2"
          strokeDasharray="4 3"
        />

        {/* Vernier / Nonius Zoom Window (0.1 hPa resolution) */}
        <rect
          x={vX}
          y={vY}
          width={vW}
          height={vH}
          rx="10"
          fill="#FBF4E6"
          stroke="#C0862F"
          strokeWidth="4"
        />
        <rect
          x={vX}
          y={vY}
          width={vW}
          height={vH}
          rx="10"
          fill="none"
          stroke="#1F2A36"
          strokeWidth="1.5"
        />

        <g clipPath={`url(#${clipId})`}>
          {/* 0.1 hPa scale ticks */}
          {vernierTicks.map(({ tenth, y, isMajor, isHalf }) => {
            const hpa = tenth / 10;
            return (
              <g key={tenth}>
                <line
                  x1={vX + 76}
                  y1={y}
                  x2={vX + (isMajor ? 46 : isHalf ? 56 : 64)}
                  y2={y}
                  stroke="#1F2A36"
                  strokeWidth={isMajor ? 2 : isHalf ? 1.4 : 0.9}
                  strokeLinecap="round"
                />
                {isMajor && (
                  <text
                    x={vX + 42}
                    y={y + 4.5}
                    textAnchor="end"
                    className="orc-obs-svg-scale-num"
                  >
                    {hpa}h
                  </text>
                )}
                {isHalf && (
                  <text
                    x={vX + 52}
                    y={y + 3.2}
                    textAnchor="end"
                    className="orc-obs-svg-scale-sub"
                  >
                    ,5
                  </text>
                )}
              </g>
            );
          })}

          {/* Vertical scale spine */}
          <line
            x1={vX + 76}
            y1={vY}
            x2={vX + 76}
            y2={vY + vH}
            stroke="#1F2A36"
            strokeWidth="1.5"
          />

          {/* Trembling black needle tip in vernier window */}
          <g className="orc-obs-baro-tremor-y">
            <line
              x1={vX + 66}
              y1={needleY}
              x2={vX + 124}
              y2={needleY}
              stroke="#A4471F"
              strokeWidth="1.5"
              strokeDasharray="2 2"
            />
            <polygon
              points={`${vX + 77},${needleY} ${vX + 92},${needleY - 5} ${vX + 92},${needleY + 5}`}
              fill="#1F2A36"
            />
            <text
              x={vX + 96}
              y={needleY + 3.5}
              className="orc-obs-svg-callout"
              fill="#1F2A36"
            >
              aguja
            </text>
          </g>

          {/* User's brass witness pointer (draftHpa) */}
          <g className="orc-obs-user-guide">
            <line
              x1={vX + 54}
              y1={draftY}
              x2={vX + 114}
              y2={draftY}
              stroke="#1E3E5C"
              strokeWidth="1.5"
              strokeDasharray="3 2"
            />
            <polygon
              points={`${vX + 77},${draftY} ${vX + 87},${draftY - 4} ${vX + 87},${draftY + 4}`}
              fill="#C0862F"
              stroke="#1F2A36"
              strokeWidth="0.9"
            />
          </g>
        </g>

        {/* Vernier header tag */}
        <rect
          x={vX + 16}
          y="12"
          width="116"
          height="19"
          rx="9"
          fill="#FBF4E6"
          stroke="#1F2A36"
          strokeWidth="1.2"
        />
        <text x={vX + vW / 2} y="25" textAnchor="middle" className="orc-obs-svg-tag">
          Visor · escala 0,1 hPa
        </text>
      </svg>
    </div>
  );
}
