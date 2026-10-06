import { expect, test } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Empty state: when the last file leaves, the empty state rises in and says how to start; its action
// brings the files back; a compact one is a single line.
const place = (page: import('@playwright/test').Page) => page.getByRole('region', { name: 'Region files' });

for (const colorway of COLORWAYS) {
  test(`arrives when the place empties, and starts it again, in ${colorway}`, async ({ page }) => {
    await open(page, '/components/empty-state', colorway);
    for (const name of ['Tram map.pdf', 'Receipt.png', 'Itinerary.docx']) await place(page).getByRole('button', { name: `Remove ${name}` }).click();
    const empty = place(page).getByRole('status');
    await expect(empty).toContainText('No files in this region');
    await expect(empty).toContainText('Drop files onto the region');
    expect(await empty.evaluate((el) => getComputedStyle(el).animationName)).toBe('mu-empty-state-arrive');
    await page.waitForTimeout(600);
    await page.locator('section', { hasText: 'Playground' }).first().screenshot({ path: capture(`empty-state-${colorway}`) });
    await empty.getByRole('button', { name: 'Attach files' }).click();
    await expect(place(page).getByRole('group')).toHaveCount(3);
    await expect(page.getByRole('status').filter({ hasText: 'No comments' })).toContainText('No comments');
  });
}

test('a new chat welcomes with starter prompts; a reply ends with follow-ups', async ({ page }) => {
  await open(page, '/components/empty-state', 'bone');
  const chat = page.getByTestId('welcome');
  const log = chat.getByRole('log', { name: 'New chat' });
  await expect(log.getByRole('status')).toContainText('What are we making?');
  await expect(log.getByRole('status').getByRole('button')).toHaveCount(3);
  await log.getByRole('button', { name: 'Plan next week' }).click();
  await expect(log.getByRole('status')).toHaveCount(0);
  await expect(log.getByRole('article', { name: 'You' })).toContainText('Plan next week');
  const followUps = log.getByRole('group', { name: 'Follow-ups' });
  await followUps.getByRole('button', { name: 'Add the dates' }).click();
  await expect(log.getByRole('article', { name: 'You' })).toHaveCount(2);
  await chat.getByRole('button', { name: 'New chat' }).click();
  await expect(log.getByRole('status')).toContainText('What are we making?');
});
