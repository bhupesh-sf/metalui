import { expect, test, type Page } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Thread: a log in a scroll area that starts at the foot, follows a reply while you are there, stays put
// when you scroll up, offers Jump to latest (inert at the foot), comes back when you send (pinKey), lands
// new messages from below, and closes the gap before a grouped turn.

const playground = (page: Page) => page.locator('section', { hasText: 'Playground' }).first();
const fromFoot = (page: Page) => playground(page).locator('.mu-scroll-area-viewport').first()
  .evaluate((v) => v.scrollHeight - v.scrollTop - v.clientHeight);

for (const colorway of COLORWAYS) {
  test(`follows a reply at the foot, stays put when scrolled up, and comes back, in ${colorway}`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 }); // a phone: the reply runs well past the fold
    await open(page, '/components/thread', colorway);
    const section = playground(page);
    const log = section.getByRole('log', { name: 'Conversation' });
    const jump = section.getByRole('button', { name: 'Jump to latest' });
    await expect(log.getByRole('article')).toHaveCount(2);
    await expect(jump).toHaveCount(0); // inert and hidden at the foot

    // Ask: the question lands from below and the reply follows at the foot.
    await section.getByRole('button', { name: 'Ask' }).click();
    await expect(log.getByRole('article', { name: 'You' })).toHaveCount(2);
    const reply = log.getByRole('article', { name: 'Assistant, Fast' }).last();
    await expect(reply.locator('header')).toContainText('Writing');
    await expect.poll(() => fromFoot(page)).toBeLessThan(30);
    await page.waitForTimeout(500);
    expect(await fromFoot(page)).toBeLessThan(30);

    // Scroll up: the thread stays where it is while words keep coming, and offers the way back.
    const viewport = section.locator('.mu-scroll-area-viewport').first();
    await expect.poll(() => viewport.evaluate((v) => v.scrollTop), { timeout: 10_000 }).toBeGreaterThan(120); // enough to scroll up through
    await viewport.hover();
    await page.mouse.wheel(0, -100);
    await expect(jump).toBeVisible();
    const top = await viewport.evaluate((v) => v.scrollTop);
    await page.waitForTimeout(400);
    expect(await viewport.evaluate((v) => v.scrollTop)).toBe(top);
    await section.screenshot({ path: capture(`thread-${colorway}`) });

    await jump.click();
    await expect.poll(() => fromFoot(page)).toBeLessThan(30);
    await expect(jump).toHaveCount(0);
    await expect(reply.locator('.mu-message-text')).toHaveAttribute('aria-busy', 'false', { timeout: 15_000 });
  });
}

test('sending from up the thread comes back to the foot (pinKey)', async ({ page }) => {
  await open(page, '/components/thread', 'bone');
  const section = playground(page);
  const viewport = section.locator('.mu-scroll-area-viewport').first();
  await section.getByRole('button', { name: 'Ask' }).click();
  const reply = section.getByRole('article', { name: 'Assistant, Fast' }).last();
  await expect(reply.locator('.mu-message-text')).toHaveAttribute('aria-busy', 'false', { timeout: 15_000 });
  await viewport.evaluate((v) => { v.scrollTop = 0; });
  await expect(section.getByRole('button', { name: 'Jump to latest' })).toBeVisible();

  await section.getByRole('button', { name: 'Ask' }).click();
  await expect.poll(() => fromFoot(page)).toBeLessThan(30);
  await expect(section.getByRole('button', { name: 'Jump to latest' })).toHaveCount(0);
});

test('a new message rises from below; a grouped turn closes the gap', async ({ page }) => {
  await open(page, '/components/thread', 'bone');
  const section = playground(page);
  // Sample the arrival's first frame: it starts below where it lands.
  await section.getByRole('button', { name: 'Ask' }).click();
  const row = section.locator('[data-row]').nth(2);
  const start = await row.evaluate((el) => {
    const a = el.getAnimations()[0];
    if (!a) return null;
    a.pause();
    a.currentTime = 0;
    return new DOMMatrix(getComputedStyle(el).transform).m42;
  });
  expect(start).toBeGreaterThan(0);

  const support = page.locator('#support');
  const log = support.getByRole('log', { name: 'Support chat' });
  await expect(log.getByRole('note')).toHaveCount(2);
  const gap = (i: number) => log.locator('[data-row]').evaluateAll((rows, n) => {
    const a = rows[n - 1].getBoundingClientRect(), b = rows[n].getBoundingClientRect();
    return Math.round(b.top - a.bottom);
  }, i);
  expect(await gap(2)).toBe(6); // grouped: the group gap
  expect(await gap(3)).toBe(20); // a new speaker: the turn gap
});

test('Reduce Motion: nothing lands, and Jump to latest jumps', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/components/thread', 'bone');
  const section = playground(page);
  await section.getByRole('button', { name: 'Ask' }).click();
  expect(await section.locator('[data-row]').last().evaluate((el) => el.getAnimations().length)).toBe(0);
  const reply = section.getByRole('article', { name: 'Assistant, Fast' }).last();
  await expect(reply.locator('.mu-message-text')).toHaveAttribute('aria-busy', 'false', { timeout: 15_000 });
  const viewport = section.locator('.mu-scroll-area-viewport').first();
  await viewport.evaluate((v) => { v.scrollTop = 0; });
  await section.getByRole('button', { name: 'Jump to latest' }).click();
  expect(await fromFoot(page)).toBeLessThan(30);
});
