import { afterEach, expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { COLORWAYS, capture, mouse, openPage, until } from './harness';

// The cell grid, a slab gadget drawn from its spec: resin cells in a tray lit from behind, the share
// lighting them in order from the bottom row up, the share deciding rest, filling and full, and a
// first run the host sets that raises the whole grid.
const lit = (e: Element) => Number(e.querySelector('[data-part="cell"]')!.getAttribute('data-lit'));
const glows = (e: Element) => [...e.querySelectorAll('[data-part="cell.glow"] [data-cell]')].map((c) => Number(c.getAttribute('opacity')));
const level = (e: Element) => Number(getComputedStyle(e.querySelector('[data-part="backlight.level"]')!).opacity);
const all = (css: string) => [...document.querySelectorAll(css)];
const realTimeout = setTimeout;
/** Lets React commit what the frames set (it schedules on a message, not a timer). */
const settle = () => new Promise((r) => realTimeout(r, 0));
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
  test(`the cell grid in ${colorway}`, async () => {
    await openPage('/gadgets/cell-grid', colorway);
    const states = all('[data-testid="grid-states"] svg[data-gadget="cell-grid"]');
    expect(states).toHaveLength(5);
    expect(states.map((e) => e.getAttribute('data-state'))).toEqual(['rest', 'filling', 'filling', 'full', 'first-run']);
    expect(states.map(lit)).toEqual([0, 6.4, 12, 16, 16]);
    expect(states.map((e) => e.querySelector('[data-part="lamp"]')!.getAttribute('data-lamp'))).toEqual(['off', 'live', 'live', 'live', 'live']);
    // 6.4 lit: the bottom row, then the next row up from its left, the seventh part way.
    expect(glows(states[1])).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0.4, 0, 1, 1, 1, 1]);
    // The light behind them burns as they fill; it is clipped to the tray it sits in.
    expect(level(states[0])).toBeCloseTo(0.08, 2);
    expect(level(states[3])).toBeCloseTo(0.92, 2);
    expect(states[1].querySelectorAll('[data-id="light"][clip-path]')).toHaveLength(1);
    expect(states[1].querySelector('desc')!.textContent).toBe('Memory: 40% kept');
    expect(states[3].querySelector('desc')!.textContent).toBe('Memory: 100% kept, full');
    await capture(`gadget-cell-grid-${colorway}`, document.querySelector('[data-testid="grid-states"]')!);
  });
}

test('pointing fills the grid up to a cell, in order, on a spring; the share decides the state', async () => {
  await openPage('/gadgets/cell-grid', 'bone');
  const grid = page.getByTestId('grid'), point = page.getByTestId('grid-point');
  point.element().scrollIntoView({ block: 'center' });
  // The top-right cell is the last in order: pointing at it fills the grid.
  const box = point.element().getBoundingClientRect(), k = box.width / 400;
  // The spring runs on a clock the slice controls, sampled every frame for 1.4 s.
  await clock();
  await mouse.move(box.x + 281 * k, box.y + 133 * k);
  await mouse.down();
  await mouse.up();
  await settle();
  // Light eases in: the share rises without passing full, and cells light in order the whole way.
  const svg = grid.element(), trace: { lit: number; order: boolean }[] = [];
  const ORDER = [12, 13, 14, 15, 8, 9, 10, 11, 4, 5, 6, 7, 0, 1, 2, 3];
  for (let t = 0; t <= 1400; t += 16) {
    vi.advanceTimersByTime(16);
    await settle();
    const g = glows(svg);
    trace.push({ lit: lit(svg), order: ORDER.every((c, i) => i === 0 || g[c] <= g[ORDER[i - 1]]) });
  }
  expect(trace.every((t) => t.order)).toBe(true);
  expect(Math.max(...trace.map((t) => t.lit))).toBeLessThanOrEqual(16.001);
  expect(trace[trace.length - 1].lit).toBeCloseTo(16, 1);
  await expect.element(grid).toHaveAttribute('data-state', 'full');
  // A keyboard takes a cell away at a time; Home empties it.
  (point.element() as HTMLElement).focus();
  await userEvent.keyboard('{ArrowDown}');
  await expect.element(point).toHaveAttribute('aria-valuenow', '15');
  await expect.element(grid).toHaveAttribute('data-state', 'filling');
  await userEvent.keyboard('{Home}');
  await expect.element(grid).toHaveAttribute('data-state', 'rest');
});

test('a first run raises the whole grid and rises the lamp, then falls back to what it keeps', async () => {
  await openPage('/gadgets/cell-grid', 'graphite');
  const grid = page.getByTestId('grid');
  // The host's first run and the grid's spring run on a clock the slice controls.
  await clock();
  await userEvent.click(page.getByRole('button', { name: 'First run' }));
  await expect.element(grid).toHaveAttribute('data-state', 'first-run');
  await expect.element(page.elementLocator(grid.element().querySelector('[data-part="lamp"]')!)).toHaveAttribute('data-gesture', 'rise');
  /** Runs frames until `ok` holds or `ms` have passed; the time it took, or -1. */
  const runUntil = async (ms: number, ok: () => boolean) => {
    for (let t = 0; t <= ms; t += 16) { if (ok()) return t; vi.advanceTimersByTime(16); await settle(); }
    return -1;
  };
  expect(await runUntil(2000, () => lit(grid.element()) > 15.9)).toBeGreaterThanOrEqual(0);
  expect(await runUntil(4000, () => grid.element().getAttribute('data-state') === 'filling')).toBeGreaterThanOrEqual(0);
  expect(await runUntil(3000, () => lit(grid.element()) < 6.5)).toBeGreaterThanOrEqual(0);
});

test('with reduced motion the cells light at once; the flat tier has no filters; the server string is drawn lit', async () => {
  await openPage('/gadgets/cell-grid', 'bone', { media: { 'prefers-reduced-motion': 'reduce' } });
  (page.getByTestId('grid-point').element() as HTMLElement).focus();
  await userEvent.keyboard('{End}');
  expect(lit(page.getByTestId('grid').element())).toBe(16);
  const tiers = all('[data-testid="grid-tiers"] svg[data-gadget]');
  expect(tiers.map((e) => e.getAttribute('data-tier'))).toEqual(['full', 'full', 'lite', 'flat']);
  expect(tiers[3].querySelectorAll('filter')).toHaveLength(0);
  const still = page.elementLocator(document.querySelector('[data-testid="grid-static"] svg')!);
  await expect.element(still).toHaveAttribute('data-state', 'filling');
  expect(lit(still.element())).toBe(12);
});
