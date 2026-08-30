import type { Figure, FigureControlPoint } from './figure';
import { createFigureId } from './figure';
import type { ComplexPoint } from '../math/complex-point';

export class Circle implements Figure {
  readonly id: string;
  readonly closed = true;

  constructor(
    protected center: ComplexPoint = { real: 0, imaginary: 0 },
    protected radius = 3,
    id = createFigureId(),
  ) { this.id = id; }

  samplePaths(sampleCount: number): readonly ComplexPoint[][] {
    return [Array.from({ length: sampleCount }, (_, index) => this.pointAt(index / sampleCount))];
  }

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

/** A family of concentric circles sharing the same center and radius handle. */
export class ConcentricCircles extends Circle {
  private readonly radii: number[];

  constructor(
    center: ComplexPoint = { real: 0, imaginary: 0 },
    radii: readonly number[] = [1.5, 3, 4.5, 6, 8],
    id = createFigureId(),
  ) {
    super(center, radii[0] ?? 1, id);
    if (radii.length === 0 || radii.some((radius) => radius <= 0 || !Number.isFinite(radius))) {
      throw new Error('Circle radii must be positive');
    }
    this.radii = [...radii];
  }

  override samplePaths(sampleCount: number): readonly ComplexPoint[][] {
    return this.radii.map((radius) => Array.from({ length: sampleCount }, (_, index) => {
      const angle = index * Math.PI * 2 / sampleCount;
      return { real: this.center.real + radius * Math.cos(angle), imaginary: this.center.imaginary + radius * Math.sin(angle) };
    }));
  }

  override moveControlPoint(id: string, position: ComplexPoint): void {
    if (id !== 'radius') { super.moveControlPoint(id, position); return; }
    const oldRadius = this.radius;
    super.moveControlPoint(id, position);
    const scale = oldRadius === 0 ? 1 : this.radius / oldRadius;
    this.radii.forEach((radius, index) => { this.radii[index] = radius * scale; });
  }
}

export { ConcentricCircles as ConcentricCircle };
