import { useId, type RefObject } from 'react';

const TEMP_MIN = -25;
const TEMP_MAX = 10;

// Notebook illustration palette for the Stevenson screen (uses CSS tokens with hex fallbacks)
const SHELTER = {
  ink: 'var(--ink, #1F2A36)',
  deep: 'var(--deep, #1E3E5C)',
  pencil: 'var(--pencil, #5E656C)',
  brass: 'var(--ocre, #C0862F)',
  snow: '#E7F0F5',
  snowLine: 'var(--glacier, #7FA8C4)',
  woodLight: '#FAF5EA',
  woodWarm: 'var(--paper, #F3EBDD)',
  woodShade: '#D6CBB6',
  woodCanto: '#C5B8A0',
  woodDeep: '#AE9F86',
  interiorBack: '#9A9183',
  interiorPlank: '#7E7669',
  interiorShadow: '#49525C',
  roofTop: 'var(--ice, #F7FAFB)',
  roofSlope: '#E2EBF0',
  roofShade: '#C8D6DF',
  roofGap: '#545E68',
} as const;

const LOUVER_SLAT_COUNT = 8;
const SIDE_LOUVER_COUNT = 7;

type YInterp = (x: number, t: number) => number;

function quadPts(xL: number, xR: number, yAt: YInterp, t0: number, t1: number): string {
  return `${xL},${yAt(xL, t0).toFixed(1)} ${xR},${yAt(xR, t0).toFixed(1)} ${xR},${yAt(xR, t1).toFixed(1)} ${xL},${yAt(xL, t1).toFixed(1)}`;
}

function renderDoubleVLouverSlats(
  count: number,
  xL: number,
  xR: number,
  yAt: YInterp,
  tStart: number,
  tEnd: number,
  keyPrefix: string,
) {
  const step = (tEnd - tStart) / count;
  const bevel = 1.2;
  return Array.from({ length: count }, (_, i) => {
    const t0 = tStart + i * step;
    const tApex = t0 + step * 0.42;
    const tBot = t0 + step * 0.82;
    const yTopL = yAt(xL + bevel, t0).toFixed(1);
    const yTopR = yAt(xR - bevel, t0).toFixed(1);
    const yMidL = yAt(xL, tApex).toFixed(1);
    const yMidR = yAt(xR, tApex).toFixed(1);
    const yBotL = yAt(xL + bevel, tBot).toFixed(1);
    const yBotR = yAt(xR - bevel, tBot).toFixed(1);
    return (
      <g key={`${keyPrefix}-${i}`}>
        <polygon
          points={`${(xL + bevel).toFixed(1)},${yTopL} ${(xR - bevel).toFixed(1)},${yTopR} ${xR},${yMidR} ${xL},${yMidL}`}
          fill={SHELTER.woodLight}
          stroke={SHELTER.ink}
          strokeWidth="0.7"
          strokeLinejoin="round"
        />
        <polygon
          points={`${xL},${yMidL} ${xR},${yMidR} ${(xR - bevel).toFixed(1)},${yBotR} ${(xL + bevel).toFixed(1)},${yBotL}`}
          fill={SHELTER.woodShade}
          stroke={SHELTER.ink}
          strokeWidth="0.7"
          strokeLinejoin="round"
        />
      </g>
    );
  });
}

// Perspective interpolators for shelter side wall and open door
const sideWallY: YInterp = (x, t) => {
  const u = (x - 136) / (152 - 136);
  const top = 52 + u * (48 - 52);
  const bot = 138 + u * (132 - 138);
  return top + t * (bot - top);
};

const openDoorY: YInterp = (x, t) => {
  const u = (x - 16) / (40 - 16);
  const top = 39 + u * (47 - 39);
  const bot = 153 + u * (145 - 153);
  return top + t * (bot - top);
};

const closedDoorY: YInterp = (_x, t) => 55 + t * (137 - 55);

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

        {/* Snow ground and soft shelter shadow */}
        <path
          d="M 12 175 C 48 168, 108 169, 158 175 C 180 178, 195 184, 204 194 L 12 194 Z"
          fill={SHELTER.snow}
          stroke={SHELTER.ink}
          strokeWidth="1.2"
        />
        <path
          d="M 20 185 L 166 185"
          stroke={SHELTER.snowLine}
          strokeWidth="1.1"
          strokeLinecap="round"
        />
        <g opacity="0.22">
          <ellipse cx="96" cy="179" rx="56" ry="6.5" fill={SHELTER.deep} />
          <ellipse cx="46.5" cy="182" rx="6" ry="2.2" fill={SHELTER.deep} />
          <ellipse cx="125" cy="182" rx="6" ry="2.2" fill={SHELTER.deep} />
          <ellipse cx="67.5" cy="175" rx="4.5" ry="1.8" fill={SHELTER.deep} />
          <ellipse cx="147.5" cy="174" rx="4.5" ry="1.8" fill={SHELTER.deep} />
        </g>

        {/* Wooden legs and cross braces in 3/4 perspective */}
        <g stroke={SHELTER.ink} strokeLinejoin="round">
          {/* Rear legs */}
          <rect x="65" y="145" width="5" height="30" fill={SHELTER.woodDeep} strokeWidth="1.3" />
          <rect x="145" y="138" width="5" height="36" fill={SHELTER.woodShade} strokeWidth="1.3" />
          {/* Rear and side depth cross braces */}
          <polygon
            points="70,158 145,155 145,158.5 70,161.5"
            fill={SHELTER.woodDeep}
            strokeWidth="1.1"
          />
          <polygon
            points="49,164 65,158.5 65,162 49,167.5"
            fill={SHELTER.woodShade}
            strokeWidth="1.1"
          />
          <polygon
            points="128,164 145,156.5 145,160 128,167.5"
            fill={SHELTER.woodShade}
            strokeWidth="1.1"
          />
          {/* Front horizontal cross brace */}
          <rect x="49" y="164" width="73" height="4.2" fill={SHELTER.woodWarm} strokeWidth="1.3" />
          {/* Front-left leg (front + shaded side) */}
          <rect x="43" y="146" width="5" height="36" fill={SHELTER.woodLight} strokeWidth="1.4" />
          <polygon
            points="48,146 50.5,146 50.5,181 48,182"
            fill={SHELTER.woodShade}
            strokeWidth="1.2"
          />
          {/* Front-right leg (front + shaded side) */}
          <rect x="121" y="146" width="5" height="36" fill={SHELTER.woodLight} strokeWidth="1.4" />
          <polygon
            points="126,146 128.5,146 128.5,181 126,182"
            fill={SHELTER.woodShade}
            strokeWidth="1.2"
          />
        </g>

        {/* Shelter body (Stevenson screen / Abrigo meteorológico) */}
        <g>
          {/* Interior recess and cast shadow */}
          <rect
            x="45"
            y="49"
            width="82"
            height="92"
            fill={SHELTER.interiorBack}
            stroke={SHELTER.ink}
            strokeWidth="1.4"
          />
          {/* Recessed inner plank lines */}
          {[61, 73, 85, 97, 109, 121, 133].map((ly) => (
            <line
              key={ly}
              x1="51"
              y1={ly}
              x2="122"
              y2={ly}
              stroke={SHELTER.interiorPlank}
              strokeWidth="0.9"
            />
          ))}
          {/* Interior depth walls (left return, ceiling soffit, floor sill) */}
          <polygon
            points="45,49 51,54 51,136 45,141"
            fill={SHELTER.interiorShadow}
            stroke={SHELTER.ink}
            strokeWidth="1"
            strokeLinejoin="round"
          />
          <polygon
            points="45,49 127,49 122,54 51,54"
            fill={SHELTER.interiorShadow}
            stroke={SHELTER.ink}
            strokeWidth="1"
            strokeLinejoin="round"
          />
          <polygon
            points="45,141 51,136 122,136 127,141"
            fill={SHELTER.woodShade}
            stroke={SHELTER.ink}
            strokeWidth="1"
            strokeLinejoin="round"
          />
          {/* Cast shadow from open door and top overhang inside shelter */}
          <polygon
            points="51,54 106,54 68,84 56,136 51,136"
            fill={SHELTER.interiorShadow}
            opacity="0.45"
          />

          {/* Wooden mounting rails & brass hanger for the thermometer */}
          <rect
            x="66"
            y="63"
            width="40"
            height="4"
            rx="0.8"
            fill={SHELTER.woodWarm}
            stroke={SHELTER.ink}
            strokeWidth="1"
          />
          <rect
            x="66"
            y="125"
            width="40"
            height="4"
            rx="0.8"
            fill={SHELTER.woodWarm}
            stroke={SHELTER.ink}
            strokeWidth="1"
          />
          <rect
            x="83"
            y="48"
            width="6"
            height="3.5"
            rx="0.8"
            fill={SHELTER.brass}
            stroke={SHELTER.ink}
            strokeWidth="0.9"
          />

          {/* Mounted thermometer inside shelter */}
          <g>
            {/* Backing plate */}
            <rect
              x="76"
              y="50"
              width="20"
              height="90"
              rx="3"
              fill="#FBF4E6"
              stroke={SHELTER.ink}
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
                stroke={SHELTER.ink}
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
              stroke={SHELTER.ink}
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
              stroke={SHELTER.ink}
              strokeWidth="1.1"
            />
          </g>

          {/* Front casing frame around opening */}
          <path
            d="M 40 45 H 132 V 146 H 40 Z M 45 49 V 141 H 127 V 49 Z"
            fill={SHELTER.woodLight}
            fillRule="evenodd"
            stroke={SHELTER.ink}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {/* Under-eave shadow band across top of front wall */}
          <rect x="40.8" y="45.8" width="90.4" height="3" fill={SHELTER.roofGap} opacity="0.32" />

          {/* Right lateral wall in 3/4 perspective with double-V louvers */}
          <polygon
            points="132,45 156,39 156,136 132,146"
            fill={SHELTER.woodShade}
            stroke={SHELTER.ink}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <polygon
            points="132,45 156,39 156,42.5 132,48.5"
            fill={SHELTER.roofGap}
            opacity="0.38"
          />
          {/* Recessed louver panel on side wall */}
          <polygon
            points="136,52 152,48 152,132 136,138"
            fill={SHELTER.interiorShadow}
            stroke={SHELTER.ink}
            strokeWidth="1.1"
            strokeLinejoin="round"
          />
          {renderDoubleVLouverSlats(SIDE_LOUVER_COUNT, 136, 152, sideWallY, 0.03, 0.97, 'side-slat')}

          {/* Double pitched roof with ventilated air gap and overhanging eaves */}
          <g stroke={SHELTER.ink} strokeLinejoin="round">
            {/* Lower inner roof eave & ventilated gap */}
            <polygon
              points="34,43.5 86,29.5 137,43.5 137,45.8 86,32.2 34,45.8"
              fill={SHELTER.roofShade}
              strokeWidth="1.2"
            />
            <polygon
              points="86,29.5 111,23.5 159,37 137,43.5"
              fill={SHELTER.roofGap}
              strokeWidth="1.1"
            />
            <polygon
              points="137,43.5 159,37 159,39.2 137,45.8"
              fill={SHELTER.roofShade}
              strokeWidth="1.2"
            />
            {/* Shaded ventilated gable gap between lower and upper roof */}
            <polygon
              points="31,43 86,24.5 140,43 86,29.5"
              fill={SHELTER.roofGap}
              strokeWidth="1.1"
            />
            {/* Upper outer roof right slope */}
            <polygon
              points="86,21 113,16 167,36 144,43"
              fill={SHELTER.roofSlope}
              strokeWidth="1.5"
            />
            {/* Upper roof front gable fascia & eave overhang */}
            <polygon
              points="25,43.5 86,21 144,43 144,45.6 86,24.2 25,46"
              fill={SHELTER.roofTop}
              strokeWidth="1.5"
            />
            {/* Right eave fascia thickness */}
            <polygon
              points="144,43 167,36 167,38.6 144,45.6"
              fill={SHELTER.roofShade}
              strokeWidth="1.3"
            />
            {/* Ridge cap */}
            <line x1="86" y1="21" x2="113" y2="16" strokeWidth="2.1" strokeLinecap="round" />
          </g>

          {/* Closed door face (shown only during first phase of opening animation) */}
          <g className="orc-obs-shelter-door-front" strokeLinejoin="round">
            <rect
              x="40"
              y="46"
              width="92"
              height="99.5"
              fill={SHELTER.woodLight}
              stroke={SHELTER.ink}
              strokeWidth="1.5"
            />
            <rect
              x="48"
              y="55"
              width="76"
              height="82"
              fill={SHELTER.interiorShadow}
              stroke={SHELTER.ink}
              strokeWidth="1.1"
            />
            {renderDoubleVLouverSlats(LOUVER_SLAT_COUNT, 48, 124, closedDoorY, 0.02, 0.98, 'front-slat')}
            {/* Brass hinges and latch */}
            <rect x="38.5" y="61" width="3.2" height="6" rx="0.6" fill={SHELTER.brass} stroke={SHELTER.ink} strokeWidth="0.9" />
            <rect x="38.5" y="124" width="3.2" height="6" rx="0.6" fill={SHELTER.brass} stroke={SHELTER.ink} strokeWidth="0.9" />
            <rect x="125.5" y="92" width="4.2" height="7" rx="1" fill={SHELTER.brass} stroke={SHELTER.ink} strokeWidth="1" />
          </g>

          {/* Open 3D louver door in perspective (trapezoid + thickness edge + hinges + latch) */}
          <g className="orc-obs-shelter-door" strokeLinejoin="round">
            {/* Free-edge thickness strip (canto) */}
            <polygon
              points="11.5,40.5 16,39 16,153 11.5,151.5"
              fill={SHELTER.woodCanto}
              stroke={SHELTER.ink}
              strokeWidth="1.5"
            />
            {/* Door inner frame face in perspective */}
            <polygon
              points="16,39 40,47 40,145 16,153"
              fill={SHELTER.woodLight}
              stroke={SHELTER.ink}
              strokeWidth="1.5"
            />
            {/* Recessed louver panel */}
            <polygon
              points={quadPts(20.5, 35.5, openDoorY, 0.08, 0.92)}
              fill={SHELTER.interiorShadow}
              stroke={SHELTER.ink}
              strokeWidth="1.1"
            />
            {renderDoubleVLouverSlats(LOUVER_SLAT_COUNT, 20.5, 35.5, openDoorY, 0.095, 0.905, 'door-slat')}
            {/* Small hinges along the hinge line */}
            <rect x="38.5" y="61" width="3.5" height="6" rx="0.6" fill={SHELTER.brass} stroke={SHELTER.ink} strokeWidth="0.9" />
            <rect x="38.5" y="124" width="3.5" height="6" rx="0.6" fill={SHELTER.brass} stroke={SHELTER.ink} strokeWidth="0.9" />
            {/* Latch / turn handle on the free edge */}
            <rect x="15.8" y="92.5" width="2.6" height="7" rx="0.6" fill={SHELTER.brass} stroke={SHELTER.ink} strokeWidth="0.9" />
            <rect x="12.5" y="94.8" width="4.2" height="2.6" rx="0.6" fill={SHELTER.brass} stroke={SHELTER.ink} strokeWidth="0.9" />
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
