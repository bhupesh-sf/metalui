import { expect, test } from '@playwright/test';
import { COLORWAYS, open } from './helpers';

// Low power: a blur is re-rendered every frame anything moves under it, so one switch turns every frosted
// surface opaque and drops its backdrop. data-mu-power="low" on any ancestor is the switch an app sets from
// Save-Data or a low battery; prefers-reduced-data is the system's own.
for (const colorway of COLORWAYS) {
  test(`low power turns frost opaque in ${colorway}`, async ({ page }) => {
    await open(page, '/foundations/materials', colorway);
    const plate = page.locator('[data-frost="plate"]');
    const style = () => plate.evaluate((el) => {
      const s = getComputedStyle(el);
      return { bg: s.backgroundColor, filter: s.backdropFilter };
    });

    expect((await style()).filter).toBe('blur(22px) saturate(1.6)');

    await page.evaluate(() => document.documentElement.setAttribute('data-mu-power', 'low'));
    const low = await style();
    expect(low.filter).toBe('none');
    expect(low.bg).toBe(colorway === 'bone' ? 'rgb(244, 243, 240)' : 'rgb(37, 37, 40)');

    await page.evaluate(() => document.documentElement.removeAttribute('data-mu-power'));
    expect((await style()).filter).toBe('blur(22px) saturate(1.6)');
  });
}

test('low power drops the dialog scrim blur', async ({ page }) => {
  await open(page, '/components/alert-dialog', 'bone');
  await page.getByRole('button').filter({ hasText: /delete|open|discard/i }).first().click();
  const scrim = page.locator('.mu-alert-dialog-scrim');
  await expect(scrim).toBeVisible();
  const filter = () => scrim.evaluate((el) => getComputedStyle(el).backdropFilter);
  expect(await filter()).not.toBe('none');
  await page.evaluate(() => document.documentElement.setAttribute('data-mu-power', 'low'));
  expect(await filter()).toBe('none');
});
