import { afterEach, expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { COLORWAYS, capture, openPage, until } from './harness';

// The shutter lens, an inset gadget drawn from its spec: a lens over lit glass in a bezel, its ring's
// angle the zoom value (a click every eighth of a turn), and taking a picture turning the ring one
// detent round and back while the glass flashes.
const ringAngle = (e: Element) => Number(e.querySelector('[data-part="lens.ring"]')!.getAttribute('transform')!.match(/rotate\(([-\d.]+)/)![1]);
const glow = (e: Element) => Number((e.querySelector('[data-id="light"]') as HTMLElement).style.opacity);
const all = (css: string) => [...document.querySelectorAll(css)];
const realTimeout = setTimeout;
/** Lets React commit what the frames set (it schedules on a message, not a timer). */
const settle = () => new Promise((r) => realTimeout(r, 0));
/** Runs frames on the slice's clock until `ok` holds or `ms` have passed. */
async function runUntil(ms: number, ok: () => boolean) { for (let t = 0; t < ms && !ok(); t += 16) { vi.advanceTimersByTime(16); await settle(); } }
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
  test(`the shutter lens in ${colorway}`, async () => {
    await openPage('/gadgets/shutter-lens', colorway);
    const states = all('[data-testid="lens-states"] svg[data-gadget="shutter-lens"]');
    expect(states).toHaveLength(2);
    expect(states.map((e) => e.getAttribute('data-state'))).toEqual(['rest', 'taken']);
    expect(states.map(glow)).toEqual([0.15, 0.9]);
    expect(states.map((e) => e.querySelector('[data-part="lamp"]')!.getAttribute('data-lamp'))).toEqual(['off', 'live']);
    // The lens sits over the glass, on top: its ring wears the accent.
    expect(states[0].querySelectorAll('[data-layer="top"] [data-id="lens"][data-accent="true"] [data-part="lens"]')).toHaveLength(1);
    expect(ringAngle(states[0])).toBe(0);
    await capture(`gadget-shutter-lens-${colorway}`, document.querySelector('[data-testid="lens-states"]')!);
  });
}

test('turning the ring clicks a detent at a time; taking a picture turns it a detent round and back', async () => {
  await openPage('/gadgets/shutter-lens', 'bone');
  const lens = page.getByTestId('lens'), point = page.getByTestId('lens-point');
  point.element().scrollIntoView({ block: 'center' });
  (point.element() as HTMLElement).focus();
  // The ring runs on a clock the slice controls.
  await clock();
  await userEvent.keyboard('{ArrowRight}');
  await expect.element(point).toHaveAttribute('aria-valuenow', '5');
  await runUntil(2000, () => Math.abs(ringAngle(lens.element()) - 45) < 0.5);
  expect(ringAngle(lens.element())).toBeCloseTo(45, 0);
  await userEvent.click(page.getByRole('button', { name: 'Take', exact: true }));
  await expect.element(lens).toHaveAttribute('data-state', 'taken');
  const trace: number[] = [];
  for (let t = 0; t < 1000; t += 8) { vi.advanceTimersByTime(8); await settle(); trace.push(ringAngle(lens.element())); }
  // Round toward one more detent (90°), well past the zoom's 45°, and back.
  expect(Math.max(...trace)).toBeGreaterThan(60);
  expect(trace[trace.length - 1]).toBeCloseTo(45, 0);
  await runUntil(3000, () => lens.element().getAttribute('data-state') === 'rest');
  await expect.element(lens).toHaveAttribute('data-state', 'rest');
});

test('with reduced motion the ring goes straight to its angle; the flat tier has no filters; the server string is taken', async () => {
  await openPage('/gadgets/shutter-lens', 'graphite', { media: { 'prefers-reduced-motion': 'reduce' } });
  (page.getByTestId('lens-point').element() as HTMLElement).focus();
  await userEvent.keyboard('{ArrowLeft}');
  expect(ringAngle(page.getByTestId('lens').element())).toBe(-45);
  const tiers = all('[data-testid="lens-tiers"] svg[data-gadget]');
  expect(tiers.map((e) => e.getAttribute('data-tier'))).toEqual(['full', 'full', 'lite', 'flat']);
  expect(tiers[3].querySelectorAll('filter')).toHaveLength(0);
  await expect.element(page.elementLocator(document.querySelector('[data-testid="lens-static"] svg')!)).toHaveAttribute('data-state', 'taken');
});
