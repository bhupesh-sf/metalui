import { createRoot, type Root } from 'react-dom/client';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { commands, page } from 'vitest/browser';
import '../src/styles.css';
import { ColorwayProvider } from '../src/app/colorway';
import { routes } from '../src/app/routes';

/* The harness a slice runs on: the docs site's own route table, mounted in memory at a route, in a
 * colorway, inside the test's real Chrome page. A slice then reads the page and drives real input. */

declare const __CAPTURE__: boolean;
declare module 'vitest/browser' {
  interface BrowserCommands {
    pointer: (selector: string, steps: ({ to: [number, number]; ms?: number } | { down: true } | { up: true } | { pause: number })[]) => Promise<void>;
    media: (features: { name: string; value: string }[]) => Promise<void>;
  }
}

export type Colorway = 'bone' | 'graphite';
export const COLORWAYS: Colorway[] = ['bone', 'graphite'];

let root: Root | null = null;

export interface OpenOptions {
  /** CSS media features the page sees, e.g. { 'prefers-reduced-motion': 'reduce' }. */
  media?: Record<string, string>;
  /** The window, when a slice needs another width than the desktop's 1280 × 900 (a phone: 375 × 812). */
  viewport?: [number, number];
}

/**
 * Opens a docs page in a colorway, as the site would: the colorway is the one the site's switch saved.
 * Every open starts clean: media and the window go back to the desktop's unless the slice asks.
 */
export async function openPage(path: string, colorway: Colorway, options: OpenOptions = {}) {
  root?.unmount();
  await commands.media(Object.entries(options.media ?? {}).map(([name, value]) => ({ name, value })));
  await page.viewport(...(options.viewport ?? [1280, 900]));
  localStorage.setItem('metalui:colorway', colorway);
  document.body.innerHTML = '<div id="root"></div>';
  root = createRoot(document.getElementById('root')!);
  root.render(
    <ColorwayProvider>
      <RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />
    </ColorwayProvider>,
  );
  await until(() => document.querySelector('main h1'));
  await document.fonts.ready;
  // Captures are of the page, not the sticky header scrolled over it.
  const pin = document.createElement('style');
  pin.textContent = 'body > #root header { position: static !important; }';
  document.head.append(pin);
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Waits for a condition the page reaches on its own (a route loaded, an element shown). */
export async function until<T>(read: () => T | null | undefined | false, timeout = 10_000): Promise<T> {
  const start = performance.now();
  for (;;) {
    const v = read();
    if (v) return v;
    if (performance.now() - start > timeout) throw new Error(`until: not reached in ${timeout} ms`);
    await new Promise((r) => requestAnimationFrame(r));
  }
}

/** A plain CSS handle on an element for WebDriver, found at once (a role selector is resolved by polling). */
let targets = 0;
export function target(el: Element) {
  let id = el.getAttribute('data-slice-target');
  if (!id) { id = String(++targets); el.setAttribute('data-slice-target', id); }
  return `[data-slice-target="${id}"]`;
}
type Step = { to: [number, number]; ms?: number } | { down: true } | { up: true } | { pause: number };
/** Real mouse input at an element, as steps; moves are offsets from its centre. The button stays held between calls. */
export const pointer = (el: Element, steps: Step[]) => commands.pointer(target(el), steps);
/** Press and hold at an element's centre (or an offset from it); `release` lets go. */
export const press = (el: Element, at: [number, number] = [0, 0]) => pointer(el, [{ to: at }, { down: true }]);
export const release = (el: Element) => pointer(el, [{ up: true }]);

/**
 * The mouse in page coordinates (clientX/clientY), like a person's: WebDriver moves are offsets from an
 * element's visible centre, and the page's is the middle of the window. A move in steps sends every
 * intermediate point in one go. The button stays held until `up`.
 */
let at: [number, number] = [0, 0];
const fromMiddle = (x: number, y: number): [number, number] => [x - document.documentElement.clientWidth / 2, y - document.documentElement.clientHeight / 2];
export const mouse = {
  async move(x: number, y: number, opts: { steps?: number } = {}) {
    const n = Math.max(1, opts.steps ?? 1);
    const [x0, y0] = at;
    const steps: Step[] = Array.from({ length: n }, (_, i) => ({ to: fromMiddle(x0 + ((x - x0) * (i + 1)) / n, y0 + ((y - y0) * (i + 1)) / n) }));
    at = [x, y];
    await pointer(document.documentElement, steps);
  },
  down: () => pointer(document.documentElement, [{ down: true }]),
  up: () => pointer(document.documentElement, [{ up: true }]),
};

/** Writes a docs capture (docs/captures/web/<name>.png), only when CAPTURE=1: captures are for the docs, not every run. */
export async function capture(name: string, element: Element) {
  if (!__CAPTURE__) return;
  await page.screenshot({ element, path: `../../../docs/captures/web/${name}.png` });
}
