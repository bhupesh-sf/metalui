import { afterEach, expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { COLORWAYS, capture, openPage, until } from './harness';

// The glass badge, an inset gadget drawn from its spec: a person printed on backlit glass in a steel
// bezel, the light rising when signed in, the lamp saying expired, and no sound.
const light = (svg: Element) => Number((svg.querySelector('[data-id="light"]') as HTMLElement).style.opacity);
const all = (css: string) => [...document.querySelectorAll(css)];
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
/** A Base UI switch by its aria-label: the locator engine's role query does not name these (harness candidate). */
const toggle = (name: string) => page.elementLocator(document.querySelector(`[role="switch"][aria-label="${name}"]`)!);

for (const colorway of COLORWAYS) {
  test(`the glass badge in ${colorway}`, async () => {
    await openPage('/gadgets/glass-badge', colorway);
    const states = all('[data-testid="badge-states"] svg[data-gadget="glass-badge"]');
    expect(states).toHaveLength(3);
    expect(states.map((e) => e.getAttribute('data-state'))).toEqual(['rest', 'signed-in', 'expired']);
    expect(states.map(light)).toEqual([0.08, 0.92, 0.92]);
    expect(states.map((e) => [e.querySelector('[data-part="lamp"]')!.getAttribute('data-lamp'), e.querySelector('[data-part="lamp"]')!.getAttribute('data-gesture')])).toEqual([['off', 'steady'], ['live', 'rise'], ['waiting', 'steady']]);
    // The person is printed in the glass, under its surface.
    expect(states[0].querySelectorAll('[data-part="bezel.light"] [data-part="glyph"][data-name="friend"]')).toHaveLength(1);
    expect(states[1].querySelector('desc')!.textContent).toBe('Account, signed in');
    await capture(`gadget-glass-badge-${colorway}`, document.querySelector('[data-testid="badge-states"]')!);
  });
}

test('signing in raises the light on the settle spring; expired keeps it and turns the lamp amber', async () => {
  await openPage('/gadgets/glass-badge', 'bone');
  const badge = page.getByTestId('badge');
  badge.element().scrollIntoView({ block: 'center' });
  // The spring runs on a clock the slice controls: sampled every frame for 1.2 s, however busy the machine.
  await clock();
  await userEvent.click(toggle('Signed in'));
  await expect.element(badge).toHaveAttribute('data-state', 'signed-in');
  const trace: number[] = [];
  for (let t = 0; t <= 1200; t += 16) { vi.advanceTimersByTime(16); trace.push(light(badge.element())); }
  // It rises between dark and full (never past full).
  expect(trace.some((a) => a > 0.09 && a < 0.91)).toBe(true);
  expect(Math.max(...trace)).toBeLessThanOrEqual(0.921);
  expect(trace[trace.length - 1]).toBeCloseTo(0.92, 2);
  await userEvent.click(toggle('Expired'));
  await expect.element(badge).toHaveAttribute('data-state', 'expired');
  vi.advanceTimersByTime(1200);
  await expect.element(page.elementLocator(badge.element().querySelector('[data-part="lamp"]')!)).toHaveAttribute('data-lamp', 'waiting');
  expect(light(badge.element())).toBeCloseTo(0.92, 2);
});

test('with reduced motion the light goes straight up; the flat tier has no filters; the server string is signed in', async () => {
  await openPage('/gadgets/glass-badge', 'graphite', { media: { 'prefers-reduced-motion': 'reduce' } });
  await userEvent.click(toggle('Signed in'));
  expect(light(page.getByTestId('badge').element())).toBe(0.92);
  const tiers = all('[data-testid="badge-tiers"] svg[data-gadget]');
  expect(tiers.map((e) => e.getAttribute('data-tier'))).toEqual(['full', 'full', 'lite', 'flat']);
  await expect.element(page.elementLocator(document.querySelector('[data-testid="badge-static"] svg[data-gadget]')!)).toHaveAttribute('data-state', 'signed-in');
});
