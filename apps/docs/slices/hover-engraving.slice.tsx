import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import tokens from '../../../tokens/tokens.json';
import { COLORWAYS, capture, openPage, pointer, sleep, until, userEvent } from './harness';

const DWELL = Number(tokens.engraving['dwell-ms']);
const opacity = (el: Element) => Number(getComputedStyle(el).opacity);
const section = (has: string) => [...document.querySelectorAll('section')].find((s) => s.textContent!.includes(has))!;

/**
 * Watches the engraving every frame from the pointer arriving on the block: when it arrived, when it
 * left, and the first frame the engraving showed at all. Timed in the page, so a busy machine can only
 * lengthen a wait, never fail a correct one.
 */
function watch(block: Element, eng: Element) {
  const w = { arrived: 0, left: 0, shown: 0, stop: () => {} };
  const enter = () => { if (!w.arrived) w.arrived = performance.now(); };
  const leave = () => { if (w.arrived && !w.left) w.left = performance.now(); };
  block.addEventListener('pointerenter', enter);
  block.addEventListener('pointerleave', leave);
  let id = 0;
  const f = () => { if (w.arrived && !w.shown && opacity(eng) > 0) w.shown = performance.now(); id = requestAnimationFrame(f); };
  f();
  w.stop = () => { cancelAnimationFrame(id); block.removeEventListener('pointerenter', enter); block.removeEventListener('pointerleave', leave); };
  return w;
}

// Hover engraving: a pass shows nothing, a 420 ms dwell shows it beside the first line, selection hides it.
for (const colorway of COLORWAYS) {
  test(`dwell, not a pass, in ${colorway}`, async () => {
    await openPage('/components/hover-engraving', colorway);
    const list = page.getByTestId('eng-list').element();
    const block = list.querySelector('[data-block="0"]')!;
    const eng = block.querySelector('.mu-engraving')!;
    // A pass: hover for 200 ms, leave; it never showed. One WebDriver action, so the pass lasts 200 ms
    // and not 200 plus a round trip or two. A busy machine can stretch that hover past the dwell, and
    // then it was a dwell, not a pass: the pass is measured in the page and tried again until it was one.
    const r = block.getBoundingClientRect();
    const away: [number, number] = [5 - (r.x + r.width / 2), 5 - (r.y + r.height / 2)];
    let pass: ReturnType<typeof watch>;
    for (let tries = 0; ; tries++) {
      pass = watch(block, eng);
      await pointer(block, [{ to: [0, 0] }, { pause: 200 }, { to: away }]);
      await sleep(500);
      pass.stop();
      if (pass.left - pass.arrived < DWELL) break;
      if (tries >= 9) throw new Error('the machine is too busy to make a pass shorter than the dwell');
      await until(() => opacity(eng) === 0);
    }
    expect(pass.shown).toBe(0);
    expect(opacity(eng)).toBe(0);
    // A dwell: it shows after 420 ms (from the pointer arriving to the first frame it shows).
    const dwell = watch(block, eng);
    await userEvent.hover(page.elementLocator(block));
    await expect.poll(() => opacity(eng), { timeout: 10_000 }).toBeGreaterThan(0.99);
    dwell.stop();
    expect(dwell.shown - dwell.arrived).toBeGreaterThanOrEqual(DWELL - 16);
    // Beside the first line: it never covers the block below.
    const e = eng.getBoundingClientRect(), next = list.querySelector('[data-block="1"] .type-content')!.getBoundingClientRect();
    expect(e.x).toBeGreaterThan(block.querySelector('.type-content')!.getBoundingClientRect().x + 10);
    expect(e.y + e.height <= next.y || e.x > next.x + next.width).toBeTruthy();
    await capture(`hover-engraving-${colorway}`, section('A stacked list'));
    // The block is described by its engraving.
    expect(block.getAttribute('aria-describedby')).toBe('eng-0');
    expect(document.querySelector('#eng-0')!.getAttribute('role')).toBe('note');
  });
}
