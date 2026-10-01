import { expect, test } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// /performance: methodology and limits always; the latest run only when one is published, and honest
// about a run taken on a busy machine (durations withheld, counters kept).
const SUMMARY_URL = '**/bench-results/summary.json';
const run = (over: Record<string, unknown> = {}) => ({
  schemaVersion: 1, sha: 'abcdef0123456789', startedAt: '2026-10-01T07:04:24.808Z', valid: true,
  host: { name: 'platform-01', cpu: 'AMD EPYC-Genoa Processor', cpus: 8, memGB: 15, hypervisor: 'KVM', node: 'v22', playwright: '1.60.0' },
  load: { before: 0.4, after: 0.5, max: 1.5 },
  idle: {
    pages: 102, atRest: 99, chromeLoops: ['span.mu-led.inline-block [mu-led-breathe]'], baseline: { layoutsPerS: 0, styleRecalcsPerS: 2 },
    notAtRest: [{ path: '/components/spinner', loops: { 'span.mu-spinner-arc [mu-spinner-turn]': 4 }, layoutsPerS: 0, styleRecalcsPerS: 8.4 }],
    durations: { baselineCpuMsPerS: 3.2 },
  },
  bundle: { package: { raw: 1450000, gzip: 228000, brotli: 187000 }, singleImport: { Button: { gzip: 31000, raw: 91000 } } },
  ...over,
});

test('with nothing published it says so, and still explains the method', async ({ page }) => {
  await page.route(SUMMARY_URL, (r) => r.fulfill({ status: 404, body: 'not found' }));
  await open(page, '/performance', 'bone');
  await expect(page.getByTestId('perf-none')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'What is measured' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'What these numbers do not prove' })).toBeVisible();
});

for (const colorway of COLORWAYS) {
  test(`a valid run shows its machine, the pages that run at rest and what an import costs in ${colorway}`, async ({ page }) => {
    await page.route(SUMMARY_URL, (r) => r.fulfill({ json: run() }));
    await open(page, '/performance', colorway);
    await expect(page.getByTestId('perf-run')).toContainText('abcdef01');
    await expect(page.getByTestId('perf-run')).toContainText('platform-01');
    await expect(page.getByTestId('perf-invalid')).toHaveCount(0);
    await expect(page.getByText('99 of 102')).toBeVisible();
    await expect(page.getByText('3.2 ms/s')).toBeVisible();
    await expect(page.getByTestId('perf-busy')).toContainText('/components/spinner');
    await expect(page.getByTestId('perf-bundle')).toContainText('import { Button }');
    await page.locator('#latest').screenshot({ path: capture(`performance-${colorway}`) });
  });
}

test('a run on a busy machine withholds durations and keeps the counters', async ({ page }) => {
  await page.route(SUMMARY_URL, (r) => r.fulfill({ json: run({ valid: false, load: { before: 3.06, after: 3.1, max: 1.5 }, idle: { ...run().idle, durations: null } }) }));
  await open(page, '/performance', 'bone');
  await expect(page.getByTestId('perf-invalid')).toContainText('durations are withheld');
  await expect(page.getByText('ms/s')).toHaveCount(0);
  await expect(page.getByText('99 of 102')).toBeVisible();
});
