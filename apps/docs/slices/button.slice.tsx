import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import tokens from '../../../tokens/tokens.json';
import { COLORWAYS, capture, openPage, press, release } from './harness';

// Button: the default height, compact smaller with the smaller type (both from the recipe); a press
// sinks it one point.
const P = tokens.recipes.button.props;
const height = (el: Element) => el.getBoundingClientRect().height;

for (const colorway of COLORWAYS) {
  test(`default and compact buttons in ${colorway}`, async () => {
    await openPage('/components/button', colorway);
    const variants = document.querySelector('section#variants')!;
    const seed = page.elementLocator(variants).getByRole('button', { name: 'seed a sample day' });
    expect(height(seed.element())).toBe(Number(P.compact.height));
    expect(getComputedStyle(seed.element()).fontSize).toBe('12px');
    // at rest, unmagnified: the first Cancel in States
    const cancel = page.elementLocator(document.querySelector('section#states')!).getByRole('button', { name: 'Cancel' }).first();
    expect(height(cancel.element())).toBe(Number(P.self.height));
    expect(getComputedStyle(cancel.element()).fontSize).toBe('12.5px');

    // Held down, it sinks by the travel: the `translate` property (Tailwind v4's translate-y).
    seed.element().scrollIntoView({ block: 'center' });
    await press(seed.element());
    await new Promise((r) => setTimeout(r, 120));
    expect(parseFloat(getComputedStyle(seed.element()).translate.split(' ')[1] ?? '0')).toBe(Number(P.self.travel));
    await release(seed.element());

    // two Share buttons: the one with the glyph, and the disabled one
    await expect.element(page.elementLocator(variants).getByRole('button', { name: 'Share' }).last()).toBeDisabled();
    await capture(`button-compact-${colorway}`, variants);
  });
}
