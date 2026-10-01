// One small JSON for the /performance page: where the run came from, what idle looks like, what an import costs.
// Reads bench/results (env.json, idle/, bundle.json); writes bench/results/summary.json.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { root } from './lib/emit.mjs';

const read = (p) => JSON.parse(readFileSync(root('bench/results', p), 'utf8'));
const env = read('env.json');
const idleDir = root('bench/results/idle');
const rows = readdirSync(idleDir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(`${idleDir}/${f}`, 'utf8')));
const base = rows.find((r) => r.path === '/foundations/spacing');
const chrome = new Set(base?.infiniteAnimations ?? []);
const count = (list) => list.reduce((m, k) => ((m[k] = (m[k] ?? 0) + 1), m), {});

const notAtRest = rows
  .map((r) => ({ path: r.path, loops: count(r.infiniteAnimations.filter((a) => !chrome.has(a))), layoutsPerS: +r.layoutsPerS.toFixed(1), styleRecalcsPerS: +r.styleRecalcsPerS.toFixed(1) }))
  .filter((r) => Object.keys(r.loops).length || r.layoutsPerS > 0.5 || r.styleRecalcsPerS > (base?.styleRecalcsPerS ?? 0) + 3)
  .sort((a, b) => Object.keys(b.loops).length - Object.keys(a.loops).length || b.styleRecalcsPerS - a.styleRecalcsPerS);

const out = {
  schemaVersion: 1,
  sha: env.sha, startedAt: env.startedAt, valid: env.valid,
  host: { name: env.host, cpu: env.cpu, cpus: env.cpus, memGB: env.memGB, hypervisor: env.hypervisor?.trim(), node: env.node, playwright: env.playwright },
  load: { before: env.loadBefore, after: env.loadAfter, max: env.maxLoad },
  idle: {
    pages: rows.length,
    atRest: rows.length - notAtRest.length,
    chromeLoops: [...chrome],
    baseline: base ? { layoutsPerS: base.layoutsPerS, styleRecalcsPerS: +base.styleRecalcsPerS.toFixed(1) } : null,
    notAtRest,
    // Durations hold only when the host was quiet; the page must say so.
    durations: env.valid ? { baselineCpuMsPerS: base ? +base.cpuMsPerS.toFixed(1) : null } : null,
  },
};
if (existsSync(root('bench/results/bundle.json'))) {
  const b = read('bundle.json');
  const pick = (n) => (b.exports?.[n] ? { gzip: b.exports[n].gzip, raw: b.exports[n].raw } : null);
  out.bundle = { package: b.package.total, singleImport: Object.fromEntries(['Button', 'Switch', 'Led', 'Well', 'Surface', 'Menu', 'Tooltip'].map((n) => [n, pick(n)]).filter(([, v]) => v)) };
}
writeFileSync(root('bench/results/summary.json'), JSON.stringify(out, null, 2) + '\n');
console.log(`bench-summary: ${out.idle.atRest}/${out.idle.pages} pages at rest beyond the docs chrome, run ${out.valid ? 'valid' : 'INVALID (host busy)'}`);
