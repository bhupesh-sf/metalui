import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import tokens from '../../../tokens/tokens.json';
import { COLORWAYS, mouse, openPage, pointer, until, type OpenOptions, userEvent } from './harness';

// The suggestion chip x-ray's editing layer: every card holds the real SuggestionChip to handle,
// never a slider. Its handles, readouts and switches change the same model the bench draws.

const ROUTE = '/components/suggestion-chip';
// the chip's frost at rest: the alpha of the suggestion's background in the chip recipe, in percent
const FROST = Math.round(100 * Number(tokens.recipes.chip.layers.find((l) => l.part === 'suggestion' && l.prop === 'background')!.value.match(/,\s*([\d.]+)\)$/)![1]));
const QUESTIONS = ['Track as mood?', 'Task?', 'Date friday?', 'Move to Done?'];
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
const chip = () => $('.ed-specimen .mu-suggestion', card());
const face = () => $('.xr-chipwrap .xr-face', xray());

for (const colorway of COLORWAYS) {
  test(`every suggestion chip card holds the real chip and no sliders in ${colorway}`, async () => {
    await openDocs(colorway);
    for (const name of ['Type', 'States', 'Answer', 'Surface', 'Shape', 'Layers']) {
      await part(name);
      await expect.poll(() => $$('.ed-specimen .mu-suggestion', card()).length).toBe(1);
      expect($$('.mu-slider, .xr-dial', card())).toHaveLength(0);
    }
    // the chip is always a pill in one size: no corner handle, no size step
    await part('Shape');
    expect($$('.ed-corner', card())).toHaveLength(0);
    expect(role(card(), 'slider', 'Height').getAttribute('aria-valuetext') ?? '').toBe('');
  });
}

test('type: the question steps between real questions; how sure moves freely; both show on the bench', async () => {
  await openDocs('bone');
  await part('Type');
  const question = () => role(card(), 'slider', 'Question');
  const start = question().getAttribute('aria-valuetext')!;
  expect(QUESTIONS).toContain(start);
  // a small nudge only leans; it never changes the question
  await drag(question(), 4, 0, 10);
  await expect.poll(() => question().getAttribute('aria-valuetext')).toBe(start);
  // far enough, it snaps to another real question, never something in between
  await drag(question(), 40, 0, 10);
  const next = question().getAttribute('aria-valuetext')!;
  expect(QUESTIONS).toContain(next);
  expect(next).not.toBe(start);
  await expect.poll(() => $('.ed-specimen .mu-chip-text', card()).textContent).toBe(next);
  await expect.poll(() => $('.xr-chipface > span', xray()).textContent).toBe(next);
  // how sure: the engraved number is its own handle
  const sure = () => role(card(), 'slider', 'How sure');
  const conf0 = sure().getAttribute('aria-valuenow')!;
  await drag(sure(), -30, 0, 10);
  await expect.poll(() => sure().getAttribute('aria-valuenow')).not.toBe(conf0);
  const shown = $('.ed-specimen .mu-suggestion-conf', card()).textContent;
  expect(shown).not.toBe(Number(conf0).toFixed(2));
  await expect.poll(() => $('.xr-chipconf', xray()).textContent).toBe(shown);
});

test('states: pointing at the line clears the chip on the specimen and the bench; the switch holds it', async () => {
  await openDocs('bone');
  await part('States');
  const quiet = () => $('.xr-chipwrap', xray()).classList.contains('is-quiet');
  await expect.poll(quiet).toBe(true);
  const rest = Number(css(chip(), 'opacity'));
  expect(rest).toBeLessThan(1);
  await hover($('.ed-chip-host', card()));
  await expect.poll(quiet).toBe(false);
  await expect.poll(() => css(chip(), 'opacity')).toBe('1');
  await mouse.move(0, 0);
  await expect.poll(quiet).toBe(true);
  await userEvent.click(page.elementLocator(role(card(), 'switch', 'Point at the line')));
  await expect.poll(quiet).toBe(false);
  await expect.poll(() => css(chip(), 'opacity')).toBe('1');
});

test('answer: pressing ✓ on the specimen answers on the bench too', async () => {
  await openDocs('bone');
  await part('Answer');
  await userEvent.click(page.elementLocator($('.ed-specimen', card())).getByRole('button', { name: 'Accept' }));
  await expect.poll(() => $('.ed-specimen', card()).textContent).toContain('accepted');
  await expect.poll(() => $$('.xr-chipwrap.is-yes', xray()).length).toBe(1);
  // it comes back, and × says no
  await expect.poll(() => $$('.ed-specimen .mu-suggestion', card()).length).toBe(1);
  await userEvent.click(page.elementLocator($('.ed-specimen', card())).getByRole('button', { name: 'Dismiss' }));
  await expect.poll(() => $$('.xr-chipwrap.is-no', xray()).length).toBe(1);
});

test('surface: the chip is the frost handle and catches on its token; the green line is a switch', async () => {
  await openDocs('bone');
  await part('Surface');
  const frost0 = value('Frost');
  const bg0 = css(chip(), 'background-color');
  const bench0 = face().style.background;
  await drag(role(card(), 'slider', 'Frost'), 0, 12, 10);
  await expect.poll(() => value('Frost')).not.toBe(frost0);
  expect(css(chip(), 'background-color')).not.toBe(bg0);
  expect(face().style.background).not.toBe(bench0);
  const ring0 = css(chip(), 'box-shadow');
  await userEvent.click(page.elementLocator(role(card(), 'switch', 'Green line')));
  expect(css(chip(), 'box-shadow')).not.toBe(ring0);
  expect(css(chip(), 'box-shadow')).not.toContain('63, 185, 122');
});

test('shape: the top edge sets the height and the left end the space on the left, on both', async () => {
  await openDocs('bone');
  await part('Shape');
  const h0 = value('Height');
  const benchH = face().style.height;
  const specH = chip().offsetHeight;
  await hover($('.ed-box', card()));
  await drag(role(card(), 'slider', 'Height'), 0, -14, 10);
  await expect.poll(() => value('Height')).not.toBe(h0);
  expect(chip().offsetHeight).toBeGreaterThan(specH);
  expect(face().style.height).not.toBe(benchH);
  const p0 = value('Space on the left');
  const benchW = face().style.width;
  const specW = chip().offsetWidth;
  await hover($('.ed-box', card()));
  await drag(role(card(), 'slider', 'Space on the left'), -12, 0, 10);
  await expect.poll(() => value('Space on the left')).not.toBe(p0);
  expect(chip().offsetWidth).toBeGreaterThan(specW);
  expect(face().style.width).not.toBe(benchW);
});

test('layers are switches: turning one off takes it off the specimen and the bench', async () => {
  await openDocs('bone');
  await part('Layers');
  const drop = () => withText('.xr-face.is-layer', 'Drop', xray());
  expect(drop().className).not.toMatch(/is-off/);
  const shadow = css(chip(), 'box-shadow');
  await userEvent.click(page.elementLocator(role(card(), 'switch', 'Drop')));
  await expect.poll(() => role(card(), 'switch', 'Drop').getAttribute('aria-checked')).toBe('false');
  await expect.poll(() => drop().className).toMatch(/is-off/);
  expect(css(chip(), 'box-shadow')).not.toBe(shadow);
});

test('readouts scrub by drag and by arrows; a focused handle shows its hint', async () => {
  await openDocs('bone');
  await part('Shape');
  const h0 = Number(value('Height'));
  await drag(readout('Height'), 0, -24, 10);
  await expect.poll(() => value('Height')).not.toBe(`${h0}`);
  const h1 = Number(value('Height'));
  expect(h1).toBeGreaterThan(h0);
  readout('Height').focus();
  await userEvent.keyboard('{ArrowDown}');
  await expect.poll(() => value('Height')).toBe(`${h1 - 1}`);
  // the question readout steps between real questions too
  await part('Type');
  const q0 = value('Question')!;
  readout('Question').focus();
  await userEvent.keyboard(q0 === QUESTIONS.at(-1) ? '{ArrowDown}' : '{ArrowUp}');
  const q1 = value('Question')!;
  expect(q1).not.toBe(q0);
  expect(QUESTIONS).toContain(q1);
  // keyboard focus on a handle shows its tag above the chip
  await part('Surface');
  // reach the handle by keyboard (Shift+Tab back from its readout), as a keyboard user would
  readout('Frost').focus();
  await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
  await expect.poll(() => document.activeElement).toBe(role(card(), 'slider', 'Frost'));
  await expect.poll(() => document.querySelector('.ed-tag')?.textContent).toContain('Frost');
  await userEvent.keyboard('{ArrowUp}');
  await expect.poll(() => value('Frost')).not.toBe(String(FROST));
});

test('narrow graphite: every card fits 375 px with no sideways scroll', async () => {
  await openDocs('graphite', { viewport: [375, 812] });
  for (const name of ['Type', 'States', 'Answer', 'Surface', 'Shape', 'Layers']) {
    await part(name);
    await expect.poll(() => $$('.ed-specimen .mu-suggestion', card()).length).toBe(1);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(375);
  }
});
