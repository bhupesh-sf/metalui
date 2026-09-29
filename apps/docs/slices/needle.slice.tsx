import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { COLORWAYS, capture, openPage } from './harness';

const all = (root: ParentNode, css: string) => [...root.querySelectorAll(css)];
const looks = () => all(page.getByTestId('needle-looks').element(), 'svg[role="img"]');

// The Needle Part on Parts › Needle: values turn it across its arc, its scale and zone are printed in
// the glass, and it sits over the glass under its surface.
for (const colorway of COLORWAYS) {
  test(`needles in ${colorway}`, async () => {
    await openPage('/components/needle', colorway);
    await expect.poll(() => looks().length).toBe(4);
    // 0.2 → −36°, 0.5 → 0°, 0.9 → +48° on a 120° arc; 0.35 → −22.5° on a 150° arc.
    expect(looks().map((e) => Number(e.querySelector('[data-part="needle"]')!.getAttribute('transform')!.match(/rotate\(([-\d.]+)/)![1]))).toEqual([-36, 0, 48, -22.5]);
    expect(all(looks()[0], '[data-part="needle.scale"] path')).toHaveLength(9);
    expect(all(looks()[3], '[data-part="needle.scale"] path')).toHaveLength(13);
    expect(all(looks()[0], '[data-part="needle.zone"]')).toHaveLength(1);
    expect(all(looks()[3], '[data-part="needle.zone"]')).toHaveLength(0);
    // Inside the glass: under the glass's glare.
    expect(all(looks()[0], '[data-part="needle"], [data-part="glass.glare"]').map((x) => x.getAttribute('data-part'))).toEqual(['needle', 'glass.glare']);
    await capture(`needle-${colorway}`, page.getByTestId('needle-looks').element());
  });
}
