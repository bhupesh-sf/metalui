import { expect, test, type Page } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Plan: a compact Progress head counting steps ("3 of 4"), then each step with the tool call's lamps and
// words: queued amber, running the ring after the show delay, done the check, failed red with its reason;
// a step's own tasks nest under it.

const playground = (page: Page) => page.locator('section', { hasText: 'Playground' }).first();

for (const colorway of COLORWAYS) {
  test(`a plan runs step by step, its head counting up, in ${colorway}`, async ({ page }) => {
    await open(page, '/components/plan', colorway);
    const section = playground(page);
    const plan = section.locator('.mu-plan');
    const bar = plan.getByRole('progressbar', { name: 'Plan' });
    const tasks = plan.locator('.mu-plan-task');

    await expect(bar).toHaveAttribute('aria-valuetext', '4 of 4 done');
    await expect(tasks.first()).toHaveAttribute('data-state', 'done');

    await section.getByRole('button', { name: 'Run the plan' }).click();
    await expect(bar).toHaveAttribute('aria-valuetext', '0 of 4 done');
    await expect(tasks.nth(0)).toHaveAttribute('data-state', 'running');
    await expect(tasks.nth(0)).toContainText('Running');
    await expect(tasks.nth(1)).toContainText('Queued');
    await expect(tasks.nth(1).locator('.mu-led')).toHaveAttribute('data-kind', 'waiting');
    await expect(plan.getByRole('list', { name: 'Plan' })).toHaveAttribute('aria-busy', 'true');
    await expect(tasks.nth(0).locator('.mu-spinner')).toBeVisible(); // the ring, after the show delay

    await expect(bar).toHaveAttribute('aria-valuetext', '2 of 4 done', { timeout: 5000 });
    await expect(tasks.nth(0)).toHaveAttribute('data-state', 'done');
    await expect(tasks.nth(0).locator('svg').first()).toBeVisible(); // the check
    await expect(plan.locator('.mu-progress-value')).toContainText('2 of 4');
    // Capture once everything but the ring's endless turn has settled.
    await expect.poll(() => section.evaluate((el) => el.getAnimations({ subtree: true }).filter((a) => a.playState === 'running' && a.effect?.getComputedTiming().iterations !== Infinity).length)).toBe(0);
    await section.screenshot({ path: capture(`plan-${colorway}`) });
  });
}

test('Fail stops the step with the red lamp and its reason', async ({ page }) => {
  await open(page, '/components/plan', 'bone');
  const section = playground(page);
  const tasks = section.locator('.mu-plan-task');
  await section.getByRole('button', { name: 'Run the plan' }).click();
  await expect(tasks.nth(0)).toHaveAttribute('data-state', 'running');
  await section.getByRole('button', { name: 'Fail' }).click();
  await expect(tasks.nth(0)).toContainText('Failed');
  await expect(tasks.nth(0).locator('.mu-led')).toHaveAttribute('data-kind', 'failed');
  await expect(tasks.nth(0).locator('.mu-plan-detail')).toContainText('rebuilding');
  await expect(section.locator('.mu-progress')).toHaveAttribute('data-progress', 'failed');
});

test('a step holds its own tasks; the head counts steps', async ({ page }) => {
  await open(page, '/components/plan', 'bone');
  const plan = page.locator('#nested .mu-plan');
  await expect(plan.getByRole('progressbar', { name: 'Migration' })).toHaveAttribute('aria-valuetext', '1 of 3 done');
  const step = plan.locator('.mu-plan-task[data-state="running"]').first();
  await expect(step.locator('.mu-plan-task')).toHaveCount(3);
  await expect(step.locator('.mu-plan-task').nth(2)).toContainText('Queued');
  await expect(plan.locator('.mu-plan-task').first()).toContainText('Found 6 pages');
  await expect(plan.locator('.mu-plan-task').first().locator('.sr-only')).toHaveText(', done');
});

test('Reduce Motion: the failed lamp holds steady', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/components/plan', 'bone');
  const section = playground(page);
  const first = section.locator('.mu-plan-task').first();
  await section.getByRole('button', { name: 'Run the plan' }).click();
  await expect(first).toHaveAttribute('data-state', 'running');
  await section.getByRole('button', { name: 'Fail' }).click();
  const lamp = first.locator('.mu-led');
  await expect(lamp).toHaveAttribute('data-kind', 'failed');
  expect(await lamp.evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
});
