import { expect, test } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Avatar: named by the person (and presence); a broken photo leaves the initials; a group counts the
// rest and spreads apart when hovered.
const play = (page: import('@playwright/test').Page) => page.locator('section', { hasText: 'Playground' }).first();

for (const colorway of COLORWAYS) {
  test(`names people, keeps initials, counts the rest, in ${colorway}`, async ({ page }) => {
    await open(page, '/components/avatar', colorway);
    await expect(play(page).getByRole('img', { name: 'Ana Rocha, here' }).first()).toBeVisible();
    await expect(play(page).getByRole('img', { name: 'Chen Wei, away' }).first()).toContainText('CW');
    const dara = play(page).getByRole('img', { name: 'Dara Lin', exact: true }).first();
    await expect(dara).toContainText('DL');
    await expect(dara.locator('img')).toHaveCount(0);
    const group = play(page).getByRole('group', { name: 'Shared with' });
    await expect(group.getByRole('img', { name: '3 more' })).toHaveText('+3');
    await page.waitForTimeout(500);
    await play(page).screenshot({ path: capture(`avatar-${colorway}`) });
  });
}

test('the group spreads on hover and settles back', async ({ page }) => {
  await open(page, '/components/avatar', 'bone');
  const group = play(page).getByRole('group', { name: 'Shared with' });
  const last = group.locator(':scope > span').last();
  const rest = (await last.boundingBox())!.x;
  await group.hover();
  await expect.poll(async () => (await last.boundingBox())!.x - rest).toBeGreaterThan(15);
  await page.mouse.move(0, 0);
  await expect.poll(async () => Math.abs((await last.boundingBox())!.x - rest)).toBeLessThan(0.5);
});
