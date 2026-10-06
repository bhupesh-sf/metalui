import { expect, test, type Page } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Alert: a message about this place. The playground's form saves: the alert arrives waiting, turns into
// failed in place (read out at once), then into done after Try again, and leaves when dismissed. Each kind
// carries its own lamp; the actions sit beside the words when wide and under them when narrow; Esc
// dismisses; Reduce Motion drops the travel.
const form = (page: Page) => page.getByRole('form', { name: 'Trip plan' });
const planAlert = (page: Page) => page.getByTestId('plan-alert');

for (const colorway of COLORWAYS) {
  test(`waits, fails, resolves in place and is dismissed, in ${colorway}`, async ({ page }) => {
    await open(page, '/components/alert', colorway);
    await form(page).getByRole('button', { name: 'Save plan' }).click();
    await expect(planAlert(page)).toHaveAttribute('data-kind', 'waiting');
    await expect(planAlert(page)).toHaveAttribute('role', 'status');
    await expect(planAlert(page)).toContainText('Saving the plan');
    expect(await planAlert(page).evaluate((el) => getComputedStyle(el).animationName)).toBe('mu-alert-arrive');
    await expect(planAlert(page).locator('.mu-led')).toHaveAttribute('data-gesture', 'breathe');

    // The first save fails: the same alert turns into failed and is read out at once.
    await expect(planAlert(page)).toHaveAttribute('data-kind', 'failed', { timeout: 5000 });
    await expect(planAlert(page)).toHaveAttribute('role', 'alert');
    await expect(planAlert(page)).toContainText("Couldn't save the plan");
    await expect(planAlert(page).locator('.mu-led')).toHaveAttribute('data-kind', 'failed');
    await expect(planAlert(page).getByRole('button', { name: 'Dismiss' })).toHaveCount(0); // an error that's still true stays
    await page.waitForTimeout(700); // the glyph's morph and the lamp's two blinks settle
    await form(page).screenshot({ path: capture(`alert-failed-${colorway}`) });

    await planAlert(page).getByRole('button', { name: 'Try again' }).click();
    await expect(planAlert(page)).toHaveAttribute('data-kind', 'waiting');
    await expect(planAlert(page)).toHaveAttribute('data-kind', 'done', { timeout: 5000 });
    await expect(planAlert(page)).toContainText('Plan saved');
    await expect(planAlert(page).locator('.mu-led')).toHaveAttribute('data-kind', 'live');

    await planAlert(page).getByRole('button', { name: 'Dismiss' }).click();
    await expect(planAlert(page)).toHaveCount(0);
  });

  test(`kinds, tones and places, in ${colorway}`, async ({ page }) => {
    await open(page, '/components/alert', colorway);
    const kinds = page.getByTestId('alert-kinds');
    const lamps = { note: null, done: 'live', waiting: 'waiting', urgent: 'waiting', failed: 'failed' } as const;
    for (const [kind, led] of Object.entries(lamps)) {
      const one = kinds.locator(`.mu-alert[data-kind="${kind}"]`);
      await expect(one).toHaveAttribute('role', kind === 'failed' || kind === 'urgent' ? 'alert' : 'status');
      if (led) await expect(one.locator('.mu-led')).toHaveAttribute('data-kind', led);
      else await expect(one.locator('.mu-led')).toHaveCount(0);
    }

    const places = page.getByTestId('alert-places');
    // Wide: the actions sit beside the words. Narrow: under them.
    const beside = async (sel: string) => places.locator(sel).evaluate((el) => {
      const words = el.querySelector('.mu-alert-title')!.getBoundingClientRect();
      const actions = el.querySelector('.mu-alert-actions')!.getBoundingClientRect();
      return actions.left > words.right - 1 && actions.top < words.bottom;
    });
    expect(await beside('[data-place="strong"]')).toBe(true);
    expect(await beside('[data-place="parts"] .mu-alert[data-kind="waiting"]')).toBe(false);
    // Quiet in a card: no plate of its own.
    expect(await places.locator('[data-place="card"] .mu-alert').evaluate((el) => getComputedStyle(el).boxShadow)).toBe('none');
    // A banner has square ends.
    expect(await places.locator('[data-place="banner"] .mu-alert').evaluate((el) => getComputedStyle(el).borderTopLeftRadius)).toBe('0px');

    await kinds.scrollIntoViewIfNeeded();
    await page.waitForTimeout(700);
    await kinds.screenshot({ path: capture(`alert-kinds-${colorway}`) });
    await places.screenshot({ path: capture(`alert-places-${colorway}`) });
  });
}

test('Esc dismisses; Reduce Motion drops the travel', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/components/alert', 'bone');
  const tuner = page.getByTestId('alert-tuner');
  const alert = tuner.locator('.mu-alert');
  expect(await alert.evaluate((el) => getComputedStyle(el).getPropertyValue('--mu-travel-settle').trim())).toBe('0');
  await alert.getByRole('button', { name: 'Open' }).focus();
  await page.keyboard.press('Escape');
  await expect(alert).toHaveCount(0);
  await tuner.getByRole('button', { name: 'Show the alert again' }).click();
  await expect(alert).toHaveCount(1);
});
