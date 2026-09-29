import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { COLORWAYS, capture, openPage } from './harness';

const all = (root: ParentNode, css: string) => [...root.querySelectorAll(css)];
const looks = () => all(page.getByTestId('nib-looks').element(), 'svg[role="img"]');

// The Nib Part on Parts › Nib: turned about its tip, its tip wet with ink, a slit and a breather hole.
for (const colorway of COLORWAYS) {
  test(`nibs in ${colorway}`, async () => {
    await openPage('/components/nib', colorway);
    await expect.poll(() => looks().length).toBe(3);
    expect(looks().map((e) => e.querySelector('[data-part="nib"]')!.getAttribute('data-angle'))).toEqual(['0', '-20', '20']);
    // It turns about its tip: the tip stays where it is.
    const tips = looks().map((e) => e.querySelector('[data-part="nib"]')!.getAttribute('transform')!.match(/translate\(([-\d.]+) ([-\d.]+)\)/)!.slice(1).join(','));
    expect(new Set(tips).size).toBe(1);
    expect(all(looks()[0], '[data-part="nib.ink"]')).toHaveLength(1);
    expect(all(looks()[0], '[data-part="nib"] circle')).toHaveLength(1);
    await capture(`nib-${colorway}`, page.getByTestId('nib-looks').element());
  });
}
