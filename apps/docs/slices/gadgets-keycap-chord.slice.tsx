import { afterEach, expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { COLORWAYS, capture, openPage, until } from './harness';

// The keycap chord, drawn from its spec: two keys in a tray sunk into a ceramic slab, and its act, a
// chord: the keys drop one after another (60 ms apart) and come back exactly.
const drops = () => {
  const s = document.querySelector('[data-testid="chord"]')!, faces = [...s.querySelectorAll('[data-moves]')];
  return faces.map((f) => { const m = (f.getAttribute('transform') || '').match(/translate\(([-\d.]+) ([-\d.]+)\)/); return m ? +m[2] : null; });
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
  test(`the keycap chord in ${colorway}`, async () => {
    await openPage('/gadgets/keycap-chord', colorway);
    const states = all('[data-testid="chord-states"] svg[data-gadget="keycap-chord"]');
    expect(states).toHaveLength(3);
    const one = states[1];
    expect(one.querySelectorAll('[data-cut="tray"]')).toHaveLength(1);
    expect([...one.querySelectorAll('[data-part="key"]')].map((e) => e.getAttribute('data-glyph'))).toEqual(['⌘', 'K']);
    expect(one.querySelector('[data-accent="true"]')!.getAttribute('data-id')).toBe('k');
    expect(states.map((e) => e.querySelector('[data-part="lamp"]')!.getAttribute('data-lamp'))).toEqual(['off', 'live', 'live']);
    await capture(`gadget-keycap-chord-${colorway}`, document.querySelector('[data-testid="chord-states"]')!);
  });
}

test('the chord: ⌘ drops first, K after, both come back exactly', async () => {
  await openPage('/gadgets/keycap-chord', 'bone');
  page.getByTestId('chord').element().scrollIntoView({ block: 'center' });
  // The chord runs on a clock the slice controls, sampled every 8 ms for 0.7 s.
  await clock();
  const trace: (number | null)[][] = [];
  (document.querySelector('[data-testid="chord-act"]') as HTMLButtonElement).click();
  await settle();
  for (let t = 8; t <= 708; t += 8) { vi.advanceTimersByTime(8); await settle(); trace.push([t, ...drops()]); }
  const rest = trace[0][1]!, deep = (i: number) => trace.find((r) => (r[i] as number) > rest + 5)?.[0] as number;
  expect(deep(1)).toBeLessThan(deep(2));                                 // ⌘ bottoms out before K
  expect(deep(2) - deep(1)).toBeGreaterThan(30);                         // about 60 ms apart
  const last = trace[trace.length - 1];
  expect(last[1]).toBeCloseTo(rest, 1); expect(last[2]).toBeCloseTo(rest, 1);   // both home exactly
  await expect.element(page.elementLocator(document.querySelector('[data-testid="chord"] [data-part="lamp"]')!)).toHaveAttribute('data-gesture', 'flicker');
});

test('entering chord plays it; with reduced motion the keys still dip', async () => {
  await openPage('/gadgets/keycap-chord', 'graphite', { media: { 'prefers-reduced-motion': 'reduce' } });
  const chord = page.getByTestId('chord');
  // The dip is brief: every frame of it is read, on a clock the slice controls.
  await clock();
  await userEvent.click(page.getByRole('radiogroup', { name: 'State', exact: true }).getByRole('radio', { name: 'chord' }));
  await expect.element(chord).toHaveAttribute('data-state', 'chord');
  let deepest = -Infinity;
  for (let t = 0; t < 1000 && deepest <= 218; t += 8) { deepest = Math.max(deepest, ...(drops() as number[])); vi.advanceTimersByTime(8); await settle(); }
  expect(deepest).toBeGreaterThan(218);
});

test('the flat tier has no filters, and the server string draws both keys', async () => {
  await openPage('/gadgets/keycap-chord', 'bone');
  const tiers = all('[data-testid="chord-tiers"] svg[data-gadget]');
  expect(tiers.map((e) => e.getAttribute('data-tier'))).toEqual(['full', 'full', 'lite', 'flat']);
  expect(tiers[3].querySelectorAll('filter')).toHaveLength(0);
  expect(document.querySelectorAll('[data-testid="chord-static"] [data-part="key"]')).toHaveLength(2);
});
