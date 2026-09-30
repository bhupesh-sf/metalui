import { afterEach, expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { COLORWAYS, capture, openPage, until } from './harness';

// The counter drum, drawn from its spec and turned by the roll: odometer order, forward through 9,
// its count in its description.
const digits = () => {
  const svg = document.querySelector('[data-testid="counter"]')!;
  return ['d2', 'd1', 'd0'].map((id) => {
    const strip = svg.querySelector(`[data-id="${id}"] [data-moves]`)!;
    return (Math.round(-Number((strip.getAttribute('transform') ?? '').match(/translate\(0 ([-\d.]+)\)/)![1]) / 36) % 10) + 0;   // + 0: no −0
  });
};
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
  test(`the counter drum in ${colorway}`, async () => {
    await openPage('/gadgets/counter-drum', colorway);
    const states = all('[data-testid="counter-states"] svg[data-gadget="counter-drum"]');
    expect(states).toHaveLength(3);
    const one = states[1];
    expect(one.querySelectorAll('[data-cut="tray"]')).toHaveLength(1);
    expect(one.querySelectorAll('[data-part="drum"]')).toHaveLength(3);
    expect(one.querySelector('[data-accent="true"]')!.getAttribute('data-id')).toBe('d0');
    expect([...one.querySelectorAll('[data-part="drum"]')].map((e) => e.getAttribute('data-value'))).toEqual(['0', '1', '2']);
    expect(one.querySelector('desc')!.textContent).toBe('Streak: 12 days');
    await capture(`gadget-counter-drum-${colorway}`, document.querySelector('[data-testid="counter-states"]')!);
  });
}

test('a day at 19 carries: the units run on into 0 first, then the tens turn', async () => {
  await openPage('/gadgets/counter-drum', 'bone');
  const counter = page.getByTestId('counter');
  counter.element().scrollIntoView({ block: 'center' });
  // The roll runs on a clock the slice controls, from before the first turn.
  await clock();
  for (let i = 0; i < 7; i++) await userEvent.click(page.getByTestId('count-up'));          // 12 → 19
  for (let t = 0; t < 3000; t += 16) { vi.advanceTimersByTime(16); await settle(); }
  await expect.poll(digits).toEqual([0, 1, 9]);
  // Watch the carry: the units strip keeps moving the same way (forward), and moves before the tens,
  // sampled every 8 ms for 0.7 s.
  const svg = counter.element();
  const y = (id: string) => Number((svg.querySelector(`[data-id="${id}"] [data-moves]`)!.getAttribute('transform') ?? '').match(/translate\(0 ([-\d.]+)\)/)![1]);
  const out: number[][] = [];
  (document.querySelector('[data-testid="count-up"]') as HTMLButtonElement).click();
  await settle();
  for (let t = 8; t <= 708; t += 8) { vi.advanceTimersByTime(8); await settle(); out.push([t, y('d0'), y('d1')]); }
  const trace = out;
  const units = trace.map((r) => -r[1] / 36), tens = trace.map((r) => -r[2] / 36);
  // Forward: from 9 the units pass 9.5 (never back through 8.5) and land on 0.
  // (The strip shows the digit mod 10, so past 9 it reads just over 0: never back near 8.)
  expect(units.every((u) => u > 8.6 || u < 0.6)).toBe(true);
  expect(units.some((u) => u > 9.3)).toBe(true);
  const firstMove = (xs: number[], from: number) => trace.find((_, i) => Math.abs(xs[i] - from) > 0.05)?.[0] ?? Infinity;
  expect(firstMove(units, 9)).toBeLessThan(firstMove(tens, 1));
  vi.advanceTimersByTime(2000);
  await expect.poll(digits).toEqual([0, 2, 0]);
  await expect.poll(() => svg.querySelector('desc')!.textContent).toBe('Streak: 20 days');
});

test('taking one back turns back; a far jump lands every drum; reduced motion goes at once', async () => {
  await openPage('/gadgets/counter-drum', 'graphite', { media: { 'prefers-reduced-motion': 'reduce' } });
  await userEvent.click(page.getByRole('button', { name: 'Take one back' }));
  expect(digits()).toEqual([0, 1, 1]);
  await userEvent.click(page.getByRole('button', { name: '99', exact: true }));
  expect(digits()).toEqual([0, 9, 9]);
  await userEvent.click(page.getByRole('button', { name: 'Start again' }));
  expect(digits()).toEqual([0, 0, 0]);
});

test('the flat tier has no filters, and the server string shows the count', async () => {
  await openPage('/gadgets/counter-drum', 'bone');
  const tiers = all('[data-testid="counter-tiers"] svg[data-gadget]');
  expect(tiers.map((e) => e.getAttribute('data-tier'))).toEqual(['full', 'full', 'lite', 'flat']);
  expect(tiers[3].querySelectorAll('filter')).toHaveLength(0);
  const still = document.querySelector('[data-testid="counter-static"] svg')!;
  expect([...still.querySelectorAll('[data-part="drum"]')].map((e) => e.getAttribute('data-value'))).toEqual(['0', '1', '2']);
  expect(still.querySelector('desc')!.textContent).toBe('Streak: 12 days');
});
