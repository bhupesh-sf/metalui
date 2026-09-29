import { afterEach, expect, test, vi } from 'vitest';
import { page } from 'vitest/browser';
import { COLORWAYS, capture, openPage } from './harness';

/** Resolves once the element is in view as an IntersectionObserver sees it (the page's own observers, made earlier, have heard by then). */
const inView = (el: Element) => new Promise<void>((done) => {
  const io = new IntersectionObserver(([e]) => { if (e?.isIntersecting) { io.disconnect(); done(); } });
  io.observe(el);
});
/** The page's intervals on a clock the slice runs: opened on it, so the display's clock is one of them. */
async function openOnClock(options: Parameters<typeof openPage>[2] = {}) {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'], shouldClearNativeTimers: true });
  await openPage('/components/dot-display', 'bone', options);
  const scene = page.getByTestId('dot-scene').element();
  scene.scrollIntoView({ block: 'center' });
  await inView(scene);
  return scene;
}
afterEach(() => { vi.useRealTimers(); });

// The Dot display Part on Parts › Dot display: square dots on one pitch in the px colours, a clock
// that steps six times a second, and a held frame under reduced motion.
for (const colorway of COLORWAYS) {
  test(`inks and scene in ${colorway}`, async () => {
    await openPage('/components/dot-display', colorway);
    const inks = page.getByTestId('dot-inks').element();
    await expect.poll(() => inks.querySelectorAll('figure').length).toBe(9);
    // Each block's lit dots take its own px colour; the rest are unlit.
    const rain = [...document.querySelectorAll('figure[data-colour="rain"] path')];
    const styles = rain.map((e) => e.getAttribute('style') ?? '');
    expect(styles.map((st) => st.match(/--mu-px-[\w-]+/)?.[0])).toEqual(['--mu-px-off', '--mu-px-rain']);
    const [off, lit] = rain.map((e) => getComputedStyle(e).fill);
    expect(off).not.toBe(lit);
    // Geometry comes from the recipe: 21 × 13 dots on an 8 pitch, masked to 6.
    const scene = page.getByTestId('dot-scene').element();
    const svg = scene.querySelector('svg')!, r = svg.getBoundingClientRect();
    expect([r.width, r.height, getComputedStyle(svg).maskSize]).toEqual([168, 104, '8px 8px, 8px 8px']);
    await capture(`dot-display-inks-${colorway}`, inks);
    await capture(`dot-display-scene-${colorway}`, scene);
  });
}

test('the clock steps six times a second', async () => {
  const scene = await openOnClock();
  const tick = () => Number(scene.getAttribute('data-tick'));
  const a = tick();
  vi.advanceTimersByTime(1000);
  await expect.poll(tick).toBeGreaterThan(a);
  const b = tick();
  expect(b - a).toBeGreaterThanOrEqual(5);
  expect(b - a).toBeLessThanOrEqual(7);
});

test('reduced motion holds the frame', async () => {
  const scene = await openOnClock({ media: { 'prefers-reduced-motion': 'reduce' } });
  const a = scene.getAttribute('data-tick');
  vi.advanceTimersByTime(700);
  await new Promise((r) => requestAnimationFrame(r));
  expect(scene.getAttribute('data-tick')).toBe(a);
  // The picture is still there: a held frame, not a blank one.
  expect(scene.querySelectorAll('path[data-ink="3"]')).toHaveLength(1);
});
