import { expect, test } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Tabs: each tab owns a panel. Arrows move and choose (← → across, ↑ ↓ standing up), and the new panel
// comes in from the side the thumb went.
for (const colorway of COLORWAYS) {
  test(`across: arrows choose and the panel follows in ${colorway}`, async ({ page }) => {
    await open(page, '/components/tabs', colorway);
    const list = page.getByRole('tablist', { name: 'Settings', exact: true });
    await list.getByRole('tab', { name: 'Canvas' }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(list.getByRole('tab', { name: 'Sync' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tabpanel').filter({ hasText: 'Signed in' })).toHaveAttribute('data-activation-direction', 'right');
  });

  test(`standing up: ↑ ↓ choose, the corners follow the thumb, the panel comes from below in ${colorway}`, async ({ page }) => {
    await open(page, '/components/tabs', colorway);
    const list = page.getByRole('tablist', { name: 'Settings sections' });
    await expect(list).toHaveAttribute('aria-orientation', 'vertical');
    expect(await list.evaluate((el) => getComputedStyle(el).borderRadius)).toBe('17px');
    const canvas = list.getByRole('tab', { name: 'Canvas' });
    const sync = list.getByRole('tab', { name: 'Sync' });
    expect((await sync.boundingBox())!.y).toBeGreaterThan((await canvas.boundingBox())!.y);
    await canvas.focus();
    await page.keyboard.press('ArrowDown');
    await expect(sync).toHaveAttribute('aria-selected', 'true');
    await expect(sync).toBeFocused();
    const panel = page.getByRole('tabpanel').filter({ hasText: 'Signed in' });
    await expect(panel).toHaveAttribute('data-activation-direction', 'down');
    const thumb = list.locator('.mu-indicator');
    await expect.poll(async () => Math.round((await thumb.boundingBox())!.y)).toBe(Math.round((await sync.boundingBox())!.y));
    await page.keyboard.press('ArrowUp');
    await expect(canvas).toHaveAttribute('aria-selected', 'true');
    await expect.poll(async () => Math.round((await thumb.boundingBox())!.y)).toBe(Math.round((await canvas.boundingBox())!.y));
    await page.getByRole('tabpanel').filter({ hasText: 'Snap to grid' }).last().evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
    await list.locator('xpath=..').screenshot({ path: capture(`tabs-vertical-${colorway}`) });
  });
}
