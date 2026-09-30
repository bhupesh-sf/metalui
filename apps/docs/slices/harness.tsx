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
  /** A reload of the same site: keep local and session storage (a fresh open clears them). */
  reload?: boolean;
  /** The window, when a slice needs another width than the desktop's 1280 × 900 (a phone: 375 × 812). */
  viewport?: [number, number];
}

/**
 * Opens a docs page in a colorway, as the site would: the colorway is the one the site's switch saved.
 * Every open starts clean: media and the window go back to the desktop's unless the slice asks, the store is
 * empty, and the page has come to rest (nothing is left to scroll it).
 */
export async function openPage(path: string, colorway: Colorway, options: OpenOptions = {}) {
  pinOuterPage();
  root?.unmount();
  await commands.media(Object.entries(options.media ?? {}).map(([name, value]) => ({ name, value })));
  await page.viewport(...(options.viewport ?? [1280, 900]));
  // a fresh page has an empty store (the site's saved colorway, motion switch and saved work all live there)
  // and no leftovers on <html>: the new colorway is on it before the first frame, not after the mount
  if (!options.reload) {
    localStorage.clear();
    sessionStorage.clear();
  }
  localStorage.setItem('metalui:colorway', colorway);
  const html = document.documentElement;
  html.classList.remove('rm');
  delete html.dataset.flight;
  html.dataset.muColorway = colorway;
  document.body.innerHTML = '<div id="root"></div>';
  // React Router's <ScrollRestoration> scrolls a new page to the top. When the router has a scroll position
  // to restore (every page after the first in this shared page does), it does so again in a second commit,
  // a transition that lands a few frames after the page is on screen. A slice that scrolls something into
  // view right away would have the page thrown back to the top mid-action, so wait for that commit too.
  let toTop = 0;
  const scrollTo = window.scrollTo;
  window.scrollTo = ((...args: Parameters<typeof scrollTo>) => { toTop++; return scrollTo.apply(window, args); }) as typeof scrollTo;
  try {
    root = createRoot(document.getElementById('root')!);
    const router = createMemoryRouter(routes, { initialEntries: [path] });
    root.render(
      <ColorwayProvider>
        <RouterProvider router={router} />
      </ColorwayProvider>,
    );
    await until(() => document.querySelector('main h1'));
    // the first commit has run its layout effects: a position to restore means a second commit is coming
    if (router.state.restoreScrollPosition != null) await until(() => toTop >= 2);
  } finally {
    window.scrollTo = scrollTo;
  }
  await document.fonts.ready;
  // Captures are of the page, not the sticky header scrolled over it.
  if (!document.getElementById('slice-pin')) {
    const pin = document.createElement('style');
    pin.id = 'slice-pin';
    pin.textContent = 'body > #root header { position: static !important; }';
    document.head.append(pin);
  }
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
/** Real mouse input at an element, as steps; moves are offsets from its centre. */
export const pointer = (el: Element, steps: Step[]) => { pinOuterPage(); return commands.pointer(target(el), steps); };
/** Press and hold at an element's centre (or an offset from it); `release` lets go. */
export const press = (el: Element, at: [number, number] = [0, 0]) => pointer(el, [{ to: at }, { down: true }]);
export const release = (el: Element) => pointer(el, [{ up: true }]);

/**
 * The mouse in page coordinates (clientX/clientY), like a person's: WebDriver moves are offsets from an
 * element's visible centre, and the page's is the middle of the window. A move in steps sends every
 * intermediate point in one go. The button stays held until `up`.
 */
let at: [number, number] = [0, 0];
// WebDriver moves are offsets from an element's in-view centre. The page's own centre shifts by half a
// scrollbar whenever one comes or goes, so the mouse measures from a fixed 16 px anchor at the window's
// top-left instead: its centre is always (8, 8).
const ANCHOR = 16;
function anchor() {
  let a = document.getElementById('slice-anchor');
  if (!a) {
    a = document.createElement('div');
    a.id = 'slice-anchor';
    a.setAttribute('aria-hidden', 'true');
    a.style.cssText = `position:fixed;left:0;top:0;width:${ANCHOR}px;height:${ANCHOR}px;pointer-events:none;opacity:0;z-index:2147483647`;
    document.body.append(a);
  }
  return a;
}
const fromMiddle = (x: number, y: number): [number, number] => [x - ANCHOR / 2, y - ANCHOR / 2];

/**
 * The slice's page is a frame inside Vitest's own page, which is a few pixels taller than the window
 * (904 in 900). A slice that scrolls something into view can scroll that outer page too, shifting the
 * whole frame, so WebDriver's coordinates and the page's disagree by those pixels. Pin it: back at the
 * top, and clipped so nothing can scroll it again.
 */
function pinOuterPage() {
  if (window.parent === window) return;
  const outer = window.parent.document.documentElement;
  if (outer.style.overflow !== 'clip') {
    outer.style.overflow = 'clip';
    window.parent.document.body.style.overflow = 'clip';
  }
  window.parent.scrollTo(0, 0);
}
export const mouse = {
  async move(x: number, y: number, opts: { steps?: number } = {}) {
    const n = Math.max(1, opts.steps ?? 1);
    const [x0, y0] = at;
    const steps: Step[] = Array.from({ length: n }, (_, i) => ({ to: fromMiddle(x0 + ((x - x0) * (i + 1)) / n, y0 + ((y - y0) * (i + 1)) / n) }));
    at = [x, y];
    await pointer(anchor(), steps);
  },
  // a WebDriver action chain starts at the page's corner: press and release where the mouse is
  down: () => pointer(anchor(), [{ to: fromMiddle(...at) }, { down: true }]),
  up: () => pointer(anchor(), [{ to: fromMiddle(...at) }, { up: true }]),
  /**
   * A whole drag in one go: press at `from`, move to `to` in `steps`, hold `hold` ms, let go. Use it
   * whenever the page captures the pointer: Chrome drops pointer capture at the end of every WebDriver
   * call (the button stays held, the capture does not), so a drag split across calls loses it.
   * To look at the page mid-drag, don't await it at once: check during the hold, then await it.
   *
   *   const done = mouse.drag([x0, y0], [x1, y1], { hold: 600 });
   *   await until(() => target.hasAttribute('data-over'));
   *   await done;
   */
  drag(from: [number, number], to: [number, number], opts: { steps?: number; hold?: number } = {}) {
    const n = Math.max(1, opts.steps ?? 8);
    const steps: Step[] = [{ to: fromMiddle(...from) }, { down: true }];
    for (let i = 1; i <= n; i++) steps.push({ to: fromMiddle(from[0] + ((to[0] - from[0]) * i) / n, from[1] + ((to[1] - from[1]) * i) / n) });
    if (opts.hold) steps.push({ pause: opts.hold });
    steps.push({ up: true });
    at = to;
    return pointer(anchor(), steps);
  },
};

/** Writes a docs capture (docs/captures/web/<name>.png), only when CAPTURE=1: captures are for the docs, not every run. */
export async function capture(name: string, element: Element) {
  if (!__CAPTURE__) return;
  await page.screenshot({ element, path: `../../../docs/captures/web/${name}.png` });
}
