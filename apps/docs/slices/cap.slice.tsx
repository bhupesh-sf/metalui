import { expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { COLORWAYS, capture, openPage, press, release } from './harness';

const all = (root: ParentNode, css: string) => [...root.querySelectorAll(css)];
const svgs = (id: string) => all(page.getByTestId(id).element(), 'svg[role="img"]');

// The Cap Part on Parts › Cap: faders and knobs, detail by size, and a cap that sinks when pressed
// and comes back when let go, by pointer or keyboard, on the release spring or at once.
const sink = (cap: Element) => new DOMMatrix(getComputedStyle(cap.querySelector('[data-part="cap.face"]')!).transform).f;
const ribs = (e: Element) => e.querySelector('[data-part="cap.face"] path[stroke]')!.getAttribute('d')!.match(/M/g)!.length;

for (const colorway of COLORWAYS) {
  test(`caps in ${colorway}`, async () => {
    await openPage('/components/cap', colorway);
    await expect.poll(() => svgs('cap-looks').length).toBe(8);
    const looks = svgs('cap-looks');
    expect(looks.map((e) => e.querySelector('[data-shape]')!.getAttribute('data-shape'))).toEqual(['fader', 'fader', 'fader', 'fader', 'knob', 'knob', 'rocker', 'rocker']);
    // A rocker rocks: off, its lower half faces the light; on, its upper half.
    expect(Number(looks[6].querySelector('[data-rocker="bottom-lit"]')!.getAttribute('opacity'))).toBeGreaterThan(0);
    expect(Number(looks[7].querySelector('[data-rocker="top-lit"]')!.getAttribute('opacity'))).toBeGreaterThan(0);
    // Three ribs (a groove and its lit edge each) on a fader, five when asked; a pointer on a knob.
    expect(ribs(looks[0])).toBe(3);
    expect(ribs(looks[3])).toBe(5);
    expect(all(looks[4], '[data-part="cap.face"] path[stroke]')).toHaveLength(2);
    expect(all(looks[0], '[data-part="cap.shadow"]')).toHaveLength(1);
    await capture(`cap-${colorway}`, page.getByTestId('cap-looks').element());
  });
}

test('the flat tier has no filters and no ribs', async () => {
  await openPage('/components/cap', 'bone');
  const tiers = svgs('cap-tiers');
  expect(tiers.map((e) => e.getAttribute('data-tier'))).toEqual(['full', 'full', 'lite', 'flat']);
  expect(tiers[3].querySelectorAll('filter').length).toBe(0);
  expect(all(tiers[3], '[data-part="cap.face"] path[stroke]')).toHaveLength(0);
});

test('held down it sinks; let go it comes back', async () => {
  await openPage('/components/cap', 'graphite');
  const cap = page.getByTestId('cap-press').element() as HTMLElement;
  cap.scrollIntoView({ block: 'center' });
  await press(cap);
  await expect.poll(() => cap.getAttribute('aria-pressed')).toBe('true');
  await expect.poll(() => sink(cap)).toBeGreaterThan(8);          // 2.5 units at 200 units wide, in canvas units
  await release(cap);
  await expect.poll(() => cap.getAttribute('aria-pressed')).toBe('false');
  await expect.poll(() => sink(cap)).toBeCloseTo(0, 1);
  // The keyboard holds it too.
  cap.focus();
  await userEvent.keyboard('[Space>]');
  await expect.poll(() => cap.getAttribute('aria-pressed')).toBe('true');
  await userEvent.keyboard('[/Space]');
  await expect.poll(() => cap.getAttribute('aria-pressed')).toBe('false');
});

test('with reduced motion it sinks at once', async () => {
  await openPage('/components/cap', 'bone', { media: { 'prefers-reduced-motion': 'reduce' } });
  const cap = page.getByTestId('cap-press').element() as HTMLElement;
  cap.focus();
  await userEvent.keyboard('[Space>]');
  expect(sink(cap)).toBeGreaterThan(8);
  await userEvent.keyboard('[/Space]');
});
