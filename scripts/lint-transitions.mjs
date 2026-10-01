// Only composited properties should animate: transform and opacity run on the compositor, everything else
// is main-thread work every frame. This reads the shipped stylesheets and flags a transition on
//   layout     width, height, top/left/right/bottom, margin, padding, grid-template-*, flex-basis, font-size
//   paint      box-shadow, background, filter, color, border
// Existing ones are listed in lint-transitions.allow.json by their declaration text; a new one fails.
// Fix one (a shadow on a ::before faded by opacity, a scale instead of a width) and --ratchet to drop it.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { root } from './lib/emit.mjs';

const LAYOUT = /^(width|height|min-width|min-height|max-width|max-height|top|left|right|bottom|inset|inset-[a-z-]+|margin[a-z-]*|padding[a-z-]*|grid-template[a-z-]*|flex-basis|flex|gap|font-size|line-height|letter-spacing)$/;
const PAINT = /^(box-shadow|background[a-z-]*|border[a-z-]*|filter|backdrop-filter|color|outline[a-z-]*)$/;
const FILES = ['packages/metalui/src/components/theme.css', 'packages/metalui/src/components/tokens.css'];
const allowPath = root('scripts/lint-transitions.allow.json');

const found = [];
for (const f of FILES) readFileSync(root(f), 'utf8').split('\n').forEach((line, i) => {
  for (const m of line.matchAll(/transition(?:-property)?\s*:\s*([^;}{]+)/g)) {
    const decl = m[0].trim();
    const props = m[1].trim().split(/,(?![^(]*\))/).map((p) => p.trim().split(/\s+/)[0]);
    const layout = props.filter((p) => LAYOUT.test(p)), paint = props.filter((p) => PAINT.test(p));
    if (layout.length || paint.length) found.push({ key: `${f.split('/').pop()}: ${decl}`, line: i + 1, layout, paint });
  }
});

const tally = (list) => list.reduce((m, k) => ((m[k] = (m[k] ?? 0) + 1), m), {});
if (process.argv.includes('--ratchet')) {
  writeFileSync(allowPath, JSON.stringify(tally(found.map((x) => x.key)), null, 2) + '\n');
  console.log(`lint-transitions: allowlist now ${found.length} declaration(s)`);
  process.exit(0);
}
const allow = existsSync(allowPath) ? JSON.parse(readFileSync(allowPath, 'utf8')) : {};
const seen = tally(found.map((x) => x.key));
const fresh = found.filter((x, i) => found.findIndex((y) => y.key === x.key) === i && (seen[x.key] > (allow[x.key] ?? 0)));
const nLayout = found.filter((x) => x.layout.length).length;
if (fresh.length) {
  console.error(`lint-transitions: ${fresh.length} new transition(s) on non-composited properties:`);
  for (const x of fresh) console.error(`  ${x.key.slice(0, 160)}  [${x.layout.length ? 'layout' : 'paint'}]`);
  console.error('Animate transform or opacity instead (docs/PERFORMANCE.md), or --ratchet once reviewed.');
  process.exit(1);
}
console.log(`lint-transitions: ${found.length} existing (${nLayout} layout, ${found.length - nLayout} paint-only), none new`);
