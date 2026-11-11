import { ANTARCTICA_PATH, ICE_SHELF_SEAM, ICE_SHELVES_PATH, SOUTH_AMERICA_PATH } from '../coastline.ts';

/**
 * Watercolor layers of the map (everything that uses the painted SVG filters), copied from the
 * prototype. Build-time only: scripts/build-map-raster.ts bakes it into WebP so zooming never
 * re-rasterizes feTurbulence. Must not be imported by the apps.
 */
/** Decorative glacier strokes: illustration, not data. Fine on the flat 2D map, odd across 3D relief. */
const GLACIER_STROKES = `<g fill="none" stroke="#9FBDD1" stroke-width="2" stroke-linecap="round" opacity="0.7" filter="url(#ink)">
<path d="M560,300 C620,330 680,380 720,450"></path>
<path d="M600,560 C640,600 690,640 730,700"></path>
<path d="M330,470 C360,520 380,560 400,590"></path>
<path d="M610,470 C650,500 690,520 760,530"></path>
</g>`;

export const MAP_PAINT_SVG = `<circle cx="500" cy="500" r="600" fill="#2B5276" opacity="0.18" filter="url(#bleed)"></circle>
<circle cx="500" cy="505" r="548" fill="url(#ocean)" filter="url(#wc)" opacity="0.94"></circle>
<circle cx="490" cy="490" r="470" fill="#6C98B9" opacity="0.22" filter="url(#bleed)"></circle>
<g fill="none" stroke="#DCE7EE" stroke-width="1.1" opacity="0.5" filter="url(#ink)">
<circle cx="500" cy="500" r="426" stroke-dasharray="4 7"></circle>
<circle cx="500" cy="500" r="280" stroke-dasharray="4 7"></circle>
<circle cx="500" cy="500" r="139" stroke-dasharray="4 7"></circle>
<path d="M500,500 L500,-40 M500,500 L1040,500 M500,500 L500,1040 M500,500 L-40,500 M500,500 L120,120 M500,500 L880,120 M500,500 L880,880 M500,500 L120,880"></path>
</g>
<g font-family="Caveat, cursive" font-size="17" fill="#E6EEF3" opacity="0.85">
<text x="508" y="70">0° Greenwich</text>
<text x="74" y="78" transform="rotate(-45 74 78)">60° S</text>
</g>
<path d="M500,58 L500,22 M492,34 L500,20 L508,34" stroke="#F7FAFB" stroke-width="2.2" fill="none" stroke-linecap="round" filter="url(#ink)"></path>
<defs><path id="land" d="${ANTARCTICA_PATH}"></path><path id="shelves" d="${ICE_SHELVES_PATH}"></path></defs>
<g fill="#A9C6DA" filter="url(#bleed)" opacity="0.9"><use href="#land"></use><use href="#shelves"></use></g>
<g filter="url(#wcs)">
<use href="#shelves" fill="#E4EEF4"></use>
<path d="${ICE_SHELF_SEAM}" stroke="#E4EEF4" stroke-width="7"></path>
<use href="#land" fill="url(#ice)"></use>
</g>
${GLACIER_STROKES}
<path d="${SOUTH_AMERICA_PATH}" fill="#D9C49C" filter="url(#wcs)"></path>`;

/** Watercolor for the 3D terrain: same as the 2D one, without the decorative glacier strokes. */
export const MAP_PAINT_SVG_3D = MAP_PAINT_SVG.replace(GLACIER_STROKES, '');
