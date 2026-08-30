const SVG_NS = 'http://www.w3.org/2000/svg';

type IconName = 'circle' | 'circles' | 'line' | 'lines' | 'cassini' | 'cassinis' | 'ellipse' | 'ellipses' | 'clear' | 'resolution';

const paths: Record<IconName, string> = {
  circle: '<circle cx="12" cy="12" r="7" />',
  circles: '<circle cx="12" cy="12" r="3" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="9" />',
  line: '<path d="M4 18 20 6" />',
  lines: '<path d="M4 18 20 10M4 12 20 4M4 20 20 12" />',
  cassini: '<path d="M4 12c2-5 5-5 8 0s6 5 8 0c-2 5-5 5-8 0s-6-5-8 0Z" />',
  cassinis: '<path d="M3 12c2-3 4-3 6 0s4 3 6 0 4-3 6 0M3 12c2 5 4 5 6 0s4-5 6 0 4 5 6 0" />',
  ellipse: '<ellipse cx="12" cy="12" rx="8" ry="5" />',
  ellipses: '<ellipse cx="12" cy="12" rx="4" ry="2.5" /><ellipse cx="12" cy="12" rx="7" ry="4" /><ellipse cx="12" cy="12" rx="10" ry="5.5" />',
  clear: '<path d="m6 6 12 12M18 6 6 18" />',
  resolution: '<path d="M4 7h16M4 12h16M4 17h16" /><circle cx="8" cy="7" r="1.5" fill="currentColor" /><circle cx="15" cy="12" r="1.5" fill="currentColor" /><circle cx="11" cy="17" r="1.5" fill="currentColor" />',
};

export function createIcon(name: IconName, label: string): SVGSVGElement {
  const icon = document.createElementNS(SVG_NS, 'svg');
  icon.setAttribute('viewBox', '0 0 24 24');
  icon.setAttribute('aria-hidden', 'true');
  icon.setAttribute('focusable', 'false');
  icon.classList.add('figure-toolbar__icon');
  icon.innerHTML = paths[name];
  icon.querySelectorAll('path, circle, ellipse').forEach((element) => {
    if (!element.getAttribute('fill')) element.setAttribute('fill', 'none');
    element.setAttribute('stroke', 'currentColor');
    element.setAttribute('stroke-width', '1.8');
    element.setAttribute('stroke-linecap', 'round');
    element.setAttribute('stroke-linejoin', 'round');
  });
  icon.setAttribute('aria-label', label);
  return icon;
}
