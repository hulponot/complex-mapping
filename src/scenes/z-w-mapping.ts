import { ComplexPlane } from './complex-plane';
import { Circle } from '../figures/circle';
import { LineSegment } from '../figures/line-segment';
import { CassiniOvals, Ellipses } from '../figures/two-pole';
import type { Figure } from '../figures/figure';
import { COMPLEX_MAPPINGS, mapSampledFigure } from '../mappings/complex-mapping';
import { addFigure as addFigureToState, clearFigures, createMappingState, moveControlPoint, resampleFigures, setMapping, setSampleCount } from './mapping-state';
import { defaultStyleState } from './style-state';
import { createIcon } from '../ui/icons';

const SAMPLE_COUNTS = [64, 128, 256, 512];

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
  const selectedMapping = COMPLEX_MAPPINGS[0];
  const state = createMappingState(selectedMapping.mapping);
  const styles = defaultStyleState();
  const updateFigures = (): void => {
    resampleFigures(state);
    zPlane.setFigures(state.sampledFigures);
    wPlane.setFigures(state.sampledFigures.map((figure) => mapSampledFigure(figure, state.mapping)));
    zPlane.setFigureStyle({ color: styles.figureColor, opacity: styles.figureOpacity });
    wPlane.setFigureStyle({ color: styles.figureColor, opacity: styles.figureOpacity });
    zPlane.setGridStyle({ color: styles.gridColor, visible: styles.gridVisible });
    wPlane.setGridStyle({ color: styles.gridColor, visible: styles.gridVisible });
  };

  const toolbar = document.createElement('aside');
  toolbar.className = 'figure-toolbar';
  toolbar.setAttribute('aria-label', 'Figures');

  const addFigure = (figure: Figure): void => {
    addFigureToState(state, figure);
    updateFigures();
  };

  const createFigureButton = (label: string, icon: Parameters<typeof createIcon>[0], onClick: () => void): HTMLButtonElement => {
    const button = document.createElement('button');
    button.className = 'figure-toolbar__button';
    button.type = 'button';
    button.append(createIcon(icon, label), document.createTextNode(label));
    button.addEventListener('click', onClick);
    return button;
  };

  const circlesButton = createFigureButton('Circles', 'circle', () => addFigure(new Circle()));
  const lineButton = createFigureButton('Line', 'line', () => addFigure(new LineSegment()));
  const cassiniButton = createFigureButton('Cassini', 'cassini', () => addFigure(new CassiniOvals()));
  cassiniButton.title = 'Loci where r₁ · r₂ is constant';
  const ellipseButton = createFigureButton('Ellipses', 'ellipse', () => addFigure(new Ellipses()));
  ellipseButton.title = 'Loci where r₁ + r₂ is constant';

  toolbar.append(circlesButton, lineButton, cassiniButton, ellipseButton);
  const clearButton = createFigureButton('Clear', 'clear', () => { clearFigures(state); updateFigures(); });
  toolbar.append(clearButton);

  const resolutionButton = createFigureButton(`Resolution: ${state.sampleCount}`, 'resolution', () => {
    const current = SAMPLE_COUNTS.indexOf(state.sampleCount);
    const next = SAMPLE_COUNTS[(current + 1) % SAMPLE_COUNTS.length];
    setSampleCount(state, next);
    resolutionButton.lastChild!.textContent = `Resolution: ${next}`;
    updateFigures();
  });
  resolutionButton.title = 'Cycle drawing resolution';
  toolbar.append(resolutionButton);

  const functionControl = document.createElement('div');
  functionControl.className = 'mapping-function';

  const label = document.createElement('label');
  label.className = 'mapping-function__label';
  label.htmlFor = 'mapping-function-select';
  label.textContent = 'Mapping';

  const select = document.createElement('select');
  select.className = 'mapping-function__select';
  select.id = 'mapping-function-select';
  select.setAttribute('aria-label', 'Choose a complex mapping');
  COMPLEX_MAPPINGS.forEach((option, index) => {
    const selectOption = document.createElement('option');
    selectOption.value = String(index);
    selectOption.textContent = option.label;
    select.append(selectOption);
  });

  const input = document.createElement('input');
  input.className = 'mapping-function__input';
  input.id = 'mapping-function-input';
  input.type = 'text';
  input.placeholder = selectedMapping.formula;
  input.readOnly = true;
  input.setAttribute('aria-describedby', 'mapping-function-hint');

  const hint = document.createElement('p');
  hint.className = 'mapping-function__hint';
  hint.id = 'mapping-function-hint';
  hint.textContent = selectedMapping.formula;

  select.addEventListener('change', () => {
    const option = COMPLEX_MAPPINGS[Number(select.value)];
    if (!option) return;
    setMapping(state, option.mapping);
    input.placeholder = option.formula;
    hint.textContent = option.formula;
    updateFigures();
  });

  functionControl.append(label, select, input, hint);
  zPlane.onPointerMove((point) => {
    wPlane.setCursorPoint(point ? state.mapping(point) : null);
  });
  zPlane.onControlPointDrag(({ figureId, controlPointId, point }) => {
    moveControlPoint(state, figureId, controlPointId, point);
    updateFigures();
  });
  const mappingContent = document.createElement('div');
  mappingContent.className = 'mapping-content';
  mappingContent.append(
    toolbar,
    createPlanePanel('z-plane', zPlane),
    functionControl,
    createPlanePanel('w-plane', wPlane),
  );
  const styleToolbar = document.createElement('div');
  styleToolbar.className = 'style-toolbar';
  const color = document.createElement('input'); color.type = 'color'; color.value = '#ffff00'; color.title = 'Figure color'; color.setAttribute('aria-label', 'Figure color');
  color.addEventListener('input', () => { styles.figureColor = Number.parseInt(color.value.slice(1), 16); updateFigures(); });
  const opacity = document.createElement('input'); opacity.type = 'range'; opacity.min = '0.1'; opacity.max = '1'; opacity.step = '0.1'; opacity.value = '1'; opacity.title = 'Figure opacity'; opacity.setAttribute('aria-label', 'Figure opacity');
  opacity.addEventListener('input', () => { styles.figureOpacity = Number(opacity.value); updateFigures(); });
  const gridColor = document.createElement('input'); gridColor.type = 'color'; gridColor.value = '#227799'; gridColor.title = 'Grid color'; gridColor.setAttribute('aria-label', 'Grid color');
  gridColor.addEventListener('input', () => { styles.gridColor = Number.parseInt(gridColor.value.slice(1), 16); updateFigures(); });
  const gridToggle = document.createElement('input'); gridToggle.type = 'checkbox'; gridToggle.checked = true; gridToggle.title = 'Show grid'; gridToggle.setAttribute('aria-label', 'Show grid');
  gridToggle.addEventListener('change', () => { styles.gridVisible = gridToggle.checked; updateFigures(); });
  styleToolbar.append(color, opacity, gridColor, gridToggle);
  const workspace = document.createElement('div');
  workspace.className = 'mapping-workspace';
  workspace.append(mappingContent);
  mapping.append(styleToolbar, workspace);

  const resize = (): void => {
    const width = Math.max(1, Math.floor(zPlane.domElement.clientWidth || 300));
    const height = Math.max(1, Math.floor(zPlane.domElement.clientHeight || 300));
    zPlane.resize(width, height);
    wPlane.resize(width, height);
  };
  window.addEventListener('resize', resize);
  resize();
  updateFigures();

  return mapping;
}
