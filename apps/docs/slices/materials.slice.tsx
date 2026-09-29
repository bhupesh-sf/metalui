import { expect, test } from 'vitest';
import { commands } from 'vitest/browser';
import { COLORWAYS, capture, openPage } from './harness';

const section = (has: string) => [...document.querySelectorAll('section')].find((s) => s.textContent!.includes(has))!;

// Frost (import plan §2): three recipes over a busy backdrop, their opaque twins under
// Reduce Transparency, and the contrast edge under Increase Contrast.
for (const colorway of COLORWAYS) {
  test(`frost in ${colorway}`, async () => {
    await openPage('/foundations/materials', colorway);
    const plate = document.querySelector('[data-frost="plate"]')!;
    const style = () => {
      const s = getComputedStyle(plate);
      return { bg: s.backgroundColor, filter: s.backdropFilter, shadow: s.boxShadow };
    };

    const frosted = style();
    expect(frosted.filter).toBe('blur(22px) saturate(1.6)');
    expect(frosted.bg).toBe(colorway === 'bone' ? 'rgba(251, 250, 248, 0.8)' : 'rgba(34, 34, 37, 0.78)');
    await capture(`frost-${colorway}`, section('Three frosted recipes'));

    await commands.media([{ name: 'prefers-reduced-transparency', value: 'reduce' }]);
    const opaque = style();
    expect(opaque.filter).toBe('none');
    expect(opaque.bg).toBe(colorway === 'bone' ? 'rgb(244, 243, 240)' : 'rgb(37, 37, 40)');
    expect(opaque.shadow).toBe(frosted.shadow);
    await capture(`frost-${colorway}-reduce-transparency`, section('Three frosted recipes'));

    await commands.media([{ name: 'prefers-contrast', value: 'more' }]);
    expect(style().shadow).toMatch(/inset 0px 0px 0px 1px$|^rgba?\([^)]*\) 0px 0px 0px 1px inset/);
  });
}
