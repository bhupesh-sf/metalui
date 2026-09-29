import { expect, test } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Checkbox group: rows tick by label; the parent goes mixed for some, ticks all in a cascade from the
// top, and clears all at once.
const group = (page: import('@playwright/test').Page) => page.getByRole('group', { name: 'Export contents', exact: true });

for (const colorway of COLORWAYS) {
  test(`ticks by label, goes mixed, ticks and clears all in ${colorway}`, async ({ page }) => {
    await open(page, '/components/checkbox-group', colorway);
    const g = group(page);
    const parent = g.getByRole('checkbox').first();
    await expect(parent).toHaveAttribute('aria-checked', 'mixed');
    await g.getByText('Photos').click();
    await expect(g.getByRole('checkbox').nth(2)).toBeChecked();
    await parent.click();
    for (let i = 0; i < 6; i++) await expect(g.getByRole('checkbox').nth(i)).toBeChecked();
    await page.waitForTimeout(500);
    await page.locator('section', { hasText: 'Playground' }).first().screenshot({ path: capture(`checkbox-group-${colorway}`) });
    await parent.click();
    for (let i = 0; i < 6; i++) await expect(g.getByRole('checkbox').nth(i)).not.toBeChecked();
  });
}

test('the parent ticks its rows in order from the top and clears them together', async ({ page }) => {
  await open(page, '/components/checkbox-group', 'bone');
  const g = group(page);
  const delays = await g.evaluate(async (el) => {
    (el.querySelector('[role=checkbox]') as HTMLElement).click();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return [...el.querySelectorAll('.mu-dimple-tick')].map((t) => parseFloat(getComputedStyle(t).animationDelay) * 1000);
  });
  // notes was ticked already; photos, links, drawings and voice follow 30 ms apart after the 40 ms beat.
  const fresh = delays.slice(-4);
  expect(fresh.map((d) => Math.round(d))).toEqual([40, 70, 100, 130]);
  const clear = await g.evaluate(async (el) => {
    (el.querySelector('[role=checkbox]') as HTMLElement).click();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return [...el.querySelectorAll('.mu-dimple')].map((d) => getComputedStyle(d).transitionDelay);
  });
  expect(new Set(clear)).toEqual(new Set(['0s']));
});

test('Reduce Motion: no cascade', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/components/checkbox-group', 'graphite');
  const delays = await group(page).evaluate(async (el) => {
    (el.querySelector('[role=checkbox]') as HTMLElement).click();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return [...el.querySelectorAll('.mu-dimple')].map((d) => getComputedStyle(d).transitionDelay);
  });
  expect(new Set(delays)).toEqual(new Set(['0s']));
});
