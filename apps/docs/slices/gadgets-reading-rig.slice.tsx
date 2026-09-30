import { afterEach, expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { COLORWAYS, capture, openPage, until } from './harness';

// The reading rig: two catalog gadgets in one panel, wired by a patch cable. Crossing today's line
// sends a pulse down the cord (a bead of light) and the streak rolls a day when it arrives.
const rig = () => document.querySelector('[data-testid="rig"]')!;
const streak = () => ['d2', 'd1', 'd0'].map((id) => {
  const strip = rig().querySelector(`[data-inst="streak"] [data-id="${id}"] [data-moves]`)!;
  return (Math.round(-Number((strip.getAttribute('transform') ?? '').match(/translate\(0 ([-\d.]+)\)/)![1]) / 36) % 10) + 0;
});
const strips = () => ['d2', 'd1', 'd0'].map((id) => rig().querySelector(`[data-inst="streak"] [data-id="${id}"] [data-moves]`)!.getAttribute('transform')).join('|');
const realTimeout = setTimeout;
/** Lets React commit what the frames set (it schedules on a message, not a timer). */
const settle = () => new Promise((r) => realTimeout(r, 0));
/** Runs the page's frames for `ms` on the slice's clock, letting React commit after each. */
async function run(ms: number) { for (let t = 0; t < ms; t += 16) { vi.advanceTimersByTime(16); await settle(); } }
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
  test(`the reading rig in ${colorway}`, async () => {
    await openPage('/gadgets/reading-rig', colorway);
    const gadgets = [...rig().querySelectorAll('svg[data-gadget]')];
    expect(gadgets).toHaveLength(2);
    expect(gadgets.map((e) => e.getAttribute('data-gadget'))).toEqual(['needle-gauge', 'counter-drum']);
    // Each gadget in its own tray, a jack beside each wired port, one cord between plugs.
    expect(rig().querySelectorAll('[data-layer="panel"] [data-cut="tray"]')).toHaveLength(2);
    expect(rig().querySelectorAll('[data-layer="panel"] [data-part="jack"]')).toHaveLength(2);
    expect(rig().querySelectorAll('[data-layer="plugs"] [data-part="plug"]')).toHaveLength(2);
    expect(rig().querySelector('[data-cable="today.over→streak.count"] title')!.textContent).toBe('today.over drives streak.count');
    expect(streak()).toEqual([0, 1, 2]);
    await capture(`gadget-reading-rig-${colorway}`, rig());
  });
}

test('crossing the line sends a bead down the cord, and the streak rolls a day when it arrives', async () => {
  await openPage('/gadgets/reading-rig', 'bone');
  (page.getByTestId('rig-point').element() as HTMLElement).focus();
  // The bead travels on a clock the slice controls, read every frame.
  await clock();
  const before = strips();
  await userEvent.keyboard('{PageUp}');                                   // 24 → 34: past 30
  // In the frame the bead is on its way, the streak has not changed yet: read both at once.
  let onItsWay: string | null = null;
  for (let t = 0; t < 3000 && (onItsWay === null || rig().querySelector('[data-bead]')); t += 16) {
    if (onItsWay === null && rig().querySelector('[data-bead]')) onItsWay = strips();
    vi.advanceTimersByTime(16); await settle();
  }
  expect(onItsWay).toBe(before);                                          // on its way, not there yet
  expect(rig().querySelectorAll('[data-bead]')).toHaveLength(0);          // arrived
  await run(2000);
  expect(streak()).toEqual([0, 1, 3]);
  await expect.poll(() => page.getByTestId('rig-log').element().textContent).toBe('today.over → streak.count: 13');
  // Staying past the line sends nothing; back under and over again sends another day.
  await userEvent.keyboard('{ArrowUp}');
  await run(400);
  expect(streak()).toEqual([0, 1, 3]);
  await userEvent.keyboard('{PageDown}');                                 // 35 → 25
  await userEvent.keyboard('{PageUp}');                                   // 25 → 35
  await run(3000);
  expect(streak()).toEqual([0, 1, 4]);
});

test('with reduced motion the value arrives at once, without a bead', async () => {
  await openPage('/gadgets/reading-rig', 'graphite', { media: { 'prefers-reduced-motion': 'reduce' } });
  (page.getByTestId('rig-point').element() as HTMLElement).focus();
  await userEvent.keyboard('{PageUp}');
  expect(rig().querySelectorAll('[data-bead]')).toHaveLength(0);
  await expect.poll(streak, { timeout: 1000 }).toEqual([0, 1, 3]);
});
