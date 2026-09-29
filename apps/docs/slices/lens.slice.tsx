import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { COLORWAYS, capture, openPage } from './harness';

const looks = () => [...page.getByTestId('lens-looks').element().querySelectorAll('svg[role="img"]')];

// The Lens Part on Parts › Lens: the ring turns with its grips, and the iris closes to a hexagon whose
// opening shrinks as iris falls.
for (const colorway of COLORWAYS) {
  test(`lenses in ${colorway}`, async () => {
    await openPage('/components/lens', colorway);
    await expect.poll(() => looks().length).toBe(4);
    // The iris opening: a hexagon, wider the more open it is.
    const openings = looks().map((e) => {
      const d = e.querySelector('[data-part="lens.iris"] path')!.getAttribute('d')!, poly = d.slice(d.lastIndexOf('M') + 1).replace('Z', '').split('L').map((p) => p.split(',').map(Number));
      return { corners: poly.length, width: Math.max(...poly.map((p) => p[0])) - Math.min(...poly.map((p) => p[0])) };
    });
    expect(openings.map((o) => o.corners)).toEqual([6, 6, 6, 6]);
    expect(openings[0].width).toBeGreaterThan(openings[1].width);
    expect(openings[1].width).toBeGreaterThan(openings[2].width);
    // The ring turns (its grips with it); the glass does not.
    expect(looks().map((e) => e.querySelector('[data-part="lens.ring"]')!.getAttribute('transform')!.match(/rotate\(([-\d.]+)/)![1])).toEqual(['0', '0', '0', '45']);
    expect(looks()[0].getAttribute('aria-label')).toBe('lens, iris 100% open');
    await capture(`lens-${colorway}`, page.getByTestId('lens-looks').element());
  });
}
