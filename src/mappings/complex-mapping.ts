import type { ComplexPoint } from '../math/complex-point';
import type { SampledFigure } from '../figures/figure';
import Complex from 'complex.js';

export type ComplexMapping = (point: ComplexPoint) => ComplexPoint;

function fromComplex(value: Complex): ComplexPoint {
  return { real: value.re, imaginary: value.im };
}

function asComplex(point: ComplexPoint): Complex {
  return new Complex(point.real, point.imaginary);
}

/** Squares z = real + i·imaginary. */
export function square(point: ComplexPoint): ComplexPoint {
  return {
    real: point.real * point.real - point.imaginary * point.imaginary,
    imaginary: 2 * point.real * point.imaginary,
  };
}

/** Cubes z. */
export function cube(point: ComplexPoint): ComplexPoint {
  return fromComplex(asComplex(point).pow(3));
}

/** The complex exponential e^z. */
export function exponential(point: ComplexPoint): ComplexPoint {
  return fromComplex(asComplex(point).exp());
}

/** The principal branch of the complex natural logarithm. */
export function logarithm(point: ComplexPoint): ComplexPoint {
  return fromComplex(asComplex(point).log());
}

/** The complex sine. */
export function sine(point: ComplexPoint): ComplexPoint {
  return fromComplex(asComplex(point).sin());
}

/** The complex cosine. */
export function cosine(point: ComplexPoint): ComplexPoint {
  return fromComplex(asComplex(point).cos());
}

/** The reciprocal 1/z. */
export function reciprocal(point: ComplexPoint): ComplexPoint {
  return fromComplex(asComplex(point).inverse());
}

/** The Joukowski map z + 1/z, useful for visualizing airfoil-like shapes. */
export function joukowski(point: ComplexPoint): ComplexPoint {
  const z = asComplex(point);
  return fromComplex(z.add(z.inverse()));
}

export interface ComplexMappingOption {
  readonly label: string;
  readonly formula: string;
  readonly mapping: ComplexMapping;
}

export const COMPLEX_MAPPINGS: readonly ComplexMappingOption[] = [
  { label: 'Square', formula: 'w = z²', mapping: square },
  { label: 'Cube', formula: 'w = z³', mapping: cube },
  { label: 'Exponential', formula: 'w = eᶻ', mapping: exponential },
  { label: 'Logarithm', formula: 'w = log(z)', mapping: logarithm },
  { label: 'Sine', formula: 'w = sin(z)', mapping: sine },
  { label: 'Cosine', formula: 'w = cos(z)', mapping: cosine },
  { label: 'Reciprocal', formula: 'w = 1/z', mapping: reciprocal },
  { label: 'Joukowski', formula: 'w = z + 1/z', mapping: joukowski },
];

export function mapSampledFigure(
  figure: SampledFigure,
  mapping: ComplexMapping,
): SampledFigure {
  return {
    id: figure.id,
    points: figure.points.map(mapping),
    controlPoints: figure.controlPoints.map(mapping),
    ...(figure.controlPointIds ? { controlPointIds: [...figure.controlPointIds] } : {}),
    closed: figure.closed,
    ...(figure.paths ? { paths: figure.paths.map((path) => path.map(mapping)) } : {}),
  };
}
