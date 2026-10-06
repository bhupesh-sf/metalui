import { expect, test, type Page } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Tool call: a folded Collapsible row with the tool's name, a lamp and a word for its state (queued amber,
// running the ring, done with its duration, failed red); open, its input as properties and its result in
// a well, or the error; consecutive calls fold under a group row; a tool's own UI replaces the fallback.

const playground = (page: Page) => page.locator('section', { hasText: 'Playground' }).first();

for (const colorway of COLORWAYS) {
  test(`a call is queued, runs and settles, and opens to its input and result, in ${colorway}`, async ({ page }) => {
    await open(page, '/components/tool-call', colorway);
    const section = playground(page);
    const call = section.locator('.mu-tool-call');
    const row = call.getByRole('button', { name: /search_docs/ });

    await expect(row).toHaveAttribute('aria-expanded', 'false');
    await expect(row).toContainText('1.2 s');

    await section.getByRole('button', { name: 'Run again' }).click();
    await expect(row).toContainText('Queued');
    await expect(row.locator('.mu-led')).toHaveAttribute('data-kind', 'waiting');
    await expect(row).toContainText('Running');
    await expect(call).toHaveAttribute('aria-busy', 'true');
    await expect(row.locator('.mu-spinner')).toBeVisible(); // the ring, after the show delay
    await expect(row).toContainText('1.2 s', { timeout: 5000 });
    await expect(call).not.toHaveAttribute('aria-busy');

    await row.click();
    await expect(row).toHaveAttribute('aria-expanded', 'true');
    const panel = call.locator('.mu-tool-call-panel');
    await expect(panel.locator('.mu-properties')).toContainText('springs');
    await expect(panel.locator('.mu-tool-call-result')).toContainText('/foundations/motion');
    // Capture once the reveal and the travel below it have settled.
    await expect.poll(() => section.evaluate((el) => el.getAnimations({ subtree: true }).filter((a) => a.playState === 'running').length)).toBe(0);
    await section.screenshot({ path: capture(`tool-call-${colorway}`) });
  });
}

test('Fail says so with the red lamp and the error', async ({ page }) => {
  await open(page, '/components/tool-call', 'bone');
  const section = playground(page);
  const row = section.getByRole('button', { name: /search_docs/ });
  await section.getByRole('button', { name: 'Run again' }).click();
  await expect(row).toContainText('Running');
  await section.getByRole('button', { name: 'Fail' }).click();
  await expect(row).toContainText('Failed');
  await expect(row.locator('.mu-led')).toHaveAttribute('data-kind', 'failed');
  await row.click();
  await expect(section.locator('.mu-tool-call-error')).toContainText('rebuilding');
});

test('calls in a row fold under one group row; a tool\'s own UI replaces the fallback', async ({ page }) => {
  await open(page, '/components/tool-call', 'bone');
  const group = page.locator('#group .mu-tool-call-group');
  const head = group.getByRole('button', { name: /3 tools/ });
  await expect(head).toContainText('Failed');
  await expect(head.locator('.mu-led')).toHaveAttribute('data-kind', 'failed');
  await expect(head).toHaveAttribute('aria-expanded', 'false');
  await head.click();
  const calls = group.locator('.mu-tool-call');
  await expect(calls).toHaveCount(3);
  await calls.nth(2).getByRole('button').click();
  await expect(calls.nth(2).locator('.mu-tool-call-error')).toContainText('404');

  const own = page.locator('#own .mu-tool-call');
  await expect(own).toContainText('Lisbon · 21°');
  await expect(own.locator('.mu-properties')).toHaveCount(0);
});

test('Reduce Motion: the failed lamp holds steady', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/components/tool-call', 'bone');
  const section = playground(page);
  const row = section.getByRole('button', { name: /search_docs/ });
  await section.getByRole('button', { name: 'Run again' }).click();
  await expect(row).toContainText('Running');
  await section.getByRole('button', { name: 'Fail' }).click();
  const lamp = row.locator('.mu-led');
  await expect(lamp).toHaveAttribute('data-kind', 'failed');
  expect(await lamp.evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
});
