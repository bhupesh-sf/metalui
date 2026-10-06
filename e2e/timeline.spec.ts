import { expect, test, type Locator, type Page } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Timeline: a record read top to bottom. An ordered list; each state has a lamp and (but done and
// planned) a word; a running event's ring waits on the Spinner's clock; the now marker sits where events
// turn planned; lamps gesture only when a state changes on screen; new events land and are said once;
// dates stand before the rail with timeSide="start"; narrow lists move the time under the title.

const playground = (page: Page) => page.locator('section', { hasText: 'Playground' }).first();
const event = (scope: Locator, name: string) => scope.getByRole('listitem').filter({ hasText: name });

for (const colorway of COLORWAYS) {
  test(`an order's status moves along, the now marker follows the states in ${colorway}`, async ({ page }) => {
    await open(page, '/components/timeline', colorway);
    const section = playground(page);
    const list = section.getByRole('list', { name: 'Order 4312' });
    await expect(list.getByRole('listitem')).toHaveCount(6);
    // Nothing gestures on load.
    await expect(page.locator('.mu-timeline .mu-led:not([data-gesture="steady"])')).toHaveCount(0);

    const out = event(list, 'Out for delivery');
    await expect(out).toHaveAttribute('data-state', 'live');
    await expect(out.locator('.mu-led')).toHaveAttribute('data-kind', 'live');
    await expect(out.locator('.mu-timeline-when')).toContainText('Live');
    // The marker sits on the first planned event, and a reader hears "planned" there.
    const expected = event(list, 'Expected delivery');
    await expect(expected).toHaveAttribute('data-now', '');
    await expect(list.locator('[data-now]')).toHaveCount(1);
    await expect(expected).toContainText('planned');
    await expect(expected.locator('.mu-timeline-now')).toHaveAttribute('aria-hidden', 'true');
    // The rail runs from under each node; the last event has none.
    const rail = (li: Locator) => li.evaluate((el) => getComputedStyle(el, '::before').content);
    expect(await rail(out)).not.toBe('none');
    expect(await rail(expected)).toBe('none');
    await page.waitForTimeout(300);
    await section.screenshot({ path: capture(`timeline-${colorway}`) });

    // The next scan: Delivered lands from above, Out for delivery turns done, the plan is gone.
    await section.getByRole('button', { name: 'Next scan' }).click();
    const delivered = event(list, 'Delivered');
    await expect(delivered).toBeVisible();
    await expect(event(list, 'Out for delivery')).toHaveAttribute('data-state', 'done');
    await expect(list.locator('[data-now]')).toHaveCount(0);
    await expect(event(list, 'Expected delivery')).toHaveCount(0);
    await expect(section.locator('.mu-timeline > [role="status"]')).toContainText('Delivered');
  });
}

test('a pipeline runs on the Spinner\'s clock, waits amber for approval, and a broken test blinks red', async ({ page }) => {
  await open(page, '/components/timeline', 'bone');
  const section = page.locator('#pipeline');
  const list = section.getByRole('list', { name: 'Pipeline run' });
  await expect(list.locator('[data-state="planned"]')).toHaveCount(5);

  await section.getByRole('button', { name: 'Run' }).click();
  const checkout = event(list, 'Checkout');
  await expect(checkout).toHaveAttribute('aria-busy', 'true');
  await expect(checkout.locator('.mu-timeline-when')).toContainText('Running');
  await expect(checkout.locator('.mu-timeline-node .mu-spinner')).toBeVisible();
  await expect(checkout).toHaveAttribute('data-state', 'done', { timeout: 4000 });
  await expect(checkout.locator('.mu-timeline-when')).toContainText('s');

  // The deploy waits for someone: amber, steady, with its word and its reason.
  const deploy = event(list, 'Deploy to production');
  await expect(deploy).toHaveAttribute('data-state', 'waiting', { timeout: 10_000 });
  await expect(deploy.locator('.mu-led')).toHaveAttribute('data-kind', 'waiting');
  await expect(deploy).toContainText('Waiting');
  await expect(deploy).toContainText('needs an approval');
  await section.getByRole('button', { name: 'Approve deploy' }).click();
  await expect(deploy).toHaveAttribute('data-state', 'done', { timeout: 6000 });

  // Break a test and run again: Test turns failed with two blinks; the deploy stays planned.
  await section.getByRole('switch', { name: 'Break a test' }).click();
  await section.getByRole('button', { name: 'Run again' }).click();
  const tests = event(list, 'Test');
  await expect(tests).toHaveAttribute('data-state', 'failed', { timeout: 10_000 });
  await expect(tests.locator('.mu-led')).toHaveAttribute('data-kind', 'failed');
  await expect(tests.locator('.mu-led')).toHaveAttribute('data-gesture', 'blink2');
  await expect(tests).toContainText('Failed');
  await expect(tests).toContainText('2 of 148 tests failed');
  await expect(deploy).toHaveAttribute('data-state', 'planned');
  await page.waitForTimeout(600);
  await section.screenshot({ path: capture('timeline-pipeline-bone') });
});

test('new activity lands from above, glides the rest, and is said once; the exact time is a hover away', async ({ page }) => {
  await open(page, '/components/timeline', 'graphite');
  const section = page.locator('#feed');
  const list = section.getByRole('list', { name: 'Board activity' });
  // A glyph sits in its well; a live event's lamp is on the well's corner.
  const editing = event(list, 'Ana is editing');
  await expect(editing.locator('.mu-timeline-well svg').first()).toBeVisible();
  await expect(editing.locator('.mu-timeline-well > .mu-led')).toHaveAttribute('data-kind', 'live');
  await expect(event(list, 'Board created').locator('.mu-timeline-well > .mu-led')).toHaveCount(0);

  // The exact time is said to readers and shown on hover.
  const time = event(list, 'Rui tagged').locator('time');
  await time.hover();
  await expect(page.locator('.mu-tooltip')).toBeVisible();
  await expect(event(list, 'Rui tagged').locator('.sr-only')).not.toHaveText('');

  const before = await list.getByRole('listitem').count();
  await section.getByRole('button', { name: 'New activity' }).click();
  const first = list.getByRole('listitem').first();
  await expect(first).toContainText('Rui commented on River light');
  // It lands (a running animation on the new row) and the rest travel.
  expect(await first.evaluate((el) => el.getAnimations().length)).toBeGreaterThan(0);
  expect(await list.getByRole('listitem').nth(1).evaluate((el) => el.getAnimations().length)).toBeGreaterThan(0);
  await expect(list.getByRole('listitem')).toHaveCount(before + 1);
  await expect(section.locator('.mu-timeline > [role="status"]')).toHaveText('Rui commented on River light');
  await page.waitForTimeout(600);
  await section.screenshot({ path: capture('timeline-feed-graphite') });
});

test('dates on the left stand before the rail; a narrow list moves the time under the title', async ({ page }) => {
  await open(page, '/components/timeline', 'bone');
  const roadmap = page.locator('#roadmap').getByRole('list', { name: 'Roadmap' });
  const regions = event(roadmap, 'Shared regions');
  const when = await regions.locator('.mu-timeline-when').boundingBox();
  const node = await regions.locator('.mu-timeline-node').boundingBox();
  const title = await regions.locator('.mu-timeline-title').boundingBox();
  expect(when!.x + when!.width).toBeLessThanOrEqual(node!.x);
  expect(node!.x + node!.width).toBeLessThanOrEqual(title!.x);
  // Dates line up: every time ends at the same x.
  const ends = await roadmap.locator('.mu-timeline-when').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().right)));
  expect(new Set(ends).size).toBe(1);
  await expect(event(roadmap, 'Comments on photos')).toHaveAttribute('data-now', '');
  await page.locator('#roadmap').screenshot({ path: capture('timeline-roadmap-bone') });

  const narrow = page.locator('#narrow').getByRole('list', { name: 'Narrow board activity' });
  const row = event(narrow, 'Rui tagged');
  const t = await row.locator('.mu-timeline-title').boundingBox();
  const w = await row.locator('.mu-timeline-when').boundingBox();
  expect(w!.y).toBeGreaterThanOrEqual(t!.y + t!.height - 12);
  expect(Math.abs(w!.x - t!.x)).toBeLessThan(1);
  await page.locator('#narrow').screenshot({ path: capture('timeline-narrow-bone') });
});

test('Reduce Motion: new events appear in place and lamps hold steady', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/components/timeline', 'graphite');
  const section = page.locator('#feed');
  const list = section.getByRole('list', { name: 'Board activity' });
  await section.getByRole('button', { name: 'New activity' }).click();
  await expect(list.getByRole('listitem').first()).toContainText('Rui commented');
  const running = await list.evaluate((el) => [...el.querySelectorAll('li')].reduce((n, li) => n + li.getAnimations().length, 0));
  expect(running).toBe(0);

  // A failure under Reduce Motion: the lamp still says it, without blinking.
  const pipeline = page.locator('#pipeline');
  await pipeline.getByRole('switch', { name: 'Break a test' }).click();
  await pipeline.getByRole('button', { name: 'Run' }).click();
  const lamp = event(pipeline.getByRole('list', { name: 'Pipeline run' }), 'Test').locator('.mu-led');
  await expect(lamp).toHaveAttribute('data-kind', 'failed', { timeout: 10_000 });
  expect(await lamp.evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
});
