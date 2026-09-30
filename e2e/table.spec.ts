import { expect, test } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Table: sorting reorders rows (and says so with aria-sort) while each row travels from its old place;
// selection marks rows and the head goes mixed; an empty table says so.
const trips = (page: import('@playwright/test').Page) => page.getByRole('table', { name: 'Trips', exact: true });
const places = (page: import('@playwright/test').Page) => trips(page).locator('tbody tr td:nth-child(2)').allInnerTexts();

for (const colorway of COLORWAYS) {
  test(`sorts, selects, and says when empty, in ${colorway}`, async ({ page }) => {
    await open(page, '/components/table', colorway);
    expect(await places(page)).toEqual(['Kyoto', 'Lisbon', 'Mexico City', 'Oslo', 'Porto']);
    await expect(trips(page).getByRole('columnheader', { name: 'Place' })).toHaveAttribute('aria-sort', 'ascending');
    await trips(page).getByRole('button', { name: 'Days' }).click();
    expect(await places(page)).toEqual(['Porto', 'Oslo', 'Lisbon', 'Mexico City', 'Kyoto']);
    await trips(page).getByRole('button', { name: 'Days' }).click();
    await expect(trips(page).getByRole('columnheader', { name: 'Days' })).toHaveAttribute('aria-sort', 'descending');
    expect((await places(page))[0]).toBe('Kyoto');

    const all = trips(page).getByRole('checkbox', { name: 'Select all' });
    await expect(all).toHaveAttribute('aria-checked', 'mixed');
    await all.click();
    await expect(all).toBeChecked();
    await trips(page).getByRole('checkbox', { name: 'Select Oslo' }).click();
    await expect(all).toHaveAttribute('aria-checked', 'mixed');
    await expect(page.getByRole('table', { name: 'Archived trips' })).toContainText('No trips yet.');
    await page.waitForTimeout(600);
    await page.locator('section', { hasText: 'Playground' }).first().screenshot({ path: capture(`table-${colorway}`) });
  });
}

test('each row travels from where it was when sorted', async ({ page }) => {
  await open(page, '/components/table', 'bone');
  const moving = await trips(page).evaluate(async (table) => {
    const kyoto = [...table.querySelectorAll('tbody tr')].find((tr) => tr.textContent?.includes('Kyoto')) as HTMLElement;
    const before = kyoto.getBoundingClientRect().top;
    ([...table.querySelectorAll('button')].find((b) => b.textContent?.startsWith('Notes')) as HTMLElement).click();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const early = kyoto.getBoundingClientRect().top;
    await new Promise((r) => setTimeout(r, 700));
    const after = kyoto.getBoundingClientRect().top;
    return { before, early, after };
  });
  // Kyoto goes from first to last (most notes last in ascending); mid-flight it is between.
  expect(moving.after).toBeGreaterThan(moving.before + 100);
  expect(moving.early).toBeGreaterThan(moving.before - 1);
  expect(moving.early).toBeLessThan(moving.after - 20);
});
