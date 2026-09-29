import { expect, test } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Sheet: slides in from its edge without overshoot, above the page chrome; Esc sends it back and
// returns focus; a long drag dismisses it and a short one lets it settle home.
const section = (page: import('@playwright/test').Page) => page.locator('section', { hasText: 'Playground' }).first();

for (const colorway of COLORWAYS) {
  test(`opens from the right above the page, and closes on Esc in ${colorway}`, async ({ page }) => {
    await open(page, '/components/sheet', colorway);
    const trigger = section(page).getByRole('button', { name: 'Open inspector' });
    await trigger.click();
    const sheet = page.getByRole('dialog', { name: 'Region' });
    await expect(sheet).toBeVisible();
    await expect.poll(async () => { const b = (await sheet.boundingBox())!; return Math.round(b.x + b.width); }).toBe(page.viewportSize()!.width);
    // Its title is on top of everything, including the masthead.
    const title = sheet.getByText('Region', { exact: true });
    const hit = await title.evaluate((el) => { const r = el.getBoundingClientRect(); return el.contains(document.elementFromPoint(r.left + 4, r.top + 4)); });
    expect(hit).toBe(true);
    await page.waitForTimeout(600);
    await page.screenshot({ path: capture(`sheet-${colorway}`) });
    await page.keyboard.press('Escape');
    await expect(sheet).toBeHidden();
    await expect(trigger).toBeFocused();
  });
}

test('slides in without passing its edge', async ({ page }) => {
  await open(page, '/components/sheet', 'bone');
  const lefts = await section(page).getByRole('button', { name: 'Open inspector' }).evaluate(async (btn) => {
    (btn as HTMLElement).click();
    const out: number[] = [];
    const t0 = performance.now();
    await new Promise<void>((done) => {
      const frame = () => { const p = document.querySelector('.mu-sheet'); if (p) out.push(p.getBoundingClientRect().left); if (performance.now() - t0 < 650) requestAnimationFrame(frame); else done(); };
      requestAnimationFrame(frame);
    });
    return out;
  });
  const rest = lefts.at(-1)!;
  expect(lefts[0]).toBeGreaterThan(rest + 100);
  expect(Math.min(...lefts)).toBeGreaterThanOrEqual(rest - 0.5);
});

test('a long drag dismisses it; a short one lets it settle home', async ({ page }) => {
  await open(page, '/components/sheet', 'bone');
  await section(page).getByRole('button', { name: 'Open inspector' }).click();
  const sheet = page.getByRole('dialog', { name: 'Region' });
  await page.waitForTimeout(700);
  const b = (await sheet.boundingBox())!;
  const y = b.y + b.height / 2;
  await page.mouse.move(b.x + 60, y);
  await page.mouse.down();
  await page.mouse.move(b.x + 100, y, { steps: 6 });
  await page.mouse.up();
  await expect(sheet).toBeVisible();
  await expect.poll(async () => Math.round((await sheet.boundingBox())!.x)).toBe(Math.round(b.x));

  await page.mouse.move(b.x + 60, y);
  await page.mouse.down();
  await page.mouse.move(b.x + 330, y, { steps: 10 });
  await page.mouse.up();
  await expect(sheet).toBeHidden();
});

test('Reduce Motion: it fades in place, with no slide', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/components/sheet', 'graphite');
  const first = await section(page).getByRole('button', { name: 'Open inspector' }).evaluate(async (btn) => {
    (btn as HTMLElement).click();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const p = document.querySelector('.mu-sheet')!;
    return { right: Math.round(p.getBoundingClientRect().right), width: window.innerWidth };
  });
  expect(first.right).toBe(first.width);
});
