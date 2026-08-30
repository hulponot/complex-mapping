import type { Figure, FigureControlPoint } from './figure';
import { createFigureId } from './figure';
import type { ComplexPoint } from '../math/complex-point';

export class LineSegment implements Figure {
  readonly id: string;
  readonly closed = false;

  constructor(
    protected start: ComplexPoint = { real: -4, imaginary: 0 },
    protected end: ComplexPoint = { real: 4, imaginary: 0 },
    id = createFigureId(),
  ) { this.id = id; }

  samplePaths(sampleCount: number): readonly ComplexPoint[][] {
    return [Array.from({ length: sampleCount }, (_, index) => this.pointAt(index / (sampleCount - 1)))];
  }

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

/** Parallel copies of a line, offset along its perpendicular direction. */
export class ParallelLineSegments extends LineSegment {
  private readonly offsets: readonly number[];

  constructor(
    start: ComplexPoint = { real: -4, imaginary: 0 },
    end: ComplexPoint = { real: 4, imaginary: 0 },
    offsets: readonly number[] = [-6, -3, 0, 3, 6],
    id = createFigureId(),
  ) {
    super(start, end, id);
    if (offsets.length === 0 || offsets.some((offset) => !Number.isFinite(offset))) throw new Error('Line offsets must be finite');
    this.offsets = [...offsets];
  }

  override samplePaths(sampleCount: number): readonly ComplexPoint[][] {
    const dx = this.end.real - this.start.real;
    const dy = this.end.imaginary - this.start.imaginary;
    const length = Math.hypot(dx, dy) || 1;
    return this.offsets.map((offset) => {
      const shift = { real: -dy / length * offset, imaginary: dx / length * offset };
      return Array.from({ length: sampleCount }, (_, index) => {
        const point = this.pointAt(index / (sampleCount - 1));
        return { real: point.real + shift.real, imaginary: point.imaginary + shift.imaginary };
      });
    });
  }
}

export { ParallelLineSegments as ParallelLines };
