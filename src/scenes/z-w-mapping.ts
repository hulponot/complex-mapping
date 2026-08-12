import { ComplexPlane } from './complex-plane';

function createPlanePanel(label: string, plane: ComplexPlane): HTMLElement {
  const panel = document.createElement('section');
  panel.className = 'complex-plane-panel';

  const heading = document.createElement('h2');
  heading.className = 'complex-plane-panel__label';
  heading.textContent = label;

  plane.domElement.className = 'complex-plane-panel__canvas';
  plane.domElement.setAttribute('aria-label', `${label} complex plane`);

  panel.append(heading, plane.domElement);
  return panel;
}

export function setupZWmapping(): HTMLElement {
  const mapping = document.createElement('main');
  mapping.className = 'z-w-mapping';

  const zPlane = new ComplexPlane();
  const wPlane = new ComplexPlane();

  const functionControl = document.createElement('div');
  functionControl.className = 'mapping-function';

  const label = document.createElement('label');
  label.className = 'mapping-function__label';
  label.htmlFor = 'mapping-function-input';
  label.textContent = 'Mapping';

  const input = document.createElement('input');
  input.className = 'mapping-function__input';
  input.id = 'mapping-function-input';
  input.type = 'text';
  input.placeholder = 'w = f(z)';
  input.setAttribute('aria-describedby', 'mapping-function-hint');

  const hint = document.createElement('p');
  hint.className = 'mapping-function__hint';
  hint.id = 'mapping-function-hint';
  hint.textContent = 'Function mapping will be available soon.';

  functionControl.append(label, input, hint);
  mapping.append(
    createPlanePanel('z-plane', zPlane),
    functionControl,
    createPlanePanel('w-plane', wPlane),
  );

  return mapping;
}
