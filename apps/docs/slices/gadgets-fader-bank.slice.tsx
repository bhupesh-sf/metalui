import { afterEach, expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { COLORWAYS, capture, openPage, until } from './harness';

// The fader bank, a held gadget drawn from its spec: three caps in slots cut from their travel, the
// mix moving the bank together until caps meet their walls, and its states.
const placesOf = (g: Element) => [...g.querySelectorAll('[data-drive]')].map((e) => Number((e.getAttribute('transform') ?? '').match(/translate\(0 ([-\d.]+)\)/)?.[1] ?? 0));
const all = (css: string) => [...document.querySelectorAll(css)];
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
  test(`the fader bank in ${colorway}`, async () => {
    await openPage('/gadgets/fader-bank', colorway);
    const states = all('[data-testid="bank-states"] svg[data-gadget="fader-bank"]');
    expect(states).toHaveLength(3);
    const one = states[1];
    // Three slots cut into the body (one per cap, as long as its travel) and the lamp's hole.
    expect(one.querySelectorAll('[data-cut="slot"]')).toHaveLength(3);
    expect(one.querySelectorAll('[data-cut="hole"]')).toHaveLength(1);
    expect(one.querySelectorAll('[data-part="cap"]')).toHaveLength(3);
    expect(one.querySelector('[data-accent="true"]')!.getAttribute('data-id')).toBe('cap2');
    // Each cap at its own rest place: 0.3, 0.72 and 0.5 along the slot (92 down to −92).
    const at = placesOf(one);
    expect(at[0]).toBeCloseTo(36.8, 1); expect(at[1]).toBeCloseTo(-40.48, 1); expect(at[2]).toBeCloseTo(0, 1);
    expect(states.map((e) => e.querySelector('[data-part="lamp"]')!.getAttribute('data-lamp'))).toEqual(['off', 'live', 'live']);
    await capture(`gadget-fader-bank-${colorway}`, document.querySelector('[data-testid="bank-states"]')!);
  });
}

test('the mix moves the bank together until the caps meet the tops', async () => {
  await openPage('/gadgets/fader-bank', 'bone');
  const bank = () => page.getByTestId('bank').element();
  // The drive runs on a clock the slice controls: each move is run until it has settled.
  await clock();
  await userEvent.click(page.getByRole('button', { name: 'All the way up' }));
  await run(3000);
  expect(placesOf(bank()).map((y) => Math.round(y))).toEqual([-55, -92, -92]);
  await userEvent.click(page.getByRole('button', { name: 'All the way down' }));
  await run(3000);
  expect(placesOf(bank()).map((y) => Math.round(y))).toEqual([92, 52, 92]);            // cap 2 keeps its lead: 0.72 − 0.5
  await userEvent.click(page.getByRole('button', { name: 'Back to rest' }));
  await run(3000);
  // Cap 1 rests at −40.5: the drive settles within a fraction of a unit of it, from either side.
  expect(placesOf(bank()).every((y, i) => Math.abs(y - [37, -40.5, 0][i]) <= 0.75)).toBe(true);
  // The slider is the same value.
  (page.getByRole('slider', { name: 'Mix' }).element() as HTMLElement).focus();
  await userEvent.keyboard('{End}');
  await run(3000);
  expect(placesOf(bank()).map((y) => Math.round(y))).toEqual([-55, -92, -92]);
});

test('changed flickers the lamp and says so', async () => {
  await openPage('/gadgets/fader-bank', 'graphite');
  const bank = page.getByTestId('bank');
  await userEvent.click(page.getByRole('radiogroup', { name: 'State', exact: true }).getByRole('radio', { name: 'changed' }));
  await expect.element(page.elementLocator(bank.element().querySelector('[data-part="lamp"]')!)).toHaveAttribute('data-gesture', 'flicker');
  await expect.poll(() => bank.element().querySelector('desc')!.textContent).toBe('Settings: changed');
});

test('with reduced motion the caps go straight to their places', async () => {
  await openPage('/gadgets/fader-bank', 'bone', { media: { 'prefers-reduced-motion': 'reduce' } });
  await userEvent.click(page.getByRole('button', { name: 'All the way up' }));
  expect(placesOf(page.getByTestId('bank').element()).map((y) => Math.round(y))).toEqual([-55, -92, -92]);
});

test('the server string draws the caps at their rest places, and the flat tier has no filters', async () => {
  await openPage('/gadgets/fader-bank', 'bone');
  expect(placesOf(document.querySelector('[data-testid="bank-static"] svg')!).map((y) => Math.round(y))).toEqual([37, -40, 0]);
  const tiers = all('[data-testid="bank-tiers"] svg[data-gadget]');
  expect(tiers.map((e) => e.getAttribute('data-tier'))).toEqual(['full', 'full', 'lite', 'flat']);
  expect(tiers[3].querySelectorAll('filter')).toHaveLength(0);
});
