import { expect, test } from '@playwright/test';
import { capture, open } from './helpers';

// Every component page opens with how to use it: install (package or registry), the import from the
// package, and its props; the source's CSS tab shows only that component's styles.
test('a component page shows install, import, props, and its own CSS', async ({ page }) => {
  await open(page, '/components/radio', 'bone');
  const usage = page.getByTestId('usage');
  await expect(usage).toContainText('npm install @unlocalhosted/metalui');
  await expect(usage).toContainText("import '@unlocalhosted/metalui/styles.css';");
  await expect(usage).toContainText("import { RadioGroup, Radio } from '@unlocalhosted/metalui';");
  await expect(usage).toContainText('<RadioGroup aria-label="Export format"');
  await usage.getByRole('tab', { name: 'Copy into your project' }).click();
  await expect(usage).toContainText('npx shadcn@latest add https://metalui.dev/r/radio.json');
  await expect(usage.locator('table')).toContainText('onValueChange');
  await usage.getByRole('tab', { name: 'Package' }).click();
  await page.locator('section', { hasText: 'Install it, import it' }).first().screenshot({ path: capture('docs-usage-radio') });

  const source = page.locator('section', { hasText: 'Source' }).last();
  await source.getByRole('tab', { name: 'CSS' }).click();
  await expect(source).toContainText('@utility radio-pip');
  await expect(source).not.toContainText('@utility switch-thumb-on');
});

// Known gaps, each to come out of this list when its page imports from the package in Usage: most have no Usage
// section yet; Swatch's has no import line; Selection frame needs the docs' surface-field build.
// Until this test read the side nav (#side, an aside), `nav a` matched nothing and it checked no page at all.
const NO_USAGE_YET = new Set([
  'button', 'command-palette', 'menu', 'status', 'switcher', 'toolbar', 'tooltip', 'cue', 'hover-engraving',
  'provenance-tooltip', 'selection-frame', 'size-readout', 'lens-bar', 'memory-scrubber', 'region', 'badge',
  'dot-display', 'kbd', 'led', 'swatch',
].map((n) => `/components/${n}`));

test('every component page imports from the package, never from a file', async ({ page }) => {
  test.setTimeout(600_000);
  await open(page, '/components/button', 'bone');
  const links = await page.evaluate(() => [...document.querySelectorAll('#side a')].map((a) => (a as HTMLAnchorElement).pathname).filter((p) => p.startsWith('/components/')));
  expect(links.length).toBeGreaterThan(40);
  const bad: string[] = [];
  for (const path of [...new Set(links)].filter((p) => !NO_USAGE_YET.has(p))) {
    await page.goto(path);
    // Pages are lazy routes: a page is rendered once its title is, and Usage renders with it.
    if (!(await page.locator('main h1').first().waitFor({ timeout: 10_000 }).then(() => true, () => false))) { bad.push(`${path}: no title`); continue; }
    const usage = page.getByTestId('usage');
    if (!(await usage.count())) { bad.push(`${path}: no usage`); continue; }
    const text = await usage.innerText();
    if (!/import \{ \w+(, \w+)* \} from '@unlocalhosted\/metalui';/.test(text)) bad.push(`${path}: ${text.split('\n').find((l) => l.startsWith('import {')) ?? 'no import line'}`);
  }
  expect(bad).toEqual([]);
});
