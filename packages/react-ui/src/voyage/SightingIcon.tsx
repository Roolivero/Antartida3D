import type { SightingIcon as IconName } from '@antartida/core';

/** Simple silhouettes, one per kind of animal or place. Illustrations, not portraits. */
const SHAPES: Record<IconName, string> = {
  bird: 'M1.5 13.5c4-5.5 7.5-5.5 10.5-1 3-4.5 6.5-4.5 10.5 1-4-2.2-7.2-1.2-10.5 3.5-3.3-4.7-6.500-5.7-10.5-3.500z',
  penguin: 'M12 2c-3 0-4.500 2.500-4.500 5 0 1.500.300 2.500-.500 4-1.200 2.200-1.500 4-1.500 6 0 3 2.500 5 6.500 5s6.500-2 6.500-5c0-2-.300-3.800-1.500-6-.800-1.500-.500-2.500-.500-4 0-2.500-1.500-5-4.500-5z',
  whale: 'M2 13c0-4 4-7 9-7 4 0 7 2 8 5l3-3v8l-3-3c-1 3-4 5-8 5-5 0-9-2-9-5z',
  dolphin: 'M2 15.500c3-6 8-9 14-8l-1-4.500 4 4.500c2 1 3 2 3 4-2-1-4-1-5 0-3 3-9 5-15 4z',
  lighthouse: 'M10 2.5h4v3h1.5v2H14l1.5 11.5H18v2.500H6V19h2.500L10 7.500H8.500v-2H10z',
  seal: 'M2.500 17.500c1-5 4-9 9-9 3 0 4-2.500 6-2.500 2.200 0 3.500 2 3.500 4s-2 3-3 4c-1 2-2.500 4-6.500 4-4.500 0-8-.500-9-.500z',
};

export function SightingIcon({ icon }: { icon: IconName }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={SHAPES[icon]} fill="currentColor" />
      {icon === 'penguin' && <ellipse cx="12" cy="15" rx="3.2" ry="5" fill="var(--ice)" />}
    </svg>
  );
}
