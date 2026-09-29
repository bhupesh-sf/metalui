import { expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { COLORWAYS, capture, mouse, openPage, until } from './harness';

const text = (el: Element) => el.textContent!.replace(/\s+/g, ' ').trim();
const section = (text: string) => [...document.querySelectorAll('section')].find((s) => s.textContent!.includes(text))!;

// Toolbar: pick a tool (it latches with its LED), each tool names itself and its key, arrows move along.
for (const colorway of COLORWAYS) {
  test(`pick a tool and read its tooltip in ${colorway}`, async () => {
    await openPage('/components/toolbar', colorway);
    const strip = page.getByRole('toolbar', { name: 'Tools' }).first();
    const write = strip.getByRole('button', { name: 'Write', exact: true });
    await userEvent.click(write);
    await expect.element(write).toHaveAttribute('aria-pressed', 'true');
    await expect.element(strip.getByRole('button', { name: 'Select', exact: true })).toHaveAttribute('aria-pressed', 'false');
    expect(getComputedStyle(write.element(), '::after').content).not.toBe('none');
    await mouse.move(0, 0);
    await userEvent.hover(strip.getByRole('button', { name: 'Region', exact: true }));
    const tip = await until(() => document.querySelector('.mu-tooltip'));
    await expect.poll(() => text(tip)).toBe('Region · R');
    await capture(`toolbar-${colorway}`, section('Playground'));
    (write.element() as HTMLElement).focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect.element(strip.getByRole('button', { name: 'Region', exact: true })).toHaveFocus();
  });
}
