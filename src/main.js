
import { setupZWmapping } from './scenes/z-w-mapping';
import './style.css';

const app = document.querySelector('#app');

if (!app) {
  throw new Error('Could not find the app container.');
}

app.appendChild(setupZWmapping());
