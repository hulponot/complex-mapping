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
    this.renderer.setAnimationLoop(this.render);
  }

  get domElement(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  dispose(): void {
    this.clearFigures();
    this.domElement.removeEventListener('pointermove', this.handlePointerMove);
    this.domElement.removeEventListener('pointerleave', this.handlePointerLeave);
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
      for (const point of item.controlPoints) {
        const control = new Mesh(new SphereGeometry(0.25, 12, 8), new MeshBasicMaterial({ color: 0xffaa00 }));
        const vector = toVector3(point);
        control.position.set(vector.x, vector.y, vector.z);
        this.controlGroup.add(control);
      }
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

  private handlePointerMove = (event: PointerEvent): void => {
    const rect = this.domElement.getBoundingClientRect();
    this.pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster.ray.intersectPlane(new ThreePlane(new Vector3(0, 1, 0), 0), new Vector3());
    if (hit) {
      this.cursor.position.copy(hit);
      this.cursor.visible = true;
      this.pointerCallback?.(fromVector3(hit));
    }
  };

  private handlePointerLeave = (): void => { this.cursor.visible = false; this.pointerCallback?.(null); };

  private render = (): void => {
    this.renderer.render(this.scene, this.camera);
  };
}
