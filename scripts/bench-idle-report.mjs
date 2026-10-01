// Reads bench/results/idle/*.json and prints what each page does at rest beyond the docs chrome.
// Counters (loops, layouts/s, style recalcs/s) hold on any machine; durations (ms/s) only when env.json says valid.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { root } from './lib/emit.mjs';

const dir = root('bench/results/idle');
const rows = readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')));
const envPath = root('bench/results/env.json');
const env = existsSync(envPath) ? JSON.parse(readFileSync(envPath, 'utf8')) : null;
const base = rows.find((r) => r.path === '/foundations/spacing');
const chrome = new Set(base?.infiniteAnimations ?? []); // loops every docs page carries

const tally = (list) => [...list.reduce((m, k) => m.set(k, (m.get(k) ?? 0) + 1), new Map())].map(([k, n]) => (n > 1 ? `${k} x${n}` : k));
const extra = (r) => tally(r.infiniteAnimations.filter((a) => !chrome.has(a)));
const durations = env?.valid ?? false;

console.log(`${rows.length} pages. host ${env ? `${env.host} (${env.cpu}, ${env.hypervisor?.trim()}), load ${env.loadBefore} -> ${env.loadAfter}` : 'unknown'}`);
console.log(durations ? 'run valid: durations are trustworthy' : 'run INVALID (host busy): durations below are NOT trustworthy; counters still are');
console.log(`docs chrome on every page: ${[...chrome].join(', ') || 'nothing'}`);
if (base) console.log(`baseline: layouts ${base.layoutsPerS}/s, style recalcs ${base.styleRecalcsPerS.toFixed(1)}/s${durations ? `, script ${base.scriptMsPerS.toFixed(2)} ms/s` : ''}\n`);

const busy = rows.map((r) => ({ r, loops: extra(r) }))
  .filter(({ r, loops }) => loops.length || r.runningFinite || r.layoutsPerS > 0.5 || r.styleRecalcsPerS > (base?.styleRecalcsPerS ?? 0) + 3)
  .sort((a, b) => b.loops.length - a.loops.length || b.r.styleRecalcsPerS - a.r.styleRecalcsPerS);
console.log(`${busy.length} pages do more than the baseline at rest:\n`);
for (const { r, loops } of busy) {
  console.log(`${r.path}  layouts ${r.layoutsPerS.toFixed(1)}/s  style ${r.styleRecalcsPerS.toFixed(1)}/s  finite-running ${r.runningFinite}${durations ? `  script ${r.scriptMsPerS.toFixed(2)} ms/s` : ''}`);
  for (const l of loops) console.log(`    loop: ${l}`);
}
