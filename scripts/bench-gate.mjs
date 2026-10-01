// Hard gate on idle counters. Counters do not depend on how busy the machine is, so this holds anywhere.
//   node scripts/bench-gate.mjs            fail if any page does more at rest than bench/budgets.json allows
//   node scripts/bench-gate.mjs --ratchet  write budgets from the current run (only ever lowers a ceiling)
// A ceiling is the most a page may do at rest: running infinite animations (exact, by signature and count)
// and layouts/style recalcs per second (25% headroom). Lower a ceiling by fixing the page, then --ratchet.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { root } from './lib/emit.mjs';

const dir = root('bench/results/idle');
const budgetPath = root('bench/budgets.json');
const RATCHET = process.argv.includes('--ratchet');
const rows = readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')));
const budgets = existsSync(budgetPath) ? JSON.parse(readFileSync(budgetPath, 'utf8')) : { pages: {} };

const count = (list) => list.reduce((m, k) => ((m[k] = (m[k] ?? 0) + 1), m), {});
const head = (v) => Math.ceil(v * 1.25 * 10) / 10;

if (RATCHET) {
  for (const r of rows) {
    const cur = { loops: count(r.infiniteAnimations), layoutsPerS: head(r.layoutsPerS), styleRecalcsPerS: head(r.styleRecalcsPerS) };
    const old = budgets.pages[r.path];
    if (!old) { budgets.pages[r.path] = cur; continue; }
    for (const [k, n] of Object.entries(cur.loops)) old.loops[k] = Math.min(old.loops[k] ?? n, n);
    for (const k of Object.keys(old.loops)) if (!(k in cur.loops)) delete old.loops[k];
    old.layoutsPerS = Math.min(old.layoutsPerS, cur.layoutsPerS);
    old.styleRecalcsPerS = Math.min(old.styleRecalcsPerS, cur.styleRecalcsPerS);
  }
  writeFileSync(budgetPath, JSON.stringify(budgets, null, 2) + '\n');
  console.log(`bench-gate: ratcheted ${Object.keys(budgets.pages).length} page budgets`);
  process.exit(0);
}

const fails = [];
for (const r of rows) {
  const b = budgets.pages[r.path];
  if (!b) { fails.push(`${r.path}: no budget (new page; run --ratchet after reviewing it)`); continue; }
  for (const [k, n] of Object.entries(count(r.infiniteAnimations))) if (n > (b.loops[k] ?? 0)) fails.push(`${r.path}: new running loop ${k} x${n} (budget ${b.loops[k] ?? 0})`);
  if (r.layoutsPerS > b.layoutsPerS) fails.push(`${r.path}: ${r.layoutsPerS.toFixed(1)} layouts/s at rest (budget ${b.layoutsPerS})`);
  if (r.styleRecalcsPerS > b.styleRecalcsPerS) fails.push(`${r.path}: ${r.styleRecalcsPerS.toFixed(1)} style recalcs/s at rest (budget ${b.styleRecalcsPerS})`);
}
if (fails.length) { console.error(`bench-gate: ${fails.length} budget breach(es)\n  ${fails.join('\n  ')}`); process.exit(1); }
console.log(`bench-gate: ${rows.length} pages within budget`);
