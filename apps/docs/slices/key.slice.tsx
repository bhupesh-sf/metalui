import { expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { COLORWAYS, capture, openPage, press, release } from './harness';

const all = (root: ParentNode, css: string) => [...root.querySelectorAll(css)];
const svgs = (id: string) => all(page.getByTestId(id).element(), 'svg[role="img"]');

// The Key Part on Parts › Key: keys with engraved glyphs, detail by size, and a key whose face drops
// into its skirt when held and comes back when let go, the skirt never moving.
const faceDrop = (k: Element) => new DOMMatrix(getComputedStyle(k.querySelector('[data-part="key.face"]')!).transform).f;
const box = (el: Element) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };

for (const colorway of COLORWAYS) {
  test(`keys in ${colorway}`, async () => {
    await openPage('/components/key', colorway);
    await expect.poll(() => svgs('key-looks').length).toBe(4);
    const keys = svgs('key-looks');
    expect(keys.map((e) => e.querySelector('[data-part="key"]')!.getAttribute('data-glyph'))).toEqual(['⌘', 'K', '⇧', '↩']);
    // The glyph is engraved: a lit edge under a dark cut.
    expect(all(keys[0], '[data-part="key.face"] text')).toHaveLength(2);
    expect(all(keys[0], '[data-part="key.shadow"]')).toHaveLength(1);
    await capture(`key-${colorway}`, page.getByTestId('key-looks').element());
  });
}

test('the flat tier has no filters and one plain glyph', async () => {
  await openPage('/components/key', 'bone');
  const tiers = svgs('key-tiers');
  expect(tiers.map((e) => e.getAttribute('data-tier'))).toEqual(['full', 'full', 'lite', 'flat']);
  expect(tiers[3].querySelectorAll('filter').length).toBe(0);
  expect(all(tiers[3], 'text')).toHaveLength(1);
});

test('held, the face drops into the skirt; let go, it comes back; the skirt stays', async () => {
  await openPage('/components/key', 'graphite');
  const key = page.getByTestId('key-press').element() as HTMLElement;
  key.scrollIntoView({ block: 'center' });
  const skirt = box(key.querySelector('[data-part="key.skirt"]')!);
  await press(key);
  await expect.poll(() => key.getAttribute('aria-pressed')).toBe('true');
  await expect.poll(() => faceDrop(key)).toBeGreaterThan(10);        // 6 units at 220 wide, in canvas units
  expect(box(key.querySelector('[data-part="key.skirt"]')!)).toEqual(skirt);
  await release(key);
  await expect.poll(() => faceDrop(key)).toBeCloseTo(0, 1);
  key.focus();
  await userEvent.keyboard('[Space>]');
  await expect.poll(() => key.getAttribute('aria-pressed')).toBe('true');
  await userEvent.keyboard('[/Space]');
  await expect.poll(() => key.getAttribute('aria-pressed')).toBe('false');
});

test('with reduced motion it still dips, at once', async () => {
  await openPage('/components/key', 'bone', { media: { 'prefers-reduced-motion': 'reduce' } });
  const key = page.getByTestId('key-press').element() as HTMLElement;
  key.focus();
  await userEvent.keyboard('[Space>]');
  expect(faceDrop(key)).toBeGreaterThan(10);
  await userEvent.keyboard('[/Space]');
});
