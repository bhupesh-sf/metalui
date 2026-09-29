import { expect, test } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// The Day object on Components › Day: the page, the year and the line; tearing moves to the next
// day; reduced motion tears at once.
for (const colorway of COLORWAYS) {
  test(`day widget in ${colorway}`, async ({ page }) => {
    await open(page, '/components/day', colorway);
    const day = page.getByTestId(`day-${colorway}`).locator('section.mu-day');
    await expect(day.getByRole('img', { name: /^Day \d+ of 36[56]: \d+ days left$/ })).toBeVisible();
    await expect(day.locator('blockquote')).not.toBeEmpty();
    await expect(page.getByTestId(`day-${colorway}`).locator('section.mu-day-tile')).toHaveCount(1);
    await page.getByTestId(`day-${colorway}`).screenshot({ path: capture(`day-${colorway}`) });
  });
}

test('tearing the page shows the next day', async ({ page }) => {
  await open(page, '/components/day', 'bone');
  const day = page.getByTestId('day-bone').locator('section.mu-day');
  const tear = day.getByRole('button', { name: /Tear off this page/ });
  const before = await tear.getAttribute('aria-label');
  const next = before!.match(/go to (.+)\.$/)![1];
  await tear.click();
  await expect(day.getByRole('button', { name: /Tear off this page/ })).toHaveAttribute('aria-label', new RegExp(`^${next.split(' ')[0]} `));
  await expect(page.getByText(/^Torn off; now showing/)).toBeVisible();
});

test('reduced motion tears at once', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/components/day', 'graphite');
  const day = page.getByTestId('day-graphite').locator('section.mu-day');
  const tear = day.getByRole('button', { name: /Tear off this page/ });
  const next = (await tear.getAttribute('aria-label'))!.match(/go to (\w+) /)![1];
  await tear.click();
  await expect(day.getByRole('button', { name: /Tear off this page/ })).toHaveAttribute('aria-label', new RegExp(`^${next} `));
});
