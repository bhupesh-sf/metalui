import { expect, test } from 'vitest';
import { mouse, openPage } from './harness';

// The harness itself, as a slice: what the other slices stand on has to be true.

test('the mouse lands where it says, stepped moves included', async () => {
  await openPage('/components/button', 'bone');
  const seen: [number, number][] = [];
  const log = (e: PointerEvent) => seen.push([e.clientX, e.clientY]);
  addEventListener('pointermove', log);
  await mouse.move(200, 150);
  await mouse.move(600, 400, { steps: 4 });
  await mouse.move(1000, 700);
  removeEventListener('pointermove', log);
  expect(seen).toContainEqual([200, 150]);
  expect(seen).toContainEqual([600, 400]);
  expect(seen.at(-1)).toEqual([1000, 700]);
  expect(seen.length).toBeGreaterThanOrEqual(6);
});

test('a page opens with the media it asks for, and the next one without', async () => {
  await openPage('/components/button', 'bone', { media: { 'prefers-reduced-motion': 'reduce' } });
  expect(matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
  await openPage('/components/button', 'bone');
  expect(matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(false);
});

test('a page opens at the window it asks for, and the next one at the desktop', async () => {
  await openPage('/components/button', 'bone', { viewport: [375, 812] });
  expect(document.documentElement.clientWidth).toBeLessThanOrEqual(375);
  await openPage('/components/button', 'bone');
  expect(document.documentElement.clientWidth).toBeGreaterThan(1200);
});
