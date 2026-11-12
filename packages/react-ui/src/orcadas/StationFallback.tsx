import { useEffect } from 'react';
import {
  ORCADAS_LAT,
  midMonthDayOfYear,
  seaIceAt,
  solarElevationDeg,
  type BuildingId,
} from '@antartida/core';

export function StationFallback({
  month,
  hour = 12,
  buildings,
  onReady,
}: {
  month: number;
  hour?: number;
  buildings: readonly BuildingId[];
  onReady?: () => void;
}) {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as unknown as { __orcadasReady?: boolean }).__orcadasReady = true;
    }
    onReady?.();
  }, [onReady]);

  const sunEl = solarElevationDeg(ORCADAS_LAT, midMonthDayOfYear(month), hour);
  const ice = seaIceAt(month);
  const isNight = sunEl < -4;
  const isTwilight = sunEl >= -4 && sunEl < 7;

  const skyTop = isNight ? '#162434' : isTwilight ? '#274666' : '#6A97B5';
  const skyBot = isNight ? '#283E56' : isTwilight ? '#D89A52' : '#EFE6D5';
  const sunCy = Math.max(60, Math.min(270, 235 - sunEl * 4.2));

  const hasOmond = buildings.includes('omond');
  const hasMoneta = buildings.includes('moneta');
  const hasRadio = buildings.includes('radioMast');
  const hasModern = buildings.includes('modern');

  return (
    <div className="orc-fallback" role="img" aria-label="Ilustración del istmo de la Estación Orcadas">
      <svg
        viewBox="0 0 960 540"
        preserveAspectRatio="xMidYMid slice"
        className="orc-fallback-svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="orc-sky-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={skyTop} />
            <stop offset="58%" stopColor={skyBot} />
            <stop offset="100%" stopColor="#F3EBDD" />
          </linearGradient>
          <linearGradient id="orc-sea-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2A5275" />
            <stop offset="50%" stopColor="#4F7D9E" />
            <stop offset="100%" stopColor="#1E3E5C" />
          </linearGradient>
        </defs>

        {/* Sky */}
        <rect width="960" height="310" fill="url(#orc-sky-grad)" />

        {/* Stars at night */}
        {isNight && (
          <g fill="#F7FAFB" opacity="0.85">
            <circle cx="140" cy="54" r="1.6" />
            <circle cx="260" cy="82" r="1.2" />
            <circle cx="410" cy="44" r="1.8" />
            <circle cx="580" cy="68" r="1.4" />
            <circle cx="740" cy="48" r="1.7" />
            <circle cx="850" cy="92" r="1.3" />
          </g>
        )}

        {/* Sun disc */}
        {sunEl > -3 && (
          <g>
            <circle cx="480" cy={sunCy} r="36" fill="#C0862F" opacity="0.24" />
            <circle
              cx="480"
              cy={sunCy}
              r="18"
              fill="#FBF4E6"
              stroke="#1F2A36"
              strokeWidth="1.5"
            />
          </g>
        )}

        {/* Bahía Uruguay (North) & Bahía Scotia (South) */}
        <rect x="0" y="250" width="960" height="290" fill="url(#orc-sea-grad)" />

        {/* Western & Eastern Flanking Mountains and Glaciers */}
        <path
          d="M0,295 L0,165 L65,130 L135,175 L210,148 L295,245 L265,305 Z"
          fill="#4A5561"
          stroke="#1F2A36"
          strokeWidth="2"
        />
        <path
          d="M65,130 L135,175 L185,245 L95,252 Z"
          fill="#DCEAF2"
          stroke="#1F2A36"
          strokeWidth="1.5"
        />
        <path
          d="M960,305 L960,140 L875,108 L790,152 L705,126 L635,242 L680,312 Z"
          fill="#4A5561"
          stroke="#1F2A36"
          strokeWidth="2"
        />
        <path
          d="M790,152 L705,126 L655,242 L765,258 Z"
          fill="#E4EFF5"
          stroke="#1F2A36"
          strokeWidth="1.5"
        />

        {/* Sea-ice pancakes in the bays */}
        {ice > 0.08 && (
          <g
            fill="#F7FAFB"
            stroke="#1F2A36"
            strokeWidth="1.3"
            opacity={Math.min(0.95, 0.25 + ice * 0.75)}
          >
            <polygon points="180,365 225,358 242,374 205,384 172,376" />
            <polygon points="280,395 340,388 356,406 312,416 270,408" />
            <polygon points="410,418 475,412 490,430 435,438 398,430" />
            <polygon points="545,392 608,386 622,404 575,414 536,404" />
            {ice > 0.45 && (
              <>
                <polygon points="235,435 305,428 320,448 265,456 225,446" />
                <polygon points="485,452 558,444 574,464 512,472 474,462" />
                <polygon points="355,368 412,362 424,378 380,385 346,378" />
              </>
            )}
          </g>
        )}

        {/* Central Isthmus of Laurie Island */}
        <path
          d="M155,305 C265,262 385,254 490,256 C605,258 715,268 815,312 C735,346 615,356 485,358 C355,356 245,342 155,305 Z"
          fill="#8A7E72"
          stroke="#1F2A36"
          strokeWidth="2.4"
        />
        <path
          d="M220,302 C330,274 445,270 565,274 C645,278 715,288 760,306 C675,328 565,336 455,335 C345,334 265,322 220,302 Z"
          fill="#EFE7DA"
          stroke="#1F2A36"
          strokeWidth="1.4"
        />

        {/* Radio Masts (1927+) */}
        {hasRadio && (
          <g stroke="#1F2A36" strokeWidth="1.8" fill="none">
            <line x1="365" y1="278" x2="372" y2="172" />
            <line x1="379" y1="278" x2="372" y2="172" />
            <line x1="605" y1="282" x2="612" y2="176" />
            <line x1="619" y1="282" x2="612" y2="176" />
            <path d="M372,178 Q492,204 612,182" strokeDasharray="3 2" />
          </g>
        )}

        {/* Omond House (1903 stone cabin) */}
        {hasOmond && (
          <g transform="translate(405, 266)">
            <rect
              x="0"
              y="14"
              width="48"
              height="24"
              fill="#7A736C"
              stroke="#1F2A36"
              strokeWidth="2"
            />
            <polygon
              points="-4,14 24,0 52,14"
              fill="#5C4938"
              stroke="#1F2A36"
              strokeWidth="2"
            />
            <rect x="18" y="22" width="10" height="16" fill="#1F2A36" />
          </g>
        )}

        {/* Casa Moneta (1905 wooden gable house) */}
        {hasMoneta && (
          <g transform="translate(495, 252)">
            <rect
              x="0"
              y="18"
              width="66"
              height="32"
              fill="#C89B6E"
              stroke="#1F2A36"
              strokeWidth="2"
            />
            <polygon
              points="-5,18 33,-2 71,18"
              fill="#A4471F"
              stroke="#1F2A36"
              strokeWidth="2"
            />
            <rect
              x="46"
              y="-6"
              width="8"
              height="16"
              fill="#7A3B24"
              stroke="#1F2A36"
              strokeWidth="1.6"
            />
            <rect
              x="12"
              y="26"
              width="12"
              height="12"
              fill={isNight ? '#F5C469' : '#D6E5EF'}
              stroke="#1F2A36"
              strokeWidth="1.5"
            />
            <rect
              x="38"
              y="26"
              width="12"
              height="12"
              fill={isNight ? '#F5C469' : '#D6E5EF'}
              stroke="#1F2A36"
              strokeWidth="1.5"
            />
          </g>
        )}

        {/* Modern Station Modules (2000+) */}
        {hasModern && (
          <g transform="translate(578, 264)">
            <rect
              x="0"
              y="12"
              width="74"
              height="28"
              rx="2"
              fill="#B84A27"
              stroke="#1F2A36"
              strokeWidth="2"
            />
            <rect
              x="-3"
              y="8"
              width="80"
              height="6"
              fill="#1E3E5C"
              stroke="#1F2A36"
              strokeWidth="1.6"
            />
            {[10, 28, 46, 60].map((wx) => (
              <rect
                key={wx}
                x={wx}
                y="19"
                width="10"
                height="9"
                fill={isNight ? '#F8D278' : '#E3EFF6'}
                stroke="#1F2A36"
                strokeWidth="1.3"
              />
            ))}
          </g>
        )}

        {/* Meteorological Stevenson Screen */}
        <g transform="translate(310, 272)">
          <line x1="6" y1="24" x2="4" y2="42" stroke="#1F2A36" strokeWidth="2" />
          <line x1="26" y1="24" x2="28" y2="42" stroke="#1F2A36" strokeWidth="2" />
          <rect
            x="0"
            y="4"
            width="32"
            height="22"
            fill="#F7FAFB"
            stroke="#1F2A36"
            strokeWidth="2"
          />
          <line x1="4" y1="10" x2="28" y2="10" stroke="#1F2A36" strokeWidth="1.2" />
          <line x1="4" y1="15" x2="28" y2="15" stroke="#1F2A36" strokeWidth="1.2" />
          <line x1="4" y1="20" x2="28" y2="20" stroke="#1F2A36" strokeWidth="1.2" />
        </g>

        {/* Wind Mast & Anemometer */}
        <g transform="translate(238, 210)">
          <line x1="16" y1="10" x2="16" y2="96" stroke="#1F2A36" strokeWidth="2.4" />
          <line x1="4" y1="20" x2="28" y2="20" stroke="#1F2A36" strokeWidth="2" />
          <circle cx="4" cy="20" r="3" fill="#1F2A36" />
          <circle cx="28" cy="20" r="3" fill="#1F2A36" />
        </g>

        {/* Flagpole & Argentine Flag */}
        <g transform="translate(462, 206)">
          <line x1="0" y1="0" x2="0" y2="96" stroke="#1F2A36" strokeWidth="2.4" />
          <rect x="0" y="4" width="34" height="7" fill="#74ACDF" />
          <rect x="0" y="11" width="34" height="7" fill="#F7FAFB" />
          <rect x="0" y="18" width="34" height="7" fill="#74ACDF" />
          <circle cx="16" cy="14.5" r="2.5" fill="#C0862F" />
          <rect
            x="0"
            y="4"
            width="34"
            height="21"
            fill="none"
            stroke="#1F2A36"
            strokeWidth="1.5"
          />
        </g>

        {/* Penguin Colony on Eastern Slope */}
        <g transform="translate(700, 286)">
          {[0, 18, 34, 50].map((dx, i) => (
            <g key={dx} transform={`translate(${dx}, ${(i % 2) * 6})`}>
              <ellipse cx="6" cy="12" rx="5" ry="9" fill="#1F2A36" />
              <ellipse cx="7" cy="13" rx="3" ry="6.5" fill="#F7FAFB" />
              <circle cx="6" cy="3" r="3.5" fill="#1F2A36" />
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
