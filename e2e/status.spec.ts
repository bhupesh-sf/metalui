import { expect, test, type Locator, type Page } from '@playwright/test';
import { COLORWAYS, capture, emulateMedia, open } from './helpers';

// LEDs, status badges and keycaps: the state is in words for assistive tech, in a gesture as well as a
// colour, the badge holds its own ground on see-through grounds, and the lit lamps stay apart for
// colour-blind readers.

for (const colorway of COLORWAYS) {
  test(`status and keys read as words in ${colorway}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page, '/components/status', colorway);
    const badges = page.getByRole('status');
    expect(await badges.count()).toBeGreaterThan(0);
    await expect(badges.first()).not.toHaveText('');
    await page.locator('section', { hasText: 'LEDs and badges' }).first().screenshot({ path: capture(`status-${colorway}`) });
    await page.getByTestId('status-tones').screenshot({ path: capture(`status-tones-${colorway}`) });
    await page.getByTestId('status-grounds').screenshot({ path: capture(`status-grounds-${colorway}`) });
    await page.getByTestId('status-cvd').screenshot({ path: capture(`status-cvd-${colorway}`) });
    await open(page, '/components/kbd', colorway);
    await expect(page.locator('kbd[aria-label="Command K"]').first()).toBeVisible();
    await page.locator('section', { hasText: 'Where keys sit' }).first().screenshot({ path: capture(`kbd-${colorway}`) });
  });
}

test('each state has its own gesture, so colour is never alone', async ({ page }) => {
  await open(page, '/components/status', 'bone');
  const lamp = (kind: string) => page.getByTestId('status-bench').locator(`.mu-badge .mu-led[data-kind="${kind}"]`);
  await expect(lamp('live')).toHaveAttribute('data-gesture', 'steady');
  await expect(lamp('waiting')).toHaveAttribute('data-gesture', 'breathe');
  await expect(lamp('failed')).toHaveAttribute('data-gesture', 'blink2');
  await expect(lamp('off')).toHaveAttribute('data-gesture', 'steady');
  expect(await lamp('waiting').evaluate((el) => el.getAnimations().map((a) => (a as CSSAnimation).animationName))).toEqual(['mu-led-breathe']);
  // the badge's words are ink2 at a readable size, not the engraved label
  const words = await page.getByTestId('status-bench').locator('.mu-badge').first().evaluate((el) => {
    const cs = getComputedStyle(el);
    return { size: parseFloat(cs.fontSize), shadow: cs.textShadow };
  });
  expect(words.size).toBeGreaterThanOrEqual(10.5);
  expect(words.shadow).toBe('none');
});

for (const colorway of COLORWAYS) {
  test(`reduced motion holds every badge lamp lit in ${colorway}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page, '/components/status', colorway);
    for (const lamp of await page.getByTestId('status-bench').locator('.mu-badge .mu-led').all()) {
      expect(await lamp.evaluate((el) => el.getAnimations().length)).toBe(0);
      expect(await lamp.evaluate((el) => getComputedStyle(el).filter)).toBe('none');
    }
  });
}

const look = (badge: Locator) => badge.evaluate((el) => {
  const cs = getComputedStyle(el);
  return { plate: cs.backgroundImage !== 'none', keyline: cs.outlineStyle === 'solid' ? parseFloat(cs.outlineWidth) : 0 };
});

for (const colorway of COLORWAYS) {
  test(`transparent mode: badges are solid over frost, an image and graphite in ${colorway}`, async ({ page }) => {
    await open(page, '/components/status', colorway);
    const grounds = page.getByTestId('status-grounds');
    for (const ground of ['frost', 'image', 'graphite']) {
      const badges = grounds.locator(`[data-ground="${ground}"] .mu-badge`);
      await expect(badges).toHaveCount(3);
      // plate, quiet and strong: every one an opaque plate with a keyline, the quiet one included
      for (const b of await badges.all()) expect(await look(b), ground).toEqual({ plate: true, keyline: 1 });
      // every lamp sits in its socket: a 1 px dark bezel first in its shadow stack
      for (const led of await grounds.locator(`[data-ground="${ground}"] .mu-led`).all()) {
        expect(await led.evaluate((el) => getComputedStyle(el).boxShadow)).toMatch(/^rgba\(18, 18, 20, 0\.9\) 0px 0px 0px 1px/);
      }
    }
    // the graphite ground draws the graphite recipe whatever the page's colorway
    const graphitePlate = await grounds.locator('[data-ground="graphite"] .mu-badge').first().evaluate((el) => getComputedStyle(el).backgroundImage);
    expect(graphitePlate).toContain('rgb(49, 49, 52)');
  });
}

test('a quiet badge has no plate until Reduce Transparency, which makes it solid', async ({ page }) => {
  await open(page, '/components/status', 'bone');
  const quiet = page.locator('[data-tone-row="quiet"] .mu-badge').first();
  const plate = page.locator('[data-tone-row="plate"] .mu-badge').first();
  expect(await look(quiet)).toEqual({ plate: false, keyline: 0 });
  expect(await look(plate)).toEqual({ plate: true, keyline: 0 });
  await emulateMedia(page, [{ name: 'prefers-reduced-transparency', value: 'reduce' }]);
  expect(await look(quiet)).toEqual({ plate: true, keyline: 1 });
  expect(await look(plate)).toEqual({ plate: true, keyline: 1 });
});

/* ── Colour-blind check: rendered lamps through the page's simulation filters, compared in CIEDE2000 ── */

const KINDS = ['live', 'waiting', 'failed', 'link'];

/** The mean colour of each lamp's lens (inside its socket), read from the rendered pixels. */
async function lampColours(page: Page, vision: string) {
  const out: Record<string, number[]> = {};
  for (const k of KINDS) {
    const png = (await page.locator(`[data-vision="${vision}"] [data-lamp="${k}"] .mu-led`).screenshot()).toString('base64');
    out[k] = await page.evaluate(async (src) => {
      const img = new Image();
      img.src = `data:image/png;base64,${src}`;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      const g = c.getContext('2d')!;
      g.drawImage(img, 0, 0);
      const { data } = g.getImageData(0, 0, c.width, c.height);
      const r = (Math.min(c.width, c.height) / 2) * 0.8, cx = c.width / 2, cy = c.height / 2, sum = [0, 0, 0];
      let n = 0;
      for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
        if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) > r) continue;
        const i = (y * c.width + x) * 4;
        sum[0] += data[i]; sum[1] += data[i + 1]; sum[2] += data[i + 2]; n++;
      }
      return sum.map((v) => v / n);
    }, png);
  }
  return out;
}

function lab([r, g, b]: number[]) {
  const lin = (c: number) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  const x = f((0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047), y = f(0.2126 * R + 0.7152 * G + 0.0722 * B), z = f((0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

/** CIEDE2000 colour difference. */
function de2000(c1: number[], c2: number[]) {
  const [L1, a1, b1] = lab(c1), [L2, a2, b2] = lab(c2);
  const rad = Math.PI / 180, Cb = (Math.hypot(a1, b1) + Math.hypot(a2, b2)) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cb ** 7 / (Cb ** 7 + 25 ** 7)));
  const a1p = a1 * (1 + G), a2p = a2 * (1 + G), C1 = Math.hypot(a1p, b1), C2 = Math.hypot(a2p, b2);
  const hue = (b: number, a: number) => { const v = Math.atan2(b, a) / rad; return v < 0 ? v + 360 : v; };
  const h1 = hue(b1, a1p), h2 = hue(b2, a2p);
  let dh = h2 - h1;
  if (C1 * C2 === 0) dh = 0; else if (dh > 180) dh -= 360; else if (dh < -180) dh += 360;
  const dH = 2 * Math.sqrt(C1 * C2) * Math.sin((dh / 2) * rad);
  const Lb = (L1 + L2) / 2, Cp = (C1 + C2) / 2;
  let hb = h1 + h2;
  if (C1 * C2 !== 0) { if (Math.abs(h1 - h2) > 180) hb += h1 + h2 < 360 ? 360 : -360; hb /= 2; }
  const T = 1 - 0.17 * Math.cos((hb - 30) * rad) + 0.24 * Math.cos(2 * hb * rad) + 0.32 * Math.cos((3 * hb + 6) * rad) - 0.2 * Math.cos((4 * hb - 63) * rad);
  const SL = 1 + (0.015 * (Lb - 50) ** 2) / Math.sqrt(20 + (Lb - 50) ** 2), SC = 1 + 0.045 * Cp, SH = 1 + 0.015 * Cp * T;
  const RT = -2 * Math.sqrt(Cp ** 7 / (Cp ** 7 + 25 ** 7)) * Math.sin(60 * Math.exp(-(((hb - 275) / 25) ** 2)) * rad);
  const dL = (L2 - L1) / SL, dC = (C2 - C1) / SC, dHs = dH / SH;
  return Math.sqrt(dL ** 2 + dC ** 2 + dHs ** 2 + RT * dC * dHs);
}

for (const colorway of COLORWAYS) {
  test(`lit lamps stay apart under deuteranopia and protanopia in ${colorway}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page, '/components/status', colorway);
    await page.getByTestId('status-cvd').scrollIntoViewIfNeeded();
    const report: string[] = [];
    const all: [string, number][] = [];
    for (const vision of ['normal', 'deuteranopia', 'protanopia']) {
      const c = await lampColours(page, vision);
      const pairs: [string, number][] = [];
      for (let i = 0; i < KINDS.length; i++) for (let j = i + 1; j < KINDS.length; j++) pairs.push([`${vision} ${KINDS[i]}/${KINDS[j]}`, de2000(c[KINDS[i]], c[KINDS[j]])]);
      report.push(`${vision}: ${pairs.map(([p, d]) => `${p.split(' ')[1]} ${d.toFixed(0)}`).join(', ')}`);
      all.push(...pairs);
    }
    test.info().annotations.push({ type: 'ΔE00', description: report.join(' | ') });
    console.log(`${colorway} ΔE00 · ${report.join(' | ')}`);
    for (const [p, d] of all) expect(d, `${colorway} ${p}`).toBeGreaterThanOrEqual(20);
  });
}
