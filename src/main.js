import * as THREE from 'three';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createComplexSurface } from './complex/modular-surface';
import Complex from 'complex.js';
import GUI from 'lil-gui';

let camera, controls, scene, renderer;

init();
//render(); // remove when using animation loop

function init() {

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xcccccc);
  scene.fog = new THREE.FogExp2(0xcccccc, 0.002);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  renderer.localClippingEnabled = true;
  document.body.appendChild(renderer.domElement);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
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
  gui.add(viewParams, 'planeY', 0, 5).onChange(v => plane.constant = v)

  // world
  //Clipping plane
  const plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), viewParams.planeY)
  const planeHelper = new THREE.PlaneHelper(plane, 2, 0xffffff)
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

  const dirLight1 = new THREE.DirectionalLight(0xffffff, 3);
  dirLight1.position.set(1, 1, 1);
  scene.add(dirLight1);

  const dirLight2 = new THREE.DirectionalLight(0x002288, 3);
  dirLight2.position.set(- 1, - 1, - 1);
  scene.add(dirLight2);

  const ambientLight = new THREE.AmbientLight(0x555555);
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