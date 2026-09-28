// The timing contract every shot relies on, checked through the real clock and motion
// (src/time.ts, src/motion.ts): each sixteenth of the edit lands on its own frame, that frame
// reads back as that sixteenth and the frame before doesn't; and a spring told to land on a
// beat first touches its target on exactly that frame; and the storyboard covers every bar of the
// edit exactly once. Run: npm run check:timing
import { build } from 'esbuild';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

const out = join(mkdtempSync(join(tmpdir(), 'launch-timing-')), 'time.mjs');
const entry = join(dirname(out), 'entry.ts');
writeFileSync(entry, ['time', 'motion', 'storyboard'].map((m) => `export * from ${JSON.stringify(new URL(`../src/${m}.ts`, import.meta.url).pathname)};`).join('\n'));
await build({ entryPoints: [entry], bundle: true, format: 'esm', outfile: out, logLevel: 'error' });
const { frameAt, position, BARS, DURATION, land, contactFrames, CONTACT, storyboard } = await import(out);

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
const masses = ['part', 'object', 'hinge', 'surface', 'settle', 'release', 'chrome'];
for (const mass of masses) {
  const at = frameAt(13);
  if (!(land(at, at, mass) >= CONTACT && land(at - 1, at, mass) < CONTACT && land(at - contactFrames(mass), at, mass) === 0))
    wrong.push(`${mass} spring doesn't touch down exactly on its beat`);
}
// The storyboard covers the edit: every bar in exactly one shot, in order, none past the end.
const owners = Array.from({ length: BARS + 1 }, () => []);
for (const s of storyboard) for (let b = s.bars[0]; b <= s.bars[1]; b++) (owners[b] ?? (owners[b] = [])).push(s.id);
for (let b = 1; b < owners.length; b++) if (owners[b].length !== 1) wrong.push(`bar ${b} is in ${owners[b].length ? owners[b].join(' and ') : 'no shot'}`);
for (const s of storyboard) if (s.bars[1] > BARS) wrong.push(`${s.id} runs to bar ${s.bars[1]}; the edit has ${BARS}`);
if (wrong.length) {
  console.error(wrong.slice(0, 20).join('\n'));
  process.exit(1);
}
console.log(`storyboard: ${storyboard.length} shots cover all ${BARS} bars once\ntiming: ${checked} sixteenths each land on their own frame; ${masses.map((m) => `${m} ${contactFrames(m)}f`).join(', ')} to contact, each touching down on its beat`);
