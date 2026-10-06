import { expect, test, type Locator, type Page } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Link: always underlined; hover raises, thickens and darkens the line over a tint; pressed sinks and
// dims; visited, current, disabled and loading; external and download glyphs that act; quiet and
// standalone kinds; every state held on the page in both colorways; the x-ray handles the real link.
const play = (page: Page) => page.getByLabel('Example paragraph');
const style = (l: Locator, prop: string) => l.evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop);
const cell = (page: Page, colorway: string, state: string) => page.getByTestId(`link-states-${colorway}`).locator(`[data-state="${state}"] a`);

for (const colorway of COLORWAYS) {
  test(`underlined at rest; hover raises, thickens and darkens the line over a tint, in ${colorway}`, async ({ page }) => {
    await open(page, '/components/link', colorway);
    const guide = play(page).getByRole('link', { name: 'the export guide' });
    const line = guide.locator('.mu-link-line');
    await expect(line).toHaveCSS('text-decoration-line', 'underline');
    await expect(line).toHaveCSS('text-underline-position', 'under');
    const rest = await style(line, 'text-decoration-color');
    await expect(line).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await guide.hover();
    await expect.poll(() => style(line, 'text-decoration-color')).not.toBe(rest);
    await expect.poll(() => line.evaluate((el) => getComputedStyle(el).textDecorationColor === getComputedStyle(el).color)).toBe(true);
    await expect.poll(() => style(line, 'text-underline-offset')).toBe('-1.5px');
    await expect.poll(() => style(line, 'text-decoration-thickness')).toBe('1.5px');
    await expect(line).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');

    const out = play(page).getByRole('link', { name: /links stay visible without colour \(opens in a new tab\)/ });
    await expect(out).toHaveAttribute('target', '_blank');
    await expect(out).toHaveAttribute('rel', 'noopener noreferrer');
    await out.focus();
    await expect(out).toHaveCSS('outline-style', 'solid');
    await page.locator('section', { hasText: 'Playground' }).first().screenshot({ path: capture(`link-${colorway}`) });
  });

  test(`every state is held on the page, in ${colorway}`, async ({ page }) => {
    await open(page, '/components/link', colorway);
    const strip = page.getByTestId(`link-states-${colorway}`);
    await expect(strip).toHaveAttribute('data-mu-colorway', colorway);
    const names = await strip.locator('[data-state]').evaluateAll((els) => els.map((e) => e.getAttribute('data-state')));
    expect(names).toEqual(['rest', 'hover', 'pressed', 'focus', 'visited', 'current', 'disabled', 'loading', 'external', 'download', 'quiet', 'standalone']);
    const line = (state: string) => cell(page, colorway, state).locator('.mu-link-line');

    // the line is there in every state but current and disabled (and quiet, until hover)
    for (const s of ['rest', 'hover', 'pressed', 'focus', 'visited', 'loading', 'external', 'download', 'standalone']) await expect(line(s)).toHaveCSS('text-decoration-line', 'underline');
    for (const s of ['current', 'disabled']) await expect(line(s)).toHaveCSS('text-decoration-line', 'none');
    await expect(line('quiet')).toHaveCSS('text-decoration-color', 'rgba(0, 0, 0, 0)');

    await expect(line('hover')).toHaveCSS('text-underline-offset', '-1.5px');
    await expect(cell(page, colorway, 'pressed')).toHaveCSS('opacity', '0.64');
    await expect(cell(page, colorway, 'pressed')).toHaveCSS('top', '1px');
    await expect(cell(page, colorway, 'focus')).toHaveCSS('outline-style', 'solid');
    await expect(cell(page, colorway, 'visited')).toHaveAttribute('data-visited', '');
    await expect(cell(page, colorway, 'current')).toHaveAttribute('aria-current', 'page');

    const off = cell(page, colorway, 'disabled');
    await expect(off).toHaveAttribute('aria-disabled', 'true');
    await expect(off).not.toHaveAttribute('href', /.*/);
    await expect(off).toHaveCSS('cursor', 'default');
    const ink3 = await strip.evaluate((el) => { const p = document.createElement('i'); p.style.color = 'var(--mu-ink3)'; el.append(p); const c = getComputedStyle(p).color; p.remove(); return c; });
    await expect(off).toHaveCSS('color', ink3);

    const loading = cell(page, colorway, 'loading');
    await expect(loading).toHaveAttribute('aria-busy', 'true');
    await expect(line('loading')).toHaveCSS('animation-name', 'mu-link-run');
    // held still: the strip asks for no frames
    await expect(line('loading')).toHaveCSS('animation-play-state', 'paused');

    await expect(cell(page, colorway, 'external').locator('.mu-ic-external')).toBeVisible();
    await expect(cell(page, colorway, 'standalone')).toHaveCSS('display', 'block');
    await expect(cell(page, colorway, 'standalone').locator('.mu-ic-chevron')).toBeVisible();
    await strip.screenshot({ path: capture(`link-states-${colorway}`) });
  });
}

test('the external glyph plays its act on hover, keeps punctuation on its line, and is still under Reduce Motion', async ({ page }) => {
  await open(page, '/components/link', 'bone');
  const link = play(page).getByRole('link', { name: /links stay visible/ });
  const glyph = link.locator('.mu-link-glyph svg');
  await expect(glyph).toHaveClass(/mu-ic-external/);
  await expect(link.locator('.mu-link-glyph')).toHaveCSS('text-decoration-line', 'none');
  await link.hover();
  await expect.poll(() => glyph.evaluate((el) => el.getAnimations({ subtree: true }).length)).toBeGreaterThan(0);

  // narrowed one step at a time, the glyph never wraps away from the last word, nor the period from the glyph
  const broken = await play(page).evaluate((para: HTMLElement) => {
    const a = para.querySelector('a[target=_blank]')!, g = a.querySelector('.mu-link-glyph')!, dot = a.nextSibling!;
    const words = a.querySelector('.mu-link-line')!.firstChild as Text;
    const bottom = (node: Node, at: number) => { const r = document.createRange(); r.setStart(node, at); r.setEnd(node, at + 1); return r.getBoundingClientRect().bottom; };
    const out: number[] = [];
    for (let w = 160; w <= 440; w++) {
      para.style.maxWidth = `${w}px`;
      const gb = g.getBoundingClientRect().bottom;
      if (Math.abs(bottom(dot, 0) - gb) > 6 || Math.abs(bottom(words, words.length - 1) - gb) > 6) out.push(w);
    }
    para.style.maxWidth = '';
    return out;
  });
  expect(broken).toEqual([]);

  await page.mouse.move(0, 0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(1200); // any act already running finishes
  await link.hover();
  await page.waitForTimeout(100);
  expect(await glyph.evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
  // the line changes without rising
  expect(parseFloat(await style(link.locator('.mu-link-line'), 'transition-duration'))).toBeLessThan(0.001);
});

test('a download link carries the glyph and its size, outside the underline, and says so', async ({ page }) => {
  await open(page, '/components/link', 'bone');
  const file = play(page).getByRole('link', { name: 'the whole agent guide (download, 200 KB)' });
  await expect(file).toHaveAttribute('download', '');
  await expect(file.locator('.mu-link-glyph svg')).toBeVisible();
  await expect(file.locator('.mu-link-size')).toHaveText('· 200 KB');
  await expect(file.locator('.mu-link-size')).toHaveCSS('text-decoration-line', 'none');
  await file.hover();
  await expect.poll(() => file.locator('.mu-link-glyph svg').evaluate((el) => el.getAnimations({ subtree: true }).length)).toBeGreaterThan(0);
});

test('pressed, the words sink one step and dim', async ({ page }) => {
  await open(page, '/components/link', 'bone');
  const guide = play(page).getByRole('link', { name: 'the export guide' });
  const before = (await guide.locator('.mu-link-line').boundingBox())!.y;
  await guide.hover();
  await page.mouse.down();
  await expect(guide).toHaveCSS('opacity', '0.64');
  expect((await guide.locator('.mu-link-line').boundingBox())!.y - before).toBeCloseTo(1, 1);
  await page.mouse.up();
  await expect(guide).not.toHaveCSS('opacity', '0.64');
});

test('a loading link runs along its line until its route arrives; under Reduce Motion it breathes', async ({ page }) => {
  await open(page, '/components/link', 'bone');
  const region = play(page).getByRole('link', { name: /the Lisbon region/ });
  const line = region.locator('.mu-link-line');
  await expect(line).toHaveCSS('animation-name', 'none');
  await region.click();
  await expect(region).toHaveAttribute('aria-busy', 'true');
  await expect(region).toHaveAccessibleName('the Lisbon region (loading)');
  await expect(line).toHaveCSS('animation-name', 'mu-link-run');
  await expect(line).toHaveCSS('animation-play-state', 'running');
  // hovered while it waits, the line does not rise: the run is the only thing moving
  await region.hover();
  await expect(line).toHaveCSS('text-underline-offset', '0px');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(line).toHaveCSS('animation-name', 'mu-link-breathe');
  await expect(region).not.toHaveAttribute('aria-busy', 'true', { timeout: 4000 });
  await expect(line).toHaveCSS('animation-name', 'none');
});

test('a disabled link stays focusable, refuses, and says why in a tooltip', async ({ page }) => {
  await open(page, '/components/link', 'bone');
  const off = cell(page, 'bone', 'disabled');
  await expect(off).toHaveAccessibleName('the export guide (Export is on the Pro plan)');
  const url = page.url();
  await off.click({ force: true });
  expect(page.url()).toBe(url);
  // reached from the keyboard, it takes focus and its tooltip says why
  await cell(page, 'bone', 'current').focus();
  await page.keyboard.press('Tab');
  await expect(off).toBeFocused();
  await expect(page.getByText('Export is on the Pro plan', { exact: true }).last()).toBeVisible();
});

test('the x-ray holds the real link: no sliders; states and the line are handled, and the bench follows', async ({ page }) => {
  await open(page, '/components/link', 'bone');
  const xr = page.locator('#x-ray');
  await xr.scrollIntoViewIfNeeded();
  await xr.getByRole('button', { name: 'X-ray' }).click();
  await expect(xr.locator('.mu-slider, .xr-dial')).toHaveCount(0);

  // states: a stepping value, only ever one of its states
  const states = xr.getByRole('slider', { name: 'State' });
  await expect(states).toHaveAttribute('aria-valuetext', 'rest');
  await states.focus();
  await page.keyboard.press('ArrowRight');
  await expect(states).toHaveAttribute('aria-valuetext', 'hover');
  await expect(states.locator('a')).toHaveAttribute('data-hovered', '');
  await expect(xr.locator('.xr-link-tint')).toHaveCount(1);
  // a drag leans, then snaps to the next one (one step: a little past STEP_AT at the card's 2× zoom)
  const box = (await states.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 18, box.y + box.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(states).toHaveAttribute('aria-valuetext', 'pressed');
  for (let i = 0; i < 3; i++) await states.press('ArrowRight');
  await expect(states).toHaveAttribute('aria-valuetext', 'current');
  await expect(xr.locator('.xr-link-line')).toHaveCount(0);

  // the line: drag it down and the specimen's offset and the readout follow; ↑ brings it back to its token
  await xr.getByRole('button', { name: /^Line:/ }).click();
  const grip = xr.getByRole('slider', { name: 'Line position' });
  await expect(grip).toHaveAttribute('aria-valuenow', '0');
  await grip.focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('.ed-tag')).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await expect(grip).toHaveAttribute('aria-valuenow', '1');
  await expect(xr.locator('.ed-link-box .mu-link-line')).toHaveCSS('text-underline-offset', '1px');
  await expect(xr.getByRole('button', { name: /^under 1pt, tuned/ })).toBeVisible();
  // dragged back up, it catches on its token
  const g = (await grip.boundingBox())!;
  await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2);
  await page.mouse.down();
  await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2 - 1.6, { steps: 4 });
  await page.mouse.up();
  await expect(grip).toHaveAttribute('aria-valuenow', '0');
  await expect(xr.getByRole('button', { name: /^under 0pt, token/ })).toBeVisible();

  // the kinds step too, and the bench draws the standalone chevron
  await xr.getByRole('button', { name: /^Kinds:/ }).click();
  const kinds = xr.getByRole('slider', { name: 'Kind' });
  await kinds.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(kinds).toHaveAttribute('aria-valuetext', 'standalone');
  await expect(xr.locator('.xr-link-words .mu-ic-chevron')).toHaveCount(1);
});

test('the page fits a phone: no sideways scroll at 375', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await open(page, '/components/link', 'graphite');
  await page.locator('#x-ray').getByRole('button', { name: 'X-ray' }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBe(0);
});
