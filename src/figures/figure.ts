import type { ComplexPoint } from '../math/complex-point';

export interface SampledFigure {
  readonly id: string;
  points: ComplexPoint[];
  controlPoints: ComplexPoint[];
  closed: boolean;
}

let nextFigureId = 1;

export function createFigureId(): string {
  return `figure-${nextFigureId++}`;
}

export interface Figure {
  readonly id: string;
  readonly closed: boolean;
  pointAt(t: number): ComplexPoint;
  getControlPoints(): ComplexPoint[];
}
