import type { Figure } from './figure';
import { createFigureId } from './figure';
import type { ComplexPoint } from '../math/complex-point';

export class Circle implements Figure {
  readonly id: string;
  readonly closed = true;

  constructor(
    private readonly center: ComplexPoint = { real: 0, imaginary: 0 },
    private readonly radius = 3,
    id = createFigureId(),
  ) { this.id = id; }

  pointAt(t: number): ComplexPoint {
    const angle = t * Math.PI * 2;
    return {
      real: this.center.real + this.radius * Math.cos(angle),
      imaginary: this.center.imaginary + this.radius * Math.sin(angle),
    };
  }

  getControlPoints(): ComplexPoint[] {
    return [this.pointAt(0)];
  }
}
