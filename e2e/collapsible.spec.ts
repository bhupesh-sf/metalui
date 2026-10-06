import { expect, test, type Locator } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Collapsible: show and hide in place without animating height. The panel takes its place at once and
// is uncovered from its top edge (clip) as it slides; what follows travels in step (transform) and lands
// exactly where the layout puts it; closing holds it there until the panel goes. Rows, keys and "Show 3
// more" open it; nesting works; Reduce Motion crossfades.

type Frame = { h: number; clip: string; ty: number; foot: number; top: number; rot: number; panel: boolean };

/** Samples, every frame for `ms`, the panel after `trigger`, a follower's travel and the chevron. */
async function sample(trigger: Locator, follower: string, ms: number) {
  return trigger.evaluate(async (btn, { follower, ms }) => {
    const root = btn.closest('.mu-collapsible')!;
    const foot = root.parentElement!.querySelector<HTMLElement>(follower)!;
    const chev = btn.querySelector('svg')!;
    (btn as HTMLElement).click();
    const out: Frame[] = [];
    const t0 = performance.now();
    await new Promise<void>((done) => {
      const frame = () => {
        const p = root.querySelector<HTMLElement>(':scope > .mu-collapsible-panel');
        const cs = p ? getComputedStyle(p) : null;
        const m = new DOMMatrix(getComputedStyle(foot).transform);
        out.push({
          h: p ? p.getBoundingClientRect().height / (parseFloat(getComputedStyle(p).scale) || 1) : 0,
          clip: cs?.clipPath ?? 'none',
          ty: cs ? parseFloat(cs.translate.split(' ')[1] ?? '0') || 0 : 0,
          foot: m.m42,
          top: foot.getBoundingClientRect().top,
          rot: parseFloat(getComputedStyle(chev).rotate) || 0,
          panel: !!p,
        });
        if (performance.now() - t0 < ms) requestAnimationFrame(frame); else done();
      };
      requestAnimationFrame(frame);
    });
    return out;
  }, { follower, ms });
}

const playground = (page: import('@playwright/test').Page) => page.locator('section', { hasText: 'Playground' }).first();

for (const colorway of COLORWAYS) {
  test(`a row, a key and the keyboard open it in ${colorway}`, async ({ page }) => {
    await open(page, '/components/collapsible', colorway);
    const section = playground(page);
    const advanced = section.getByRole('button', { name: /Advanced/ });
    await expect(advanced).toHaveAttribute('aria-expanded', 'false');
    await expect(advanced).toContainText('PNG, 2×');
    await advanced.click();
    await expect(advanced).toHaveAttribute('aria-expanded', 'true');
    await expect(section.getByText('Canvas background')).toBeVisible();
    const controls = await advanced.getAttribute('aria-controls');
    expect(controls).toBeTruthy();
    await expect(page.locator(`[id="${controls}"]`)).toBeVisible();

    const key = section.getByRole('button', { name: 'Show repositories' });
    await key.focus();
    await page.keyboard.press('Space');
    await expect(key).toHaveAttribute('aria-expanded', 'true');
    await expect(section.getByText('ana/tram-map')).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(key).toHaveAttribute('aria-expanded', 'false');
    await expect(section.getByText('ana/tram-map')).toHaveCount(0);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(700);
    await section.screenshot({ path: capture(`collapsible-${colorway}`) });
  });

  test(`"Show 3 more" turns its words and opens above itself in ${colorway}`, async ({ page }) => {
    await open(page, '/components/collapsible', colorway);
    const section = page.locator('#more');
    const more = section.getByRole('button', { name: 'Show 3 more' });
    await expect(section.getByText('alfama')).toHaveCount(0);
    const offset = async (l: Locator) => l.evaluate((b) => b.getBoundingClientRect().top - b.closest('section')!.getBoundingClientRect().top);
    const before = await offset(more);
    await more.click();
    await expect(section.getByRole('button', { name: 'Show less' })).toHaveAttribute('aria-expanded', 'true');
    await expect(section.getByText('alfama')).toBeVisible();
    await page.waitForTimeout(700);
    const after = await offset(section.getByRole('button', { name: 'Show less' }));
    expect(after).toBeGreaterThan(before + 10);
    const rot = await section.locator('.mu-collapsible-more svg').evaluate((s) => getComputedStyle(s).rotate);
    expect(rot).toBe('180deg');
    await section.screenshot({ path: capture(`collapsible-more-${colorway}`) });
  });
}

test('opening uncovers the panel at its full height while what follows travels down in step', async ({ page }) => {
  await open(page, '/components/collapsible', 'bone');
  const advanced = playground(page).getByRole('button', { name: /Advanced/ });
  const frames = await sample(advanced, '.mu-card-footer', 700);
  const shown = frames.filter((f) => f.panel);
  const end = shown.at(-1)!;
  expect(end.h).toBeGreaterThan(40);
  // Height never animates: every frame the panel is there, it is at its full height.
  for (const f of shown) expect(Math.abs(f.h - end.h)).toBeLessThan(0.5);
  // It is uncovered from the top edge: a clip in flight, gone at rest.
  expect(shown.some((f) => f.clip.startsWith('inset('))).toBe(true);
  expect(end.clip).toBe('none');
  // It slides from a nest above.
  expect(Math.min(...shown.map((f) => f.ty))).toBeLessThan(-3);
  expect(end.ty).toBe(0);
  // The footer starts where it was (one panel up) and travels down to rest, never past it.
  expect(shown[0].foot).toBeLessThan(-end.h * 0.8);
  expect(frames.some((f) => f.foot < -2 && f.foot > -end.h + 2)).toBe(true);
  expect(Math.max(...frames.map((f) => f.foot))).toBeLessThanOrEqual(0.5);
  expect(end.foot).toBe(0);
  // The chevron, a part, may overshoot its stop.
  expect(Math.max(...frames.map((f) => f.rot))).toBeGreaterThan(1);
  expect(end.rot).toBeCloseTo(0, 0);
});

test('closing slides the panel back, then what follows lands where the layout puts it', async ({ page }) => {
  await open(page, '/components/collapsible', 'graphite');
  const advanced = playground(page).getByRole('button', { name: /Advanced/ });
  await advanced.click();
  await page.waitForTimeout(700);
  const frames = await sample(advanced, '.mu-card-footer', 900);
  const first = frames[0];
  const gone = frames.findIndex((f) => !f.panel);
  expect(gone).toBeGreaterThan(0);
  // While the panel is still there, the footer travels up by transform alone.
  const held = frames.slice(0, gone);
  expect(held.some((f) => f.foot < -2)).toBe(true);
  expect(held.some((f) => f.clip.startsWith('inset('))).toBe(true);
  // Seen position: smooth and monotonic, no jump when the panel goes and the transform is dropped.
  for (let i = 1; i < frames.length; i++) expect(frames[i].top).toBeLessThanOrEqual(frames[i - 1].top + 0.5);
  expect(Math.abs(frames[gone].top - frames[gone - 1].top)).toBeLessThan(1);
  expect(frames.at(-1)!.foot).toBe(0);
  expect(first.top - frames.at(-1)!.top).toBeGreaterThan(40);
  await expect(advanced).toHaveAttribute('aria-expanded', 'false');
});

test('nested: Proxy opens inside Network and the rows after both travel', async ({ page }) => {
  await open(page, '/components/collapsible', 'bone');
  const section = page.locator('#settings');
  const network = section.getByRole('button', { name: 'Show network settings' });
  await network.click();
  await expect(section.getByText('Keep an offline copy')).toBeVisible();
  const proxy = section.getByRole('button', { name: 'Show proxy settings' });
  await proxy.click();
  await expect(section.getByRole('textbox', { name: 'Proxy host' })).toBeVisible();
  await page.waitForTimeout(700);
  await section.screenshot({ path: capture('collapsible-settings-bone') });
  await network.click();
  await expect(section.getByText('Keep an offline copy')).toHaveCount(0);
  await network.click();
  // A closed panel unmounts, so the inner one starts closed again.
  await expect(section.getByRole('button', { name: 'Show proxy settings' })).toHaveAttribute('aria-expanded', 'false');
});

test('keepMounted keeps what was typed while closed', async ({ page }) => {
  await open(page, '/components/collapsible', 'bone');
  const section = page.locator('#form');
  const more = section.getByRole('button', { name: 'More options' });
  await more.click();
  await section.getByRole('textbox', { name: 'Subject' }).fill('Tiles');
  await more.click();
  await expect(section.getByRole('textbox', { name: 'Subject' })).toBeHidden();
  await more.click();
  await expect(section.getByRole('textbox', { name: 'Subject' })).toHaveValue('Tiles');
});

test('Reduce Motion: the content crossfades in place, nothing slides or travels, the chevron snaps', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/components/collapsible', 'graphite');
  const advanced = playground(page).getByRole('button', { name: /Advanced/ });
  const frames = await sample(advanced, '.mu-card-footer', 500);
  const shown = frames.filter((f) => f.panel);
  for (const f of shown) {
    expect(f.ty).toBe(0);
    expect(f.foot).toBe(0);
    expect(f.rot).toBeCloseTo(0, 0);
  }
  // Uncovered at once: no clip cuts it (the clip, if any, stands at its bleed).
  for (const f of shown) expect(f.clip === 'none' || f.clip.includes('-24px')).toBe(true);
  const fading = await playground(page).locator('.mu-collapsible-panel').evaluate((p) => getComputedStyle(p).animationName);
  expect(fading).toBe('mu-collapsible-in');
});
