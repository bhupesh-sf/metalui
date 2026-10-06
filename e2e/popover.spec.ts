import { expect, test } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Popover: comes out of its trigger (rises one nest from the trigger's side on the surface spring),
// takes focus, and fades where it stands on close, returning focus to the trigger.
const trigger = (page: import('@playwright/test').Page) => page.getByRole('button', { name: 'Rename…' }).first();

for (const colorway of COLORWAYS) {
  test(`opens from its trigger, takes focus, and closes on Esc in ${colorway}`, async ({ page }) => {
    await open(page, '/components/popover', colorway);
    await trigger(page).click();
    const plate = page.getByRole('dialog', { name: 'Rename region' });
    await expect(plate).toBeVisible();
    await expect(plate).toContainText('The name shows on its edge and in search.');
    // Beside its trigger, one nest away, on the side it opened.
    const b = (await trigger(page).boundingBox())!;
    const p = (await plate.boundingBox())!;
    await expect(plate).toHaveAttribute('data-side', 'bottom');
    await expect.poll(async () => Math.round((await plate.boundingBox())!.y - (b.y + b.height))).toBe(6);
    expect(Math.abs(p.x + p.width / 2 - (b.x + b.width / 2))).toBeLessThan(2);
    await expect(plate.getByRole('textbox')).toBeFocused();
    await page.waitForTimeout(700);
    await page.locator('section', { hasText: 'Playground' }).first().screenshot({ path: capture(`popover-${colorway}`) });
    await page.keyboard.press('Escape');
    await expect(plate).toBeHidden();
    await expect(trigger(page)).toBeFocused();
  });
}

test('rises from the trigger side and leaves without travelling back', async ({ page }) => {
  await open(page, '/components/popover', 'bone');
  const opening = await trigger(page).evaluate(async (btn) => {
    (btn as HTMLElement).click();
    const out: { o: number; y: number; s: number }[] = [];
    const t0 = performance.now();
    await new Promise<void>((done) => {
      const frame = () => {
        const p = document.querySelector('.mu-popover');
        if (p) {
          const c = getComputedStyle(p);
          const y = c.translate === 'none' ? 0 : parseFloat(c.translate.split(' ')[1] ?? '0');
          out.push({ o: parseFloat(c.opacity), y, s: c.scale === 'none' ? 1 : parseFloat(c.scale) });
        }
        if (performance.now() - t0 < 650) requestAnimationFrame(frame); else done();
      };
      requestAnimationFrame(frame);
    });
    return out;
  });
  // It starts back toward the trigger (above, for a popover below it) and smaller, then comes to rest.
  expect(opening[0].y).toBeLessThan(-4);
  expect(opening[0].s).toBeLessThan(1);
  expect(opening.every((f) => f.y <= 0.01 && f.s <= 1.0001)).toBe(true);
  expect(opening.at(-1)).toEqual({ o: 1, y: 0, s: 1 });

  const closing = await page.evaluate(async () => {
    document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    const out: string[] = [];
    const t0 = performance.now();
    await new Promise<void>((done) => {
      const frame = () => {
        const p = document.querySelector('.mu-popover');
        if (p) out.push(getComputedStyle(p).translate);
        if (p && performance.now() - t0 < 800) requestAnimationFrame(frame); else done();
      };
      requestAnimationFrame(frame);
    });
    return out;
  });
  expect(closing.length).toBeGreaterThan(2);
  expect(closing.every((t) => t === 'none' || t === '0px')).toBe(true);
});

test('Reduce Motion: a crossfade with no travel', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/components/popover', 'graphite');
  const first = await trigger(page).evaluate(async (btn) => {
    (btn as HTMLElement).click();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const c = getComputedStyle(document.querySelector('.mu-popover')!);
    return { translate: c.translate, scale: c.scale };
  });
  expect(first.translate).toMatch(/^(none|0px|0px 0px)$/);
  expect(first.scale).toMatch(/^(none|1)$/);
});

// The Rename: a Quick edit in the body (docs/BACKLOG.md "Popover: the Rename action").
type Page = import('@playwright/test').Page;
const plateOf = (page: Page) => page.getByRole('dialog', { name: 'Rename region' });
const keyOf = (page: Page) => plateOf(page).locator('button[type=submit]');

/** Commits by the form (as Enter does) and samples the key's glyph and drum on every frame. */
async function commitAndWatch(page: Page, ms: number) {
  return keyOf(page).evaluate(async (key, ms) => {
    key.closest('form')!.requestSubmit();
    const paths = new Set<string>();
    let faces = 0;
    const t0 = performance.now();
    await new Promise<void>((done) => {
      const frame = () => {
        paths.add(key.querySelector('[data-glyph]')!.innerHTML);
        faces = Math.max(faces, key.querySelectorAll('.mu-swap-layer').length);
        if (performance.now() - t0 < ms) requestAnimationFrame(frame); else done();
      };
      requestAnimationFrame(frame);
    });
    return { paths: paths.size, faces, glyph: key.querySelector('[data-glyph]')!.getAttribute('data-glyph') };
  }, ms);
}

for (const colorway of COLORWAYS) {
  test(`Rename: selected on open, off until changed, Enter morphs pen to check and turns the drum, then Undo in ${colorway}`, async ({ page }) => {
    await open(page, '/components/popover', colorway);
    await trigger(page).click();
    const field = plateOf(page).getByRole('textbox', { name: 'Region name' });
    await expect(field).toBeFocused();
    // The whole name is selected, so typing replaces it.
    expect(await field.evaluate((el: HTMLInputElement) => [el.selectionStart, el.selectionEnd])).toEqual([0, 'Trip to Lisbon'.length]);
    // The confirm leads with pen and is off while nothing changed; Enter does nothing.
    await expect(keyOf(page)).toBeDisabled();
    await expect(keyOf(page).locator('[data-glyph]')).toHaveAttribute('data-glyph', 'pen');
    await expect(keyOf(page)).toHaveAccessibleName('Rename');
    await page.keyboard.press('Enter');
    await expect(plateOf(page)).toBeVisible();
    await page.keyboard.type('Lisbon');
    await expect(keyOf(page)).toBeEnabled();
    await page.waitForTimeout(400);
    await page.locator('section', { hasText: 'Playground' }).first().screenshot({ path: capture(`popover-rename-${colorway}`) });

    // Enter: the glyph morphs (in-between frames) and the word turns on the drum (two faces at once).
    const seen = await commitAndWatch(page, 500);
    expect(seen.paths).toBeGreaterThan(3);
    expect(seen.faces).toBeGreaterThan(1);
    expect(seen.glyph).toBe('check');
    await expect(keyOf(page)).toHaveAccessibleName('Renamed');
    await page.locator('section', { hasText: 'Playground' }).first().screenshot({ path: capture(`popover-renamed-${colorway}`) });
    // Then the plate closes after the hold, and the toast offers Undo.
    await expect(plateOf(page)).toBeHidden();
    await expect(page.getByText('Renamed to Lisbon')).toBeVisible();
    await page.getByRole('button', { name: 'Undo' }).click();
    await trigger(page).click();
    await expect(plateOf(page).getByRole('textbox')).toHaveValue('Trip to Lisbon');
  });
}

test('Rename: Escape cancels; empty and taken names are refused with the reason; ⌘Z undoes', async ({ page }) => {
  await open(page, '/components/popover', 'bone');
  await trigger(page).click();
  const field = plateOf(page).getByRole('textbox');
  await page.keyboard.type('Lisbon');
  await page.keyboard.press('Escape');
  await expect(plateOf(page)).toBeHidden();
  await trigger(page).click();
  await expect(field).toHaveValue('Trip to Lisbon');

  // Empty: the key is off.
  await page.keyboard.press('Backspace');
  await expect(field).toHaveValue('');
  await expect(keyOf(page)).toBeDisabled();

  // Taken: the plate stays, the field is invalid and says why; fixing it clears the reason live.
  await page.keyboard.type('Inbox');
  await page.keyboard.press('Enter');
  await expect(plateOf(page)).toBeVisible();
  await expect(field).toHaveAttribute('aria-invalid', 'true');
  await expect(plateOf(page).getByText('A region is already called Inbox.')).toBeVisible();
  await page.waitForTimeout(500);
  await page.locator('section', { hasText: 'Playground' }).first().screenshot({ path: capture('popover-rename-invalid') });
  await page.keyboard.type(' zero');
  await expect(field).not.toHaveAttribute('aria-invalid', 'true');
  await expect(plateOf(page).getByText('A region is already called')).toBeHidden();

  // Too long.
  await field.fill('A region name that runs well past forty characters');
  await page.keyboard.press('Enter');
  await expect(plateOf(page).getByText('Keep it to 40 characters.')).toBeVisible();

  // A good name lands; ⌘Z (focus back on the trigger, not in a field) undoes it.
  await field.fill('Porto');
  await page.keyboard.press('Enter');
  await expect(plateOf(page)).toBeHidden();
  await expect(page.getByText('Renamed to Porto')).toBeVisible();
  await page.keyboard.press('ControlOrMeta+z');
  await expect(page.getByText('Renamed to Porto')).toBeHidden();
  await trigger(page).click();
  await expect(field).toHaveValue('Trip to Lisbon');
});

test('Rename under Reduce Motion: the glyph and the word change in place', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/components/popover', 'graphite');
  await trigger(page).click();
  await page.keyboard.type('Lisbon');
  const seen = await commitAndWatch(page, 400);
  expect(seen.paths).toBeLessThanOrEqual(2);
  expect(seen.glyph).toBe('check');
  await expect(keyOf(page)).toHaveAccessibleName('Renamed');
  await expect(plateOf(page)).toBeHidden();
});
