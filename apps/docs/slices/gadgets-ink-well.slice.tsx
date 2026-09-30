import { afterEach, expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { COLORWAYS, capture, openPage, until } from './harness';

// The ink well, a slab gadget drawn from its spec: a nib over a well of ink, dipped by its act (into the
// ink and back) and resting in the ink while writing.
const nibRaw = (e: Element) => {
  const t = e.querySelector('[data-id="nib"] [data-moves]')!.getAttribute('transform') ?? '';
  const m = t.match(/translate\(([-\d.]+)[ ,]+([-\d.]+)\)/);
  return m ? Number(m[2]) - (t.includes('rotate') ? 236 : 0) : 0;
};
const nibY = (e: Element) => +nibRaw(e).toFixed(2);
const all = (css: string) => [...document.querySelectorAll(css)];
/** A Base UI switch by its aria-label: the locator engine's role query does not name these (harness candidate). */
const toggle = (name: string) => page.elementLocator(document.querySelector(`[role="switch"][aria-label="${name}"]`)!);
const realTimeout = setTimeout;
/** Lets React commit what the frames set (it schedules on a message, not a timer). */
const settle = () => new Promise((r) => realTimeout(r, 0));
/** Runs the page's frames for `ms` on the slice's clock; `each` samples after every step. */
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
  test(`the ink well in ${colorway}`, async () => {
    await openPage('/gadgets/ink-well', colorway);
    const states = all('[data-testid="well-states"] svg[data-gadget="ink-well"]');
    expect(states).toHaveLength(2);
    expect(states.map((e) => e.getAttribute('data-state'))).toEqual(['rest', 'writing']);
    expect(states.map(nibY)).toEqual([0, 6]);
    // Ink in the well, in the accent; the nib over it, its tip wet.
    expect(states[0].querySelectorAll('[data-part="ink"] circle')).toHaveLength(2);
    expect(states[0].querySelectorAll('[data-part="nib.ink"]')).toHaveLength(1);
    expect(states.map((e) => e.querySelector('[data-part="lamp"]')!.getAttribute('data-lamp'))).toEqual(['off', 'live']);
    expect(states[1].querySelector('desc')!.textContent).toBe('Draw, writing');
    await capture(`gadget-ink-well-${colorway}`, document.querySelector('[data-testid="well-states"]')!);
  });
}

test('pressing the well dips the nib into the ink and back; writing, it rests in the ink', async () => {
  await openPage('/gadgets/ink-well', 'bone');
  const well = page.getByTestId('well');
  well.element().scrollIntoView({ block: 'center' });
  // The dip runs on a clock the slice controls, sampled every 8 ms for 0.7 s.
  await clock();
  await userEvent.click(page.getByTestId('well-press'));
  const trace: number[] = [];
  await run(700, 8, () => trace.push(nibRaw(well.element())));
  expect(Math.max(...trace)).toBeGreaterThan(8);
  expect(Math.max(...trace)).toBeLessThanOrEqual(10.5);
  expect(Math.abs(trace[trace.length - 1])).toBeLessThan(0.5);
  await userEvent.click(toggle('Writing'));
  await expect.element(well).toHaveAttribute('data-state', 'writing');
  await run(3000);
  expect(nibY(well.element())).toBeCloseTo(6, 0);
  await userEvent.click(toggle('Writing'));
  await expect.element(well).toHaveAttribute('data-state', 'rest');
  await run(3000);
  expect(nibY(well.element())).toBeCloseTo(0, 0);
});

test('with reduced motion the nib goes straight to rest in the ink; the flat tier has no filters; the server string is writing', async () => {
  await openPage('/gadgets/ink-well', 'graphite', { media: { 'prefers-reduced-motion': 'reduce' } });
  await userEvent.click(toggle('Writing'));
  expect(nibY(page.getByTestId('well').element())).toBe(6);
  const tiers = all('[data-testid="well-tiers"] svg[data-gadget]');
  expect(tiers.map((e) => e.getAttribute('data-tier'))).toEqual(['full', 'full', 'lite', 'flat']);
  expect(tiers[3].querySelectorAll('filter')).toHaveLength(0);
  await expect.element(page.elementLocator(document.querySelector('[data-testid="well-static"] svg')!)).toHaveAttribute('data-state', 'writing');
});
