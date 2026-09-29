import { expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import tokens from '../../../tokens/tokens.json';
import { COLORWAYS, capture, mouse, openPage } from './harness';

const S = tokens.suggestion;
const settled = (el: Element) => Promise.all(el.getAnimations().map((a) => a.finished));
const section = (text: string) => [...document.querySelectorAll('section')].find((s) => s.textContent!.includes(text))!;

// Suggestion chip: faint at rest, full when its block is hovered, accept by keyboard applies it.
for (const colorway of COLORWAYS) {
  test(`ask, hover and accept in ${colorway}`, async () => {
    await openPage('/components/suggestion-chip', colorway);
    // The page is shared: the mouse may still be where the last slice left it, over the block.
    await mouse.move(0, 0);
    const block = page.getByTestId('sugg-block');
    const chip = block.getByRole('group', { name: /Suggestion: Task\? Confidence 0\.72/ });
    await settled(chip.element());
    expect(Number(getComputedStyle(chip.element()).opacity)).toBeCloseTo(S['rest-opacity'], 2);
    await userEvent.hover(block);
    await settled(chip.element());
    expect(Number(getComputedStyle(chip.element()).opacity)).toBe(1);
    await capture(`suggestion-chip-${colorway}`, section('Hover the block'));
    (chip.getByRole('button', { name: 'Accept' }).element() as HTMLElement).focus();
    await userEvent.keyboard('{Enter}');
    await expect.poll(() => chip.elements().length).toBe(0);
    await expect.element(block.getByRole('checkbox')).toBeVisible();
    await capture(`suggestion-chip-states-${colorway}`, section('rest (.62)'));
  });
}

for (const reduce of [false, true]) {
  test(`the chip arrives ${reduce ? 'in place under reduced motion' : 'from 3 above'}`, async () => {
    await openPage('/components/suggestion-chip', 'bone', reduce ? { media: { 'prefers-reduced-motion': 'reduce' } } : {});
    const chip = page.getByTestId('sugg-block').getByRole('group').element();
    // The arrival's first frame: settle travels 3 and scales .96; under Reduce Motion it only fades.
    for (const a of chip.getAnimations()) { a.pause(); a.currentTime = 0; }
    const t = getComputedStyle(chip).transform;
    const first = new DOMMatrix(t === 'none' ? undefined : t);
    if (reduce) { expect(first.f).toBeCloseTo(0, 3); expect(first.a).toBeCloseTo(1, 3); }
    else { expect(first.f).toBeCloseTo(-S['enter-rise'], 1); expect(first.a).toBeCloseTo(S['enter-scale'], 2); }
  });
}
