import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import tokens from '../../../tokens/tokens.json';
import { COLORWAYS, capture, mouse, openPage, userEvent } from './harness';

const section = (text: string) => [...document.querySelectorAll('section')].find((s) => s.textContent!.includes(text))!;
const text = (el: Element) => el.textContent!.replace(/\s+/g, ' ').trim();
// the playground's tooltips, not the x-ray's specimen (a real tooltip held open in its card)
const TIP = '.mu-tooltip:not([class*="ed-tip"])';
const tips = () => [...document.querySelectorAll(TIP)];
const tip = () => document.querySelector(TIP);

/** Times, in the page, from the pointer arriving on `el` to a tooltip reading `says`. */
function timeTip(el: Element, says: string) {
  const out: { wait: number | null } = { wait: null };
  let arrived = 0;
  el.addEventListener('pointerenter', () => { arrived = performance.now(); }, { once: true });
  const seen = new MutationObserver(() => {
    const t = tip();
    if (arrived && t && text(t) === says) { out.wait = performance.now() - arrived; seen.disconnect(); }
  });
  seen.observe(document.body, { childList: true, subtree: true, characterData: true });
  return out;
}

// Tooltip: after 120 ms a control names itself and its key; within a group the next one shows at once;
// keyboard focus shows it too; it never takes the pointer.
for (const colorway of COLORWAYS) {
  test(`hover, glide and focus in ${colorway}`, async () => {
    await openPage('/components/tooltip', colorway);
    await mouse.move(0, 0);
    const play = page.elementLocator(section('Playground'));
    // It waits its delay before naming the control: timed in the page, from the pointer arriving to
    // the tip appearing, so a slow machine can only make the wait longer, never fail it.
    const select = play.getByRole('button', { name: 'Select', exact: true });
    const first = timeTip(select.element(), 'Select · V');
    expect(tips()).toHaveLength(0);
    await userEvent.hover(select);
    await expect.poll(() => first.wait).not.toBeNull();
    const delay = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--mu-tooltip-delay-ms')) || tokens.tooltip['delay-ms'];
    expect(first.wait!).toBeGreaterThanOrEqual(delay - 16);
    expect(text(tip()!)).toBe('Select · V');
    expect(tip()!.querySelector('.mu-tooltip-key')!.textContent).toBe(' · V');
    expect(getComputedStyle(tip()!).pointerEvents).toBe('none');
    // Within the group the next one shows at once: sooner than the delay, timed in the page.
    const region = play.getByRole('button', { name: 'Region', exact: true });
    const next = timeTip(region.element(), 'Region · R');
    await userEvent.hover(region);
    await expect.poll(() => next.wait).not.toBeNull();
    expect(next.wait!).toBeLessThan(delay);
    expect(text(tip()!)).toBe('Region · R');
    await capture(`tooltip-${colorway}`, section('Playground'));
    await mouse.move(0, 0);
    await expect.poll(() => tips().length).toBe(0);
    // Keyboard focus: the page is shared, so the last input may have been a click; a key first makes
    // this focus a keyboard one (:focus-visible), as on a fresh page.
    await userEvent.keyboard('{Shift}');
    (page.getByRole('button', { name: 'Close', exact: true }).element() as HTMLElement).focus();
    await expect.poll(() => tip() && text(tip()!)).toBe('Close · ⎋');
  });
}
