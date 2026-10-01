import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Changelog: the page is packages/metalui/CHANGELOG.md, one section per version, newest first, anchored.
// The file is read here from disk, so the page cannot drift from it without this failing.
const file = readFileSync('packages/metalui/CHANGELOG.md', 'utf8');
const versions = [...file.matchAll(/^## (\d+\.\d+\.\d+)(?: - (\S+))?/gm)].map((m) => ({ version: m[1], date: m[2] }));

test('the navigation leads to the changelog', async ({ page }) => {
  await open(page, '/overview', 'bone');
  await page.getByRole('link', { name: 'Changelog', exact: true }).first().click();
  await expect(page).toHaveURL(/\/changelog$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Changelog' })).toBeVisible();
});

for (const colorway of COLORWAYS) {
  test(`every released version is a section with its date and links, newest first, in ${colorway}`, async ({ page }) => {
    await open(page, '/changelog', colorway);
    const headings = await page.locator('main section h2').allTextContents();
    const shown = headings.map((h) => h.replace(/^#/, '').trim()).filter((h) => /^\d+\.\d+\.\d+$/.test(h));
    expect(shown).toEqual(versions.map((v) => v.version));
    const latest = versions[0];
    const section = page.locator(`#v${latest.version.replace(/\./g, '-')}`);
    await expect(section).toContainText(latest.date!);
    // The oldest entry points at git history and has no date: it still lists, with no stray separator.
    const oldest = versions[versions.length - 1];
    if (!oldest.date) await expect(page.locator(`#v${oldest.version.replace(/\./g, '-')} .sec-sub`)).toHaveText(/^npm · tag$/);
    await expect(section.getByRole('link', { name: 'npm' })).toHaveAttribute('href', `https://www.npmjs.com/package/@unlocalhosted/metalui/v/${latest.version}`);
    await expect(section.getByRole('link', { name: 'tag' })).toHaveAttribute('href', `https://github.com/vijayksingh/metalui/releases/tag/v${latest.version}`);
    await expect(page.getByRole('link', { name: `Latest ${latest.version}` })).toBeVisible();
    await page.screenshot({ path: capture(`docs-changelog-${colorway}`), clip: { x: 0, y: 0, width: 1280, height: 900 } });
  });
}

test('notes keep their code and bold, and a version can be linked to', async ({ page }) => {
  await open(page, '/changelog', 'bone');
  // 0.3.0 lists the blocks as shadcn registry items, with `code` in the note.
  await expect(page.locator('#v0-3-0 code').first()).toBeVisible();
  await expect(page.locator('#v0-3-0 strong').first()).toBeVisible();
  // A deep link lands on its section.
  await page.goto('/changelog#v0-3-1');
  await page.waitForSelector('#v0-3-1');
  await expect(page.locator('#v0-3-1')).toBeInViewport();
  // The page shows what was written, so no raw markdown leaks through.
  const text = await page.locator('main').innerText();
  expect(text).not.toMatch(/\*\*|`/);
});

test('Unreleased appears only while it holds notes', async ({ page }) => {
  await open(page, '/changelog', 'bone');
  const hasNotes = /## Unreleased\n+(?:### [A-Za-z]+\n+- )/.test(file);
  await expect(page.locator('#unreleased')).toHaveCount(hasNotes ? 1 : 0);
});
