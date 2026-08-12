import { Vector3 } from 'three';
import type { Figure } from './figure';

export class Circle implements Figure {
  readonly closed = true;

  constructor(
    private readonly center = new Vector3(),
    private readonly radius = 3,
  ) {}

  progress(t: number): Vector3 {
    const angle = t * Math.PI * 2;
    return new Vector3(
      this.center.x + this.radius * Math.cos(angle),
      this.center.y,
      this.center.z + this.radius * Math.sin(angle),
    );
  }

  getControlPoints(): Vector3[] {
    return [this.progress(0)];
  }
}
