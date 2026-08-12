import { Vector3 } from 'three';

export interface Figure {
  progress(t: number): Vector3;
  closed?: boolean;
  getControlPoints(): Vector3[];
}
