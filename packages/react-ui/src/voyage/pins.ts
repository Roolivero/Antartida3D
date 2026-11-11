import { CircleGeometry, MeshBasicMaterial, Path, Shape, ShapeGeometry } from 'three';

const HEAD_Y = 0.68;
const HEAD_R = 0.32;
/** Angle where the straight sides of the pin meet its round head. */
const SIDE = Math.asin(HEAD_R / HEAD_Y);

/**
 * Map pin that marks a milestone: one unit tall, a round head with a hole over a point that
 * touches the place. Flat, drawn facing the camera.
 */
export function buildPinGeometry(): ShapeGeometry {
  const pin = new Shape();
  pin.moveTo(0, 0);
  // The arc does not join itself to the starting point: draw the side up to it.
  pin.lineTo(HEAD_R * Math.cos(SIDE), HEAD_Y - HEAD_R * Math.sin(SIDE));
  pin.absarc(0, HEAD_Y, HEAD_R, -SIDE, Math.PI + SIDE, false);
  pin.closePath();
  pin.holes.push(new Path().absarc(0, HEAD_Y, HEAD_R * 0.42, 0, Math.PI * 2, true));
  return new ShapeGeometry(pin, 24);
}

/** The light disc seen through the hole of the pin. */
export const buildPinDotGeometry = () => new CircleGeometry(HEAD_R * 0.45, 24).translate(0, HEAD_Y, 0);

// Always drawn over the relief: a milestone must be seen coming.
const flat = (color: number) => new MeshBasicMaterial({ color, depthTest: false, depthWrite: false, transparent: true });
/** --oxide while the milestone is ahead, grey once it was reached, --paper for the hole. */
export const pinMaterial = { ahead: flat(0xa4471f), reached: flat(0x9aa3a8), dot: flat(0xf3ebdd) };
