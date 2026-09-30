import { expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { COLORWAYS, capture, openPage } from './harness';

// The feel model (tokens.gadgets.feel, .jobs, .set) and the spec validator, as a reader meets them
// on Foundations › Gadgets: a feel crossing a material boundary re-casts the object, a job's pin
// wins over feel, the worked set is checked side by side, and every broken spec says how to fix it.
const bench = () => page.getByTestId('feel-bench');
/** An element's text as Playwright's toHaveText compares it: whitespace collapsed and trimmed. */
const text = (el: Element) => (el.textContent ?? '').replace(/\s+/g, ' ').trim();
const at = (css: string) => page.elementLocator(document.querySelector(css)!);

async function choose(label: string, option: string) {
  await userEvent.click(page.getByRole('combobox', { name: label }));
  await userEvent.click(page.getByRole('option', { name: option, exact: true }));
}
/** Presses a key on a control, as Playwright's locator.press: focus it, then the key. */
async function pressOn(el: Element, key: string) {
  (el as HTMLElement).focus();
  await userEvent.keyboard(`{${key}}`);
}

test('feel picks the material, and crossing a boundary re-casts the object', async () => {
  await openPage('/foundations/gadgets', 'bone');
  await expect.element(bench()).toHaveAttribute('data-material', 'resin');     // link, a 0.8, w 0.4: active → resin
  const weight = page.getByRole('slider', { name: 'Weight' }).element();
  await pressOn(weight, 'PageUp');                                            // w 0.5, still active → metal
  await expect.element(bench()).toHaveAttribute('data-material', 'metal');
  await expect.poll(() => text(page.getByTestId('feel-material').element())).toBe('Metal');
  await pressOn(weight, 'PageUp'); await pressOn(weight, 'PageUp'); await pressOn(weight, 'PageUp');   // w 0.8 → glass
  await expect.element(bench()).toHaveAttribute('data-material', 'glass');
  const valence = page.getByRole('slider', { name: 'Valence' }).element();
  for (let i = 0; i < 3; i++) await pressOn(valence, 'PageDown');             // v 0.4, still heavy → rubber
  await expect.element(bench()).toHaveAttribute('data-material', 'rubber');
});

test("a job's pin wins over feel", async () => {
  await openPage('/foundations/gadgets', 'graphite');
  await choose('Job', 'identify');
  await expect.element(bench()).toHaveAttribute('data-job', 'identify');
  await expect.element(bench()).toHaveAttribute('data-material', 'glass');
  await choose('Job', 'command');
  await expect.element(bench()).toHaveAttribute('data-material', 'ceramic');
});

test('the worked set resolves, and side by side it says where it repeats itself', async () => {
  await openPage('/foundations/gadgets', 'bone');
  expect(document.querySelectorAll('[data-testid="worked-set"] [data-placement]')).toHaveLength(11);
  await expect.element(at('[data-placement="trash"]')).toHaveAttribute('data-material', 'rubber');
  await expect.element(at('[data-placement="account"]')).toHaveAttribute('data-material', 'glass');
  await expect.element(at('[data-placement="capture"]')).toHaveAttribute('data-material', 'resin');
  await expect.element(at('[data-testid="set-problems"] [data-code="set.hue"]')).toBeVisible();
  await expect.element(at('[data-testid="set-problems"] [data-code="set.cvd"]')).toBeVisible();
});

const BROKEN: [string, string][] = [
  ['Break: an invented part', 'part.unknown'],
  ['Break: no lamp', 'part.roles'],
  ['Break: beeping at rest', 'state.beep'],
  ['Break: an unbound slot', 'mechanism.unbound'],
  ['Break: a jack cut from clay', 'part.material'],
  ['Break: off the canvas', 'part.offCanvas'],
  ['Break: a feel out of range', 'field.range'],
  ['Break: an old schema', 'schema.version'],
  ['Break: cables in a loop', 'cable.cycle'],
  ['Break: a cable of the wrong kind', 'port.kind'],
  ['Break: two of the same', 'set.band'],
];

test('valid specs pass and every broken one names its problem and its fix', async () => {
  await openPage('/foundations/gadgets', 'bone');
  const inBench = (css: string) => () => document.querySelector(`[data-testid="spec-bench"] ${css}`);
  for (const valid of ['Patch bay (valid)', 'Counter drum (valid)', 'Needle gauge (valid)', 'Reading rig (valid)']) {
    await choose('Example spec', valid);
    await expect.poll(inBench('[data-result="ok"]')).toBeTruthy();
    await expect.element(page.elementLocator(inBench('[data-result="ok"]')()!)).toBeVisible();
  }
  for (const [label, code] of BROKEN) {
    await choose('Example spec', label);
    await expect.poll(inBench(`[data-code="${code}"]`), { message: label }).toBeTruthy();
    const problem = inBench(`[data-code="${code}"]`)()!;
    await expect.element(page.elementLocator(problem), { message: label }).toBeVisible();
    expect(problem.textContent, `${label} offers a fix`).toContain('→');
  }
  // Editing the text validates as you type.
  await choose('Example spec', 'Counter drum (valid)');
  await userEvent.fill(page.getByRole('textbox', { name: 'Spec' }), '{ "$schema": "metalui/gadget@1" ');
  await expect.poll(inBench('[data-result="parse"]')).toBeTruthy();
  await expect.element(page.elementLocator(inBench('[data-result="parse"]')()!)).toBeVisible();
});

for (const colorway of COLORWAYS) {
  test(`gadgets page in ${colorway}`, async () => {
    await openPage('/foundations/gadgets', colorway);
    const section = [...document.querySelectorAll('section')].find((s) => s.textContent?.includes('Choose a job, then move through the space'))!;
    expect(section).toBeTruthy();
    await capture(`gadgets-feel-${colorway}`, section);
    await capture(`gadgets-worked-set-${colorway}`, document.querySelector('[data-testid="worked-set"]')!);
  });
}
