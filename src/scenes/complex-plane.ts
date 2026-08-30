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
  SphereGeometry,
  Vector3,
  Scene,
  WebGLRenderer,
} from 'three';
import type { SampledFigure } from '../figures/figure';
import type { ComplexPoint } from '../math/complex-point';
import { toVector3 } from '../math/complex-point';
import { ComplexPlaneControls, type ControlPointDrag } from './complex-plane-controls';

export type { ControlPointDrag } from './complex-plane-controls';

interface RenderedFigure {
  readonly id: string;
  readonly paths: Array<{ line: Line; closingLine?: Line }>;
  readonly handles: Map<string, Mesh>;
}

export class ComplexPlane {
  readonly renderer: WebGLRenderer;

  private readonly camera: OrthographicCamera;
  private readonly scene: Scene;
  private readonly figuresGroup: Group;
  private readonly figureMaterial: LineBasicMaterial;
  private readonly controlGroup: Group;
  private readonly grid: GridHelper;
  private readonly cursor: Mesh;
  private readonly controls: ComplexPlaneControls;
  private readonly renderedFigures = new Map<string, RenderedFigure>();

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
    this.controls = new ComplexPlaneControls(this.domElement, this.camera, this.controlGroup, this.cursor);
    this.renderer.setAnimationLoop(this.render);
  }

  get domElement(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  dispose(): void {
    this.clearFigures();
    this.controls.dispose();
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
          this.controls.updateHandle(handle, point);
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
    for (const [id, handle] of this.controls.createHandles(item.id, item.controlPoints, item.controlPointIds)) rendered.handles.set(id, handle);
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
    this.controls.removeHandles(rendered.handles);
  }

  private removeRenderedFigure(rendered: RenderedFigure): void {
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
    for (const rendered of [...this.renderedFigures.values()]) this.removeRenderedFigure(rendered);
    this.controls.clear();
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

  onPointerMove(callback: (point: ComplexPoint | null) => void): void { this.controls.onPointerMove(callback); }

  onControlPointDrag(callback: (event: ControlPointDrag) => void): void {
    this.controls.onDrag(callback);
  }

  onControlPointDragStart(callback: (event: ControlPointDrag) => void): void {
    this.controls.onDragStart(callback);
  }

  onControlPointDragEnd(callback: (event: ControlPointDrag) => void): void {
    this.controls.onDragEnd(callback);
  }

  private render = (): void => {
    this.renderer.render(this.scene, this.camera);
  };
}
