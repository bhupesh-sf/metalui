import { expect, test } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Textarea: the well grows with what is written (settle spring, no overshoot) up to max rows, then
// scrolls; near a limit a counter shows, and writing past it shakes only the counter.
for (const colorway of COLORWAYS) {
  test(`grows with its text, stops at max rows, and refuses past the limit in ${colorway}`, async ({ page }) => {
    await open(page, '/components/textarea', colorway);
    const note = page.getByRole('textbox', { name: 'Note', exact: true });
    const rest = (await note.boundingBox())!.height;

    // Each new line grows the well; the growth settles without overshooting.
    await note.click();
    await note.pressSequentially('one\ntwo\nthree\nfour\nfive');
    const heights = await note.evaluate(async (el) => {
      const out: number[] = [];
      const t0 = performance.now();
      await new Promise<void>((done) => {
        const frame = () => { out.push(el.getBoundingClientRect().height); if (performance.now() - t0 < 600) requestAnimationFrame(frame); else done(); };
        requestAnimationFrame(frame);
      });
      return out;
    });
    const grown = heights.at(-1)!;
    expect(grown).toBeGreaterThan(rest);
    expect(Math.max(...heights)).toBeLessThanOrEqual(grown + 0.5);
    expect(await note.evaluate((el) => el.scrollTop)).toBe(0);

    // Deleting shrinks it back to its rest height.
    await note.press('ControlOrMeta+a');
    await note.press('Backspace');
    await expect.poll(async () => (await note.boundingBox())!.height).toBeCloseTo(rest, 0);

    // The counter shows near the limit and turns red at it; typing past it changes nothing.
    const counter = page.locator('.mu-textarea-count').first();
    const counterRow = page.locator('.mu-textarea-count-row').first();
    await expect(counterRow).toHaveCSS('opacity', '0');
    expect((await counterRow.boundingBox())!.height).toBeLessThan(1); // a hidden counter takes no room
    await note.fill('x'.repeat(100));
    await expect(counter).toHaveText(/100\/120/);
    await expect(counterRow).toHaveCSS('opacity', '1');
    await note.fill('x'.repeat(120));
    await note.press('End');
    await note.pressSequentially('yz');
    await expect(note).toHaveValue('x'.repeat(120));
    await expect(counter).toHaveAttribute('data-refused', '');
    await expect(counter).toHaveAttribute('data-at-limit', '');
    await expect(counter.locator('[aria-live]')).toHaveText('Limit reached, 120 characters');

    // Invalid is announced; disabled cannot be edited.
    await expect(page.getByRole('textbox', { name: 'Invalid note' })).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByRole('textbox', { name: 'Disabled note' })).toBeDisabled();

    await page.waitForTimeout(1200);
    await page.locator('section', { hasText: 'Playground' }).first().screenshot({ path: capture(`textarea-${colorway}`) });
  });
}

test('grows to max rows, then scrolls', async ({ page }) => {
  await open(page, '/components/textarea', 'bone');
  const note = page.getByRole('textbox', { name: 'Note', exact: true });
  await note.fill(Array.from({ length: 5 }, (_, i) => `l${i}`).join('\n'));
  await page.waitForTimeout(600);
  const five = (await note.boundingBox())!.height;
  await note.fill(Array.from({ length: 14 }, (_, i) => `l${i}`).join('\n').slice(0, 120));
  await page.waitForTimeout(600);
  const capped = (await note.boundingBox())!.height;
  // 8 rows of 20 plus padding; beyond that it scrolls.
  expect(capped).toBeGreaterThan(five);
  expect(capped).toBeCloseTo(8 * 20 + 22, 0);
  await expect(note).toHaveCSS('overflow-y', 'auto');
});

test('Reduce Motion: the height snaps and the counter does not move', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/components/textarea', 'graphite');
  const note = page.getByRole('textbox', { name: 'Note', exact: true });
  await note.fill('a\nb\nc\nd\ne');
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  expect((await note.boundingBox())!.height).toBeCloseTo(5 * 20 + 22, 0);
  await note.fill('x'.repeat(120));
  await note.press('End');
  await note.press('y');
  const counter = page.locator('.mu-textarea-count').first();
  await expect(counter).toHaveAttribute('data-at-limit', '');
  expect(await counter.evaluate((el) => getComputedStyle(el).translate)).toMatch(/^(none|0px)$/);
});

// Beside fields: regular and compact write in the field's type at its inset, and countFrom 0 shows the
// counter from the first character, linked to the textarea for screen readers.
test('a regular or compact textarea matches the field above it and can count from the start', async ({ page }) => {
  await open(page, '/components/textarea', 'bone');
  for (const size of ['regular', 'compact']) {
    const field = page.getByRole('textbox', { name: `Name, ${size}` });
    const bio = page.getByRole('textbox', { name: `Bio, ${size}` });
    expect(await bio.evaluate((el) => getComputedStyle(el).font)).toBe(await field.evaluate((el) => getComputedStyle(el).font));
    const inset = async (el: typeof bio) => (await el.boundingBox())!.x;
    const text = await bio.evaluate((el) => el.getBoundingClientRect().x + parseFloat(getComputedStyle(el).paddingLeft));
    expect(text).toBeCloseTo(await inset(field), 0);
    const count = bio.locator('xpath=ancestor::div[contains(@class,"mu-textarea-slot")]').locator('.mu-textarea-count-row');
    await expect(count).toHaveAttribute('data-shown', '');
    await expect(bio).toHaveAccessibleDescription(/\/160/);
  }
});

test.describe('ghost text', () => {
  for (const colorway of COLORWAYS) {
    test(`the next words show in grey at the end; typing them eats them, Tab takes the rest, in ${colorway}`, async ({ page }) => {
      await open(page, '/components/textarea', colorway);
      const section = page.locator('#ghost');
      const well = section.getByRole('textbox', { name: 'Reply to the print shop' });
      const ghost = section.locator('.mu-textarea-ghost-words');
      await well.click();
      await well.press('ArrowDown');
      await expect(ghost).toHaveText(' the proofs, they look sharp.');
      await expect(section.getByRole('status')).toHaveText('Suggestion:  the proofs, they look sharp.. Tab to accept.');
      await section.screenshot({ path: capture(`textarea-ghost-${colorway}`) });

      await well.pressSequentially(' the');
      await expect(ghost).toHaveText(' proofs, they look sharp.');
      await well.press('Tab');
      await expect(well).toHaveValue('Thanks for the proofs, they look sharp.');
      await expect(well).toBeFocused();
      await expect(ghost).toHaveCount(0);
      // Taken as typed: one undo takes it back.
      await well.press('ControlOrMeta+z');
      await expect(well).toHaveValue('Thanks for the');
    });
  }

  test('anything else hides it; Escape lets it go; away from the end it hides', async ({ page }) => {
    await open(page, '/components/textarea', 'bone');
    const section = page.locator('#ghost');
    const well = section.getByRole('textbox', { name: 'Reply to the print shop' });
    const ghost = section.locator('.mu-textarea-ghost-words');
    await well.click();
    await well.press('ArrowDown');
    await expect(ghost).toBeVisible();
    await well.press('ArrowLeft');
    await expect(ghost).toHaveCount(0);
    await well.press('ArrowRight');
    await expect(ghost).toBeVisible();
    await well.press('Escape');
    await expect(ghost).toHaveCount(0);
    await expect(well).toHaveValue('Thanks for');
    // Tab with nothing showing leaves the well, as it always does.
    await well.press('Tab');
    await expect(well).not.toBeFocused();
    await well.focus();
    await well.press('ArrowDown');
    await well.pressSequentially(' x');
    await expect(ghost).toHaveCount(0);
  });
});
