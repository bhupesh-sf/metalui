import { expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { openPage } from './harness';

// Gadgets › Compose: the bench an assistant composes on. A spec is checked as it is typed: an invented
// Part is refused with the catalog named, a colour clash names the free stations, broken JSON says so,
// and a valid spec renders live with the material and body colour its job and feel resolve to.
const $ = (css: string) => document.querySelector(css)!;
const count = (css: string) => document.querySelectorAll(css).length;

test('the bench checks a spec as it is typed', async () => {
  await openPage('/gadgets/compose', 'bone');
  const result = page.getByTestId('compose-result'), source = page.getByTestId('compose-source');
  // The reading rig: valid; each gadget renders with the material and body the table resolves.
  await expect.element(result).toHaveAttribute('data-kind', 'rig');
  await expect.poll(() => count('[data-testid="compose-rig"] svg[data-gadget]')).toBe(2);
  for (const inst of ['today', 'streak']) {
    const row = $(`[data-testid="compose-resolved"] tr[data-inst="${inst}"]`), svg = page.elementLocator($(`[data-testid="compose-rig"] svg[data-inst="${inst}"]`));
    await expect.element(svg).toHaveAttribute('data-material', row.getAttribute('data-material')!);
    await expect.element(svg).toHaveAttribute('data-body', row.getAttribute('data-body')!);
  }
  // An invented Part: refused, with the catalog it may choose from.
  await userEvent.click(page.getByRole('radio', { name: 'An invented part' }));
  const unknown = () => $('[data-testid="compose-problems"] li[data-code="part.unknown"]')?.textContent ?? '';
  await expect.poll(unknown).toContain('"antenna" is not a Part');
  expect(unknown()).toContain('slab');
  // A colour clash: two keep gadgets at one station; the fix names where one may move.
  await userEvent.click(page.getByRole('radio', { name: 'A colour clash' }));
  await expect.poll(() => $('[data-testid="compose-problems"] li[data-code="set.hue"]')?.textContent ?? '').toContain('may move to 300°');
  // Not JSON: said so, nothing drawn.
  await userEvent.fill(source, '{ "$schema": "metalui/gadget@1", ');
  await expect.element(result).toHaveAttribute('data-kind', 'json');
  // A gadget: drawn live, its root carrying what the table resolves.
  await userEvent.click(page.getByRole('radio', { name: 'Patch bay' }));
  await expect.element(result).toHaveAttribute('data-kind', 'gadget');
  const rows = document.querySelectorAll('[data-testid="compose-resolved"] tr'), row = rows[rows.length - 1];
  await expect.element(page.getByTestId('compose-gadget')).toHaveAttribute('data-material', row.getAttribute('data-material')!);
});
