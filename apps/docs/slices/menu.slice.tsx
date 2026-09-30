import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { COLORWAYS, capture, openPage, until, userEvent } from './harness';

const text = (el: Element) => el.textContent!.replace(/\s+/g, ' ').trim();
const settled = (el: Element) => Promise.all(el.getAnimations().map((a) => a.finished));

// Menu and the correction popover: right-click a cue, the heading says where it came from, a correction
// lets the cue go with Undo in a toast; a trigger menu works by keyboard and closes back to its trigger.
for (const colorway of COLORWAYS) {
  test(`correct a cue, then use a menu by keyboard in ${colorway}`, async () => {
    await openPage('/components/menu', colorway);
    const line = page.getByTestId('corrections').element();
    const dates = () => line.querySelectorAll('.mu-cue[data-kind="date"]');
    await userEvent.click(page.elementLocator(dates()[0]), { button: 'right' });
    const menu = page.getByRole('menu');
    await expect.poll(() => text(menu.element())).toContain('Date · rule · date parser');
    await expect.element(menu.getByRole('menuitem', { name: 'Reset Corrections' })).toHaveAttribute('aria-disabled', 'true');
    await settled(menu.element());
    await capture(`menu-correction-${colorway}`, menu.element());
    await userEvent.click(menu.getByRole('menuitem', { name: 'Ignore “tomorrow 4pm”' }));
    await expect.poll(() => menu.elements().length).toBe(0);
    await expect.poll(() => dates().length).toBe(0);
    const toast = page.elementLocator(await until(() => [...document.querySelectorAll('.mu-toast')].find((t) => t.textContent!.includes('Correction remembered'))));
    await userEvent.click(toast.getByRole('button', { name: /Undo/ }));
    await expect.poll(() => dates().length).toBe(1);

    const more = page.getByRole('button', { name: 'More' });
    (more.element() as HTMLElement).focus();
    await userEvent.keyboard('{Enter}');
    await expect.element(page.getByRole('menuitem', { name: /Duplicate/ })).toHaveAttribute('data-highlighted', '');
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{Enter}');
    await expect.element(page.getByText('last chosen · Pin')).toBeVisible();
    await expect.element(more).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect.poll(() => getComputedStyle(page.getByRole('menuitem', { name: /Delete/ }).element()).color).toBe('rgb(216, 69, 59)');
    await userEvent.keyboard('{Escape}');
    await expect.poll(() => page.getByRole('menu').elements().length).toBe(0);
    await expect.element(more).toHaveFocus();
  });
}
