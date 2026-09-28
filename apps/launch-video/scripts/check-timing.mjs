// The timing contract every shot relies on, checked through the real clock (src/time.ts):
// each sixteenth of the edit lands on its own frame, that frame reads back as that sixteenth,
// and the frame before it doesn't. Run: npm run check:timing
import { build } from 'esbuild';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const out = join(mkdtempSync(join(tmpdir(), 'launch-timing-')), 'time.mjs');
await build({ entryPoints: [new URL('../src/time.ts', import.meta.url).pathname], bundle: true, format: 'esm', outfile: out, logLevel: 'error' });
const { frameAt, position, BARS, DURATION } = await import(out);

const wrong = [];
let checked = 0;
for (let bar = 1; bar <= BARS; bar++)
  for (let beat = 1; beat <= 4; beat++)
    for (let step = 0; step < 4; step++) {
      const f = frameAt(bar, beat, step);
      if (f >= DURATION) continue;
      checked++;
      const p = position(f);
      const q = position(f - 1);
      if (p.bar !== bar || p.beat !== beat || p.step !== step) wrong.push(`${bar}.${beat}.${step + 1} at f${f} reads ${p.bar}.${p.beat}.${p.step + 1}`);
      if (q.bar === bar && q.beat === beat && q.step === step) wrong.push(`${bar}.${beat}.${step + 1} already reads at f${f - 1}`);
    }
if (wrong.length) {
  console.error(wrong.slice(0, 20).join('\n'));
  process.exit(1);
}
console.log(`timing: ${checked} sixteenths each land on their own frame`);
