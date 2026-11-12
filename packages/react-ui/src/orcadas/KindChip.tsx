import { FACT_KIND_LABEL, type FactKind } from '@antartida/core';

function KindIcon({ kind }: { kind: FactKind }) {
  switch (kind) {
    case 'real':
      return (
        <svg className="orc-chip-ico" viewBox="0 0 12 12" aria-hidden="true">
          <circle cx="6" cy="6" r="4.5" fill="currentColor" />
        </svg>
      );
    case 'sim':
      return (
        <svg className="orc-chip-ico" viewBox="0 0 12 12" aria-hidden="true">
          <path
            d="M1 6c1.5-2 3-2 4.5 0s3 2 5.5 0"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'recon':
      return (
        <svg className="orc-chip-ico" viewBox="0 0 12 12" aria-hidden="true">
          <rect
            x="2"
            y="2"
            width="8"
            height="8"
            rx="1.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeDasharray="2 1.5"
          />
        </svg>
      );
    case 'calc':
      return (
        <svg className="orc-chip-ico" viewBox="0 0 12 12" aria-hidden="true">
          <polygon
            points="6,1.5 10.5,9.8 1.5,9.8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      );
  }
}

export function KindChip({
  kind,
  label,
  className,
}: {
  kind: FactKind;
  label?: string;
  className?: string;
}) {
  const text = label ?? FACT_KIND_LABEL[kind];
  return (
    <span className={`orc-chip orc-chip-${kind}${className ? ' ' + className : ''}`}>
      <KindIcon kind={kind} />
      <span>{text}</span>
    </span>
  );
}
