import { expect, test } from '@playwright/test';
import { open } from './helpers';

// Gadgets › Compose: the bench an assistant composes on. A spec is checked as it is typed: an invented
// Part is refused with the catalog named, a colour clash names the free stations, broken JSON says so,
// and a valid spec renders live with the material and body colour its job and feel resolve to.
test('the bench checks a spec as it is typed', async ({ page }) => {
  await open(page, '/gadgets/compose', 'bone');
  const result = page.getByTestId('compose-result'), source = page.getByTestId('compose-source');
  // The reading rig: valid; each gadget renders with the material and body the table resolves.
  await expect(result).toHaveAttribute('data-kind', 'rig');
  const drawn = page.getByTestId('compose-rig').locator('svg[data-gadget]');
  await expect(drawn).toHaveCount(2);
  for (const inst of ['today', 'streak']) {
    const row = page.getByTestId('compose-resolved').locator(`tr[data-inst="${inst}"]`), svg = page.getByTestId('compose-rig').locator(`svg[data-inst="${inst}"]`);
    await expect(svg).toHaveAttribute('data-material', (await row.getAttribute('data-material'))!);
    await expect(svg).toHaveAttribute('data-body', (await row.getAttribute('data-body'))!);
  }
  // An invented Part: refused, with the catalog it may choose from.
  await page.getByRole('radio', { name: 'An invented part' }).click();
  const unknown = page.getByTestId('compose-problems').locator('li[data-code="part.unknown"]');
  await expect(unknown).toContainText('"antenna" is not a Part');
  await expect(unknown).toContainText('slab');
  // A colour clash: two keep gadgets at one station; the fix names where one may move.
  await page.getByRole('radio', { name: 'A colour clash' }).click();
  await expect(page.getByTestId('compose-problems').locator('li[data-code="set.hue"]').first()).toContainText('may move to 300°');
  // Not JSON: said so, nothing drawn.
  await source.fill('{ "$schema": "metalui/gadget@1", ');
  await expect(result).toHaveAttribute('data-kind', 'json');
  // A gadget: drawn live, its root carrying what the table resolves.
  await page.getByRole('radio', { name: 'Patch bay' }).click();
  await expect(result).toHaveAttribute('data-kind', 'gadget');
  const row = page.getByTestId('compose-resolved').locator('tr').last();
  await expect(page.getByTestId('compose-gadget')).toHaveAttribute('data-material', (await row.getAttribute('data-material'))!);
});
