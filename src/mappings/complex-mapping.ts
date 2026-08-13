import type { ComplexPoint } from '../math/complex-point';
import type { SampledFigure } from '../figures/figure';

export type ComplexMapping = (point: ComplexPoint) => ComplexPoint;

/** Squares z = real + i·imaginary. */
export function square(point: ComplexPoint): ComplexPoint {
  return {
    real: point.real * point.real - point.imaginary * point.imaginary,
    imaginary: 2 * point.real * point.imaginary,
  };
}

export function mapSampledFigure(
  figure: SampledFigure,
  mapping: ComplexMapping,
): SampledFigure {
  return {
    id: figure.id,
    points: figure.points.map(mapping),
    controlPoints: figure.controlPoints.map(mapping),
    ...(figure.controlPointIds ? { controlPointIds: [...figure.controlPointIds] } : {}),
    closed: figure.closed,
    ...(figure.paths ? { paths: figure.paths.map((path) => path.map(mapping)) } : {}),
  };
}
