#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transform } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
const source = readFileSync(resolve(root, 'packages/metalui/src/components/weather/sky.ts'), 'utf8');
const javascript = await transform(source, { loader: 'ts', format: 'esm' });
const { sky, mini, DEFAULT_SUN } = await import(`data:text/javascript;base64,${Buffer.from(javascript.code).toString('base64')}`);
const kinds = ['clear', 'partly', 'cloud', 'rain', 'storm', 'snow', 'mist', 'windy', 'heat'];
const cases = kinds.flatMap((kind, index) => [
  { kind, clock: 9, tick: index * 5, cols: 21, rows: 21, hz: 13 },
  { kind, clock: 23, tick: index * 5 + 1, cols: 21, rows: 21, hz: 13 },
  { kind, clock: 9, tick: index * 5 + 2, cols: 46, rows: 28, hz: 21 },
  { kind, clock: 23, tick: index * 5 + 3, cols: 46, rows: 28, hz: 21 },
].map((entry) => ({ ...entry, dots: Array.from(sky(entry.cols, entry.rows, entry.hz, entry.kind, entry.clock, entry.tick, DEFAULT_SUN)) })));
for (const kind of ['clear', 'storm', 'snow', 'mist', 'windy']) {
  for (const [cols, rows, hz] of [[21, 21, 13], [46, 28, 21]]) {
    const entry = { kind, clock: 7.5, tick: -3, cols, rows, hz };
    cases.push({ ...entry, dots: Array.from(sky(cols, rows, hz, kind, entry.clock, entry.tick, DEFAULT_SUN)) });
  }
}
const minis = kinds.flatMap((kind) => [true, false].map((day) => ({ kind, day, dots: Array.from(mini(kind, day)) })));
const output = resolve(root, 'swift/Tests/MetalUITests/Fixtures/sky.json');
mkdirSync(resolve(root, 'swift/Tests/MetalUITests/Fixtures'), { recursive: true });
writeFileSync(output, `${JSON.stringify({ cases, minis })}\n`);
console.log(`${cases.length} sky cases, ${minis.length} mini cases: ${output}`);
