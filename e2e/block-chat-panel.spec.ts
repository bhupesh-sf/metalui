import { expect, test, type Page } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Chat panel block: the assistant docked as a column beside the work, or floating in a popover from a
// corner key, sharing one conversation; takes with a BranchPicker, the composer's ghost text, and a
// checkpoint that restores the thread.

const block = (page: Page) => page.getByRole('region', { name: 'Chat panel' }).first();

for (const colorway of COLORWAYS) {
  test(`docked: ghost text, send, takes, then float and dock, in ${colorway}`, async ({ page }) => {
    await open(page, '/blocks/chat-panel', colorway);
    const b = block(page);
    const aside = b.getByRole('complementary', { name: 'Assistant' });
    await expect(aside).toBeVisible();
    await expect(aside.getByRole('group', { name: 'Reply 2 of 2' })).toBeVisible();
    await b.screenshot({ path: capture(`block-chat-panel-${colorway}`) });

    // The ghost: type the start of a sentence it knows, Tab takes the rest, ↩ sends.
    const well = aside.getByRole('textbox', { name: 'Message' });
    await well.click();
    await well.pressSequentially('What about');
    await expect(aside.locator('.mu-textarea-ghost-words')).toHaveText(' low tide?');
    await well.press('Tab');
    await expect(well).toHaveValue('What about low tide?');
    await well.press('Enter');
    await expect(aside.getByRole('article', { name: 'You' }).last()).toHaveText('What about low tide?');
    const reply = aside.getByRole('article', { name: 'Assistant' }).last();
    await expect(reply).toContainText('20:10', { timeout: 6000 });

    // Retry writes a second take; the picker moves between them.
    await reply.getByRole('button', { name: 'Retry' }).click();
    await expect(reply.getByRole('group', { name: 'Reply 2 of 2' })).toBeVisible({ timeout: 6000 });
    await reply.getByRole('button', { name: 'Previous reply' }).click();
    await expect(reply).toContainText('Low water at Belém is at 20:10');

    // Float: the column goes and the same conversation floats above the corner key.
    await aside.getByRole('button', { name: 'Float the assistant' }).click();
    await expect(aside).toHaveCount(0);
    const popup = page.getByRole('dialog', { name: 'Assistant' });
    await expect(popup).toBeVisible();
    await expect(popup.getByRole('article', { name: 'You' }).last()).toHaveText('What about low tide?');
    await page.keyboard.press('Escape');
    await expect(popup).toHaveCount(0);
    await b.getByRole('button', { name: 'Assistant' }).click();
    await expect(popup).toBeVisible();
    await expect(popup.getByRole('textbox', { name: 'Message' })).toBeFocused();
    await popup.evaluate((el) => Promise.all(el.getAnimations().map((x) => x.finished)));
    await b.screenshot({ path: capture(`block-chat-panel-floating-${colorway}`) });
    await page.getByRole('dialog', { name: 'Assistant' }).getByRole('button', { name: 'Dock to the side' }).click();
    await expect(b.getByRole('complementary', { name: 'Assistant' })).toBeVisible();
  });
}

test('a checkpoint restores the thread', async ({ page }) => {
  await open(page, '/blocks/chat-panel', 'bone');
  const aside = block(page).getByRole('complementary', { name: 'Assistant' });
  const note = aside.getByRole('note');
  await expect(note).toContainText('Checkpoint · before the tide question');
  await note.getByRole('button', { name: 'Restore' }).click();
  await expect(aside.getByRole('article')).toHaveCount(0);
  await expect(note).toContainText('Restored to this checkpoint');
  await expect(note.getByRole('button')).toHaveCount(0);
});

test('closing the docked assistant brings the corner key back', async ({ page }) => {
  await open(page, '/blocks/chat-panel', 'bone');
  const b = block(page);
  await b.getByRole('button', { name: 'Close the assistant' }).click();
  await expect(b.getByRole('complementary')).toHaveCount(0);
  await b.getByRole('button', { name: 'Assistant' }).click();
  await expect(b.getByRole('complementary', { name: 'Assistant' })).toBeVisible();
});

test('Reduce Motion: a sent message does not travel', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/blocks/chat-panel', 'bone');
  const aside = block(page).getByRole('complementary', { name: 'Assistant' });
  const well = aside.getByRole('textbox', { name: 'Message' });
  await well.fill('When is low tide?');
  await well.press('Enter');
  const sent = aside.getByRole('article', { name: 'You' }).last();
  await expect(sent).toHaveText('When is low tide?');
  const moving = await sent.evaluate((el) => (el.closest('[data-row]') ?? el).getAnimations().length);
  expect(moving).toBe(0);
});
