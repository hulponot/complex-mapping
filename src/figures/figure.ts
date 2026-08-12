import type { ComplexPoint } from '../math/complex-point';

export interface SampledFigure {
  readonly id: string;
  points: ComplexPoint[];
  controlPoints: ComplexPoint[];
  /** Stable IDs corresponding by index to controlPoints. */
  controlPointIds?: string[];
  closed: boolean;
}

let nextFigureId = 1;

export function createFigureId(): string {
  return `figure-${nextFigureId++}`;
}

export interface FigureControlPoint {
  readonly id: string;
  readonly position: ComplexPoint;
  readonly role?: string;
}

export interface Figure {
  readonly id: string;
  readonly closed: boolean;
  pointAt(t: number): ComplexPoint;
  getControlPoints(): readonly FigureControlPoint[];
  moveControlPoint(id: string, position: ComplexPoint): void;
}
