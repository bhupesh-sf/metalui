import { expect, test, type Page } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Reasoning: a Collapsible row whose words and lamp say the thinking; open while it streams, folded with
// "Thought for N s" once the answer starts; the person's press holds; steps are a Timeline in the fold;
// history gives its duration.

const playground = (page: Page) => page.locator('section', { hasText: 'Playground' }).first();

for (const colorway of COLORWAYS) {
  test(`it opens while it thinks and folds when the answer starts, in ${colorway}`, async ({ page }) => {
    await open(page, '/components/reasoning', colorway);
    const section = playground(page);
    const reply = section.getByRole('article', { name: 'Assistant, Thorough' });
    const row = reply.locator('.mu-reasoning').getByRole('button');

    // From history: folded, its seconds given.
    await expect(row).toHaveAccessibleName('Thought for 3 s');
    await expect(row).toHaveAttribute('aria-expanded', 'false');
    await section.screenshot({ path: capture(`reasoning-${colorway}`) });

    await reply.getByRole('button', { name: 'Ask again' }).click();
    await expect(row).toHaveAccessibleName('Thinking');
    await expect(row).toHaveAttribute('aria-expanded', 'true');
    await expect(row.locator('.mu-led')).toHaveAttribute('data-kind', 'waiting');
    await expect(reply.locator('.mu-reasoning')).toHaveAttribute('aria-busy', 'true');
    await expect(reply.locator('.mu-reasoning-thought')).toContainText('The person wants');

    // The answer starts: the fold shuts and says how long it thought (measured).
    await expect(row).toHaveAccessibleName(/^Thought for \d+ s$/, { timeout: 8000 });
    await expect(row).toHaveAttribute('aria-expanded', 'false');
    await expect(row.locator('.mu-led')).toHaveAttribute('data-kind', 'off');
    await expect(reply.locator('.mu-reasoning')).not.toHaveAttribute('aria-busy');

    // Pressing the row reads the thought again.
    await row.click();
    await expect(row).toHaveAttribute('aria-expanded', 'true');
    await expect(reply.locator('.mu-reasoning-thought')).toContainText('Drop the history of why.');
  });
}

test('the person\'s press holds over streaming', async ({ page }) => {
  await open(page, '/components/reasoning', 'bone');
  const reply = playground(page).getByRole('article', { name: 'Assistant, Thorough' });
  const row = reply.locator('.mu-reasoning').getByRole('button');
  await reply.getByRole('button', { name: 'Ask again' }).click();
  await expect(row).toHaveAttribute('aria-expanded', 'true');
  // Shut it while it thinks; then open it again: when the answer starts it stays open, as the person left it.
  await row.click();
  await expect(row).toHaveAttribute('aria-expanded', 'false');
  await row.click();
  await expect(row).toHaveAttribute('aria-expanded', 'true');
  await expect(row).toHaveAccessibleName(/^Thought for \d+ s$/, { timeout: 8000 });
  await expect(row).toHaveAttribute('aria-expanded', 'true');
});

test('steps are a Timeline in the fold; history folds with its duration', async ({ page }) => {
  await open(page, '/components/reasoning', 'bone');
  const steps = page.locator('#steps');
  await expect(steps.locator('.mu-reasoning').getByRole('button')).toHaveAccessibleName('Working · 4 steps');
  const list = steps.getByRole('list', { name: 'Steps' });
  await expect(list.getByRole('listitem')).toHaveCount(4);
  await expect(list.locator('[data-state="running"]')).toContainText('Cutting the history');
  await expect(list.locator('[data-state="planned"]')).toContainText('Check the links');

  const history = page.locator('#history');
  const row = history.locator('.mu-reasoning').getByRole('button');
  await expect(row).toHaveAccessibleName('Thought for 4 s');
  await expect(row).toHaveAttribute('aria-expanded', 'false');
  await row.click();
  await expect(history.locator('.mu-reasoning-thought')).toBeVisible();
});

test('Reduce Motion: the lamp holds steady while it thinks', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/components/reasoning', 'bone');
  const reply = playground(page).getByRole('article', { name: 'Assistant, Thorough' });
  await reply.getByRole('button', { name: 'Ask again' }).click();
  const lamp = reply.locator('.mu-reasoning .mu-led');
  await expect(lamp).toHaveAttribute('data-kind', 'waiting');
  expect(await lamp.evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
  await expect(reply.locator('.mu-reasoning').getByRole('button')).toHaveAccessibleName(/^Thought for \d+ s$/, { timeout: 8000 });
});
