import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { BoxGeometry, BufferGeometry, Group, Line, LineDashedMaterial, Mesh, MeshBasicMaterial, Vector3 } from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import type { CameraControls } from '@react-three/drei';
import {
  DRAKE_STORM,
  TRANSPORTS,
  flightClearance,
  heightAt,
  sightingsInView,
  stormAt,
  voyageAt,
  voyageHeading,
  voyageLength,
  voyageSightings,
  voyageStops,
  worldHeight,
  type TransportId,
  type TransportKind,
} from '@antartida/core';
import { buildPinGeometry, pinMaterial } from './pins.ts';
import { buildVehicleGeometry, vehicleMaterial } from './vehicles.ts';
import { Sighting3D } from './Sighting3D.tsx';
import { buildTrailGeometry, trailMaterial, updateTrail } from './trail.ts';
import { NARROW_PX, type VoyageBus } from './useVoyage.ts';

/** Vehicle length as a fraction of the camera distance: a 120 m ship is invisible on a 4000 km map. */
const SIZE_PER_DISTANCE = 0.075;
const MIN_SIZE = 0.5;
/** Height of a milestone pin as a fraction of its distance to the camera. */
const PIN_PER_DISTANCE = 0.042;
const MIN_PIN = 0.2;
const ROUTE_SAMPLES = 240;
/** Fraction of the screen height the picture moves up on a phone. */
const PANEL_SHIFT = 0.14;
/** Camera offset from the vehicle at departure: close and low, to see the Beagle Channel. */
const DEPARTURE_OFFSET = new Vector3(3, 9, 12);

/** In the storm the camera comes down to this world height: under the clouds, so they do not cover the vehicle. */
const STORM_CAMERA_HEIGHT = DRAKE_STORM.cloudBase - 2;

/**
 * Spray thrown up when the bow digs into a wave: [x, z] in ship lengths, in the order it rises.
 * The first ones burst at the bow; the rest run back along both sides, as the wave washes the hull.
 */
const SPRAY: readonly (readonly [number, number])[] = [
  [0.5, 0.05], [0.47, -0.07], [0.54, -0.01], [0.44, 0.09], [0.5, -0.11], [0.57, 0.04],
  [0.36, 0.13], [0.36, -0.13], [0.26, 0.15], [0.26, -0.15], [0.14, 0.16], [0.14, -0.16],
];
const sprayGeometry = new BoxGeometry(1, 1, 1);
const sprayMaterial = new MeshBasicMaterial({ color: 0xf7fafb, transparent: true, opacity: 0.9 });

/** The flight profile, sampled once: it costs a few hundred relief lookups per point. */
const CLEARANCE_SAMPLES = 512;
let clearanceTable: Float32Array | null = null;

function clearanceAt(t: number): number {
  if (!clearanceTable) {
    const end = voyageAt('plane', 1);
    if (heightAt(end.x, end.y) <= 0) return flightClearance(t); // the relief is still loading
    clearanceTable = Float32Array.from({ length: CLEARANCE_SAMPLES + 1 }, (_, i) => flightClearance(i / CLEARANCE_SAMPLES));
  }
  const at = Math.min(1, Math.max(0, t)) * CLEARANCE_SAMPLES;
  const i = Math.min(CLEARANCE_SAMPLES - 1, Math.floor(at));
  return clearanceTable[i] + (clearanceTable[i + 1] - clearanceTable[i]) * (at - i);
}

/**
 * World height of the vehicle at `t`. A plane flies over the relief under its path, and higher the
 * farther the camera is, to stay readable; a ship sits slightly into the water.
 */
export function heightOf(kind: TransportKind, t: number, size: number): number {
  if (kind === 'ship') return -size * 0.02;
  return Math.max(clearanceAt(t), Math.sin(Math.PI * Math.min(1, Math.max(0, t))) ** 0.6 * size * 0.9) + size * 0.07;
}

/** Trip fraction used to measure the slope of the flight for the plane's pitch. */
const PITCH_SPAN = 0.004;
const MAX_PITCH = 0.4;

/** A place farther than this from the vehicle, in map units, is out of view: the camera goes to it while its card is open. */
const VISIT_DISTANCE = 6;

/** How far (world units) the vehicle has to move for the camera to follow it. */
const FOLLOW_EPSILON = 1e-4;
const followGoal = new Vector3();
const followTarget = new Vector3();

const routeMaterial = new LineDashedMaterial({ color: 0x1f2a36, dashSize: 0.8, gapSize: 0.6, transparent: true, opacity: 0.75 });

/** The vehicle travelling on the live map, its path and the camera, which stays centered on it. */
export function Voyage3D({ bus, reduced, overlay }: {
  bus: VoyageBus;
  reduced: boolean;
  /** Element over the canvas where the animals go: they are real buttons, reachable by keyboard. */
  overlay: RefObject<HTMLElement | null>;
}) {
  const invalidate = useThree((s) => s.invalidate);
  const camera = useThree((s) => s.camera);
  const viewport = useThree((s) => s.size);
  const controls = useThree((s) => s.controls) as unknown as CameraControls | null;
  const group = useRef<Group>(null);
  const trailMesh = useRef<Mesh>(null);
  const [transport, setTransport] = useState<TransportId | null>(bus.state?.transport ?? null);
  const drawn = useRef({ t: -1, transport: null as TransportId | null });
  // Far place the camera is at, and whether it is on its way back to the vehicle.
  const visit = useRef({ id: null as string | null, returning: false });
  const spray = useRef<(Mesh | null)[]>([]);
  // Whether the vehicle is in the storm, and the camera distance to go back to when it leaves.
  const storm = useRef({ inside: false, distance: null as number | null });
  // Ids of the animals in view and of the ones already spotted, joined: React re-renders only when they change.
  const [inView, setInView] = useState('||');

  useEffect(() => {
    const onChange = () => {
      setTransport(bus.state?.transport ?? null);
      const s = bus.state;
      // They stay on the map while a milestone card is open.
      const visible = s ? sightingsInView(s.kind, s.t).map((v) => v.sighting.id) : [];
      // A card open beside an animal goes away with it.
      if (bus.beside && !visible.includes(bus.beside)) return bus.closeSighting();
      setInView(`${visible.join(',')}|${bus.seen.join(',')}|${bus.beside ?? ''}`);
      invalidate();
    };
    bus.listeners.add(onChange);
    return () => void bus.listeners.delete(onChange);
  }, [bus, invalidate]);

  // On a phone the trip panel covers the lower part of the map: shift the picture up so the vehicle,
  // which the camera keeps at its center, stays in view above the panel.
  useEffect(() => {
    if (!('setViewOffset' in camera) || viewport.width > NARROW_PX) return;
    const { width, height } = viewport;
    camera.setViewOffset(width, height, 0, height * PANEL_SHIFT, width, height);
    invalidate();
    return () => {
      camera.clearViewOffset();
      invalidate();
    };
  }, [camera, viewport, invalidate]);

  const kind = transport ? TRANSPORTS.find((v) => v.id === transport)!.kind : null;
  const geometry = useMemo(() => (transport ? buildVehicleGeometry(transport) : null), [transport]);
  useEffect(() => () => geometry?.dispose(), [geometry]);

  const route = useMemo(() => {
    if (!kind) return null;
    const points = Array.from({ length: ROUTE_SAMPLES + 1 }, (_, i) => {
      const p = voyageAt(kind, i / ROUTE_SAMPLES);
      return new Vector3(p.x - 500, 0.12, p.y - 500);
    });
    const line = new Line(new BufferGeometry().setFromPoints(points), routeMaterial);
    line.computeLineDistances();
    return line;
  }, [kind]);
  useEffect(() => () => route?.geometry.dispose(), [route]);

  const trail = useMemo(() => (kind ? buildTrailGeometry(kind) : null), [kind]);
  useEffect(() => () => trail?.dispose(), [trail]);

  // One pin per milestone ahead of the departure, so the user sees them coming.
  const pins = useMemo(() => (kind ? voyageStops(kind).slice(1).map((stop) => stop.pin) : []), [kind]);
  const pinGroups = useRef<(Group | null)[]>([]);
  const pinGeometry = useMemo(buildPinGeometry, []);
  useEffect(() => () => Object.values(pinGeometry).forEach((g) => g.dispose()), [pinGeometry]);

  useFrame(({ camera }) => {
    const s = bus.state;
    const g = group.current;
    if (!s) storm.current = { inside: false, distance: null };
    if (!s || !g) return;
    const p = voyageAt(s.kind, s.t);
    const size = Math.max(MIN_SIZE, camera.position.distanceTo(g.position) * SIZE_PER_DISTANCE);
    const height = heightOf(s.kind, s.t, size);
    const heading = voyageHeading(s.kind, s.t) + (bus.back ? Math.PI : 0);
    const length = voyageLength(s.kind);

    // Nose up while climbing, down while descending; a ship stays level.
    let pitch = 0;
    if (s.kind === 'plane') {
      const rise = heightOf('plane', s.t + PITCH_SPAN, size) - heightOf('plane', s.t - PITCH_SPAN, size);
      pitch = Math.min(MAX_PITCH, Math.max(-MAX_PITCH, Math.atan2(rise, 2 * PITCH_SPAN * length))) * (bus.back ? -1 : 1);
    }
    // A gentle sway, so the vehicle is alive even when the trip is paused.
    const time = reduced ? 0 : performance.now() / 1000;
    const sway = s.kind === 'plane'
      ? { roll: Math.sin(time * 0.9) * 0.05, pitch: Math.sin(time * 0.7) * 0.015, lift: Math.sin(time * 1.4) * 0.035 }
      : { roll: Math.sin(time * 1.1) * 0.04, pitch: Math.sin(time * 0.8) * 0.025, lift: Math.sin(time * 1.3) * 0.012 };
    // In the storm the waves throw the ship about; the deeper in, the more.
    const rough = stormAt(p.x, p.y);
    // Bow up and down over each wave; the hull rises with it and rolls out of step.
    const wave = time * 2.1;
    // The plane flies over the storm, in calm air.
    if (s.kind === 'ship') {
      sway.pitch += rough * Math.sin(wave) * 0.24;
      sway.roll += rough * Math.sin(wave * 0.63 + 1) * 0.22;
      sway.lift += rough * Math.sin(wave - 0.9) * 0.1;
    }
    // Spray bursts when the bow comes down into the water.
    const burst = s.kind === 'ship' ? rough * Math.max(0, -Math.sin(wave + 0.5)) ** 2 : 0;
    spray.current.forEach((drop, i) => {
      if (!drop) return;
      const [x, z] = SPRAY[i];
      // Each one a little higher and wider than the one before; big enough to read from the trip camera.
      const reach = i % 6;
      // Started above the deck: the bow is under the water when the spray bursts.
      drop.position.set(x + burst * 0.04 * reach, 0.17 + burst * (0.12 + 0.05 * reach), z * (1 + 0.8 * burst));
      drop.scale.setScalar(burst * (0.11 - 0.011 * reach));
    });

    g.position.set(p.x - 500, height + sway.lift * size, p.y - 500);
    g.rotation.set(sway.roll, -heading, pitch + sway.pitch, 'YZX');
    g.scale.setScalar(size);

    pins.forEach((at, i) => {
      const pin = pinGroups.current[i];
      if (!pin) return;
      // The point touches the ground (Marambio) or the water; the relief may load after the trip starts.
      pin.position.set(at.x - 500, Math.max(0, worldHeight(heightAt(at.x, at.y))), at.y - 500);
      pin.scale.setScalar(Math.max(MIN_PIN, camera.position.distanceTo(pin.position) * PIN_PER_DISTANCE));
      pin.quaternion.copy(camera.quaternion); // always facing the camera
      (pin.children[0] as Mesh).material = i + 1 < s.reached ? pinMaterial.reached : pinMaterial.ahead;
    });

    if (trailMesh.current) trailMesh.current.visible = !bus.back;
    if (trail && !bus.back) {
      updateTrail(trail, s.kind, size, (lengthsBehind) => {
        const t = Math.max(0, s.t - (lengthsBehind * size) / length);
        const q = voyageAt(s.kind, t);
        return { x: q.x - 500, y: s.kind === 'ship' ? 0.05 : heightOf('plane', t, size), z: q.y - 500, heading: voyageHeading(s.kind, t) };
      });
    }

    // The camera always stays on the vehicle: the user can orbit and zoom around it, not pan away.
    if (controls) {
      // The controls apply a move on the next frame, and the canvas draws on demand: a move asks for
      // that frame, or a move without animation (reduced motion) is not drawn until something else redraws (#76).
      let moved = false;
      // Entering the storm, the camera comes down under the clouds; leaving it, it goes back up.
      // Only for a ship: the plane is above the clouds, and the camera stays up there with it.
      const inside = s.kind === 'ship' && rough > 0;
      if (inside !== storm.current.inside) {
        if (inside && camera.position.y > STORM_CAMERA_HEIGHT) {
          storm.current.distance = controls.distance;
          void controls.dollyTo((controls.distance * STORM_CAMERA_HEIGHT) / camera.position.y, !reduced);
        } else if (!inside && storm.current.distance !== null) {
          void controls.dollyTo(storm.current.distance, !reduced);
          storm.current.distance = null;
        }
        storm.current.inside = inside;
        moved = true;
      }
      const departing = s.t === 0 && (drawn.current.t !== 0 || drawn.current.transport !== s.transport);
      if (departing) {
        moved = true;
        // At the vehicle, so the camera does not jump to it when the trip starts moving.
        void controls.setLookAt(p.x - 500 + DEPARTURE_OFFSET.x, DEPARTURE_OFFSET.y, p.y - 500 + DEPARTURE_OFFSET.z, p.x - 500, 0, p.y - 500, !reduced);
      } else {
        const open = bus.open ? voyageSightings(s.kind).find((v) => v.sighting.id === bus.open) : undefined;
        // A milestone about a place off the path (Cabo de Hornos): its card shows the place, where its pin stands.
        const stop = s.card >= 0 ? voyageStops(s.kind)[s.card] : undefined;
        const far = open?.sighting.place && Math.hypot(open.x - p.x, open.y - p.y) > VISIT_DISTANCE
          ? { id: open.sighting.id, x: open.x, y: open.y }
          : stop?.milestone.place ? { id: stop.milestone.id, ...stop.pin } : null;
        if (far) {
          // Opening a far place takes the camera there, to see it; the trip waits.
          if (visit.current.id !== far.id) {
            visit.current = { id: far.id, returning: false };
            moved = true;
            void controls.moveTo(far.x - 500, 0, far.y - 500, !reduced);
          }
        } else if (visit.current.id) {
          // Closing it brings the camera back to the vehicle.
          const state = { id: null, returning: true };
          visit.current = state;
          moved = true;
          void controls.moveTo(g.position.x, Math.max(0, height), g.position.z, !reduced).then(() => void (state.returning = false));
        } else if (s.t > 0 && !visit.current.returning) {
          // With reduced motion nothing else moves: follow only when the vehicle moved, or each move would
          // ask for a frame and the canvas would never rest. Otherwise the sway keeps it drawing, as before.
          const goal = followGoal.set(g.position.x, Math.max(0, height), g.position.z);
          if (!reduced || controls.getTarget(followTarget).distanceToSquared(goal) > FOLLOW_EPSILON ** 2) {
            moved = true;
            void controls.moveTo(goal.x, goal.y, goal.z, false);
          }
        }
      }
      if (moved) invalidate();
    }
    drawn.current = { t: s.t, transport: s.transport };
  });

  if (!geometry || !route || !kind) return null;
  const [ids, seen, [open]] = inView.split('|').map((list) => list.split(','));
  const wide = viewport.width > NARROW_PX;
  return (
    <>
      {voyageSightings(kind).map((v, i) => ids.includes(v.sighting.id) && (
        <Sighting3D
          key={v.sighting.id}
          spot={v}
          turn={i * 1.3}
          seen={seen.includes(v.sighting.id)}
          open={v.sighting.id === open}
          wide={wide}
          bus={bus}
          reduced={reduced}
          overlay={overlay}
        />
      ))}
      <primitive object={route} />
      {pins.map((_, i) => (
        <group key={i} ref={(g) => void (pinGroups.current[i] = g)}>
          <mesh geometry={pinGeometry.fill} material={pinMaterial.ahead} renderOrder={1001} />
          <mesh geometry={pinGeometry.line} material={pinMaterial.line} renderOrder={1000} />
          <mesh geometry={pinGeometry.dot} material={pinMaterial.dot} renderOrder={1002} />
        </group>
      ))}
      {trail && <mesh ref={trailMesh} geometry={trail} material={trailMaterial} frustumCulled={false} />}
      <group ref={group}>
        <mesh geometry={geometry} material={vehicleMaterial} />
        {kind === 'ship' && SPRAY.map((_, i) => (
          <mesh key={i} ref={(m) => void (spray.current[i] = m)} geometry={sprayGeometry} material={sprayMaterial} scale={0} />
        ))}
      </group>
    </>
  );
}
