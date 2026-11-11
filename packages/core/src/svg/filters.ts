/** Shared <defs> copied verbatim from the prototype: painted filters, gradients and the rock clip. */
export const SVG_DEFS = `<filter id="wc" x="-10%" y="-10%" width="120%" height="120%">
<feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="3" seed="4" result="n"></feTurbulence>
<feDisplacementMap in="SourceGraphic" in2="n" scale="16" xChannelSelector="R" yChannelSelector="G"></feDisplacementMap>
</filter>
<filter id="wcs" x="-10%" y="-10%" width="120%" height="120%">
<feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="9" result="n"></feTurbulence>
<feDisplacementMap in="SourceGraphic" in2="n" scale="7" xChannelSelector="R" yChannelSelector="G" result="d"></feDisplacementMap>
<feGaussianBlur in="d" stdDeviation="0.7"></feGaussianBlur>
</filter>
<filter id="ink" x="-5%" y="-5%" width="110%" height="110%">
<feTurbulence type="turbulence" baseFrequency="0.06" numOctaves="2" seed="2" result="n"></feTurbulence>
<feDisplacementMap in="SourceGraphic" in2="n" scale="2.6" xChannelSelector="R" yChannelSelector="G"></feDisplacementMap>
</filter>
<filter id="bleed" x="-20%" y="-20%" width="140%" height="140%">
<feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="3" seed="12" result="n"></feTurbulence>
<feDisplacementMap in="SourceGraphic" in2="n" scale="10" xChannelSelector="R" yChannelSelector="G" result="d"></feDisplacementMap>
<feGaussianBlur in="d" stdDeviation="3"></feGaussianBlur>
</filter>
<filter id="paperf">
<feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="5" result="n"></feTurbulence>
<feColorMatrix in="n" type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.36  0 0 0 0 0.24  0 0 0 -1.1 0.62"></feColorMatrix>
</filter>
<filter id="fibers">
<feTurbulence type="fractalNoise" baseFrequency="0.012 0.09" numOctaves="2" seed="8" result="n"></feTurbulence>
<feColorMatrix in="n" type="matrix" values="0 0 0 0 0.5  0 0 0 0 0.42  0 0 0 0 0.3  0 0 0 -2 1.05"></feColorMatrix>
</filter>
<radialGradient id="ocean" cx="500" cy="500" r="560" gradientUnits="userSpaceOnUse">
<stop offset="0" stop-color="#5B8AAE"></stop>
<stop offset="0.5" stop-color="#3F6F94"></stop>
<stop offset="0.82" stop-color="#28507A"></stop>
<stop offset="1" stop-color="#1E3E5C"></stop>
</radialGradient>
<radialGradient id="ice" cx="520" cy="480" r="360" gradientUnits="userSpaceOnUse">
<stop offset="0" stop-color="#FFFFFF"></stop>
<stop offset="0.6" stop-color="#F2F7FA"></stop>
<stop offset="1" stop-color="#C9DCE8"></stop>
</radialGradient>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#B9D0DF"></stop>
<stop offset="0.6" stop-color="#E3ECF1"></stop>
<stop offset="1" stop-color="#F3EBDD"></stop>
</linearGradient>
<linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#2C557A"></stop>
<stop offset="1" stop-color="#4A7899"></stop>
</linearGradient>
<linearGradient id="rockg" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#D2B488"></stop>
<stop offset="0.5" stop-color="#B48D5D"></stop>
<stop offset="1" stop-color="#8B6640"></stop>
</linearGradient>
<linearGradient id="warm" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#F4DDB3"></stop>
<stop offset="1" stop-color="#E7C493"></stop>
</linearGradient>
<clipPath id="rockclip">
<path d="M0,300 L0,140 C30,120 60,112 92,118 C128,98 170,92 205,106 C240,90 286,86 320,102 C350,94 380,100 400,112 L400,300 Z"></path>
</clipPath>`;
