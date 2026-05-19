import { createComplexSurface } from "./complex/modular-surface"

export function setupCounter(element) {
  let counter = 0
  const setCounter = (count) => {
    counter = count
    const surface = createComplexSurface(
      {
        reMin: -2,
        reMax: 2,
        imMin: -2,
        imMax: 2,
        resolution: 300,
        scale: 0.2
      },
      (re, im) => {

        // z = x + i y
        // Example:
        // |sin(z)| approximation

        const a = Math.sin(re) * Math.cosh(im);
        const b = Math.cos(re) * Math.sinh(im);

        return Math.sqrt(a * a + b * b);
      }
    );
    element.innerHTML = `Count is ${counter}`
  }
  element.addEventListener('click', () => setCounter(counter + 1))
  setCounter(0)
}
