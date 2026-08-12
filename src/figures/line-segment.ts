import type { Figure, FigureControlPoint } from './figure';
import { createFigureId } from './figure';
import type { ComplexPoint } from '../math/complex-point';

export class LineSegment implements Figure {
  readonly id: string;
  readonly closed = false;

  constructor(
    private start: ComplexPoint = { real: -4, imaginary: 0 },
    private end: ComplexPoint = { real: 4, imaginary: 0 },
    id = createFigureId(),
  ) { this.id = id; }

  pointAt(t: number): ComplexPoint {
    const progress = Math.min(1, Math.max(0, t));
    return {
      real: this.start.real + (this.end.real - this.start.real) * progress,
      imaginary: this.start.imaginary + (this.end.imaginary - this.start.imaginary) * progress,
    };
  }

  getControlPoints(): readonly FigureControlPoint[] {
    return [
      { id: 'start', role: 'endpoint', position: { ...this.start } },
      { id: 'end', role: 'endpoint', position: { ...this.end } },
    ];
  }

  moveControlPoint(id: string, position: ComplexPoint): void {
    if (id === 'start') this.start = { ...position };
    else if (id === 'end') this.end = { ...position };
    else throw new Error(`Unknown line control point: ${id}`);
  }
}
