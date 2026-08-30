import type { Figure, SampledFigure } from '../figures/figure';
import { sampleFigure } from '../figures/sample-figure';
import type { ComplexMapping } from '../mappings/complex-mapping';
import type { ComplexPoint } from '../math/complex-point';

export interface MappingState {
  figures: Figure[];
  mapping: ComplexMapping;
  sampledFigures: SampledFigure[];
  sampleCount: number;
}

export function createMappingState(mapping: ComplexMapping): MappingState {
  return { figures: [], mapping, sampledFigures: [], sampleCount: 128 };
}

export function setMapping(state: MappingState, mapping: ComplexMapping): void {
  state.mapping = mapping;
}

export function resampleFigures(state: MappingState): void {
  state.sampledFigures = state.figures.map((figure) => sampleFigure(figure, state.sampleCount));
}

export function setSampleCount(state: MappingState, sampleCount: number): void {
  if (!Number.isInteger(sampleCount) || sampleCount < 2) throw new Error('sampleCount must be an integer of at least 2');
  state.sampleCount = sampleCount;
  resampleFigures(state);
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
