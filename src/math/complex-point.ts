export interface ComplexPoint {
  real: number;
  imaginary: number;
}

export function complexPoint(real = 0, imaginary = 0): ComplexPoint {
  return { real, imaginary };
}

export function square(point: ComplexPoint): ComplexPoint {
  return {
    real: point.real * point.real - point.imaginary * point.imaginary,
    imaginary: 2 * point.real * point.imaginary,
  };
}

export function toVector3(point: ComplexPoint): { x: number; y: number; z: number } {
  return { x: point.real, y: 0, z: point.imaginary };
}

export function fromVector3(point: { x: number; z: number }): ComplexPoint {
  return { real: point.x, imaginary: point.z };
}
