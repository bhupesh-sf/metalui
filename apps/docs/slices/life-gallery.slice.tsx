import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { COLORWAYS, capture, openPage, sleep, userEvent, emulateMedia } from './harness';

/**
 * What the clipboard holds, as a person would find it: pasted into a field. (Local: the page may not read
 * the clipboard here, and the harness grants no permissions; a paste needs none.)
 */
async function pasted() {
  const field = document.createElement('textarea');
  document.body.append(field);
  field.focus();
  try { await userEvent.paste(); return field.value; } finally { field.remove(); }
}
const section = (has: string) => [...document.querySelectorAll('section')].find((s) => s.textContent!.includes(has))!;

// Life gallery (import plan §3.2): search by a synonym, hover the result to see its pose, copy it.
for (const colorway of COLORWAYS) {
  test(`find, hover and copy a life glyph in ${colorway}`, async () => {
    await openPage('/icons/life', colorway);
    await userEvent.fill(page.getByRole('searchbox'), 'brekkie');
    const results = page.getByTestId('life-results');
    await expect.poll(() => results.getByRole('button').first().element().textContent!.trim()).toBe('Breakfast');
    await userEvent.click(results.getByRole('button', { name: 'Breakfast' }));

    const detail = page.getByTestId('life-detail');
    const white = detail.element().querySelector('svg.mu-il-breakfast .w')!;
    const rest = getComputedStyle(white).transform;
    await userEvent.hover(detail);
    await expect.poll(() => getComputedStyle(white).transform).not.toBe(rest); // the egg white turns −4° on hover
    await capture(`life-gallery-detail-${colorway}`, section('Hover: yolk wobbles'));

    await userEvent.click(page.getByRole('button', { name: 'Copy name' }));
    expect(await pasted()).toBe('breakfast');
    await userEvent.click(page.getByRole('button', { name: 'Copy SVG' }));
    expect(await pasted()).toContain('<svg');

    await userEvent.fill(page.getByRole('searchbox'), '');
    await capture(`life-gallery-${colorway}`, document.querySelector('section')!);
  });
}

test('life glyphs stay still under reduced motion', async () => {
  await openPage('/icons/life', 'bone', { media: { 'prefers-reduced-motion': 'reduce' } });
  const detail = page.getByTestId('life-detail');
  const white = detail.element().querySelector('svg.mu-il-breakfast .w')!;
  const rest = getComputedStyle(white).transform;
  await userEvent.hover(detail);
  await sleep(300);
  expect(getComputedStyle(white).transform).toBe(rest);
});

// Feelings construction (import plan §3.3): the composer draws every named feeling from its values.
test('the composer draws every feeling the four variables name', async () => {
  await openPage('/icons/life', 'bone');
  const figures = () => [...page.getByTestId('feelings-values').element().querySelectorAll('figure')];
  await expect.poll(() => figures().length).toBe(12);
  for (const fig of figures()) {
    expect(page.elementLocator(fig).getByRole('img').elements()).toHaveLength(2); // composed and authored
    expect(fig.querySelector('svg')!.querySelectorAll('circle.v')).toHaveLength(1);
  }
  await capture('feelings-composer-bone', section('The feelings language'));
});

// Feelings grid (import plan §3.4): every feeling in its cell, tinted; in ink under Increase Contrast.
for (const colorway of ['bone', 'graphite'] as const) {
  test(`feelings grid in ${colorway}, then under Increase Contrast`, async () => {
    await openPage('/icons/life', colorway);
    const grid = page.getByTestId(`feelings-grid-${colorway}`).element();
    await expect.poll(() => grid.querySelectorAll('[data-feeling]').length).toBe(23);
    const angry = grid.querySelector('[data-feeling="angry"] svg')!;
    const tinted = getComputedStyle(angry).color;
    await capture(`feelings-grid-${colorway}`, section('The feelings grid'));
    await emulateMedia({ 'prefers-contrast': 'more' });
    const ink = getComputedStyle(angry).color;
    const icon = getComputedStyle(grid).color;
    expect(ink).not.toBe(tinted);
    expect(ink).toBe(icon);
  });
}
