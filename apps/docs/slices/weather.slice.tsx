import { afterEach, expect, test, vi } from 'vitest';
import { page } from 'vitest/browser';
import { COLORWAYS, capture, openPage } from './harness';

const all = (root: ParentNode, css: string) => [...root.querySelectorAll(css)];
/** Playwright's fill on a range input: set its value as the browser would, then say so (input, change). */
function fillRange(el: HTMLInputElement, value: string) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}
const frame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r)));

afterEach(() => { vi.useRealTimers(); });

// The Weather object on Components › Weather: the sky follows the time of day, the hours and the
// week read their values, every tile draws its own sky, and reduced motion holds one frame.
for (const colorway of COLORWAYS) {
  test(`weather widget in ${colorway}`, async () => {
    await openPage('/components/weather', colorway);
    const widget = page.elementLocator(page.getByTestId(`weather-${colorway}`).element().querySelector('section.mu-weather')!);
    await expect.element(widget).toHaveAttribute('aria-label', 'Weather in Lisbon');
    await expect.element(widget.getByRole('img')).toHaveAttribute('aria-label', expect.stringMatching(/Lisbon: .+, -?\d+°/));
    await expect.poll(() => widget.getByRole('list', { name: 'Next hours' }).getByRole('listitem').elements().length).toBe(6);
    await expect.poll(() => widget.getByRole('list', { name: 'The week' }).getByRole('listitem').elements().length).toBe(7);
    await capture(`weather-${colorway}`, page.getByTestId(`weather-${colorway}`).element());
  });
}

test('every tile draws its own sky', async () => {
  await openPage('/components/weather', 'bone');
  const tiles = () => all(page.getByTestId('weather-tiles-bone').element(), 'section.mu-weather-tile');
  await expect.poll(() => tiles().length).toBe(11);
  expect(all(tiles()[4], 'path[data-layer="rain"]')).toHaveLength(1);
  expect(all(tiles()[6], 'path[data-layer="snow"]')).toHaveLength(1);
  expect(all(tiles()[8], 'path[data-layer="fog"]')).toHaveLength(1);
  expect(all(tiles()[2], 'path[data-layer="sun"]')).toHaveLength(0);
});

test('night brings the moon', async () => {
  await openPage('/components/weather', 'graphite');
  fillRange(page.getByLabelText('Time of day').element() as HTMLInputElement, '22');
  const clear = () => page.getByTestId('weather-tiles-graphite').element().querySelector('section.mu-weather-tile')!;
  await expect.poll(() => all(clear(), 'path[data-layer="moon"]').length).toBe(1);
  expect(all(clear(), 'path[data-layer="sun"]')).toHaveLength(0);
});

test('reduced motion holds one frame', async () => {
  // The sky steps on an interval: run it on a clock the slice controls, and let 700 ms pass on it.
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
  await openPage('/components/weather', 'bone', { media: { 'prefers-reduced-motion': 'reduce' } });
  const rain = () => all(page.getByTestId('weather-tiles-bone').element(), 'section.mu-weather-tile')[4].querySelector('path[data-layer="rain"]')!;
  const first = rain().getAttribute('d');
  vi.advanceTimersByTime(700);
  await frame();
  expect(rain().getAttribute('d')).toBe(first);
});
