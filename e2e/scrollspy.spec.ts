import { expect, test, type Page } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Scrollspy: the section at the top of its scroller is current (aria-current="location") and one marker
// glides under its entry; picking an entry scrolls there smoothly, the marker travelling once; at the end
// of the scroll the last section is current; the strip keeps its current entry in view; the docs' own
// "On this page" is the same component on the window, clear of the masthead, with the hash following.
const spy = (page: Page, name: string) => page.getByRole('navigation', { name, exact: true });
const pane = (page: Page, name: string) => page.getByRole('region', { name: `${name}: the guide` });
const current = (page: Page, name: string) => spy(page, name).locator('[aria-current="location"]');
/** How far a section's top sits below its pane's top. */
const gap = (page: Page, name: string, id: string) =>
  pane(page, name).evaluate((p, sid) => document.getElementById(sid)!.getBoundingClientRect().top - p.getBoundingClientRect().top, id);

for (const colorway of COLORWAYS) {
  test(`follows the reading and jumps in ${colorway}`, async ({ page }) => {
    await open(page, '/components/scrollspy', colorway);
    await expect(current(page, 'Guide contents')).toHaveText('Arrival');

    // Reading: scroll the pane until Tram 28 is at the top.
    await pane(page, 'Guide contents').evaluate((p) => { p.scrollTop = document.getElementById('spy-tram')!.offsetTop - p.offsetTop; });
    await expect(current(page, 'Guide contents')).toHaveText('Tram 28');

    // Jump: the entry is current at once, the pane lands its section at the top, focus goes with it.
    await spy(page, 'Guide contents').getByRole('link', { name: 'Sintra' }).click();
    await expect(current(page, 'Guide contents')).toHaveText('Sintra');
    await expect.poll(() => gap(page, 'Guide contents', 'spy-sintra').then(Math.round)).toBeLessThanOrEqual(1);
    await expect(page.locator('#spy-sintra')).toBeFocused();
    await page.waitForTimeout(400);
    await page.locator('section', { hasText: 'Playground' }).first().screenshot({ path: capture(`scrollspy-${colorway}`) });
  });
}

test('a jump travels once: the marker never ticks through the sections passed', async ({ page }) => {
  await open(page, '/components/scrollspy', 'bone');
  // Sample the current entry every frame while the pane scrolls from the top to the bottom.
  const seen = page.evaluate(() => new Promise<string[]>((resolve) => {
    const nav = document.querySelector('nav[aria-label="Guide contents"]')!;
    const all = new Set<string>();
    const start = performance.now();
    const tick = () => {
      const on = nav.querySelector('[aria-current="location"]');
      if (on) all.add(on.textContent ?? '');
      if (performance.now() - start < 1500) requestAnimationFrame(tick);
      else resolve([...all]);
    };
    requestAnimationFrame(tick);
  }));
  await spy(page, 'Guide contents').getByRole('link', { name: 'Leaving' }).click();
  expect((await seen).filter((t) => t !== 'Arrival')).toEqual(['Leaving']);
  // The pane moved smoothly (more than a frame), and the marker glides on the settle spring.
  const marker = spy(page, 'Guide contents').locator('.mu-indicator');
  await expect(marker).toHaveAttribute('data-spring', 'settle');
  expect(await marker.evaluate((el) => getComputedStyle(el).transitionProperty)).toContain('transform');
});

test('at the end of the scroll the last section is current', async ({ page }) => {
  await open(page, '/components/scrollspy', 'bone');
  await pane(page, 'Guide contents').evaluate((p) => p.scrollTo({ top: p.scrollHeight }));
  await expect(current(page, 'Guide contents')).toHaveText('Leaving');
  await pane(page, 'Guide contents').evaluate((p) => p.scrollTo({ top: 0 }));
  await expect(current(page, 'Guide contents')).toHaveText('Arrival');
});

test('the strip keeps its current entry in view, without scrolling the page', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 900 });
  await open(page, '/components/scrollspy', 'graphite');
  const strip = spy(page, 'Guide strip');
  await strip.scrollIntoViewIfNeeded();
  await expect(strip.locator('.mu-indicator')).toHaveAttribute('data-spring', 'part');
  const y = await page.evaluate(() => window.scrollY);
  await pane(page, 'Guide strip').evaluate((p) => p.scrollTo({ top: p.scrollHeight }));
  await expect(current(page, 'Guide strip')).toHaveText('Leaving');
  await expect.poll(() => strip.locator('.mu-switcher').evaluate((s) => {
    const on = s.querySelector('[aria-current="location"]')!.getBoundingClientRect();
    const box = s.getBoundingClientRect();
    return on.left >= box.left - 1 && on.right <= box.right + 1;
  })).toBe(true);
  expect(await page.evaluate(() => window.scrollY)).toBe(y);
  await page.waitForTimeout(400);
  await page.locator('section#strip').screenshot({ path: capture('scrollspy-strip-graphite') });
});

test('Reduce Motion: the jump is instant and the marker moves at once', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/components/scrollspy', 'bone');
  await spy(page, 'Guide contents').getByRole('link', { name: 'Alfama' }).click();
  // No smooth scroll: the section is at the top on the next frame.
  await page.evaluate(() => new Promise(requestAnimationFrame));
  expect(Math.round(await gap(page, 'Guide contents', 'spy-alfama'))).toBeLessThanOrEqual(1);
  const marker = spy(page, 'Guide contents').locator('.mu-indicator');
  await expect(marker).toHaveAttribute('data-animate', 'true');
  expect(await marker.evaluate((el) => Math.max(...getComputedStyle(el).transitionDuration.split(',').map(parseFloat)))).toBeLessThan(0.001);
});

test("the docs' On this page: the window, clear of the masthead, the hash follows", async ({ page }) => {
  await open(page, '/components/scrollspy', 'bone');
  const toc = spy(page, 'On this page');
  await expect(toc.getByRole('link', { name: 'Tune the marker' })).toBeVisible();
  const before = await page.evaluate(() => history.length);
  await toc.getByRole('link', { name: 'Tune the marker' }).click();
  await expect(current(page, 'On this page')).toHaveText('Tune the marker');
  await expect(page).toHaveURL(/#tune$/);
  // It lands under html's scroll-padding-top (88: the masthead and a breath), not under the header.
  await expect.poll(() => page.locator('#tune').evaluate((el) => Math.round(el.getBoundingClientRect().top))).toBe(88);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await expect(current(page, 'On this page')).toHaveText('Usage');
  await expect(page).toHaveURL(/#usage$/);
  await page.waitForTimeout(400);
  await page.locator('aside.toc').screenshot({ path: capture('scrollspy-toc-bone') });
  // Replaced, never pushed: Back still leaves the page.
  expect(await page.evaluate(() => history.length)).toBe(before);
});
