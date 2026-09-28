import { expect, test } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// The Nib Part on Parts › Nib: turned about its tip, its tip wet with ink, a slit and a breather hole.
for (const colorway of COLORWAYS) {
  test(`nibs in ${colorway}`, async ({ page }) => {
    await open(page, '/components/nib', colorway);
    const looks = page.getByTestId('nib-looks').locator('svg[role="img"]');
    await expect(looks).toHaveCount(3);
    expect(await looks.evaluateAll((els) => els.map((e) => e.querySelector('[data-part="nib"]')!.getAttribute('data-angle')))).toEqual(['0', '-20', '20']);
    // It turns about its tip: the tip stays where it is.
    const tips = await looks.evaluateAll((els) => els.map((e) => e.querySelector('[data-part="nib"]')!.getAttribute('transform')!.match(/translate\(([-\d.]+) ([-\d.]+)\)/)!.slice(1).join(',')));
    expect(new Set(tips).size).toBe(1);
    await expect(looks.first().locator('[data-part="nib.ink"]')).toHaveCount(1);
    await expect(looks.first().locator('[data-part="nib"] circle')).toHaveCount(1);
    await page.getByTestId('nib-looks').screenshot({ path: capture(`nib-${colorway}`) });
  });
}
