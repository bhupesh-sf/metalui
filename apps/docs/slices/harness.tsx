import { createRoot, type Root } from 'react-dom/client';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { commands, page, userEvent as vitestUserEvent, type Locator } from 'vitest/browser';
import '../src/styles.css';
import { ColorwayProvider } from '../src/app/colorway';
import { routes } from '../src/app/routes';

/* The harness a slice runs on: the docs site's own route table, mounted in memory at a route, in a
 * colorway, inside the test's real Chrome page. A slice then reads the page and drives real input. */

declare const __CAPTURE__: boolean;
declare module 'vitest/browser' {
  interface BrowserCommands {
    media: (features: { name: string; value: string }[]) => Promise<void>;
    devtoolsInput: (calls: { method: string; params: object }[]) => Promise<void>;
  }
}

export type Colorway = 'bone' | 'graphite';
export const COLORWAYS: Colorway[] = ['bone', 'graphite'];

let root: Root | null = null;

// The page's own clock, taken before any slice can fake it: the harness's waits and a gesture's pauses
// run on real time, so a slice on fake timers can't freeze them.
const realTimeout = window.setTimeout.bind(window);
const realFrame = window.requestAnimationFrame.bind(window);
const realNow = performance.now.bind(performance);

// What the page was last opened with: a browser call only when the media or the window change.
let lastMedia = '';
let lastViewport = '';

export interface OpenOptions {
  /** CSS media features the page sees, e.g. { 'prefers-reduced-motion': 'reduce' }. */
  media?: Record<string, string>;
  /** A reload of the same site: keep local and session storage (a fresh open clears them). */
  reload?: boolean;
  /** The window, when a slice needs another width than the desktop's 1280 × 900 (a phone: 375 × 812). */
  viewport?: [number, number];
}

/**
 * The CSS media features the page sees from now on, replacing any set before (Increase Contrast, Reduce
 * Transparency). Always set them here, never with the raw command: the next open resets only what it knows.
 */
export async function emulateMedia(features: Record<string, string>) {
  const media = JSON.stringify(Object.entries(features).map(([name, value]) => ({ name, value })));
  if (media !== lastMedia) { await commands.media(JSON.parse(media)); lastMedia = media; }
}

/**
 * Opens a docs page in a colorway, as the site would: the colorway is the one the site's switch saved.
 * Every open starts clean: media and the window go back to the desktop's unless the slice asks, the store is
 * empty, and the page has come to rest (nothing is left to scroll it).
 */
export async function openPage(path: string, colorway: Colorway, options: OpenOptions = {}) {
  pinOuterPage();
  await letGo();
  root?.unmount();
  await emulateMedia(options.media ?? {});
  const viewport = options.viewport ?? [1280, 900];
  if (viewport.join('x') !== lastViewport) { await page.viewport(...viewport); lastViewport = viewport.join('x'); }
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
  // The page has come to rest: its layout held for 60 ms (parts that mount late, a measured height), so a
  // slice can measure where things are and aim there. A page that never rests (a clock) is let go after 1.5 s.
  let shape = '';
  let since = realNow();
  await until(() => {
    const main = document.querySelector('main') ?? document.body;
    const r = main.getBoundingClientRect();
    const now = `${document.documentElement.scrollHeight},${r.width},${r.height},${main.querySelectorAll('*').length}`;
    if (now !== shape) { shape = now; since = realNow(); return false; }
    return realNow() - since >= 60;
  }, 1_500).catch(() => {});
}

export const sleep = (ms: number) => new Promise((r) => realTimeout(r, ms));

/** Waits for a condition the page reaches on its own (a route loaded, an element shown). */
export async function until<T>(read: () => T | null | undefined | false, timeout = 10_000): Promise<T> {
  const start = realNow();
  for (;;) {
    const v = read();
    if (v) return v;
    if (realNow() - start > timeout) throw new Error(`until: not reached in ${timeout} ms`);
    await new Promise((r) => realFrame(r));
  }
}

/* ───────────────────────── input ─────────────────────────
 * Real input, sent straight to the page over Chrome's DevTools socket (Input.dispatchMouseEvent and
 * dispatchKeyEvent): trusted events, so CSS :active, :focus-visible and pointer capture behave as for a
 * person, in about 5 ms a call (WebDriver took 140-250 ms). A gesture is one call; the button stays
 * held between calls, and so does pointer capture. Coordinates are the page's (clientX/clientY). */

type Call = { method: string; params: object };
function send(calls: Call[]) {
  pinOuterPage();
  return calls.length ? commands.devtoolsInput(calls) : Promise.resolve();
}

/** The page's coordinates in the window's: the slice's page is a frame inside Vitest's own. */
function toWindow(x: number, y: number): [number, number] {
  const frame = window.frameElement?.getBoundingClientRect();
  if (!frame) return [x, y];
  const k = frame.width / window.innerWidth || 1;
  return [frame.left + x * k, frame.top + y * k];
}

/**
 * The slice's page is a frame inside Vitest's own page, which is a few pixels taller than the window
 * (904 in 900). A slice that scrolls something into view can scroll that outer page too, shifting the
 * whole frame. Pin it: back at the top, and clipped so nothing can scroll it again.
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

let at: [number, number] = [0, 0];
let held = 0; // buttons down: 1 left, 2 right
const mouseCall = (type: 'mouseMoved' | 'mousePressed' | 'mouseReleased', x: number, y: number, button: 'left' | 'right' = 'left', clickCount = 1): Call => {
  const [wx, wy] = toWindow(x, y);
  const bit = button === 'right' ? 2 : 1;
  if (type === 'mousePressed') held |= bit;
  if (type === 'mouseReleased') held &= ~bit;
  return { method: 'Input.dispatchMouseEvent', params: { type, x: wx, y: wy, buttons: held, button: type === 'mouseMoved' ? (held & 1 ? 'left' : held & 2 ? 'right' : 'none') : button, clickCount: type === 'mouseMoved' ? 0 : clickCount, pointerType: 'mouse' } };
};

type Point = [number, number];
type Move = { to: Point; steps?: number; ms?: number };
/** Runs a gesture: moves (in steps), presses, releases and pauses, in order; pauses are real time. */
async function gesture(parts: (Move | { down: true; button?: 'left' | 'right' } | { up: true; button?: 'left' | 'right' } | { pause: number })[]) {
  let calls: Call[] = [];
  const flush = async () => { await send(calls); calls = []; };
  for (const p of parts) {
    if ('to' in p) {
      const n = Math.max(1, p.steps ?? 1);
      const [x0, y0] = at;
      for (let i = 1; i <= n; i++) {
        if (p.ms) { await flush(); await sleep(p.ms / n); }
        calls.push(mouseCall('mouseMoved', x0 + ((p.to[0] - x0) * i) / n, y0 + ((p.to[1] - y0) * i) / n));
      }
      at = p.to;
    } else if ('down' in p) calls.push(mouseCall('mousePressed', ...at, p.button));
    else if ('up' in p) calls.push(mouseCall('mouseReleased', ...at, p.button));
    else { await flush(); await sleep(p.pause); }
  }
  await flush();
}

/** An element's visible centre, as a person would aim: the middle of the part of it that is in the window. */
function centreOf(el: Element): Point {
  const r = el.getBoundingClientRect();
  const x0 = Math.max(r.left, 0), x1 = Math.min(r.right, window.innerWidth);
  const y0 = Math.max(r.top, 0), y1 = Math.min(r.bottom, window.innerHeight);
  return x1 > x0 && y1 > y0 ? [(x0 + x1) / 2, (y0 + y1) / 2] : [r.left + r.width / 2, r.top + r.height / 2];
}

type Step = { to: [number, number]; ms?: number } | { down: true } | { up: true } | { pause: number };
/**
 * Real mouse input at an element, as steps; moves are offsets from its visible centre. With no button held
 * it aims first, as a click does (in the window, still, and the point is its own); mid-drag the element is
 * the thing in hand, so it is used where it is.
 */
export async function pointer(el: Element, steps: Step[]) {
  const [cx, cy] = held ? centreOf(el) : (await aim(el))[1];
  return gesture(steps.map((s) => ('to' in s ? { to: [cx + s.to[0], cy + s.to[1]] as Point, ms: s.ms } : s)));
}
/** Press and hold at an element's centre (or an offset from it); `release` lets go. */
export const press = (el: Element, at: [number, number] = [0, 0]) => pointer(el, [{ to: at }, { down: true }]);
export const release = (el: Element) => gesture([{ up: true }]);

/** The mouse in page coordinates (clientX/clientY). The button, and any pointer capture, holds between calls. */
export const mouse = {
  move: (x: number, y: number, opts: { steps?: number } = {}) => gesture([{ to: [x, y], steps: opts.steps }]),
  down: () => gesture([{ down: true }]),
  up: () => gesture([{ up: true }]),
  click: (x: number, y: number) => gesture([{ to: [x, y] }, { down: true }, { up: true }]),
  /**
   * A whole drag: press at `from`, move to `to` in `steps`, hold `hold` ms, let go. To look at the page
   * mid-drag, don't await it at once: check during the hold, then await it.
   *
   *   const done = mouse.drag([x0, y0], [x1, y1], { hold: 600 });
   *   await until(() => target.hasAttribute('data-over'));
   *   await done;
   */
  drag: (from: Point, to: Point, opts: { steps?: number; hold?: number } = {}) =>
    gesture([{ to: from }, { down: true }, { to, steps: opts.steps ?? 8 }, ...(opts.hold ? [{ pause: opts.hold }] : []), { up: true }]),
};

/** The element a locator or element names. */
const elementOf = (t: Element | Locator) => (t instanceof Element ? t : t.element());

/**
 * Ready to take a click, as a person's aim would be: in the window, holding still (a card that springs in,
 * a flyer landing), and the point under the aim is the element's own.
 */
async function aim(t: Element | Locator): Promise<[Element, Point]> {
  const el = await until(() => { try { return elementOf(t); } catch { return null; } }, 10_000);
  const r0 = el.getBoundingClientRect();
  const scrolled = r0.top < 0 || r0.left < 0 || r0.bottom > window.innerHeight || r0.right > window.innerWidth;
  if (scrolled) el.scrollIntoView({ block: 'center', inline: 'center' });
  // Still is measured in time, not frames: frames are unthrottled here, so two can pass in a millisecond.
  // Content that mounts as the page scrolls moves things some 20 ms later, so a scroll waits longer.
  // Covered by something fixed (a tuning panel over the page's foot), it is brought to the middle once, as a
  // person would; something drawn over it on purpose never passes the hit test, so it is aimed at anyway,
  // and so is something that never holds still (a drifting object on the home table).
  let settle = scrolled ? 100 : 30;
  let recentred = false;
  let last = '';
  let stillSince = 0;
  await until(() => {
    const r = el.getBoundingClientRect();
    const now = `${r.x.toFixed(1)},${r.y.toFixed(1)},${r.width.toFixed(1)},${r.height.toFixed(1)}`;
    if (now !== last) { last = now; stillSince = realNow(); return false; }
    const still = realNow() - stillSince;
    if (still < settle) return false;
    const hit = document.elementFromPoint(...centreOf(el));
    if (hit && (el === hit || el.contains(hit))) return true;
    if (!recentred) {
      recentred = true;
      el.scrollIntoView({ block: 'center', inline: 'center' });
      settle = 100;
      last = '';
      return false;
    }
    return still > 400;
  }, 1_500).catch(() => { /* never still (it drifts on purpose): aim where it is now */ });
  return [el, centreOf(el)];
}

/* Keys: the same syntax Vitest's userEvent.keyboard takes. {Name} is a key, {Name>} holds it and {/Name}
 * lets it go; [Code] names a physical key the same ways; any other character is typed. */
const KEYS: Record<string, { code: string; vk: number; text?: string }> = {
  Enter: { code: 'Enter', vk: 13, text: '\r' }, Escape: { code: 'Escape', vk: 27 }, Tab: { code: 'Tab', vk: 9 },
  Backspace: { code: 'Backspace', vk: 8 }, Delete: { code: 'Delete', vk: 46 }, ' ': { code: 'Space', vk: 32, text: ' ' },
  Space: { code: 'Space', vk: 32, text: ' ' }, ArrowUp: { code: 'ArrowUp', vk: 38 }, ArrowDown: { code: 'ArrowDown', vk: 40 },
  ArrowLeft: { code: 'ArrowLeft', vk: 37 }, ArrowRight: { code: 'ArrowRight', vk: 39 }, Home: { code: 'Home', vk: 36 },
  End: { code: 'End', vk: 35 }, PageUp: { code: 'PageUp', vk: 33 }, PageDown: { code: 'PageDown', vk: 34 },
  Shift: { code: 'ShiftLeft', vk: 16 }, Control: { code: 'ControlLeft', vk: 17 }, Alt: { code: 'AltLeft', vk: 18 },
  Meta: { code: 'MetaLeft', vk: 91 },
};
const MODIFIER: Record<string, number> = { Alt: 1, Control: 2, Meta: 4, Shift: 8 };
let modifiers = 0;
function keyOf(name: string) {
  if (KEYS[name]) return { key: name === 'Space' ? ' ' : name, ...KEYS[name] };
  if (name.length === 1) {
    const up = name.toUpperCase();
    const code = /[a-z]/i.test(name) ? `Key${up}` : /[0-9]/.test(name) ? `Digit${name}` : '';
    return { key: name, code, vk: /[a-z0-9]/i.test(name) ? up.charCodeAt(0) : 0, text: name };
  }
  throw new Error(`keyboard: no key named ${name}`);
}
const keyCall = (type: 'keyDown' | 'keyUp', k: ReturnType<typeof keyOf>): Call => ({
  method: 'Input.dispatchKeyEvent',
  params: { type: type === 'keyDown' && k.text ? 'keyDown' : type === 'keyDown' ? 'rawKeyDown' : 'keyUp', key: k.key, code: k.code, windowsVirtualKeyCode: k.vk, modifiers, ...(type === 'keyDown' && k.text ? { text: k.text, unmodifiedText: k.text } : {}) },
});
/**
 * Hands off: any button or modifier a slice left down is let go, so the next slice starts clean (a Shift
 * still down turns its clicks into shift-clicks; a button still down turns its clicks into drags).
 */
async function letGo() {
  const calls: Call[] = [];
  for (const [name, bit] of Object.entries(MODIFIER)) if (modifiers & bit) { modifiers &= ~bit; calls.push(keyCall('keyUp', keyOf(name))); }
  if (held & 1) calls.push(mouseCall('mouseReleased', ...at, 'left'));
  if (held & 2) calls.push(mouseCall('mouseReleased', ...at, 'right'));
  await send(calls);
}
function keyboardCalls(text: string): Call[] {
  const calls: Call[] = [];
  const re = /\{(\/?)([^}>]+|\{)(>?)\}|\[(\/?)([^\]>]+)(>?)\]|([\s\S])/g;
  for (const m of text.matchAll(re)) {
    const [, relB, nameB, holdB, relC, nameC, holdC, char] = m;
    const name = nameB ?? (nameC ? (nameC === 'Space' ? ' ' : nameC) : char);
    const release = Boolean(relB || relC), hold = Boolean(holdB || holdC);
    const k = keyOf(name);
    if (!release) {
      calls.push(keyCall('keyDown', k));
      if (MODIFIER[name]) modifiers |= MODIFIER[name];
    }
    if (release || !hold) {
      if (MODIFIER[name]) modifiers &= ~MODIFIER[name];
      calls.push(keyCall('keyUp', k));
    }
  }
  return calls;
}

/**
 * Vitest's userEvent, on the DevTools socket: the same calls the slices make, with real, trusted input
 * and a click aimed like a person's (in the window, holding still). paste is Vitest's own.
 */
const PRESS_EVENTS = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click', 'auxclick', 'dblclick', 'contextmenu'];
/**
 * A press that must land on its element. The aim is taken in the page, but the press arrives a round trip
 * later, and a busy machine can move the page in between; so, as Playwright does, the page checks where it
 * lands: a press that lands elsewhere is swallowed before the page sees it, and the aim is taken again. The
 * last try is not guarded, so a click meant to go through something drawn over the element still does.
 */
async function pressOn(t: Element | Locator, run: (p: Point) => Promise<void>) {
  for (let attempt = 1; ; attempt++) {
    const [el, p] = await aim(t);
    if (attempt === 3) return run(p);
    let verdict: boolean | null = null;
    const guard = (e: Event) => {
      if (verdict === null) verdict = e.target instanceof Node && (e.target === el || el.contains(e.target));
      if (!verdict) { e.preventDefault(); e.stopImmediatePropagation(); }
    };
    for (const type of PRESS_EVENTS) window.addEventListener(type, guard, true);
    try { await run(p); } finally { for (const type of PRESS_EVENTS) window.removeEventListener(type, guard, true); }
    if (verdict !== false) return;
  }
}

export const userEvent = {
  click: (t: Element | Locator, options: { button?: 'left' | 'right' } = {}) =>
    pressOn(t, (p) => gesture([{ to: p }, { down: true, button: options.button }, { up: true, button: options.button }])),
  dblClick: (t: Element | Locator) =>
    pressOn(t, async ([x, y]) => {
      at = [x, y];
      await send([mouseCall('mouseMoved', x, y), mouseCall('mousePressed', x, y, 'left', 1), mouseCall('mouseReleased', x, y, 'left', 1), mouseCall('mousePressed', x, y, 'left', 2), mouseCall('mouseReleased', x, y, 'left', 2)]);
    }),
  async hover(t: Element | Locator) {
    const [, p] = await aim(t);
    await gesture([{ to: p }]);
  },
  async unhover() {
    await gesture([{ to: [0, 0] }]);
  },
  keyboard: (text: string) => send(keyboardCalls(text)),
  /** Clear the field and type the text into it, as fill does: focus, select all, then the new text. */
  async fill(t: Element | Locator, text: string) {
    const el = (await aim(t))[0] as HTMLInputElement | HTMLTextAreaElement | HTMLElement;
    el.focus();
    if ('select' in el && typeof el.select === 'function') el.select();
    else document.getSelection()?.selectAllChildren(el);
    await send(text ? [{ method: 'Input.insertText', params: { text } }] : keyboardCalls('{Backspace}'));
  },
  paste: () => vitestUserEvent.paste(),
};

/** Writes a docs capture (docs/captures/web/<name>.png), only when CAPTURE=1: captures are for the docs, not every run. */
export async function capture(name: string, element: Element) {
  if (!__CAPTURE__) return;
  await page.screenshot({ element, path: `../../../docs/captures/web/${name}.png` });
}
