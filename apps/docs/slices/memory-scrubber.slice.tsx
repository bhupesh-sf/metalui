import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { COLORWAYS, capture, pointer, openPage, userEvent, mouse } from './harness';


const section = (text: string) => [...document.querySelectorAll('section')].find((s) => s.textContent!.includes(text))!;
const focus = (l: { element(): Element }) => (l.element() as HTMLElement).focus();

// Memory scrubber and past banner: drag or step back in time, the banner names the moment, NOW and ⎋ return.
for (const colorway of COLORWAYS) {
  test(`the whole scrubber box takes pointer input in ${colorway}`, async () => {
    await openPage('/components/memory-scrubber', colorway);
    const scrubber = () => page.elementLocator(document.querySelector('.mu-scrubber')!);
    const slider = () => scrubber().getByRole('slider', { name: 'Scrub through time' });
    const box = scrubber().element().getBoundingClientRect();
    for (const y of [7, 12, 25, 39]) {
      await mouse.move(box.x + 90, box.y + y);
      await mouse.down();
      await mouse.up();
      await expect.element(slider()).not.toHaveAttribute('aria-valuetext', 'Now');
      await openPage('/components/memory-scrubber', colorway);
      await expect.element(slider()).toHaveAttribute('aria-valuetext', 'Now');
    }
    await mouse.move(box.x + box.width - 4, box.y + 11);
    await mouse.down();
    await mouse.move(box.x + 200, box.y + 11, { steps: 4 });
    await mouse.up();
    await expect.element(slider()).not.toHaveAttribute('aria-valuetext', 'Now');
    await userEvent.click(scrubber().getByRole('button', { name: 'NOW' }));
    await expect.element(slider()).toHaveAttribute('aria-valuetext', 'Now');
    focus(slider());
    await userEvent.keyboard('{Shift>}{ArrowLeft}{/Shift}');
    await expect.element(slider()).not.toHaveAttribute('aria-valuetext', 'Now');
  });

  test(`step back in time and return in ${colorway}`, async () => {
    await openPage('/components/memory-scrubber', colorway);
    const knob = page.getByRole('slider', { name: 'Scrub through time' });
    await expect.element(knob).toHaveAttribute('aria-valuetext', 'Now');
    focus(knob);
    await userEvent.keyboard('{Shift>}{ArrowLeft}{/Shift}');
    await expect.element(knob).not.toHaveAttribute('aria-valuetext', 'Now');
    const now = page.getByRole('button', { name: 'NOW' });
    await expect.element(now).toBeVisible();
    await capture(`memory-scrubber-${colorway}`, section('Playground'));
    await userEvent.click(now);
    await expect.element(knob).toHaveAttribute('aria-valuetext', 'Now');
    await expect.poll(() => now.elements().length).toBe(0);
  });

  test(`the past banner names the moment and brings you back in ${colorway}`, async () => {
    await openPage('/components/past-banner', colorway);
    const banner = page.getByRole('status').filter({ hasText: 'Back to Now' });
    await expect.element(banner).toBeVisible();
    await expect.poll(() => banner.element().textContent).toMatch(/MEMORY/i);
    await capture(`past-banner-${colorway}`, section('With the scrubber'));
    await userEvent.click(banner.getByRole('button', { name: /Back to Now/ }));
    await expect.poll(() => banner.elements().length).toBe(0);
    const knob = page.getByRole('slider', { name: 'Scrub through time' });
    focus(knob);
    // An hour back from now is inside the snap to now; a day back is the past.
    await userEvent.keyboard('{Shift>}{ArrowLeft}{/Shift}');
    await expect.element(page.getByRole('status').filter({ hasText: 'Back to Now' })).toBeVisible();
    await userEvent.keyboard('{Escape}');
    await expect.poll(() => page.getByRole('status').filter({ hasText: 'Back to Now' }).elements().length).toBe(0);
  });
}
