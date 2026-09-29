import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { COLORWAYS, capture, openPage, until } from './harness';

const all = (root: ParentNode, css: string) => [...root.querySelectorAll(css)];
const svgs = (id: string) => all(page.getByTestId(id).element(), 'svg[role="img"]');

// The Beeper Part on Parts › Beeper: four earcons that the disc answers note by note, slots and
// plates, detail by size, and no lift with reduced motion.
for (const colorway of COLORWAYS) {
  test(`beepers in ${colorway}`, async () => {
    await openPage('/components/beeper', colorway);
    await expect.poll(() => svgs('beeper-looks').length).toBe(4);
    const looks = svgs('beeper-looks');
    expect(looks.map((e) => e.querySelector('[data-slots]')!.getAttribute('data-slots'))).toEqual(['3', '5', '7', '5']);
    expect(looks.map((e) => e.getAttribute('data-material'))).toEqual(['metal', 'metal', 'metal', 'clay']);
    await capture(`beeper-${colorway}`, page.getByTestId('beeper-looks').element());
  });
}

test('the flat tier has no filters', async () => {
  await openPage('/components/beeper', 'bone');
  const tiers = svgs('beeper-tiers');
  expect(tiers.map((e) => e.getAttribute('data-tier'))).toEqual(['full', 'full', 'lite', 'flat']);
  expect(tiers[3].querySelectorAll('filter').length).toBe(0);
});

/**
 * Presses an earcon's button and samples the disc's light and the plate's height every 5 ms of the act.
 * The act is the page's own animations, so it is sampled on their clock: held still and stepped 5 ms at
 * a time, the way a clock the slice controls runs timers. Sampling the wall clock missed short notes
 * whenever the machine was busy.
 */
async function playAndSample(earcon: string) {
  const el = page.getByTestId(`beeper-${earcon}`).element();
  el.scrollIntoView({ block: 'center' });
  const flex = el.querySelector('[data-part="beeper.flex"]')!, part = el.querySelector('[data-part="beeper"]')!;
  const rest = part.getBoundingClientRect().y, out: { t: number; light: number; lift: number }[] = [];
  (el.querySelector('button') as HTMLButtonElement).click();
  await until(() => flex.getAnimations().length > 0);
  const acts = [...flex.getAnimations(), ...part.getAnimations()];
  acts.forEach((a) => a.pause());
  for (let t = 0; t <= 600; t += 5) {
    acts.forEach((a) => { a.currentTime = t; });
    out.push({ t, light: Number(getComputedStyle(flex).opacity), lift: rest - part.getBoundingClientRect().y });
  }
  acts.forEach((a) => a.finish());
  return out;
}

test('done: the disc catches the light twice, with its two notes, and settles', async () => {
  await openPage('/components/beeper', 'graphite');
  const s = await playAndSample('done');
  // Its shape, whenever the animation starts: lit, a dip between the notes, lit again, then dark.
  const phases = s.map((x) => (x.light > 0.9 ? 'L' : x.light < 0.8 ? 'd' : '')).filter(Boolean).join('').replace(/(.)\1+/g, '$1');
  expect(phases).toBe('dLdLd');
  expect(Math.max(...s.map((x) => x.lift))).toBeGreaterThan(0.5);
  expect(s[s.length - 1].light).toBe(0);                     // at rest again
  expect(Math.abs(s[s.length - 1].lift)).toBeLessThan(0.05);
  await expect.element(page.getByTestId('beeper-done')).toHaveAttribute('data-plays', '1');
});

test('with reduced motion the disc still catches the light, but the plate stays put', async () => {
  await openPage('/components/beeper', 'bone', { media: { 'prefers-reduced-motion': 'reduce' } });
  const s = await playAndSample('ready');
  expect(Math.max(...s.map((x) => x.light))).toBeGreaterThan(0.9);
  expect(Math.max(...s.map((x) => Math.abs(x.lift)))).toBeLessThan(0.05);
});
