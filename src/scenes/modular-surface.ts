import {
    PerspectiveCamera, 
    Scene, 
    WebGLRenderer,
    Color,
    FogExp2,
    Vector3,
    Plane,
    PlaneHelper,
    AmbientLight,
    DirectionalLight
} from 'three';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createComplexSurface } from '../complex/modular-surface';
import Complex from 'complex.js';
import GUI from 'lil-gui';

let camera : PerspectiveCamera;
let controls: OrbitControls;
let scene: Scene;
let renderer : WebGLRenderer;

export function createModularSurface() {

  scene = new Scene();
  scene.background = new Color(0xcccccc);
  scene.fog = new FogExp2(0xcccccc, 0.002);

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(300, 300);
  renderer.setAnimationLoop(animate);
  renderer.localClippingEnabled = true;
  document.body.appendChild(renderer.domElement);

  camera = new PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
  camera.position.set(10, 5, 0);

  // controls

  controls = new OrbitControls(camera, renderer.domElement);
  controls.listenToKeyEvents(window); // optional

  //controls.addEventListener( 'change', render ); // call this only in static scenes (i.e., if there is no animation loop)

  controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
  controls.dampingFactor = 0.05;

  controls.screenSpacePanning = false;

  controls.minDistance = 5;
  controls.maxDistance = 50;

  controls.cursorStyle = 'grab';

  controls.maxPolarAngle = Math.PI / 2;

  // GUI

  const viewParams = {
    planeY: 1
  }

  const gui = new GUI();
  gui.add(viewParams, 'planeY', 0, 5).onChange((v: number) => plane.constant = v)

  // world
  //Clipping plane
  const plane = new Plane(new Vector3(0, -1, 0), viewParams.planeY)
  const planeHelper = new PlaneHelper(plane, 2, 0xffffff)
  planeHelper.visible = true
  planeHelper.size = 10

  scene.add(planeHelper);
  //Surface

  const surface = createComplexSurface(
    {
      reMin: -5,
      reMax: 5,
      imMin: -5,
      imMax: 5,
      resolution: 300,
      scale: 1,
      clippingPlanes: [plane]
    },
    (re, im) => {

      // z = x + i y
      // Example:
      // |sin(z)| approximation
      const z = new Complex(re, im);
      const a = new Complex(1, 0);
      const b = new Complex(-1, 0);
      const c = new Complex(-1, -1);

      const w = z.sub(a).mul(z.sub(b)).mul(z.sub(c));

      return w.abs();
    }
  );

  scene.add(surface);

  // lights

  const dirLight1 = new DirectionalLight(0xffffff, 3);
  dirLight1.position.set(1, 1, 1);
  scene.add(dirLight1);

  const dirLight2 = new DirectionalLight(0x002288, 3);
  dirLight2.position.set(- 1, - 1, - 1);
  scene.add(dirLight2);

  const ambientLight = new AmbientLight(0x555555);
  scene.add(ambientLight);

  //

  window.addEventListener('resize', onWindowResize);

}

function onWindowResize() {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

}

function animate() {

  controls.update(); // only required if controls.enableDamping = true, or if controls.autoRotate = true

  render();

}

function render() {

  renderer.render(scene, camera);

}