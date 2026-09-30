import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { COLORWAYS, capture, openPage, until } from './harness';

// The five catalog rigs on Gadgets › Rigs, each wired by patch cables through a kind of map: driven from
// the page, values arrive at the far gadgets and set what they show. Reduced motion delivers at once.
const inRig = (rig: string, inst: string) => document.querySelector(`[data-testid="${rig}"] svg[data-inst="${inst}"]`)!;
const stateOf = (rig: string, inst: string) => inRig(rig, inst).getAttribute('data-state');
const text = (el: Element | null) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
const log = (id: string) => () => text(document.querySelector(`[data-testid="${id}"]`));
const descOf = (rig: string, inst: string) => () => text(inRig(rig, inst).querySelector('desc'));
const stateIs = (rig: string, inst: string) => () => stateOf(rig, inst);
/** A Base UI switch by its aria-label: the locator engine's role query does not name these (harness candidate). */
const toggle = (name: string) => page.elementLocator(document.querySelector(`[role="switch"][aria-label="${name}"]`)!);
const realTimeout = setTimeout;
/** Lets React commit what the frames set (it schedules on a message, not a timer). */
const settle = () => new Promise((r) => realTimeout(r, 0));
/**
 * The page's clock, run by the slice: it carries on from the real one (a drive already under way keeps
 * its time) and moves only when the slice advances it. It starts once the page has settled on its
 * colorway: the shared page keeps the last slice's colorway on <html> until the site's effect sets this
 * one, and a gadget that sees the change redraws with a new player or drive (harness candidate: set the
 * colorway before the first render, as a fresh page load does).
 */
async function clock() {
  const colorway = localStorage.getItem('metalui:colorway');
  await until(() => document.documentElement.dataset.muColorway === colorway
    && [...document.querySelectorAll('svg[data-gadget][data-host]')].every((e) => e.getAttribute('data-host') === colorway));
  // Two real frames: whatever the page started on a real frame (a mount's first step) has taken it,
  // so nothing is left waiting on the real clock with a real start time.
  for (let i = 0; i < 2; i++) await new Promise((r) => requestAnimationFrame(r));
  const now = performance.now();
  vi.useFakeTimers({ toFake: ['performance', 'requestAnimationFrame', 'cancelAnimationFrame', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] });
  vi.advanceTimersByTime(now);
}
afterEach(() => { vi.useRealTimers(); });

for (const colorway of COLORWAYS) {
  test(`the rigs in ${colorway}`, async () => {
    await openPage('/gadgets/rigs', colorway);
    const shapes: [string, number, number][] = [['sync-rig', 3, 2], ['storage-rig', 3, 2], ['capture-rig', 3, 2], ['canvas-rig', 3, 2], ['settings-rig', 3, 1]];
    for (const [id, gadgets, cords] of shapes) {
      const rig = document.querySelector(`[data-testid="${id}"]`)!;
      expect(rig.querySelectorAll('svg[data-gadget]'), id).toHaveLength(gadgets);
      expect(rig.querySelectorAll('[data-layer="cables"] > [data-cable]'), id).toHaveLength(cords);
      await capture(`rig-${id.replace('-rig', '')}-${colorway}`, rig);
    }
  });
}

describe('with values delivered at once', () => {
  beforeEach(async () => { await openPage('/gadgets/rigs', 'bone', { media: { 'prefers-reduced-motion': 'reduce' } }); });

  test('sync health: a failed sync drops the needle; a finished one raises it and counts one off pending', async () => {
    await userEvent.click(page.getByRole('radio', { name: 'failed' }));
    await expect.poll(log('sync-rig-log')).toBe('sync.healthy → health.value: 10');
    await expect.poll(stateIs('sync-rig', 'sync')).toBe('failed');
    await userEvent.click(page.getByRole('radio', { name: 'done' }));
    await expect.poll(log('sync-rig-log')).toBe('sync.done → pending.count: 11');
    await expect.poll(descOf('sync-rig', 'health')).toBe('Health: 90%');
  });

  test('storage: the drawer filling moves the gauge, and past its line the bin is armed', async () => {
    for (let i = 0; i < 6; i++) await userEvent.click(page.getByRole('button', { name: 'File a card' }).first());
    await expect.poll(descOf('storage-rig', 'used')).toBe('Used: 100%');
    expect(stateOf('storage-rig', 'trash')).toBe('armed');
    expect(stateOf('storage-rig', 'local')).toBe('full');
    await userEvent.click(page.getByRole('button', { name: 'Clear it out' }).first());
    await expect.poll(stateIs('storage-rig', 'trash')).toBe('rest');
  });

  test('capture: a picture taken counts one more and lights another cell', async () => {
    await userEvent.click(page.getByRole('button', { name: 'Take', exact: true }));
    await expect.poll(log('capture-rig-log')).toBe('today.count → memory.fill: 0.65');
    await expect.poll(stateIs('capture-rig', 'take')).toBe('taken');
    await expect.poll(() => inRig('capture-rig', 'memory').querySelector('[data-part="cell"]')!.getAttribute('data-lit')).toBe('10.4');
    await userEvent.click(toggle('First run'));
    await expect.poll(stateIs('capture-rig', 'memory')).toBe('first-run');
  });

  test('canvas status: a find is counted onto the blocks; looking back stops the search', async () => {
    await userEvent.click(page.getByRole('button', { name: 'Find', exact: true }));
    await expect.poll(log('canvas-rig-log')).toBe('find.found → blocks.count: 3');
    await expect.poll(descOf('canvas-rig', 'blocks')).toBe('Streak: 3 days');
    await userEvent.click(page.getByRole('button', { name: 'Look back' }));
    await expect.poll(log('canvas-rig-log')).toBe('when.in-past → find.query: false');
    await expect.poll(stateIs('canvas-rig', 'find')).toBe('rest');
    await expect.poll(stateIs('canvas-rig', 'when')).toBe('past');
  });

  test('settings: the rocker selects the faders’ mix', async () => {
    await userEvent.click(toggle('Sound setting'));
    await expect.poll(log('settings-rig-log')).toBe('sound.on → prefs.mix: 0.8');
    await expect.poll(stateIs('settings-rig', 'sound')).toBe('on');
    await userEvent.click(toggle('Sound setting'));
    await expect.poll(log('settings-rig-log')).toBe('sound.on → prefs.mix: 0.2');
  });
});

test('a value travels its cord as a bead and the far gadget answers on arrival', async () => {
  await openPage('/gadgets/rigs', 'bone');
  const rig = document.querySelector('[data-testid="settings-rig"]')!;
  rig.scrollIntoView({ block: 'center' });
  const beads = () => rig.querySelectorAll('[data-bead]').length;
  // The bead travels on a clock the slice controls, read every frame.
  await clock();
  await userEvent.click(toggle('Sound setting'));
  let seen = 0;
  for (let t = 0; t < 5000; t += 16) {
    seen = Math.max(seen, beads());
    if (seen && !beads()) break;                                          // out, and arrived
    vi.advanceTimersByTime(16); await settle();
  }
  expect(seen).toBe(1);
  expect(beads()).toBe(0);
  await expect.poll(log('settings-rig-log')).toBe('sound.on → prefs.mix: 0.8');
});
