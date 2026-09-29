import { afterEach, expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { COLORWAYS, capture, mouse, openPage } from './harness';

// The Drum Part on Parts › Drum: digits centred for whole values, between two for a half, and a strip
// that runs on from 9 into 0 without an end.
for (const colorway of COLORWAYS) {
  test(`drums in ${colorway}`, async () => {
    await openPage('/components/drum', colorway);
    const box = page.getByTestId('drum-looks').element();
    const drums = () => [...box.querySelectorAll('svg[role="img"]')];
    await expect.poll(() => drums().length).toBe(5);
    expect(drums().map((e) => e.getAttribute('aria-label'))).toEqual(['drum showing 0', 'drum showing 7', 'drum showing 0', 'drum showing 3', 'drum showing 4']);
    // The strip holds 8 and 9 above 0 and 0 and 1 below 9: fourteen rows, so the wrap never shows an end.
    expect(drums()[0].querySelectorAll('[data-part="drum.strip"] text')).toHaveLength(14);
    await capture(`drum-${colorway}`, box);
  });
}

// The pitch of a digit on the page's 200 px drum (150 units wide on the 400 canvas, 36 units a digit at 52 wide).
const PITCH = 36 * (150 / 52) * (200 / 400);
const turn = () => page.getByTestId('drum-turn').element() as HTMLElement;
const valueOf = () => Number(turn().getAttribute('data-value'));
afterEach(() => { vi.useRealTimers(); });

test('the arrow keys step it a digit, and past 9 it runs on into 0', async () => {
  await openPage('/components/drum', 'bone');
  turn().focus();
  await userEvent.keyboard('{ArrowUp}');
  await expect.poll(() => turn().getAttribute('aria-valuenow')).toBe('8');
  await expect.poll(valueOf).toBe(8);                       // it settles on the digit exactly
  await userEvent.keyboard('{ArrowUp}');
  await userEvent.keyboard('{ArrowUp}');
  await expect.poll(() => turn().getAttribute('aria-valuenow')).toBe('0');              // 9, then on into 0
  await expect.poll(valueOf).toBe(10);                      // forward: ten, not back to zero
});

test('dragged, it follows the hand; let go, it settles on a whole digit', async () => {
  await openPage('/components/drum', 'graphite');
  const drum = turn();
  drum.scrollIntoView({ block: 'center' });
  const r = drum.getBoundingClientRect(), x = r.x + r.width / 2, y = r.y + r.height / 2;
  // The value as the hand holds it, read in the page the moment it lets go (the drag is one call).
  let held = NaN;
  addEventListener('pointerup', () => { held = valueOf(); }, { capture: true, once: true });
  // two and a bit digits up, slowly; the hand stops, then lets go
  await mouse.drag([x, y], [x, y - PITCH * 2.3], { steps: 20, hold: 150 });
  expect(held).toBeGreaterThan(8.9);
  expect(held).toBeLessThan(9.6);
  await expect.poll(valueOf).toBe(9);                       // no flick: the nearest digit
  // A flick carries on past where the hand let go. A flick is a matter of time (a fast hand, let go
  // while still moving), so it runs on the page's controlled clock: the hand moves and lets go in the
  // same instant however busy the machine is, then the clock runs for the drum to settle.
  vi.useFakeTimers({ toFake: ['performance', 'requestAnimationFrame', 'cancelAnimationFrame', 'setTimeout', 'clearTimeout', 'Date'] });
  await mouse.drag([x, y], [x, y - PITCH], { steps: 2 });
  vi.advanceTimersByTime(2000);
  await expect.poll(() => Number.isInteger(valueOf())).toBe(true);
  expect(valueOf()).toBeGreaterThan(10);
});

test('with reduced motion a key puts it on the digit at once', async () => {
  await openPage('/components/drum', 'bone', { media: { 'prefers-reduced-motion': 'reduce' } });
  turn().focus();
  await userEvent.keyboard('{ArrowDown}');
  expect(valueOf()).toBe(6);
});
