import { ANTARCTICA_PATH, ICE_SHELF_SEAM, ICE_SHELVES_PATH, SOUTH_AMERICA_PATH } from '../coastline.ts';

/**
 * Crisp vector layer drawn over the baked watercolor: coastline outlines, the Ushuaia route and
 * labels. No SVG filters here, so re-rasterizing it at any zoom stays cheap.
 * Only the coastline source and a few label positions differ from the prototype (see docs/DECISIONES.md).
 */
export const MAP_INK = `<g fill="none" stroke-linejoin="round">
<path d="${ICE_SHELVES_PATH}" stroke="#1F2A36" stroke-width="1" opacity="0.55"></path>
<path d="${ICE_SHELF_SEAM}" stroke="#E4EEF4" stroke-width="7"></path>
<path d="${ANTARCTICA_PATH}" stroke="#1F2A36" stroke-width="1.6"></path>
<path d="${SOUTH_AMERICA_PATH}" stroke="#1F2A36" stroke-width="1.5"></path>
</g>
<path d="M36,318 C80,350 140,348 190,306" fill="none" stroke="#F7FAFB" stroke-width="5" stroke-linecap="round" opacity="0.5"></path>
<path d="M36,318 C80,350 140,348 190,306" fill="none" stroke="#A4471F" stroke-width="2.4" stroke-dasharray="2 9" stroke-linecap="round"></path>
<g font-family="Caveat, cursive" fill="#F7FAFB">
<text x="50" y="404" font-size="22" transform="rotate(-12 50 404)">Pasaje de Drake</text>
<text x="252" y="258" font-size="20" transform="rotate(10 252 258)">Mar de Weddell</text>
<text x="470" y="830" font-size="22">Mar de Ross</text>
<text x="190" y="640" font-size="19" transform="rotate(48 190 640)">Mar de Amundsen</text>
<text x="760" y="160" font-size="24" opacity="0.9">Océano Austral</text>
</g>
<g font-family="Fraunces, Georgia, serif" font-style="italic" fill="#3B5A73" opacity="0.75">
<text x="590" y="440" font-size="22">Antártida Oriental</text>
<text x="330" y="500" font-size="18">Antártida</text>
<text x="330" y="520" font-size="18">Occidental</text>
</g>
<text x="-6" y="378" font-family="Caveat, cursive" font-size="18" fill="#F7FAFB">Ushuaia</text>`;
