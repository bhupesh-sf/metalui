import { expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { COLORWAYS, capture, openPage, until } from './harness';

const q = (css: string) => document.querySelector(css);
const text = (css: string) => q(css)?.textContent ?? '';

/**
 * A capture of a region of the window: a transparent pane over it, captured as an element. (Local: the
 * harness's capture takes an element, and this capture is the palette with a margin around it.)
 */
async function captureRect(name: string, clip: { x: number; y: number; width: number; height: number }) {
  const pane = document.createElement('div');
  Object.assign(pane.style, { position: 'fixed', left: `${clip.x}px`, top: `${clip.y}px`, width: `${clip.width}px`, height: `${clip.height}px`, pointerEvents: 'none', zIndex: '2147483647' });
  document.body.append(pane);
  try { await capture(name, pane); } finally { pane.remove(); }
}

// Command palette: ⌘K opens it with the field focused and the first row selected; typing refilters and marks
// matches; arrows and hover move the selection; ↩ runs, ⇧↩ pins, ⎋ closes and focus returns.
for (const colorway of COLORWAYS) {
  test(`ask, move, run and pin in ${colorway}`, async () => {
    await openPage('/components/command-palette', colorway);
    // ⌘K or Ctrl+K: the page takes either (Playwright's ControlOrMeta); WebDriver's keyboard here has Control.
    await userEvent.keyboard('{Control>}k{/Control}');
    const field = page.getByRole('combobox', { name: 'Lenses and actions' });
    await expect.element(field).toHaveFocus();
    const selected = () => text('.mu-palette-row[data-highlighted]');
    await expect.poll(selected).toBe('open tasks');
    await userEvent.keyboard('poster');
    await expect.poll(selected).toContain('See “poster”');
    await expect.poll(() => text('.mu-palette-sec')).toContain('LENS');
    await expect.poll(() => text('.mu-palette-mark')).toBe('poster');
    expect(getComputedStyle(q('.mu-palette-mark')!).fontWeight).toBe('650');
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{ArrowDown}');
    await expect.poll(selected).toContain('the font on the train poster');
    await Promise.all(q('.mu-palette')!.getAnimations().map((a) => a.finished));
    const plate = q('.mu-palette')!.getBoundingClientRect();
    expect(plate.width).toBe(560);
    await captureRect(`command-palette-${colorway}`, { x: plate.x - 40, y: plate.y - 30, width: plate.width + 80, height: plate.height + 60 });
    await userEvent.hover(page.elementLocator(document.querySelectorAll('.mu-palette-row')[1]));
    await expect.poll(selected).toContain('#poster');
    await userEvent.keyboard('{Shift>}{Enter}{/Shift}');
    await expect.poll(() => q('.mu-palette')).toBe(null);
    await expect.element(page.getByText('last run · #poster · pinned')).toBeVisible();
    await userEvent.click(page.getByRole('button', { name: /Lenses and actions/ }));
    await userEvent.keyboard('undo');
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{Enter}');
    await expect.element(page.getByText('last run · Undo')).toBeVisible();
    const trigger = page.getByRole('button', { name: /Lenses and actions/ });
    await userEvent.click(trigger);
    await userEvent.keyboard('{Escape}');
    await expect.poll(() => q('.mu-palette')).toBe(null);
    await expect.element(trigger).toHaveFocus();
  });
}

test('nothing matches, and the palette rises in place under reduced motion', async () => {
  await openPage('/components/command-palette', 'bone', { media: { 'prefers-reduced-motion': 'reduce' } });
  await userEvent.click(page.getByRole('button', { name: /Lenses and actions/ }));
  const plate = await until(() => q('.mu-palette'));
  // no rise: no transform, or the identity one
  expect(new DOMMatrix(getComputedStyle(plate).transform).isIdentity).toBe(true);
  await userEvent.keyboard('zzqx');
  // The lens row for the words is always there; nothing else matches.
  await expect.poll(() => document.querySelectorAll('.mu-palette-row').length).toBe(1);
});
