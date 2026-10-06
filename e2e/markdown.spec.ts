import { expect, test, type Page } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Markdown: real elements from Markdown (headings, lists, a table, a quote, inline marks, safe links), every
// fence a CodeBlock; while streaming a caret after the last word, an open fence streaming, aria-busy; a pace
// reveals what has arrived a word at a time; Reduce Motion drops the caret.

const playground = (page: Page) => page.locator('section', { hasText: 'Playground' }).first();

for (const colorway of COLORWAYS) {
  test(`every block at rest, in ${colorway}`, async ({ page }) => {
    await open(page, '/components/markdown', colorway);
    const md = page.locator('#blocks .mu-markdown');
    await expect(md.getByRole('heading', { name: 'Release notes', level: 2 })).toBeVisible();
    await expect(md.getByRole('heading', { name: 'What changed', level: 4 })).toBeVisible();
    await expect(md.locator('ol > li')).toHaveCount(2);
    await expect(md.locator('ol > li ul > li')).toHaveCount(2);
    await expect(md.locator('blockquote')).toContainText('Nothing to change');
    await expect(md.locator('hr')).toHaveCount(1);
    await expect(md.locator('strong')).toHaveText('bold');
    await expect(md.locator('em')).toHaveText('italic');
    await expect(md.locator('s')).toHaveText('struck');
    await expect(md.getByRole('link', { name: 'a link' })).toHaveAttribute('href', 'https://metalui.dev');
    await expect(md.getByRole('table').getByRole('columnheader')).toHaveText(['Token', 'Use']);
    await expect(md.locator('.mu-code-block')).toContainText('withMetalAnimation');
    await expect(md).not.toHaveAttribute('aria-busy', 'true');
    await page.locator('#blocks').screenshot({ path: capture(`markdown-${colorway}`) });
  });
}

test('a reply streams: paced words, a caret, a table and a fence take form, then it settles', async ({ page }) => {
  await open(page, '/components/markdown', 'bone');
  const section = playground(page);
  const md = section.locator('.mu-markdown');
  await section.getByRole('button', { name: 'Write the reply' }).click();
  await expect(md).toHaveAttribute('aria-busy', 'true');
  await expect(md.locator('[data-caret]')).toBeVisible();
  await expect(section.getByRole('status')).toContainText('Writing');
  // Paced: the words come a few at a time, not a burst at once.
  const counts: number[] = [];
  for (let i = 0; i < 6; i++) {
    counts.push((await md.innerText()).split(/\s+/).filter(Boolean).length);
    await page.waitForTimeout(100);
  }
  expect(counts[5]).toBeGreaterThan(counts[0]);
  expect(Math.max(...counts.slice(1).map((c, i) => c - counts[i]))).toBeLessThan(10);
  // The fence arrives open: its code block streams with its own caret, and ours steps aside.
  // Sampled on every frame: the fence is open only for a few words.
  await page.waitForFunction(() => {
    const m = document.querySelector('main .mu-markdown');
    return !!m?.querySelector('.mu-code-block[data-streaming]') && !m.querySelector('[data-caret]');
  }, null, { polling: 'raf', timeout: 15000 });
  await expect(md.getByRole('table')).toBeVisible();
  await expect(md).not.toHaveAttribute('aria-busy', 'true', { timeout: 15000 });
  await expect(md.locator('[data-caret]')).toHaveCount(0);
  await expect(md.getByRole('link', { name: 'motion notes' })).toBeVisible();
  await expect(md.locator('.mu-code-block[data-streaming]')).toHaveCount(0);
});

test('a half-arrived mark reads marked, and an unsafe link stays text', async ({ page }) => {
  await open(page, '/components/markdown', 'bone');
  const held = page.locator('#held .mu-markdown');
  await expect(held.locator('strong')).toHaveText('half bold');
  await expect(held).not.toContainText('**');
  await expect(held.locator('[data-caret]')).toBeVisible();
  await expect(held).toHaveAttribute('aria-busy', 'true');
  const blocks = page.locator('#blocks .mu-markdown');
  await expect(blocks.getByRole('link', { name: 'run' })).toHaveCount(0);
  await expect(blocks).toContainText('[run](javascript:run)');
});

test('Reduce Motion: no caret, and phrases arrive', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/components/markdown', 'bone');
  const section = playground(page);
  const md = section.locator('.mu-markdown');
  await section.getByRole('button', { name: 'Write the reply' }).click();
  await expect(md).toHaveAttribute('aria-busy', 'true');
  await expect(md.locator('[data-caret]')).toBeHidden();
  await expect(md).not.toHaveAttribute('aria-busy', 'true', { timeout: 15000 });
});
