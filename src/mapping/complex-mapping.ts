import { Vector3 } from 'three';

/** Squares a point interpreted as z = x + i·z on the plane. */
export function square(point: Vector3): Vector3 {
  const real = point.x;
  const imaginary = point.z;
  return new Vector3(real * real - imaginary * imaginary, 0, 2 * real * imaginary);
}
