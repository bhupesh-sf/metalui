import { expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { COLORWAYS, capture, openPage } from './harness';

const section = (has: string) => [...document.querySelectorAll('section')].find((s) => s.textContent!.includes(has))!;

// Life set (import plan §3.1): the Color page draws one real life glyph per tint family,
// from @unlocalhosted/metalui/icons/life, stroke-tinted, and the tints switch off.
for (const colorway of COLORWAYS) {
  test(`life glyphs carry their tint in ${colorway}`, async () => {
    await openPage('/foundations/color', colorway);
    const happy = document.querySelector(`div[data-mu-colorway="${colorway}"] svg.mu-il-happy`)!;
    expect(happy.getAttribute('class')).toMatch(/mu-tint-ember/);
    const stroke = () => getComputedStyle(happy).color;
    expect(stroke()).toBe(colorway === 'bone' ? 'rgb(208, 86, 14)' : 'rgb(251, 121, 74)');
    // A tinted vessel is stroke only.
    expect(getComputedStyle(happy.querySelector('.v')!).fillOpacity).toBe('0');
    await capture(`life-tints-${colorway}`, section('kind of feeling'));
    await userEvent.click(page.getByRole('button', { name: 'Tints on' }));
    expect(stroke()).not.toBe(colorway === 'bone' ? 'rgb(208, 86, 14)' : 'rgb(251, 121, 74)');
  });
}
