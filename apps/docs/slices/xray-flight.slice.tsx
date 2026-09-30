import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { COLORWAYS, capture, mouse, openPage, pointer, until, type Colorway, type OpenOptions, userEvent } from './harness';

// The x-ray flight: click an object on the floating table and it lifts off, flies onto its
// model in the x-ray card and tilts to the x-ray's angle on the way; close the card and it
// lifts out, turns flat and flies home. Either way it can be turned around mid-air.

/**
 * Opens a page with the floating table. The landing page ('/') has no h1 for openPage to wait on,
 * so it is reached as a reader reaches it from the site: open the overview, then follow the home link.
 */
async function openLanding(path: '/' | '/overview', colorway: Colorway, options?: OpenOptions) {
  await openPage('/overview', colorway, options);
  if (path === '/') {
    await userEvent.click(page.getByRole('link', { name: 'MetalUI, home' }));
    await until(() => !document.querySelector('main') && document.querySelector('[data-float="button"]'));
  }
  await until(() => document.querySelector('[data-float="button"]'));
  await document.fonts.ready;
}

const $ = (css: string) => document.querySelector<HTMLElement>(css)!;
/** A real click at an element's centre, wherever it is at that moment (Playwright's `force`). */
const click = (el: Element) => pointer(el, [{ to: [0, 0] }, { down: true }, { up: true }]);
const settled = () => until(() => !document.documentElement.dataset.flight && !document.querySelector('.xr-flyer'));
const flyers = () => document.querySelectorAll('.xr-flyer').length;
const dialog = (name?: string) => page.getByRole('dialog', name ? { name } : undefined);
const visibility = (id: string) => getComputedStyle($(`[data-float="${id}"]`)).visibility;
/** The flying copy's centre on screen and its current transform. */
const flyer = () => {
  const f = $('.xr-flyer');
  const r = f.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, transform: getComputedStyle(f).transform };
};
const centre = (css: string) => { const r = $(css).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; };
const gap = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
/**
 * Waits until `ms` of the flight have played, on the flight's own clock (its animation), where the
 * Playwright spec slept: however busy the machine, the flyer is then at the same point of its path.
 */
const played = (ms: number) => until(() => {
  const a = document.querySelector('.xr-flyer')?.getAnimations()[0];
  if (!a) return false;
  const t = Number(a.currentTime), full = Number(a.effect!.getTiming().duration);
  return a.playbackRate > 0 ? t >= ms : t <= full - ms * Math.abs(a.playbackRate);
});

for (const colorway of COLORWAYS) {
  for (const [path, id, part, title] of [
    ['/', 'button', 'button', 'Button, x-ray'],
    ['/overview', 'swatch', '> *', 'Swatch, x-ray'],
  ] as const) {
    test(`${title.split(',')[0].toLowerCase()} flies onto its x-ray model and back on ${path} in ${colorway}`, async () => {
      await openLanding(path, colorway);
      await click($(`[data-float="${id}"]`).querySelector(`:scope ${part}`)!);
      await expect.element(dialog(title)).toBeVisible();
      // in the air: a copy of the object travels while the object itself is away
      expect(flyers()).toBe(1);
      expect(visibility(id)).toBe('hidden');
      await settled();
      // landed: the model has taken over, face to face with where the copy came down
      await expect.poll(() => getComputedStyle($('.xr-overlay .xr-scene')).opacity).toBe('1');
      expect(visibility(id)).toBe('hidden');
      await capture(`xray-flight-${id}-${colorway}`, document.body);

      await userEvent.keyboard('{Escape}');
      expect(flyers()).toBe(1);
      await settled();
      await expect.poll(() => dialog(title).elements().length).toBe(0);
      expect(visibility(id)).toBe('visible');
    });
  }
}

test('an opening flight turns around mid-air and goes home', async () => {
  await openLanding('/', 'bone');
  const home = centre('[data-float="swatch"]');
  await click($('[data-float="swatch"] > *'));
  await played(500);
  const out = flyer();
  expect(gap(out, home)).toBeGreaterThan(40);
  // tilting toward the x-ray's angle on the way (a 3D matrix, not a flat one)
  expect(out.transform).toContain('matrix3d');

  await userEvent.keyboard('{Escape}');
  // it comes back toward home from where it was, instead of finishing the trip first
  await expect.poll(() => (flyers() ? gap(flyer(), home) : 0)).toBeLessThan(gap(out, home) - 20);
  expect(document.documentElement.dataset.flight ?? 'landed').not.toBe('open');
  await settled();
  await expect.poll(() => dialog().elements().length).toBe(0);
  expect(visibility('swatch')).toBe('visible');
});

test('a closing flight turns around when you click the object in the air', async () => {
  await openLanding('/', 'bone');
  await click($('[data-float="swatch"] > *'));
  await settled();
  await userEvent.keyboard('{Escape}');
  await played(250);
  // clicked where it is when the click is sent, not where it was a moment before
  // It flies faster than a WebDriver click travels: the flyer is measured, then the click lands where
  // it was a moment before. So the flight's clock stops for the click (its own animations, paused as
  // page.clock would pause time) and runs on after it: the click lands on the flyer, mid-air.
  const flight = document.getAnimations().filter((a) => a.constructor === Animation && ['xr-flyer', 'xr-overlay', 'xr-scene'].some((c) => ((a.effect as KeyframeEffect).target as Element)?.classList.contains(c)));
  flight.forEach((a) => a.pause());
  await click($('.xr-flyer'));
  flight.forEach((a) => a.play());
  await settled();
  await expect.element(dialog('Swatch, x-ray')).toBeVisible();
  expect(visibility('swatch')).toBe('hidden');
});

test('with reduced motion the x-ray opens and closes in place', async () => {
  await openLanding('/', 'bone', { media: { 'prefers-reduced-motion': 'reduce' } });
  await click($('[data-float="button"] button'));
  await expect.element(dialog('Button, x-ray')).toBeVisible();
  expect(flyers()).toBe(0);
  await userEvent.keyboard('{Escape}');
  await expect.poll(() => dialog('Button, x-ray').elements().length).toBe(0);
  expect(visibility('button')).toBe('visible');
});
