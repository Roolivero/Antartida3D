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

/** Whether a CSS media query matches, kept up to date. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const update = () => setMatches(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, [query]);
  return matches;
}

export function useIsDesktop(breakpoint = 900): boolean {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.innerWidth >= breakpoint ||
      window.matchMedia('(orientation: landscape) and (max-height: 500px)').matches
    );
  });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mqlWide = window.matchMedia(`(min-width: ${breakpoint}px)`);
    const mqlLand = window.matchMedia('(orientation: landscape) and (max-height: 500px)');
    const update = () => setIsDesktop(mqlWide.matches || mqlLand.matches);
    update();
    mqlWide.addEventListener('change', update);
    mqlLand.addEventListener('change', update);
    return () => {
      mqlWide.removeEventListener('change', update);
      mqlLand.removeEventListener('change', update);
    };
  }, [breakpoint]);
  return isDesktop;
}

export function useTimers() {
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  return (name: string, fn: () => void, ms: number) => {
    clearTimeout(timers.current.get(name));
    timers.current.set(name, setTimeout(fn, ms));
  };
}
