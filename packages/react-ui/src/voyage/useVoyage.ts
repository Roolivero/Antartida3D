import { useEffect, useRef, useState } from 'react';
import {
  VOYAGE_GEARS, advanceVoyage, closeVoyageCard, nextGear, skipToNextStop, startVoyage, type TransportId, type VoyageSourceCode, type VoyageState,
} from '@antartida/core';

/**
 * Trip state shared with the 3D scene without re-rendering React on every frame: the scene reads
 * `state` in its own frame loop and subscribes to know when to draw.
 */
export interface VoyageBus {
  state: VoyageState | null;
  /** Ids of the animals already spotted on this trip. */
  seen: readonly string[];
  /** The user touched an animal on the map. `beside` opens its card next to it instead of in the panel. */
  spot: (id: string, beside: boolean) => void;
  /** The animal whose card is open next to it on the map, or null. */
  beside: string | null;
  closeSighting: () => void;
  openSource: (code: VoyageSourceCode) => void;
  listeners: Set<() => void>;
}

/** Up to this width the trip panel spans the bottom of the screen (same breakpoint as the styles). */
export const NARROW_PX = 820;

/** Seconds the vehicle takes to pick up speed and to coast to a stop. */
const EASE_SECONDS = 0.3;

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
  /** Animals spotted on this trip, and the one whose card is open. */
  seen: readonly string[];
  sighting: string | null;
  /** The open card is next to the animal on the map, not in the panel. */
  popover: boolean;
  openSighting: (id: string, beside?: boolean) => void;
  closeSighting: () => void;
  reset: () => void;
}

export function useVoyage(): VoyageController {
  const [state, setState] = useState<VoyageState | null>(null);
  const bus = useRef<VoyageBus>({ state: null, seen: [], spot: () => {}, beside: null, closeSighting: () => {}, openSource: () => {}, listeners: new Set() }).current;
  const frame = useRef(0);
  const [gear, setGear] = useState(0);
  const press = useRef({ gear: 0, at: -Infinity });

  const [seen, setSeen] = useState<readonly string[]>([]);
  const [sighting, setSighting] = useState<{ id: string; beside: boolean } | null>(null);

  const notify = () => bus.listeners.forEach((fn) => fn());
  const commit = (next: VoyageState | null) => {
    bus.state = next;
    setState(next);
    notify();
  };
  const drive = useRef({ pressed: false, power: 0, speed: 1 });
  const stop = () => {
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    drive.current.pressed = false;
    drive.current.power = 0;
  };

  useEffect(() => stop, []);

  const showSighting = (next: { id: string; beside: boolean } | null) => {
    bus.beside = next?.beside ? next.id : null;
    setSighting(next);
    notify();
  };
  const openSighting = (id: string, beside = false) => {
    stop();
    setState(bus.state);
    if (!bus.seen.includes(id)) {
      bus.seen = [...bus.seen, id];
      setSeen(bus.seen);
    }
    showSighting({ id, beside });
  };
  bus.spot = openSighting;
  bus.closeSighting = () => showSighting(null);
  const clearSightings = () => {
    bus.seen = [];
    setSeen([]);
    bus.beside = null;
    setSighting(null);
  };

  return {
    state,
    bus,
    gear,
    seen,
    sighting: sighting?.id ?? null,
    popover: sighting?.beside ?? false,
    openSighting,
    closeSighting: bus.closeSighting,
    start: (transport) => {
      clearSightings();
      commit(startVoyage(transport));
    },
    hold: (on) => {
      const d = drive.current;
      if (!on) {
        d.pressed = false; // the loop below coasts to a stop
        return;
      }
      if (d.pressed || !bus.state) return;
      let last = performance.now();
      press.current = { gear: nextGear(press.current.gear, last - press.current.at), at: last };
      setGear(press.current.gear);
      d.pressed = true;
      d.speed = VOYAGE_GEARS[press.current.gear];
      if (frame.current) return; // still coasting from the previous press
      const tick = (now: number) => {
        const before = bus.state;
        if (!before) return stop();
        const dt = Math.min(0.1, (now - last) / 1000);
        last = now;
        // Ease in and out instead of starting and stopping dead.
        d.power += ((d.pressed ? 1 : 0) - d.power) * (1 - Math.exp(-dt / EASE_SECONDS));
        const next = advanceVoyage(before, dt * d.speed * d.power);
        bus.state = next;
        notify();
        if (next.card !== before.card || next === before || (!d.pressed && d.power < 0.03)) {
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
    reset: () => {
      stop();
      clearSightings();
      if (bus.state) commit(null);
    },
  };
}
