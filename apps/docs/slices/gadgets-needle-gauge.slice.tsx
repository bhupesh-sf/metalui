import { afterEach, expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { COLORWAYS, capture, openPage, until } from './harness';

// The needle gauge, an inset gadget drawn from its spec: the needle in the glass, the beeper on the
// frame, the value swinging the needle (overshoot, pegs), and the value deciding when it is over.
const angle = (svg: Element) => Number(svg.querySelector('[data-part="needle"]')!.getAttribute('transform')!.match(/rotate\(([-\d.]+)/)![1]);
const all = (css: string) => [...document.querySelectorAll(css)];
const realTimeout = setTimeout;
/** Lets React commit what the frames set (it schedules on a message, not a timer). */
const settle = () => new Promise((r) => realTimeout(r, 0));
/** Runs the page's frames for `ms` on the slice's clock, sampling every `step`. */
async function sample(ms: number, read: () => number, step = 8) {
  const out: number[] = [];
  for (let t = 0; t < ms; t += step) { vi.advanceTimersByTime(step); await settle(); out.push(read()); }
  return out;
}
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
  test(`the needle gauge in ${colorway}`, async () => {
    await openPage('/gadgets/needle-gauge', colorway);
    const levels = all('[data-testid="gauge-levels"] svg[data-gadget="needle-gauge"]');
    expect(levels).toHaveLength(4);
    // 8, 24, 34, 40 of 40 on a 120° scale: −36°, 12°, 42°, 60°; past 0.75 (30 min) it is over.
    expect(levels.map(angle)).toEqual([-36, 12, 42, 60]);
    expect(levels.map((e) => e.getAttribute('data-state'))).toEqual(['rest', 'rest', 'over', 'over']);
    expect(levels.map((e) => e.querySelector('[data-part="lamp"]')!.getAttribute('data-lamp'))).toEqual(['off', 'off', 'waiting', 'waiting']);
    // The needle is in the glass; the beeper sits on the frame, over it.
    const one = levels[1];
    expect(one.querySelectorAll('[data-part="bezel.light"] [data-part="needle"]')).toHaveLength(1);
    expect(one.querySelectorAll('[data-layer="top"] [data-part="beeper"]')).toHaveLength(1);
    expect(one.querySelector('desc')!.textContent).toBe('Today: 24 of 40 min');
    await capture(`gadget-needle-gauge-${colorway}`, document.querySelector('[data-testid="gauge-levels"]')!);
  });
}

test('pointing swings the needle; it overshoots, settles, and bounces off the peg; past the zone it is over', async () => {
  await openPage('/gadgets/needle-gauge', 'bone');
  const gauge = page.getByTestId('gauge'), point = page.getByTestId('gauge-point').element() as HTMLElement;
  point.scrollIntoView({ block: 'center' });
  // From 24 (12°) to 28 (24°): it overshoots past 24° and comes back. The swing runs on a clock the
  // slice controls, sampled every 8 ms.
  point.focus();
  await clock();
  for (let i = 0; i < 4; i++) point.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
  await settle();
  const trace = await sample(900, () => angle(gauge.element()));
  expect(Math.max(...trace)).toBeGreaterThan(24.5);
  expect(trace[trace.length - 1]).toBeCloseTo(24, 0);
  await expect.element(gauge).toHaveAttribute('data-state', 'rest');
  // All the way: the peg holds it at 60°, never past; the lamp goes amber.
  await userEvent.keyboard('{End}');
  const peg = await sample(700, () => angle(gauge.element()));
  expect(Math.max(...peg)).toBeLessThanOrEqual(60.001);
  await expect.element(gauge).toHaveAttribute('data-state', 'over');
  await expect.element(page.elementLocator(gauge.element().querySelector('[data-part="lamp"]')!)).toHaveAttribute('data-lamp', 'waiting');
});

test('with reduced motion the needle goes straight to the value', async () => {
  await openPage('/gadgets/needle-gauge', 'graphite', { media: { 'prefers-reduced-motion': 'reduce' } });
  (page.getByTestId('gauge-point').element() as HTMLElement).focus();
  await userEvent.keyboard('{Home}');
  expect(angle(page.getByTestId('gauge').element())).toBe(-60);
});

test('the flat tier has no filters, and the server string is over at 34', async () => {
  await openPage('/gadgets/needle-gauge', 'bone');
  const tiers = all('[data-testid="gauge-tiers"] svg[data-gadget]');
  expect(tiers.map((e) => e.getAttribute('data-tier'))).toEqual(['full', 'full', 'lite', 'flat']);
  expect(tiers[3].querySelectorAll('filter')).toHaveLength(0);
  const still = page.elementLocator(document.querySelector('[data-testid="gauge-static"] svg')!);
  await expect.element(still).toHaveAttribute('data-state', 'over');
  expect(angle(still.element())).toBe(42);
});
