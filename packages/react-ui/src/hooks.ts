import { useEffect, useRef, useState, type RefObject } from 'react';
import { prefersReducedMotion } from '@antartida/core';

/**
 * While `open`, focuses the first element matching `initial` inside the container.
 * When it closes, focus goes back to whatever had it before (or `fallback`).
 */
export function useFocusReturn(
  open: boolean,
  container: RefObject<HTMLElement | null>,
  initial = 'button',
  fallback?: () => HTMLElement | null | undefined,
) {
  const fallbackRef = useRef(fallback);
  fallbackRef.current = fallback;
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    container.current?.querySelector<HTMLElement>(initial)?.focus();
    return () => {
      const target = previous && previous !== document.body && previous.isConnected ? previous : fallbackRef.current?.();
      target?.focus();
    };
  }, [open, container, initial]);
}

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => setReduced(prefersReducedMotion()), []);
  return reduced;
}

export function useTimers() {
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  return (name: string, fn: () => void, ms: number) => {
    clearTimeout(timers.current.get(name));
    timers.current.set(name, setTimeout(fn, ms));
  };
}
