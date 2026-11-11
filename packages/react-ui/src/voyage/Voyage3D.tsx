import { useEffect, useMemo, useRef, useState } from 'react';
import { BufferGeometry, Group, Line, LineDashedMaterial, MeshBasicMaterial, Vector3 } from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import type { CameraControls } from '@react-three/drei';
import {
  TRANSPORTS,
  VOYAGE_POINT,
  flightClearance,
  toWorld,
  voyageAt,
  voyageHeading,
  type TransportId,
} from '@antartida/core';
import { buildVehicleGeometry } from './vehicles.ts';
import type { VoyageBus } from './useVoyage.ts';

/** Vehicle length as a fraction of the camera distance: a 120 m ship is invisible on a 4000 km map. */
const SIZE_PER_DISTANCE = 0.075;
const MIN_SIZE = 0.5;
const ROUTE_SAMPLES = 240;
/** Camera offset from the vehicle at departure: close and low, to see the Beagle Channel. */
const DEPARTURE_OFFSET = new Vector3(3, 9, 12);

const material = new MeshBasicMaterial({ vertexColors: true });
const routeMaterial = new LineDashedMaterial({ color: 0x1f2a36, dashSize: 0.8, gapSize: 0.6, transparent: true, opacity: 0.75 });

/** The vehicle travelling on the live map, its path and the camera that follows it. */
export function Voyage3D({ bus, reduced }: { bus: VoyageBus; reduced: boolean }) {
  const invalidate = useThree((s) => s.invalidate);
  const controls = useThree((s) => s.controls) as unknown as CameraControls | null;
  const group = useRef<Group>(null);
  const [transport, setTransport] = useState<TransportId | null>(bus.state?.transport ?? null);
  const drawn = useRef({ t: -1, transport: null as TransportId | null });

  useEffect(() => {
    const onChange = () => {
      setTransport(bus.state?.transport ?? null);
      invalidate();
    };
    bus.listeners.add(onChange);
    return () => void bus.listeners.delete(onChange);
  }, [bus, invalidate]);

  // Dragging the map lets go of the vehicle; the panel's "Centrar" button takes it back.
  useEffect(() => {
    if (!controls) return;
    const release = () => {
      bus.follow = false;
    };
    controls.addEventListener('controlstart', release);
    return () => controls.removeEventListener('controlstart', release);
  }, [bus, controls]);

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

  const takeoff = useMemo(() => toWorld(VOYAGE_POINT.x, VOYAGE_POINT.y), []);

  useFrame(({ camera }) => {
    const s = bus.state;
    const g = group.current;
    if (!s || !g) return;
    const p = voyageAt(s.kind, s.t);
    const size = Math.max(MIN_SIZE, camera.position.distanceTo(g.position) * SIZE_PER_DISTANCE);
    // Flight: over the relief under the path, and higher the farther the camera is, to stay readable.
    const height = s.kind === 'plane'
      ? Math.max(flightClearance(s.t), Math.sin(Math.PI * s.t) ** 0.6 * size * 0.9) + size * 0.07
      : -size * 0.02;
    g.position.set(p.x - 500, height, p.y - 500);
    g.rotation.y = -voyageHeading(s.kind, s.t);
    g.scale.setScalar(size);

    const moved = drawn.current.t !== s.t || drawn.current.transport !== s.transport;
    if (controls && moved && bus.follow) {
      if (s.t === 0) {
        void controls.setLookAt(takeoff.x + DEPARTURE_OFFSET.x, DEPARTURE_OFFSET.y, takeoff.z + DEPARTURE_OFFSET.z, takeoff.x, 0, takeoff.z, !reduced);
      } else void controls.moveTo(g.position.x, Math.max(0, height), g.position.z, !reduced);
    }
    drawn.current = { t: s.t, transport: s.transport };
  });

  if (!geometry || !route) return null;
  return (
    <>
      <primitive object={route} />
      <group ref={group}>
        <mesh geometry={geometry} material={material} />
      </group>
    </>
  );
}
