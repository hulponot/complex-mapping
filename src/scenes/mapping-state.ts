import type { Figure, SampledFigure } from '../figures/figure';
import { sampleFigure } from '../figures/sample-figure';
import type { ComplexMapping } from '../mappings/complex-mapping';
import type { ComplexPoint } from '../math/complex-point';

export interface MappingState {
  figures: Figure[];
  mapping: ComplexMapping;
  sampledFigures: SampledFigure[];
}

export function createMappingState(mapping: ComplexMapping): MappingState {
  return { figures: [], mapping, sampledFigures: [] };
}

export function resampleFigures(state: MappingState): void {
  state.sampledFigures = state.figures.map((figure) => sampleFigure(figure));
}

export function addFigure(state: MappingState, figure: Figure): void {
  state.figures.push(figure);
  resampleFigures(state);
}

export function clearFigures(state: MappingState): void {
  state.figures.length = 0;
  state.sampledFigures = [];
}

export function moveControlPoint(
  state: MappingState,
  figureId: string,
  controlPointId: string,
  point: ComplexPoint,
): boolean {
  const figure = state.figures.find((candidate) => candidate.id === figureId);
  if (!figure) return false;
  figure.moveControlPoint(controlPointId, point);
  resampleFigures(state);
  return true;
}
