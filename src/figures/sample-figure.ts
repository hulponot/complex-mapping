import type { ComplexPoint } from '../math/complex-point';
import type { Figure, SampledFigure } from './figure';

export function sampleFigure(figure: Figure, sampleCount = 128): SampledFigure {
  if (sampleCount < 2) throw new Error('sampleCount must be at least 2');

  const controlPoints = figure.getControlPoints();
  const points = Array.from({ length: sampleCount }, (_, index) => {
    const t = figure.closed ? index / sampleCount : index / (sampleCount - 1);
    return figure.pointAt(t);
  });

  return {
    id: figure.id,
    points,
    controlPoints: controlPoints.map(({ position }) => ({ ...position })),
    controlPointIds: controlPoints.map(({ id }) => id),
    closed: figure.closed,
  };
}

export function clonePoint(point: ComplexPoint): ComplexPoint {
  return { real: point.real, imaginary: point.imaginary };
}
