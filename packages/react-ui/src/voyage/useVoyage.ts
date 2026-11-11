import { useEffect, useRef, useState } from 'react';
import {
  VOYAGE_GEARS, advanceVoyage, closeVoyageCard, nextGear, skipToNextStop, startVoyage, type TransportId, type VoyageState,
} from '@antartida/core';

/**
 * Trip state shared with the 3D scene without re-rendering React on every frame: the scene reads
 * `state` in its own frame loop and subscribes to know when to draw.
 */
export interface VoyageBus {
  state: VoyageState | null;
  /** The camera follows the vehicle until the user moves the map. */
  follow: boolean;
  listeners: Set<() => void>;
}

export interface VoyageController {
  /** Updated at milestones and when the user lets go, not on every frame. */
  state: VoyageState | null;
  bus: VoyageBus;
  start: (transport: TransportId) => void;
  /** Index into VOYAGE_GEARS: quick repeated presses of "advance" go faster. */
  gear: number;
  /** Advance while true: the user sets the pace. */
  hold: (on: boolean) => void;
  skip: () => void;
  closeCard: () => void;
  recenter: () => void;
  reset: () => void;
}

export function useVoyage(): VoyageController {
  const [state, setState] = useState<VoyageState | null>(null);
  const bus = useRef<VoyageBus>({ state: null, follow: true, listeners: new Set() }).current;
  const frame = useRef(0);
  const [gear, setGear] = useState(0);
  const press = useRef({ gear: 0, at: -Infinity });

  const notify = () => bus.listeners.forEach((fn) => fn());
  const commit = (next: VoyageState | null) => {
    bus.state = next;
    setState(next);
    notify();
  };
  const stop = () => {
    cancelAnimationFrame(frame.current);
    frame.current = 0;
  };

  useEffect(() => stop, []);

  return {
    state,
    bus,
    gear,
    start: (transport) => {
      bus.follow = true;
      commit(startVoyage(transport));
    },
    hold: (on) => {
      if (!on) {
        if (frame.current) {
          stop();
          setState(bus.state);
        }
        return;
      }
      if (frame.current || !bus.state) return;
      let last = performance.now();
      press.current = { gear: nextGear(press.current.gear, last - press.current.at), at: last };
      setGear(press.current.gear);
      const speed = VOYAGE_GEARS[press.current.gear];
      const tick = (now: number) => {
        const before = bus.state;
        if (!before) return stop();
        const next = advanceVoyage(before, Math.min(0.1, (now - last) / 1000) * speed);
        last = now;
        bus.state = next;
        notify();
        if (next.card !== before.card || next === before) {
          stop();
          setState(next);
        } else frame.current = requestAnimationFrame(tick);
      };
      frame.current = requestAnimationFrame(tick);
    },
    skip: () => {
      stop();
      if (bus.state) commit(skipToNextStop(bus.state));
    },
    closeCard: () => bus.state && commit(closeVoyageCard(bus.state)),
    recenter: () => {
      bus.follow = true;
      notify();
    },
    reset: () => {
      stop();
      if (bus.state) commit(null);
    },
  };
}
