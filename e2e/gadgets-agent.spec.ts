import { readFileSync, readdirSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { open } from './helpers';

// What an assistant reads: /AI.md's Gadgets section lists every Part and mechanism the manifest has, the
// manifest's ports are the catalog's own, and the reading rig, copied from AI.md alone, composes on the
// bench without a problem.
const FIXTURES = 'packages/metalui/src/gadgets/fixtures';

test('the guide and the manifest agree with the catalog', async ({ request }) => {
  const guide = await (await request.get('/AI.md')).text(), manifest = await (await request.get('/gadgets.json')).json();
  const gadgets = guide.slice(guide.indexOf('\n# Gadgets'));
  expect(gadgets.length).toBeGreaterThan(1000);
  for (const part of Object.keys(manifest.parts)) expect(gadgets).toContain(`| \`${part}\` |`);
  for (const mech of Object.keys(manifest.mechanisms)) expect(gadgets).toContain(`| \`${mech}\` |`);
  // Every catalog gadget is in the manifest, with its own ports.
  const specs = readdirSync(FIXTURES).filter((f) => f.endsWith('.gadget.json')).map((f) => JSON.parse(readFileSync(`${FIXTURES}/${f}`, 'utf8')));
  expect(manifest.gadgets.map((g: { name: string }) => g.name).sort()).toEqual(specs.map((s) => s.name).sort());
  for (const s of specs) expect(manifest.gadgets.find((g: { name: string }) => g.name === s.name).ports).toEqual(s.ports ?? {});
  // The schemas are published.
  expect((await request.get('/schemas/gadget.schema.json')).ok()).toBe(true);
  expect((await request.get('/schemas/rig.schema.json')).ok()).toBe(true);
});

test('the reading rig, copied from AI.md alone, composes without a problem', async ({ page, request }) => {
  const guide = await (await request.get('/AI.md')).text();
  const example = guide.slice(guide.indexOf('### Worked example: the reading rig'));
  const json = example.slice(example.indexOf('```json') + 7, example.indexOf('```', example.indexOf('```json') + 7)).trim();
  await open(page, '/gadgets/compose', 'bone');
  await page.getByTestId('compose-source').fill(json);
  await expect(page.getByTestId('compose-result')).toHaveAttribute('data-kind', 'rig');
  await expect(page.getByTestId('compose-problems')).toHaveCount(0);
  await expect(page.getByTestId('compose-rig').locator('svg[data-gadget]')).toHaveCount(2);
});
