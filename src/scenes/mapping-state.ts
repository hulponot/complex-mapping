import type { Figure, SampledFigure } from '../figures/figure';
import { sampleFigure } from '../figures/sample-figure';
import type { ComplexMapping } from '../mappings/complex-mapping';

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
