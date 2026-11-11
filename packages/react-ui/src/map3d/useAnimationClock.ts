import { createContext, useContext, useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { seaAnimationFps, shouldTick } from '@antartida/core';
import { useReducedMotion } from '../hooks.ts';

export interface SeaTimeUniform {
  value: number;
}

export const SeaTimeContext = createContext<SeaTimeUniform>({ value: 0 });

export function useSeaTime(): SeaTimeUniform {
  return useContext(SeaTimeContext);
}

export interface UseAnimationClockOptions {
  lowQuality?: boolean;
}

/**
 * Single requestAnimationFrame loop throttled to seaAnimationFps(30, 15, or 0) according to S5.
 * Accumulates animation time in uTime uniform ({ value: number }) and calls invalidate().
 * Stops advancing when paused (document.hidden, prefers-reduced-motion, or unmounted).
 * Also exposes window.__seaTime for tests and debugging.
 */
export function useAnimationClock({ lowQuality = false }: UseAnimationClockOptions = {}): SeaTimeUniform {
  const invalidate = useThree((s) => s.invalidate);
  const reducedMotion = useReducedMotion();
  const uTimeRef = useRef<SeaTimeUniform>({ value: 0 });

  useEffect(() => {
    // Reduced motion: time stays frozen, so there is nothing to schedule.
    if (reducedMotion) return;
    let animId: number | null = null;
    let lastTickMs = performance.now();

    const loop = (nowMs: number) => {
      // Time since the previous tick, capped so a hidden tab or a long stall resumes without a jump.
      const deltaMs = Math.min(Math.max(0, nowMs - lastTickMs), 100);

      const hidden = typeof document !== 'undefined' ? document.hidden : false;
      const targetFps = seaAnimationFps({
        hidden,
        is3D: true,
        reducedMotion,
        lowQuality,
      });

      if (targetFps === 0) {
        lastTickMs = nowMs; // paused: do not count this time
      } else if (shouldTick(nowMs, lastTickMs, targetFps)) {
        lastTickMs = nowMs;
        uTimeRef.current.value += deltaMs / 1000;
        if (typeof window !== 'undefined') {
          (window as unknown as { __seaTime?: number }).__seaTime = uTimeRef.current.value;
        }
        invalidate();
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    // Initial exposure of __seaTime on window
    if (typeof window !== 'undefined') {
      (window as unknown as { __seaTime?: number }).__seaTime = uTimeRef.current.value;
    }

    return () => {
      if (animId !== null) {
        cancelAnimationFrame(animId);
        animId = null;
      }
    };
  }, [invalidate, reducedMotion, lowQuality]);

  return uTimeRef.current;
}
