import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import tokens from '../../../tokens/tokens.json';
import { COLORWAYS, capture, openPage, userEvent } from './harness';

// Lamp gestures (tokens status.gestures) on the LED, as Parts › LED shows them: each gesture runs
// for its token length, breathing loops, a replay starts it again, and reduced motion holds steady.
const G = tokens.status.gestures;
const cell = (kind: string, gesture: string) => document.querySelector(`[data-cell="${kind}-${gesture}"] [data-gesture]`)!;
const timing = (el: Element) => el.getAnimations().map((a) => {
  const t = (a.effect as KeyframeEffect).getTiming();
  return { duration: t.duration, iterations: t.iterations, name: (a as CSSAnimation).animationName };
});

test('each gesture plays for its token length', async () => {
  await openPage('/components/led', 'bone');
  expect(timing(cell('live', 'steady'))).toEqual([]);
  expect(timing(cell('live', 'flicker'))).toEqual([{ duration: G.flicker.ms, iterations: 1, name: 'mu-led-flicker' }]);
  expect(timing(cell('waiting', 'breathe'))).toEqual([{ duration: G.breathe.ms, iterations: Infinity, name: 'mu-led-breathe' }]);
  expect(timing(cell('failed', 'blink2'))).toEqual([{ duration: G.blink2.ms, iterations: 1, name: 'mu-led-blink2' }]);
  expect(timing(cell('live', 'rise'))).toEqual([{ duration: G.rise.ms, iterations: 1, name: 'mu-led-rise' }]);
  // A gesture dims the glow; it never fades the lamp.
  expect(getComputedStyle(cell('failed', 'blink2')).opacity).toBe('1');
});

test('Play runs a finished gesture again', async () => {
  await openPage('/components/led', 'graphite');
  // The flicker runs its length and finishes on its own.
  await expect.poll(() => cell('live', 'flicker').getAnimations()[0]?.playState, { timeout: 3000 }).toBe('finished');
  await userEvent.click(page.getByTestId('led-play'));
  expect(cell('live', 'flicker').getAnimations()[0]?.playState).toBe('running');
});

test('reduced motion holds every lamp steady and keeps its kind', async () => {
  await openPage('/components/led', 'bone', { media: { 'prefers-reduced-motion': 'reduce' } });
  // (Polled: a gesture mounted with the page may be pending a frame before it resolves.)
  for (const g of ['flicker', 'breathe', 'blink2', 'rise']) await expect.poll(() => timing(cell('failed', g)), { message: g }).toEqual([]);
  expect(cell('failed', 'blink2').getAttribute('data-kind')).toBe('failed');
});

for (const colorway of COLORWAYS) {
  test(`LED page in ${colorway}`, async () => {
    await openPage('/components/led', colorway, { media: { 'prefers-reduced-motion': 'reduce' } });
    await capture(`led-gestures-${colorway}`, page.getByTestId('led-gestures').element());
  });
}
