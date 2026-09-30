import { afterEach, expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { COLORWAYS, capture, openPage, until } from './harness';

// The scope, an inset gadget drawn from its spec: an ice-glass face sunk in a stone bezel, a beam that
// sweeps while searching (looping), blips lit as the beam crosses them, and its states.
const sample = () => {
  const s = document.querySelector('[data-testid="scope"]')!, beam = s.querySelector('[data-id="beam"]')!;
  const m = (beam.getAttribute('transform') || '').match(/rotate\(([-\d.]+)\)/);
  return [m ? +m[1] : 0, ...['b1', 'b2', 'b3'].map((b) => +getComputedStyle(s.querySelector(`[data-id="${b}"]`)!).opacity)];
};
const all = (css: string) => [...document.querySelectorAll(css)];
const opacityOf = (e: Element, id: string) => (e.querySelector(`[data-id="${id}"]`) as SVGElement).style.opacity;
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
  test(`the scope in ${colorway}`, async () => {
    await openPage('/gadgets/scope', colorway);
    const states = all('[data-testid="scope-states"] svg[data-gadget="scope"]');
    expect(states).toHaveLength(4);
    const found = states[2];
    // Layers: the glass, the light in it (clipped to it), then its surface, the wall shade and the frame.
    expect([...found.querySelectorAll('[data-layer]')].map((l) => l.getAttribute('data-layer'))).toEqual(['body', 'parts', 'top', 'lamp']);
    expect(found.querySelectorAll('[data-layer="body"] [data-part="glass"]')).toHaveLength(1);
    expect(found.querySelector('[data-part="bezel.light"]')!.getAttribute('clip-path')).toMatch(/url\(#/);
    expect(found.querySelectorAll('[data-layer="top"] [data-part="bezel"]')).toHaveLength(1);
    expect(found.querySelectorAll('[data-layer="top"] [data-part="bezel.shade"]')).toHaveLength(1);
    // Found lights its blips; rest leaves them dark.
    expect(['b1', 'b2', 'b3'].map((b) => opacityOf(found, b))).toEqual(['1', '1', '1']);
    expect(opacityOf(states[0], 'b1')).toBe('0');
    expect(states[1].querySelector('[data-part="lamp"]')!.getAttribute('data-gesture')).toBe('breathe');
    await capture(`gadget-scope-${colorway}`, document.querySelector('[data-testid="scope-states"]')!);
  });
}

test('searching sweeps the beam round and round, and each blip lights as the beam reaches it', async () => {
  // The page's clock is the slice's from before the page opens: every act starts on it, so the sweep is
  // sampled at exact times however busy the machine. Frames stay real; time moves only when advanced.
  vi.useFakeTimers({ toFake: ['performance', 'Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  await openPage('/gadgets/scope', 'bone');
  page.getByTestId('scope').element().scrollIntoView({ block: 'center' });
  const frame = () => new Promise((r) => requestAnimationFrame(r));
  // Sampled every 20 ms for 3.2 s: the clock moves 20 ms, a real frame paints it, the slice reads it.
  const trace: number[][] = [];
  for (let t = 20; t <= 3220; t += 20) { vi.advanceTimersByTime(20); await frame(); trace.push([t, ...sample()]); }
  const angles = trace.map((r) => r[1]);
  expect(Math.max(...angles)).toBeGreaterThan(300);                           // it goes all the way round
  // It loops: after reaching the end of a turn it starts again from the top.
  expect(angles.some((a, i) => i > 0 && angles[i - 1] - a > 180)).toBe(true);        // a drop of more than half a turn
  // Each blip is lit while the beam is just past it, and never before its angle in that turn.
  for (const [k, deg] of [[2, 315], [3, 115], [4, 197]] as const) {     // b1 up-left, b2 right-down, b3 down-left
    const lit = trace.filter((r) => r[k] > 0.6);
    expect(lit.length).toBeGreaterThan(0);
    for (const r of lit) expect(((r[1] - deg + 360) % 360)).toBeLessThan(160);   // the beam is within the fade behind it
  }
});

test('found stops the beam where it is and lights the blips; nothing leaves them dark', async () => {
  await openPage('/gadgets/scope', 'graphite');
  const scope = page.getByTestId('scope'), state = page.getByRole('radiogroup', { name: 'State', exact: true });
  await clock();
  await userEvent.click(state.getByRole('radio', { name: 'found' }));
  await expect.element(scope).toHaveAttribute('data-state', 'found');
  for (let t = 0; t < 2000 && sample().slice(1).join() !== '1,1,1'; t += 16) { vi.advanceTimersByTime(16); await settle(); }
  expect(sample().slice(1)).toEqual([1, 1, 1]);
  const a0 = sample()[0];
  vi.advanceTimersByTime(400); await settle();
  expect(sample()[0]).toBe(a0);                                               // stopped
  await userEvent.click(state.getByRole('radio', { name: 'nothing' }));
  for (let t = 0; t < 2000 && sample().slice(1).join() !== '0,0,0'; t += 16) { vi.advanceTimersByTime(16); await settle(); }
  expect(sample().slice(1)).toEqual([0, 0, 0]);
  await expect.poll(() => scope.element().querySelector('desc')!.textContent).toBe('Search: nothing');
});

test('the flat tier has no filters, and the server string draws the lit blips', async () => {
  await openPage('/gadgets/scope', 'bone');
  const tiers = all('[data-testid="scope-tiers"] svg[data-gadget]');
  expect(tiers.map((e) => e.getAttribute('data-tier'))).toEqual(['full', 'full', 'lite', 'flat']);
  expect(tiers[3].querySelectorAll('filter')).toHaveLength(0);
  expect(opacityOf(document.querySelector('[data-testid="scope-static"]')!, 'b1')).toBe('1');
});
