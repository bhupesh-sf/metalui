import { expect, test } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Preview card: a steady hover (not a pass) opens the card beside the link; it lingers so the pointer
// can reach it; keyboard focus opens it too.
const sentence = (page: import('@playwright/test').Page) => page.getByLabel('Example sentence');
const card = (page: import('@playwright/test').Page) => page.locator('.mu-preview-card');

for (const colorway of COLORWAYS) {
  test(`waits for a steady hover, then shows what is behind the link, in ${colorway}`, async ({ page }) => {
    await open(page, '/components/preview-card', colorway);
    const link = sentence(page).getByRole('link', { name: /Base UI/ });
    await link.hover();
    await page.waitForTimeout(250);
    await expect(card(page)).toHaveCount(0);
    await expect(card(page)).toBeVisible({ timeout: 2000 });
    await expect(card(page)).toContainText('Unstyled, accessible parts');
    await expect(card(page)).toContainText('base-ui.com');
    await page.waitForTimeout(500);
    await page.screenshot({ path: capture(`preview-card-${colorway}`), clip: { x: 0, y: (await link.boundingBox())!.y - 30, width: 1280, height: 240 } });

    // Moving onto the card keeps it.
    const c = (await card(page).boundingBox())!;
    await page.mouse.move(c.x + c.width / 2, c.y + c.height / 2, { steps: 5 });
    await page.waitForTimeout(500);
    await expect(card(page)).toBeVisible();
    await page.mouse.move(5, 5);
    await expect(card(page)).toHaveCount(0, { timeout: 2000 });
  });
}

test('keyboard focus opens it too', async ({ page }) => {
  await open(page, '/components/preview-card', 'bone');
  await sentence(page).getByRole('link', { name: /the colour rule/ }).focus();
  await expect(card(page)).toContainText('Use of color', { timeout: 2000 });
});
