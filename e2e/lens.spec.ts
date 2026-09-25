import { expect, test } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// The Lens Part on Parts › Lens: the ring turns with its grips, and the iris closes to a hexagon whose
// opening shrinks as iris falls.
for (const colorway of COLORWAYS) {
  test(`lenses in ${colorway}`, async ({ page }) => {
    await open(page, '/components/lens', colorway);
    const looks = page.getByTestId('lens-looks').locator('svg[role="img"]');
    await expect(looks).toHaveCount(4);
    // The iris opening: a hexagon, wider the more open it is.
    const openings = await looks.evaluateAll((els) => els.map((e) => {
      const d = e.querySelector('[data-part="lens.iris"] path')!.getAttribute('d')!, poly = d.slice(d.lastIndexOf('M') + 1).replace('Z', '').split('L').map((p) => p.split(',').map(Number));
      return { corners: poly.length, width: Math.max(...poly.map((p) => p[0])) - Math.min(...poly.map((p) => p[0])) };
    }));
    expect(openings.map((o) => o.corners)).toEqual([6, 6, 6, 6]);
    expect(openings[0].width).toBeGreaterThan(openings[1].width);
    expect(openings[1].width).toBeGreaterThan(openings[2].width);
    // The ring turns (its grips with it); the glass does not.
    expect(await looks.evaluateAll((els) => els.map((e) => e.querySelector('[data-part="lens.ring"]')!.getAttribute('transform')!.match(/rotate\(([-\d.]+)/)![1]))).toEqual(['0', '0', '0', '45']);
    await expect(looks.first()).toHaveAttribute('aria-label', 'lens, iris 100% open');
    await page.getByTestId('lens-looks').screenshot({ path: capture(`lens-${colorway}`) });
  });
}
