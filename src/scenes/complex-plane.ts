import {
  Color,
  OrthographicCamera,
  PolarGridHelper,
  Scene,
  WebGLRenderer,
} from 'three';

export class ComplexPlane {
  readonly renderer: WebGLRenderer;

  private readonly camera: OrthographicCamera;
  private readonly scene: Scene;

  constructor() {
    this.scene = new Scene();
    this.scene.background = new Color(0xcc00ff);

    this.renderer = new WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(300, 300);
    this.renderer.localClippingEnabled = true;

    this.camera = new OrthographicCamera(-10, 10, 10, -10, 0.01, 1000);
    this.camera.position.set(0, 5, 0);
    this.camera.lookAt(0, 0, 0);

    this.scene.add(new PolarGridHelper(10, 16, 8, 64));
    this.renderer.setAnimationLoop(this.render);
  }

  get domElement(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  dispose(): void {
    this.renderer.setAnimationLoop(null);
    this.renderer.dispose();
  }

  private render = (): void => {
    this.renderer.render(this.scene, this.camera);
  };
}
