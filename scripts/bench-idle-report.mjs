// Reads bench/results/idle/*.json and prints pages that are not at rest, quietest-first baseline included.
import { readdirSync, readFileSync } from 'node:fs';
import { root } from './lib/emit.mjs';

const dir = root('bench/results/idle');
const rows = readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')));
const base = rows.find((r) => r.path === '/foundations/spacing');
const busy = rows.filter((r) => r.infiniteAnimations.length || r.runningFinite || r.layoutsPerS > 0 || r.scriptMsPerS > 1)
  .sort((a, b) => b.scriptMsPerS - a.scriptMsPerS);

console.log(`${rows.length} pages measured. baseline ${base ? `cpu ${base.cpuMsPerS.toFixed(1)} ms/s, script ${base.scriptMsPerS.toFixed(2)} ms/s, style ${base.styleRecalcsPerS.toFixed(1)}/s` : 'missing'}`);
console.log(`${busy.length} not at rest:\n`);
for (const r of busy) {
  console.log(`${r.path} (${r.colorway})  script ${r.scriptMsPerS.toFixed(2)} ms/s  layouts ${r.layoutsPerS.toFixed(1)}/s  style ${r.styleRecalcsPerS.toFixed(1)}/s  finite-running ${r.runningFinite}`);
  for (const a of r.infiniteAnimations) console.log(`    loop: ${a}`);
}
