import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { COLORWAYS, capture, openPage, userEvent } from './harness';

const section = (text: string) => [...document.querySelectorAll('section')].find((s) => s.textContent!.includes(text))!;

// Switcher: one of a few views; click or arrows move the choice and the thumb glides under it.
for (const colorway of COLORWAYS) {
  test(`choose a view by click and by arrows in ${colorway}`, async () => {
    await openPage('/components/switcher', colorway);
    const group = page.getByRole('radiogroup', { name: 'Lens view' });
    const radios = group.getByRole('radio');
    await userEvent.click(radios.nth(2));
    await expect.element(radios.nth(2)).toBeChecked();
    await userEvent.keyboard('{ArrowRight}');
    await expect.element(radios.nth(3)).toBeChecked();
    await expect.element(radios.nth(3)).toHaveFocus();
    // The thumb sits under the chosen segment once it has glided there.
    const el = group.element();
    await Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished));
    const thumb = () => {
      const t = [...el.querySelectorAll('*')].find((n) => getComputedStyle(n).position === 'absolute' && n.getBoundingClientRect().width > 10);
      const r = t!.getBoundingClientRect();
      return { x: r.x, w: r.width };
    };
    const seg = () => radios.nth(3).element().getBoundingClientRect();
    await expect.poll(() => Math.abs(thumb().x - seg().x)).toBeLessThan(2);
    await expect.poll(() => Math.abs(thumb().w - seg().width)).toBeLessThan(2);
    await expect.element(page.getByRole('radiogroup', { name: 'Scale' }).getByRole('radio').first()).toBeDisabled();
    await capture(`switcher-${colorway}`, section('Playground'));
  });
}
