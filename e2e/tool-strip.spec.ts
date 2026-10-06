import { expect, test, type Page } from '@playwright/test';
import { COLORWAYS, capture, emulateMedia, open } from './helpers';

// Tool strip: verbs over a selection, adapted to it. The canvas: clicking a kind raises its verbs over it;
// adding another keeps the verbs they share and morphs (kept verbs glide, no jump); the strip follows pans and
// zooms and flips below near the top; verbs that don't fit fold into More; states say why, wait and hold.

const canvas = (page: Page) => page.getByTestId('strip-canvas');
const strip = (page: Page) => canvas(page).getByRole('toolbar');
const node = (page: Page, id: string) => canvas(page).locator(`[data-node="${id}"]`);
const verbs = (page: Page) => strip(page).locator(':scope > [data-verb]:not([data-verb$="-rule"])').evaluateAll((ks) => ks.map((k) => (k as HTMLElement).dataset.verb));

/** Selects (or with `add`, adds) a node with the pointer, as a click does. */
async function pick(page: Page, id: string, add = false) {
  await node(page, id).click({ modifiers: add ? ['Shift'] : [] });
}

/** The strip sits centred over the node, kept 12 inside the canvas's edges. */
async function expectCentredOver(page: Page, id: string) {
  const [s, n, c] = [(await strip(page).boundingBox())!, (await node(page, id).boundingBox())!, (await canvas(page).boundingBox())!];
  const x = Math.min(Math.max(n.x + n.width / 2 - s.width / 2, c.x + 12), c.x + c.width - 12 - s.width);
  expect(Math.abs(s.x - x)).toBeLessThan(2);
}

for (const colorway of COLORWAYS) {
  test(`the strip adapts to what was clicked, in ${colorway}`, async ({ page }) => {
    await open(page, '/components/tool-strip', colorway);
    await expect(strip(page)).toHaveCount(0);
    await pick(page, 'brief');
    await expect(strip(page)).toHaveAccessibleName('Tools for Poster brief');
    await expect.poll(() => verbs(page)).toEqual(['Tasks', 'Summarise', 'Region', 'Rename', 'Gather', 'Export', 'Send away']);
    // Placed: centred 12 above the selection.
    await page.waitForTimeout(500); // the rise settles
    await expectCentredOver(page, 'brief');
    const [s, n] = [(await strip(page).boundingBox())!, (await node(page, 'brief').boundingBox())!];
    expect(n.y - (s.y + s.height)).toBeGreaterThan(8);
    // Glyphs, names in tooltips; arrows move between verbs.
    await strip(page).getByRole('button', { name: 'Tasks' }).hover();
    await expect(page.getByText('Tasks', { exact: true }).last()).toBeVisible();
    await strip(page).getByRole('button', { name: 'Tasks' }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(strip(page).getByRole('button', { name: 'Summarise' })).toBeFocused();
    // An image too: only what both share, Rename only for one.
    await pick(page, 'photo', true);
    await expect(strip(page)).toHaveAccessibleName('Tools for 2 things');
    await expect.poll(() => verbs(page)).toEqual(['Gather', 'Export', 'Send away']);
    await strip(page).getByRole('button', { name: 'Send away' }).click();
    await expect(page.getByText('Sent away 2 things · Undo')).toBeVisible();
    await page.mouse.move(0, 0);
    await page.waitForTimeout(600);
    await page.locator('section', { hasText: 'Over a selection' }).first().screenshot({ path: capture(`tool-strip-${colorway}`) });
  });
}

test('changing the selection morphs the strip: kept verbs glide from where they were', async ({ page }) => {
  await open(page, '/components/tool-strip', 'graphite');
  await pick(page, 'brief');
  await expect.poll(() => verbs(page)).toHaveLength(7);
  await page.waitForTimeout(600); // the arrival settles
  // Sample Gather and the plate's ends every frame across the change (the change is fired inside the sampler).
  const film = await page.evaluate(async () => {
    const root = document.querySelector<HTMLElement>('[data-testid="strip-canvas"] [role="toolbar"]')!;
    const at = () => {
      const g = root.querySelector<HTMLElement>(':scope > [data-verb="Gather"]')!.getBoundingClientRect();
      const [a, b] = [...root.children[0].children].slice(1).map((h) => h.firstElementChild!.getBoundingClientRect());
      return { gather: g.left, plate: [a.left, b.right] };
    };
    const before = at();
    const link = document.querySelector('[data-node="link"]')!;
    link.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, shiftKey: true, pointerId: 1, button: 0 }));
    const frames: ReturnType<typeof at>[] = [];
    await new Promise<void>((done) => {
      const t0 = performance.now();
      const tick = () => { frames.push(at()); if (performance.now() - t0 < 900) requestAnimationFrame(tick); else done(); };
      requestAnimationFrame(tick);
    });
    return { before, frames };
  });
  await expect.poll(() => verbs(page)).toEqual(['Gather', 'Export', 'Send away']);
  const xs = film.frames.map((f) => f.gather);
  // It starts where it was, ends where it belongs, and never jumps between frames.
  expect(Math.abs(xs[0] - film.before.gather)).toBeLessThan(3);
  expect(Math.max(...xs.slice(1).map((x, i) => Math.abs(x - xs[i])))).toBeLessThan(40);
  const end = await strip(page).locator(':scope > [data-verb="Gather"]').boundingBox();
  expect(Math.abs(xs.at(-1)! - end!.x)).toBeLessThan(1);
  // The plate's ends start at the old ends.
  expect(Math.abs(film.frames[0].plate[0] - film.before.plate[0])).toBeLessThan(3);
  expect(Math.abs(film.frames[0].plate[1] - film.before.plate[1])).toBeLessThan(3);
});

test('it follows a pan and a zoom, and flips below the selection near the top', async ({ page }) => {
  await open(page, '/components/tool-strip', 'bone');
  await pick(page, 'link');
  await expect.poll(() => verbs(page)).toEqual(['Open', 'Copy link', 'Rename', 'Gather', 'Export', 'Send away']);
  await page.waitForTimeout(600);
  await page.evaluate(() => document.querySelector('[data-testid="strip-canvas"]')!.scrollIntoView({ block: 'center' }));
  const before = (await strip(page).boundingBox())!;
  const c = (await canvas(page).boundingBox())!;
  await page.mouse.move(c.x + 60, c.y + 340);
  await page.mouse.down();
  await page.mouse.move(c.x + 20, c.y + 230, { steps: 5 });
  await page.mouse.up();
  // Panned up by 110: the link sits near the top, so the strip goes under it.
  await expect(strip(page)).toHaveAttribute('data-side', 'bottom');
  const n = (await node(page, 'link').boundingBox())!;
  const after = (await strip(page).boundingBox())!;
  expect(after.y).toBeGreaterThan(n.y + n.height);
  expect(after.y).toBeLessThan(before.y + 120);
  await expectCentredOver(page, 'link');
  await canvas(page).getByRole('button', { name: 'Zoom in' }).click();
  // Zoomed in, the link moves down out of the top: there's room above again, and the strip goes back up.
  await expect(strip(page)).toHaveAttribute('data-side', 'top');
  const [z, s] = [(await node(page, 'link').boundingBox())!, (await strip(page).boundingBox())!];
  expect(Math.abs(s.y + s.height + 12 - z.y)).toBeLessThan(2);
  await expectCentredOver(page, 'link');
});

test('verbs that do not fit fold into More, before the destructive verb', async ({ page }) => {
  await open(page, '/components/tool-strip', 'bone');
  const room = page.getByTestId('narrow-room');
  const narrow = room.getByRole('toolbar', { name: 'Tools for the poster brief' });
  const names = await narrow.locator(':scope > [data-verb]:not([data-verb$="-rule"])').evaluateAll((ks) => ks.map((k) => (k as HTMLElement).dataset.verb));
  expect(names.at(-1)).toBe('Send away');
  expect(names.at(-2)).toBe('More');
  expect(names.length).toBeLessThan(7);
  expect((await narrow.boundingBox())!.width).toBeLessThanOrEqual(300);
  await narrow.getByRole('button', { name: 'More' }).click();
  await page.getByRole('menuitem', { name: 'Export' }).click();
  await expect(page.getByText('Copied as Markdown')).toBeVisible();
});

test('states: a disabled verb says why, a verb waits in its key, an irreversible one holds', async ({ page }) => {
  await open(page, '/components/tool-strip', 'graphite');
  const s = page.getByRole('toolbar', { name: 'Tools for 2 things in the past' });
  const summarise = s.getByRole('button', { name: 'Summarise' });
  await expect(summarise).toHaveAccessibleDescription('nothing to summarise yet');
  await expect(summarise).toHaveAttribute('aria-disabled', 'true');
  await summarise.hover();
  await expect(page.getByText('· nothing to summarise yet')).toBeVisible();
  await s.getByRole('button', { name: 'Lift subject' }).click();
  await expect(s.getByRole('button', { name: 'Lift subject' })).toHaveAttribute('aria-busy', 'true');
  await expect(page.getByText('Lifted the subject', { exact: true })).toBeVisible({ timeout: 4000 });
  const erase = s.getByRole('button', { name: 'Erase' });
  await erase.click(); // a tap only hints
  await expect(page.getByText('Erased 2 things for good')).toHaveCount(0);
  await erase.hover();
  await page.mouse.down();
  await page.waitForTimeout(1100);
  await page.mouse.up();
  await expect(page.getByText('Erased 2 things for good')).toBeVisible();
  await page.mouse.move(0, 0);
  await page.waitForTimeout(600); // the fill drains
  await page.locator('section', { hasText: 'States' }).first().screenshot({ path: capture('tool-strip-states-graphite') });
});

test('under Reduce Motion the strip changes at once', async ({ page }) => {
  await emulateMedia(page, [{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await open(page, '/components/tool-strip', 'bone');
  await pick(page, 'brief');
  await expect.poll(() => verbs(page)).toHaveLength(7);
  await pick(page, 'photo', true);
  await expect.poll(() => verbs(page)).toEqual(['Gather', 'Export', 'Send away']);
  const running = await strip(page).evaluate((el) => el.getAnimations({ subtree: true }).filter((a) => a.playState === 'running').length);
  expect(running).toBe(0);
});

// Over a list: a count leads, verbs carry glyphs, a verb with choices opens its menu, and an icon-only key is named.
test('the list strip leads with its count, opens a menu verb, and names its close key', async ({ page }) => {
  await open(page, '/components/tool-strip', 'bone');
  const list = page.getByRole('toolbar', { name: 'Tools for 3 selected tasks' });
  await expect(list).toContainText('3 selected');
  await expect(list.getByRole('button', { name: 'Complete' }).locator('svg.mu-ic-check')).toHaveCount(1);
  await list.getByRole('button', { name: 'Snooze' }).click();
  await page.getByRole('menuitem', { name: 'Tomorrow' }).click();
  await expect(page.getByText('Snoozed 3 tasks until tomorrow')).toBeVisible();
  await expect(list.getByRole('button', { name: 'Clear selection' })).toHaveText('');
});
