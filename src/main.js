
import { createComplexSurface } from './complex/modular-surface';
import { createModularSurface } from './scenes/modular-surface';
import { setupZWmapping } from './scenes/z-w-mapping';

//createModularSurface();
let renderer = setupZWmapping();

document.body.appendChild(renderer.domElement);