import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { Vector3, type Camera, type Group, type Object3D } from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { fuegiaWorldHeight, heightAt, inFuegia, loadFuegiaMesh, sightingNote, worldHeight, type SightingSpot } from '@antartida/core';
import { Fact } from './Fact.tsx';
import { SightingIcon } from './SightingIcon.tsx';
import { WING_ROOT, buildSightingGeometry, moveSighting } from './sightingModels.ts';
import type { VoyageBus } from './useVoyage.ts';
import { vehicleMaterial } from './vehicles.ts';

/** Size of the model as a fraction of its distance to the camera: it fills the ring of its button. */
const SIZE_PER_DISTANCE = 0.062;
const MIN_SIZE = 0.3;
/** A place grows while its card is open, to show its model. */
const OPEN_PLACE_SCALE = 2.4;
/** Height of the center of the button over the base of the model, in model units. */
const RING_HEIGHT = 0.4;

/** Room kept for the title and the trip panel when a far place is held at the edge of the screen, in px. */
const EDGE = { side: 44, top: 130, bottom: 210 };
const projected = new Vector3();

/**
 * Screen position of a place. One that is out of view, like a lighthouse far from the route, stays
 * at the edge of the screen in its direction, so it can still be found and opened.
 */
function placeOnScreen(el: Object3D, camera: Camera, size: { width: number; height: number }): number[] {
  projected.setFromMatrixPosition(el.matrixWorld).project(camera);
  const x = ((projected.x + 1) / 2) * size.width;
  const y = ((1 - projected.y) / 2) * size.height;
  return [
    Math.min(size.width - EDGE.side, Math.max(EDGE.side, x)),
    Math.min(size.height - EDGE.bottom, Math.max(EDGE.top, y)),
  ];
}

/**
 * An animal or a place on the map: its model, and over it a real button (reachable by keyboard)
 * drawn as a ring that pulses, to show it can be opened.
 */
export function Sighting3D({ spot, turn, seen, open, wide, bus, reduced, overlay }: {
  spot: SightingSpot;
  /** Which way the model faces, in radians: they should not all look the same way. */
  turn: number;
  seen: boolean;
  open: boolean;
  /** On a wide screen the card opens beside the button instead of in the panel. */
  wide: boolean;
  bus: VoyageBus;
  reduced: boolean;
  overlay: RefObject<HTMLElement | null>;
}) {
  const { sighting } = spot;
  const group = useRef<Group>(null);
  const model = useRef<Group>(null);
  const geometry = useMemo(() => buildSightingGeometry(sighting), [sighting]);
  useEffect(() => () => {
    geometry?.body.dispose();
    geometry?.wings?.forEach((g) => g.dispose());
  }, [geometry]);

  // A place around Tierra del Fuego stands on that relief, which is a separate mesh drawn at its own scale.
  const [fuegiaGround, setFuegiaGround] = useState(0);
  useEffect(() => {
    if (!sighting.place || !inFuegia(spot.x, spot.y)) return;
    let alive = true;
    void loadFuegiaMesh('lo').then((mesh) => alive && setFuegiaGround(Math.max(0, fuegiaWorldHeight(heightAt(spot.x, spot.y, mesh)))));
    return () => void (alive = false);
  }, [sighting, spot]);

  useFrame(({ camera }) => {
    const g = group.current;
    if (!g) return;
    // On the ground or on the water; the relief may load after the trip starts.
    g.position.set(spot.x - 500, Math.max(fuegiaGround, worldHeight(heightAt(spot.x, spot.y))), spot.y - 500);
    const size = Math.max(MIN_SIZE, camera.position.distanceTo(g.position) * SIZE_PER_DISTANCE);
    g.scale.setScalar(size);
    model.current?.scale.setScalar(open && sighting.place ? OPEN_PLACE_SCALE : 1);
    if (model.current) moveSighting(model.current, sighting, reduced ? 0 : performance.now() / 1000);
  });

  return (
    <group ref={group} rotation-y={turn}>
      {geometry && (
        <group ref={model}>
          <mesh geometry={geometry.body} material={vehicleMaterial} />
          {geometry.wings?.map((wing, i) => (
            <mesh key={i} geometry={wing} material={vehicleMaterial} position={[WING_ROOT[0], WING_ROOT[1], WING_ROOT[2] * (i ? -1 : 1)]} />
          ))}
        </group>
      )}
      <Html
        position={[0, RING_HEIGHT, 0]}
        center
        calculatePosition={sighting.place ? placeOnScreen : undefined}
        portal={overlay as RefObject<HTMLElement>}
        zIndexRange={open ? [6, 6] : [4, 4]}
      >
        <button
          type="button"
          className={'vspot' + (seen ? ' seen' : '')}
          onClick={() => (open ? bus.closeSighting() : bus.spot(sighting.id, wide))}
          aria-expanded={wide ? open : undefined}
          aria-label={seen
            ? `${sighting.name}, ya visto. Tocá para volver a ver su ficha.`
            : `Avistaje: ${sighting.name}. Tocá para ver su ficha.`}
        >
          <SightingIcon icon={sighting.icon} />
        </button>
        {open && (
          <section
            className={'vpop' + (sighting.place ? ' under' : '')}
            role="dialog"
            aria-label={sighting.name}
            onKeyDown={(e) => e.key === 'Escape' && bus.closeSighting()}
          >
            <button type="button" className="vpopclose" onClick={bus.closeSighting} aria-label="Cerrar ficha">×</button>
            <h3>{sighting.name}</h3>
            <p className="vlatin">{sighting.latin}</p>
            <ul className="vfacts"><Fact fact={sighting.fact} onSource={bus.openSource} /></ul>
            <p className="vsmall">{sightingNote(sighting)}</p>
          </section>
        )}
      </Html>
    </group>
  );
}
