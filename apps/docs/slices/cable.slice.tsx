import { expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { COLORWAYS, capture, mouse, openPage } from './harness';

const all = (root: ParentNode, css: string) => [...root.querySelectorAll(css)];
const centre = (el: Element): [number, number] => { const r = el.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; };


/** Samples the belly's handle (the path's control point y) every frame for `ms`, and the path at the end. */
async function sampleBelly(el: Element, ms: number) {
  const p = el.querySelector('[data-part="cable"] path')!, ys: number[] = [];
  const t0 = performance.now();
  await new Promise<void>((done) => { const f = () => { ys.push(Number(p.getAttribute('d')!.split(' ')[1].split(',')[1])); if (performance.now() - t0 < ms) requestAnimationFrame(f); else done(); }; f(); });
  return { ys, end: p.getAttribute('d')! };
}

// The Cable Part on Parts › Cable: a cord's droop follows its length, its belly swings after a moved
// end, and a loose plug on its cord can be patched into a jack by pointer or keyboard.
for (const colorway of COLORWAYS) {
  test(`a cord hangs by its length in ${colorway}`, async () => {
    await openPage('/components/cable', colorway);
    const droops = page.getByTestId('cable-droops').element();
    // One 280-unit cord: taut at 280 apart, hanging at 220, a U at 100.
    const sags = all(droops, '[data-part="cable"]').map((e) => Number(e.getAttribute('data-sag')));
    expect(sags[0]).toBe(0);
    expect(sags[1]).toBeGreaterThan(50);
    expect(sags[2]).toBeGreaterThan(sags[1]);
    await capture(`cable-${colorway}`, droops);
  });
}

test('the flat tier has no filters', async () => {
  await openPage('/components/cable', 'bone');
  const tiers = all(page.getByTestId('cable-tiers').element(), 'svg[role="img"]');
  expect(tiers.map((e) => e.getAttribute('data-tier'))).toEqual(['full', 'full', 'lite', 'flat']);
  expect(tiers[3].querySelectorAll('filter').length).toBe(0);
});

test('a moved end goes at once and the belly swings after it', async () => {
  await openPage('/components/cable', 'bone');
  const box = page.getByTestId('cable-swing').element();
  const before = box.querySelector('[data-part="cable"] path')!.getAttribute('d');
  // A name within the name, as Playwright matches: the switch is named by its label, which holds it.
  await userEvent.click(page.getByRole('switch', { name: /Pull apart/ }));
  // Sample the belly's handle every frame: it overshoots its goal and settles on it.
  const path = await sampleBelly(box, 1400);
  expect(path.end).not.toBe(before);
  expect(path.end.endsWith('340,170')).toBe(true);          // the end is where it was put
  const goal = path.ys[path.ys.length - 1];
  expect(Math.min(...path.ys)).toBeLessThan(goal - 0.5);      // the belly overshoots, rising past its goal
});

test('patching: pull the loose plug over the free jack and it seats', async () => {
  await openPage('/components/cable', 'graphite');
  const patch = page.getByTestId('cable-patch').element(), plug = page.getByTestId('cable-loose').element();
  expect(patch.getAttribute('data-seated') ?? '').toBe('');
  patch.scrollIntoView({ block: 'center' });
  const [jx, jy] = centre(patch.querySelectorAll('[data-part="jack"]')[1]), [px, py] = centre(plug);
  await mouse.drag([px, py], [jx, jy], { steps: 8 });
  await expect.poll(() => patch.getAttribute('data-seated')).toBe('true');
  expect(patch.getAttribute('data-at')).toBe('280,150');
  await expect.poll(() => all(patch, '[data-lit="link"]').length).toBe(2);
});

test('the cord is only so long, and the keyboard can patch too', async () => {
  await openPage('/components/cable', 'bone');
  const patch = page.getByTestId('cable-patch').element(), plug = page.getByTestId('cable-loose').element() as HTMLElement;
  plug.focus();
  for (let i = 0; i < 40; i++) await userEvent.keyboard('{ArrowRight}');   // pull far past the cord's length
  const [x, y] = patch.getAttribute('data-at')!.split(',').map(Number);
  expect(Math.hypot(x - 120, y - 150)).toBeLessThanOrEqual(280.5);
  await userEvent.keyboard('{Enter}');
  expect(patch.getAttribute('data-seated') ?? '').toBe('');                // dropped, not seated
});

test('with reduced motion the cord goes straight to its new shape', async () => {
  await openPage('/components/cable', 'bone', { media: { 'prefers-reduced-motion': 'reduce' } });
  const box = page.getByTestId('cable-swing').element();
  await userEvent.click(page.getByRole('switch', { name: /Pull apart/ }));
  const { ys } = await sampleBelly(box, 400);
  expect(new Set(ys).size).toBe(1);
});
