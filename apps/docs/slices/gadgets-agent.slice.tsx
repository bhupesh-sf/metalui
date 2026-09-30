import { expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { openPage } from './harness';

// What an assistant reads: /AI.md's Gadgets section lists every Part and mechanism the manifest has, the
// manifest's ports are the catalog's own, and the reading rig, copied from AI.md alone, composes on the
// bench without a problem.
const fixtures = import.meta.glob<{ name: string; ports?: object }>('../../../packages/metalui/src/gadgets/fixtures/*.gadget.json', { eager: true, import: 'default' });
const count = (css: string) => document.querySelectorAll(css).length;

test('the guide and the manifest agree with the catalog', async () => {
  const guide = await (await fetch('/AI.md')).text(), manifest = await (await fetch('/gadgets.json')).json();
  const gadgets = guide.slice(guide.indexOf('\n# Gadgets'));
  expect(gadgets.length).toBeGreaterThan(1000);
  for (const part of Object.keys(manifest.parts)) expect(gadgets).toContain(`| \`${part}\` |`);
  for (const mech of Object.keys(manifest.mechanisms)) expect(gadgets).toContain(`| \`${mech}\` |`);
  // Every catalog gadget is in the manifest, with its own ports.
  const specs = Object.values(fixtures);
  expect(specs.length).toBeGreaterThan(0);
  expect(manifest.gadgets.map((g: { name: string }) => g.name).sort()).toEqual(specs.map((s) => s.name).sort());
  for (const s of specs) expect(manifest.gadgets.find((g: { name: string }) => g.name === s.name).ports).toEqual(s.ports ?? {});
  // The schemas are published.
  expect((await fetch('/schemas/gadget.schema.json')).ok).toBe(true);
  expect((await fetch('/schemas/rig.schema.json')).ok).toBe(true);
});

test('the reading rig, copied from AI.md alone, composes without a problem', async () => {
  const guide = await (await fetch('/AI.md')).text();
  const example = guide.slice(guide.indexOf('### Worked example: the reading rig'));
  const json = example.slice(example.indexOf('```json') + 7, example.indexOf('```', example.indexOf('```json') + 7)).trim();
  await openPage('/gadgets/compose', 'bone');
  await userEvent.fill(page.getByTestId('compose-source'), json);
  await expect.element(page.getByTestId('compose-result')).toHaveAttribute('data-kind', 'rig');
  await expect.poll(() => count('[data-testid="compose-problems"]')).toBe(0);
  await expect.poll(() => count('[data-testid="compose-rig"] svg[data-gadget]')).toBe(2);
});
