import { expect, test } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Skeleton: shapes wait a beat before they show, carry one sheen while waiting, and hand over to the
// content in the same place; the region says it is busy until then.
const section = (page: import('@playwright/test').Page) => page.locator('section', { hasText: 'Playground' }).first();

for (const colorway of COLORWAYS) {
  test(`shows the shape of what is coming, then the content, in ${colorway}`, async ({ page }) => {
    await open(page, '/components/skeleton', colorway);
    const busy = section(page).getByRole('status', { name: 'Loading notes' });
    await expect(busy).toBeVisible();
    await expect(busy).toHaveAttribute('aria-busy', 'true');
    await page.waitForTimeout(700);
    await section(page).screenshot({ path: capture(`skeleton-${colorway}`) });
    await expect(section(page).getByText('Two copies of the plan, one folded for the car.')).toBeVisible({ timeout: 4000 });
    await expect(busy).toBeHidden();
  });
}

test('the shapes wait a beat, then sweep a sheen; the content lands where they stood', async ({ page }) => {
  await open(page, '/components/skeleton', 'bone');
  // Read the animation's own timeline, not the clock: how long two frames take differs between machines.
  const first = await section(page).evaluate(async (el) => {
    (([...el.querySelectorAll('button')].find((b) => b.textContent === 'Load again')) as HTMLElement).click();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const shape = el.querySelector('.mu-skeleton')!;
    const arrive = shape.getAnimations().find((a) => (a as CSSAnimation).animationName === 'mu-skeleton-arrive')!;
    arrive.pause();
    const timing = arrive.effect!.getTiming();
    arrive.currentTime = 0;
    const early = parseFloat(getComputedStyle(shape).opacity);
    arrive.currentTime = Number(timing.delay) + Number(timing.duration);
    const later = parseFloat(getComputedStyle(shape).opacity);
    const sheen = getComputedStyle(shape, '::after').animationName;
    const top = shape.closest('.mu-skeleton-swap')!.getBoundingClientRect().top;
    return { early, later, sheen, top, delay: Number(timing.delay) };
  });
  expect(first.delay).toBeGreaterThanOrEqual(200); // the shapes wait a beat before they show
  expect(first.early).toBeLessThan(0.05);
  expect(first.later).toBeGreaterThan(0.95);
  expect(first.sheen).toBe('mu-skeleton-sheen');
  await expect(section(page).getByText('Ana', { exact: true })).toBeVisible({ timeout: 4000 });
  const landed = await section(page).locator('.mu-skeleton-swap').first().evaluate((el) => el.getBoundingClientRect().top);
  expect(Math.abs(landed - first.top)).toBeLessThan(1);
});

test('Reduce Motion: no sheen', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/components/skeleton', 'graphite');
  const name = await section(page).locator('.mu-skeleton').first().evaluate((el) => getComputedStyle(el, '::after').animationName);
  expect(name).toBe('none');
});
