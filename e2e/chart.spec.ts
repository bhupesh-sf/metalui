import { expect, test, type Locator, type Page } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Chart: an instrument's graph. The plot is one focusable group (role description "chart") described by a
// summary; the readout over it reads the latest point at rest and follows the arrow keys and the pointer;
// a missing value reads "—"; the numbers are a table (hidden in chart view, shown in table view); loading
// shows skeleton bars and the data rises once when it arrives; empty and failed say so in the well; the x
// labels thin to the width; Reduce Motion drops the rise and the glide.

const playground = (page: Page) => page.locator('section', { hasText: 'Playground' }).first();
const plot = (scope: Locator, name: string) => scope.getByRole('group', { name });
const readout = (scope: Locator) => scope.locator('.mu-chart-head');
// The drum keeps the old face in the DOM while it turns; read the face that stays.
const NOW = '[data-state]:not([data-state="out"])';
const at = (scope: Locator) => readout(scope).locator(`.mu-chart-at ${NOW}`);

for (const colorway of COLORWAYS) {
  test(`the readout reads the latest day, then follows the keys to a missing one in ${colorway}`, async ({ page }) => {
    await open(page, '/components/chart', colorway);
    const section = playground(page);
    const chart = plot(section, 'API requests per day, September against August');
    await expect(chart).toHaveAttribute('aria-roledescription', 'chart');
    // Described by a summary computed from the data.
    const summary = await chart.evaluate((el) => document.getElementById(el.getAttribute('aria-describedby') ?? '')?.textContent ?? '');
    expect(summary).toContain('30 points from 1 Sep to 30 Sep');
    expect(summary).toMatch(/September: low .+, high .+, last .+\./);

    // At rest: the latest point, its markers shown, no crosshair.
    await expect(at(section)).toHaveText('30 Sep');
    await expect(section.locator('.mu-chart-area')).not.toHaveAttribute('data-active', '');
    await page.waitForTimeout(600);
    await section.screenshot({ path: capture(`chart-${colorway}`) });

    // Keys: eight steps back is the 22nd, where September has no value.
    await chart.focus();
    for (let i = 0; i < 8; i++) await page.keyboard.press('ArrowLeft');
    await expect(section.locator('.mu-chart-area')).toHaveAttribute('data-active', '');
    await expect(at(section)).toHaveText('22 Sep');
    await expect(section.locator(`.mu-chart-value ${NOW}`).first()).toHaveText('—');
    await expect(section.locator('.mu-chart-marker').first()).toHaveAttribute('data-missing', '');
    await expect(section.locator('.mu-chart > [role="status"]')).toHaveText(/^22 Sep: September —, August .+ k$/);
    await page.keyboard.press('Home');
    await expect(at(section)).toHaveText('1 Sep');
    await expect(section.locator('.mu-chart > [role="status"]')).toHaveText(/^1 Sep: /);
    // The line breaks at the missing day: September's line is two runs.
    const moves = await section.locator('.mu-chart-marks .mu-chart-series[data-signal] .chart-line').getAttribute('d');
    expect(moves?.match(/M/g)?.length).toBe(2);
    // Leaving returns the readout to the latest point.
    await chart.blur();
    await expect(at(section)).toHaveText('30 Sep');
  });
}

test('bars: the pointer moves the readout and a plate stands behind the category; patterns tell series apart', async ({ page }) => {
  await open(page, '/components/chart', 'bone');
  const section = page.locator('#regions');
  const chart = plot(section, 'Orders by region, Q2 against Q3');
  await chart.scrollIntoViewIfNeeded();
  // Q2 is the hatched slot, Q3 the solid green signal.
  await expect(section.locator('.mu-chart-marks .mu-chart-series[data-pattern="1"]')).toHaveCount(5);
  await expect(section.locator('.mu-chart-marks .mu-chart-series[data-signal][data-pattern="0"]')).toHaveCount(5);
  const box = (await chart.boundingBox())!;
  // Porto is the second of five regions.
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height / 2);
  await expect(at(section)).toHaveText('Porto');
  await expect(section.locator('.mu-chart-area')).toHaveAttribute('data-active', '');
  await expect.poll(() => section.locator('.mu-chart-cross').evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
  await page.waitForTimeout(500);
  await section.screenshot({ path: capture('chart-bars-bone') });
  await page.mouse.move(box.x + box.width * 0.9, box.y + box.height / 2);
  await expect(at(section)).toHaveText('Berlin');
  await page.mouse.move(box.x - 40, box.y - 40);
  await expect(section.locator('.mu-chart-area')).not.toHaveAttribute('data-active', '');
});

test('the same numbers as a table: hidden in chart view, shown in table view, a dash where there is none', async ({ page }) => {
  await open(page, '/components/chart', 'graphite');
  const section = playground(page);
  const hidden = section.getByRole('table', { name: 'API requests per day, September against August' });
  await expect(hidden).toHaveClass(/sr-only/);
  await section.getByRole('radio', { name: 'Table' }).click();
  const table = section.getByRole('table', { name: 'API requests per day, September against August' });
  await expect(table).toBeVisible();
  await expect(table).not.toHaveClass(/sr-only/);
  await expect(section.getByRole('group', { name: 'API requests per day, September against August' })).toHaveCount(0);
  await expect(table.getByRole('columnheader')).toHaveText([/Point/, 'September', 'August']);
  await expect(table.getByRole('row')).toHaveCount(31);
  const missing = table.getByRole('row', { name: /22 Sep/ });
  await expect(missing.getByRole('cell').first()).toHaveText('—');
  await section.screenshot({ path: capture('chart-table-graphite') });
});

test('loading waits in skeleton bars, the data rises once; empty and failed say so in the well', async ({ page }) => {
  await open(page, '/components/chart', 'bone');
  const section = page.locator('#states');
  const root = section.locator('.mu-chart');
  await section.getByRole('button', { name: 'Load' }).click();
  await expect(root).toHaveAttribute('aria-busy', 'true');
  await expect(root.locator('.mu-skeleton')).toHaveCount(8);
  await expect(root.locator('.mu-chart-y > span:not(.mu-chart-ysize)')).toHaveCount(0);
  await expect.poll(() => root.locator('.mu-skeleton').first().evaluate((el) => Number(getComputedStyle(el).opacity))).toBeGreaterThan(0.9);
  await section.screenshot({ path: capture('chart-loading-bone') });
  // The numbers arrive: the marks rise (a running animation on the marks), then rest.
  const marks = root.locator('.mu-chart-marks[data-arrive]');
  await expect(marks).toBeVisible({ timeout: 4000 });
  await expect(root).not.toHaveAttribute('aria-busy', 'true');
  await expect.poll(() => marks.evaluate((el) => el.getAnimations().length), { timeout: 1000 }).toBeGreaterThan(0);
  await expect.poll(() => marks.evaluate((el) => el.getAnimations().filter((a) => a.playState === 'running').length)).toBe(0);

  await section.getByRole('button', { name: 'Empty' }).click();
  await expect(root.locator('.mu-chart-message')).toHaveText('No orders in these quarters yet');
  await expect(root.locator('.mu-chart-hair[data-zero]')).toHaveCount(1);
  await expect(root.getByRole('table')).toHaveCount(0);
  await section.getByRole('button', { name: 'Fail' }).click();
  await expect(root.locator('.mu-chart-message')).toContainText('Couldn’t load the orders.');
  await expect(root.locator('.mu-chart-message').getByRole('button', { name: 'Try again' })).toBeVisible();
  await page.waitForTimeout(600);
  await section.screenshot({ path: capture('chart-failed-bone') });
});

test('a narrow chart thins its day labels, keeps the latest, and none collide', async ({ page }) => {
  await open(page, '/components/chart', 'bone');
  const section = page.locator('#narrow');
  const labels = section.locator('.mu-chart-x > span');
  const count = await labels.count();
  expect(count).toBeGreaterThan(1);
  expect(count).toBeLessThan(30);
  await expect(labels.last()).toHaveText('30 Sep');
  const boxes = await labels.evaluateAll((els) => els.map((e) => e.getBoundingClientRect()).map((r) => [r.left, r.right]));
  for (let i = 1; i < boxes.length; i++) expect(boxes[i][0]).toBeGreaterThan(boxes[i - 1][1]);
  await section.screenshot({ path: capture('chart-narrow-bone') });
});

test('Reduce Motion: the data fades in without rising, and the crosshair jumps', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/components/chart', 'graphite');
  const tuner = page.getByTestId('chart-tuner');
  await tuner.scrollIntoViewIfNeeded();
  await tuner.getByRole('button', { name: 'Replay arrival' }).click();
  const marks = tuner.locator('.mu-chart-marks[data-arrive]');
  await expect(marks).toBeVisible();
  // Mid-arrival the marks are at full height: only opacity moves.
  const scale = await marks.evaluate((el) => getComputedStyle(el).scale);
  expect(['none', '1', '1 1']).toContain(scale);
  expect(await tuner.locator('.mu-chart-cross').evaluate((el) => getComputedStyle(el).transitionProperty)).toBe('opacity');
});
