// A contact sheet of one gadget spec in several variants, for choosing a look by eye.
// Every variant is checked by the library's own validator and drawn by its own renderer, then the
// sheet is shot with a headless Chrome into out/<name>-sheet.png.
//
//   node scripts/gadget-sheet.mjs <spec.gadget.json> '<variant>' ['<variant>' ...]
//
// A variant is JSON merged over the spec, plus optional draw options under "_": state, value, host.
//   '{"station":80,"feel":{"v":0.6,"a":0.08,"w":0.6},"_":{"value":3.5}}'
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { homedir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { validateGadget, renderGadgetSvg } from '@unlocalhosted/metalui/gadgets';

const [file, ...variants] = process.argv.slice(2);
if (!file || !variants.length) {
  console.error("usage: node scripts/gadget-sheet.mjs <spec.gadget.json> '<variant json>' ...");
  process.exit(2);
}
const base = JSON.parse(readFileSync(file, 'utf8'));
const merge = (a, b) => (b && typeof b === 'object' && !Array.isArray(b) ? Object.fromEntries([...new Set([...Object.keys(a ?? {}), ...Object.keys(b)])].map((k) => [k, k in b ? merge(a?.[k], b[k]) : a[k]])) : b);

const cells = [];
let failed = 0;
for (const raw of variants) {
  const { _: draw = {}, ...over } = JSON.parse(raw);
  const spec = merge(base, over);
  const label = raw.length > 90 ? `${raw.slice(0, 87)}...` : raw;
  const v = validateGadget(spec);
  if (!v.ok) {
    failed++;
    console.error(`invalid: ${raw}\n${v.problems.map((p) => `  ${p.path}: ${p.message}${p.fix ? ` (${p.fix})` : ''}`).join('\n')}`);
    cells.push(`<figure><div class="bad">${v.problems.map((p) => p.message).join('<br>')}</div><figcaption>${label}</figcaption></figure>`);
    continue;
  }
  const svg = renderGadgetSvg(spec, { state: draw.state ?? 'filling', value: draw.value ?? 0, host: draw.host ?? 'graphite', size: 560, tier: 'full', id: `v${cells.length}` });
  cells.push(`<figure style="background:${(draw.host ?? 'graphite') === 'bone' ? '#F0EFEB' : '#1d1d1f'}">${svg}<figcaption>${label}</figcaption></figure>`);
}

const chrome = () => {
  const root = join(homedir(), '.cache/puppeteer/chrome-headless-shell');
  if (!existsSync(root)) return null;
  for (const v of readdirSync(root).sort().reverse()) {
    const dir = join(root, v);
    const sub = readdirSync(dir).find((d) => d.startsWith('chrome-headless-shell'));
    const bin = sub && join(dir, sub, 'chrome-headless-shell');
    if (bin && existsSync(bin)) return bin;
  }
  return null;
};

mkdirSync('out', { recursive: true });
const name = basename(file, '.gadget.json');
const html = `out/${name}-sheet.html`;
const cols = Math.min(2, cells.length);
const rows = Math.ceil(cells.length / cols);
writeFileSync(html, `<html><body style="margin:0;background:#111;display:grid;grid-template-columns:repeat(${cols},600px);font:15px ui-monospace,monospace;color:#bbb">
<style>figure{margin:0;width:600px;height:600px;position:relative;display:grid;place-items:center}figcaption{position:absolute;left:16px;right:16px;top:14px}.bad{color:#f77;padding:40px}</style>
${cells.join('\n')}</body></html>`);
const bin = chrome();
if (!bin) {
  console.log(`wrote ${html} (no headless Chrome found for a PNG; run a Remotion render once to fetch it)`);
} else {
  spawnSync(bin, ['--headless', '--disable-gpu', `--screenshot=${join(process.cwd(), `out/${name}-sheet.png`)}`, `--window-size=${cols * 600},${rows * 600}`, '--hide-scrollbars', `file://${join(process.cwd(), html)}`], { stdio: 'ignore' });
  console.log(`out/${name}-sheet.png: ${cells.length} variants${failed ? `, ${failed} invalid` : ''}`);
}
process.exit(failed ? 1 : 0);
