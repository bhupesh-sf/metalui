import { expect, test, type Locator, type Page } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Spinner: waiting shown where it happens, one clock (useWait). Default timing: a 400 ms show delay, at
// least 600 ms on screen, the result for 1400 ms; the page's pretend work takes 2400 ms.
const section = (page: Page, id: string) => page.locator(`section#${id}`);
const opacity = (el: Locator) => el.evaluate((n) => parseFloat(getComputedStyle(n).opacity));
const animation = (el: Locator) => el.evaluate((n) => getComputedStyle(n).animationName);

/** How long, in ms, `busy` stays set on `el` after `trigger` is clicked (and whether it ever showed its sign). */
async function heldFor(el: Locator, trigger: Locator) {
  await trigger.click();
  return el.evaluate(async (node) => {
    const t0 = performance.now();
    while (node.hasAttribute('data-busy') && performance.now() - t0 < 6000) await new Promise((r) => requestAnimationFrame(r));
    return performance.now() - t0;
  });
}

test.describe('timing', () => {
  test('a quick save never shows the arc; a brief one holds it for the minimum instead of flashing it', async ({ page }) => {
    await open(page, '/components/spinner', 'bone');
    const keys = section(page, 'timing');
    // Each key by its place: its name turns with its label.
    const quick = keys.getByRole('button').nth(0);
    await expect(quick).toHaveText(/Quick save/);
    await quick.click();
    const peak = await quick.evaluate(async (btn) => {
      const arc = btn.querySelector('.mu-button-arc')!;
      let max = 0;
      const t0 = performance.now();
      while (performance.now() - t0 < 600) {
        max = Math.max(max, parseFloat(getComputedStyle(arc).opacity));
        await new Promise((r) => requestAnimationFrame(r));
      }
      return max;
    });
    expect(peak).toBe(0);
    await expect(quick).toContainText('Saved');

    // 600 ms of work: the arc shows at 400 and stays 600, so the key is held about a second, not 600 ms.
    const brief = keys.getByRole('button').nth(1);
    const held = await heldFor(brief, brief);
    expect(held).toBeGreaterThan(950);
    await expect(brief).toContainText('Saved');
    await expect(brief).toContainText('Brief save', { timeout: 3000 });
  });

  test('the ring turns at a constant speed', async ({ page }) => {
    await open(page, '/components/spinner', 'bone');
    const row = section(page, 'small').getByTestId('spinner-row').first();
    await row.getByRole('button', { name: 'Archive' }).click();
    const arc = row.locator('.mu-spinner-arc');
    await expect.poll(() => opacity(arc)).toBe(1);
    const speeds = await arc.evaluate(async (el) => {
      const angle = () => parseFloat(getComputedStyle(el).rotate) || 0;
      const out: number[] = [];
      for (let i = 0; i < 4; i++) {
        const a = angle(), t = performance.now();
        await new Promise((r) => setTimeout(r, 120));
        out.push(((((angle() - a) % 360) + 360) % 360) / (performance.now() - t));
      }
      return out;
    });
    // 360° in 900 ms is 0.4° a millisecond.
    for (const s of speeds) expect(s).toBeCloseTo(0.4, 1);
  });
});

for (const colorway of COLORWAYS) {
  test.describe(colorway, () => {
    test(`on a small item: the ring takes the glyph's slot, the row dims and holds, then a tick, in ${colorway}`, async ({ page }) => {
      await open(page, '/components/spinner', colorway);
      const small = section(page, 'small');
      const row = small.getByTestId('spinner-row').first();
      await row.getByRole('button', { name: 'Archive' }).click();
      await expect(row).toHaveAttribute('aria-busy', 'true');
      await expect(row).toHaveCSS('pointer-events', 'none');
      const ring = row.locator('svg.mu-spinner');
      await expect(ring).toHaveAttribute('data-phase', 'shown');
      await expect.poll(() => opacity(ring.locator('.mu-spinner-arc'))).toBe(1);
      // The ring is the row's glyph: the option row's glyph size, in its ink2.
      await expect(ring).toHaveCSS('width', '14px');
      await expect.poll(() => opacity(row.locator('.mu-row-text'))).toBeLessThan(0.6);
      await small.getByTestId('spinner-chip').click();
      await small.getByRole('button', { name: 'Change photo' }).click();
      await expect.poll(() => opacity(small.locator('.mu-avatar-wait'))).toBe(1);
      await expect(page.getByRole('status').filter({ hasText: 'Archiving Harbour survey.pdf' })).toBeAttached();
      await small.screenshot({ path: capture(`spinner-small-${colorway}`) });

      await expect(ring).toHaveAttribute('data-phase', 'done', { timeout: 4000 });
      await expect.poll(() => opacity(ring.locator('.mu-spinner-tick'))).toBe(1);
      await expect(page.getByRole('status').filter({ hasText: 'Archived Harbour survey.pdf' })).toBeAttached();
      await expect(row).not.toHaveAttribute('aria-busy');
      await small.screenshot({ path: capture(`spinner-small-done-${colorway}`) });
      await expect(ring).toHaveAttribute('data-phase', 'idle', { timeout: 3000 });
    });

    test(`on a large item: the card's edge waits with words, then hands over to Progress, in ${colorway}`, async ({ page }) => {
      await open(page, '/components/spinner', colorway);
      const large = section(page, 'large');
      const card = large.getByTestId('spinner-card');
      await card.getByRole('button', { name: 'Lift subject' }).click();
      await expect(card).toHaveAttribute('aria-busy', 'true');
      await expect.poll(() => opacity(card.locator('.mu-card-wait'))).toBe(1);
      await expect(card).toContainText('Lifting the subject…');
      const exp = large.getByTestId('spinner-export');
      await exp.getByRole('button', { name: 'Export' }).click();
      await expect(exp.getByRole('progressbar')).toBeVisible({ timeout: 3000 });
      await expect(exp.locator('.mu-card-wait')).toHaveCount(0);
      await large.screenshot({ path: capture(`spinner-large-${colorway}`) });
      await expect(card).toContainText('Subject lifted', { timeout: 4000 });
      await expect(card.locator('.mu-card-wait')).toHaveCount(0);
    });

    test(`in a field: the ring takes the clear key's place while it searches, in ${colorway}`, async ({ page }) => {
      await open(page, '/components/spinner', colorway);
      const field = section(page, 'field');
      await field.getByRole('textbox', { name: 'Search places' }).fill('Li');
      const ring = field.getByTestId('spinner-field').locator('svg.mu-spinner');
      await expect(ring).toHaveAttribute('data-phase', 'shown');
      await expect(field.getByRole('button', { name: 'Clear search' })).toHaveCount(0);
      await expect.poll(() => opacity(ring.locator('.mu-spinner-arc'))).toBe(1);
      await field.screenshot({ path: capture(`spinner-field-${colorway}`) });
      await expect(field.getByRole('button', { name: 'Clear search' })).toBeVisible({ timeout: 4000 });
      await expect(field.getByRole('listitem')).toHaveText(['Lisbon', 'Lima', 'Lille', 'Linz']);
    });

    test(`for the whole place: skeletons first, then a thin bar on a route change, in ${colorway}`, async ({ page }) => {
      await open(page, '/components/spinner', colorway);
      const place = section(page, 'place').getByTestId('spinner-place');
      await place.getByRole('button', { name: 'Open Notes' }).click();
      await expect(place.getByRole('status', { name: 'Loading Notes' })).toBeVisible();
      await expect(place.getByText('Pick up the prints on Thursday')).toBeVisible({ timeout: 5000 });
      await place.getByRole('radio', { name: 'Photos' }).click();
      const bar = place.locator('.mu-spinner-bar');
      await expect(bar).toHaveAttribute('data-phase', 'shown');
      await expect.poll(() => opacity(bar)).toBe(1);
      await page.waitForTimeout(500);
      await place.screenshot({ path: capture(`spinner-place-${colorway}`) });
      await expect(place.locator('img')).toHaveCount(3, { timeout: 5000 });
      await expect.poll(() => opacity(bar), { timeout: 3000 }).toBe(0);
    });

    test(`background work: the lamp breathes and nothing is held, in ${colorway}`, async ({ page }) => {
      await open(page, '/components/spinner', colorway);
      const sync = section(page, 'background').getByTestId('spinner-sync');
      await sync.getByRole('button', { name: 'Sync now' }).click();
      await expect(sync.locator('.mu-led')).toHaveAttribute('data-gesture', 'breathe');
      await expect(sync).toContainText('Syncing 3 notes…');
      await sync.getByRole('textbox', { name: 'A note' }).fill('Still typing');
      await expect(sync.getByRole('textbox', { name: 'A note' })).toHaveValue('Still typing');
      await sync.screenshot({ path: capture(`spinner-background-${colorway}`) });
      await expect(sync).toContainText('Synced just now', { timeout: 4000 });
      await expect(sync.locator('.mu-led')).toHaveAttribute('data-kind', 'live');
    });

    test(`known or unknown: the ring turns, then fills once the amount is known, in ${colorway}`, async ({ page }) => {
      await open(page, '/components/spinner', colorway);
      const known = section(page, 'known');
      const row = known.getByTestId('spinner-upload');
      await row.getByRole('button', { name: 'Upload' }).click();
      await known.getByTestId('spinner-attachment').getByRole('button', { name: 'Upload again' }).click();
      // Unknown first: the ring shows turning (sampled once, before the amount arrives at 800 ms).
      await expect(row.locator('svg.mu-spinner')).toHaveAttribute('data-phase', /quiet|shown/);
      expect(await row.locator('svg.mu-spinner').getAttribute('data-known')).toBeNull();
      const ring = row.getByRole('progressbar', { name: 'Uploading harbour.jpg' });
      await expect(ring).toBeAttached({ timeout: 3000 });
      await expect.poll(async () => Number(await ring.getAttribute('aria-valuenow'))).toBeGreaterThan(30);
      await expect.poll(() => opacity(row.locator('.mu-spinner-fill'))).toBe(1);
      await expect(known.getByTestId('spinner-attachment')).toContainText(/Uploading · \d+ %/);
      await known.screenshot({ path: capture(`spinner-known-${colorway}`) });
    });

    test(`the playground, in ${colorway}`, async ({ page }) => {
      await open(page, '/components/spinner', colorway);
      const play = page.locator('section', { hasText: 'Playground' }).first();
      await play.getByRole('button', { name: 'Save' }).click();
      await play.getByTestId('spinner-chip').click();
      await play.getByRole('button', { name: 'Archive' }).click();
      await play.getByRole('button', { name: 'Lift subject' }).click();
      await play.getByRole('textbox', { name: 'Search places' }).fill('Ly');
      await page.waitForTimeout(900);
      await play.screenshot({ path: capture(`spinner-${colorway}`) });
    });
  });
}

test('Reduce Motion: nothing turns, creeps or travels; the signs breathe in place', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/components/spinner', 'graphite');
  const row = section(page, 'small').getByTestId('spinner-row').first();
  await row.getByRole('button', { name: 'Archive' }).click();
  const arc = row.locator('.mu-spinner-arc');
  await expect.poll(() => animation(arc)).toBe('mu-progress-breathe');
  await expect(arc).toHaveCSS('rotate', 'none');

  const card = section(page, 'large').getByTestId('spinner-card');
  await card.getByRole('button', { name: 'Lift subject' }).click();
  await expect.poll(() => animation(card.locator('.mu-card-wait > span'))).toBe('mu-progress-breathe');

  await section(page, 'small').getByRole('button', { name: 'Change photo' }).click();
  await expect.poll(() => animation(section(page, 'small').locator('.mu-avatar-wait circle'))).toBe('mu-progress-breathe');

  // Done: the tick is whole at once, not drawn.
  await expect(row.locator('svg.mu-spinner')).toHaveAttribute('data-phase', 'done', { timeout: 4000 });
  await expect(row.locator('.mu-spinner-tick')).toHaveCSS('animation-name', 'none');
  await expect(row.locator('.mu-spinner-tick')).toHaveCSS('stroke-dashoffset', '0px');
});

test('at rest nothing waits and nothing loops', async ({ page }) => {
  await open(page, '/components/spinner', 'bone');
  await page.waitForTimeout(600);
  const running = await page.evaluate(() => document.getAnimations().filter((a) => {
    const t = a.effect?.getComputedTiming();
    const target = (a.effect as KeyframeEffect | null)?.target;
    return t?.iterations === Infinity && a.playState === 'running' && target?.closest('main') && !target.closest('.mu-led');
  }).length);
  expect(running).toBe(0);
  await expect(page.locator('main [aria-busy="true"]')).toHaveCount(0);
});
