import { ComplexPlane } from './complex-plane';
import { Vector3 } from 'three';
import { Circle } from '../figures/circle';
import { LineSegment } from '../figures/line-segment';
import type { Figure } from '../figures/figure';
import { square } from '../mapping/complex-mapping';

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
  const figures: Figure[] = [];
  const updateFigures = (): void => {
    const data = figures.map((figure) => ({
      points: Array.from({ length: 128 }, (_, index) => figure.progress(figure.closed ? index / 128 : index / 127)),
      controls: figure.getControlPoints(), closed: figure.closed,
    }));
    zPlane.setFigureData(data);
    wPlane.setFigureData(data.map((item) => ({ ...item, points: item.points.map(square), controls: item.controls.map(square) })));
  };

  const toolbar = document.createElement('aside');
  toolbar.className = 'figure-toolbar';
  toolbar.setAttribute('aria-label', 'Figures');

  const addFigure = (figure: Figure): void => {
    figures.push(figure);
    updateFigures();
  };

  const circlesButton = document.createElement('button');
  circlesButton.className = 'figure-toolbar__button';
  circlesButton.type = 'button';
  circlesButton.textContent = 'Circles';
  circlesButton.addEventListener('click', () => addFigure(new Circle(new Vector3(0, 0, 0), 3)));

  const lineButton = document.createElement('button');
  lineButton.className = 'figure-toolbar__button';
  lineButton.type = 'button';
  lineButton.textContent = 'Line';
  lineButton.addEventListener('click', () => addFigure(new LineSegment()));

  toolbar.append(circlesButton, lineButton);
  const clearButton = document.createElement('button');
  clearButton.className = 'figure-toolbar__button'; clearButton.type = 'button'; clearButton.textContent = 'Clear';
  clearButton.addEventListener('click', () => { figures.length = 0; updateFigures(); });
  toolbar.append(clearButton);

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
  zPlane.onPointerMove((point) => {
    wPlane.setCursorPoint(point ? square(point) : null);
  });
  const mappingContent = document.createElement('div');
  mappingContent.className = 'mapping-content';
  mappingContent.append(
    createPlanePanel('z-plane', zPlane), functionControl, createPlanePanel('w-plane', wPlane),
  );
  const styleToolbar = document.createElement('div');
  styleToolbar.className = 'style-toolbar';
  const color = document.createElement('input'); color.type = 'color'; color.value = '#ffff00'; color.title = 'Figure color'; color.setAttribute('aria-label', 'Figure color');
  color.addEventListener('input', () => { const value = Number.parseInt(color.value.slice(1), 16); zPlane.setFigureStyle({ color: value }); wPlane.setFigureStyle({ color: value }); });
  const opacity = document.createElement('input'); opacity.type = 'range'; opacity.min = '0.1'; opacity.max = '1'; opacity.step = '0.1'; opacity.value = '1'; opacity.title = 'Figure opacity'; opacity.setAttribute('aria-label', 'Figure opacity');
  opacity.addEventListener('input', () => { const value = Number(opacity.value); zPlane.setFigureStyle({ opacity: value }); wPlane.setFigureStyle({ opacity: value }); });
  const gridColor = document.createElement('input'); gridColor.type = 'color'; gridColor.value = '#227799'; gridColor.title = 'Grid color'; gridColor.setAttribute('aria-label', 'Grid color');
  gridColor.addEventListener('input', () => { const value = Number.parseInt(gridColor.value.slice(1), 16); zPlane.setGridStyle({ color: value }); wPlane.setGridStyle({ color: value }); });
  const gridToggle = document.createElement('input'); gridToggle.type = 'checkbox'; gridToggle.checked = true; gridToggle.title = 'Show grid'; gridToggle.setAttribute('aria-label', 'Show grid');
  gridToggle.addEventListener('change', () => { zPlane.setGridStyle({ visible: gridToggle.checked }); wPlane.setGridStyle({ visible: gridToggle.checked }); });
  styleToolbar.append(color, opacity, gridColor, gridToggle);
  const workspace = document.createElement('div');
  workspace.className = 'mapping-workspace';
  workspace.append(toolbar, mappingContent);
  mapping.append(styleToolbar, workspace);

  return mapping;
}
