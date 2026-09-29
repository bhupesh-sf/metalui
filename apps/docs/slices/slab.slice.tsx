import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import tokens from '../../../tokens/tokens.json';
import { COLORWAYS, capture, openPage } from './harness';

// The Slab Part on Parts › Slab: six materials × four kinds of cut, detail tiers by size, the host's
// world (graphite deepens shadows, increased contrast deepens them more), and a press that answers.
const G = tokens.gadgets;
const cast = G.materials.stone.shadow.cast[3];
const all = (root: ParentNode, css: string) => [...root.querySelectorAll(css)];
const castAlpha = (sel: string) =>
  Number(document.querySelector(sel)!.querySelector('filter[data-material] feFlood')?.getAttribute('flood-opacity'));

for (const colorway of COLORWAYS) {
  test(`slab sheet in ${colorway}`, async () => {
    await openPage('/components/slab', colorway);
    const sheet = page.getByTestId('slab-sheet').element();
    await expect.poll(() => all(sheet, 'svg[data-material]').length).toBe(24);
    expect(sheet.querySelector('svg[data-material]')!.getAttribute('data-host')).toBe(colorway);
    // Every cut has a floor, drawn under the body.
    const stone = all(sheet, '[data-slab="stone"]');
    expect(all(stone[0], '[data-cut="slot"]')).toHaveLength(3);
    expect(all(stone[1], '[data-cut="hole"]')).toHaveLength(3);
    expect(castAlpha('[data-slab="stone"] svg')).toBeCloseTo(cast * G.host[colorway].shadow, 3);
    await capture(`slab-${colorway}`, sheet);
  });
}

test('detail follows size: full, lite, then flat with no filters at all', async () => {
  await openPage('/components/slab', 'bone');
  const tiers = () => all(page.getByTestId('slab-tiers').element(), 'svg[data-material]');
  await expect.poll(() => tiers().length).toBe(4);
  expect(tiers().map((e) => e.getAttribute('data-tier'))).toEqual(['full', 'full', 'lite', 'flat']);
  expect(tiers()[3].querySelectorAll('filter').length).toBe(0);
  expect(tiers()[2].querySelectorAll('feTurbulence').length).toBe(0); // lite: no grain
  expect(tiers()[0].querySelectorAll('feTurbulence').length).toBeGreaterThan(0);
});

test('increased contrast deepens the shadows', async () => {
  await openPage('/components/slab', 'bone', { media: { 'prefers-contrast': 'more' } });
  expect(castAlpha('[data-slab="stone"] svg')).toBeCloseTo(cast * G.host.contrast.shadow, 3);
});

test('a pressed slab gives by its material', async () => {
  await openPage('/components/slab', 'graphite');
  const rubber = document.querySelector('[data-slab="rubber"]')!;
  rubber.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, composed: true }));
  expect(rubber.getAnimations().length).toBeGreaterThan(0);
});
