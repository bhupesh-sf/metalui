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

test('every component page imports from the package, never from a file', async ({ page }) => {
  await open(page, '/components/button', 'bone');
  const links = await page.evaluate(() => [...document.querySelectorAll('nav a')].map((a) => (a as HTMLAnchorElement).pathname).filter((p) => p.startsWith('/components/')));
  const bad: string[] = [];
  for (const path of [...new Set(links)]) {
    await page.goto(path);
    const usage = page.getByTestId('usage');
    // Pages are lazy routes: give each a moment to render before judging it.
    if (!(await usage.waitFor({ timeout: 8000 }).then(() => true, () => false))) { bad.push(`${path}: no usage`); continue; }
    const text = await usage.innerText();
    if (!/import \{ [A-Za-z][A-Za-z]*(, [A-Za-z][A-Za-z]*)* \} from '@unlocalhosted\/metalui';/.test(text)) bad.push(`${path}: ${text.split('\n').find((l) => l.startsWith('import {')) ?? 'no import line'}`);
  }
  expect(bad).toEqual([]);
});
