import { describe, expect, it } from 'vitest';
import { Ellipses, CassiniOvals } from './two-pole';
import { sampleFigure } from './sample-figure';

describe('two-pole figures', () => {
  it('samples every ellipse as an independent closed path at the default resolution', () => {
    const sampled = sampleFigure(new Ellipses([5, 7]));

    expect(sampled.paths).toHaveLength(2);
    expect(sampled.paths?.map((path) => path.length)).toEqual([128, 128]);
    expect(sampled.controlPointIds).toEqual(['pole1', 'pole2']);
  });

  it('keeps the two Cassini components separate below the lemniscate threshold', () => {
    const sampled = sampleFigure(new CassiniOvals([2, 5]));

    expect(sampled.paths).toHaveLength(3);
    expect(sampled.paths?.map((path) => path.length)).toEqual([128, 128, 128]);
  });
});
