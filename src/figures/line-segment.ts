import type { Figure } from './figure';
import { createFigureId } from './figure';
import type { ComplexPoint } from '../math/complex-point';

export class LineSegment implements Figure {
  readonly id: string;
  readonly closed = false;

  constructor(
    private readonly start: ComplexPoint = { real: -4, imaginary: 0 },
    private readonly end: ComplexPoint = { real: 4, imaginary: 0 },
    id = createFigureId(),
  ) { this.id = id; }

  pointAt(t: number): ComplexPoint {
    const progress = Math.min(1, Math.max(0, t));
    return {
      real: this.start.real + (this.end.real - this.start.real) * progress,
      imaginary: this.start.imaginary + (this.end.imaginary - this.start.imaginary) * progress,
    };
  }

  getControlPoints(): ComplexPoint[] {
    return [{ ...this.start }, { ...this.end }];
  }
}
