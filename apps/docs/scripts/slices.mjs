#!/usr/bin/env node
// Runs the feature slices in shards: each shard is its own Vitest run with its own Chrome, so each has
// its own mouse and window (slices in one run take turns; runs side by side do not collide).
//
//   node scripts/slices.mjs             every slice, in min(4, cores / 2) shards
//   node scripts/slices.mjs --shards 2  a set number of shards
//   node scripts/slices.mjs button      a filter runs in one shard (it is small)
//
// Every child is ours: interrupting the runner stops them all, so no Chrome is left behind.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';

const args = process.argv.slice(2);
const at = args.indexOf('--shards');
const shards = at >= 0 ? Number(args.splice(at, 2)[1]) : Math.max(1, Math.min(4, Math.floor(availableParallelism() / 2)));
const filters = args.filter((a) => !a.startsWith('-'));
const extra = args.filter((a) => a.startsWith('-'));
const n = filters.length ? 1 : shards;

const children = [];
const stop = () => { for (const c of children) if (c.exitCode === null) c.kill('SIGTERM'); };
process.on('SIGINT', () => { stop(); process.exit(130); });
process.on('SIGTERM', () => { stop(); process.exit(143); });

const started = Date.now();
const runs = Array.from({ length: n }, (_, i) => new Promise((done) => {
  const shard = n > 1 ? [`--shard=${i + 1}/${n}`] : [];
  const child = spawn('npx', ['vitest', 'run', ...shard, ...filters, ...extra], { cwd: new URL('..', import.meta.url), stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, SLICE_SHARD: String(i + 1) } });
  children.push(child);
  let out = '';
  child.stdout.on('data', (d) => { out += d; });
  child.stderr.on('data', (d) => { out += d; });
  child.on('exit', (code) => done({ i, code, out }));
}));

const results = await Promise.all(runs);
// Each shard's whole log is kept, so a failure can be read after the run: .vitest/shard-N.log
const logs = new URL('../.vitest/', import.meta.url);
mkdirSync(logs, { recursive: true });
let failed = 0;
for (const r of results) {
  const clean = r.out.replace(/\x1b\[[0-9;]*m/g, '');
  writeFileSync(new URL(`shard-${r.i + 1}.log`, logs), clean);
  const summary = clean.split('\n').filter((l) => /Test Files|Tests |FAIL/.test(l));
  console.log(`— shard ${r.i + 1}/${n}${r.code ? ' (failed)' : ''}\n${summary.join('\n')}`);
  if (r.code) { failed++; console.log(`  log: .vitest/shard-${r.i + 1}.log`); }
}
console.log(`${n} shard(s) in ${((Date.now() - started) / 1000).toFixed(1)} s${failed ? `, ${failed} failed` : ''}`);
process.exit(failed ? 1 : 0);
