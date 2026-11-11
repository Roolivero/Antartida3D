import { CircleGeometry, MeshBasicMaterial, Shape, ShapeGeometry } from 'three';

const HEAD_Y = 0.68;
const HEAD_R = 0.32;
/** Width of the ink line around the pin, like the line around the markers of the map. */
const LINE = 0.055;

/** Outline of a pin: a round head over a point at `tipY`. */
function pinShape(radius: number, tipY: number): ShapeGeometry {
  // Angle where the straight sides meet the round head.
  const side = Math.asin(radius / (HEAD_Y - tipY));
  const pin = new Shape();
  pin.moveTo(0, tipY);
  // The arc does not join itself to the starting point: draw the side up to it.
  pin.lineTo(radius * Math.cos(side), HEAD_Y - radius * Math.sin(side));
  pin.absarc(0, HEAD_Y, radius, -side, Math.PI + side, false);
  pin.closePath();
  return new ShapeGeometry(pin, 24);
}

/**
 * Map pin that marks a milestone: one unit tall, its point touches the place. Flat, drawn facing
 * the camera, in three layers: ink line, fill and a light dot.
 */
export const buildPinGeometry = () => ({
  line: pinShape(HEAD_R + LINE, -LINE * 2),
  fill: pinShape(HEAD_R, 0),
  dot: new CircleGeometry(HEAD_R * 0.4, 24).translate(0, HEAD_Y, 0),
});

// Always drawn over the relief: a milestone must be seen coming.
const flat = (color: number) => new MeshBasicMaterial({ color, depthTest: false, depthWrite: false, transparent: true });
/** Colors of the map markers: --ocre while the milestone is ahead, --pencil once reached, --ink line, --paper dot. */
export const pinMaterial = { ahead: flat(0xc0862f), reached: flat(0x5e656c), line: flat(0x1f2a36), dot: flat(0xf3ebdd) };
