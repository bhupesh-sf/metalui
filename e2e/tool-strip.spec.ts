import { expect, test } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Tool strip: verbs over a selection; arrows move between them; Send away is set apart and says Undo.
for (const colorway of COLORWAYS) {
  test(`run a verb over a selection in ${colorway}`, async ({ page }) => {
    await open(page, '/components/tool-strip', colorway);
    const strip = page.getByRole('toolbar', { name: 'Tools for 3 blocks' });
    await strip.getByRole('button', { name: 'Summarise' }).click();
    await expect(page.locator('section', { hasText: 'Over a selection' }).first()).toContainText('Summarise');
    await page.keyboard.press('ArrowRight');
    await expect(strip.getByRole('button', { name: 'Gather' })).toBeFocused();
    await strip.getByRole('button', { name: 'Send away' }).click();
    await expect(page.getByText('Sent away 3 blocks · Undo')).toBeVisible();
    await page.locator('section', { hasText: 'Over a selection' }).first().screenshot({ path: capture(`tool-strip-${colorway}`) });
  });
}

// Over a list: a count leads, verbs carry glyphs, a verb with choices opens its menu, and an icon-only key is named.
test('the list strip leads with its count, opens a menu verb, and names its close key', async ({ page }) => {
  await open(page, '/components/tool-strip', 'bone');
  const strip = page.getByRole('toolbar', { name: 'Tools for 3 selected tasks' });
  await expect(strip).toContainText('3 selected');
  await expect(strip.getByRole('button', { name: 'Complete' }).locator('svg.mu-ic-check')).toHaveCount(1);
  await strip.getByRole('button', { name: 'Snooze' }).click();
  await page.getByRole('menuitem', { name: 'Tomorrow' }).click();
  await expect(page.getByText('Snoozed 3 tasks until tomorrow')).toBeVisible();
  await expect(strip.getByRole('button', { name: 'Clear selection' })).toHaveText('');
});
