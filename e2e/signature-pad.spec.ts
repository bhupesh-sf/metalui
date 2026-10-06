import { expect, test, type Locator, type Page } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Signature pad: the field's well as the paper. Draw with the mouse and the stroke settles on lift; Undo,
// Redo and Clear share one history; Type instead is the keyboard path; a required pad refuses an empty
// submit with the form field's error and sends focus to Type instead; the form posts SVG. Read-only shows
// a mark with no keys; once a pen has touched, touches don't ink; Reduce Motion settles at once.

const playground = (page: Page) => page.locator('section', { hasText: 'Playground' }).first();
const pad = (scope: Locator) => scope.locator('.mu-signature-pad').first();
const paper = (scope: Locator) => scope.locator('.mu-signature-ink').first();

/** A wavy stroke across the paper with the mouse, from fraction x0 to x1 of its width. */
async function sign(page: Page, surface: Locator, x0 = 0.15, x1 = 0.6) {
  await surface.scrollIntoViewIfNeeded();
  const b = (await surface.boundingBox())!;
  const y = b.y + b.height * 0.55;
  await page.mouse.move(b.x + b.width * x0, y);
  await page.mouse.down();
  for (let i = 1; i <= 24; i++) {
    const t = i / 24;
    await page.mouse.move(b.x + b.width * (x0 + (x1 - x0) * t), y - Math.sin(t * Math.PI * 3) * b.height * 0.18);
  }
  await page.mouse.up();
}

for (const colorway of COLORWAYS) {
  test(`draw, settle, undo, redo, clear in ${colorway}`, async ({ page }) => {
    await open(page, '/components/signature-pad', colorway);
    const section = playground(page);
    const p = pad(section);
    await expect(p.getByRole('img', { name: 'Signature, empty' })).toBeVisible();
    await expect(p.getByRole('button', { name: 'Clear' })).toBeDisabled();
    await expect(p.getByRole('button', { name: 'Undo' })).toBeDisabled();

    await sign(page, paper(section));
    await expect(p.getByRole('img', { name: 'Signature, drawn, 1 stroke' })).toBeVisible();
    // The levelled stroke fades in over the raw one, which fades out; the hint goes.
    await expect(p.locator('path.signature-settle-in')).toHaveCount(1);
    await expect(p.locator('path.signature-settle-out')).toHaveCount(1);
    await expect.poll(() => p.locator('.mu-signature-hint').evaluate((h) => getComputedStyle(h).opacity)).toBe('0');
    // The ink is the text's ink.
    const ink = await p.locator('.mu-signature-paper').evaluate((w) => getComputedStyle(w).color);
    expect(await p.locator('.mu-signature-ink g').evaluate((g) => getComputedStyle(g).fill)).toBe(ink);

    await sign(page, paper(section), 0.62, 0.85);
    await expect(p.getByRole('img', { name: 'Signature, drawn, 2 strokes' })).toBeVisible();
    await page.mouse.move(0, 0);
    await page.waitForTimeout(500);
    await section.screenshot({ path: capture(`signature-pad-${colorway}`) });

    await p.getByRole('button', { name: 'Undo' }).click();
    await expect(p.getByRole('img', { name: 'Signature, drawn, 1 stroke' })).toBeVisible();
    await p.getByRole('button', { name: 'Redo' }).click();
    await expect(p.getByRole('img', { name: 'Signature, drawn, 2 strokes' })).toBeVisible();
    // Clear is one step of the history: Undo brings the signature back.
    await p.getByRole('button', { name: 'Clear' }).click();
    await expect(p.getByRole('img', { name: 'Signature, empty' })).toBeVisible();
    await expect(p.getByRole('button', { name: 'Redo' })).toBeDisabled();
    await p.getByRole('button', { name: 'Undo' }).click();
    await expect(p.getByRole('img', { name: 'Signature, drawn, 2 strokes' })).toBeVisible();
    // ⌘Z / Ctrl+Z while focus is in the pad.
    await p.getByRole('button', { name: 'Undo' }).focus();
    await page.keyboard.press('ControlOrMeta+z');
    await expect(p.getByRole('img', { name: 'Signature, drawn, 1 stroke' })).toBeVisible();
  });
}

test('required: an empty pad is refused and focus goes to Type instead; the form posts SVG', async ({ page }) => {
  await open(page, '/components/signature-pad', 'bone');
  const section = playground(page);
  const p = pad(section);
  await section.getByRole('button', { name: 'Confirm delivery' }).click();
  await expect(section.getByText('Sign, or type your name.')).toBeVisible();
  await expect(p.getByRole('button', { name: 'Type instead' })).toBeFocused();
  // The paper wears the invalid ring.
  expect(await p.locator('.mu-signature-paper').evaluate((w) => getComputedStyle(w, '::before').boxShadow)).toContain('inset');
  await section.screenshot({ path: capture('signature-pad-invalid-bone') });

  // Drawing clears the error; the form sends the SVG.
  await sign(page, paper(section));
  await expect(section.getByText('Sign, or type your name.')).toBeHidden();
  await section.getByRole('button', { name: 'Confirm delivery' }).click();
  await expect(section.getByTestId('sent')).toContainText(/Sent: SVG, [\d.]+ KB/);
  const posted = await p.locator('input.sr-only').inputValue();
  expect(posted).toMatch(/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" viewBox="0 0 \d+ \d+"[^>]*><g fill="#1d1d1f"><path d="M/);
});

test('type your name: the keyboard path, and each mode keeps its own', async ({ page }) => {
  await open(page, '/components/signature-pad', 'graphite');
  const section = playground(page);
  const p = pad(section);
  await sign(page, paper(section));
  // Tab into the pad: Type instead is its first stop.
  const modeKey = section.getByRole('button', { name: 'Type instead' });
  await modeKey.evaluate((el) => { (el as HTMLElement).dataset.muMark = '1'; });
  await modeKey.focus();
  await page.keyboard.press('Enter');
  const name = p.getByRole('textbox', { name: 'Signature, type your full name' });
  await expect(name).toBeFocused();
  // The same key changed meaning: its words turned on the drum, never a new key.
  const turned = p.locator('[data-mu-mark="1"]');
  await expect(turned).toHaveAccessibleName('Draw instead');
  await expect(turned.locator('.mu-swap-text')).toHaveCount(1);
  await page.keyboard.type('Ana Ribeiro');
  await expect(p.getByRole('button', { name: 'Undo' })).toHaveCount(0);
  await section.getByRole('button', { name: 'Confirm delivery' }).click();
  await expect(section.getByTestId('sent')).toBeVisible();
  const posted = await p.locator('input.sr-only').inputValue();
  expect(posted).toContain('>Ana Ribeiro</text></svg>');
  await page.mouse.move(0, 0);
  await page.waitForTimeout(500);
  await section.screenshot({ path: capture('signature-pad-typed-graphite') });
  // Back to drawing: the stroke is still there.
  await p.getByRole('button', { name: 'Draw instead' }).click();
  await expect(p.getByRole('img', { name: 'Signature, drawn, 1 stroke' })).toBeVisible();
});

test('agreement, proof of delivery and disabled', async ({ page }) => {
  await open(page, '/components/signature-pad', 'bone');
  const agreement = page.locator('#agreement');
  const sign2 = agreement.getByRole('button', { name: 'Sign receipt' });
  await expect(sign2).toBeDisabled();
  for (const label of ['Initials: The parcel arrived sealed.', 'Initials: Nothing was missing from the list.', 'Signature for the receipt']) {
    await sign(page, agreement.getByRole('img', { name: `${label}, empty` }), 0.2, 0.7);
  }
  await expect(sign2).toBeEnabled();
  await page.mouse.move(0, 0);
  await page.waitForTimeout(500);
  await agreement.screenshot({ path: capture('signature-pad-agreement-bone') });
  // Compact pads are 88 tall; the signature 160.
  const heights = await agreement.locator('.mu-signature-paper').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
  expect(heights).toEqual([88, 88, 160]);

  const proof = page.locator('#proof');
  await expect(proof.getByRole('img', { name: 'Signature on delivery, drawn, 3 strokes' })).toBeVisible();
  await expect(proof.locator('.mu-signature-pad').getByRole('button')).toHaveCount(0);
  await proof.getByRole('button', { name: 'Make a PNG' }).click();
  await expect(proof.getByRole('img', { name: 'The delivery signature as a PNG' })).toBeVisible();

  const closed = page.locator('#states');
  await expect(closed.getByRole('button', { name: 'Type instead' })).toBeDisabled();
  await sign(page, closed.locator('.mu-signature-ink'));
  await expect(closed.getByRole('img', { name: 'Signature, closed, empty' })).toBeVisible();
});

test('palm rejection: once a pen has touched, touches do not ink', async ({ page }) => {
  await open(page, '/components/signature-pad', 'bone');
  const section = page.locator('#tune');
  const surface = section.locator('.mu-signature-ink');
  const stroke = (pointerType: string) => surface.evaluate((el, type) => {
    const r = el.getBoundingClientRect();
    const at = (k: string, x: number) => el.dispatchEvent(new PointerEvent(k, { bubbles: true, pointerId: 7, pointerType: type, isPrimary: true, button: 0, pressure: 0.6, clientX: r.left + x, clientY: r.top + r.height / 2 }));
    at('pointerdown', 40);
    for (let x = 50; x < 200; x += 10) at('pointermove', x);
    at('pointerup', 200);
  }, pointerType);
  await stroke('touch');
  await expect(section.getByRole('img', { name: 'Tuned signature, drawn, 1 stroke' })).toBeVisible();
  await stroke('pen');
  await expect(section.getByRole('img', { name: 'Tuned signature, drawn, 2 strokes' })).toBeVisible();
  await stroke('touch');
  await expect(section.getByRole('img', { name: 'Tuned signature, drawn, 2 strokes' })).toBeVisible();
});

test('Reduce Motion: the stroke settles and the hint goes at once', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/components/signature-pad', 'graphite');
  const section = playground(page);
  const p = pad(section);
  await sign(page, paper(section));
  const durations = await p.locator('path.signature-settle-in, path.signature-settle-out').evaluateAll((els) => els.map((e) => getComputedStyle(e).animationDuration));
  expect(durations).toHaveLength(2);
  for (const d of durations) expect(parseFloat(d)).toBeLessThan(0.001);
  expect(parseFloat(await p.locator('.mu-signature-hint').evaluate((h) => getComputedStyle(h).transitionDuration))).toBeLessThan(0.001);
});
