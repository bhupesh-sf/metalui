import { expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { COLORWAYS, capture, openPage, until } from './harness';

/** The first section whose text holds `has`: Playwright's locator('section', { hasText }). */
const section = (has: string) => [...document.querySelectorAll('section')].find((s) => s.textContent!.includes(has))!;

// Cue family: every in-flow cue is metric-neutral, the resolved value shows on hover, the dimple is a
// real checkbox whose tick draws on (and appears at once under reduced motion).
for (const colorway of COLORWAYS) {
  test(`cues on a block in ${colorway}`, async () => {
    await openPage('/components/cue', colorway);
    const proof = page.getByTestId('metric-proof').element();
    const widths = [...proof.querySelectorAll('[data-testid^="line-"]')].map((l) => l.getBoundingClientRect().width);
    expect(Math.abs(widths[0] - widths[1])).toBeLessThan(0.005);
    // Each cue's words sit exactly where the plain words do (the text, not the pill's box).
    const [cued, plain] = [...proof.querySelectorAll('[data-testid^="line-"]')] as HTMLElement[];
    const textBox = (n: HTMLElement) => { const r = document.createRange(); r.selectNodeContents(n); const b = r.getBoundingClientRect(); return [b.left, b.right]; };
    const a = [...cued.children] as HTMLElement[], b = [...plain.children] as HTMLElement[];
    const perCue = a.flatMap((c, i) => { const [x1, y1] = textBox(c), [x2, y2] = textBox(b[i]); return [Math.abs(x1 - x2), Math.abs(y1 - y2)]; });
    for (const d of perCue) expect(d).toBeLessThan(0.005);

    const block = page.getByTestId('cue-block');
    const date = block.element().querySelector('.mu-cue[data-kind="date"]')!;
    await userEvent.hover(page.elementLocator(date));
    expect(getComputedStyle(date, '::after').content).toBe('"TUE 30 SEP · 16:00"');

    const dimple = block.getByRole('checkbox', { name: 'Send the poster' });
    await expect.element(dimple).toHaveAttribute('aria-checked', 'false');
    (dimple.element() as HTMLElement).focus();
    await userEvent.keyboard('[Space]');
    await expect.element(dimple).toHaveAttribute('aria-checked', 'true');
    const tick = await until(() => dimple.element().querySelector('.mu-dimple-tick'));
    await expect.element(page.elementLocator(tick)).toBeVisible();
    await Promise.all(tick.getAnimations().map((x) => x.finished));
    await capture(`cue-${colorway}`, section('On a block'));
    await capture(`cue-dimple-${colorway}`, section('Base UI Checkbox: rest'));
  });
}

test('the tick appears at once under reduced motion', async () => {
  await openPage('/components/cue', 'bone', { media: { 'prefers-reduced-motion': 'reduce' } });
  const dimple = page.getByRole('checkbox', { name: 'Send the poster' });
  await userEvent.click(dimple);
  const tick = await until(() => dimple.element().querySelector('.mu-dimple-tick'));
  expect(getComputedStyle(tick).animationName).toBe('none');
});
