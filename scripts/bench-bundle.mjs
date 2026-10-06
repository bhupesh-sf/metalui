// Bytes shipped, per file: raw, gzip, brotli. Deterministic, no browser.
// Reads the built package and docs site (run `npm run build` first); writes bench/results/bundle.json.
import { readdirSync, readFileSync, statSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { gzipSync, brotliCompressSync, constants } from 'node:zlib';
import { join, relative, extname } from 'node:path';
import { build } from 'esbuild';
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

// Tree-shaking: what a consumer pays for `import { X } from '@unlocalhosted/metalui'` (minified, react external).
const entry = root('packages/metalui/dist/index.js');
const exportBlock = readFileSync(entry, 'utf8').match(/\nexport \{([\s\S]*?)\};?\s*$/);
const names = exportBlock[1].split(',').map((s) => s.trim().split(/\s+as\s+/).pop()).filter(Boolean);
const perExport = {};
for (const name of names) {
  const r = await build({
    stdin: { contents: `export { ${name} } from ${JSON.stringify(entry)};`, resolveDir: root(), loader: 'js' },
    bundle: true, minify: true, format: 'esm', write: false, treeShaking: true, logLevel: 'silent',
    external: ['react', 'react-dom', 'react/jsx-runtime', 'react-dom/*'], loader: { '.css': 'empty' },
  });
  const buf = Buffer.from(r.outputFiles[0].contents);
  perExport[name] = { raw: buf.length, gzip: gzipSync(buf, { level: 9 }).length };
}
out.exports = perExport;

mkdirSync(root('bench/results'), { recursive: true });
writeFileSync(root('bench/results/bundle.json'), JSON.stringify(out, null, 2) + '\n');

const kb = (n) => (n / 1024).toFixed(1).padStart(8);
for (const [group, { total, files }] of Object.entries(out).filter(([g]) => g in TARGETS)) {
  console.log(`\n${group}  total  raw ${kb(total.raw)} KB  gzip ${kb(total.gzip)} KB  brotli ${kb(total.brotli)} KB`);
  const top = Object.entries(files).sort((a, b) => b[1].raw - a[1].raw).slice(0, 8);
  for (const [name, f] of top) console.log(`  ${name.padEnd(34)} raw ${kb(f.raw)}  gzip ${kb(f.gzip)}  brotli ${kb(f.brotli)}`);
}

const heavy = Object.entries(perExport).sort((a, b) => b[1].gzip - a[1].gzip);
console.log(`\nper-export (gzip, ${names.length} exports) heaviest:`);
for (const [n, f] of heavy.slice(0, 10)) console.log(`  ${n.padEnd(30)} raw ${kb(f.raw)}  gzip ${kb(f.gzip)}`);
for (const n of ['Button', 'Switch', 'Tooltip']) if (perExport[n]) console.log(`  ${n.padEnd(30)} raw ${kb(perExport[n].raw)}  gzip ${kb(perExport[n].gzip)}`);

// --gate: a consumer that imports one small component must ship one small component. Ceilings are gzip KB,
// set just above today's cost; lower them as the shared graph shrinks.
if (process.argv.includes('--gate')) {
  // 2026-10-06: every component is its own module in dist (tsup.config.ts), so an import no longer carries the
  // module-level work of every other component (was Button 10.0, Led 6.0, Switch 11.9, Well 5.8, Surface 5.7,
  // Table 93.5, Combobox 81.9, QuickEdit 32.0, ToolStrip 71.3, Card 55.0, Link 43.7). Each ceiling sits just above its cost.
  // Thread 14.3 (ScrollArea and Button come with it), Message 3.2.
  // Combobox 80 → 81: its chosen row draws the Checkbox's tick with the shared pen (icons/pen.tsx) instead of the check glyph.
  // Reasoning 13.2 (Collapsible 12.2 comes with it), ToolCall 15.2 (Collapsible, Properties, Spinner), Confirmation 19.2 (Alert and Button).
  // Thread 14.3 (ScrollArea and Button come with it), Message 3.2. Markdown 16.4 (CodeBlock comes with it); PromptInput
  // 56.2 and MessageActions 43.5, most of it Tooltip (34.3, Base UI's positioning), shared with every tooltip in an app.
  // Thread 14.3 (ScrollArea and Button come with it), Message 3.2. MarkScrub 8.4 (no popover: the host owns the
  // long jump's), MarkPick 92.7 (Combobox's weight).
  // Plan 10.1 (Progress and Spinner), Citation 46.9 (PreviewCard 33.4 and Link 37.9 share Base UI's floating parts; Collapsible).
  // Table 91.1 → 94.8: hierarchy rows (Tree's guides and disclosure, the Spinner's ring for a level that loads),
  // the virtual window and infinite scroll. The window is a few dozen lines, smaller than any virtualiser.
  // Slider 18.2 (16.8 before range, vertical, detents and the bubble: the detent haptic and the direction context).
  // BranchPicker 38.1, most of it Tooltip (34.3); ConversationList 85.1 (Menu, Popover and QuickEdit come with it).
  // Table 94.8 → 95.0: the grid hooks and the columns' order. DataGrid 135.7 is Table with its editors (Select 47.7 and
  // NumberField 27.1, mostly Base UI's, shared with every select and number field in an app) and Sortable for the columns.
  // DateSelector 62.7 (Popover, Dialog and Switcher's Base UI parts, both presentations in one import; the calendar is 8.7);
  // matchesDate 1.3 (the calendar's date arithmetic only).
  // Gantt 5.3 (its own pointer drag, Calendar's date helpers; no Table, no Sortable).
  const CEILING = { Button: 6, Switch: 7, Led: 1, Well: 1, Surface: 1, Table: 96, Combobox: 81, QuickEdit: 28, ToolStrip: 68, Card: 50, Link: 39, Filters: 102, Thread: 15, Message: 4, Reasoning: 14, ToolCall: 16, Confirmation: 20, Markdown: 17, PromptInput: 57, MessageActions: 44, MarkScrub: 9, MarkPick: 95, Plan: 11, Citation: 49, Slider: 19, BranchPicker: 39, ConversationList: 86, DataGrid: 137, DateSelector: 64, matchesDate: 2, Gantt: 6 };
  const over = Object.entries(CEILING).filter(([n, kb]) => !perExport[n] || perExport[n].gzip / 1024 > kb);
  if (over.length) {
    console.error(`\nbench-bundle gate: ${over.map(([n, kb]) => `${n} ${perExport[n] ? (perExport[n].gzip / 1024).toFixed(1) : 'missing'} KB gzip > ${kb}`).join(', ')}`);
    process.exit(1);
  }
  console.log('\nbench-bundle gate: single-component imports within budget');
}
