import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { COLORWAYS, capture, openPage } from './harness';

const all = (root: ParentNode, css: string) => [...root.querySelectorAll(css)];
const svgs = (id: string) => all(page.getByTestId(id).element(), 'svg[role="img"]');

// The Bezel Part on Parts › Bezel: a frame around sunk glass, round or square, its glass in a
// gadget's face colour, and detail by size.
for (const colorway of COLORWAYS) {
  test(`bezels in ${colorway}`, async () => {
    await openPage('/components/bezel', colorway);
    await expect.poll(() => svgs('bezel-looks').length).toBe(3);
    const looks = svgs('bezel-looks');
    expect(looks.map((e) => `${e.getAttribute('data-material')}/${e.getAttribute('data-opening')}`)).toEqual(['stone/round', 'metal/round', 'clay/square']);
    // The frame is a ring: its opening is cut through, and the glass sits below it, shaded by its wall.
    const one = looks[0];
    const slab = one.querySelector('[data-part="bezel"] [data-part="slab"]')!;
    expect({ rule: slab.getAttribute('fill-rule'), outlines: (slab.getAttribute('d')!.match(/M/g) ?? []).length }).toEqual({ rule: 'evenodd', outlines: 2 });
    expect(one.querySelector('[data-part="bezel.face"]')!.getAttribute('filter')).toMatch(/url\(#/);
    expect(all(one, '[data-part="glass.rings"] circle')).toHaveLength(2);
    expect(all(looks[2], '[data-part="glass.rings"]')).toHaveLength(0);
    // Order: the glass, then light, then its surface, all under the frame.
    expect(all(one, '[data-part="glass"], [data-part="bezel.light"], [data-part="glass.glare"], [data-part="bezel"]').map((x) => x.getAttribute('data-part'))).toEqual(['glass', 'bezel.light', 'glass.glare', 'bezel']);
    await capture(`bezel-${colorway}`, page.getByTestId('bezel-looks').element());
  });
}

test('the flat tier has no filters, rings or glare', async () => {
  await openPage('/components/bezel', 'bone');
  const tiers = svgs('bezel-tiers');
  expect(tiers.map((e) => e.getAttribute('data-tier'))).toEqual(['full', 'full', 'lite', 'flat']);
  const flat = tiers[3];
  expect(flat.querySelectorAll('filter').length).toBe(0);
  expect(all(flat, '[data-part="glass.rings"], [data-part="glass.glare"]')).toHaveLength(0);
});
