#!/usr/bin/env node
// dist/styles.css without cascade layers, as dist/styles.unlayered.css.
// The compiled stylesheet wraps its rules in `@layer theme, base, components, utilities`, which keeps MetalUI
// below any unlayered CSS in the host. Tailwind v3's PostCSS plugin, which a Tailwind v3 app runs over every
// imported stylesheet, rejects an `@layer` it has no `@tailwind` directive for, so that app cannot import it.
// The unlayered file has the same rules in the same order (theme, base, components, utilities) with the
// wrappers removed; it competes by selector and source order like any other stylesheet.
import { readFileSync, writeFileSync } from 'node:fs';
import postcss from 'postcss';
import { root } from './lib/emit.mjs';

const from = root('packages/metalui/dist/styles.css');
const to = root('packages/metalui/dist/styles.unlayered.css');
const tree = postcss.parse(readFileSync(from, 'utf8'));
let layers = 0;
tree.walkAtRules('layer', (rule) => { layers++; if (rule.nodes) rule.replaceWith(rule.nodes); else rule.remove(); });
const out = tree.toString();
if (/@layer\b/.test(out)) throw new Error('styles.unlayered.css still contains @layer');
writeFileSync(to, out);
console.log(`styles.unlayered.css: ${layers} layer rule(s) unwrapped, ${Math.round(out.length / 1024)} kB`);
