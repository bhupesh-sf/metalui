import { expect, test, type Page } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Carousel: a section with roledescription "carousel" whose slides are groups named "3 of 8"; the slides
// scroll natively with snap; Previous and Next step one slide and go quiet (aria-disabled) at the ends;
// ← → Home End step on the focused box; the readout says where you are and a polite status says it once
// the row settles; the next slide peeks; Reduce Motion jumps instead of gliding.
const carousel = (page: Page, name: string) => page.getByRole('region', { name, exact: true });
const box = (page: Page, name: string) => carousel(page, name).getByRole('group', { name: 'Slides', exact: true });
const key = (page: Page, name: string, which: 'Previous' | 'Next') => carousel(page, name).getByRole('button', { name: `${which} slide`, exact: true });
const readout = (page: Page, name: string) => carousel(page, name).locator('.mu-carousel-readout');
const status = (page: Page, name: string) => carousel(page, name).getByRole('status');
/** How far slide n (from 1) sits from where the box's slides start; 0 when it is the first in view. */
const offset = (page: Page, name: string, n: number) =>
  box(page, name).evaluate((b, i) => {
    const slide = b.querySelectorAll<HTMLElement>(':scope > [data-carousel-slide]')[i - 1];
    return slide.getBoundingClientRect().left - b.getBoundingClientRect().left - parseFloat(getComputedStyle(b).scrollPaddingLeft);
  }, n);

for (const colorway of COLORWAYS) {
  test(`steps with its keys and says where it is in ${colorway}`, async ({ page }) => {
    await open(page, '/components/carousel', colorway);
    const name = 'Listing photos';
    await expect(carousel(page, name)).toHaveAttribute('aria-roledescription', 'carousel');
    const slides = box(page, name).locator(':scope > [data-carousel-slide]');
    await expect(slides).toHaveCount(6);
    await expect(slides.nth(2)).toHaveAttribute('aria-roledescription', 'slide');
    await expect(slides.nth(2)).toHaveAttribute('aria-label', '3 of 6');
    await expect(key(page, name, 'Next')).toHaveAttribute('aria-controls', await box(page, name).getAttribute('id') ?? '');

    // At the start: Previous is quiet, nothing has been said, the readout starts at 1.
    await expect(key(page, name, 'Previous')).toHaveAttribute('aria-disabled', 'true');
    await expect(status(page, name)).toHaveText('');
    await expect(readout(page, name)).toHaveAttribute('data-face', /^1(–\d)? \/ 6$/);

    // Next: slide 2 lands at the start, the readout turns, the status speaks once it settles.
    await key(page, name, 'Next').click();
    await expect.poll(() => offset(page, name, 2).then(Math.round)).toBe(0);
    await expect(status(page, name)).toHaveText(/^2( to \d)? of 6$/);
    await expect(readout(page, name)).toHaveAttribute('data-face', /2(–\d)? \/ 6$/);
    await expect(key(page, name, 'Previous')).not.toHaveAttribute('aria-disabled');

    // Twice in a row counts from where it is going, not from where it is: 2 → 4.
    await key(page, name, 'Next').click();
    await key(page, name, 'Next').click();
    // Slide 4 is as far as the row goes (the last three in view): stepping from 3 would have stopped short.
    await expect(readout(page, name)).toHaveAttribute('data-face', '4–6 / 6');
    await expect(key(page, name, 'Next')).toHaveAttribute('aria-disabled', 'true');
    await page.waitForTimeout(500);
    await page.locator('section', { hasText: 'Playground' }).first().screenshot({ path: capture(`carousel-${colorway}`) });
  });
}

test('arrow keys, Home and End on the focused box; the end key goes quiet and keeps focus', async ({ page }) => {
  await open(page, '/components/carousel', 'bone');
  const name = 'Listing photos';
  await box(page, name).focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => offset(page, name, 2).then(Math.round)).toBe(0);
  await page.keyboard.press('End');
  await expect(key(page, name, 'Next')).toHaveAttribute('aria-disabled', 'true');
  await expect(status(page, name)).toHaveText(/of 6$/);
  // The last slide is fully in view.
  await expect(readout(page, name)).toHaveAttribute('data-face', /6 \/ 6$/);
  await page.keyboard.press('Home');
  await expect.poll(() => offset(page, name, 1).then(Math.round)).toBe(0);
  await expect(key(page, name, 'Previous')).toHaveAttribute('aria-disabled', 'true');

  // A quiet key still holds focus: stepping to the end with Next leaves focus on Next.
  await key(page, name, 'Next').focus();
  for (let i = 0; i < 6; i++) await page.keyboard.press('Enter');
  await expect(key(page, name, 'Next')).toHaveAttribute('aria-disabled', 'true');
  await expect(key(page, name, 'Next')).toBeFocused();
});

test('the next slide peeks; Tab into a slide scrolls it into view', async ({ page }) => {
  await open(page, '/components/carousel', 'bone');
  const name = 'Getting started';
  // One per view: the box minus the peek, so the second slide starts inside the box.
  const peek = await box(page, name).evaluate((b) => {
    const second = b.querySelectorAll<HTMLElement>(':scope > [data-carousel-slide]')[1];
    return b.getBoundingClientRect().right - second.getBoundingClientRect().left;
  });
  expect(peek).toBeGreaterThan(10);
  await expect(readout(page, name)).toHaveAttribute('data-face', /^1 \/ 3$/);

  // The shelf's cards are links: focusing the fourth scrolls the row to it.
  const shelf = 'Your trips';
  await carousel(page, shelf).getByRole('link', { name: 'Évora by bus' }).focus();
  await expect.poll(() => box(page, shelf).evaluate((b) => b.scrollLeft)).toBeGreaterThan(0);
  await expect(readout(page, shelf)).not.toHaveAttribute('data-face', /^1 /);
});

test('Reduce Motion: a step jumps instead of gliding', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/components/carousel', 'graphite');
  const name = 'Listing photos';
  await key(page, name, 'Next').click();
  // Landed within a frame of the click.
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(r)));
  expect(Math.round(await offset(page, name, 2))).toBe(0);
});

test('nothing runs at rest', async ({ page }) => {
  await open(page, '/components/carousel', 'bone');
  const running = await carousel(page, 'Listing photos').evaluate((el) =>
    el.getAnimations({ subtree: true }).filter((a) => a.playState === 'running' && a.effect?.getTiming().iterations === Infinity).length);
  expect(running).toBe(0);
});
