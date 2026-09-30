import { afterEach, expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { openPage, until } from './harness';

// Gadgets › Emotion: every catalog gadget's SAM targets, the machine pre-checks, and one participant
// run through the whole protocol (the clock fast-forwarded), saved and scored against the pass rules.
const $ = (css: string) => document.querySelector(css)!;
const count = (css: string) => document.querySelectorAll(css).length;
const realTimeout = setTimeout;
/** Lets React commit and run its effects (it schedules on a message, not a timer). */
const settle = async () => { for (let i = 0; i < 3; i++) await new Promise((r) => realTimeout(r, 0)); };
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

test('targets and pre-checks', async () => {
  await openPage('/gadgets/emotion', 'bone');
  expect(count('[data-testid="emotion-targets"] tbody tr')).toBe(14);
  // The patch bay: feel .7 .8 .4 → pleasure 6.6, arousal 7.4, dominance 5.8.
  expect([...document.querySelectorAll('[data-testid="emotion-targets"] tr[data-gadget="patch-bay"] td.type-readout')].map((e) => e.textContent)).toEqual(['0.7 0.8 0.4', '6.6', '7.4', '5.8']);
  expect($('[data-testid="emotion-checks"] li[data-check="good-news"]').getAttribute('data-ok')).toBe('true');
  expect($('[data-testid="emotion-checks"] li[data-check="lamp-cvd"]').getAttribute('data-ok')).toBe('true');
  expect(count('[data-testid="emotion-checks"] li')).toBe(4);
});

test('one participant runs the whole study, and it is saved and scored', async () => {
  localStorage.removeItem('metalui:emotion-sessions');
  await openPage('/gadgets/emotion', 'bone');
  // The study's clock is the slice's: each showing and each play is fast-forwarded.
  await clock();
  const runFor = async (ms: number) => { vi.advanceTimersByTime(ms); await settle(); };
  await userEvent.fill(page.getByRole('textbox', { name: 'Participant' }), 'P01');
  await userEvent.click(page.getByRole('button', { name: 'Start' }));
  const step = page.getByTestId('study-step');
  const next = () => userEvent.click(page.getByRole('button', { name: 'Next' }));
  // 28 feelings: each gadget shown for 3 s, then rated on three nine-point scales.
  for (let i = 0; i < 28; i++) {
    await expect.element(step).toHaveAttribute('data-step', 'sam');
    await expect.element(page.getByTestId('study-gadget')).toBeVisible();
    await settle();
    await runFor(3100);
    for (const scale of ['Pleasure', 'Arousal', 'Dominance']) await userEvent.click(page.getByRole('radio', { name: `${scale} 5`, exact: true }));
    await next();
  }
  // 14 jobs, 14 materials.
  for (let i = 0; i < 14; i++) { await expect.element(step).toHaveAttribute('data-step', 'job'); await userEvent.click(page.getByRole('radio', { name: 'keep', exact: true })); await next(); }
  for (let i = 0; i < 14; i++) { await expect.element(step).toHaveAttribute('data-step', 'material'); await userEvent.fill(page.getByRole('textbox', { name: 'Material' }), 'clay'); await next(); }
  // Six states, half through the deuteranopia filter.
  const filters: string[] = [];
  for (let i = 0; i < 6; i++) {
    await expect.element(step).toHaveAttribute('data-step', 'state');
    filters.push(step.element().getAttribute('data-filter')!);
    await userEvent.click(page.getByRole('radio', { name: 'synced', exact: true }));
    await next();
  }
  expect(filters.filter((f) => f === 'deuteranopia')).toHaveLength(3);
  // 30 plays in two minutes, then one seven-point question.
  await expect.element(step).toHaveAttribute('data-step', 'annoyance');
  await settle();
  for (let i = 0; i < 31; i++) await runFor(4000);
  await expect.element(step).toHaveAttribute('data-played', '30');
  expect(page.getByRole('radio', { name: /Leave sound on/ }).elements()).toHaveLength(7);
  await userEvent.click(page.getByRole('radio', { name: 'Leave sound on 6', exact: true }));
  await userEvent.click(page.getByRole('button', { name: 'Finish' }));
  await expect.element(step).toHaveAttribute('data-step', 'done');
  // Saved on this machine and scored: every test has answers now, so each passes or fails.
  const saved = JSON.parse(localStorage.getItem('metalui:emotion-sessions') ?? '[]');
  expect(saved).toHaveLength(1);
  expect(saved[0].sam).toHaveLength(28);
  const result = (name: string) => page.elementLocator($(`[data-testid="emotion-results"] li[data-result="${name}"]`));
  await expect.element(result('annoyance')).toHaveAttribute('data-ok', 'true');
  await expect.element(result('jobs')).toHaveAttribute('data-ok', 'false');   // everything answered "keep"
  await expect.element(result('states')).toHaveAttribute('data-ok', 'null');  // this participant only saw, never heard
}, 400_000);
