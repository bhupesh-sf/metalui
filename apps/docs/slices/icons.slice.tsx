import { expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { COLORWAYS, capture, mouse, openPage, sleep, until } from './harness';

// Every product glyph is on the Icons page and plays its act (docs/ICON-MOTION.md) from its key,
// and none moves under reduced motion.
const first = () => document.querySelector('section')!;
const keys = () => [...first().querySelectorAll('button.mu-icon-trigger')].filter((b) => b.querySelector('svg.mu-icon'));

for (const colorway of COLORWAYS) {
  test(`every glyph plays its act from its key in ${colorway}`, async () => {
    await openPage('/icons', colorway);
    const all = keys();
    expect(all.length).toBeGreaterThanOrEqual(47);
    for (const key of all) {
      const svg = key.querySelector('svg.mu-icon')!;
      await userEvent.hover(page.elementLocator(key));
      await expect.poll(() => svg.getAttribute('data-playing'), { message: `${svg.getAttribute('class')} did not play` }).toBe('');
      await mouse.move(0, 0);
    }
    await until(() => !first().querySelector('[data-playing]')); // every act back at rest
    await capture(`icons-${colorway}`, first());
  }, 120_000); // some fifty keys, each hovered in turn
}

test('no glyph moves under reduced motion', async () => {
  await openPage('/icons', 'bone', { media: { 'prefers-reduced-motion': 'reduce' } });
  const all = keys();
  for (let i = 0; i < 6; i++) {
    const key = all[i];
    await userEvent.hover(page.elementLocator(key));
    await sleep(150);
    expect(key.querySelector('svg.mu-icon')!.getAttribute('data-playing')).not.toBe('');
    expect([...key.querySelectorAll('[data-part]')].flatMap((el) => el.getAnimations()).length).toBe(0);
  }
});
