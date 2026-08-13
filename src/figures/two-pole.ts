import type { ComplexPoint } from '../math/complex-point';
import type { Figure, FigureControlPoint } from './figure';
import { createFigureId } from './figure';

const DEFAULT_SAMPLE_COUNT = 128;

function localPoint(center: ComplexPoint, cos: number, sin: number, x: number, y: number): ComplexPoint {
  return { real: center.real + cos * x - sin * y, imaginary: center.imaginary + sin * x + cos * y };
}

abstract class TwoPoleFigure implements Figure {
  readonly id: string;
  readonly closed = true;

  constructor(
    protected pole1: ComplexPoint = { real: -2, imaginary: 0 },
    protected pole2: ComplexPoint = { real: 2, imaginary: 0 },
    id = createFigureId(),
  ) { this.id = id; }

  protected axis(): { center: ComplexPoint; halfDistance: number; cos: number; sin: number } {
    const dx = this.pole2.real - this.pole1.real;
    const dy = this.pole2.imaginary - this.pole1.imaginary;
    const halfDistance = Math.hypot(dx, dy) / 2;
    return {
      center: { real: (this.pole1.real + this.pole2.real) / 2, imaginary: (this.pole1.imaginary + this.pole2.imaginary) / 2 },
      halfDistance,
      cos: halfDistance === 0 ? 1 : dx / (2 * halfDistance),
      sin: halfDistance === 0 ? 0 : dy / (2 * halfDistance),
    };
  }

  getControlPoints(): readonly FigureControlPoint[] {
    return [
      { id: 'pole1', role: 'pole', position: { ...this.pole1 } },
      { id: 'pole2', role: 'pole', position: { ...this.pole2 } },
    ];
  }

  moveControlPoint(id: string, position: ComplexPoint): void {
    if (id === 'pole1') this.pole1 = { ...position };
    else if (id === 'pole2') this.pole2 = { ...position };
    else throw new Error(`Unknown two-pole control point: ${id}`);
  }

  abstract pointAt(t: number): ComplexPoint;
  abstract samplePaths(sampleCount: number): readonly ComplexPoint[][];
}

/** Cassini ovals: the product of distances to the two poles is constant. */
export class CassiniOvals extends TwoPoleFigure {
  constructor(
    private constants: readonly number[] = [2, 4, 6, 8],
    pole1?: ComplexPoint,
    pole2?: ComplexPoint,
    id?: string,
  ) {
    super(pole1, pole2, id);
    if (constants.length === 0 || constants.some((value) => value <= 0 || !Number.isFinite(value))) throw new Error('Cassini constants must be positive');
  }

  pointAt(t: number): ComplexPoint {
    return this.samplePaths(DEFAULT_SAMPLE_COUNT)[0][Math.floor(Math.max(0, Math.min(0.999999, t)) * DEFAULT_SAMPLE_COUNT)];
  }

  samplePaths(sampleCount: number): readonly ComplexPoint[][] {
    const { center, halfDistance: a, cos, sin } = this.axis();
    return this.constants.flatMap((constant) => {
      if (a === 0) {
        const radius = Math.sqrt(constant);
        return [Array.from({ length: sampleCount }, (_, i) => localPoint(center, cos, sin, radius * Math.cos(i * 2 * Math.PI / sampleCount), radius * Math.sin(i * 2 * Math.PI / sampleCount)))];
      }
      const b4 = constant * constant;
      if (b4 >= a ** 4) {
        return [Array.from({ length: sampleCount }, (_, i) => {
          const theta = i * 2 * Math.PI / sampleCount;
          const r2 = a * a * Math.cos(2 * theta) + Math.sqrt(Math.max(0, b4 - a ** 4 * Math.sin(2 * theta) ** 2));
          const r = Math.sqrt(Math.max(0, r2));
          return localPoint(center, cos, sin, r * Math.cos(theta), r * Math.sin(theta));
        })];
      }
      const thetaMax = Math.asin(Math.sqrt(b4) / (a * a)) / 2;
      return [0, Math.PI].map((offset) => Array.from({ length: sampleCount }, (_, i) => {
        const u = i / sampleCount;
        const theta = u < 0.5 ? -thetaMax + 4 * thetaMax * u : thetaMax - 4 * thetaMax * (u - 0.5);
        const plus = u < 0.5;
        const discriminant = Math.sqrt(Math.max(0, b4 - a ** 4 * Math.sin(2 * theta) ** 2));
        const r2 = a * a * Math.cos(2 * theta) + (plus ? discriminant : -discriminant);
        const r = Math.sqrt(Math.max(0, r2));
        return localPoint(center, cos, sin, r * Math.cos(theta + offset), r * Math.sin(theta + offset));
      }));
    });
  }
}

/** Ellipses whose foci are the two poles; each constant is the distance sum. */
export class Ellipses extends TwoPoleFigure {
  constructor(
    private constants: readonly number[] = [5, 6, 8, 10],
    pole1?: ComplexPoint,
    pole2?: ComplexPoint,
    id?: string,
  ) {
    super(pole1, pole2, id);
    if (constants.length === 0 || constants.some((value) => value <= 0 || !Number.isFinite(value))) throw new Error('Ellipse constants must be positive');
  }

  pointAt(t: number): ComplexPoint { return this.samplePaths(DEFAULT_SAMPLE_COUNT)[0][Math.floor(Math.max(0, Math.min(0.999999, t)) * DEFAULT_SAMPLE_COUNT)]; }

  samplePaths(sampleCount: number): readonly ComplexPoint[][] {
    const { center, halfDistance: c, cos, sin } = this.axis();
    return this.constants.map((sum) => {
      const a = sum / 2;
      const b = Math.sqrt(Math.max(0, a * a - c * c));
      return Array.from({ length: sampleCount }, (_, i) => {
        const theta = i * 2 * Math.PI / sampleCount;
        return localPoint(center, cos, sin, a * Math.cos(theta), b * Math.sin(theta));
      });
    });
  }
}

// Singular aliases match the existing Circle/LineSegment figure naming style.
export { CassiniOvals as CassiniOval, Ellipses as Ellipse };
