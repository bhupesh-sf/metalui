import { afterEach, expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { COLORWAYS, capture, openPage, until } from './harness';

// The thumbwheel, a slab gadget drawn from its spec: a wheel of ticks in a slot under an engraved NOW,
// rolled back a tick a day, amber off now and breathing more than a week back.
const strip = (e: Element) => Number(e.querySelector('[data-part="drum.strip"]')!.getAttribute('transform')!.match(/translate\(0 ([-\d.]+)\)/)![1]);
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
  test(`the thumbwheel in ${colorway}`, async () => {
    await openPage('/gadgets/thumbwheel', colorway);
    const states = all('[data-testid="wheel-states"] svg[data-gadget="thumbwheel"]');
    expect(states).toHaveLength(3);
    expect(states.map((e) => e.getAttribute('data-state'))).toEqual(['rest', 'past', 'far']);
    expect(states.map((e) => [e.querySelector('[data-part="lamp"]')!.getAttribute('data-lamp'), e.querySelector('[data-part="lamp"]')!.getAttribute('data-gesture')])).toEqual([['off', 'steady'], ['waiting', 'steady'], ['waiting', 'breathe']]);
    // An engraved NOW, a wheel of ticks in its slot.
    expect([...states[0].querySelectorAll('[data-part="label"] text')].at(-1)!.textContent).toBe('NOW');
    expect(states[0].querySelectorAll('[data-cut="tray"]')).toHaveLength(1);
    expect(states[0].querySelector('[data-part="drum.strip"] text')!.textContent).toBe('–');
    expect(states[1].querySelector('desc')!.textContent).toBe('When, in the past');
    await capture(`gadget-thumbwheel-${colorway}`, document.querySelector('[data-testid="wheel-states"]')!);
  });
}

test('rolling the wheel back turns it a tick a day and stops hard at now', async () => {
  await openPage('/gadgets/thumbwheel', 'bone');
  const wheel = page.getByTestId('wheel'), point = page.getByTestId('wheel-point');
  point.element().scrollIntoView({ block: 'center' });
  (point.element() as HTMLElement).focus();
  // The wheel turns on a clock the slice controls.
  await clock();
  const at0 = strip(wheel.element());
  await userEvent.keyboard('{ArrowDown}');
  await expect.element(point).toHaveAttribute('aria-valuetext', '1 day ago');
  await expect.element(wheel).toHaveAttribute('data-state', 'past');
  // One day is one tick: the strip moves by a pitch, and settles there.
  for (let t = 0; t < 2000 && Math.abs(strip(wheel.element()) - at0) <= 40; t += 16) { vi.advanceTimersByTime(16); await settle(); }
  expect(Math.abs(strip(wheel.element()) - at0)).toBeGreaterThan(40);
  await userEvent.keyboard('{PageDown}');
  await expect.element(wheel).toHaveAttribute('data-state', 'far');
  await expect.element(page.elementLocator(wheel.element().querySelector('[data-part="lamp"]')!)).toHaveAttribute('data-gesture', 'breathe');
  // Past now is a stop: up from now stays now.
  await userEvent.click(page.getByRole('button', { name: 'Back to now' }));
  (point.element() as HTMLElement).focus();
  await userEvent.keyboard('{ArrowUp}');
  await expect.element(point).toHaveAttribute('aria-valuenow', '0');
  await expect.element(wheel).toHaveAttribute('data-state', 'rest');
});

test('with reduced motion it goes straight to the day; the flat tier has no filters; the server string is in the past', async () => {
  await openPage('/gadgets/thumbwheel', 'graphite', { media: { 'prefers-reduced-motion': 'reduce' } });
  const wheel = page.getByTestId('wheel').element();
  const at0 = strip(wheel);
  (page.getByTestId('wheel-point').element() as HTMLElement).focus();
  await userEvent.keyboard('{ArrowDown}');
  expect(strip(wheel)).not.toBe(at0);
  const tiers = all('[data-testid="wheel-tiers"] svg[data-gadget]');
  expect(tiers.map((e) => e.getAttribute('data-tier'))).toEqual(['full', 'full', 'lite', 'flat']);
  expect(tiers[3].querySelectorAll('filter')).toHaveLength(0);
  await expect.element(page.elementLocator(document.querySelector('[data-testid="wheel-static"] svg')!)).toHaveAttribute('data-state', 'past');
});
