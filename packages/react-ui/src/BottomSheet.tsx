import { useEffect, useRef, useState, type MouseEvent, type PointerEvent, type ReactNode, type RefObject } from 'react';
import { SHEET_TAP_PX, sheetAfterDrag } from '@antartida/core';

/** Part of the height of its container an expanded sheet takes. */
const EXPANDED = 0.92;
/** While dragged down, the sheet does not get shorter than this: the handle stays under the finger. */
const SHEET_MIN_PX = 56;

/**
 * A sheet that comes up from the bottom of a phone screen, with a handle at its top. Dragging
 * the handle, or the sheet itself, up makes the sheet taller, to read more; dragging it down brings it back, and
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

  // The three steps of a drag, shared by the handle and by the body of the sheet.
  const begin = (y: number) => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    drag.current = { y, height: sheet.getBoundingClientRect().height };
    setDragging(true);
  };
  const follow = (y: number) => {
    const sheet = sheetRef.current;
    if (!drag.current || !sheet) return;
    // The sheet follows the finger, up to its tall size.
    const limit = (sheet.parentElement?.clientHeight ?? window.innerHeight) * EXPANDED;
    sheet.style.maxHeight = `${Math.min(limit, Math.max(SHEET_MIN_PX, drag.current.height + drag.current.y - y))}px`;
  };
  const release = (y: number) => {
    const sheet = sheetRef.current;
    if (!drag.current || !sheet) return;
    const size = sheetAfterDrag(expanded ? 'tall' : 'small', drag.current.y - y);
    drag.current = null;
    // Dragged down from its small size, the sheet closes: it stays where the finger left it until it is gone.
    if (size === 'closed') return onClose();
    setExpanded(size === 'tall');
    setDragging(false);
    // Back to the sizes of the style sheet: it eases to the one it snapped to.
    sheet.style.maxHeight = '';
  };

  const onDown = (e: PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    begin(e.clientY);
  };

  // A finger anywhere on the sheet drags it too, not only on the handle. Small, the sheet follows
  // the finger up or down. Tall, its text scrolls as usual, and a pull down from the top of the
  // text brings the sheet down. Without this, that pull down reloaded the page on a phone.
  const live = useRef({ expanded, begin, follow, release });
  live.current = { expanded, begin, follow, release };
  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    // Where the finger landed, until the move is told apart; then whether it drags the sheet.
    let press: { x: number; y: number; top: number } | null = null;
    let sheetDrag = false;
    const onStart = (e: TouchEvent) => {
      sheetDrag = false;
      const onHandle = (e.target as Element).closest('.sheet-handle');
      press = e.touches.length === 1 && !onHandle ? { x: e.touches[0].clientX, y: e.touches[0].clientY, top: sheet.scrollTop } : null;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!press) return;
      const { clientX: x, clientY: y } = e.touches[0];
      if (!sheetDrag) {
        const [dx, dy] = [x - press.x, y - press.y];
        if (Math.hypot(dx, dy) < SHEET_TAP_PX) return;
        // Sideways, or the text of a tall sheet being read: not a drag of the sheet.
        const pullsDown = dy > 0 && press.top <= 0;
        if (Math.abs(dx) > Math.abs(dy) || (live.current.expanded && !pullsDown)) return void (press = null);
        sheetDrag = true;
        live.current.begin(press.y);
      }
      e.preventDefault(); // the page must not scroll or reload under the finger
      live.current.follow(y);
    };
    const onEnd = (e: TouchEvent) => {
      if (sheetDrag) {
        // No click on whatever the finger started on: it was a drag.
        if (e.cancelable) e.preventDefault();
        live.current.release(e.changedTouches[0].clientY);
      }
      press = null;
      sheetDrag = false;
    };
    sheet.addEventListener('touchstart', onStart, { passive: true });
    sheet.addEventListener('touchmove', onTouchMove, { passive: false });
    sheet.addEventListener('touchend', onEnd);
    sheet.addEventListener('touchcancel', onEnd);
    return () => {
      sheet.removeEventListener('touchstart', onStart);
      sheet.removeEventListener('touchmove', onTouchMove);
      sheet.removeEventListener('touchend', onEnd);
      sheet.removeEventListener('touchcancel', onEnd);
    };
  }, [sheetRef]);

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
        onPointerMove={(e) => follow(e.clientY)}
        onPointerUp={(e) => release(e.clientY)}
        onPointerCancel={(e) => release(e.clientY)}
        onClick={onClick}
      >
        <span />
      </button>
      {children}
    </section>
  );
}
