import { expect, test, type Page } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// AI composer block: Send waits for something to send, ↩ sends and ⇧↩ does not, the reply waits in its
// own header and then streams in, Stop (or ⎋) ends it where it is, Copy says Copied, files come and go,
// the thread follows unless you scrolled up (a hairline under the title while it runs under), and Reduce Motion writes a phrase at a time without a caret.
const block = (page: Page) => page.getByRole('region', { name: 'Assistant' }).first();
const replies = (page: Page) => block(page).getByRole('log').getByRole('article', { name: /^Assistant/ });
const words = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;
// Fast thinks 700 ms, then writes 26 words a second; Thorough thinks 1200 ms at 16.
const THINK_FAST = 700;

for (const colorway of COLORWAYS) {
  test(`writes, sends and streams a reply, in ${colorway}`, async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await open(page, '/blocks/ai-composer', colorway);
    const b = block(page);
    const message = b.getByRole('textbox', { name: 'Message' });
    const send = b.getByRole('button', { name: 'Send' });
    await expect(replies(page)).toHaveCount(1);

    // Nothing to send: the key is disabled; blank space doesn't count.
    await expect(send).toBeDisabled();
    await message.fill('   ');
    await expect(send).toBeDisabled();

    // ⇧↩ is a new line, not a send.
    await message.fill('Make it shorter,');
    await expect(send).toBeEnabled();
    await message.press('Shift+Enter');
    await message.pressSequentially('and friendlier.');
    await expect(message).toHaveValue('Make it shorter,\nand friendlier.');
    await expect(b.getByRole('log').getByRole('article', { name: 'You' })).toHaveCount(1);

    // ↩ sends: the message lands in the thread, the well empties and the key becomes Stop.
    await message.press('Enter');
    await expect(b.getByRole('log').getByRole('article', { name: 'You' })).toHaveCount(2);
    await expect(b.getByRole('log').getByRole('article', { name: 'You' }).last()).toContainText('and friendlier.');
    await expect(message).toHaveValue('');
    await expect(b.getByRole('button', { name: 'Stop' })).toBeVisible();

    // The reply waits in its own header, then writes with a caret, then settles.
    const reply = replies(page).last();
    await expect(reply.getByRole('status')).toContainText('Thinking');
    await expect(reply.locator('header')).toContainText('Thinking');
    await expect(reply.locator('header')).toContainText('Writing');
    await expect(reply.locator('[data-caret]')).toBeVisible();
    await b.screenshot({ path: capture(`block-ai-composer-${colorway}`) });
    await expect(reply.locator('.mu-message-text')).toHaveAttribute('aria-busy', 'false', { timeout: 6000 });
    await expect(reply.locator('[data-caret]')).toHaveCount(0);
    await expect(b.getByRole('button', { name: 'Send' })).toBeDisabled();

    // Copy writes the reply and says so, then turns back.
    await reply.getByRole('button', { name: 'Copy' }).click();
    await expect(reply.getByRole('button', { name: 'Copied' })).toBeVisible();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toBe((await reply.locator('[data-reply-text]').innerText()).trim());
    await expect(reply.getByRole('button', { name: 'Copy' })).toBeVisible({ timeout: 4000 });
  });
}

test('Stop ends the reply where it is and says so; ⎋ does the same', async ({ page }) => {
  await page.clock.install();
  await open(page, '/blocks/ai-composer', 'bone');
  const b = block(page);
  const message = b.getByRole('textbox', { name: 'Message' });

  await message.fill('Try again');
  await message.press('Enter');
  await page.clock.runFor(THINK_FAST + 400);
  const reply = replies(page).last();
  await expect(reply.locator('header')).toContainText('Writing');
  await b.getByRole('button', { name: 'Stop' }).click();
  await expect(reply.locator('header')).toContainText('Stopped');
  const at = await reply.locator('[data-reply-text]').innerText();
  await page.clock.runFor(5000);
  expect(await reply.locator('[data-reply-text]').innerText()).toBe(at);
  expect(words(at)).toBeGreaterThan(0);
  await expect(reply.getByRole('button', { name: 'Retry' })).toBeVisible();
  await expect(b.getByRole('button', { name: 'Send' })).toBeVisible();

  // ⎋ in the message stops the next one before a word is written.
  await message.fill('Once more');
  await message.press('Enter');
  await message.press('Escape');
  await expect(replies(page).last().locator('header')).toContainText('Stopped');
});

test('Retry writes the last reply again as a new take', async ({ page }) => {
  await page.clock.install();
  await open(page, '/blocks/ai-composer', 'bone');
  const before = await replies(page).last().locator('[data-reply-text]').innerText();
  await replies(page).last().getByRole('button', { name: 'Retry' }).click();
  await expect(replies(page)).toHaveCount(1);
  await expect(replies(page).last().locator('header')).toContainText('Thinking');
  await page.clock.runFor(8000);
  await expect(replies(page).last().locator('.mu-message-text')).toHaveAttribute('aria-busy', 'false');
  expect(await replies(page).last().locator('[data-reply-text]').innerText()).not.toBe(before);
});

test('files are attached, removed, and sent with the message', async ({ page }) => {
  await open(page, '/blocks/ai-composer', 'bone');
  const b = block(page);
  const composer = b.getByRole('group', { name: 'Message' });
  await b.locator('[data-attach-input]').setInputFiles([
    { name: 'brief.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(120_000) },
    { name: 'notes.md', mimeType: 'text/markdown', buffer: Buffer.alloc(900) },
  ]);
  await expect(composer.getByRole('group', { name: 'brief.pdf' })).toContainText('120 KB');
  await expect(composer.getByRole('group', { name: 'notes.md' })).toBeVisible();

  // A file alone is enough to send.
  await expect(b.getByRole('button', { name: 'Send' })).toBeEnabled();
  await composer.getByRole('button', { name: 'Remove notes.md' }).click();
  await expect(composer.getByRole('group', { name: 'notes.md' })).toHaveCount(0);
  await expect(b.getByRole('textbox', { name: 'Message' })).toBeFocused();

  await b.getByRole('button', { name: 'Send' }).click();
  const sent = b.getByRole('log').getByRole('article', { name: 'You' }).last();
  await expect(sent.getByRole('group', { name: 'brief.pdf' })).toBeVisible();
  await expect(composer.getByRole('group', { name: 'brief.pdf' })).toHaveCount(0);
});

test('the attach key and the model are named for everyone', async ({ page }) => {
  await open(page, '/blocks/ai-composer', 'bone');
  const b = block(page);
  const attach = b.getByRole('button', { name: 'Attach files' });
  await attach.hover();
  await expect(page.getByText('Attach files', { exact: true }).last()).toBeVisible();
  await b.getByRole('combobox', { name: 'Model' }).click();
  await page.getByRole('option', { name: 'Thorough' }).click();
  await b.getByRole('textbox', { name: 'Message' }).fill('Hello');
  await b.getByRole('textbox', { name: 'Message' }).press('Enter');
  await expect(replies(page).last()).toHaveAccessibleName('Assistant, Thorough');
});

test('the thread follows the words, unless you scrolled up', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await open(page, '/blocks/ai-composer', 'bone');
  const b = block(page);
  const viewport = b.locator('.mu-scroll-area-viewport').first();
  const fromFoot = () => viewport.evaluate((v) => v.scrollHeight - v.scrollTop - v.clientHeight);
  const jump = b.getByRole('button', { name: 'Jump to latest' });
  await expect(jump).toHaveCount(0); // inert and hidden at the foot

  await b.getByRole('combobox', { name: 'Model' }).click();
  await page.getByRole('option', { name: 'Thorough' }).click();
  await b.getByRole('textbox', { name: 'Message' }).fill('Longer, please');
  await b.getByRole('textbox', { name: 'Message' }).press('Enter');
  await expect(replies(page).last().locator('header')).toContainText('Writing');
  expect(await fromFoot()).toBeLessThan(30);

  // Scroll up: the thread stays put while the words keep coming, and offers the way back.
  await viewport.hover();
  await page.mouse.wheel(0, -400);
  await expect(jump).toBeVisible();
  await b.screenshot({ path: capture('block-ai-composer-375') });
  const top = await viewport.evaluate((v) => v.scrollTop);
  await page.waitForTimeout(400);
  expect(await viewport.evaluate((v) => v.scrollTop)).toBe(top);

  await jump.click();
  await expect.poll(fromFoot).toBeLessThan(30);
  await expect(jump).toHaveCount(0);

  // While words run under the title a hairline sits below it; at the top of the thread it goes.
  const hairline = () => b.locator('header').first().evaluate((h) => getComputedStyle(h, '::after').opacity);
  await expect.poll(hairline).toBe('1');
  await viewport.evaluate((v) => { v.scrollTop = 0; });
  await expect.poll(hairline).toBe('0');
});

test('Reduce Motion: nothing lands, and the reply comes a phrase at a time without a caret', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install();
  await open(page, '/blocks/ai-composer', 'bone');
  const b = block(page);
  await b.getByRole('textbox', { name: 'Message' }).fill('Shorter');
  await b.getByRole('textbox', { name: 'Message' }).press('Enter');
  const sent = b.getByRole('log').getByRole('article', { name: 'You' }).last();
  expect(await sent.evaluate((el) => el.getAnimations().length)).toBe(0);

  await page.clock.runFor(THINK_FAST + 50);
  const reply = replies(page).last();
  await expect(reply.locator('header')).toContainText('Writing');
  const first = words(await reply.locator('[data-reply-text]').innerText());
  expect(first).toBeGreaterThanOrEqual(10); // a phrase, not a word
  await expect(reply.locator('[data-caret]')).toHaveCount(0);
  await page.clock.runFor(100);
  expect(words(await reply.locator('[data-reply-text]').innerText())).toBe(first);
  await page.clock.runFor(360);
  expect(words(await reply.locator('[data-reply-text]').innerText())).toBeGreaterThanOrEqual(first + 10);
});
