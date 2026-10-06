import { expect, test, type Locator, type Page } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Progress: the fill rises on the settle spring and never passes the value, drains back on the release
// spring (Reset, Cancel), holds the head until a completed fill lands; paused dims, failed takes the
// failed ink; shapes (slim, ring, steps, buffered) and sizes; Reduce Motion snaps and breathes.

/** How much of the (first) well the fill covers: the fill is a whole pill slid in from the start. */
const share = (bar: Locator) => bar.evaluate((el) => {
  const well = el.querySelector('.mu-progress-well')!.getBoundingClientRect();
  const fill = el.querySelector('.mu-progress-fill')!.getBoundingClientRect();
  return Math.max(0, Math.min(well.right, fill.right) - well.left) / well.width;
});

/** Samples the fill's share every frame for `ms`, starting now. */
const sample = (bar: Locator, ms: number) => bar.evaluate(async (el, ms) => {
  const out: number[] = [];
  const t0 = performance.now();
  await new Promise<void>((done) => {
    const frame = () => {
      const well = el.querySelector('.mu-progress-well')!.getBoundingClientRect();
      const fill = el.querySelector('.mu-progress-fill')!.getBoundingClientRect();
      out.push(Math.max(0, Math.min(well.right, fill.right) - well.left) / well.width);
      if (performance.now() - t0 < ms) requestAnimationFrame(frame); else done();
    };
    requestAnimationFrame(frame);
  });
  return out;
}, ms);

const exportBar = (page: Page) => page.getByTestId('progress-export');
const play = (page: Page) => page.getByTestId('progress-play');
const section = (page: Page, id: string) => page.locator(`section#${id}`);

for (const colorway of COLORWAYS) {
  test(`runs to done, then the head turns, in ${colorway}`, async ({ page }) => {
    await open(page, '/components/progress', colorway);
    const bar = exportBar(page);
    await expect(bar).toHaveAttribute('aria-valuenow', '42');
    await expect(page.getByRole('progressbar', { name: 'Syncing this canvas' })).not.toHaveAttribute('aria-valuenow', /.*/);
    await play(page).getByRole('button', { name: 'Run export' }).click();
    await expect(play(page).getByRole('button', { name: 'Cancel' })).toBeVisible();
    await expect(bar).toHaveAttribute('aria-valuenow', '100', { timeout: 10_000 });
    await expect(bar).toContainText('Exported 12 photos');
    await expect(bar).toContainText('100%');
    await expect.poll(() => share(bar)).toBeGreaterThan(0.995);
    await expect(play(page).getByRole('button', { name: 'Run export' })).toBeVisible();
    await page.locator('section', { hasText: 'Playground' }).first().screenshot({ path: capture(`progress-${colorway}`) });
    await section(page, 'states').screenshot({ path: capture(`progress-states-${colorway}`) });
    await section(page, 'shapes').screenshot({ path: capture(`progress-shapes-${colorway}`) });
    await section(page, 'sizes').screenshot({ path: capture(`progress-sizes-${colorway}`) });
  });
}

test('complete lets the fill land before the head turns', async ({ page }) => {
  await open(page, '/components/progress', 'bone');
  const bar = exportBar(page);
  await play(page).getByRole('button', { name: 'Run export' }).click();
  // Every frame until the head says Exported: the fill must already be (nearly) full on that frame.
  const first = await bar.evaluate(async (el) => {
    const t0 = performance.now();
    return await new Promise<number>((done) => {
      const frame = () => {
        const well = el.querySelector('.mu-progress-well')!.getBoundingClientRect();
        const fill = el.querySelector('.mu-progress-fill')!.getBoundingClientRect();
        const s = Math.max(0, Math.min(well.right, fill.right) - well.left) / well.width;
        if (el.querySelector('.mu-progress-label')!.textContent!.includes('Exported')) done(s);
        else if (performance.now() - t0 > 12_000) done(-1);
        else requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
  });
  expect(first).toBeGreaterThan(0.98);
});

test('reset drains the fill back on the release spring and turns the value to 0 %', async ({ page }) => {
  await open(page, '/components/progress', 'graphite');
  const bar = exportBar(page);
  await expect.poll(() => share(bar)).toBeCloseTo(0.42, 2);
  await play(page).getByRole('button', { name: 'Reset' }).click();
  const shares = await sample(bar, 500);
  expect(shares.some((s) => s > 0.02 && s < 0.4)).toBe(true); // it travelled, not jumped
  expect(shares.every((s, i) => i === 0 || s <= shares[i - 1] + 0.002)).toBe(true); // only ever down
  await expect.poll(() => share(bar)).toBeLessThan(0.005);
  await expect(bar.locator('.mu-progress-fill')).toHaveAttribute('data-draining', '');
  await expect(bar).toHaveAttribute('aria-valuenow', '0');
  await expect(bar.locator('.mu-progress-value')).toContainText('0%');
});

test('cancel turns the key back and drains the fill', async ({ page }) => {
  await open(page, '/components/progress', 'bone');
  const bar = exportBar(page);
  await play(page).getByRole('button', { name: 'Run export' }).click();
  await expect.poll(() => share(bar)).toBeGreaterThan(0.1);
  await play(page).getByRole('button', { name: 'Cancel' }).click();
  await expect(bar).toContainText('Export cancelled');
  await expect(play(page).getByRole('button', { name: 'Run export' })).toBeVisible();
  await expect.poll(() => share(bar)).toBeLessThan(0.005);
});

test('the edge rises onto a new value without passing it', async ({ page }) => {
  await open(page, '/components/progress', 'bone');
  const bar = exportBar(page);
  await expect.poll(() => share(bar)).toBeCloseTo(0.42, 2);
  await bar.evaluate((el) => (el.querySelector('.mu-progress-fill') as HTMLElement).style.setProperty('--mu-progress-value', '70'));
  const shares = await sample(bar, 700);
  expect(shares.some((s) => s > 0.43 && s < 0.69)).toBe(true);
  expect(Math.max(...shares)).toBeLessThanOrEqual(0.7005);
  expect(shares.at(-1)).toBeCloseTo(0.7, 2);
});

for (const colorway of COLORWAYS) {
  test(`end states say themselves three ways, in ${colorway}`, async ({ page }) => {
    await open(page, '/components/progress', colorway);
    const cell = (s: string) => page.getByTestId(`progress-state-${s}`);
    const paused = cell('paused').getByRole('progressbar');
    const failed = cell('failed').getByRole('progressbar');
    const complete = cell('complete').getByRole('progressbar');
    await expect(paused).toHaveAttribute('data-progress', 'paused');
    await expect(paused.locator('.mu-progress-fill')).toHaveCSS('opacity', '0.45');
    await expect(cell('paused').getByRole('button', { name: 'Resume' })).toBeVisible();
    await expect.poll(() => failed.locator('.mu-progress-fill').evaluate((el) => getComputedStyle(el, '::after').opacity)).toBe('1');
    await expect(cell('failed').getByRole('button', { name: 'Try again' })).toBeVisible();
    await expect.poll(() => share(complete)).toBeGreaterThan(0.995);
    await expect(complete).toHaveAttribute('aria-valuenow', '100');
    await expect(cell('running')).toContainText(/8 of 12 · about \d+ s/);
    await expect.poll(() => share(cell('running').getByRole('progressbar'))).toBeCloseTo(0.64, 2);
  });
}

test('shapes: steps count, slim keeps its name, buffered runs ahead, the ring fills then ticks', async ({ page }) => {
  await open(page, '/components/progress', 'bone');
  const steps = page.getByTestId('progress-steps').getByRole('progressbar');
  await expect(steps).toHaveAttribute('aria-valuetext', 'Step 2 of 4');
  await expect(steps).toContainText('Step 2 of 4');
  await expect(steps.locator('.mu-progress-well')).toHaveCount(4);
  await page.getByTestId('progress-steps').getByRole('button', { name: 'Next step' }).click();
  await expect(steps).toHaveAttribute('aria-valuetext', 'Step 3 of 4');
  await expect(steps).toContainText('Step 3 of 4');

  const slim = page.getByRole('progressbar', { name: 'Uploading Harbour survey.pdf' });
  await expect(slim).toBeAttached();
  await expect(slim.locator('.mu-progress-head')).toHaveCount(0);
  expect((await slim.locator('.mu-progress-track').boundingBox())!.height).toBeCloseTo(3, 0);

  const film = page.getByTestId('progress-buffered').getByRole('progressbar');
  await expect.poll(() => film.evaluate((el) => {
    const well = el.querySelector('.mu-progress-well')!.getBoundingClientRect();
    return (el.querySelector('.mu-progress-buffer')!.getBoundingClientRect().right - well.left) / well.width;
  })).toBeCloseTo(0.61, 2);

  const key = page.getByTestId('progress-ring-key');
  await key.click();
  const ring = key.getByRole('progressbar');
  await expect.poll(async () => Number(await ring.getAttribute('aria-valuenow'))).toBeGreaterThan(0);
  await expect(key.locator('svg.mu-spinner')).toHaveAttribute('data-phase', 'done', { timeout: 10_000 });
  await expect(key).toContainText('Uploaded');
});

test('under Reduce Motion the edge snaps back and the unknown segment breathes in place', async ({ page }) => {
  await open(page, '/components/progress', 'graphite');
  const seg = page.getByRole('progressbar', { name: 'Syncing this canvas' }).locator('.mu-progress-fill');
  const a = (await seg.boundingBox())!.x;
  await page.waitForTimeout(300);
  expect(Math.abs((await seg.boundingBox())!.x - a)).toBeGreaterThan(10);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(seg).toHaveCSS('animation-name', 'mu-progress-breathe');
  // It settles into the middle once the switch lands, then stays put.
  await expect.poll(async () => {
    const c = (await seg.boundingBox())!.x;
    await page.waitForTimeout(300);
    return Math.abs((await seg.boundingBox())!.x - c);
  }).toBeLessThan(0.5);

  const bar = exportBar(page);
  await play(page).getByRole('button', { name: 'Reset' }).click();
  const shares = await sample(bar, 120);
  expect(shares.filter((s) => s > 0.02 && s < 0.4).length).toBeLessThanOrEqual(1);
  await expect.poll(() => share(bar)).toBeLessThan(0.005);
});
