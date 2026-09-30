import { afterEach, expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { COLORWAYS, capture, openPage, until } from './harness';

// The drawer, a slab gadget drawn from its spec: a tray under the top's front edge with a pull on its
// front, its cards standing to the fill, run out and home by slide-out, held out when open, and stuck
// out when too full to close.
const trayRaw = (e: Element) => {
  const t = e.querySelector('[data-id="tray"] [data-moves]')!.getAttribute('transform') ?? '';
  return Number(t.match(/translate\(([-\d.]+)[ ,]+([-\d.]+)\)/)?.[2] ?? 0) - (t.includes('rotate') ? 206 : 0);
};
const trayY = (e: Element) => {
  const t = e.querySelector('[data-id="tray"] [data-moves]')!.getAttribute('transform') ?? '';
  const m = t.match(/translate\(([-\d.]+)[ ,]+([-\d.]+)\)/);
  return m ? Math.round(Number(m[2]) - (t.includes('rotate') ? 206 : 0)) : 0;
};
const cards = (e: Element) => Number(e.querySelector('[data-part="tray"]')!.getAttribute('data-fill'));
const all = (css: string) => [...document.querySelectorAll(css)];
/** A Base UI switch by its aria-label: the locator engine's role query does not name these (harness candidate). */
const toggle = (name: string) => page.elementLocator(document.querySelector(`[role="switch"][aria-label="${name}"]`)!);
const realTimeout = setTimeout;
/** Lets React commit what the frames set (it schedules on a message, not a timer). */
const settle = () => new Promise((r) => realTimeout(r, 0));
/** Runs the page's frames for `ms`, letting React commit after each; `each` samples after every step. */
async function run(ms: number, step = 16, each?: () => void) { for (let t = 0; t < ms; t += step) { vi.advanceTimersByTime(step); await settle(); each?.(); } }
/**
 * The page's clock, run by the slice: it carries on from the real one (a drive already under way keeps
 * its time) and moves only when the slice advances it. It starts once the page has settled on its
 * colorway: the shared page keeps the last slice's colorway on <html> until the site's effect sets this
 * one, and a gadget that sees the change redraws with a new player or drive (harness candidate: set the
 * colorway before the first render, as a fresh page load does).
 */
async function clock() {
  const colorway = localStorage.getItem('metalui:colorway');
  await until(() => document.documentElement.dataset.muColorway === colorway
    && [...document.querySelectorAll('svg[data-gadget][data-host]')].every((e) => e.getAttribute('data-host') === colorway));
  // Two real frames: whatever the page started on a real frame (a mount's first step) has taken it,
  // so nothing is left waiting on the real clock with a real start time.
  for (let i = 0; i < 2; i++) await new Promise((r) => requestAnimationFrame(r));
  const now = performance.now();
  vi.useFakeTimers({ toFake: ['performance', 'requestAnimationFrame', 'cancelAnimationFrame', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] });
  vi.advanceTimersByTime(now);
}
afterEach(() => { vi.useRealTimers(); });

for (const colorway of COLORWAYS) {
  test(`the drawer in ${colorway}`, async () => {
    await openPage('/gadgets/drawer', colorway);
    const states = all('[data-testid="drawer-states"] svg[data-gadget="drawer"]');
    expect(states).toHaveLength(3);
    expect(states.map((e) => e.getAttribute('data-state'))).toEqual(['rest', 'open', 'full']);
    expect(states.map(trayY)).toEqual([0, 60, 22]);
    expect(states.map(cards)).toEqual([4, 4, 10]);
    expect(states.map((e) => e.querySelector('[data-part="lamp"]')!.getAttribute('data-lamp'))).toEqual(['off', 'live', 'waiting']);
    // Only what is out past the top's front edge shows: the tray is clipped to it.
    expect(states[0].querySelectorAll('[clip-path] > [data-id="tray"]')).toHaveLength(1);
    expect(states[2].querySelector('desc')!.textContent).toBe('Storage: 100% full, too full to close');
    await capture(`gadget-drawer-${colorway}`, document.querySelector('[data-testid="drawer-states"]')!);
  });
}

test('filing a card runs the drawer out on its runners and home; filled, it stays out', async () => {
  await openPage('/gadgets/drawer', 'bone');
  const drawer = page.getByTestId('drawer');
  drawer.element().scrollIntoView({ block: 'center' });
  // The run out and home is on a clock the slice controls, sampled every 8 ms for 1.4 s.
  await clock();
  const file = page.getByRole('button', { name: 'File a card' });
  await userEvent.click(file);
  const trace: number[] = [];
  await run(1400, 8, () => trace.push(trayRaw(drawer.element())));
  // Out to its runners (60), never past them, and home again.
  expect(Math.max(...trace)).toBeGreaterThan(58);
  expect(Math.max(...trace)).toBeLessThanOrEqual(60.5);
  expect(Math.abs(trace[trace.length - 1])).toBeLessThan(1);
  expect(cards(drawer.element())).toBe(5);
  // Filled to nine of ten, it cannot close: it rests out 22, amber.
  for (let i = 0; i < 4; i++) { await userEvent.click(file); await run(80); }
  await expect.element(drawer).toHaveAttribute('data-state', 'full');
  await run(3000);
  expect(trayY(drawer.element())).toBe(22);
  await expect.element(page.elementLocator(drawer.element().querySelector('[data-part="lamp"]')!)).toHaveAttribute('data-lamp', 'waiting');
  // Cleared out, it closes.
  await userEvent.click(page.getByRole('button', { name: 'Clear it out' }));
  await expect.element(drawer).toHaveAttribute('data-state', 'rest');
  await run(3000);
  expect(trayY(drawer.element())).toBe(0);
  expect(cards(drawer.element())).toBe(0);
});

test('with reduced motion it goes straight to held open; the flat tier has no filters; the server string is full', async () => {
  await openPage('/gadgets/drawer', 'graphite', { media: { 'prefers-reduced-motion': 'reduce' } });
  await userEvent.click(toggle('Held open'));
  expect(trayY(page.getByTestId('drawer').element())).toBe(60);
  const tiers = all('[data-testid="drawer-tiers"] svg[data-gadget]');
  expect(tiers.map((e) => e.getAttribute('data-tier'))).toEqual(['full', 'full', 'lite', 'flat']);
  expect(tiers[3].querySelectorAll('filter')).toHaveLength(0);
  const still = page.elementLocator(document.querySelector('[data-testid="drawer-static"] svg')!);
  await expect.element(still).toHaveAttribute('data-state', 'full');
  expect(trayY(still.element())).toBe(22);
});
