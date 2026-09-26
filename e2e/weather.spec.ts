import { expect, test } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// The Weather Object on Objects › Weather: the large widget and the nine tiles from the weather
// design, drawn on the dot display and running on one clock.
for (const colorway of COLORWAYS) {
  test(`widget and tiles in ${colorway}`, async ({ page }) => {
    await open(page, '/components/weather', colorway);
    const large = page.getByTestId('weather-large');
    await expect(large).toHaveAttribute('aria-label', 'Weather in Lisbon');
    // The slab is 400 × 560; the sky is a 46 × 28 display, the hours six 7 × 7 glyphs, the week seven ranges.
    expect(await large.evaluate((e) => [e.getBoundingClientRect().width, e.getBoundingClientRect().height])).toEqual([400, 560]);
    await expect(large.locator('svg[data-cols="46"][data-rows="28"]')).toHaveCount(1);
    await expect(large.getByRole('list', { name: 'Next hours' }).locator('li')).toHaveCount(6);
    await expect(large.locator('svg[data-size="mini"]')).toHaveCount(6);
    await expect(large.getByRole('table', { name: 'Seven-day forecast' }).locator('[role=row][aria-label]')).toHaveCount(7);
    // Today's range: 14 to 24 lit on the 10 to 30 scale, 11 dots of rain.
    const today = large.locator('[role=row][aria-label^="Today"] svg[data-lo]');
    expect(await today.evaluate((e) => (e.querySelector('[data-ink="1"]')?.getAttribute('d')?.match(/M/g) ?? []).length
      + (e.querySelector('[data-ink="2"]') ? 1 : 0))).toBe(11);
    const tiles = page.getByTestId('weather-tiles').locator('article');
    await expect(tiles).toHaveCount(9);
    expect(await tiles.evaluateAll((els) => els.map((e) => e.getAttribute('data-kind')))).toEqual(['clear', 'partly', 'cloud', 'rain', 'storm', 'snow', 'mist', 'windy', 'heat']);
    expect(await tiles.first().evaluate((e) => [e.getBoundingClientRect().width, e.getBoundingClientRect().height])).toEqual([180, 180]);
    await page.getByTestId('weather-bench').screenshot({ path: capture(`weather-${colorway}`) });
  });
}

test('the clock runs and the sky steps', async ({ page }) => {
  await open(page, '/components/weather', 'bone');
  const bench = page.getByTestId('weather-bench');
  const sky = page.getByTestId('weather-large').locator('svg[data-tick]');
  const [c0, t0] = [Number(await bench.getAttribute('data-clock')), Number(await sky.getAttribute('data-tick'))];
  await page.waitForTimeout(1000);
  expect(Number(await bench.getAttribute('data-clock'))).toBeGreaterThan(c0);
  expect(Number(await sky.getAttribute('data-tick')) - t0).toBeGreaterThanOrEqual(5);
});

test('reduced motion holds every sky', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/components/weather', 'bone');
  const skies = page.locator('[data-testid=weather-bench] svg[data-tick]');
  const a = await skies.evaluateAll((els) => els.map((e) => e.getAttribute('data-tick')));
  await page.waitForTimeout(600);
  expect(await skies.evaluateAll((els) => els.map((e) => e.getAttribute('data-tick')))).toEqual(a);
});
