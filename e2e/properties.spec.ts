import { expect, test } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Properties: a description list of engraved labels and values, values in the table's cell looks,
// regular and compact, the label above its value when narrow; still under Reduce Motion; 375 px.
for (const colorway of COLORWAYS) {
  test(`pairs read as a description list, in ${colorway}`, async ({ page }) => {
    await open(page, '/components/properties', colorway);
    const list = page.locator('dl[aria-label="Deployment details"]').first();
    await expect(list.locator('dt')).toHaveText(['Status', 'Commit', 'Branch', 'By', 'Started', 'Tags', 'Rollback']);
    await expect(list.locator('dd').nth(0)).toHaveText('Building');
    await expect(list.locator('dd').nth(4).locator('time')).toHaveText(/7m ago|7 min\. ago|7 minutes ago/);
    await expect(list.locator('dd').nth(6)).toHaveText('—none'); // a missing value
    // Engraved labels beside their values on one baseline row; a hairline under every pair but the last.
    const [dt, dd] = await Promise.all([list.locator('dt').first().boundingBox(), list.locator('dd').first().boundingBox()]);
    expect(Math.abs((dt?.y ?? 0) - (dd?.y ?? 0))).toBeLessThan(1);
    expect((dd?.x ?? 0)).toBeGreaterThanOrEqual((dt?.x ?? 0) + (dt?.width ?? 0) - 1);
    expect(await list.locator('dt').first().evaluate((el) => getComputedStyle(el).boxShadow)).toContain('inset');
    expect(await list.locator('dt').last().evaluate((el) => getComputedStyle(el).boxShadow)).toBe('none');
    // Regular pairs are at least 32 tall; the receipt is compact, at least 24.
    expect(await list.locator('dt').nth(2).evaluate((el) => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(32);
    const receipt = page.locator('dl[aria-label="Receipt lines"]');
    expect(await receipt.locator('dt').first().evaluate((el) => el.getBoundingClientRect().height)).toBe(24);
    await expect(receipt.locator('dd').nth(2)).toHaveText('−40.00');
    await page.locator('section', { hasText: 'Playground' }).first().screenshot({ path: capture(`properties-${colorway}`) });
  });
}

test('narrow: the label stands above its value', async ({ page }) => {
  await open(page, '/components/properties', 'bone');
  const list = page.getByTestId('properties-narrow').locator('dl');
  const [dt, dd] = await Promise.all([list.locator('dt').first().boundingBox(), list.locator('dd').first().boundingBox()]);
  expect((dd?.y ?? 0)).toBeGreaterThanOrEqual((dt?.y ?? 0) + (dt?.height ?? 0) - 1);
  expect(Math.abs((dd?.x ?? 0) - (dt?.x ?? 0))).toBeLessThan(1);
});

test('the tuned details start regular; nothing moves under Reduce Motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/components/properties', 'bone');
  const tuned = page.getByTestId('properties-tuner').locator('.mu-properties-frame');
  await expect(tuned).toHaveAttribute('data-size', 'regular');
  expect(await page.evaluate(() => document.getAnimations().filter((a) => (a.effect as KeyframeEffect | null)?.target?.closest?.('dl')).length)).toBe(0);
});

test('at 375 wide nothing scrolls sideways', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await open(page, '/components/properties', 'bone');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await page.locator('section', { hasText: 'Playground' }).first().screenshot({ path: capture('properties-375-bone') });
});
