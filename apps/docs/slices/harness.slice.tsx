import { expect, test } from 'vitest';
import { mouse, openPage, until } from './harness';

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

test('a drag keeps its pointer capture to the drop, and the page can be read while it holds', async () => {
  await openPage('/components/button', 'bone');
  const pad = document.createElement('div');
  pad.style.cssText = 'position:fixed;left:100px;top:100px;width:200px;height:200px;z-index:99999;background:#8884';
  document.body.append(pad);
  const got: string[] = [];
  pad.addEventListener('pointerdown', (e) => { pad.setPointerCapture(e.pointerId); got.push('down'); });
  pad.addEventListener('pointermove', (e) => { if (e.buttons) pad.dataset.at = `${e.clientX},${e.clientY}`; });
  pad.addEventListener('pointerup', (e) => got.push(`up ${e.clientX},${e.clientY}`));
  const done = mouse.drag([150, 150], [700, 600], { steps: 4, hold: 400 });
  await until(() => pad.dataset.at === '700,600'); // mid-drag, held outside the pad: captured moves still arrive
  expect(got).toEqual(['down']);
  await done;
  pad.remove();
  expect(got).toEqual(['down', 'up 700,600']);
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

test('a page opens in the colorway it asks for from its first frame, with an empty store', async () => {
  await openPage('/components/button', 'graphite');
  localStorage.setItem('metalui:motion', 'off');
  localStorage.setItem('left-over', '1');
  const seen: string[] = [];
  const watch = new MutationObserver(() => seen.push(document.documentElement.dataset.muColorway ?? ''));
  watch.observe(document.documentElement, { attributes: true, attributeFilter: ['data-mu-colorway'] });
  await openPage('/components/button', 'bone');
  watch.disconnect();
  expect(seen.every((c) => c === 'bone')).toBe(true); // never the last page's graphite, not even for a frame
  expect(document.documentElement.dataset.muColorway).toBe('bone');
  expect(localStorage.getItem('left-over')).toBeNull();
  expect(document.documentElement.classList.contains('rm')).toBe(false); // the motion switch is back on
});

test('a page has come to rest when it opens: nothing scrolls it afterwards', async () => {
  const scrollTo = window.scrollTo;
  let calls = 0;
  window.scrollTo = ((...args: Parameters<typeof scrollTo>) => { calls++; return scrollTo.apply(window, args); }) as typeof scrollTo;
  try {
    for (let i = 0; i < 5; i++) {
      await openPage('/overview', 'graphite', { viewport: [375, 812] });
      const atOpen = calls;
      for (let frame = 0; frame < 30; frame++) await new Promise((r) => requestAnimationFrame(r));
      expect(calls).toBe(atOpen); // the router's scroll-to-top is done, not still to come after the slice has scrolled
    }
  } finally {
    window.scrollTo = scrollTo;
  }
});
