import { describe, expect, it } from 'vitest';
import { mapSampledFigure, square } from './complex-mapping';

describe('complex mappings', () => {
  it('squares a complex point', () => {
    expect(square({ real: 2, imaginary: 3 })).toEqual({ real: -5, imaginary: 12 });
  });

  it('maps points and control points while preserving figure metadata', () => {
    const figure = {
      id: 'figure-1',
      points: [{ real: 2, imaginary: 0 }],
      controlPoints: [{ real: 0, imaginary: 2 }],
      closed: true,
    };

    expect(mapSampledFigure(figure, square)).toEqual({
      id: 'figure-1',
      points: [{ real: 4, imaginary: 0 }],
      controlPoints: [{ real: -4, imaginary: 0 }],
      closed: true,
    });
    expect(figure.points).toEqual([{ real: 2, imaginary: 0 }]);
  });
});
