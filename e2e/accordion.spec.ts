import { expect, test } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Accordion: one section at a time opens in place; the panel grows on settle without overshooting,
// the chevron turns on the part spring and may overshoot; Tab moves between headers.
for (const colorway of COLORWAYS) {
  test(`opens one section at a time and moves by Tab in ${colorway}`, async ({ page }) => {
    await open(page, '/components/accordion', colorway);
    const section = page.locator('section', { hasText: 'Playground' }).first();
    const exportBtn = section.getByRole('button', { name: 'Export options' });
    const sharing = section.getByRole('button', { name: 'Sharing' });
    await expect(exportBtn).toHaveAttribute('aria-expanded', 'true');
    await sharing.click();
    await expect(sharing).toHaveAttribute('aria-expanded', 'true');
    await expect(exportBtn).toHaveAttribute('aria-expanded', 'false');
    await expect(section.getByText('Anyone with the link can view.')).toBeVisible();

    await sharing.focus();
    await page.keyboard.press('Tab');
    await expect(section.getByRole('button', { name: 'History' })).toBeFocused();
    await page.keyboard.press('Space');
    await expect(section.getByRole('button', { name: 'History' })).toHaveAttribute('aria-expanded', 'true');
    await expect(section.getByRole('button', { name: 'Billing (owners only)' })).toBeDisabled();
    await page.waitForTimeout(700);
    await section.screenshot({ path: capture(`accordion-${colorway}`) });
  });
}

test('the panel grows without overshoot while the chevron overshoots its stop', async ({ page }) => {
  await open(page, '/components/accordion', 'bone');
  const section = page.locator('section', { hasText: 'Playground' }).first();
  const frames = await section.getByRole('button', { name: 'History' }).evaluate(async (btn) => {
    const item = btn.closest('.mu-accordion-item')!;
    const chev = btn.querySelector('svg')!;
    (btn as HTMLElement).click();
    const out: { h: number; r: number }[] = [];
    const t0 = performance.now();
    await new Promise<void>((done) => {
      const frame = () => {
        const p = item.querySelector('.mu-accordion-panel');
        out.push({ h: p ? p.getBoundingClientRect().height : 0, r: parseFloat(getComputedStyle(chev).rotate) || 0 });
        if (performance.now() - t0 < 700) requestAnimationFrame(frame); else done();
      };
      requestAnimationFrame(frame);
    });
    return out;
  });
  const end = frames.at(-1)!;
  expect(end.h).toBeGreaterThan(20);
  expect(Math.max(...frames.map((f) => f.h))).toBeLessThanOrEqual(end.h + 0.5);
  expect(frames.some((f) => f.h > 1 && f.h < end.h - 1)).toBe(true);
  expect(Math.max(...frames.map((f) => f.r))).toBeGreaterThan(92);
  expect(end.r).toBeCloseTo(90, 0);
});

test('Reduce Motion: the height and chevron snap', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/components/accordion', 'graphite');
  const section = page.locator('section', { hasText: 'Playground' }).first();
  const history = section.getByRole('button', { name: 'History' });
  await history.click();
  const panel = history.locator('xpath=ancestor::*[contains(@class,"mu-accordion-item")][1]').locator('.mu-accordion-panel');
  // It lands at full height within a frame or two, not over the settle spring's 440 ms.
  await expect.poll(() => panel.evaluate((p) => Math.abs(p.getBoundingClientRect().height - p.scrollHeight)), { timeout: 150, intervals: [16] }).toBeLessThan(0.5);
  const settled = { r: await history.locator('svg').evaluate((c) => getComputedStyle(c).rotate) };
  expect(settled.r).toBe('90deg');
});
