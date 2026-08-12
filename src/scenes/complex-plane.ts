import {
  Color,
  OrthographicCamera,
  GridHelper,
  Group,
  Line,
  LineBasicMaterial,
  BufferGeometry,
  Mesh,
  MeshBasicMaterial,
  Plane as ThreePlane,
  Raycaster,
  Vector2,
  Vector3,
  SphereGeometry,
  Scene,
  WebGLRenderer,
} from 'three';
import type { SampledFigure } from '../figures/figure';
import type { ComplexPoint } from '../math/complex-point';
import { fromVector3, toVector3 } from '../math/complex-point';

export class ComplexPlane {
  private static readonly controlPointColor = 0xffaa00;
  private static readonly hoveredControlPointColor = 0xffdd66;
  private static readonly activeControlPointColor = 0xffffff;
  private static readonly controlPointSnapDistance = 0.65;

  readonly renderer: WebGLRenderer;

  private readonly camera: OrthographicCamera;
  private readonly scene: Scene;
  private readonly figuresGroup: Group;
  private readonly figureMaterial: LineBasicMaterial;
  private readonly controlGroup: Group;
  private readonly grid: GridHelper;
  private readonly cursor: Mesh;
  private readonly raycaster = new Raycaster();
  private readonly pointer = new Vector2();
  private pointerCallback?: (point: ComplexPoint | null) => void;
  private controlPointDragCallback?: (event: ControlPointDrag) => void;
  private controlPointDragStartCallback?: (event: ControlPointDrag) => void;
  private controlPointDragEndCallback?: (event: ControlPointDrag) => void;
  private readonly controlHandles = new Map<Mesh, { figureId: string; controlPointId: string }>();
  private activeDrag?: {
    mesh: Mesh;
    figureId: string;
    controlPointId: string;
    lastPoint: ComplexPoint;
  };
  private hoveredControl?: Mesh;

  constructor() {
    this.scene = new Scene();
    this.scene.background = new Color(0xcc00ff);

    this.renderer = new WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.localClippingEnabled = true;

    this.camera = new OrthographicCamera(-10, 10, 10, -10, 0.01, 1000);
    this.camera.position.set(0, 5, 0);
    this.camera.lookAt(0, 0, 0);
    this.resize(300, 300);

    this.grid = new GridHelper(100, 100, 0x227799, 0xccaaaa);
    this.scene.add(this.grid);
    this.figuresGroup = new Group();
    this.figureMaterial = new LineBasicMaterial({ color: 0xffff00 });
    this.scene.add(this.figuresGroup);
    this.controlGroup = new Group();
    this.scene.add(this.controlGroup);
    this.cursor = new Mesh(new SphereGeometry(0.18, 16, 8), new MeshBasicMaterial({ color: 0xffffff }));
    this.cursor.visible = false;
    this.scene.add(this.cursor);
    this.domElement.addEventListener('pointermove', this.handlePointerMove);
    this.domElement.addEventListener('pointerleave', this.handlePointerLeave);
    this.domElement.addEventListener('pointerdown', this.handlePointerDown);
    this.domElement.addEventListener('pointerup', this.handlePointerUp);
    this.domElement.addEventListener('pointercancel', this.handlePointerUp);
    this.domElement.addEventListener('lostpointercapture', this.handleLostPointerCapture);
    this.renderer.setAnimationLoop(this.render);
  }

  get domElement(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  dispose(): void {
    this.clearFigures();
    this.domElement.removeEventListener('pointermove', this.handlePointerMove);
    this.domElement.removeEventListener('pointerleave', this.handlePointerLeave);
    this.domElement.removeEventListener('pointerdown', this.handlePointerDown);
    this.domElement.removeEventListener('pointerup', this.handlePointerUp);
    this.domElement.removeEventListener('pointercancel', this.handlePointerUp);
    this.domElement.removeEventListener('lostpointercapture', this.handleLostPointerCapture);
    this.cursor.geometry.dispose();
    (this.cursor.material as MeshBasicMaterial).dispose();
    this.figureMaterial.dispose();
    this.renderer.setAnimationLoop(null);
    this.renderer.dispose();
  }

  setFigures(data: readonly SampledFigure[]): void {
    this.clearFigures();
    for (const item of data) {
      const points = item.points.map((point) => {
        const vector = toVector3(point);
        return new Vector3(vector.x, vector.y, vector.z);
      });
      const geometry = new BufferGeometry().setFromPoints(points);
      const line = new Line(geometry, this.figureMaterial);
      if (item.closed) {
        const closingGeometry = new BufferGeometry().setFromPoints([
          points[points.length - 1],
          points[0],
        ]);
        this.figuresGroup.add(line, new Line(closingGeometry, this.figureMaterial));
      } else {
        this.figuresGroup.add(line);
      }
      item.controlPoints.forEach((point, index) => {
        const control = new Mesh(
          new SphereGeometry(0.25, 12, 8),
          new MeshBasicMaterial({ color: ComplexPlane.controlPointColor }),
        );
        const vector = toVector3(point);
        control.position.set(vector.x, vector.y, vector.z);
        this.controlGroup.add(control);
        this.controlHandles.set(control, {
          figureId: item.id,
          controlPointId: item.controlPointIds?.[index] ?? `control-point-${index}`,
        });
      });
    }
  }

  resize(width: number, height: number): void {
    const aspect = width / Math.max(height, 1);
    const halfHeight = 10;
    this.camera.left = -halfHeight * aspect;
    this.camera.right = halfHeight * aspect;
    this.camera.top = halfHeight;
    this.camera.bottom = -halfHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  clearFigures(): void {
    console.log("clear figs");
    this.activeDrag = undefined;
    this.hoveredControl = undefined;
    this.controlHandles.clear();
    for (const child of [...this.figuresGroup.children]) {
      this.figuresGroup.remove(child);
      if (child instanceof Line) child.geometry.dispose();
    }
    for (const child of [...this.controlGroup.children]) {
      this.controlGroup.remove(child);
      if (child instanceof Mesh) {
        child.geometry.dispose();
        (child.material as MeshBasicMaterial).dispose();
      }
    }
  }

  setFigureStyle(style: { color?: number; opacity?: number; linewidth?: number }): void {
    if (style.color !== undefined) this.figureMaterial.color.setHex(style.color);
    if (style.opacity !== undefined) { this.figureMaterial.opacity = style.opacity; this.figureMaterial.transparent = style.opacity < 1; }
  }

  setGridStyle(style: { color?: number; visible?: boolean }): void {
    if (style.color !== undefined) { this.grid.material.color.setHex(style.color); this.grid.material.color.setHex(style.color); }
    if (style.visible !== undefined) this.grid.visible = style.visible;
  }

  setCursorPoint(point: ComplexPoint | null): void {
    this.cursor.visible = point !== null;
    if (point) {
      const vector = toVector3(point);
      this.cursor.position.set(vector.x, vector.y, vector.z);
    }
  }

  onPointerMove(callback: (point: ComplexPoint | null) => void): void { this.pointerCallback = callback; }

  onControlPointDrag(callback: (event: ControlPointDrag) => void): void {
    this.controlPointDragCallback = callback;
  }

  onControlPointDragStart(callback: (event: ControlPointDrag) => void): void {
    this.controlPointDragStartCallback = callback;
  }

  onControlPointDragEnd(callback: (event: ControlPointDrag) => void): void {
    this.controlPointDragEndCallback = callback;
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
    let closestDistance = ComplexPlane.controlPointSnapDistance;
    for (const control of this.controlHandles.keys()) {
      if (control === this.activeDrag?.mesh) continue;
      const distance = Math.hypot(control.position.x - point.real, control.position.z - point.imaginary);
      if (distance < closestDistance) {
        closest = control;
        closestDistance = distance;
      }
    }
    return closest;
  }

  private updateHoveredControl(control: Mesh | undefined): void {
    if (control === this.hoveredControl) return;
    if (this.hoveredControl && this.hoveredControl !== this.activeDrag?.mesh) {
      this.setControlColor(this.hoveredControl, ComplexPlane.controlPointColor);
    }
    this.hoveredControl = control;
    if (control && control !== this.activeDrag?.mesh) {
      this.setControlColor(control, ComplexPlane.hoveredControlPointColor);
    }
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
    this.activeDrag = {
      mesh,
      ...metadata,
      lastPoint: { real: mesh.position.x, imaginary: mesh.position.z },
    };
    this.updateHoveredControl(undefined);
    this.setControlColor(mesh, ComplexPlane.activeControlPointColor);
    this.domElement.setPointerCapture(event.pointerId);
    const point = this.pointFromPointer(event);
    if (point) {
      this.activeDrag.lastPoint = point;
      this.controlPointDragStartCallback?.(this.dragEvent(point));
    }
    event.preventDefault();
  };

  private handlePointerUp = (event: PointerEvent): void => {
    if (!this.activeDrag) return;
    const point = this.pointFromPointer(event);
    if (point) this.activeDrag.lastPoint = point;
    this.endDrag(event.pointerId);
  };

  private handleLostPointerCapture = (): void => {
    this.endDrag();
  };

  private endDrag(pointerId?: number): void {
    if (!this.activeDrag) return;
    console.warn("end drag");
    const drag = this.activeDrag;
    this.controlPointDragEndCallback?.({
      figureId: drag.figureId,
      controlPointId: drag.controlPointId,
      point: drag.lastPoint,
    });
    this.setControlColor(drag.mesh, ComplexPlane.controlPointColor);
    this.activeDrag = undefined;
    if (pointerId !== undefined && this.domElement.hasPointerCapture(pointerId)) {
      this.domElement.releasePointerCapture(pointerId);
    }
    this.updateHoveredControl(undefined);
  };

  private handlePointerMove = (event: PointerEvent): void => {
    const point = this.pointFromPointer(event);
    if (point) {
      const nearby = this.activeDrag ? undefined : this.nearbyControl(point);
      const snappedPoint = nearby
        ? { real: nearby.position.x, imaginary: nearby.position.z }
        : point;
      this.updateHoveredControl(nearby);
      const vector = toVector3(snappedPoint);
      this.cursor.position.set(vector.x, vector.y, vector.z);
      this.cursor.visible = true;
      this.pointerCallback?.(snappedPoint);
      if (this.activeDrag) {
        this.activeDrag.lastPoint = point;
        this.controlPointDragCallback?.(this.dragEvent(point));
      }
    }
  };

  private handlePointerLeave = (): void => {
    this.cursor.visible = false;
    this.pointerCallback?.(null);
    this.updateHoveredControl(undefined);
    this.endDrag();
  };

  private render = (): void => {
    this.renderer.render(this.scene, this.camera);
  };
}

export interface ControlPointDrag {
  readonly figureId: string;
  readonly controlPointId: string;
  readonly point: ComplexPoint;
}
