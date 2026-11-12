import { useEffect, useRef, useState } from 'react';
import {
  VOYAGE_GEARS, advanceVoyage, retreatVoyage, closeVoyageCard, nextGear, skipToNextStop, startVoyage, voyageArrived, type TransportId, type VoyageSourceCode, type VoyageState,
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
  /** The animal or place whose card is open, wherever it is shown, or null. */
  open: string | null;
  /** The vehicle is going back, or stopped after going back: it is drawn turned round. */
  back: boolean;
  closeSighting: () => void;
  openSource: (code: VoyageSourceCode) => void;
  listeners: Set<() => void>;
}

/** Up to this width the trip panel spans the bottom of the screen (same breakpoint as the styles). */
export const NARROW_PX = 820;

/** Speed of the trip to the next milestone when the user asks for it instead of holding "advance". */
const SKIP_SPEED = 6;

/** Seconds the vehicle takes to pick up speed and to coast to a stop. */
const EASE_SECONDS = 0.3;

export interface VoyageController {
  /** Updated at milestones and when the user lets go, not on every frame. */
  state: VoyageState | null;
  bus: VoyageBus;
  start: (transport: TransportId) => void;
  /** Index into VOYAGE_GEARS: quick repeated presses of "advance" go faster. */
  gear: number;
  /** Move while true, forward or back along the trip: the user sets the pace. */
  hold: (on: boolean, back?: boolean) => void;
  /** Go to the next milestone: travelling there fast when `animate`, or at once (reduced motion, 2D map). */
  skip: (animate?: boolean) => void;
  closeCard: () => void;
  /** Animals spotted on this trip, and the one whose card is open. */
  seen: readonly string[];
  sighting: string | null;
  /** The open card is next to the animal on the map, not in the panel. */
  popover: boolean;
  openSighting: (id: string, beside?: boolean) => void;
  /** Option chosen for the question of each milestone, by milestone id. */
  answers: Readonly<Record<string, number>>;
  answer: (milestoneId: string, option: number) => void;
  closeSighting: () => void;
  reset: () => void;
}

export function useVoyage(): VoyageController {
  const [state, setState] = useState<VoyageState | null>(null);
  const bus = useRef<VoyageBus>({ state: null, seen: [], spot: () => {}, beside: null, open: null, back: false, closeSighting: () => {}, openSource: () => {}, listeners: new Set() }).current;
  const frame = useRef(0);
  const [gear, setGear] = useState(0);
  const press = useRef({ gear: 0, at: -Infinity });

  const [seen, setSeen] = useState<readonly string[]>([]);
  const [sighting, setSighting] = useState<{ id: string; beside: boolean } | null>(null);
  const [answers, setAnswers] = useState<Readonly<Record<string, number>>>({});

  const notify = () => bus.listeners.forEach((fn) => fn());
  const commit = (next: VoyageState | null) => {
    bus.state = next;
    setState(next);
    notify();
  };
  // `auto`: travelling by itself to the next milestone.
  const drive = useRef({ pressed: false, auto: false, power: 0, speed: 1, back: false });
  const stop = () => {
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    drive.current.pressed = false;
    drive.current.auto = false;
    drive.current.power = 0;
  };

  useEffect(() => stop, []);

  /** Moves the trip frame by frame while a button is held or the trip goes by itself, then coasts to a stop. */
  const run = () => {
    if (frame.current) return; // already moving, or still coasting from the previous press
    const d = drive.current;
    let last = performance.now();
    const tick = (now: number) => {
      const before = bus.state;
      if (!before) return stop();
      // A frame can carry a timestamp older than the press that started the loop.
      const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
      last = now;
      const moving = d.pressed || d.auto;
      // Ease in and out instead of starting and stopping dead.
      d.power += ((moving ? 1 : 0) - d.power) * (1 - Math.exp(-dt / EASE_SECONDS));
      const next = (d.back ? retreatVoyage : advanceVoyage)(before, dt * d.speed * d.power);
      bus.state = next;
      notify();
      const atEnd = d.back ? next.t <= 0 : voyageArrived(next);
      if (next.card !== before.card || atEnd || (!moving && d.power < 0.03)) {
        stop();
        setState(next);
      } else frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  };

  const showSighting = (next: { id: string; beside: boolean } | null) => {
    bus.beside = next?.beside ? next.id : null;
    bus.open = next?.id ?? null;
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
    bus.open = null;
    setSighting(null);
    setAnswers({});
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
    answers,
    // The first answer stands: the notes that follow give it away.
    answer: (id, option) => setAnswers((a) => (id in a ? a : { ...a, [id]: option })),
    start: (transport) => {
      bus.back = false;
      clearSightings();
      commit(startVoyage(transport));
    },
    hold: (on, back = false) => {
      const d = drive.current;
      if (!on) {
        // Only the button being held lets go: pressing one takes the focus from the other.
        if (d.back === back) d.pressed = false; // the loop coasts to a stop
        return;
      }
      if (d.pressed || !bus.state) return;
      const now = performance.now();
      press.current = { gear: nextGear(press.current.gear, now - press.current.at), at: now };
      setGear(press.current.gear);
      d.pressed = true;
      d.auto = false; // the user takes over
      if (d.back !== back) d.power = 0; // turning round: no coasting the other way
      d.back = back;
      bus.back = back;
      d.speed = VOYAGE_GEARS[press.current.gear];
      run();
    },
    skip: (animate = false) => {
      if (!bus.state) return;
      if (!animate) {
        stop();
        commit(skipToNextStop(bus.state));
        return;
      }
      const d = drive.current;
      d.auto = true;
      d.pressed = false;
      if (d.back) d.power = 0;
      d.back = false;
      bus.back = false;
      d.speed = SKIP_SPEED;
      run();
    },
    closeCard: () => bus.state && commit(closeVoyageCard(bus.state)),
    reset: () => {
      stop();
      clearSightings();
      if (bus.state) commit(null);
    },
  };
}
