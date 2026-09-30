import { expect, test, type Page } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Metrics dashboard block: the range changes every figure, a tile picks what's charted, the chart reads
// day by day from the keyboard, Compare draws the previous period, Export saves a CSV, and the layout
// follows the block's own width.
const block = (page: Page) => page.getByRole('region', { name: 'Analytics for metalui.dev' });

for (const colorway of COLORWAYS) {
  test(`explores a range, a measure and a day, in ${colorway}`, async ({ page }) => {
    await open(page, '/blocks/metrics-dashboard', colorway);
    const b = block(page);
    await expect(b).toContainText('Last 30 days');
    const visitors = b.getByRole('tab', { name: /Visitors/ });
    const before = await visitors.innerText();

    // A new range: the subtitle and the figures change.
    await b.getByRole('radio', { name: '7D' }).click();
    await expect(b).toContainText('Last 7 days');
    await expect.poll(async () => visitors.innerText()).not.toBe(before);
    const chart = b.getByRole('img', { name: /Visitors, last 7 days, by day/ });
    await expect(chart).toBeVisible();

    // A tile picks the measure; the chart follows.
    await b.getByRole('tab', { name: /Signups/ }).click();
    await expect(b.getByRole('tab', { name: /Signups/ })).toHaveAttribute('aria-selected', 'true');
    await expect(b.getByRole('img', { name: /Signups, last 7 days/ })).toBeVisible();

    // Read the chart from the keyboard: focus lands on the last day; Home goes to the first.
    await b.getByRole('img', { name: /Signups/ }).focus();
    const status = b.getByRole('status');
    await expect(status).toContainText('Sep 30');
    await page.keyboard.press('Home');
    await expect(status).toContainText('Sep 24');
    await page.keyboard.press('ArrowRight');
    await expect(status).toContainText('Sep 25');

    // Compare draws the previous period and the readout says what it was.
    await b.getByRole('button', { name: 'Compare' }).click();
    await b.getByRole('img', { name: /Signups/ }).focus();
    await expect(status).toContainText('previous period');
    await expect(b.locator('svg path.stroke-ink3')).toHaveCount(1);

    await b.scrollIntoViewIfNeeded();
    await b.getByRole('img', { name: /Signups/ }).hover({ position: { x: 300, y: 90 } });
    await page.waitForTimeout(500);
    await b.screenshot({ path: capture(`block-metrics-dashboard-${colorway}`) });
  });
}

test('the deltas say their direction in words, and bounce going up is bad', async ({ page }) => {
  await open(page, '/blocks/metrics-dashboard', 'bone');
  const tiles = block(page).getByRole('tab');
  await expect(tiles).toHaveCount(4);
  for (let i = 0; i < 4; i++) await expect(tiles.nth(i)).toContainText(/(\d+(\.\d)?(%| pts) (up|down))|level/);
  const bounce = block(page).getByRole('tab', { name: /Bounce rate/ });
  const words = await bounce.innerText();
  const led = await bounce.locator('.mu-led').getAttribute('data-kind');
  if (/ up/.test(words)) expect(led).toBe('failed');
  if (/ down/.test(words)) expect(led).toBe('live');
});

test('export saves the charted series as CSV and says so', async ({ page }) => {
  await open(page, '/blocks/metrics-dashboard', 'bone');
  const b = block(page);
  const download = page.waitForEvent('download');
  await b.getByRole('button', { name: 'Export' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('metalui.dev-visitors-30d.csv');
  await expect(b.getByRole('button', { name: 'Exported' })).toBeVisible();
  await expect(b.getByRole('button', { name: 'Export' })).toBeVisible({ timeout: 4000 });
});

test('a new range draws the line in; reduced motion does not', async ({ page }) => {
  await open(page, '/blocks/metrics-dashboard', 'bone');
  const b = block(page);
  await b.getByRole('radio', { name: '90D' }).click();
  const drawing = await b.locator('svg path.stroke-green-deep').evaluate((el) => el.getAnimations().length);
  expect(drawing).toBeGreaterThan(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await b.getByRole('radio', { name: '7D' }).click();
  const still = await b.locator('svg path.stroke-green-deep').evaluate((el) => el.getAnimations().length);
  expect(still).toBe(0);
});

test('the layout follows the block\'s own width', async ({ page }) => {
  await open(page, '/blocks/metrics-dashboard', 'bone');
  const tabs = block(page).getByRole('tablist');
  const rowsOf = async () => tabs.evaluate((el) => new Set([...el.querySelectorAll('[role=tab]')].map((t) => Math.round((t as HTMLElement).getBoundingClientRect().top))).size);
  expect(await rowsOf()).toBe(1);
  await block(page).evaluate((el) => { (el as HTMLElement).style.width = '420px'; });
  await expect.poll(rowsOf).toBe(2);
});
