import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { BufferGeometry, Group, Line, LineDashedMaterial, Mesh, Vector3 } from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import type { CameraControls } from '@react-three/drei';
import {
  TRANSPORTS,
  VOYAGE_POINT,
  flightClearance,
  heightAt,
  sightingsInView,
  toWorld,
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
import { Town3D } from './Town3D.tsx';
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
  const pins = useMemo(() => (kind ? voyageStops(kind).slice(1).map((stop) => voyageAt(kind, stop.t)) : []), [kind]);
  const pinGroups = useRef<(Group | null)[]>([]);
  const pinGeometry = useMemo(buildPinGeometry, []);
  useEffect(() => () => Object.values(pinGeometry).forEach((g) => g.dispose()), [pinGeometry]);

  const takeoff = useMemo(() => toWorld(VOYAGE_POINT.x, VOYAGE_POINT.y), []);

  useFrame(({ camera }) => {
    const s = bus.state;
    const g = group.current;
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
      const departing = s.t === 0 && (drawn.current.t !== 0 || drawn.current.transport !== s.transport);
      if (departing) {
        void controls.setLookAt(takeoff.x + DEPARTURE_OFFSET.x, DEPARTURE_OFFSET.y, takeoff.z + DEPARTURE_OFFSET.z, takeoff.x, 0, takeoff.z, !reduced);
      } else {
        const open = bus.open ? voyageSightings(s.kind).find((v) => v.sighting.id === bus.open) : undefined;
        const far = open?.sighting.place && Math.hypot(open.x - p.x, open.y - p.y) > VISIT_DISTANCE ? open : null;
        if (far) {
          // Opening a far place takes the camera there, to see it; the trip waits.
          if (visit.current.id !== far.sighting.id) {
            visit.current = { id: far.sighting.id, returning: false };
            void controls.moveTo(far.x - 500, 0, far.y - 500, !reduced);
          }
        } else if (visit.current.id) {
          // Closing it brings the camera back to the vehicle.
          const state = { id: null, returning: true };
          visit.current = state;
          void controls.moveTo(g.position.x, Math.max(0, height), g.position.z, !reduced).then(() => void (state.returning = false));
        } else if (s.t > 0 && !visit.current.returning) void controls.moveTo(g.position.x, Math.max(0, height), g.position.z, false);
      }
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
      <Town3D reduced={reduced} wide={wide} overlay={overlay} />
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
      </group>
    </>
  );
}
