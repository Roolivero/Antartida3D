import { SVG_DEFS } from '@antartida/core';
import type { ReactNode } from 'react';

export type ChipKind = 'real' | 'sim' | 'art' | 'prov';

export function Chip({ kind, children }: { kind: ChipKind; children: ReactNode }) {
  return <span className={'chip ' + kind}>{children}</span>;
}

/** Shared painted filters and gradients, referenced by url(#id) everywhere. */
export function Filters() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <defs dangerouslySetInnerHTML={{ __html: SVG_DEFS }} />
    </svg>
  );
}

export function SvgHtml({ html, className, viewBox, preserveAspectRatio }: {
  html: string;
  className?: string;
  viewBox: string;
  preserveAspectRatio?: string;
}) {
  return (
    <svg
      className={className}
      viewBox={viewBox}
      preserveAspectRatio={preserveAspectRatio}
      aria-hidden="true"
      focusable="false"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

const stroke = { stroke: '#1F2A36', strokeLinecap: 'round' as const };

export const Icon = {
  plus: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" {...stroke} strokeWidth="2.4" /></svg>,
  minus: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14" {...stroke} strokeWidth="2.4" /></svg>,
  reset: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="7.5" stroke="#1F2A36" strokeWidth="2" fill="none" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" {...stroke} strokeWidth="2" />
    </svg>
  ),
  close: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" {...stroke} strokeWidth="2.4" /></svg>,
  legend: <svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M5 12h14M5 17h9" {...stroke} strokeWidth="2" fill="none" /></svg>,
  list: (
    <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 6h12M8 12h12M8 18h12" {...stroke} strokeWidth="2" fill="none" />
      <circle cx="4" cy="6" r="1.5" fill="#1F2A36" /><circle cx="4" cy="12" r="1.5" fill="#1F2A36" /><circle cx="4" cy="18" r="1.5" fill="#1F2A36" />
    </svg>
  ),
  back: (
    <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 14 14" aria-hidden="true">
      <path d="M2.5,7.5 L5.8,10.5 L11.5,3.5" fill="none" stroke="#1F2A36" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};
