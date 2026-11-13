import { useRef, useState, type MouseEvent, type PointerEvent, type ReactNode, type RefObject } from 'react';
import { sheetAfterDrag } from '@antartida/core';

/** Part of the height of its container an expanded sheet takes. */
const EXPANDED = 0.92;
/** While dragged down, the sheet does not get shorter than this: the handle stays under the finger. */
const SHEET_MIN_PX = 56;

/**
 * A sheet that comes up from the bottom of a phone screen, with a handle at its top. Dragging
 * the handle up makes the sheet taller, to read more; dragging it down brings it back, and
 * dragging it down again closes the sheet. A tap on
 * the handle, or Enter with the keyboard, switches between the two sizes. On wide screens the
 * sheet is a card in a corner and the handle is hidden (`.sheet-handle` in painted.css).
 *
 * The small size is whatever `max-height` the sheet has in CSS; the tall one is `.sheet.grows.full`.
 */
export function BottomSheet({ className = '', labelledBy, sheetRef, onClose, children }: {
  /** Extra classes for the sheet, next to `sheet grows`. */
  className?: string;
  /** Id of the heading that names the dialog. */
  labelledBy: string;
  sheetRef: RefObject<HTMLElement | null>;
  /** Escape closes the sheet, and so does dragging it down from its small size. */
  onClose: () => void;
  children: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ y: number; height: number } | null>(null);

  const onDown = (e: PointerEvent<HTMLButtonElement>) => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { y: e.clientY, height: sheet.getBoundingClientRect().height };
    setDragging(true);
  };
  const onMove = (e: PointerEvent<HTMLButtonElement>) => {
    const sheet = sheetRef.current;
    if (!drag.current || !sheet) return;
    // The sheet follows the finger, up to its tall size.
    const limit = (sheet.parentElement?.clientHeight ?? window.innerHeight) * EXPANDED;
    sheet.style.maxHeight = `${Math.min(limit, Math.max(SHEET_MIN_PX, drag.current.height + drag.current.y - e.clientY))}px`;
  };
  const onUp = (e: PointerEvent<HTMLButtonElement>) => {
    const sheet = sheetRef.current;
    if (!drag.current || !sheet) return;
    const size = sheetAfterDrag(expanded ? 'tall' : 'small', drag.current.y - e.clientY);
    drag.current = null;
    // Dragged down from its small size, the sheet closes: it stays where the finger left it until it is gone.
    if (size === 'closed') return onClose();
    setExpanded(size === 'tall');
    setDragging(false);
    // Back to the sizes of the style sheet: it eases to the one it snapped to.
    sheet.style.maxHeight = '';
  };
  // A press is handled above. A click that no pointer made (detail 0) comes from the keyboard or
  // a screen reader.
  const onClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (e.detail === 0) setExpanded(!expanded);
  };

  return (
    <section
      className={`sheet grows${expanded ? ' full' : ''}${dragging ? ' dragging' : ''} ${className}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      ref={sheetRef}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <button
        type="button"
        className="sheet-handle"
        aria-expanded={expanded}
        aria-label={expanded ? 'Achicar el panel' : 'Agrandar el panel para ver más'}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onClick={onClick}
      >
        <span />
      </button>
      {children}
    </section>
  );
}
