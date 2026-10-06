import { expect, test, type Page } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Confirmation: an urgent alert (read at once) with Deny then Allow; the host keeps the answer and the
// alert recedes to a quiet status that says it; a destructive one is held to confirm, a tap shows the hint.

const playground = (page: Page) => page.locator('section', { hasText: 'Playground' }).first();

for (const colorway of COLORWAYS) {
  test(`Allow runs the call and the answer stays, in ${colorway}`, async ({ page }) => {
    await open(page, '/components/confirmation', colorway);
    const section = playground(page);
    const ask = section.locator('.mu-confirmation');
    await expect(ask).toHaveAttribute('role', 'alert');
    await expect(ask).toContainText('Move 3 files to the archive?');
    await expect(ask.locator('.mu-led')).toHaveAttribute('data-kind', 'waiting');
    const call = section.locator('.mu-tool-call');
    await expect(call.getByRole('button')).toContainText('Queued');
    await section.screenshot({ path: capture(`confirmation-${colorway}`) });

    await ask.getByRole('button', { name: 'Allow' }).click();
    await expect(ask).toHaveAttribute('role', 'status');
    await expect(ask).toHaveAttribute('data-tone', 'quiet');
    await expect(ask.locator('.mu-confirmation-decision')).toContainText('Allowed');
    await expect(ask.getByRole('button')).toHaveCount(0);
    await expect(ask).toContainText('Move 3 files to the archive?');
    await expect(call.getByRole('button')).toContainText('1.2 s', { timeout: 5000 });
  });
}

test('Deny keeps the question and never runs the call', async ({ page }) => {
  await open(page, '/components/confirmation', 'bone');
  const section = playground(page);
  const ask = section.locator('.mu-confirmation');
  await ask.getByRole('button', { name: 'Deny' }).click();
  await expect(ask.locator('.mu-confirmation-decision')).toContainText('Denied');
  await expect(section.locator('.mu-tool-call')).toHaveCount(0);
  await section.getByRole('button', { name: 'Ask again' }).click();
  await expect(ask).toHaveAttribute('role', 'alert');
  await expect(ask.getByRole('button', { name: 'Allow' })).toBeVisible();
});

test('a destructive request is held to confirm; a tap shows the hint', async ({ page }) => {
  await open(page, '/components/confirmation', 'bone');
  const ask = page.locator('#hold .mu-confirmation');
  const del = ask.getByRole('button', { name: /Delete/ });
  await del.click();
  await expect(ask.locator('.mu-confirmation-hint')).toHaveText('Hold to delete');
  await expect(ask).toHaveAttribute('role', 'alert');

  await del.hover();
  await page.mouse.down();
  await page.waitForTimeout(1100);
  await page.mouse.up();
  await expect(ask.locator('.mu-confirmation-decision')).toContainText('Allowed');
  await expect(ask.locator('.mu-confirmation-hint')).toHaveCount(0);
});

test('Reduce Motion: answering still records the decision', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/components/confirmation', 'bone');
  const ask = playground(page).locator('.mu-confirmation');
  await ask.getByRole('button', { name: 'Deny' }).click();
  await expect(ask.locator('.mu-confirmation-decision')).toContainText('Denied');
  await expect(ask).toHaveAttribute('data-decision', 'denied');
});
