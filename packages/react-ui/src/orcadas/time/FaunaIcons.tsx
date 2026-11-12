import type { OrcadasAnimal } from '@antartida/core';

export function FaunaSketchIcon({ id }: { id: OrcadasAnimal['id'] }) {
  switch (id) {
    case 'adelie':
      return (
        <svg className="orc-fauna-ico" viewBox="0 0 16 16" aria-hidden="true">
          <path
            d="M8 1.8c-2 0-3.3 1.8-3.3 4.8 0 3-1 5.2-1 6.4h8.6c0-1.2-1-3.4-1-6.4 0-3-1.3-4.8-3.3-4.8Z"
            fill="#1F2A36"
          />
          <ellipse cx="8" cy="9.2" rx="2" ry="3.4" fill="#F7FAFB" />
          <circle cx="7.3" cy="4.2" r="0.8" fill="#F7FAFB" />
          <path d="M9.6 4.1 L12 4.6 L9.6 5.1 Z" fill="#A4471F" />
        </svg>
      );
    case 'chinstrap':
      return (
        <svg className="orc-fauna-ico" viewBox="0 0 16 16" aria-hidden="true">
          <path
            d="M8 1.8c-2 0-3.3 1.8-3.3 4.8 0 3-1 5.2-1 6.4h8.6c0-1.2-1-3.4-1-6.4 0-3-1.3-4.8-3.3-4.8Z"
            fill="#1F2A36"
          />
          <ellipse cx="8" cy="8.6" rx="2.1" ry="4" fill="#F7FAFB" />
          <path
            d="M6.1 4.9 Q8 6.4 9.9 4.9"
            fill="none"
            stroke="#1F2A36"
            strokeWidth="1.1"
            strokeLinecap="round"
          />
          <path d="M9.6 3.9 L12 4.4 L9.6 4.9 Z" fill="#C0862F" />
        </svg>
      );
    case 'weddell':
      return (
        <svg className="orc-fauna-ico" viewBox="0 0 16 16" aria-hidden="true">
          <path
            d="M2 10.5c1-2.5 3.6-4 6.6-3.7 2.2.2 3.8 1.2 5.4 2.8-.9.9-2.2 1.4-4 1.4H2Z"
            fill="#1E3E5C"
          />
          <circle cx="5.2" cy="8.4" r="0.6" fill="#F7FAFB" />
          <circle cx="7.8" cy="9.2" r="0.5" fill="#7FA8C4" />
          <circle cx="9.6" cy="8.6" r="0.45" fill="#7FA8C4" />
        </svg>
      );
    case 'elephant':
      return (
        <svg className="orc-fauna-ico" viewBox="0 0 16 16" aria-hidden="true">
          <path
            d="M1.8 11c.8-3 3.4-4.8 6.5-4.6 2.5.1 4.2 1.3 5.7 3v1.6H1.8Z"
            fill="#5E656C"
          />
          <path
            d="M3.2 7.4c-.9.3-1.4 1.2-1.2 2.2"
            fill="none"
            stroke="#1F2A36"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
          <circle cx="4.8" cy="7.9" r="0.6" fill="#F7FAFB" />
        </svg>
      );
    case 'skua':
      return (
        <svg className="orc-fauna-ico" viewBox="0 0 16 16" aria-hidden="true">
          <path
            d="M1.5 9.2 Q5 4.2 8 7.4 Q11 4.2 14.5 9.2 Q11 7.6 8 9.5 Q5 7.6 1.5 9.2 Z"
            fill="#7A4E10"
            stroke="#1F2A36"
            strokeWidth="0.9"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'snowPetrel':
      return (
        <svg className="orc-fauna-ico" viewBox="0 0 16 16" aria-hidden="true">
          <path
            d="M1.5 8.8 Q5.2 3.8 8 7 Q10.8 3.8 14.5 8.8 Q11 7.4 8 9.2 Q5 7.4 1.5 8.8 Z"
            fill="#F7FAFB"
            stroke="#1F2A36"
            strokeWidth="1.1"
            strokeLinejoin="round"
          />
        </svg>
      );
  }
}
