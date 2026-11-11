import type { FossilKind } from '../content/fossils.ts';

/** Expedition art, copied from the prototype (injected as innerHTML in every stack). */

export const SCENE_SKY = `<rect width="400" height="700" fill="url(#sky)"></rect>
<g class="cloud" filter="url(#bleed)" fill="#F7FAFB" opacity="0.85">
<ellipse cx="90" cy="150" rx="80" ry="22"></ellipse>
<ellipse cx="300" cy="110" rx="100" ry="26"></ellipse>
<ellipse cx="230" cy="210" rx="70" ry="16"></ellipse>
</g>`;

export const SCENE_SEA = `<path d="M-20,330 L60,318 L110,322 L150,310 L200,316 L260,306 L320,314 L420,308 L420,345 L-20,345 Z" fill="#E9F1F6" stroke="#1F2A36" stroke-width="1" filter="url(#wcs)"></path>
<rect x="-20" y="340" width="440" height="400" fill="url(#sea)" filter="url(#wcs)"></rect>
<g stroke="#9FC0D6" stroke-width="1.4" fill="none" opacity="0.7" stroke-linecap="round" filter="url(#ink)">
<path d="M20,370 L80,368 M140,380 L210,378 M260,366 L330,368 M40,410 L120,408 M220,420 L300,418 M330,400 L380,402"></path>
</g>
<g fill="#F7FAFB" stroke="#1F2A36" stroke-width="0.9" filter="url(#wcs)">
<path d="M60,392 L90,388 L102,396 L70,400 Z"></path>
<path d="M290,384 L330,380 L340,388 L300,392 Z"></path>
</g>`;

export const SCENE_ROCK = `<path d="M-20,720 L-20,520 C40,500 90,505 130,512 C200,498 260,500 330,508 C370,502 400,506 430,512 L430,720 Z" fill="#9C7A50" filter="url(#wc)" opacity="0.95"></path>
<path d="M-20,720 L-20,600 C80,590 200,598 430,592 L430,720 Z" fill="#7B5B3A" filter="url(#wc)" opacity="0.9"></path>`;

/** Rock outcrop with the three buried fossils (dynamic sediment layers are drawn on top by each stack). */
export const DIG_ROCK = `<path d="M0,300 L0,140 C30,120 60,112 92,118 C128,98 170,92 205,106 C240,90 286,86 320,102 C350,94 380,100 400,112 L400,300 Z" fill="url(#rockg)" filter="url(#wcs)"></path>
<g clip-path="url(#rockclip)">
<path d="M0,165 C80,155 160,170 240,158 C300,150 360,160 400,154 L400,175 C340,182 280,172 220,180 C140,190 70,178 0,186 Z" fill="#A4471F" opacity="0.35" filter="url(#wcs)"></path>
<path d="M0,238 C90,230 170,246 260,236 C320,230 370,240 400,234 L400,252 C330,258 260,250 190,258 C120,264 60,252 0,258 Z" fill="#7A5634" opacity="0.4" filter="url(#wcs)"></path>
<g fill="none" stroke="#1F2A36" stroke-width="0.9" opacity="0.45" filter="url(#ink)">
<path d="M0,150 C90,140 180,156 260,144 C320,138 370,146 400,142"></path>
<path d="M0,205 C100,196 180,212 270,202 C330,196 370,204 400,200"></path>
<path d="M0,272 C90,266 200,280 290,270 C340,266 380,272 400,270"></path>
<path d="M150,120 L146,140 L152,152 M268,110 L262,128 M40,200 L48,214 L44,226 M352,190 L346,206"></path>
</g>
</g>
<path d="M0,140 C30,120 60,112 92,118 C128,98 170,92 205,106 C240,90 286,86 320,102 C350,94 380,100 400,112" fill="none" stroke="#1F2A36" stroke-width="1.8" stroke-linecap="round" filter="url(#ink)"></path>
<g filter="url(#ink)" fill="none" stroke="#3E2A17" stroke-linecap="round">
<path d="M92,182 c3,0 5,3 3,6 c-3,4 -10,3 -11,-2 c-2,-7 5,-12 11,-11 c9,1 14,10 11,18 c-4,10 -18,12 -25,5 c-9,-9 -7,-24 5,-29 c12,-6 27,0 31,13" stroke-width="2.2"></path>
<path d="M100,172 l5,-5 M108,180 l7,-2 M106,192 l6,3 M94,198 l1,7 M80,192 l-6,4 M76,178 l-7,-2 M84,166 l-3,-6" stroke-width="1.3"></path>
</g>
<g filter="url(#ink)" stroke="#3E2A17" stroke-linecap="round">
<path d="M184,232 C198,212 226,206 246,220 C230,240 202,246 184,232 Z" fill="#7C6A3E" fill-opacity="0.35" stroke-width="2"></path>
<path d="M184,232 L246,220 M200,229 L206,216 M214,226 L222,212 M228,224 L236,212 M200,229 L208,238 M214,226 L222,238 M228,224 L235,233" fill="none" stroke-width="1.2"></path>
</g>
<g filter="url(#ink)" stroke="#3E2A17" stroke-width="2" fill="#EADBC0">
<path d="M296,166 c-6,-6 -4,-14 3,-14 c4,-6 12,-4 12,2 l20,8 c4,-6 12,-4 12,3 c6,4 3,13 -4,13 c-3,6 -11,5 -12,-1 l-20,-8 c-3,5 -11,3 -11,-3 z"></path>
<path d="M312,160 l16,6" stroke-width="1" fill="none"></path>
</g>`;

/** Sediment covers, hint rings and found rings per dig spot (center and radii in rock space). */
export const DIG_ZONES = [
  { cx: 92, cy: 184, rx: 40, ry: 30, hx: 44, hy: 34, dots: [[78, 176, 2], [104, 194, 1.6]], label: { x: 58, y: 234, text: 'A · espiral' } },
  { cx: 214, cy: 226, rx: 46, ry: 28, hx: 50, hy: 32, dots: [[200, 220, 2], [230, 232, 1.6]], label: { x: 190, y: 274, text: 'B · hoja' } },
  { cx: 318, cy: 168, rx: 40, ry: 26, hx: 44, hy: 30, dots: [[306, 164, 1.8], [330, 172, 1.5]], label: { x: 292, y: 214, text: 'C · hueso' } },
] as const;

/** Fossil drawings: the comparison thumbnails and the evidence card differ slightly in the prototype. */
export const FOSSIL_THUMB: Record<FossilKind, { viewBox: string; body: string }> = {
  shell: { viewBox: '40 140 100 90', body: '<g filter="url(#ink)" fill="none" stroke="#3E2A17" stroke-linecap="round"><path d="M92,182 c3,0 5,3 3,6 c-3,4 -10,3 -11,-2 c-2,-7 5,-12 11,-11 c9,1 14,10 11,18 c-4,10 -18,12 -25,5 c-9,-9 -7,-24 5,-29 c12,-6 27,0 31,13" stroke-width="2.4"></path></g>' },
  leaf: { viewBox: '170 190 90 60', body: '<g filter="url(#ink)" stroke="#3E2A17" stroke-linecap="round"><path d="M184,232 C198,212 226,206 246,220 C230,240 202,246 184,232 Z" fill="#7C6A3E" fill-opacity="0.35" stroke-width="2"></path><path d="M184,232 L246,220 M200,229 L206,216 M214,226 L222,212 M228,224 L236,212 M200,229 L208,238 M214,226 L222,238" fill="none" stroke-width="1.2"></path></g>' },
  bone: { viewBox: '285 140 70 50', body: '<g filter="url(#ink)" stroke="#3E2A17" stroke-width="2" fill="#EADBC0"><path d="M296,166 c-6,-6 -4,-14 3,-14 c4,-6 12,-4 12,2 l20,8 c4,-6 12,-4 12,3 c6,4 3,13 -4,13 c-3,6 -11,5 -12,-1 l-20,-8 c-3,5 -11,3 -11,-3 z"></path></g>' },
};

export const FOSSIL_CARD: Record<FossilKind, { viewBox: string; body: string }> = {
  shell: { viewBox: '40 140 100 90', body: '<g filter="url(#ink)" fill="none" stroke="#3E2A17" stroke-linecap="round"><path d="M92,182 c3,0 5,3 3,6 c-3,4 -10,3 -11,-2 c-2,-7 5,-12 11,-11 c9,1 14,10 11,18 c-4,10 -18,12 -25,5 c-9,-9 -7,-24 5,-29 c12,-6 27,0 31,13" stroke-width="2.4"></path><path d="M100,172 l5,-5 M108,180 l7,-2 M106,192 l6,3 M94,198 l1,7 M80,192 l-6,4 M76,178 l-7,-2 M84,166 l-3,-6" stroke-width="1.3"></path></g>' },
  leaf: { viewBox: '170 190 90 60', body: '<g filter="url(#ink)" stroke="#3E2A17" stroke-linecap="round"><path d="M184,232 C198,212 226,206 246,220 C230,240 202,246 184,232 Z" fill="#7C6A3E" fill-opacity="0.35" stroke-width="2"></path><path d="M184,232 L246,220 M200,229 L206,216 M214,226 L222,212 M228,224 L236,212 M200,229 L208,238 M214,226 L222,238 M228,224 L235,233" fill="none" stroke-width="1.2"></path></g>' },
  bone: { viewBox: '285 140 70 50', body: '<g filter="url(#ink)" stroke="#3E2A17" stroke-width="2" fill="#EADBC0"><path d="M296,166 c-6,-6 -4,-14 3,-14 c4,-6 12,-4 12,2 l20,8 c4,-6 12,-4 12,3 c6,4 3,13 -4,13 c-3,6 -11,5 -12,-1 l-20,-8 c-3,5 -11,3 -11,-3 z"></path><path d="M312,160 l16,6" stroke-width="1" fill="none"></path></g>' },
};

/** Body of the reconstruction <svg viewBox="0 0 400 240">. */
export const RECONSTRUCTION_SVG = `<rect width="400" height="240" fill="url(#warm)"></rect>
<g filter="url(#bleed)" fill="#FBF0DC" opacity="0.8"><ellipse cx="90" cy="40" rx="70" ry="14"></ellipse><ellipse cx="300" cy="56" rx="80" ry="12"></ellipse></g>
<path d="M0,120 C60,110 120,118 180,112 C260,104 330,110 400,104 L400,240 L0,240 Z" fill="#7F8E66" filter="url(#wcs)"></path>
<g filter="url(#wcs)">
<path d="M210,118 L224,62 L238,118 Z M240,116 L256,48 L272,116 Z M276,114 L290,70 L304,114 Z M308,112 L324,54 L340,112 Z M344,110 L358,74 L372,110 Z M372,108 L388,60 L402,108 Z" fill="#4D5C3F"></path>
<path d="M150,120 L162,80 L174,120 Z M180,118 L192,72 L206,118 Z" fill="#5E6E4A"></path>
</g>
<path d="M0,160 C80,150 160,170 240,160 C300,154 350,164 400,158 L400,240 L0,240 Z" fill="#D9BF8E" filter="url(#wcs)"></path>
<path d="M0,186 C70,178 140,194 220,186 C290,180 340,192 400,186 L400,240 L0,240 Z" fill="#6F96AF" filter="url(#wcs)"></path>
<path d="M0,212 C80,206 180,220 400,210 L400,240 L0,240 Z" fill="#4A7899" filter="url(#wcs)"></path>
<g fill="none" stroke="#1F2A36" stroke-width="1" opacity="0.6" filter="url(#ink)">
<path d="M0,120 C60,110 120,118 180,112 C260,104 330,110 400,104"></path>
<path d="M0,186 C70,178 140,194 220,186 C290,180 340,192 400,186"></path>
</g>
<g stroke="#5E6E4A" stroke-width="1.6" fill="none" stroke-linecap="round" filter="url(#ink)">
<path d="M60,150 C62,136 70,128 80,124 M60,150 C58,138 50,130 42,128 M100,148 C104,136 112,130 120,128"></path>
</g>`;

/** Body of the completion seal <svg viewBox="0 0 120 120">. */
export const SEAL_SVG = `<circle cx="60" cy="60" r="50" fill="#C0862F" opacity="0.85" filter="url(#wcs)"></circle>
<circle cx="60" cy="60" r="50" fill="none" stroke="#1F2A36" stroke-width="2" filter="url(#ink)"></circle>
<circle cx="60" cy="60" r="41" fill="none" stroke="#1F2A36" stroke-width="1" stroke-dasharray="3 4"></circle>
<path d="M40,62 L54,76 L82,44" fill="none" stroke="#1F2A36" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" filter="url(#ink)"></path>`;
