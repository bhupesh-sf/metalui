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
