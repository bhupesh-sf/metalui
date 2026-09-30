import { afterEach, expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { COLORWAYS, capture, openPage, until } from './harness';

// The lidded bin, a slab gadget drawn from its spec: a rubber lid on its mouth that the state holds
// (closed, ajar when armed, showing the red under it), and that emptying swings open and slams shut.
const openOf = (e: Element) => Number(e.querySelector('[data-part="lid"]')!.getAttribute('data-open'));
const all = (css: string) => [...document.querySelectorAll(css)];
/** A Base UI switch by its aria-label: the locator engine's role query does not name these (harness candidate). */
const toggle = (name: string) => page.elementLocator(document.querySelector(`[role="switch"][aria-label="${name}"]`)!);
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
  test(`the lidded bin in ${colorway}`, async () => {
    await openPage('/gadgets/lidded-bin', colorway);
    const states = all('[data-testid="bin-states"] svg[data-gadget="lidded-bin"]');
    expect(states).toHaveLength(3);
    expect(states.map((e) => e.getAttribute('data-state'))).toEqual(['rest', 'armed', 'emptied']);
    expect(states.map(openOf)).toEqual([0, 18, 0]);
    expect(states.map((e) => e.querySelector('[data-part="lamp"]')!.getAttribute('data-lamp'))).toEqual(['off', 'failed', 'live']);
    // The body is near-black rubber; the red is under the lid (and in the lamp), never the body.
    expect(states[1].querySelector('[data-part="lid.under"]')!.getAttribute('opacity')).toBe('1');
    expect(states[1].querySelector('desc')!.textContent).toBe('Trash: armed, ready to empty');
    await capture(`gadget-lidded-bin-${colorway}`, document.querySelector('[data-testid="bin-states"]')!);
  });
}

test('arming lifts the lid ajar on the hinge; emptying swings it open and slams it shut', async () => {
  await openPage('/gadgets/lidded-bin', 'bone');
  const bin = page.getByTestId('bin');
  bin.element().scrollIntoView({ block: 'center' });
  // The hinge runs on a clock the slice controls, sampled every 8 ms.
  await clock();
  await userEvent.click(toggle('Armed'));
  await expect.element(bin).toHaveAttribute('data-state', 'armed');
  // The hinge spring carries it past 18° a little and back.
  const rise = await sample(900, () => openOf(bin.element()));
  expect(Math.max(...rise)).toBeGreaterThan(18);
  expect(rise[rise.length - 1]).toBeCloseTo(18, 0);
  // Emptied: all the way up (near 70°), then shut against the rim, never below it.
  await userEvent.click(page.getByRole('button', { name: 'Empty' }));
  await expect.element(bin).toHaveAttribute('data-state', 'emptied');
  await expect.element(page.elementLocator(bin.element().querySelector('[data-part="lamp"]')!)).toHaveAttribute('data-gesture', 'blink2');
  const swing = await sample(1500, () => openOf(bin.element()));
  expect(Math.max(...swing)).toBeGreaterThan(60);
  expect(Math.min(...swing)).toBeGreaterThanOrEqual(0);
  expect(swing[swing.length - 1]).toBeCloseTo(0, 0);
  // Back at rest within 3 s.
  for (let t = 0; t < 3000 && bin.element().getAttribute('data-state') !== 'rest'; t += 16) { vi.advanceTimersByTime(16); await settle(); }
  await expect.element(bin).toHaveAttribute('data-state', 'rest');
});

test('with reduced motion the lid goes straight to ajar; the flat tier has no filters; the server string is armed', async () => {
  await openPage('/gadgets/lidded-bin', 'graphite', { media: { 'prefers-reduced-motion': 'reduce' } });
  await userEvent.click(toggle('Armed'));
  expect(openOf(page.getByTestId('bin').element())).toBe(18);
  const tiers = all('[data-testid="bin-tiers"] svg[data-gadget]');
  expect(tiers.map((e) => e.getAttribute('data-tier'))).toEqual(['full', 'full', 'lite', 'flat']);
  expect(tiers[3].querySelectorAll('filter')).toHaveLength(0);
  const still = page.elementLocator(document.querySelector('[data-testid="bin-static"] svg')!);
  await expect.element(still).toHaveAttribute('data-state', 'armed');
  expect(openOf(still.element())).toBe(18);
});
