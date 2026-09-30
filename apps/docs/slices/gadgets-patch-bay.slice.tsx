import { afterEach, expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { COLORWAYS, capture, openPage, until } from './harness';

// The gadget renderer, proven by the patch bay: a spec in, a working gadget out. Every state, the act,
// detail by size, the server string, and composing a new gadget by editing its spec.
const plugAt = (g: Element) => {
  const m = (g.querySelector('[data-id="plugA"] [data-part="plug"]')!.getAttribute('transform') ?? '').match(/translate\(([-\d.]+) ([-\d.]+)\) rotate\(([-\d.]+)/);
  return m ? m.slice(1).map(Number) : [128, 180, 0];
};
const all = (css: string) => [...document.querySelectorAll(css)];
const within = (el: Element, css: string) => page.elementLocator(el.querySelector(css)!);
const realTimeout = setTimeout;
/** Lets React commit what the frames set (it schedules on a message, not a timer). */
const settle = () => new Promise((r) => realTimeout(r, 0));
/** Runs the page's frames for `ms` on the slice's clock, letting React commit after each; `each` samples. */
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
  test(`every state of the patch bay in ${colorway}`, async () => {
    await openPage('/gadgets/patch-bay', colorway);
    const states = all('[data-testid="bay-states"] svg[data-gadget="patch-bay"]');
    expect(states).toHaveLength(5);
    expect(states.map((e) => e.getAttribute('data-state'))).toEqual(['rest', 'connected', 'syncing', 'done', 'failed']);
    expect(states.map((e) => { const l = e.querySelector('[data-part="lamp"]')!; return `${l.getAttribute('data-lamp')}/${l.getAttribute('data-gesture')}`; }))
      .toEqual(['off/steady', 'live/steady', 'waiting/breathe', 'live/steady', 'failed/blink2']);
    // Every Part the spec names is drawn: a slab, two jacks with their sockets cut, two plugs, the cord, the beeper.
    const one = states[1];
    expect(one.querySelectorAll('[data-cut="hole"]')).toHaveLength(3);
    expect(one.querySelectorAll('[data-part="jack"]')).toHaveLength(2);
    expect(one.querySelectorAll('[data-part="plug"]')).toHaveLength(2);
    expect(one.querySelectorAll('[data-accent="true"] [data-part="plug"]')).toHaveLength(1);
    expect(one.querySelectorAll('[data-part="cable"]')).toHaveLength(1);
    expect(one.querySelectorAll('[data-part="beeper"]')).toHaveLength(1);
    // It speaks its state, and failed carries its hint.
    expect(states[4].querySelector('desc')!.textContent).toBe('Sync: failed, check your connection');
    await capture(`gadget-patch-bay-${colorway}`, document.querySelector('[data-testid="bay-states"]')!);
  });
}

test('failed pulls the plug out; done brings it home and lands with a flicker', async () => {
  await openPage('/gadgets/patch-bay', 'bone');
  const bay = page.getByTestId('bay'), state = page.getByRole('radiogroup', { name: 'State', exact: true });
  // The springs run on a clock the slice controls, until they have settled.
  await clock();
  await userEvent.click(state.getByRole('radio', { name: 'failed' }));
  await expect.element(bay).toHaveAttribute('data-state', 'failed');
  await run(2000);
  expect(plugAt(bay.element())).toEqual([106, 134, -14]);           // lying aside: x −22, y −46, r −14
  await expect.element(within(bay.element(), '[data-part="lamp"]')).toHaveAttribute('data-lamp', 'failed');
  // The cord's end went with it.
  expect(bay.element().querySelector('[data-id="cable"] [data-part="cable"] path')!.getAttribute('d')).toMatch(/^M106,134 /);
  await userEvent.click(state.getByRole('radio', { name: 'done' }));
  await expect.element(within(bay.element(), '[data-part="lamp"]')).toHaveAttribute('data-gesture', 'flicker');
  await run(2000);
  expect(plugAt(bay.element())).toEqual([128, 180, 0]);
  await expect.poll(() => bay.element().querySelector('desc')!.textContent).toBe('Sync: done');
});

test('an act lifts the plug and seats it again, its cord following', async () => {
  await openPage('/gadgets/patch-bay', 'graphite');
  const svg = page.getByTestId('bay').element();
  svg.scrollIntoView({ block: 'center' });
  // The act runs on a clock the slice controls, sampled every 10 ms for 1.1 s.
  const plug = svg.querySelector('[data-id="plugA"] [data-part="plug"]')!;
  const cord = () => svg.querySelector('[data-id="cable"] path')!;
  const trace: { y: number; cordY: number }[] = [];
  await clock();
  (document.querySelector('[data-testid="bay-act"]') as HTMLButtonElement).click();
  await run(1100, 10, () => {
    const m = (plug.getAttribute('transform') ?? '').match(/translate\([-\d.]+ ([-\d.]+)\)/);
    trace.push({ y: m ? Number(m[1]) : 180, cordY: Number(cord().getAttribute('d')!.split(' ')[0].split(',')[1]) });
  });
  expect(Math.min(...trace.map((t) => t.y))).toBeLessThan(170);           // it lifted
  expect(trace[trace.length - 1].y).toBeCloseTo(180, 0);                   // and seated
  expect(trace.every((t) => Math.abs(t.cordY - t.y) < 0.5)).toBe(true);    // the cord's end rode with it
});

test('with reduced motion the state poses snap, and done still lands', async () => {
  await openPage('/gadgets/patch-bay', 'bone', { media: { 'prefers-reduced-motion': 'reduce' } });
  const bay = page.getByTestId('bay'), state = page.getByRole('radiogroup', { name: 'State', exact: true });
  await userEvent.click(state.getByRole('radio', { name: 'failed' }));
  expect(plugAt(bay.element())).toEqual([106, 134, -14]);
  await userEvent.click(state.getByRole('radio', { name: 'done' }));
  expect(plugAt(bay.element())).toEqual([128, 180, 0]);
  await expect.element(within(bay.element(), '[data-part="lamp"]')).toHaveAttribute('data-gesture', 'flicker');
});

test('detail follows size, the flat tier has no filters, and the server string matches', async () => {
  await openPage('/gadgets/patch-bay', 'bone');
  const tiers = all('[data-testid="bay-tiers"] svg[data-gadget]');
  expect(tiers.map((e) => e.getAttribute('data-tier'))).toEqual(['full', 'full', 'lite', 'flat']);
  expect(tiers[3].querySelectorAll('filter')).toHaveLength(0);
  const still = page.elementLocator(document.querySelector('[data-testid="bay-static"] svg')!);
  await expect.element(still).toHaveAttribute('data-state', 'failed');
  await expect.element(still).toHaveAttribute('data-tier', 'full');
  expect(still.element().querySelectorAll('[data-part="plug"]')).toHaveLength(2);
  expect(still.element().querySelector('desc')!.textContent).toBe('Sync: failed, check your connection');
});

test('composing: a remix redraws, a broken spec explains itself, a fix draws again', async () => {
  await openPage('/gadgets/patch-bay', 'bone');
  const compose = page.getByTestId('compose');
  const gadget = () => document.querySelector('[data-testid="compose-gadget"]');
  await userEvent.click(compose.getByRole('button', { name: 'Move the lamp' }));
  await expect.poll(() => gadget()?.querySelector('[data-part="lamp"]')?.getAttribute('cx')).toBe('87');
  await expect.poll(() => gadget()?.querySelector('[data-slots]')?.getAttribute('data-slots')).toBe('3');
  await userEvent.click(compose.getByRole('button', { name: 'Touch the other plug' }));
  await expect.poll(() => gadget()?.querySelector('[data-accent="true"]')?.getAttribute('data-id')).toBe('plugB');
  await capture('gadget-compose-bone', compose.element());
  // Invent a Part: the validator names it and the fix.
  const box = compose.getByRole('textbox', { name: 'Gadget spec' });
  const text = (box.element() as HTMLTextAreaElement).value;
  await userEvent.fill(box, text.replace('"part": "beeper"', '"part": "spring"'));
  await expect.poll(() => compose.element().querySelector('[data-result="problems"] li')).toBeTruthy();
  await expect.element(page.elementLocator(compose.element().querySelector('[data-result="problems"] li')!)).toBeVisible();
  await expect.poll(gadget).toBeNull();
  await userEvent.fill(box, text);
  await expect.element(page.getByTestId('compose-gadget')).toBeVisible();
});
