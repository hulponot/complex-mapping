import {
    OrthographicCamera,
    Scene,
    WebGLRenderer,
    Color,
    FogExp2,
    Vector3,
    Plane,
    PlaneHelper,
    PolarGridHelper,
    DirectionalLight
} from 'three';

let camera: OrthographicCamera;
let scene: Scene;
let renderer: WebGLRenderer;

export function setupZWmapping(): WebGLRenderer {
    scene = new Scene();
    scene.background = new Color(0xcc00ff);

    renderer = new WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(300, 300);
    renderer.localClippingEnabled = true;

    camera = new OrthographicCamera(-10, 10, 10, -10, 0.01, 1000);
    camera.position.set(0, 5, 0);
    camera.lookAt(0, 0, 0);

    renderer.setAnimationLoop(animate);

    const radius = 10;
    const sectors = 16;
    const rings = 8;
    const divisions = 64;
    const gridHelper = new PolarGridHelper(radius, sectors, rings, divisions)

    scene.add(gridHelper);

    return renderer;

}

function animate() {
    render();
}

function render() {
    renderer.render(scene, camera);
}