import { describe, expect, it } from 'vitest';
import { Circle } from './circle';
import { LineSegment } from './line-segment';
import { sampleFigure } from './sample-figure';

describe('figure sampling', () => {
  it('samples a closed circle without duplicating its endpoint', () => {
    const sampled = sampleFigure(new Circle({ real: 0, imaginary: 0 }, 2), 4);

    expect(sampled.closed).toBe(true);
    expect(sampled.points).toHaveLength(4);
    expect(sampled.points[0]).toEqual({ real: 2, imaginary: 0 });
    expect(sampled.points[3].imaginary).toBeCloseTo(-2);
  });

  it('includes both endpoints when sampling an open line', () => {
    const sampled = sampleFigure(new LineSegment(), 3);

    expect(sampled.closed).toBe(false);
    expect(sampled.points[0]).toEqual({ real: -4, imaginary: 0 });
    expect(sampled.points[2]).toEqual({ real: 4, imaginary: 0 });
  });
});
