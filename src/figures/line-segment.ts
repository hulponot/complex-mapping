import { Vector3 } from 'three';
import type { Figure } from './figure';

export class LineSegment implements Figure {
  constructor(
    private readonly start = new Vector3(-4, 0, 0),
    private readonly end = new Vector3(4, 0, 0),
  ) {}

  progress(t: number): Vector3 {
    return this.start.clone().lerp(this.end, Math.min(1, Math.max(0, t)));
  }

  getControlPoints(): Vector3[] {
    return [this.start.clone(), this.end.clone()];
  }
}
