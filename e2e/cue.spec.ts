import { expect, test, type Locator, type Page } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Cue family: one grammar of kinds (glyph + line), luggage tags, recognition once (never while the caret
// is in the word), whimsy off under Reduce Motion, inferred → confirmed, raw ↔ cued without a move.

const animations = (l: Locator) => l.evaluate((el) => el.getAnimations({ subtree: true }).filter((a) => a.playState === 'running').map((a) => (a as CSSAnimation).animationName ?? ''));
const settle = (l: Locator) => l.evaluate((el) => Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => undefined))));

async function typeAtEnd(page: Page, text: string) {
  const input = page.getByTestId('cue-typing');
  await input.click();
  await page.keyboard.press('End');
  await page.keyboard.type(text);
}

for (const colorway of COLORWAYS) {
  test(`cues on a block in ${colorway}`, async ({ page }) => {
    await open(page, '/components/cue', colorway);
    const proof = page.getByTestId('metric-proof');
    const widths = await proof.evaluate((el) => [...el.querySelectorAll('[data-testid^="line-"]')].map((l) => l.getBoundingClientRect().width));
    expect(Math.abs(widths[0] - widths[1])).toBeLessThan(0.005);
    // Each cue's words sit exactly where the plain words do (the text, not the drawing behind it).
    const perCue = await proof.evaluate((el) => {
      const [cued, plain] = [...el.querySelectorAll('[data-testid^="line-"]')] as HTMLElement[];
      const textBox = (n: Element) => { const r = document.createRange(); r.selectNodeContents(n); const b = r.getBoundingClientRect(); return [b.left, b.right]; };
      const a = [...cued.children].map((c) => c.querySelector('.mu-cue-words') ?? c), b = [...plain.children];
      return a.flatMap((c, i) => { const [x1, y1] = textBox(c), [x2, y2] = textBox(b[i]); return [Math.abs(x1 - x2), Math.abs(y1 - y2)]; });
    });
    for (const d of perCue) expect(d).toBeLessThan(0.005);

    // The chip names the glyph, then the value.
    const block = page.getByTestId('cue-block');
    const date = block.locator('.mu-cue[data-kind="date"]');
    await expect(date.locator('.mu-cue-glyph svg')).toBeVisible();
    await date.hover();
    await expect.poll(() => date.evaluate((el) => getComputedStyle(el, '::after').content)).not.toBe('none');
    expect(await date.evaluate((el) => [el.dataset.label, el.dataset.chip])).toEqual(['Date', 'WED 30 SEP · 16:00']);

    const dimple = block.getByRole('checkbox', { name: 'Send the poster' });
    await dimple.focus();
    await page.keyboard.press('Space');
    await expect(dimple).toHaveAttribute('aria-checked', 'true');
    await settle(dimple);
    await page.mouse.move(0, 0);
    await page.locator('section', { hasText: 'Hover a cue for its name' }).first().screenshot({ path: capture(`cue-${colorway}`) });
    await page.locator('section', { hasText: 'The legend' }).first().screenshot({ path: capture(`cue-kinds-${colorway}`) });
    await page.locator('section', { hasText: 'Base UI Checkbox: rest' }).first().screenshot({ path: capture(`cue-dimple-${colorway}`) });
  });

  test(`tags are luggage tags in their own colour in ${colorway}`, async ({ page }) => {
    await open(page, '/components/cue', colorway);
    const tags = page.locator('.mu-cue[data-kind="tag"]');
    // The same tag is the same colour everywhere; the hash stays as a quiet mark.
    const looks = await tags.evaluateAll((els) => els.map((el) => [el.textContent, getComputedStyle(el.querySelector('.mu-cue-words')!, '::after').backgroundColor]));
    const poster = looks.filter(([t]) => t === '#poster').map(([, c]) => c);
    expect(poster.length).toBeGreaterThan(1);
    expect(new Set(poster).size).toBe(1);
    const tag = tags.first();
    expect(await tag.locator('.mu-cue-hash').evaluate((el) => Number(getComputedStyle(el).opacity))).toBeLessThan(1);
    expect(await tag.locator('.mu-cue-words').evaluate((el) => getComputedStyle(el, '::before').clipPath)).toContain('polygon');
  });
}

test('recognition plays once, only after the caret leaves the word', async ({ page }) => {
  await open(page, '/components/cue', 'bone');
  const line = page.getByTestId('cue-typing-line');
  // Arrival is not news: nothing on the page plays on load.
  expect(await line.locator('[data-fresh]').count()).toBe(0);
  await typeAtEnd(page, ', slept 6h');
  // The caret is still inside "6h": no cue yet.
  await expect(line.locator('.mu-cue[data-kind="measurement"]')).toHaveCount(0);
  await page.keyboard.type(' ');
  const sleep = line.locator('.mu-cue[data-kind="measurement"]');
  await expect(sleep).toHaveAttribute('data-fresh', '');
  await expect(sleep).toHaveAttribute('data-label', 'Sleep');
  const names = await animations(sleep);
  expect(names).toEqual(expect.arrayContaining(['mu-cue-draw', 'mu-cue-pop']));
  await settle(sleep);
  // Nothing loops: once settled, nothing is running.
  await page.waitForTimeout(100);
  expect((await animations(sleep)).length).toBe(0);

  // Money turns its figures on the drum; a date shows its day once.
  await page.keyboard.type('$12 tomorrow ');
  const amount = line.locator('.mu-cue[data-kind="amount"]').last();
  await expect(amount).toHaveAttribute('data-fresh', '');
  expect(await animations(amount)).toContain('mu-cue-turn');
  const date = line.locator('.mu-cue[data-kind="date"]').last();
  expect(await animations(date)).toContain('mu-cue-chip-once');
  await settle(line);
  await page.locator('section', { hasText: 'Type below' }).first().screenshot({ path: capture('cue-recognition-bone') });
});

test('typing # lists the tags you have used, and Tab picks one', async ({ page }) => {
  await open(page, '/components/cue', 'bone');
  await typeAtEnd(page, ' #st');
  const list = page.getByTestId('cue-tag-list');
  await expect(list.getByRole('option')).toHaveText(['#studio']);
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('cue-typing')).toHaveValue(/#studio $/);
  await expect(list).toHaveCount(0);
});

test('an inferred cue is dashed until confirmed, then stamps once', async ({ page }) => {
  await open(page, '/components/cue', 'graphite');
  await typeAtEnd(page, ' fri ');
  const pill = page.getByTestId('cue-typing-line').locator('.mu-cue-inferred');
  await expect(pill).toHaveText('fri');
  expect(await pill.evaluate((el) => getComputedStyle(el).borderTopStyle)).toBe('dashed');
  await page.keyboard.press('Tab');
  await expect(pill).toHaveAttribute('data-confirmed', '');
  expect(await pill.evaluate((el) => getComputedStyle(el).borderTopStyle)).toBe('solid');
  expect(await animations(pill)).toEqual(expect.arrayContaining(['mu-cue-stamp', 'mu-cue-sparkle']));
  // The one on the block confirms by a click.
  const fri = page.getByTestId('cue-block').getByRole('button', { name: /Confirm fri/ });
  await fri.click();
  await expect(page.getByTestId('cue-block').locator('.mu-cue-inferred')).toHaveAttribute('data-confirmed', '');
});

test('raw ↔ cued fades the glyphs and moves nothing', async ({ page }) => {
  await open(page, '/components/cue', 'bone');
  const block = page.getByTestId('cue-block');
  const where = () => block.evaluate((root) => { const o = root.getBoundingClientRect(); return [...root.querySelectorAll('.mu-cue[data-kind] > .mu-cue-words, .mu-cue-life')].map((el) => { const b = el.getBoundingClientRect(); return [b.left - o.left, b.top - o.top]; }); });
  const before = await where();
  // The dial panel's first switch is cues.
  const off = page.locator('.dialkit-root').getByRole('button', { name: 'Off', exact: true }).first();
  if (!(await off.isVisible())) await page.locator('.dialkit-panel-inner').click();
  await off.click();
  await expect(block.locator('.mu-cue[data-raw]').first()).toBeVisible();
  const glyph = block.locator('.mu-cue[data-kind="date"] .mu-cue-glyph');
  await expect.poll(() => glyph.evaluate((el) => getComputedStyle(el).opacity)).toBe('0');
  await expect.poll(() => block.locator('.mu-cue-life').first().evaluate((el) => getComputedStyle(el).opacity)).toBe('0');
  expect(await where()).toEqual(before);
});

test('reduce motion: recognition arrives at once, no act', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/components/cue', 'bone');
  const line = page.getByTestId('cue-typing-line');
  await typeAtEnd(page, ' coffee $8 tomorrow ');
  const amount = line.locator('.mu-cue[data-kind="amount"]').last();
  await expect(amount).toHaveAttribute('data-fresh', '');
  expect(await animations(line)).toEqual([]);
  expect(await line.locator('[data-acting], [data-hover], [data-playing]').count()).toBe(0);
  const date = line.locator('.mu-cue[data-kind="date"]').last();
  expect(await date.evaluate((el) => getComputedStyle(el, '::after').content)).toBe('none');
});

test('the tick appears at once under reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/components/cue', 'bone');
  const dimple = page.getByRole('checkbox', { name: 'Send the poster' });
  await dimple.click();
  // Sampled once it is checked (the click's re-render can land a frame later), so the first checked frame is read.
  await expect(dimple).toBeChecked();
  // No stroke is drawn: the tick is whole (no dash) from the first frame.
  const tick = dimple.locator('.mu-dimple-tick path');
  expect(await tick.evaluate((el) => [el.getAnimations().length, getComputedStyle(el).strokeDasharray, getComputedStyle(el).visibility])).toEqual([0, 'none', 'visible']);
});
