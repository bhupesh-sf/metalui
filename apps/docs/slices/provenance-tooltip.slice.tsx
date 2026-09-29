import { expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import tokens from '../../../tokens/tokens.json';
import { COLORWAYS, capture, mouse, openPage, until } from './harness';

const section = (text: string) => [...document.querySelectorAll('section')].find((s) => s.textContent!.includes(text))!;
const provenance = (text: string) => [...document.querySelectorAll('.mu-provenance')].find((p) => p.textContent!.includes(text));

// Provenance: hover a cue for 380 ms and it says where it came from; the date's tooltip clears its value chip;
// keyboard focus shows it too, and Escape closes it.
for (const colorway of COLORWAYS) {
  test(`provenance on hover and focus in ${colorway}`, async () => {
    await openPage('/components/provenance-tooltip', colorway);
    await mouse.move(0, 0);
    const block = page.getByTestId('prov-block').element();
    const date = block.querySelector('.mu-cue[data-kind="date"]')!;
    // It waits its delay before speaking: timed in the page, from the pointer arriving to the tip
    // appearing, so a slow machine can only make the wait longer, never fail it.
    let arrived = 0, wait: number | null = null;
    date.addEventListener('pointerenter', () => { arrived = performance.now(); }, { once: true });
    const seen = new MutationObserver(() => {
      if (arrived && provenance('Date parser')) { wait = performance.now() - arrived; seen.disconnect(); }
    });
    seen.observe(document.body, { childList: true, subtree: true, characterData: true });
    expect(provenance('Date parser')).toBeUndefined();
    await userEvent.hover(page.elementLocator(date));
    await expect.poll(() => wait).not.toBeNull();
    expect(wait!).toBeGreaterThanOrEqual(tokens.provenance['delay-ms'] - 16);
    const tip = page.elementLocator(await until(() => provenance('Date parser')));
    await expect.element(tip).toBeVisible();
    await expect.element(page.elementLocator(date)).toHaveAttribute('aria-description', 'Rule, Date parser');
    const t = tip.element().getBoundingClientRect(), c = date.getBoundingClientRect();
    expect(c.y - (t.y + t.height)).toBeGreaterThan(30); // above the value chip
    await capture(`provenance-tooltip-${colorway}`, section('On a block'));
    await mouse.move(0, 0);
    await expect.poll(() => provenance('Date parser')).toBeUndefined();
    // Keyboard: focus the recognizer's measurement. The page is shared, so the last input may have been a
    // click; a key first makes this focus a keyboard one (:focus-visible), as on a fresh page.
    await userEvent.keyboard('{Shift}');
    (block.querySelector('.mu-cue[data-kind="measurement"]') as HTMLElement).focus();
    await expect.element(page.elementLocator(await until(() => provenance('0.82')))).toBeVisible();
    await userEvent.keyboard('{Escape}');
    await expect.poll(() => provenance('0.82')).toBeUndefined();
  });
}
