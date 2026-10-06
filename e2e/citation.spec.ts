import { expect, test, type Page } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Citation: a numbered mark on the link cue's pill, a link to the source named by its number and title,
// that opens the preview card on a steady hover (and on focus); the sources fold under the answer with
// the same numbers.

const playground = (page: Page) => page.locator('section', { hasText: 'Playground' }).first();
const card = (page: Page) => page.locator('.mu-preview-card');

for (const colorway of COLORWAYS) {
  test(`a mark previews its source; the sources fold under the answer, in ${colorway}`, async ({ page }) => {
    await open(page, '/components/citation', colorway);
    const section = playground(page);
    const mark = section.getByRole('link', { name: 'Source 1: Motion' });
    await expect(mark).toHaveText('1');
    await expect(mark).toHaveAttribute('href', 'https://metalui.dev/foundations/motion');
    await expect(mark).toHaveAttribute('target', '_blank');

    await mark.hover();
    await expect(card(page)).toBeVisible({ timeout: 2000 });
    await expect(card(page)).toContainText('Springs, travel');
    await expect(card(page)).toContainText('metalui.dev');

    const row = section.getByRole('button', { name: '3 sources' });
    await expect(row).toHaveAttribute('aria-expanded', 'false');
    await page.mouse.move(5, 5);
    await expect(card(page)).toHaveCount(0, { timeout: 2000 });
    await row.click();
    await expect(row).toHaveAttribute('aria-expanded', 'true');
    const list = section.getByRole('list', { name: 'Sources' });
    await expect(list.getByRole('listitem')).toHaveCount(3);
    await expect(list.getByRole('listitem').nth(1)).toContainText('2');
    await expect(list.getByRole('listitem').nth(1)).toContainText('w3.org'); // the href's host, without www.
    await expect(list.getByRole('link', { name: /Animation from interactions/ })).toHaveAttribute('href', /w3\.org/);
    await expect.poll(() => section.evaluate((el) => el.getAnimations({ subtree: true }).filter((a) => a.playState === 'running').length)).toBe(0);
    await section.screenshot({ path: capture(`citation-${colorway}`) });
  });
}

test('focus opens the preview too', async ({ page }) => {
  await open(page, '/components/citation', 'bone');
  await playground(page).getByRole('link', { name: 'Source 2: Animation from interactions' }).focus();
  await expect(card(page)).toContainText('WCAG 2.2', { timeout: 2000 });
});

test('Reduce Motion: the sources open without travel', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/components/citation', 'graphite');
  const section = playground(page);
  await section.getByRole('button', { name: '3 sources' }).click();
  const list = section.getByRole('list', { name: 'Sources' });
  await expect(list).toBeVisible();
  const moved = await section.evaluate((el) => el.getAnimations({ subtree: true }).some((a) => {
    const frames = (a.effect as KeyframeEffect | null)?.getKeyframes() ?? [];
    return frames.some((f) => typeof f.transform === 'string' && f.transform !== 'none');
  }));
  expect(moved).toBe(false);
});
