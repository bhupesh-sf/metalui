import { expect, test, type Locator } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// One tick, one pen: the menu's checkbox row and the select's chosen row draw the Checkbox's tick with the
// same pen (the check glyph's route by stroke-dashoffset), bare in the row's ink. What is observed is how
// much of the stroke is on screen, frame by frame.

/** How much of the bare tick's stroke is on screen each frame for `ms` while `act` runs (-1: whole, at rest). */
async function film(row: Locator, ms: number, act: () => Promise<void>): Promise<number[]> {
  const frames = row.evaluate((el, ms) => new Promise<number[]>((done) => {
    const out: number[] = [];
    const t0 = performance.now();
    const step = () => {
      const s = getComputedStyle(el.querySelector('.mu-tick path')!);
      out.push(s.visibility === 'hidden' ? 0 : s.strokeDasharray === 'none' ? -1 : parseFloat(s.strokeDasharray) - parseFloat(s.strokeDashoffset));
      if (performance.now() - t0 < ms) requestAnimationFrame(step); else done(out);
    };
    step();
  }), ms);
  await act();
  return frames;
}

for (const colorway of COLORWAYS) {
  test(`a menu checkbox row draws the tick with the pen and stays open in ${colorway}`, async ({ page }) => {
    await open(page, '/components/menu', colorway);
    await page.getByRole('button', { name: 'View options' }).click();
    const menu = page.getByRole('menu');
    const rulers = menu.getByRole('menuitemcheckbox', { name: /Show Rulers/ });
    await expect(rulers).toHaveAttribute('aria-checked', 'false');
    await expect(menu.getByRole('menuitemcheckbox', { name: /Show Grid/ })).toHaveAttribute('aria-checked', 'true');

    const draw = await film(rulers, 900, () => rulers.click());
    await expect(rulers).toHaveAttribute('aria-checked', 'true');
    await expect(menu).toBeVisible();
    const partial = draw.filter((d) => d > 0.5);
    expect(partial.length, 'the stroke grows over several frames').toBeGreaterThan(3);
    expect(draw.at(-1), 'and comes to rest whole').toBe(-1);
    await menu.evaluate((el) => Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished)));
    await menu.screenshot({ path: capture(`menu-checkbox-${colorway}`) });

    const undraw = await film(rulers, 500, () => rulers.click());
    await expect(rulers).toHaveAttribute('aria-checked', 'false');
    expect(undraw.at(-1), 'withdrawn').toBe(0);
  });

  test(`the select's chosen row carries the tick, not an LED, in ${colorway}`, async ({ page }) => {
    await open(page, '/components/select', colorway);
    await page.getByRole('combobox', { name: 'Icon', exact: true }).click();
    const list = page.getByRole('listbox');
    const chosen = list.getByRole('option', { name: 'Share' });
    await expect(chosen).toHaveAttribute('aria-selected', 'true');
    await expect(chosen.locator('.mu-tick path')).toHaveCSS('visibility', 'visible');
    await expect(list.getByRole('option', { name: 'Duplicate' }).locator('.mu-tick path')).toHaveCSS('visibility', 'hidden');
    await expect(list.locator('.mu-select-led')).toHaveCount(0);
    await list.evaluate((el) => Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished)));
    await list.screenshot({ path: capture(`select-tick-${colorway}`) });
  });
}

test('Reduce Motion: the menu row’s tick is whole at once', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/components/menu', 'bone');
  await page.getByRole('button', { name: 'View options' }).click();
  const snap = page.getByRole('menuitemcheckbox', { name: /Snap to Objects/ });
  const draw = await film(snap, 300, () => snap.click());
  await expect(snap).toHaveAttribute('aria-checked', 'true');
  expect(draw.filter((d) => d > 0.5)).toHaveLength(0);
  expect(draw.at(-1)).toBe(-1);
});
