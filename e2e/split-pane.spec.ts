import { expect, test } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Split pane: dragging follows the hand; letting go near the default snaps to it; dragging past half
// the minimum collapses; keys step, Home collapses, Enter restores.
const divider = (page: import('@playwright/test').Page) => page.getByRole('separator', { name: 'Resize the notes', exact: true });
const value = (page: import('@playwright/test').Page) => divider(page).evaluate((el) => Number(el.getAttribute('aria-valuenow')));

for (const colorway of COLORWAYS) {
  test(`drags, snaps to the default, collapses and restores, in ${colorway}`, async ({ page }) => {
    await open(page, '/components/split-pane', colorway);
    expect(await value(page)).toBe(32);
    const box = (await divider(page).boundingBox())!;
    const root = (await divider(page).locator('xpath=..').boundingBox())!;
    const y = box.y + box.height / 2;
    const at = (pct: number) => root.x + (root.width * pct) / 100;

    await page.mouse.move(box.x + box.width / 2, y);
    await page.mouse.down();
    await page.mouse.move(at(55), y, { steps: 6 });
    expect(await value(page)).toBeGreaterThan(50);
    await page.mouse.move(at(34), y, { steps: 6 });
    await page.mouse.up();
    await expect.poll(() => value(page)).toBe(32); // within the detent: snaps to the default

    const b2 = (await divider(page).boundingBox())!;
    await page.mouse.move(b2.x + b2.width / 2, y);
    await page.mouse.down();
    await page.mouse.move(at(6), y, { steps: 6 });
    await page.mouse.up();
    await expect.poll(() => value(page)).toBe(0); // past half the minimum: shut

    await divider(page).focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => value(page)).toBe(32);
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => value(page)).toBeGreaterThan(32);
    await page.keyboard.press('Home');
    await expect.poll(() => value(page)).toBe(0);
    await page.keyboard.press('End');
    await expect.poll(() => value(page)).toBe(70);
    await divider(page).dblclick();
    await expect.poll(() => value(page)).toBe(32);
    await page.waitForTimeout(600);
    await page.locator('section', { hasText: 'Playground' }).first().screenshot({ path: capture(`split-pane-${colorway}`) });
  });
}
