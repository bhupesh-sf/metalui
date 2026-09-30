import { expect, test } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Navigation menu: a key opens its panel; moving to the next key slides and resizes the same plate
// (through sizes in between) and the content comes in from the way you went; Esc closes it.
const nav = (page: import('@playwright/test').Page) => page.getByRole('navigation', { name: 'Site', exact: true });
const plate = (page: import('@playwright/test').Page) => page.locator('.mu-navigation-positioner .navigation-menu-popup');

for (const colorway of COLORWAYS) {
  test(`opens a panel, moves to the next, closes on Esc, in ${colorway}`, async ({ page }) => {
    await open(page, '/components/navigation-menu', colorway);
    await nav(page).getByRole('button', { name: 'Foundations' }).hover();
    await expect(plate(page).getByRole('link', { name: /Typography/ })).toBeVisible();
    await expect(nav(page).getByRole('button', { name: 'Foundations' })).toHaveAttribute('aria-expanded', 'true');
    await nav(page).getByRole('button', { name: 'Components' }).hover();
    await expect(plate(page).getByRole('link', { name: /Dialog/ })).toBeVisible();
    await page.waitForTimeout(700);
    await page.screenshot({ path: capture(`navigation-menu-${colorway}`), clip: { x: 0, y: (await nav(page).boundingBox())!.y - 20, width: 1280, height: 360 } });
    await page.keyboard.press('Escape');
    await expect(plate(page)).toHaveCount(0);
    await expect(nav(page).getByRole('link', { name: 'Icons' })).toHaveAttribute('href', '#icons');
  });
}

test('the same plate slides and resizes between keys; the content comes in from the right', async ({ page }) => {
  await open(page, '/components/navigation-menu', 'bone');
  await nav(page).getByRole('button', { name: 'Foundations' }).hover();
  await expect(plate(page).getByRole('link', { name: /Typography/ })).toBeVisible();
  await page.waitForTimeout(700);
  const narrow = (await plate(page).boundingBox())!.width;
  await nav(page).getByRole('button', { name: 'Components' }).hover();
  const sampled = await page.evaluate(async () => {
    const out: { w: number; dir: string | null }[] = [];
    const t0 = performance.now();
    await new Promise<void>((done) => {
      const frame = () => {
        const p = document.querySelector('.mu-navigation-positioner .navigation-menu-popup');
        const c = document.querySelector('.mu-navigation-content[data-starting-style], .mu-navigation-content:not([data-ending-style])');
        out.push({ w: p ? p.getBoundingClientRect().width : 0, dir: c?.getAttribute('data-activation-direction') ?? null });
        if (performance.now() - t0 < 700) requestAnimationFrame(frame); else done();
      };
      requestAnimationFrame(frame);
    });
    return out;
  });
  const wide = sampled.at(-1)!.w;
  expect(wide).toBeGreaterThan(narrow + 100);
  expect(sampled.some((s) => s.w > narrow + 5 && s.w < wide - 5)).toBe(true);
  expect(sampled.some((s) => s.dir === 'right')).toBe(true);
});
