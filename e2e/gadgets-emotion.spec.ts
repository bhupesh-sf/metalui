import { expect, test } from '@playwright/test';
import { open } from './helpers';

// Gadgets › Emotion: every catalog gadget's SAM targets, the machine pre-checks, and one participant
// run through the whole protocol (the clock fast-forwarded), saved and scored against the pass rules.
test('targets and pre-checks', async ({ page }) => {
  await open(page, '/gadgets/emotion', 'bone');
  const rows = page.getByTestId('emotion-targets').locator('tbody tr');
  await expect(rows).toHaveCount(14);
  // The patch bay: feel .7 .8 .4 → pleasure 6.6, arousal 7.4, dominance 5.8.
  await expect(page.getByTestId('emotion-targets').locator('tr[data-gadget="patch-bay"] td.type-readout')).toHaveText(['0.7 0.8 0.4', '6.6', '7.4', '5.8']);
  const checks = page.getByTestId('emotion-checks');
  await expect(checks.locator('li[data-check="good-news"]')).toHaveAttribute('data-ok', 'true');
  await expect(checks.locator('li[data-check="lamp-cvd"]')).toHaveAttribute('data-ok', 'true');
  await expect(checks.locator('li')).toHaveCount(4);
});

test('one participant runs the whole study, and it is saved and scored', async ({ page }) => {
  await page.clock.install();
  await open(page, '/gadgets/emotion', 'bone');
  await page.evaluate(() => localStorage.removeItem('metalui:emotion-sessions'));
  await page.reload();
  await page.getByRole('textbox', { name: 'Participant' }).fill('P01');
  await page.getByRole('button', { name: 'Start' }).click();
  const step = page.getByTestId('study-step');
  // 28 feelings: each gadget shown for 3 s, then rated on three nine-point scales.
  for (let i = 0; i < 28; i++) {
    await expect(step).toHaveAttribute('data-step', 'sam');
    await expect(page.getByTestId('study-gadget')).toBeVisible();
    await page.clock.runFor(3100);
    for (const scale of ['Pleasure', 'Arousal', 'Dominance']) await page.getByRole('radio', { name: `${scale} 5`, exact: true }).check();
    await page.getByRole('button', { name: 'Next' }).click();
  }
  // 14 jobs, 14 materials.
  for (let i = 0; i < 14; i++) { await expect(step).toHaveAttribute('data-step', 'job'); await page.getByRole('radio', { name: 'keep', exact: true }).check(); await page.getByRole('button', { name: 'Next' }).click(); }
  for (let i = 0; i < 14; i++) { await expect(step).toHaveAttribute('data-step', 'material'); await page.getByRole('textbox', { name: 'Material' }).fill('clay'); await page.getByRole('button', { name: 'Next' }).click(); }
  // Six states, half through the deuteranopia filter.
  const filters: string[] = [];
  for (let i = 0; i < 6; i++) {
    await expect(step).toHaveAttribute('data-step', 'state');
    filters.push((await step.getAttribute('data-filter'))!);
    await page.getByRole('radio', { name: 'synced', exact: true }).check();
    await page.getByRole('button', { name: 'Next' }).click();
  }
  expect(filters.filter((f) => f === 'deuteranopia')).toHaveLength(3);
  // 30 plays in two minutes, then one seven-point question.
  await expect(step).toHaveAttribute('data-step', 'annoyance');
  for (let i = 0; i < 31; i++) await page.clock.runFor(4000);
  await expect(step).toHaveAttribute('data-played', '30');
  await expect(page.getByRole('radio', { name: /Leave sound on/ })).toHaveCount(7);
  await page.getByRole('radio', { name: 'Leave sound on 6', exact: true }).check();
  await page.getByRole('button', { name: 'Finish' }).click();
  await expect(step).toHaveAttribute('data-step', 'done');
  // Saved on this machine and scored: every test has answers now, so each passes or fails.
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('metalui:emotion-sessions') ?? '[]'));
  expect(saved).toHaveLength(1);
  expect(saved[0].sam).toHaveLength(28);
  const results = page.getByTestId('emotion-results');
  await expect(results.locator('li[data-result="annoyance"]')).toHaveAttribute('data-ok', 'true');
  await expect(results.locator('li[data-result="jobs"]')).toHaveAttribute('data-ok', 'false');   // everything answered "keep"
  await expect(results.locator('li[data-result="states"]')).toHaveAttribute('data-ok', 'null');  // this participant only saw, never heard
});
