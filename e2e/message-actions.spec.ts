import { expect, test, type Page } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Message actions: a toolbar in Message's footer; Copy turns to Copied; the thumbs latch (aria-pressed)
// and clear; Bad with reasons fades in a row, a reason says Thanks and the row goes; Retry writes again
// and the keys fade back in; Edit hands the person's turn to the host.

const playground = (page: Page) => page.locator('section', { hasText: 'Playground' }).first();

for (const colorway of COLORWAYS) {
  test(`copy, judge with a reason, retry, in ${colorway}`, async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await open(page, '/components/message-actions', colorway);
    const section = playground(page);
    const bar = section.getByRole('toolbar', { name: 'Message actions' });

    await bar.getByRole('button', { name: 'Copy' }).click();
    await expect(bar.getByRole('button', { name: 'Copied' })).toBeVisible();
    // The glyph morphs copy → check in one svg, and back.
    await expect(bar.getByRole('button', { name: 'Copied' }).locator('svg')).toHaveAttribute('data-glyph', 'check');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('Springs now ship');
    await expect(bar.getByRole('button', { name: 'Copy' })).toBeVisible({ timeout: 4000 });

    const good = bar.getByRole('button', { name: 'Good response' });
    const bad = bar.getByRole('button', { name: 'Bad response' });
    await good.click();
    await expect(good).toHaveAttribute('aria-pressed', 'true');
    await expect(section.getByTestId('feedback')).toHaveText('Feedback: Good');
    await good.click();
    await expect(good).toHaveAttribute('aria-pressed', 'false');

    await bad.click();
    await expect(bad).toHaveAttribute('aria-pressed', 'true');
    const why = bar.getByRole('group', { name: 'What went wrong?' });
    await expect(why).toBeVisible();
    expect(await why.evaluate((el) => el.getAnimations().length)).toBeGreaterThan(0);
    await why.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
    await section.screenshot({ path: capture(`message-actions-${colorway}`) });
    await why.getByRole('button', { name: 'Too long' }).click();
    await expect(section.getByTestId('feedback')).toHaveText('Feedback: Bad: Too long');
    await expect(why).toContainText('Thanks');
    await expect(why).toHaveCount(0, { timeout: 4000 });

    await bar.getByRole('button', { name: 'Retry' }).click();
    const reply = section.getByRole('article');
    await expect(reply.getByRole('status')).toContainText('Writing');
    await expect(section.getByRole('toolbar')).toHaveCount(0);
    await expect(section.getByRole('toolbar', { name: 'Message actions' })).toBeVisible({ timeout: 6000 });
    await expect(reply).toContainText('Tune a curve once');
  });
}

test('Edit hands the person\'s turn to the host', async ({ page }) => {
  await open(page, '/components/message-actions', 'bone');
  const edit = page.locator('#edit');
  await edit.getByRole('button', { name: 'Edit' }).click();
  const field = edit.getByRole('textbox', { name: 'Edit message' });
  await field.fill('Draft it shorter.');
  await field.press('Enter');
  await expect(edit.getByRole('article', { name: 'You' })).toContainText('Draft it shorter.');
});

test('Reduce Motion: the reasons appear at once', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/components/message-actions', 'bone');
  const bar = playground(page).getByRole('toolbar', { name: 'Message actions' });
  await bar.getByRole('button', { name: 'Bad response' }).click();
  const why = bar.getByRole('group', { name: 'What went wrong?' });
  await expect(why).toBeVisible();
  expect(await why.evaluate((el) => el.getAnimations().length)).toBe(0);
});
