import { expect, test } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Button group: keys in one tray press on their own; the split button's chevron opens the other
// ways, turning over while open, and a choice runs.
const play = (page: import('@playwright/test').Page) => page.locator('section', { hasText: 'Playground' }).first();
const lift = (el: import('@playwright/test').Locator) => el.evaluate((e) => { const t = getComputedStyle(e).translate; return t === 'none' ? 0 : parseFloat(t.split(' ')[1] ?? '0'); });

for (const colorway of COLORWAYS) {
  test(`keys press alone; the split chevron opens the other ways, in ${colorway}`, async ({ page }) => {
    await open(page, '/components/button-group', colorway);
    const history = play(page).getByRole('group', { name: 'History' });
    const undo = history.getByRole('button', { name: 'Undo' });
    const redo = history.getByRole('button', { name: 'Redo' });
    const b = (await undo.boundingBox())!;
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await expect.poll(() => lift(undo)).toBeGreaterThan(0.5);
    expect(await lift(redo)).toBe(0);
    await page.mouse.up();
    await expect(play(page)).toContainText('Undid');

    const zoom = play(page).getByRole('group', { name: 'Zoom' });
    await zoom.getByRole('button', { name: 'Zoom in' }).click();
    await expect(zoom).toContainText('125 %');

    const chevron = play(page).getByRole('button', { name: 'More export options' });
    await chevron.click();
    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();
    await expect.poll(() => chevron.locator('svg').evaluate((s) => getComputedStyle(s).rotate)).toBe('180deg');
    await page.waitForTimeout(400);
    await page.screenshot({ path: capture(`button-group-${colorway}`), clip: { ...(await play(page).boundingBox())! } });
    await menu.getByRole('menuitem', { name: 'SVG' }).click();
    await expect(play(page)).toContainText('Exported SVG');
    await expect.poll(() => chevron.locator('svg').evaluate((s) => getComputedStyle(s).rotate)).toMatch(/^(0deg|none)$/);
  });
}
