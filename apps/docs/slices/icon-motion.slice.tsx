import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { COLORWAYS, mouse, openPage, pointer, sleep, until, userEvent } from './harness';

// An icon with a motion study plays one act (docs/ICON-MOTION.md): hover the control and every
// part moves on one clock, the act finishes after the pointer leaves, and it ends exactly at rest.
// Select is the first icon on the engine.
const REST = 'none';
const transformOf = (part: Element) => getComputedStyle(part).transform;
const running = (part: Element) => part.getAnimations().filter((a) => a.playState === 'running').length;
const selectKey = () => document.querySelector('svg.mu-ic-select')!.closest('button')!;

for (const colorway of COLORWAYS) {
  test(`select plays its act through once from a hover in ${colorway}`, async () => {
    await openPage('/icons', colorway);
    const key = selectKey();
    const cursor = key.querySelector('[data-part="cursor"]')!;
    const click = key.querySelector('[data-part="click"]')!;
    expect(transformOf(cursor)).toBe(REST);

    // The accent's brightest moment in the act, sampled every frame in the page: when the act
    // starts after the hover varies with the machine, so no one instant is the right one to look.
    const peak = new Promise<number>((done) => {
      let max = 0;
      const start = performance.now();
      const frame = () => {
        max = Math.max(max, Number(getComputedStyle(click).opacity));
        if (performance.now() - start < 900) requestAnimationFrame(frame); else done(max);
      };
      requestAnimationFrame(frame);
    });
    await userEvent.hover(page.elementLocator(key));
    await sleep(320);
    expect(transformOf(cursor)).not.toBe(REST);

    // Leaving does not cut the act short.
    await mouse.move(0, 0);
    await sleep(100);
    expect(running(cursor)).toBe(1);
    expect(await peak).toBeGreaterThan(0.3);

    // It ends at rest, released, with the accent hidden.
    await expect.poll(() => running(cursor), { timeout: 2000 }).toBe(0);
    expect(transformOf(cursor)).toBe(REST);
    expect(getComputedStyle(click).opacity).toBe('0');
    expect(key.querySelector('svg.mu-ic-select')!.hasAttribute('data-playing')).toBe(false);
  });
}

test('a trigger during the act does not restart it', async () => {
  await openPage('/icons', 'bone');
  const key = selectKey();
  const cursor = key.querySelector('[data-part="cursor"]')!;
  // The act's clock just before the click lands and just after it, read in the page; the hover, the
  // 200 ms and the click are one WebDriver action, so the click lands during the act on any machine.
  const at = { before: NaN, after: NaN };
  const down = () => { at.before = Number(cursor.getAnimations()[0]?.currentTime); };
  const clicked = () => requestAnimationFrame(() => { at.after = Number(cursor.getAnimations()[0]?.currentTime); });
  addEventListener('pointerdown', down, { capture: true, once: true });
  addEventListener('click', clicked, { once: true });
  await pointer(key, [{ to: [0, 0] }, { pause: 200 }, { down: true }, { up: true }]);
  await until(() => !Number.isNaN(at.after) || cursor.getAnimations().length === 0 || null);
  expect(at.before).toBeGreaterThan(0);                              // it was playing when the click came
  expect(at.after).toBeGreaterThanOrEqual(at.before);
});

test('keyboard focus plays the act', async () => {
  await openPage('/icons', 'bone');
  const key = selectKey();
  const cursor = key.querySelector('[data-part="cursor"]')!;
  // Watched every frame from before the keys: the act is short, and the keys are round trips.
  let played = false;
  const watch = () => { played ||= running(cursor) === 1; if (!played) id = requestAnimationFrame(watch); };
  let id = requestAnimationFrame(watch);
  key.focus();
  await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
  await userEvent.keyboard('{Tab}');
  await expect.poll(() => played).toBe(true);
  cancelAnimationFrame(id);
});

test('the act stays still under reduced motion', async () => {
  await openPage('/icons', 'bone', { media: { 'prefers-reduced-motion': 'reduce' } });
  const key = selectKey();
  const cursor = key.querySelector('[data-part="cursor"]')!;
  await userEvent.hover(page.elementLocator(key));
  await sleep(300);
  expect(running(cursor)).toBe(0);
  expect(transformOf(cursor)).toBe(REST);
});

test('the standalone SVG plays the same act without script', async () => {
  // A page of its own, holding nothing but the file: a frame, so neither the site's stylesheet nor its
  // script reaches the icon.
  await openPage('/icons', 'bone');
  const svg = await (await fetch('/icons/svg-animated/select.svg')).text();
  const frame = document.createElement('iframe');
  Object.assign(frame.style, { position: 'fixed', left: '0', top: '0', width: '400px', height: '300px', border: '0', zIndex: '2147483647' });
  frame.sandbox.add('allow-same-origin');                            // no scripts in it
  frame.srcdoc = `<body style="margin:0"><div style="padding:40px">${svg}</div></body>`;
  document.body.append(frame);
  try {
    const icon = await until(() => frame.contentDocument?.querySelector('svg.mu-icon'));
    const cursor = icon.querySelector('[data-part="cursor"]')!;
    expect(transformOf(cursor)).toBe(REST);
    const r = icon.getBoundingClientRect(), f = frame.getBoundingClientRect();
    await mouse.move(f.x + r.x + r.width / 2, f.y + r.y + r.height / 2);
    await sleep(320);
    expect(transformOf(cursor)).not.toBe(REST);
  } finally {
    frame.remove();
    await mouse.move(0, 0);
  }
});
