import { expect, test, type Page } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Conversation list: chats grouped by day under engraved titles; the open one aria-current; the More key
// renames through QuickEdit in a popover and deletes (the row leaves, focus moves on, a toast offers Undo);
// New chat lands a row; loading shows skeleton rows.

const playground = (page: Page) => page.locator('section', { hasText: 'Playground' }).first();

for (const colorway of COLORWAYS) {
  test(`groups, choose, rename, delete and undo, in ${colorway}`, async ({ page }) => {
    await open(page, '/components/conversation-list', colorway);
    const section = playground(page);
    const list = section.getByRole('group', { name: 'Chats' });
    for (const name of ['Pinned', 'Today', 'Yesterday', 'Previous 7 days', 'Previous 30 days']) {
      await expect(list.getByRole('group', { name, exact: true })).toBeVisible();
    }
    await expect(list.getByRole('group', { name: 'Pinned' })).toContainText('Azulejo patterns');
    await expect(list.getByRole('button', { name: 'High tide at Belém today', exact: true })).toHaveAttribute('aria-current', 'page');
    await section.screenshot({ path: capture(`conversation-list-${colorway}`) });

    await list.getByRole('button', { name: 'Ferry times from Cais do Sodré', exact: true }).click();
    await expect(section.getByTestId('open-chat')).toHaveText('Ferry times from Cais do Sodré');

    // Rename: More → Rename… → QuickEdit in a popover; the key holds while it saves.
    await list.getByRole('button', { name: 'More for Ferry times from Cais do Sodré' }).click();
    await page.getByRole('menuitem', { name: 'Rename…' }).click();
    const field = page.getByRole('textbox', { name: 'Conversation title' });
    await expect(field).toBeFocused();
    await field.fill('Ferry to Cacilhas');
    await field.press('Enter');
    await expect(list.getByRole('button', { name: 'Ferry to Cacilhas', exact: true })).toBeVisible({ timeout: 4000 });
    await expect(field).toHaveCount(0, { timeout: 4000 });
    await expect(list.getByRole('button', { name: 'Ferry to Cacilhas', exact: true })).toBeFocused();

    // Delete: the row leaves (an animation), focus moves to the next row, a toast offers Undo.
    await list.getByRole('button', { name: 'More for Release note for the spring tokens' }).click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    await expect(list.getByRole('button', { name: 'Release note for the spring tokens', exact: true })).toHaveCount(0);
    await expect(list.getByRole('button', { name: 'Ferry to Cacilhas', exact: true })).toBeFocused();
    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(list.getByRole('group', { name: 'Today' })).toContainText('Release note for the spring tokens');

    // New chat lands at the top of Today and opens.
    await section.getByRole('button', { name: 'New chat' }).click();
    const today = list.getByRole('group', { name: 'Today' });
    await expect(today.getByRole('listitem').first()).toHaveText('New chat');
    expect(await today.getByRole('listitem').first().evaluate((el) => el.getAnimations().length)).toBeGreaterThan(0);
    await expect(today.getByRole('button', { name: 'New chat', exact: true })).toHaveAttribute('aria-current', 'page');
  });
}

test('the More key shows on hover and on the open row only', async ({ page }) => {
  await open(page, '/components/conversation-list', 'bone');
  const list = playground(page).getByRole('group', { name: 'Chats' });
  const keyOf = (title: string) => list.getByRole('button', { name: `More for ${title}` }).locator('xpath=..');
  const opacity = (t: string) => keyOf(t).evaluate((el) => parseFloat(getComputedStyle(el).opacity));
  await expect.poll(() => opacity('High tide at Belém today')).toBe(1);
  expect(await opacity('Tram 28 route and stops')).toBe(0);
  await list.getByRole('button', { name: 'Tram 28 route and stops', exact: true }).hover();
  await expect.poll(() => opacity('Tram 28 route and stops')).toBe(1);
});

test('loading shows skeleton rows, then the chats', async ({ page }) => {
  await open(page, '/components/conversation-list', 'bone');
  const loading = page.locator('#loading');
  await expect(loading.getByRole('status', { name: 'Loading conversations' })).toBeVisible();
  await expect(loading.locator('.mu-skeleton')).toHaveCount(6);
  await loading.getByRole('button', { name: 'Arrive' }).click();
  await expect(loading.getByRole('button', { name: 'High tide at Belém today', exact: true })).toBeVisible();
});

test('Reduce Motion: a deleted row goes at once', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/components/conversation-list', 'bone');
  const list = playground(page).getByRole('group', { name: 'Chats' });
  await list.getByRole('button', { name: 'More for Tram 28 route and stops' }).click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  await expect(list.getByRole('button', { name: 'Tram 28 route and stops', exact: true })).toHaveCount(0);
  expect(await list.evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
});
