import type { Figure, FigureControlPoint } from './figure';
import { createFigureId } from './figure';
import type { ComplexPoint } from '../math/complex-point';

export class Circle implements Figure {
  readonly id: string;
  readonly closed = true;

  constructor(
    private center: ComplexPoint = { real: 0, imaginary: 0 },
    private radius = 3,
    id = createFigureId(),
  ) { this.id = id; }

  pointAt(t: number): ComplexPoint {
    const angle = t * Math.PI * 2;
    return {
      real: this.center.real + this.radius * Math.cos(angle),
      imaginary: this.center.imaginary + this.radius * Math.sin(angle),
    };
  }

  getControlPoints(): readonly FigureControlPoint[] {
    return [
      { id: 'center', role: 'center', position: { ...this.center } },
      { id: 'radius', role: 'radius', position: this.pointAt(0) },
    ];
  }

  moveControlPoint(id: string, position: ComplexPoint): void {
    if (id === 'center') {
      this.center = { ...position };
      return;
    }
    if (id === 'radius') {
      this.radius = Math.max(0.05, Math.hypot(
        position.real - this.center.real,
        position.imaginary - this.center.imaginary,
      ));
      return;
    }
    throw new Error(`Unknown circle control point: ${id}`);
  }
}
