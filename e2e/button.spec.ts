import { expect, test } from '@playwright/test';
import tokens from '../tokens/tokens.json' with { type: 'json' };
import { COLORWAYS, capture, open } from './helpers';

// Button: the default height, compact smaller with the smaller type (both from the recipe); a press
// sinks it one point.
const P = tokens.recipes.button.props;
for (const colorway of COLORWAYS) {
  test(`default and compact buttons in ${colorway}`, async ({ page }) => {
    await open(page, '/components/button', colorway);
    const compact = page.locator('section#variants');
    const seed = compact.getByRole('button', { name: 'seed a sample day' });
    expect((await seed.boundingBox())!.height).toBe(Number(P.compact.height));
    expect(await seed.evaluate((el) => getComputedStyle(el).fontSize)).toBe('12px');
    const cancel = page.locator('section#states').getByRole('button', { name: 'Cancel' }).first(); // at rest, unmagnified
    expect((await cancel.boundingBox())!.height).toBe(Number(P.self.height));
    expect(await cancel.evaluate((el) => getComputedStyle(el).fontSize)).toBe('12.5px');
    await seed.scrollIntoViewIfNeeded();
    const box = (await seed.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(120);
    // the sink is the `translate` property (Tailwind v4's translate-y), not `transform`
    expect(await seed.evaluate((el) => parseFloat(getComputedStyle(el).translate.split(' ')[1] ?? '0'))).toBe(Number(P.self.travel));
    await page.mouse.up();
    // two Share buttons: the one with the glyph, and the disabled one
    await expect(compact.getByRole('button', { name: 'Share' }).last()).toBeDisabled();
    await page.mouse.move(0, 0);
    await page.waitForTimeout(400);
    await compact.screenshot({ path: capture(`button-compact-${colorway}`) });
  });
}

// An action names itself with a glyph and a verb: the glyph leads the label at the cap's glyph size
// and plays its act from the whole button; a plain choice is words alone. A state change of the same
// control morphs its glyph and turns its label.
for (const colorway of COLORWAYS) {
  test(`action buttons lead with their glyph in ${colorway}`, async ({ page }) => {
    await open(page, '/components/button', colorway);
    const beat = page.locator('#action-names-itself');
    await beat.scrollIntoViewIfNeeded();
    for (const verb of ['New Canvas', 'Share', 'Export', 'Duplicate', 'Rename', 'Delete']) {
      const button = beat.getByRole('button', { name: verb, exact: true });
      const glyph = button.locator('svg');
      await expect(glyph).toHaveCount(1);
      const [g, b] = [(await glyph.boundingBox())!, (await button.boundingBox())!];
      expect(g.width).toBe(Number(P.self.glyph));
      expect(g.height).toBe(Number(P.self.glyph));
      // leading: the glyph is the first thing after the cap's padding
      expect(Math.round(g.x - b.x)).toBe(Number(P.self.pad));
    }
    await expect(beat.getByRole('button', { name: 'Cancel' }).locator('svg')).toHaveCount(0);

    // Hovering the button plays the glyph's act, and the act finishes at rest.
    const share = beat.getByRole('button', { name: 'Share', exact: true });
    await share.hover();
    await expect(share.locator('svg')).toHaveAttribute('data-playing', '');
    await page.mouse.move(0, 0);
    await expect(share.locator('svg')).not.toHaveAttribute('data-playing', '', { timeout: 3000 });

    await beat.getByRole('button', { name: 'Delete' }).click();
    await expect(beat).toContainText('Delete: the button did it.');
    await page.mouse.move(0, 0);
    await page.waitForTimeout(1500);
    await beat.screenshot({ path: capture(`button-actions-${colorway}`) });
  });
}

test('a copy button morphs its glyph and turns its label', async ({ page }) => {
  await open(page, '/components/button', 'bone');
  const copy = page.locator('#label-turns').getByRole('button').filter({ has: page.locator('.mu-morph-icon') });
  await expect(copy.locator('svg')).toHaveAttribute('data-glyph', 'paste');
  await copy.click();
  await expect(copy.locator('svg')).toHaveAttribute('data-glyph', 'check');
  await expect(copy).toHaveAccessibleName('Copied');
  // the pause over, it becomes Copy again
  await expect(copy.locator('svg')).toHaveAttribute('data-glyph', 'paste', { timeout: 4000 });
});

test('under reduced motion an action glyph stays still', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/components/button', 'bone');
  const share = page.locator('#action-names-itself').getByRole('button', { name: 'Share', exact: true });
  await share.hover();
  await page.waitForTimeout(200);
  await expect(share.locator('svg')).not.toHaveAttribute('data-playing', '');
});

// The wait lives in the key: held, busy and refusing presses; the glyph turns into the arc only after the
// show delay, so a quick save never shows it; Reduce Motion breathes instead of turning.
test('a waiting key holds, refuses a second press, and shows the arc only for a long wait', async ({ page }) => {
  await open(page, '/components/button', 'bone');
  const bench = page.getByTestId('button-wait');
  const slow = bench.getByRole('button', { name: 'Slow save' });
  const arc = (key: typeof slow) => key.locator('.mu-button-arc').evaluate((el) => parseFloat(getComputedStyle(el).opacity));
  await slow.click();
  const saving = bench.getByRole('button', { name: 'Saving…' });
  await expect(saving).toHaveAttribute('aria-busy', 'true');
  await expect(saving).toHaveAttribute('aria-disabled', 'true');
  await expect(saving).toHaveAttribute('data-held', '');
  expect(await arc(saving)).toBeLessThan(0.5);
  await expect.poll(() => arc(saving)).toBe(1);
  expect(await saving.locator('.mu-button-arc').evaluate((el) => el.getAnimations().length)).toBeGreaterThan(0);
  await saving.click({ force: true });
  await expect(bench.getByRole('button', { name: 'Saved' })).toBeVisible({ timeout: 4000 });
  await expect(bench.getByRole('button', { name: 'Saved' })).not.toHaveAttribute('aria-busy', 'true');
  await expect(bench.getByRole('button', { name: 'Slow save' })).toBeVisible({ timeout: 3000 });

  // A quick save goes straight to Saved; the arc never comes up.
  const quick = bench.getByRole('button', { name: 'Quick save' });
  await quick.click();
  await expect(bench.getByRole('button', { name: 'Saved' })).toBeVisible();
  expect(await arc(bench.getByRole('button', { name: 'Saved' }))).toBeLessThan(0.1);
});
