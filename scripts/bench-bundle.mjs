// Bytes shipped, per file: raw, gzip, brotli. Deterministic, no browser.
// Reads the built package and docs site (run `npm run build` first); writes bench/results/bundle.json.
import { readdirSync, readFileSync, statSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { gzipSync, brotliCompressSync, constants } from 'node:zlib';
import { join, relative, extname } from 'node:path';
import { root } from './lib/emit.mjs';

const TARGETS = {
  package: root('packages/metalui/dist'),
  docs: root('apps/docs/dist/assets'),
};
const EXTS = new Set(['.js', '.css']);

// Docs files carry a content hash (Button-BGgwAqdQ.js); key them without it so runs compare.
const stable = (name) => name.replace(/-[A-Za-z0-9_-]{8}(\.(?:js|css))$/, '$1');

function walk(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const brotli = (buf) => brotliCompressSync(buf, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length;

const out = {};
for (const [group, dir] of Object.entries(TARGETS)) {
  if (!existsSync(dir)) { console.error(`bench-bundle: ${relative(root(), dir)} missing, run npm run build`); process.exit(1); }
  const files = {};
  for (const p of walk(dir).filter((f) => EXTS.has(extname(f)))) {
    const buf = readFileSync(p);
    files[stable(relative(dir, p))] = { raw: buf.length, gzip: gzipSync(buf, { level: 9 }).length, brotli: brotli(buf) };
  }
  const sum = (k) => Object.values(files).reduce((s, f) => s + f[k], 0);
  out[group] = { total: { raw: sum('raw'), gzip: sum('gzip'), brotli: sum('brotli') }, files };
}

mkdirSync(root('bench/results'), { recursive: true });
writeFileSync(root('bench/results/bundle.json'), JSON.stringify(out, null, 2) + '\n');

const kb = (n) => (n / 1024).toFixed(1).padStart(8);
for (const [group, { total, files }] of Object.entries(out)) {
  console.log(`\n${group}  total  raw ${kb(total.raw)} KB  gzip ${kb(total.gzip)} KB  brotli ${kb(total.brotli)} KB`);
  const top = Object.entries(files).sort((a, b) => b[1].raw - a[1].raw).slice(0, 8);
  for (const [name, f] of top) console.log(`  ${name.padEnd(34)} raw ${kb(f.raw)}  gzip ${kb(f.gzip)}  brotli ${kb(f.brotli)}`);
}
