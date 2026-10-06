import { expect, test, type Locator, type Page } from '@playwright/test';
import { COLORWAYS, capture, emulateMedia, open } from './helpers';

// Button group: one machined bar. Keys are cut apart by seams that never move; a pressed key sinks
// alone; a readout is a window, not a key; a pair can rock; a split button's chevron stays down while
// its menu is open; latched keys stay sunk with their lamp.
const section = (page: Page, name: string) => page.locator('section', { hasText: name }).first();
const lift = (el: Locator) => el.evaluate((e) => { const t = getComputedStyle(e).translate; return t === 'none' ? 0 : parseFloat(t.split(' ')[1] ?? '0'); });
const style = (el: Locator, prop: string) => el.evaluate((e, p) => getComputedStyle(e).getPropertyValue(p), prop);
const rotation = (el: Locator) => el.evaluate((e) => { const r = getComputedStyle(e).rotate; return r === 'none' ? 0 : parseFloat(r); });
const box = async (el: Locator) => { const b = (await el.boundingBox())!; return { x: b.x, y: b.y, w: b.width, h: b.height }; };
const hold = async (page: Page, el: Locator) => { const b = (await el.boundingBox())!; await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down(); };

for (const colorway of COLORWAYS) {
  test(`one bar: seams stay put, a key sinks alone, hover and focus stay in the key, in ${colorway}`, async ({ page }) => {
    await open(page, '/components/button-group', colorway);
    const history = section(page, 'Playground').getByRole('group', { name: 'History' });
    const undo = history.getByRole('button', { name: 'Undo' });
    const redo = history.getByRole('button', { name: 'Redo' });
    const seam = history.locator('.mu-button-group-seam');
    await expect(seam).toHaveCount(1);

    // One raised cap with the outer pill radius; the keys are bare, square inside.
    expect(await style(history, 'box-shadow')).not.toBe('none');
    expect(parseFloat(await style(history, 'border-top-left-radius'))).toBeGreaterThan(100);
    expect(await style(undo, 'background-image')).toBe('none');
    expect(await style(undo, 'border-top-right-radius')).toBe('0px');
    expect(await style(redo, 'border-top-left-radius')).toBe('0px');

    // Hover lifts that key's light only.
    await redo.hover();
    await expect.poll(() => style(redo, 'background-image')).not.toBe('none');
    expect(await style(undo, 'background-image')).toBe('none');

    // Press: only that key sinks into its pressed look; the seam and the other key stay.
    const seamAt = await box(seam);
    await hold(page, undo);
    await expect.poll(() => lift(undo)).toBeGreaterThan(0.5);
    expect(await style(undo, 'background-image')).not.toBe('none');
    expect(await lift(redo)).toBe(0);
    expect(await box(seam)).toEqual(seamAt);
    await page.mouse.up();
    await expect(section(page, 'Playground')).toContainText('Undid');

    // Focus: the ring sits inside the key.
    await undo.focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    await expect(undo).toBeFocused();
    expect(parseFloat(await style(undo, 'outline-offset'))).toBeLessThan(0);

    // A disabled key fades alone; a disabled bar fades whole and refuses.
    const states = page.getByTestId('button-group-states');
    await expect(states.getByRole('button', { name: 'Paste' })).toBeDisabled();
    const locked = states.getByRole('group', { name: 'Locked history' });
    expect(parseFloat(await style(locked, 'opacity'))).toBeLessThan(0.5);
    await expect(locked.getByRole('button', { name: 'Undo' })).toBeDisabled();
  });

  test(`a readout is a window: tabular, announced, stepped to its limits, in ${colorway}`, async ({ page }) => {
    await open(page, '/components/button-group', colorway);
    const zoom = section(page, 'Playground').getByRole('group', { name: 'Zoom' });
    const window = zoom.getByRole('status');
    const face = window.locator('[data-state=in]');
    await expect(face).toHaveText('100 %');
    expect(await style(face, 'font-variant-numeric')).toContain('tabular-nums');
    await expect(zoom.getByRole('button')).toHaveCount(2); // the readout is not a key
    await expect(zoom.locator('.mu-button-group-seam')).toHaveCount(2);
    await zoom.getByRole('button', { name: 'Zoom in' }).click();
    await expect(face).toHaveText('125 %');
    const out = zoom.getByRole('button', { name: 'Zoom out' });
    for (let i = 0; i < 4; i++) await out.click();
    await expect(face).toHaveText('25 %');
    await expect(out).toBeDisabled();
  });

  test(`a rocker tips toward the pressed end, in ${colorway}`, async ({ page }) => {
    await open(page, '/components/button-group', colorway);
    const rocker = page.getByTestId('button-group-rocker').getByRole('group', { name: 'History' });
    await rocker.scrollIntoViewIfNeeded();
    const undo = rocker.getByRole('button', { name: 'Undo' });
    await hold(page, undo);
    await expect.poll(() => rotation(rocker)).toBeLessThan(-0.5);
    expect(await lift(undo)).toBe(0); // the cap tips; the key doesn't slide
    await page.mouse.up();
    await expect.poll(() => rotation(rocker)).toBeCloseTo(0, 1);
    await hold(page, rocker.getByRole('button', { name: 'Redo' }));
    await expect.poll(() => rotation(rocker)).toBeGreaterThan(0.5);
    await page.mouse.up();
  });

  test(`the split chevron stays down while open, turns over, and a choice becomes the main action, in ${colorway}`, async ({ page }) => {
    await open(page, '/components/button-group', colorway);
    const play = section(page, 'Playground');
    const chevron = play.getByRole('button', { name: 'More export options' });
    const main = play.getByRole('button', { name: /Export PDF/ });
    // One material: the bar is the primary's dark (or light), and the chevron is bare in it.
    const bar = play.getByRole('group', { name: 'More export options' });
    expect(await style(bar, 'background-image')).toContain('gradient');
    await expect(main).toBeVisible();
    expect(await style(chevron, 'background-image')).toBe('none');
    // The chevron is a MorphIcon: opening turns it over (a half turn, edge-on midway), not a CSS spin.
    const glyph = () => chevron.locator('svg').getAttribute('data-turn');
    expect(await glyph()).toBeNull();
    expect(await chevron.locator('svg').evaluate((e) => getComputedStyle(e).rotate)).toMatch(/^(0deg|none)$/);

    await chevron.click();
    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();
    await expect(chevron).toHaveAttribute('data-popup-open', '');
    await expect.poll(() => lift(chevron)).toBeGreaterThan(0.5);
    expect(await style(chevron, 'background-image')).not.toBe('none');
    expect(parseFloat(await style(chevron, 'border-top-right-radius'))).toBeGreaterThan(10); // still the bar's end
    await expect.poll(glyph).toBe('180');
    await page.waitForTimeout(400);
    await page.screenshot({ path: capture(`button-group-${colorway}`), clip: { ...(await play.boundingBox())! } });

    await menu.getByRole('menuitem', { name: 'SVG' }).click();
    await expect.poll(() => lift(chevron)).toBe(0);
    await expect.poll(glyph).toBeNull();
    await expect(play).toContainText('Exported SVG');
    await expect(play.getByRole('button', { name: /Export SVG/ })).toBeVisible();
  });

  test(`latched keys stay sunk with their lamp, in ${colorway}`, async ({ page }) => {
    await open(page, '/components/button-group', colorway);
    const latched = page.getByTestId('button-group-latched');
    await latched.scrollIntoViewIfNeeded();
    const align = latched.getByRole('group', { name: 'Alignment' });
    const left = align.getByRole('button', { name: 'Left' });
    const centre = align.getByRole('button', { name: 'Centre' });
    await expect(left).toHaveAttribute('aria-pressed', 'true');
    await centre.click();
    await expect(centre).toHaveAttribute('aria-pressed', 'true');
    await expect(left).toHaveAttribute('aria-pressed', 'false');
    await page.mouse.move(0, 0);
    await expect.poll(() => lift(centre)).toBeGreaterThan(0.5);
    await expect.poll(() => lift(left)).toBe(0);
    expect(await style(centre, 'background-image')).not.toBe('none');
    expect(await style(left, 'background-image')).toBe('none');
    await expect(centre.locator('[data-kind=live]')).toBeAttached();
    await page.screenshot({ path: capture(`button-group-latched-${colorway}`), clip: { ...(await latched.boundingBox())! } });
  });
}

test('Reduce Motion: the rocker tips at once, a key still sinks', async ({ page }) => {
  await emulateMedia(page, [{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await open(page, '/components/button-group', 'bone');
  const rocker = page.getByTestId('button-group-rocker').getByRole('group', { name: 'History' });
  await rocker.scrollIntoViewIfNeeded();
  expect(parseFloat(await style(rocker, 'transition-duration'))).toBeLessThan(0.001);
  await hold(page, rocker.getByRole('button', { name: 'Undo' }));
  await expect.poll(() => rotation(rocker)).toBeLessThan(-0.5);
  await page.mouse.up();
  const undo = section(page, 'Playground').getByRole('button', { name: 'Undo' });
  await undo.scrollIntoViewIfNeeded();
  await hold(page, undo);
  await expect.poll(() => lift(undo)).toBeGreaterThan(0.5);
  await page.mouse.up();
  // The split chevron turns over in place: the first frame after opening is already the turned glyph.
  const chevron = section(page, 'Playground').getByRole('button', { name: 'More export options' });
  await chevron.click();
  await expect(chevron.locator('svg')).toHaveAttribute('data-turn', '180');
  const first = await chevron.locator('svg').evaluate((e) => new Promise<string>((r) => requestAnimationFrame(() => r(e.innerHTML))));
  await page.waitForTimeout(600);
  expect(await chevron.locator('svg').innerHTML()).toBe(first);
});
