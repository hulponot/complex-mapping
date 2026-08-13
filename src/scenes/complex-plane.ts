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

interface RenderedFigure {
  readonly id: string;
  readonly paths: Array<{ line: Line; closingLine?: Line }>;
  readonly handles: Map<string, Mesh>;
}

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
  private readonly renderedFigures = new Map<string, RenderedFigure>();
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
    this.reconcileFigures(data);
    this.updateFigures(data);
  }

  updateFigures(data: readonly SampledFigure[]): void {
    this.reconcileFigures(data);
    for (const item of data) {
      const rendered = this.renderedFigures.get(item.id);
      if (!rendered) continue;
      const paths = item.paths ?? [item.points];
      paths.forEach((path, index) => {
        const renderedPath = rendered.paths[index];
        if (!renderedPath) return;
        this.updateLineGeometry(renderedPath.line, path);
        if (renderedPath.closingLine && path.length > 0) {
          this.updateLineGeometry(renderedPath.closingLine, [path[path.length - 1], path[0]]);
        }
      });
      item.controlPoints.forEach((point, index) => {
        const controlPointId = item.controlPointIds?.[index] ?? `control-point-${index}`;
        const handle = rendered.handles.get(controlPointId);
        if (handle) {
          const vector = toVector3(point);
          handle.position.set(vector.x, vector.y, vector.z);
        }
      });
    }
  }

  private reconcileFigures(data: readonly SampledFigure[]): void {
    const incomingIds = new Set(data.map((item) => item.id));
    for (const [id, rendered] of this.renderedFigures) {
      if (!incomingIds.has(id)) this.removeRenderedFigure(rendered);
    }
    for (const item of data) {
      const existing = this.renderedFigures.get(item.id);
      if (!existing) {
        this.renderedFigures.set(item.id, this.createRenderedFigure(item));
        continue;
      }
      const pathCount = item.paths?.length ?? 1;
      const ids = item.controlPoints.map((_, index) => item.controlPointIds?.[index] ?? `control-point-${index}`);
      if (pathCount !== existing.paths.length || ids.length !== existing.handles.size || ids.some((id) => !existing.handles.has(id))) {
        this.removeRenderedFigure(existing);
        this.renderedFigures.set(item.id, this.createRenderedFigure(item));
        continue;
      }
    }
  }

  private createRenderedFigure(item: SampledFigure): RenderedFigure {
    const paths = item.paths ?? [item.points];
    const renderedPaths = paths.map((path) => {
      const line = new Line(this.createGeometry(path), this.figureMaterial);
      const closingLine = item.closed && path.length > 0
        ? new Line(this.createGeometry([path[path.length - 1], path[0]]), this.figureMaterial)
        : undefined;
      this.figuresGroup.add(line);
      if (closingLine) this.figuresGroup.add(closingLine);
      return { line, closingLine };
    });
    const rendered: RenderedFigure = { id: item.id, paths: renderedPaths, handles: new Map() };
    this.createRenderedHandles(rendered, item);
    return rendered;
  }

  private createRenderedHandles(rendered: RenderedFigure, item: SampledFigure): void {
    item.controlPoints.forEach((point, index) => {
      const controlPointId = item.controlPointIds?.[index] ?? `control-point-${index}`;
      const control = new Mesh(new SphereGeometry(0.25, 12, 8), new MeshBasicMaterial({ color: ComplexPlane.controlPointColor }));
      const vector = toVector3(point);
      control.position.set(vector.x, vector.y, vector.z);
      rendered.handles.set(controlPointId, control);
      this.controlGroup.add(control);
      this.controlHandles.set(control, { figureId: item.id, controlPointId });
    });
  }

  private createGeometry(points: readonly ComplexPoint[]): BufferGeometry {
    return new BufferGeometry().setFromPoints(points.map((point) => {
      const vector = toVector3(point);
      return new Vector3(vector.x, vector.y, vector.z);
    }));
  }

  private updateLineGeometry(line: Line, points: readonly ComplexPoint[]): void {
    const position = line.geometry.getAttribute('position');
    if (position.count !== points.length) {
      const oldGeometry = line.geometry;
      line.geometry = this.createGeometry(points);
      oldGeometry.dispose();
      return;
    }
    points.forEach((point, index) => {
      const vector = toVector3(point);
      position.setXYZ(index, vector.x, vector.y, vector.z);
    });
    position.needsUpdate = true;
    line.geometry.computeBoundingSphere();
  }

  private removeRenderedHandles(rendered: RenderedFigure): void {
    for (const handle of rendered.handles.values()) {
      this.controlHandles.delete(handle);
      this.controlGroup.remove(handle);
      handle.geometry.dispose();
      (handle.material as MeshBasicMaterial).dispose();
    }
    rendered.handles.clear();
  }

  private removeRenderedFigure(rendered: RenderedFigure): void {
    if (this.activeDrag?.figureId === rendered.id) this.endDrag();
    this.removeRenderedHandles(rendered);
    for (const path of rendered.paths) {
      this.figuresGroup.remove(path.line);
      path.line.geometry.dispose();
      if (path.closingLine) {
        this.figuresGroup.remove(path.closingLine);
        path.closingLine.geometry.dispose();
      }
    }
    this.renderedFigures.delete(rendered.id);
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
    this.endDrag();
    this.hoveredControl = undefined;
    for (const rendered of [...this.renderedFigures.values()]) this.removeRenderedFigure(rendered);
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
