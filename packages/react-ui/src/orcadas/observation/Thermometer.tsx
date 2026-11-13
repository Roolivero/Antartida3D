import { useId, type RefObject } from 'react';

const TEMP_MIN = -25;
const TEMP_MAX = 10;

function clampTemp(val: number): number {
  const clamped = Math.max(TEMP_MIN, Math.min(TEMP_MAX, val));
  const rounded = Math.round(clamped * 10) / 10;
  return Object.is(rounded, -0) ? 0 : rounded;
}

export function Thermometer({
  tempC,
  draftC,
  reduced,
  lensRef,
  onDraftChange,
  onConfirm,
}: {
  tempC: number;
  draftC: number;
  reduced: boolean;
  lensRef?: RefObject<SVGCircleElement | null>;
  onDraftChange?: (nextC: number) => void;
  onConfirm?: () => void;
}) {
  const uid = useId().replace(/:/g, '');
  const clipId = `therm-lens-${uid}`;
  const glassGradId = `therm-glass-${uid}`;
  const skyWashId = `therm-wash-${uid}`;

  // Full thermometer stem mapping (-25 to +10 °C -> y from 142 down to 54)
  const clampFull = Math.max(TEMP_MIN, Math.min(TEMP_MAX, tempC));
  const stemRatio = (clampFull - TEMP_MIN) / (TEMP_MAX - TEMP_MIN);
  const stemTopY = 142 - stemRatio * 88;

  // Magnifier lens centered around nearest integer degree to tempC
  const centerDeg = Math.round(tempC);
  const pxPerDeg = 50;
  const lensCx = 274;
  const lensCy = 98;
  const lensR = 70;

  // In the lens: y increases downward, temperature increases upward
  const yForTemp = (t: number) => lensCy - (t - centerDeg) * pxPerDeg;
  const meniscusY = yForTemp(tempC);
  const draftY = Math.max(lensCy - lensR + 6, Math.min(lensCy + lensR - 6, yForTemp(draftC)));

  const tempFromClientY = (clientY: number, rect: DOMRect) => {
    if (rect.height <= 0) return draftC;
    const centerY = rect.top + rect.height / 2;
    const dySvg = ((clientY - centerY) / (rect.height / 2)) * lensR;
    const clampedDy = Math.max(-(lensR - 6), Math.min(lensR - 6, dySvg));
    return clampTemp(centerDeg - clampedDy / pxPerDeg);
  };

  // Generate 0.1 °C ticks from (centerDeg - 2) to (centerDeg + 2)
  const startTenth = (centerDeg - 2) * 10;
  const endTenth = (centerDeg + 2) * 10;
  const ticks: { tenth: number; y: number; isMajor: boolean; isHalf: boolean }[] = [];
  for (let t = startTenth; t <= endTenth; t++) {
    const val = t / 10;
    const y = yForTemp(val);
    if (y >= lensCy - lensR - 4 && y <= lensCy + lensR + 4) {
      const rem = Math.abs(t % 10);
      ticks.push({
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
        role="group"
        aria-label="Abrigo meteorológico con termómetro de mercurio y lupa graduada en décimas de grado"
      >
        <defs>
          <clipPath id={clipId}>
            <circle cx={lensCx} cy={lensCy} r={lensR - 3} />
          </clipPath>
          <linearGradient id={skyWashId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#D6E5EF" stopOpacity="0.65" />
            <stop offset="60%" stopColor="#F3EBDD" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#E8DEC9" stopOpacity="0.55" />
          </linearGradient>
          <radialGradient id={glassGradId} cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.55" />
            <stop offset="70%" stopColor="#FBF4E6" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#7FA8C4" stopOpacity="0.22" />
          </radialGradient>
        </defs>

        {/* Watercolor background wash */}
        <rect x="6" y="6" width="368" height="196" rx="10" fill={`url(#${skyWashId})`} />

        {/* Snow and rock ground beneath the Stevenson screen */}
        <path
          d="M 12 174 C 48 168, 96 171, 148 175 C 175 177, 195 182, 205 194 L 12 194 Z"
          fill="#E7F0F5"
          stroke="#1F2A36"
          strokeWidth="1.2"
        />
        <path
          d="M 24 184 L 154 184"
          stroke="#7FA8C4"
          strokeWidth="1.2"
          strokeLinecap="round"
        />

        {/* Wooden legs of the meteorological shelter */}
        <g stroke="#1F2A36" strokeWidth="1.5" fill="#D9C7AC">
          <rect x="40" y="146" width="7" height="36" rx="1" />
          <rect x="125" y="146" width="7" height="36" rx="1" />
          <rect x="54" y="148" width="5" height="30" rx="1" fill="#BFA888" />
          <rect x="113" y="148" width="5" height="30" rx="1" fill="#BFA888" />
          {/* Cross brace */}
          <path d="M 47 166 L 125 166" strokeWidth="2" />
        </g>

        {/* Shelter body (Stevenson screen / Abrigo meteorológico) */}
        <g>
          {/* Back interior shadow */}
          <rect
            x="34"
            y="42"
            width="104"
            height="106"
            rx="3"
            fill="#2B3640"
            stroke="#1F2A36"
            strokeWidth="1.8"
          />
          {/* Inner wooden slatted wall */}
          <rect
            x="39"
            y="47"
            width="94"
            height="96"
            rx="2"
            fill="#E5DAC3"
            stroke="#1F2A36"
            strokeWidth="1.2"
          />
          {/* Subtle interior louver lines */}
          {[58, 70, 82, 94, 106, 118, 130].map((ly) => (
            <line
              key={ly}
              x1="41"
              y1={ly}
              x2="131"
              y2={ly}
              stroke="#B8A98E"
              strokeWidth="1"
            />
          ))}

          {/* Double pitched roof with air gap */}
          <polygon
            points="26,44 86,24 146,44"
            fill="#F7FAFB"
            stroke="#1F2A36"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <polygon
            points="31,44 86,30 141,44"
            fill="#D9E3E8"
            stroke="#1F2A36"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />

          {/* Mounted thermometer inside shelter */}
          <g>
            {/* Brass backing plate */}
            <rect
              x="76"
              y="50"
              width="20"
              height="90"
              rx="3"
              fill="#FBF4E6"
              stroke="#1F2A36"
              strokeWidth="1.2"
            />
            {/* Miniature ticks on full stem */}
            {[56, 68, 80, 92, 104, 116, 128].map((ty) => (
              <line
                key={ty}
                x1="78"
                y1={ty}
                x2="83"
                y2={ty}
                stroke="#1F2A36"
                strokeWidth="0.9"
              />
            ))}
            {/* Glass tube */}
            <rect
              x="84"
              y="53"
              width="4"
              height="80"
              rx="2"
              fill="#E7F0F5"
              stroke="#1F2A36"
              strokeWidth="1"
            />
            {/* Mercury column */}
            <rect
              x="84.7"
              y={stemTopY}
              width="2.6"
              height={Math.max(2, 134 - stemTopY)}
              fill="#A4471F"
            />
            {/* Mercury bulb */}
            <circle
              cx="86"
              cy="134"
              r="4.5"
              fill="#A4471F"
              stroke="#1F2A36"
              strokeWidth="1.1"
            />
          </g>

          {/* Animated slatted louver door (puerta de celosías) that swings open to the left */}
          <g className="orc-obs-shelter-door">
            <rect
              x="34"
              y="42"
              width="104"
              height="106"
              rx="2"
              fill="#F7FAFB"
              stroke="#1F2A36"
              strokeWidth="1.7"
            />
            {/* Louver slats on the door */}
            {[52, 62, 72, 82, 92, 102, 112, 122, 132].map((sy) => (
              <path
                key={sy}
                d={`M 40 ${sy} L 132 ${sy} L 130 ${sy + 5} L 42 ${sy + 5} Z`}
                fill="#D9E3E8"
                stroke="#1F2A36"
                strokeWidth="0.9"
              />
            ))}
            {/* Brass latch */}
            <circle cx="131" cy="95" r="2.8" fill="#C0862F" stroke="#1F2A36" strokeWidth="1" />
          </g>
        </g>

        {/* Sight lines from thermometer stem to the magnifying glass */}
        <circle
          cx="86"
          cy={stemTopY}
          r="7"
          fill="none"
          stroke="#C0862F"
          strokeWidth="1.6"
          strokeDasharray="2 2"
        />
        <line
          x1="92"
          y1={stemTopY - 5}
          x2={lensCx - lensR + 12}
          y2={lensCy - 56}
          stroke="#1E3E5C"
          strokeWidth="1.2"
          strokeDasharray="4 3"
        />
        <line
          x1="92"
          y1={stemTopY + 5}
          x2={lensCx - lensR + 12}
          y2={lensCy + 56}
          stroke="#1E3E5C"
          strokeWidth="1.2"
          strokeDasharray="4 3"
        />

        {/* Magnifying Glass (Lupa de lectura graduada en décimas) */}
        <g clipPath={`url(#${clipId})`}>
          {/* Enamel scale background inside lens */}
          <rect
            x={lensCx - lensR}
            y={lensCy - lensR}
            width={lensR * 2}
            height={lensR * 2}
            fill="#FBF4E6"
          />

          {/* Subtle millimeter/tenth grid lines */}
          {ticks.map(({ tenth, y, isMajor, isHalf }) => {
            const deg = tenth / 10;
            return (
              <g key={tenth}>
                <line
                  x1={lensCx - 8}
                  y1={y}
                  x2={lensCx - (isMajor ? 34 : isHalf ? 24 : 17)}
                  y2={y}
                  stroke="#1F2A36"
                  strokeWidth={isMajor ? 2 : isHalf ? 1.4 : 0.9}
                  strokeLinecap="round"
                />
                {isMajor && (
                  <text
                    x={lensCx - 39}
                    y={y + 4.5}
                    textAnchor="end"
                    className="orc-obs-svg-scale-num"
                  >
                    {deg > 0 ? `+${deg}°` : `${deg}°`}
                  </text>
                )}
                {isHalf && (
                  <text
                    x={lensCx - 28}
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

          {/* Glass capillary tube in magnifier */}
          <rect
            x={lensCx - 7}
            y={lensCy - lensR}
            width="16"
            height={lensR * 2}
            fill="#E7F0F5"
            stroke="#1F2A36"
            strokeWidth="1.5"
          />

          {/* Mercury column with convex meniscus at meniscusY */}
          <path
            d={`M ${lensCx - 4.5} ${lensCy + lensR + 10}
                L ${lensCx - 4.5} ${meniscusY + 2.5}
                Q ${lensCx + 1} ${meniscusY - 3}, ${lensCx + 6.5} ${meniscusY + 2.5}
                L ${lensCx + 6.5} ${lensCy + lensR + 10} Z`}
            fill="#A4471F"
          />
          {/* Exact horizontal tangent line at top of meniscus */}
          <line
            x1={lensCx - 16}
            y1={meniscusY}
            x2={lensCx + 24}
            y2={meniscusY}
            stroke="#A4471F"
            strokeWidth="1.5"
            strokeDasharray="2 2"
          />
          {/* Meniscus pointer triangle */}
          <polygon
            points={`${lensCx + 11},${meniscusY} ${lensCx + 19},${meniscusY - 4.5} ${lensCx + 19},${meniscusY + 4.5}`}
            fill="#A4471F"
          />

          {/* User's movable reading guide cursor (draftC) */}
          <g className="orc-obs-user-guide">
            <line
              x1={lensCx - 30}
              y1={draftY}
              x2={lensCx + 20}
              y2={draftY}
              stroke="#1E3E5C"
              strokeWidth="1.8"
              strokeDasharray="3 2"
            />
            <circle
              cx={lensCx - 30}
              cy={draftY}
              r="3.2"
              fill="#1E3E5C"
            />
            <polygon
              points={`${lensCx + 12},${draftY} ${lensCx + 21},${draftY - 4.5} ${lensCx + 21},${draftY + 4.5}`}
              fill="#1E3E5C"
            />
          </g>

          {/* Glass reflection sheen */}
          <circle
            cx={lensCx}
            cy={lensCy}
            r={lensR - 2}
            fill={`url(#${glassGradId})`}
            pointerEvents="none"
          />
        </g>


        {/* Brass rim and handle of the magnifying glass */}
        <circle
          cx={lensCx}
          cy={lensCy}
          r={lensR}
          fill="none"
          stroke="#C0862F"
          strokeWidth="5"
        />
        <circle
          cx={lensCx}
          cy={lensCy}
          r={lensR - 2.5}
          fill="none"
          stroke="#1F2A36"
          strokeWidth="1.5"
        />
        <circle
          cx={lensCx}
          cy={lensCy}
          r={lensR + 2.5}
          fill="none"
          stroke="#1F2A36"
          strokeWidth="1.5"
        />
        {/* Drawn after the lens rim, so the word is never cut by it; a paper halo keeps it legible */}
        <text
          x={lensCx + 21}
          y={meniscusY + 3.5}
          className="orc-obs-svg-callout"
          fill="#A4471F"
          stroke="#FBF4E6"
          strokeWidth="3"
          paintOrder="stroke"
          pointerEvents="none"
        >
          menisco
        </text>

        {/* Interactive lens touch/drag zone for setting the reading guide without typing */}
        <circle
          ref={lensRef}
          cx={lensCx}
          cy={lensCy}
          r={lensR}
          fill="transparent"
          className="orc-obs-lens-hit"
          role="slider"
          tabIndex={0}
          aria-label="Guía de lectura en la lupa del termómetro"
          aria-valuemin={TEMP_MIN}
          aria-valuemax={TEMP_MAX}
          aria-valuenow={draftC}
          aria-valuetext={`${draftC.toFixed(1).replace('.', ',')} °C`}
          onPointerDown={(e) => {
            if (!onDraftChange) return;
            const el = e.currentTarget;
            el.focus();
            el.setPointerCapture?.(e.pointerId);
            onDraftChange(tempFromClientY(e.clientY, el.getBoundingClientRect()));
          }}
          onPointerMove={(e) => {
            if (!onDraftChange) return;
            if (e.currentTarget.hasPointerCapture && !e.currentTarget.hasPointerCapture(e.pointerId)) {
              return;
            }
            if (e.buttons === 0 && !e.currentTarget.hasPointerCapture?.(e.pointerId)) return;
            onDraftChange(tempFromClientY(e.clientY, e.currentTarget.getBoundingClientRect()));
          }}
          onKeyDown={(e) => {
            if (!onDraftChange) return;
            const step = e.shiftKey ? 1 : 0.1;
            if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
              e.preventDefault();
              onDraftChange(clampTemp(draftC + step));
            } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
              e.preventDefault();
              onDraftChange(clampTemp(draftC - step));
            } else if (e.key === 'PageUp') {
              e.preventDefault();
              onDraftChange(clampTemp(draftC + 1));
            } else if (e.key === 'PageDown') {
              e.preventDefault();
              onDraftChange(clampTemp(draftC - 1));
            } else if (e.key === 'Home') {
              e.preventDefault();
              onDraftChange(TEMP_MIN);
            } else if (e.key === 'End') {
              e.preventDefault();
              onDraftChange(TEMP_MAX);
            } else if (e.key === 'Enter') {
              e.preventDefault();
              onConfirm?.();
            }
          }}
        />

      </svg>
    </div>
  );
}
