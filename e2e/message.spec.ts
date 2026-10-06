import { expect, test, type Page } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Message: an article named by its speaker; the person's turn on a plate at the end, the assistant's on
// the page at the start; the header's lamp and word say a reply's state (a skeleton while it thinks);
// busy while it waits or writes; the footer fades in when it appears; grouped turns drop their header;
// a system line is a note between rules.

const playground = (page: Page) => page.locator('section', { hasText: 'Playground' }).first();

for (const colorway of COLORWAYS) {
  test(`a reply thinks, writes and settles, and its footer fades in, in ${colorway}`, async ({ page }) => {
    await open(page, '/components/message', colorway);
    const section = playground(page);
    const you = section.getByRole('article', { name: 'You' });
    const reply = section.getByRole('article', { name: 'Assistant, Fast' });

    // Sides: the person's plate sits at the end, the reply at the start.
    const plate = await you.locator('.mu-message-plate').boundingBox();
    const text = await reply.locator('.mu-message-text').boundingBox();
    const box = await section.getByRole('article').first().boundingBox();
    expect(plate!.x + plate!.width).toBeCloseTo(box!.x + box!.width, 0);
    expect(text!.x).toBeCloseTo(box!.x, 0);
    await expect(you.locator('header')).toHaveCount(0); // no time, no avatar: no header
    await section.screenshot({ path: capture(`message-${colorway}`) });

    await reply.getByRole('button', { name: 'Retry' }).click();
    await expect(reply.getByRole('status')).toContainText('Thinking');
    await expect(reply.locator('header')).toContainText('Thinking');
    await expect(reply.locator('header .mu-led')).toHaveAttribute('data-kind', 'waiting');
    await expect(reply.locator('.mu-skeleton-text')).toBeVisible();
    await expect(reply.getByRole('button', { name: 'Retry' })).toHaveCount(0);

    await expect(reply.locator('header')).toContainText('Writing');
    await expect(reply.locator('header .mu-led')).toHaveAttribute('data-kind', 'live');
    await expect(reply.locator('.mu-message-text')).toHaveAttribute('aria-busy', 'false', { timeout: 8000 });
    const footer = reply.locator('.mu-message-footer');
    await expect(footer).toBeVisible();
    expect(await footer.evaluate((el) => el.getAnimations().length)).toBeGreaterThan(0);
  });
}

test('Stop and Fail say so with a word beside the lamp', async ({ page }) => {
  await open(page, '/components/message', 'bone');
  const section = playground(page);
  const reply = section.getByRole('article', { name: 'Assistant, Fast' });
  await reply.getByRole('button', { name: 'Retry' }).click();
  await section.getByRole('button', { name: 'Stop' }).click();
  await expect(reply.locator('header')).toContainText('Stopped');
  await expect(reply.locator('header .mu-led')).toHaveAttribute('data-kind', 'off');

  await reply.getByRole('button', { name: 'Retry' }).click();
  await section.getByRole('button', { name: 'Fail' }).click();
  await expect(reply.locator('header')).toContainText('Failed');
  await expect(reply.locator('header .mu-led')).toHaveAttribute('data-kind', 'failed');
});

test('both sides, files and times; grouped turns and system lines', async ({ page }) => {
  await open(page, '/components/message', 'bone');
  const sides = page.locator('#sides');
  const you = sides.getByRole('article', { name: 'You' });
  await expect(you.getByRole('group', { name: 'brief.pdf' })).toBeVisible();
  await expect(you.locator('header time')).toBeVisible();
  await expect(sides.getByRole('article', { name: 'Assistant, Thorough' }).locator('header')).toContainText('Assistant · Thorough');

  const grouped = page.locator('#grouped');
  await expect(grouped.getByRole('note')).toContainText('Ana joined the conversation');
  const ana = grouped.getByRole('article', { name: 'Ana Rocha' });
  await expect(ana).toHaveCount(2);
  await expect(ana.first().locator('header')).toContainText('Ana Rocha');
  await expect(ana.last()).toHaveAttribute('data-grouped', '');
  await expect(ana.last().locator('header')).toHaveCount(0);
  // The grouped turn keeps its avatar's column: its text starts where the first one's does.
  const x = async (i: number) => (await ana.nth(i).locator('.mu-message-text').boundingBox())!.x;
  expect(await x(1)).toBeCloseTo(await x(0), 0);
});

test('Reduce Motion: the footer appears at once', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/components/message', 'bone');
  const reply = playground(page).getByRole('article', { name: 'Assistant, Fast' });
  await reply.getByRole('button', { name: 'Retry' }).click();
  await expect(reply.locator('.mu-message-text')).toHaveAttribute('aria-busy', 'false', { timeout: 8000 });
  expect(await reply.locator('.mu-message-footer').evaluate((el) => el.getAnimations().length)).toBe(0);
});
