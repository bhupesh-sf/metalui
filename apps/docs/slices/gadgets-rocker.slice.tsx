import { afterEach, expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { COLORWAYS, capture, openPage, until } from './harness';

// The rocker, a slab gadget drawn from its spec: a rocker Cap in a well that the switch rocks from
// O (off) to I (on) on the hinge spring, the half facing the light brightening, the lamp agreeing.
const tilt = (e: Element) => Number(e.querySelector('[data-part="cap"][data-shape="rocker"]')!.getAttribute('data-tilt'));
const lit = (e: Element, half: string) => Number(e.querySelector(`[data-rocker="${half}"]`)!.getAttribute('opacity'));
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
  test(`the rocker in ${colorway}`, async () => {
    await openPage('/gadgets/rocker', colorway);
    const states = all('[data-testid="rocker-states"] svg[data-gadget="rocker"]');
    expect(states).toHaveLength(2);
    expect(states.map((e) => e.getAttribute('data-state'))).toEqual(['rest', 'on']);
    expect(states.map(tilt)).toEqual([-1, 1]);
    // Off, the lower half faces the light; on, the upper half.
    expect(lit(states[0], 'bottom-lit')).toBeGreaterThan(0);
    expect(lit(states[0], 'top-lit')).toBe(0);
    expect(lit(states[1], 'top-lit')).toBeGreaterThan(0);
    expect(states.map((e) => e.querySelector('[data-part="lamp"]')!.getAttribute('data-lamp'))).toEqual(['off', 'live']);
    // Sunk in a well, not a slot.
    expect(states[0].querySelectorAll('[data-cut="well"]')).toHaveLength(1);
    expect(states[0].querySelectorAll('[data-cut="slot"]')).toHaveLength(0);
    expect(states[1].querySelector('desc')!.textContent).toBe('Sound, on');
    await capture(`gadget-rocker-${colorway}`, document.querySelector('[data-testid="rocker-states"]')!);
  });
}

test('pressing the rocker rocks it to the other end on the hinge spring, and back', async () => {
  await openPage('/gadgets/rocker', 'bone');
  const rocker = page.getByTestId('rocker'), press = page.getByTestId('rocker-press');
  press.element().scrollIntoView({ block: 'center' });
  // The hinge runs on a clock the slice controls, sampled every 8 ms for 0.9 s.
  await clock();
  await userEvent.click(press);
  await expect.element(press).toHaveAttribute('aria-checked', 'true');
  await expect.element(rocker).toHaveAttribute('data-state', 'on');
  const trace: number[] = [];
  for (let t = 0; t < 900; t += 8) { vi.advanceTimersByTime(8); await settle(); trace.push(tilt(rocker.element())); }
  // It travels between its stops (never beyond them) and rests on.
  expect(trace.some((t) => Math.abs(t) < 0.95)).toBe(true);
  expect(Math.max(...trace)).toBeLessThanOrEqual(1.001);
  expect(trace[trace.length - 1]).toBeCloseTo(1, 1);
  (press.element() as HTMLElement).focus();
  await userEvent.keyboard(' ');
  await expect.element(rocker).toHaveAttribute('data-state', 'rest');
  for (let t = 0; t < 2000 && Math.abs(tilt(rocker.element()) + 1) >= 0.05; t += 16) { vi.advanceTimersByTime(16); await settle(); }
  expect(tilt(rocker.element())).toBeCloseTo(-1, 1);
});

test('with reduced motion it goes straight to the other end; the flat tier has no filters; the server string is on', async () => {
  await openPage('/gadgets/rocker', 'graphite', { media: { 'prefers-reduced-motion': 'reduce' } });
  await userEvent.click(page.getByTestId('rocker-press'));
  expect(tilt(page.getByTestId('rocker').element())).toBe(1);
  const tiers = all('[data-testid="rocker-tiers"] svg[data-gadget]');
  expect(tiers.map((e) => e.getAttribute('data-tier'))).toEqual(['full', 'full', 'lite', 'flat']);
  expect(tiers[3].querySelectorAll('filter')).toHaveLength(0);
  await expect.element(page.elementLocator(document.querySelector('[data-testid="rocker-static"] svg')!)).toHaveAttribute('data-state', 'on');
});
