import { expect, test, type Locator, type Page } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Stepper: a wizard's steps. An ordered list with aria-current="step"; steps you can't reach yet aren't
// buttons; Continue can be refused (the step rings and says why) and can wait (the step's ring and the
// key agree); panels stay mounted, so going back keeps input; the thumb glides, the groove fills by
// transform, the new panel drifts in from the way you went and takes focus; narrow lists say one line.

const playground = (page: Page) => page.locator('section', { hasText: 'Playground' }).first();
const step = (scope: Locator, name: string) => scope.getByRole('listitem').filter({ hasText: name });

/** Samples, every frame for `ms` after `act`, the thumb's translate and the first groove's fill. */
async function sample(scope: Locator, ms: number, act: () => Promise<void>) {
  await scope.evaluate((el, ms) => {
    const thumb = el.querySelector<HTMLElement>('.mu-stepper-thumb')!;
    const fill = el.querySelector<HTMLElement>('.mu-stepper-fill')!;
    const out: { x: number; fill: number }[] = [];
    (window as unknown as { __frames: typeof out }).__frames = out;
    const t0 = performance.now();
    const frame = () => {
      out.push({ x: parseFloat(getComputedStyle(thumb).translate) || 0, fill: parseFloat(getComputedStyle(fill).translate) || 0 });
      if (performance.now() - t0 < ms) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }, ms);
  await act();
  await scope.page().waitForTimeout(ms + 100);
  return scope.page().evaluate(() => (window as unknown as { __frames: { x: number; fill: number }[] }).__frames);
}

for (const colorway of COLORWAYS) {
  test(`a checkout: refuse, wait, go back without losing input in ${colorway}`, async ({ page }) => {
    await open(page, '/components/stepper', colorway);
    const section = playground(page);
    const list = section.getByRole('list', { name: 'Checkout steps' });
    await expect(list.locator('[aria-current="step"]')).toContainText('Cart');
    // Not reached yet: text, not a button.
    await expect(step(list, 'Shipping').getByRole('button')).toHaveCount(0);
    await expect(step(list, 'Shipping')).toContainText('not available yet');

    const next = section.getByRole('button', { name: /Continue/ });
    await next.click();
    await expect(list.locator('[aria-current="step"]')).toContainText('Shipping');
    await expect(step(list, 'Cart').getByRole('button')).toContainText('completed');
    // Focus went to the new panel.
    await expect(section.getByRole('group', { name: 'Shipping' })).toBeFocused();

    // Refused: no address. The step rings and says why; the field says the rest.
    await next.click();
    await expect(list.locator('[aria-current="step"]')).toContainText('Shipping');
    await expect(step(list, 'Shipping')).toContainText('Add an address');
    await expect(step(list, 'Shipping').locator('.mu-stepper-indicator')).toHaveClass(/invalid-ring/);
    await expect(section.getByText('so the prints can find you')).toBeVisible();

    await section.getByRole('textbox', { name: 'Address' }).fill('Rua da Rosa 12');
    await expect(step(list, 'Shipping')).not.toContainText('Add an address');
    await next.click();
    await expect(list.locator('[aria-current="step"]')).toContainText('Payment');

    // Payment waits: the step is busy, its ring shows after the show delay, the key waits too.
    await section.getByRole('button', { name: /Continue/ }).click();
    await expect(step(list, 'Payment')).toHaveAttribute('aria-busy', 'true');
    await expect(step(list, 'Payment').locator('.mu-spinner')).toBeVisible();
    await expect(list.locator('[aria-current="step"]')).toContainText('Review', { timeout: 4000 });
    await expect(step(list, 'Payment')).not.toHaveAttribute('aria-busy', 'true');
    await expect(section.getByRole('button', { name: /Place order/ })).toBeVisible();
    await page.waitForTimeout(1800);
    await section.screenshot({ path: capture(`stepper-${colorway}`) });

    // Back to Shipping by its step: what was typed is still there.
    await step(list, 'Shipping').getByRole('button').click();
    await expect(section.getByRole('textbox', { name: 'Address' })).toHaveValue('Rua da Rosa 12');
    await expect(step(list, 'Shipping').getByRole('button')).toBeFocused();
    // Review stays reachable: it was reached.
    await expect(step(list, 'Review').getByRole('button')).toHaveCount(1);
  });
}

test('the thumb glides to the new step and the groove fills by transform, on settle', async ({ page }) => {
  await open(page, '/components/stepper', 'bone');
  const section = playground(page);
  const frames = await sample(section, 900, () => section.getByRole('button', { name: /Continue/ }).click());
  const start = frames[0].x;
  const end = frames.at(-1)!.x;
  expect(end).toBeGreaterThan(start + 60);
  // It travels through the frames between, not in one jump.
  expect(frames.some((f) => f.x > start + 5 && f.x < end - 5)).toBe(true);
  // The groove's fill slides in from -100 % to 0, through the middle.
  expect(frames[0].fill).toBeLessThan(-50);
  expect(frames.some((f) => f.fill > -90 && f.fill < -10)).toBe(true);
  expect(frames.at(-1)!.fill).toBe(0);
  // Where it lands is where the current indicator is.
  const lands = await section.evaluate((el) => {
    const ind = el.querySelector('[aria-current="step"] .mu-stepper-indicator')!.getBoundingClientRect();
    const thumb = el.querySelector('.mu-stepper-thumb')!.getBoundingClientRect();
    return Math.abs(ind.left - thumb.left) + Math.abs(ind.top - thumb.top);
  });
  expect(lands).toBeLessThan(1);
});

test('the new panel drifts in from the way you went', async ({ page }) => {
  await open(page, '/components/stepper', 'graphite');
  const section = page.locator('#inline');
  const drift = async (act: () => Promise<void>) => {
    await act();
    return section.locator('.mu-stepper-panel:not([hidden])').evaluate((p) => parseFloat(getComputedStyle(p).translate) || 0);
  };
  // The first panel shows still.
  expect(await section.locator('.mu-stepper-panel:not([hidden])').evaluate((p) => getComputedStyle(p).animationName)).toBe('none');
  expect(await drift(() => section.getByRole('button', { name: /Continue/ }).click())).toBeGreaterThan(0);
  await page.waitForTimeout(600);
  expect(await drift(() => section.getByRole('button', { name: 'Back' }).click())).toBeLessThan(0);
  await expect(section.getByRole('group', { name: 'Name' })).toBeFocused();
  await expect(section.getByRole('textbox', { name: 'Region name' })).toHaveValue('Alfama sketches');
});

test('every state is said in words, and only reachable steps are buttons', async ({ page }) => {
  await open(page, '/components/stepper', 'bone');
  const list = page.locator('#states').getByRole('list', { name: 'Account steps' });
  await expect(step(list, 'Account').getByRole('button')).toContainText('completed');
  await expect(step(list, 'Profile').getByRole('button')).toContainText('has a problem: Add a photo');
  await expect(step(list, 'Plan').getByRole('button')).toHaveAttribute('aria-current', 'step');
  await expect(step(list, 'Import').getByRole('button')).toHaveCount(0);
  await expect(step(list, 'Invite').getByRole('button')).toHaveCount(0);
  await expect(step(list, 'Invite')).toContainText('unavailable');
  await page.locator('#states').screenshot({ path: capture('stepper-states-bone') });
});

test('vertical: the panel opens under its step, and Continue inside it moves on', async ({ page }) => {
  await open(page, '/components/stepper', 'graphite');
  const section = page.locator('#vertical');
  const list = section.getByRole('list', { name: 'Sync setup steps' });
  await expect(step(list, 'Sign in').getByRole('group', { name: 'Sign in' })).toBeVisible();
  await step(list, 'Sign in').getByRole('button', { name: /Continue/ }).click();
  await expect(step(list, 'This device').getByRole('group', { name: 'This device' })).toBeVisible();
  await expect(step(list, 'Sign in').getByRole('group')).toBeHidden();
  await page.waitForTimeout(700);
  await section.screenshot({ path: capture('stepper-vertical-graphite') });
});

test('out of width: the titles stay for readers and one line says where you are', async ({ page }) => {
  await open(page, '/components/stepper', 'bone');
  const section = page.locator('#narrow');
  const now = section.locator('.mu-stepper-now');
  await expect(now).toBeVisible();
  await expect(now).toContainText('Step 1 of 4 · Cart');
  const title = section.locator('.mu-stepper-title').first();
  expect(await title.evaluate((t) => t.getBoundingClientRect().width)).toBeLessThanOrEqual(1);
  await expect(section.getByRole('list', { name: 'Narrow checkout steps' }).locator('[aria-current="step"]')).toContainText('Step 1: Cart');
  // A wide list shows no line.
  await expect(playground(page).locator('.mu-stepper-now')).toBeHidden();
  await section.screenshot({ path: capture('stepper-narrow-bone') });
});

test('Reduce Motion: the thumb and the fill move at once, the panel only fades', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/components/stepper', 'graphite');
  const section = playground(page);
  const frames = await sample(section, 300, () => section.getByRole('button', { name: /Continue/ }).click());
  const end = frames.at(-1)!.x;
  expect(frames.filter((f) => f.x > frames[0].x + 1 && f.x < end - 1)).toHaveLength(0);
  expect(frames.filter((f) => f.fill < -1 && f.fill > -99)).toHaveLength(0);
  const panel = section.locator('.mu-stepper-panel:not([hidden])');
  expect(await panel.evaluate((p) => parseFloat(getComputedStyle(p).translate) || 0)).toBe(0);
  expect(await panel.evaluate((p) => getComputedStyle(p).animationName)).toBe('mu-stepper-in');
});
