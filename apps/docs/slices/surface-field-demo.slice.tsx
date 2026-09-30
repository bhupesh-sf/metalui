import { expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { COLORWAYS, mouse, openPage, sleep, until } from './harness';

// The surface field on Components › Selection frame: it follows a carried MetalUI object, and rests
// under reduced motion on a narrow screen.
for (const colorway of COLORWAYS) {
  test(`surface field follows a carried MetalUI object in ${colorway}`, async () => {
    const errors: string[] = [];
    const onError = (e: ErrorEvent) => errors.push(e.message);
    addEventListener('error', onError);
    try {
      await openPage('/components/selection-frame', colorway);
      const field = page.getByTestId('surface-field-demo');
      const note = page.getByTestId('surface-field-moving-note');
      field.element().scrollIntoView({ block: 'center' });
      await expect.poll(() => field.element().querySelector('canvas')).toBeTruthy();
      await expect.element(page.elementLocator(field.element().querySelector('canvas')!)).toBeVisible();
      const frame = () => page.elementLocator(note.element().querySelector('.mu-selection-frame')!);

      const before = note.element().getBoundingClientRect();
      expect(before).not.toBeNull();
      // The note captures the pointer, so the drag is one gesture: read while it is held, then let go.
      const gesture = mouse.drag([before.x + 40, before.y + 30], [before.x + 90, before.y + 20], { steps: 5, hold: 1500 });
      await until(() => note.element().querySelector('.mu-selection-frame')!.getAttribute('data-state') === 'selected');
      await expect.element(frame()).toHaveAttribute('data-state', 'selected');
      await gesture;
      await expect.element(frame()).toHaveAttribute('data-state', 'rest');
      const afterDrag = note.element().getBoundingClientRect();
      expect(afterDrag.x).toBeGreaterThan(before.x + 30);

      (note.element() as HTMLElement).focus();
      await userEvent.keyboard('{ArrowLeft}');
      // The key moves it (on its own spring): it ends left of where the drag put it.
      await expect.poll(() => note.element().getBoundingClientRect().x).toBeLessThan(afterDrag.x);
      expect(errors).toEqual([]);
    } finally {
      removeEventListener('error', onError);
    }
  });
}

test('surface field rests under reduced motion on a narrow screen', async () => {
  await openPage('/components/selection-frame', 'graphite', { viewport: [390, 844], media: { 'prefers-reduced-motion': 'reduce' } });
  const field = page.getByTestId('surface-field-demo').element();
  field.scrollIntoView({ block: 'center' });
  const canvas = () => field.querySelector('canvas');
  await expect.poll(canvas).toBeTruthy();
  await expect.element(page.elementLocator(canvas()!)).toBeVisible();
  // At rest means still: two looks a quarter second apart are the same picture.
  await sleep(300);
  const first = (await until(canvas)).toDataURL();
  await sleep(250);
  expect((await until(canvas)).toDataURL()).toBe(first);
  expect(field.scrollWidth).toBeLessThanOrEqual(field.clientWidth);
  window.scrollTo(0, document.body.scrollHeight);
  await expect.poll(() => field.querySelectorAll('canvas').length).toBe(0);
  field.scrollIntoView({ block: 'center' });
  await expect.poll(canvas).toBeTruthy();
  await expect.element(page.elementLocator(canvas()!)).toBeVisible();
});
