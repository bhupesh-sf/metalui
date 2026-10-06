import { expect, test, type Page } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Branch picker: "2 / 2" in a reply's footer; previous and next move between the takes and the count
// turns on the drum; at an end the key turns off and focus moves to the other key; Retry adds a take and
// lands on it; the person's edited turn has its own.

const playground = (page: Page) => page.locator('section', { hasText: 'Playground' }).first();

for (const colorway of COLORWAYS) {
  test(`move between takes and retry, in ${colorway}`, async ({ page }) => {
    await open(page, '/components/branch-picker', colorway);
    const section = playground(page);
    const picker = section.getByRole('group', { name: 'Reply 2 of 2' });
    await expect(picker).toBeVisible();
    const prev = picker.getByRole('button', { name: 'Previous reply' });
    const next = picker.getByRole('button', { name: 'Next reply' });
    await expect(next).toBeDisabled();
    await section.screenshot({ path: capture(`branch-picker-${colorway}`) });

    await prev.focus();
    await page.keyboard.press('Enter');
    const first = section.getByRole('group', { name: 'Reply 1 of 2' });
    await expect(first).toBeVisible();
    await expect(first.getByRole('button', { name: 'Previous reply' })).toBeDisabled();
    // Focus never falls to the page: it moved to Next before Previous turned off.
    await expect(first.getByRole('button', { name: 'Next reply' })).toBeFocused();
    await expect(first.locator('[role=status]')).toHaveText('Reply 1 of 2');
    await expect(section.getByRole('article', { name: /Assistant/ })).toContainText('High water at Belém is at 14:02');

    await section.getByRole('button', { name: 'Retry' }).click();
    await expect(section.getByRole('group', { name: /^Reply/ })).toHaveCount(0);
    await expect(section.getByRole('group', { name: 'Reply 3 of 3' })).toBeVisible({ timeout: 6000 });
  });
}

test('the person\'s edited turn has its own picker', async ({ page }) => {
  await open(page, '/components/branch-picker', 'bone');
  const edited = page.locator('#edited');
  await edited.getByRole('button', { name: 'Previous version' }).click();
  await expect(edited.getByRole('group', { name: 'Version 1 of 2' })).toBeVisible();
  await expect(edited.getByRole('article', { name: 'You' })).not.toContainText('and how high');
});

test('Reduce Motion: the count crossfades in place, nothing turns', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/components/branch-picker', 'bone');
  const section = playground(page);
  await section.getByRole('button', { name: 'Previous reply' }).click();
  const count = section.locator('.mu-branch-picker-count');
  await expect(count).toContainText('1 / 2');
  const moving = await count.evaluate((el) => el.getAnimations({ subtree: true })
    .filter((a) => (a as CSSTransition).transitionProperty === 'transform' || (a as CSSTransition).transitionProperty === 'filter').length);
  expect(moving).toBe(0);
});
