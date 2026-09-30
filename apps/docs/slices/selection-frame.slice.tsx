import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import tokens from '../../../tokens/tokens.json';
import { COLORWAYS, capture, mouse, openPage, until, userEvent } from './harness';

const P = tokens.presence;
const section = (text: string) => [...document.querySelectorAll('section')].find((s) => s.textContent!.includes(text))!;
const settled = (el: Element) => Promise.all(el.getAnimations().map((a) => a.finished));
const count = (root: Element, css: string) => root.querySelectorAll(css).length;
/** A colour as the browser computes it (the token's #3FB97A reads rgb(63, 185, 122)). */
function computed(color: string) {
  const probe = document.createElement('i');
  probe.style.color = color;
  document.body.append(probe);
  const c = getComputedStyle(probe).color;
  probe.remove();
  return c;
}

// Selection frame: hover shows the corner dots, a click selects (ring + handles + readout
// at the measured size), a second click writes and the ring tracks every keystroke, ⎋ finishes quietly.
for (const colorway of COLORWAYS) {
  test(`select, write and finish a block in ${colorway}`, async () => {
    await openPage('/components/selection-frame', colorway);
    await mouse.move(0, 0);
    const blockL = page.getByTestId('text-block');
    const block = blockL.element();
    const frame = () => block.querySelector('.mu-selection-frame')!;

    await userEvent.hover(blockL);
    await expect.poll(() => frame()?.getAttribute('data-state')).toBe('hover');
    expect(count(frame(), '.mu-sf-dot')).toBe(4);

    await userEvent.click(blockL);
    await expect.poll(() => frame().getAttribute('data-state')).toBe('selected');
    await expect.element(blockL).toHaveAttribute('aria-selected', 'true');
    await expect.poll(() => count(frame(), '.mu-sf-handle')).toBe(8);
    expect(count(frame(), '.mu-sf-handle[data-grip]')).toBe(2);
    const ring = frame().querySelector('.mu-sf-ring')!;
    expect(getComputedStyle(ring).boxShadow).toContain(`${computed(colorway === 'bone' ? P.guide : P['guide-dark'])} 0px 0px 0px 1.25px`);
    // The entrance plays once (1.02 → 1 on part); then the ring sits at offset 6 around the block.
    expect(ring.getAnimations().length).toBeGreaterThan(0);
    await settled(ring);
    const b = block.getBoundingClientRect(), r = ring.getBoundingClientRect();
    expect(r.x).toBeCloseTo(b.x - 6, 0);
    expect(r.width).toBeCloseTo(b.width + 12, 0);
    const readout = () => block.querySelector('.mu-readout')!;
    const readoutText = () => readout().textContent!.replace(/\s+/g, ' ').trim();
    // W × H: the × is its own dimmed label, spaced by layout, so the text may have no spaces round it
    const size = () => new RegExp(`^${Math.round(block.getBoundingClientRect().width)}\\s*×\\s*${Math.round(block.getBoundingClientRect().height)}$`);
    await expect.poll(() => size().test(readoutText())).toBe(true);
    await capture(`selection-frame-${colorway}`, section('Playground'));

    // Write: the readout dims and re-measures in the same frame as each keystroke; drift 0.
    await userEvent.click(blockL);
    await expect.poll(() => frame().getAttribute('data-mode')).toBe('writing');
    await userEvent.keyboard('{End}');
    await userEvent.keyboard(' and a long walk by the canal after lunch');
    await expect.poll(() => size().test(readoutText())).toBe(true);
    const host = document.querySelector('[data-testid="text-block"]') as HTMLElement;
    const hostRing = host.querySelector('.mu-sf-ring') as HTMLElement;
    const a = host.getBoundingClientRect(), c = hostRing.getBoundingClientRect();
    expect(Math.abs(c.width - a.width - 12) + Math.abs(c.height - a.height - 12)).toBeLessThan(0.01);
    await settled(readout());
    expect(Number(getComputedStyle(readout()).opacity)).toBeCloseTo(P['readout-writing'], 2);
    await capture(`selection-frame-writing-${colorway}`, section('Playground'));

    // ⎋ finishes and selects quietly: the lite ring, no handles.
    await userEvent.keyboard('{Escape}');
    await expect.poll(() => frame().getAttribute('data-variant')).toBe('lite');
    await expect.poll(() => count(frame(), '.mu-sf-handle')).toBe(0);
    await capture(`selection-frame-states-${colorway}`, section('Every state as a still'));
  });
}

test('the ring appears without its entrance under reduced motion', async () => {
  await openPage('/components/selection-frame', 'bone', { media: { 'prefers-reduced-motion': 'reduce' } });
  const block = page.getByTestId('text-block');
  await userEvent.click(block);
  const ring = await until(() => block.element().querySelector('.mu-sf-ring'));
  // part resolves instant: the entrance has no duration, so the ring is at rest immediately.
  // instant: no duration, or one too short to see (so animationend still fires)
  expect(parseFloat(getComputedStyle(ring).animationDuration)).toBeLessThan(0.001);
  await settled(ring); // a frame, not a motion
  expect(getComputedStyle(ring).opacity).toBe('1');
});
