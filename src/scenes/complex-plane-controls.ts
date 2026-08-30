import {
  Group,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  Raycaster,
  SphereGeometry,
  Vector2,
  Vector3,
  Plane as ThreePlane,
} from 'three';
import type { ComplexPoint } from '../math/complex-point';
import { fromVector3, toVector3 } from '../math/complex-point';

export interface ControlPointDrag {
  readonly figureId: string;
  readonly controlPointId: string;
  readonly point: ComplexPoint;
}

type ControlHandleMetadata = { figureId: string; controlPointId: string };

export class ComplexPlaneControls {
  private static readonly controlPointColor = 0xffaa00;
  private static readonly hoveredControlPointColor = 0xffdd66;
  private static readonly activeControlPointColor = 0xffffff;
  private static readonly controlPointSnapDistance = 0.65;

  private readonly raycaster = new Raycaster();
  private readonly pointer = new Vector2();
  private readonly controlHandles = new Map<Mesh, ControlHandleMetadata>();
  private pointerCallback?: (point: ComplexPoint | null) => void;
  private dragCallback?: (event: ControlPointDrag) => void;
  private dragStartCallback?: (event: ControlPointDrag) => void;
  private dragEndCallback?: (event: ControlPointDrag) => void;
  private activeDrag?: {
    mesh: Mesh;
    figureId: string;
    controlPointId: string;
    lastPoint: ComplexPoint;
  };
  private hoveredControl?: Mesh;

  constructor(
    private readonly domElement: HTMLCanvasElement,
    private readonly camera: OrthographicCamera,
    private readonly controlGroup: Group,
    private readonly cursor: Mesh,
  ) {
    domElement.addEventListener('pointermove', this.handlePointerMove);
    domElement.addEventListener('pointerleave', this.handlePointerLeave);
    domElement.addEventListener('pointerdown', this.handlePointerDown);
    domElement.addEventListener('pointerup', this.handlePointerUp);
    domElement.addEventListener('pointercancel', this.handlePointerUp);
    domElement.addEventListener('lostpointercapture', this.handleLostPointerCapture);
  }

  dispose(): void {
    this.clear();
    this.domElement.removeEventListener('pointermove', this.handlePointerMove);
    this.domElement.removeEventListener('pointerleave', this.handlePointerLeave);
    this.domElement.removeEventListener('pointerdown', this.handlePointerDown);
    this.domElement.removeEventListener('pointerup', this.handlePointerUp);
    this.domElement.removeEventListener('pointercancel', this.handlePointerUp);
    this.domElement.removeEventListener('lostpointercapture', this.handleLostPointerCapture);
  }

  createHandles(figureId: string, points: readonly ComplexPoint[], ids?: readonly string[]): Map<string, Mesh> {
    const handles = new Map<string, Mesh>();
    points.forEach((point, index) => {
      const controlPointId = ids?.[index] ?? `control-point-${index}`;
      const control = new Mesh(new SphereGeometry(0.25, 12, 8), new MeshBasicMaterial({ color: ComplexPlaneControls.controlPointColor }));
      this.setHandlePosition(control, point);
      handles.set(controlPointId, control);
      this.controlGroup.add(control);
      this.controlHandles.set(control, { figureId, controlPointId });
    });
    return handles;
  }

  updateHandle(handle: Mesh, point: ComplexPoint): void { this.setHandlePosition(handle, point); }

  removeHandles(handles: Map<string, Mesh>): void {
    for (const handle of handles.values()) {
      if (this.activeDrag?.mesh === handle) this.endDrag();
      this.controlHandles.delete(handle);
      this.controlGroup.remove(handle);
      handle.geometry.dispose();
      (handle.material as MeshBasicMaterial).dispose();
    }
    handles.clear();
  }

  clear(): void {
    this.endDrag();
    this.hoveredControl = undefined;
    for (const handle of [...this.controlHandles.keys()]) {
      this.controlHandles.delete(handle);
      this.controlGroup.remove(handle);
      handle.geometry.dispose();
      (handle.material as MeshBasicMaterial).dispose();
    }
  }

  onPointerMove(callback: (point: ComplexPoint | null) => void): void { this.pointerCallback = callback; }
  onDrag(callback: (event: ControlPointDrag) => void): void { this.dragCallback = callback; }
  onDragStart(callback: (event: ControlPointDrag) => void): void { this.dragStartCallback = callback; }
  onDragEnd(callback: (event: ControlPointDrag) => void): void { this.dragEndCallback = callback; }

  private setHandlePosition(handle: Mesh, point: ComplexPoint): void {
    const vector = toVector3(point);
    handle.position.set(vector.x, vector.y, vector.z);
  }

  private pointFromPointer(event: PointerEvent): ComplexPoint | null {
    const rect = this.domElement.getBoundingClientRect();
    this.pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster.ray.intersectPlane(new ThreePlane(new Vector3(0, 1, 0), 0), new Vector3());
    return hit ? fromVector3(hit) : null;
  }

  private setControlColor(control: Mesh, color: number): void {
    (control.material as MeshBasicMaterial).color.setHex(color);
  }

  private nearbyControl(point: ComplexPoint): Mesh | undefined {
    let closest: Mesh | undefined;
    let closestDistance = ComplexPlaneControls.controlPointSnapDistance;
    for (const control of this.controlHandles.keys()) {
      if (control === this.activeDrag?.mesh) continue;
      const distance = Math.hypot(control.position.x - point.real, control.position.z - point.imaginary);
      if (distance < closestDistance) { closest = control; closestDistance = distance; }
    }
    return closest;
  }

  private updateHoveredControl(control: Mesh | undefined): void {
    if (control === this.hoveredControl) return;
    if (this.hoveredControl && this.hoveredControl !== this.activeDrag?.mesh) this.setControlColor(this.hoveredControl, ComplexPlaneControls.controlPointColor);
    this.hoveredControl = control;
    if (control && control !== this.activeDrag?.mesh) this.setControlColor(control, ComplexPlaneControls.hoveredControlPointColor);
  }

  private dragEvent(point: ComplexPoint): ControlPointDrag {
    const drag = this.activeDrag!;
    return { figureId: drag.figureId, controlPointId: drag.controlPointId, point };
  }

  private handlePointerDown = (event: PointerEvent): void => {
    const rect = this.domElement.getBoundingClientRect();
    this.pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster.intersectObjects(this.controlGroup.children, true)[0];
    const mesh = hit?.object instanceof Mesh ? hit.object : undefined;
    const metadata = mesh ? this.controlHandles.get(mesh) : undefined;
    if (!mesh || !metadata) return;
    this.activeDrag = { mesh, ...metadata, lastPoint: { real: mesh.position.x, imaginary: mesh.position.z } };
    this.updateHoveredControl(undefined);
    this.setControlColor(mesh, ComplexPlaneControls.activeControlPointColor);
    this.domElement.setPointerCapture(event.pointerId);
    const point = this.pointFromPointer(event);
    if (point) { this.activeDrag.lastPoint = point; this.dragStartCallback?.(this.dragEvent(point)); }
    event.preventDefault();
  };

  private handlePointerUp = (event: PointerEvent): void => {
    if (!this.activeDrag) return;
    const point = this.pointFromPointer(event);
    if (point) this.activeDrag.lastPoint = point;
    this.endDrag(event.pointerId);
  };

  private handleLostPointerCapture = (): void => { this.endDrag(); };

  private endDrag(pointerId?: number): void {
    if (!this.activeDrag) return;
    const drag = this.activeDrag;
    this.dragEndCallback?.({ figureId: drag.figureId, controlPointId: drag.controlPointId, point: drag.lastPoint });
    this.setControlColor(drag.mesh, ComplexPlaneControls.controlPointColor);
    this.activeDrag = undefined;
    if (pointerId !== undefined && this.domElement.hasPointerCapture(pointerId)) this.domElement.releasePointerCapture(pointerId);
    this.updateHoveredControl(undefined);
  }

  private handlePointerMove = (event: PointerEvent): void => {
    const point = this.pointFromPointer(event);
    if (!point) return;
    const nearby = this.activeDrag ? undefined : this.nearbyControl(point);
    const snappedPoint = nearby ? { real: nearby.position.x, imaginary: nearby.position.z } : point;
    this.updateHoveredControl(nearby);
    this.setHandlePosition(this.cursor, snappedPoint);
    this.cursor.visible = true;
    this.pointerCallback?.(snappedPoint);
    if (this.activeDrag) { this.activeDrag.lastPoint = point; this.dragCallback?.(this.dragEvent(point)); }
  };

  private handlePointerLeave = (): void => {
    this.cursor.visible = false;
    this.pointerCallback?.(null);
    this.updateHoveredControl(undefined);
    this.endDrag();
  };
}
