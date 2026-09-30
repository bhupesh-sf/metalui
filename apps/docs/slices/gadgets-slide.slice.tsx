import { afterEach, expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { openPage, until } from './harness';

// The slide mechanism on Foundations › Mechanisms: a value moves the caps, staggered, with a tick per
// detent and a knock at a wall; a change mid-flight carries on from where they are; reduced motion
// puts them straight in place. The caps run on a clock the slice controls, frame by frame.
const realTimeout = setTimeout;
/** Lets React commit what the frames set (it schedules on a message, not a timer). */
const settle = () => new Promise((r) => realTimeout(r, 0));
/** Runs the page's frames for `ms`, letting React commit after each. */
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

const bench = () => document.querySelector('[data-testid="slide-bench"]')!;
const values = () => bench().getAttribute('data-values')!;
const log = (kind: string) => [...document.querySelectorAll(`[data-testid="slide-log"] [data-kind="${kind}"]`)];

test('all up: the caps rise one after another, tick, and knock the top', async () => {
  await openPage('/foundations/mechanisms', 'bone');
  bench().scrollIntoView({ block: 'center' });
  await clock();
  await userEvent.click(page.elementLocator(bench()).getByRole('button', { name: 'All up' }));
  await run(3000);
  expect(values()).toBe('1.00,1.00,1.00');
  expect(log('stop')).toHaveLength(3);
  expect(log('stop')[0].textContent).toContain('knocks the top');
  expect(log('detent').length).toBeGreaterThan(2);
  // Staggered: cap 1 knocks before cap 2, cap 2 before cap 3.
  expect(log('stop').map((k) => k.textContent!.match(/cap (\d)/)![1])).toEqual(['1', '2', '3']);
  expect(bench().getAttribute('data-speed')).toBe('0.00');
});

test('a new mix mid-flight carries on from where the caps are', async () => {
  await openPage('/foundations/mechanisms', 'bone');
  bench().scrollIntoView({ block: 'center' });
  await clock();
  await userEvent.click(page.elementLocator(bench()).getByRole('button', { name: 'All down' }));
  // As soon as the first cap has left its place, and before it arrives.
  for (let t = 0; t < 2000 && Number(values().split(',')[0]) >= 0.5; t += 16) await run(16);
  const mid = values().split(',').map(Number);
  expect(mid[0]).toBeLessThan(0.5);                       // on its way
  expect(mid[0]).toBeGreaterThan(0);
  await userEvent.click(page.elementLocator(bench()).getByRole('button', { name: 'Mix B' }));
  await run(3000);
  expect(values()).toBe('0.80,0.30,0.60');
});

test('with reduced motion the caps go straight to their places, each with one tick', async () => {
  await openPage('/foundations/mechanisms', 'bone', { media: { 'prefers-reduced-motion': 'reduce' } });
  bench().scrollIntoView({ block: 'center' });
  await userEvent.click(page.elementLocator(bench()).getByRole('button', { name: 'Mix A' }));
  expect(values()).toBe('0.25,0.75,0.50');
  // Caps 1 and 2 moved and tick once each; cap 3 was already at 0.5.
  await expect.poll(() => log('detent').length).toBe(2);
  expect(log('stop')).toHaveLength(0);
});
