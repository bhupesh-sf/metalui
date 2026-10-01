#!/usr/bin/env node
// check:host-safe: importing MetalUI's theme into an app that is not MetalUI's docs must not change that
// app. The shadcn route compiles our classes in the host's own Tailwind, and theme.css lands in the
// host's CSS, so two things would reach the host's layout and fonts:
//   1. theme.css defines a theme variable the host (Tailwind's own default theme) already has, such as
//      --spacing (the scale behind p-4, gap-2, h-10), --font-sans or --font-mono; or a bare numeric key
//      (--spacing-4) that would take over a number the host uses.
//   2. a component writes a class that reads the base scale (gap-4, h-28, p-12 mean N x --spacing), which
//      only means what we meant while --spacing is 1px. Zero is fine: 0 x anything is 0.
// A component's sizes come from named tokens (gap-table-sort-gap), never from a number.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { root } from './lib/emit.mjs';

const errors = [];
const themePath = root('packages/metalui/src/components/theme.css');
const theme = readFileSync(themePath, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

// 1. variables the theme defines (inside @theme blocks) against Tailwind's own default theme.
const twTheme = root('node_modules/tailwindcss/theme.css');
const hostNames = new Set(existsSync(twTheme) ? [...readFileSync(twTheme, 'utf8').matchAll(/^\s+(--[a-z0-9-]+)\s*:/gm)].map((m) => m[1]) : []);
for (const extra of ['--spacing', '--font-sans', '--font-mono', '--font-serif']) hostNames.add(extra);
if (!hostNames.size) errors.push('tailwindcss/theme.css not found: run npm ci');
const defined = new Set();
for (const block of theme.matchAll(/@theme[^{]*\{([\s\S]*?)\n\}/g)) {
  for (const m of block[1].matchAll(/^\s+(--[a-z0-9-]+)\s*:/gm)) defined.add(m[1]);
}
for (const name of defined) {
  if (hostNames.has(name)) errors.push(`theme.css redefines ${name}, which a host app already has; use a name of our own`);
  if (/^--(spacing|radius|text|shadow|tracking|leading|blur|container|breakpoint)-\d/.test(name)) errors.push(`theme.css defines ${name}, a numeric key a host app uses; name it`);
}

// 2. numeric spacing classes in the package's React sources.
const PFX = '(?:p|px|py|pt|pr|pb|pl|ps|pe|m|mx|my|mt|mr|mb|ml|ms|me|gap|gap-x|gap-y|space-x|space-y|w|h|size|min-w|min-h|max-w|max-h|inset|inset-x|inset-y|top|right|bottom|left|start|end|translate-x|translate-y|basis|leading|indent|scroll-m[trblxyse]?|scroll-p[trblxyse]?|border-spacing)';
const token = new RegExp(`(?<=[\\s"'\`{(])((?:[^\\s"'\`]*:)?)(!?)(-?)(${PFX})-(\\d+(?:\\.\\d+)?)(?=[\\s"'\`}):]|$)`, 'g');
const walk = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? walk(p) : p.endsWith('.tsx') ? [p] : [];
});
for (const file of walk(root('packages/metalui/src'))) {
  const text = readFileSync(file, 'utf8');
  for (const m of text.matchAll(token)) {
    if (Number(m[5]) === 0) continue;
    errors.push(`${file.split('packages/metalui/')[1]}: ${m[0]} reads the host's spacing scale; use a named token from tokens.json`);
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  console.error(`Host-safe: ${errors.length} finding(s)`);
  process.exit(1);
}
console.log(`Host-safe: 0 finding(s); ${defined.size} theme names, none a host name`);
