import { expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { COLORWAYS, mouse, openPage, pointer, until, type OpenOptions } from './harness';

const ROUTE = '/components/dialog';
const CALLOUTS = ['Sheet', 'Opening', 'Focus', 'Place', 'Shadow', 'Layers'];
const FOCUSABLE = ['Name', 'Cancel', 'Save'];
const $ = (css: string, root: ParentNode = document) => root.querySelector<HTMLElement>(css)!;
const $$ = (css: string, root: ParentNode = document) => [...root.querySelectorAll<HTMLElement>(css)];
const withText = (css: string, text: string, root: ParentNode = document) => $$(css, root).find((e) => e.textContent!.toLowerCase().includes(text.toLowerCase()))!;
const role = (root: Element, r: Parameters<typeof page.getByRole>[0], name: string) => page.elementLocator(root).getByRole(r, { name }).element() as HTMLElement;
const css = (el: Element, prop: string) => getComputedStyle(el).getPropertyValue(prop);
const inView = (el: Element) => { (el as HTMLElement & { scrollIntoViewIfNeeded(): void }).scrollIntoViewIfNeeded(); return el; };
/** A real click at an element's centre, whatever is drawn over it (Playwright's `force`). */
const click = (el: Element) => pointer(inView(el), [{ to: [0, 0] }, { down: true }, { up: true }]);
const hover = (el: Element) => pointer(inView(el), [{ to: [0, 0] }]);
const centre = (el: Element): [number, number] => { const b = el.getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; };
/** Whether a point is in the window: WebDriver cannot move the mouse outside it (Playwright can). */
const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < document.documentElement.clientWidth && y < document.documentElement.clientHeight;
/** Where to take hold of an element: its centre, scrolled into view so the drag stays in the window. */
function grip(target: Element, dx: number, dy: number): [number, number] {
  let [x, y] = centre(inView(target));
  if (!inside(x + dx, y + dy)) { target.scrollIntoView({ block: 'center', inline: 'center' }); [x, y] = centre(target); }
  return [x, y];
}
/** A whole drag in one call (the page captures the pointer, and the capture ends with each WebDriver call). */
async function drag(target: Element, dx: number, dy: number, steps = 8) {
  const [x, y] = grip(target, dx, dy);
  await mouse.drag([x, y], [x + dx, y + dy], { steps });
}
/** A drag that holds before letting go, to look mid-drag: check during the hold, then await it. */
function hold(target: Element, dx: number, dy: number, steps: number, ms = 1200) {
  const [x, y] = grip(target, dx, dy);
  return mouse.drag([x, y], [x + dx, y + dy], { steps, hold: ms });
}

// Locators, like Playwright's: read fresh each time (the card is rebuilt for every part).
const xray = () => $('#x-ray .xr');
const card = () => $('#x-ray .xr .xr-card');
/** The card rises in on a spring, so handles are measured once it has come to rest. */
const settle = () => Promise.all(card().getAnimations().map((a) => a.finished));
async function part(name: string) {
  await click($(`.xr-callout[aria-label^="${name}"]`, xray()));
  await settle();
}
const readout = (name: string) => withText('.ed-readout', name, card());
const value = (name: string) => readout(name)?.querySelector('.ed-roll > span:not(.is-out)')?.textContent ?? null;

async function openDocs(colorway: 'bone' | 'graphite', options?: OpenOptions) {
  await openPage(ROUTE, colorway, options);
  await userEvent.click(page.elementLocator(xray()).getByRole('button', { name: 'X-ray' }));
  await until(() => document.querySelector('#x-ray .xr .xr-card'));
  await settle();
}
const num = (name: string) => Number(value(name));
const style = (el: HTMLElement, prop: string) => el.style.getPropertyValue(prop);
const toggle = async (name: string) => userEvent.click(page.elementLocator(role(card(), 'switch', name)));

for (const colorway of COLORWAYS) {
  test(`each dialog callout holds the real dialog and no sliders in ${colorway}`, async () => {
    await openDocs(colorway);
    for (const name of CALLOUTS) {
      await part(name);
      await expect.poll(() => $$('.ed-specimen .mu-dialog', card()).length).toBe(1);
      expect($('.ed-specimen .mu-dialog .mu-dialog-title', card()).textContent).toBe('Rename canvas');
      expect($$('.mu-slider, .xr-dial, .xr-dials, .xr-switch', card())).toHaveLength(0);
      expect(page.elementLocator(card()).getByRole('switch', { name: 'Open a real dialog' }).elements()).toHaveLength(1);
    }
    // the last row opens the real, modal dialog
    await toggle('Open a real dialog');
    await expect.element(page.getByRole('dialog')).toBeVisible();
    await userEvent.keyboard('{Escape}');
    await expect.poll(() => page.getByRole('dialog').elements().length).toBe(0);
  });
}

test('the sheet dims the specimen and the bench', async () => {
  await openDocs('bone');
  await part('Sheet');
  const start = num('Dim');
  const sheet = () => $('.ed-dlg-scrim', card());
  const before = style(sheet(), 'background');
  const bench = style($('.xr-sheet3d', xray()), 'background');
  await drag(role(card(), 'slider', 'Dim'), 0, -40);
  await expect.poll(() => value('Dim')).not.toBe(String(start));
  expect(num('Dim')).toBeGreaterThan(start);
  expect(style(sheet(), 'background')).not.toBe(before);
  expect(style($('.xr-sheet3d', xray()), 'background')).not.toBe(bench);
});

test('pulling the dialog up sets how far it drops in, on the specimen and the bench', async () => {
  await openDocs('bone');
  await part('Opening');
  const start = num('Drops');
  await drag(role(card(), 'slider', 'Drop'), 0, -8);
  const rise = num('Drops');
  expect(rise).toBeGreaterThan(start);
  // let go and both the specimen and the bench arrive from that far up
  const froms = () => document.getAnimations().map((a) => {
    const t = (a.effect as KeyframeEffect).target as HTMLElement;
    return { bench: !!t.closest('.xr-bench'), from: String((a.effect as KeyframeEffect).getKeyframes()[0].transform ?? '') };
  });
  role(card(), 'slider', 'Drop').focus();
  await userEvent.keyboard('{ArrowUp}');
  await expect.poll(() => value('Drops')).toBe(String(rise + 1));
  const played = froms();
  expect(played.some((a) => !a.bench && a.from.includes(`translateY(-${rise + 1}px)`))).toBe(true);
  expect(played.some((a) => a.bench && /translateY\(-[\d.]+px\)/.test(a.from) && !a.from.includes(`-${rise + 1}px)`))).toBe(true);
});

test('the focus ring steps between the real stops and never lands between them', async () => {
  await openDocs('bone');
  await part('Focus');
  const ring = () => role(card(), 'slider', 'Focus');
  const first = ring().getAttribute('aria-valuetext');
  expect(FOCUSABLE).toContain(first);
  // a small nudge only leans
  await drag(ring(), 4, 0);
  await expect.poll(() => ring().getAttribute('aria-valuetext')).toBe(first);
  // far enough, it snaps to another stop
  await drag(ring(), 10, 6);
  const next = ring().getAttribute('aria-valuetext')!;
  expect(FOCUSABLE).toContain(next);
  expect(next).not.toBe(first);
  await expect.poll(() => value('Focus')).toBe(next);
  // the bench rings the same thing
  await expect.poll(() => $('.xr-bench .is-focus', xray()).textContent).toBe(next === 'Name' ? 'Trip notes' : next);
  // arrows step it too; Escape closes it and focus goes back to the button
  ring().focus();
  await userEvent.keyboard('{ArrowRight}');
  await expect.poll(() => ring().getAttribute('aria-valuetext')).not.toBe(next);
  await userEvent.keyboard('{Escape}');
  await expect.poll(() => role(card(), 'switch', 'Dialog open').getAttribute('aria-checked')).toBe('false');
  await expect.poll(() => $$('.xr-dialogwrap', xray()).length).toBe(0);
  await expect.poll(() => value('Focus')).toBe('the button');
  await toggle('Dialog open');
  await expect.poll(() => $$('.xr-dialogwrap', xray()).length).toBe(1);
  await expect.poll(() => ring().getAttribute('aria-valuetext')).toBe('Name');
});

test('place and shadow handles move the specimen and the bench', async () => {
  await openDocs('bone');
  await part('Place');
  const top = num('From the top');
  const place = () => $('.ed-dlg-place', card());
  const at = style(place(), 'top');
  const bench = style($('.xr-dialogwrap .xr-thumb', xray()), 'transform');
  await drag(role(card(), 'slider', 'Distance from the top'), 0, 30);
  expect(num('From the top')).toBeGreaterThan(top);
  expect(style(place(), 'top')).not.toBe(at);
  expect(style($('.xr-dialogwrap .xr-thumb', xray()), 'transform')).not.toBe(bench);

  await part('Shadow');
  const lift = value('Height');
  const dialog = () => $('.ed-specimen .mu-dialog', card());
  const lastFace = () => $$('.xr-dialogwrap .xr-face', xray()).at(-1)!;
  const shadow = style(dialog(), 'box-shadow');
  const z = style(lastFace(), 'transform');
  await drag(role(card(), 'slider', 'Height'), 0, -30);
  await expect.poll(() => value('Height')).not.toBe(lift);
  expect(style(dialog(), 'box-shadow')).not.toBe(shadow);
  expect(style(lastFace(), 'transform')).not.toBe(z);
});

test('layer switches take the same layer off the specimen and the bench', async () => {
  await openDocs('bone');
  await part('Layers');
  const dialog = () => $('.ed-specimen .mu-dialog', card());
  const layer = (name: string) => withText('.xr-face.is-layer', name, xray());
  expect(layer('Plate').className).not.toMatch(/is-off/);
  await toggle('Plate');
  await expect.poll(() => role(card(), 'switch', 'Plate').getAttribute('aria-checked')).toBe('false');
  expect(style(dialog(), 'background')).toBe('transparent');
  await expect.poll(() => layer('Plate').className).toMatch(/is-off/);
  const shadow = style(dialog(), 'box-shadow');
  await toggle('Far shadow');
  expect(style(dialog(), 'box-shadow')).not.toBe(shadow);
  await expect.poll(() => layer('Far shadow').className).toMatch(/is-off/);
  // hovering a row points at its slice on the bench
  await hover(withText('.ed-layer', 'Rim', card()));
  await expect.poll(() => layer('Rim').className).toMatch(/is-focus/);
});

test('readouts scrub by drag and by arrows; a focused handle shows its hint', async () => {
  await openDocs('bone');
  await part('Sheet');
  const start = num('Dim');
  await drag(readout('Dim'), 0, -24);
  const scrubbed = num('Dim');
  expect(scrubbed).toBeGreaterThan(start);
  readout('Dim').focus();
  await userEvent.keyboard('{ArrowDown}');
  await expect.poll(() => value('Dim')).toBe(String(scrubbed - 5));
  role(card(), 'slider', 'Dim').focus();
  await expect.poll(() => document.querySelector('.ed-tag')?.textContent).toContain('Dim');

  await part('Place');
  const top = num('From the top');
  readout('From the top').focus();
  await userEvent.keyboard('{ArrowUp}');
  await expect.poll(() => value('From the top')).toBe(String(top + 1));
  role(card(), 'slider', 'Distance from the top').focus();
  await expect.poll(() => document.querySelector('.ed-tag')?.textContent).toContain('Distance from the top');
});

test('at 375 px wide in graphite every card fits with no sideways scroll', async () => {
  await openDocs('graphite', { viewport: [375, 812] });
  for (const name of CALLOUTS) {
    await part(name);
    await expect.poll(() => $$('.ed-specimen .mu-dialog', card()).length).toBe(1);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(375);
    const well = $('.ed-specimen', card()).getBoundingClientRect();
    const win = $('.ed-dlg-win', card()).getBoundingClientRect();
    expect(win.x).toBeGreaterThanOrEqual(well.x);
    expect(win.x + win.width).toBeLessThanOrEqual(well.x + well.width + 0.5);
  }
});
