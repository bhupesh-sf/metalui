import { afterEach, expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { COLORWAYS, capture, openPage, until } from './harness';

// Mechanisms (packages/metalui/gadgets/src/mechanisms): the seat act on Foundations › Mechanisms.
// One cue list drives motion, lamp and sound: the click lands when the plug does, a second act is
// ignored, a change of state springs on from where the plug is, and reduced motion keeps the meaning.
// The act runs on a clock the slice controls, so its cues land on their times however busy the machine.
/** Runs the page's frames for `ms`, sampling after each. */
function run(ms: number, each?: () => void) { for (let t = 0; t < ms; t += 16) { vi.advanceTimersByTime(16); each?.(); } }
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

const plugY = () => {
  const m = (document.querySelector('[data-part="plug"]')!.getAttribute('transform') ?? '').match(/translate\(([-\d.]+) ([-\d.]+)\)/);
  return m ? { x: +m[1] - 200, y: +m[2] - 214 } : { x: 0, y: 0 };
};
const cues = () => [...document.querySelectorAll<HTMLElement>('[data-testid="cue-log"] [data-cue-kind]')].map((e) =>
  `${e.dataset.cueKind}@${e.dataset.cueAt}${e.dataset.skipped ? ':' + e.dataset.skipped : ''}`);
const actButton = () => page.getByTestId('seat-act');
const lamp = () => page.elementLocator(document.querySelector('[data-lamp]')!);

test('the plug lifts and seats, and the click lands with it', async () => {
  await openPage('/foundations/mechanisms', 'bone');
  await clock();
  await userEvent.click(actButton());
  // Sample the plug every frame through the act: it lifts the full 14 units, then comes home.
  const ys: number[] = [];
  run(1100, () => ys.push(plugY().y));
  expect(Math.min(...ys)).toBeCloseTo(-14, 0);                      // lifted 14 units, nearer the light
  expect(Math.max(...ys)).toBeGreaterThan(0.5);                     // one small overshoot as it seats
  await expect.poll(cues).toEqual(['strike@120', 'strike@517', 'lamp@517', 'beep@537']);
  run(500);
  expect(Math.abs(plugY().y)).toBeLessThan(0.05);                   // home, exactly
  await expect.element(lamp()).toHaveAttribute('data-gesture', 'flicker');
});

test('a second act while one plays is ignored', async () => {
  await openPage('/foundations/mechanisms', 'graphite');
  await clock();
  await userEvent.click(actButton());
  run(80);
  await userEvent.click(actButton());
  run(1100);
  await expect.poll(cues).toEqual(['strike@120', 'strike@517', 'lamp@517', 'beep@537']);
});

test('a change of state mid-act springs on from where the plug is, and cancels the pending lamp and beep', async () => {
  await openPage('/foundations/mechanisms', 'bone');
  await clock();
  await userEvent.click(actButton());
  run(250);
  await userEvent.click(page.getByRole('radio', { name: 'Failed' }));
  run(1600);
  await expect.poll(cues).toContain('strike@120');
  const p = plugY();
  expect(p.x).toBeCloseTo(-22, 0);
  expect(p.y).toBeCloseTo(-46, 0);
  const log = cues();
  expect(log).toContain('strike@120');
  expect(log).not.toContain('beep@537');
  expect(log).not.toContain('lamp@517');
  await expect.element(lamp()).toHaveAttribute('data-lamp', 'failed');
  // Back to connected: it springs home.
  await userEvent.click(page.getByRole('radio', { name: 'Connected' }));
  run(1600);
  expect(Math.abs(plugY().y)).toBeLessThan(0.1);
});

test('with reduced motion the act is its click and its lamp, at once, and nothing travels', async () => {
  await openPage('/foundations/mechanisms', 'bone', { media: { 'prefers-reduced-motion': 'reduce' } });
  await clock();
  await userEvent.click(actButton());
  run(200);
  expect(plugY().y).toBe(0);
  await expect.poll(cues).toEqual(['strike@0', 'strike@0', 'lamp@0', 'beep@0']);
  await userEvent.click(page.getByRole('radio', { name: 'Syncing' }));
  expect(plugY().y).toBeCloseTo(-7, 1);                             // held poses are reached at once
});

for (const colorway of COLORWAYS) {
  test(`mechanisms page in ${colorway}`, async () => {
    await openPage('/foundations/mechanisms', colorway, { media: { 'prefers-reduced-motion': 'reduce' } });
    await capture(`mechanisms-seat-${colorway}`, document.querySelector('[data-testid="seat-bench"]')!);
  });
}
