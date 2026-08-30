import {
  Color,
  OrthographicCamera,
  GridHelper,
  Group,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
  Vector3,
  Scene,
  Vector2,
  WebGLRenderer,
} from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import type { SampledFigure } from '../figures/figure';
import type { ComplexPoint } from '../math/complex-point';
import { toVector3 } from '../math/complex-point';
import { ComplexPlaneControls, type ControlPointDrag } from './complex-plane-controls';

export type { ControlPointDrag } from './complex-plane-controls';

interface RenderedFigure {
  readonly id: string;
  paths: Array<{ line: Line2; closingLine?: Line2 }>;
  readonly handles: Map<string, Mesh>;
}

export class ComplexPlane {
  readonly renderer: WebGLRenderer;

  private readonly camera: OrthographicCamera;
  private readonly scene: Scene;
  private readonly figuresGroup: Group;
  private readonly figureMaterial: LineMaterial;
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
    this.figureMaterial = new LineMaterial({ color: 0xffff00, linewidth: 0.06, worldUnits: true, resolution: new Vector2() });
    this.resize(300, 300);

    this.grid = new GridHelper(100, 100, 0x227799, 0xccaaaa);
    this.scene.add(this.grid);
    this.figuresGroup = new Group();
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
      const ids = item.controlPoints.map((_, index) => item.controlPointIds?.[index] ?? `control-point-${index}`);
      this.reconcilePaths(existing, item);
      if (ids.length !== existing.handles.size || ids.some((id) => !existing.handles.has(id))) {
        this.controls.removeHandles(existing.handles);
        this.createRenderedHandles(existing, item);
      }
    }
  }

  private createRenderedFigure(item: SampledFigure): RenderedFigure {
    const rendered: RenderedFigure = { id: item.id, paths: [], handles: new Map() };
    rendered.paths = this.createRenderedPaths(item);
    this.createRenderedHandles(rendered, item);
    return rendered;
  }

  private createRenderedPaths(item: SampledFigure): Array<{ line: Line2; closingLine?: Line2 }> {
    const paths = item.paths ?? [item.points];
    return paths.map((path) => {
      const line = new Line2(this.createLineGeometry(path), this.figureMaterial);
      const closingLine = item.closed && path.length > 0
        ? new Line2(this.createLineGeometry([path[path.length - 1], path[0]]), this.figureMaterial)
        : undefined;
      this.figuresGroup.add(line);
      if (closingLine) this.figuresGroup.add(closingLine);
      return { line, closingLine };
    });
  }

  private reconcilePaths(rendered: RenderedFigure, item: SampledFigure): void {
    const paths = item.paths ?? [item.points];
    if (paths.length === rendered.paths.length) return;

    this.removeRenderedPaths(rendered);
    rendered.paths = this.createRenderedPaths(item);
  }

  private createRenderedHandles(rendered: RenderedFigure, item: SampledFigure): void {
    for (const [id, handle] of this.controls.createHandles(item.id, item.controlPoints, item.controlPointIds)) rendered.handles.set(id, handle);
  }

  private createLineGeometry(points: readonly ComplexPoint[]): LineGeometry {
    return new LineGeometry().setPositions(this.linePositions(points));
  }

  private linePositions(points: readonly ComplexPoint[]): number[] {
    if (points.length === 0) return [0, 0, 0];
    return points.flatMap((point) => {
      const vector = toVector3(point);
      return [vector.x, vector.y, vector.z];
    });
  }

  private updateLineGeometry(line: Line2, points: readonly ComplexPoint[]): void {
    const geometry = line.geometry as LineGeometry;
    const position = geometry.getAttribute('instanceStart');
    if (position.count !== Math.max(points.length - 1, 0)) {
      const oldGeometry = line.geometry;
      line.geometry = this.createLineGeometry(points);
      oldGeometry.dispose();
      return;
    }
    geometry.setPositions(this.linePositions(points));
  }

  private removeRenderedHandles(rendered: RenderedFigure): void {
    this.controls.removeHandles(rendered.handles);
  }

  private removeRenderedFigure(rendered: RenderedFigure): void {
    this.removeRenderedHandles(rendered);
    this.removeRenderedPaths(rendered);
    this.renderedFigures.delete(rendered.id);
  }

  private removeRenderedPaths(rendered: RenderedFigure): void {
    for (const path of rendered.paths) {
      this.figuresGroup.remove(path.line);
      path.line.geometry.dispose();
      if (path.closingLine) {
        this.figuresGroup.remove(path.closingLine);
        path.closingLine.geometry.dispose();
      }
    }
    rendered.paths = [];
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
    this.figureMaterial.resolution.set(width, height);
  }

  clearFigures(): void {
    for (const rendered of [...this.renderedFigures.values()]) this.removeRenderedFigure(rendered);
    this.controls.clear();
  }

  setFigureStyle(style: { color?: number; opacity?: number; linewidth?: number }): void {
    if (style.color !== undefined) this.figureMaterial.color.setHex(style.color);
    if (style.opacity !== undefined) { this.figureMaterial.opacity = style.opacity; this.figureMaterial.transparent = style.opacity < 1; }
    if (style.linewidth !== undefined) this.figureMaterial.linewidth = style.linewidth;
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
