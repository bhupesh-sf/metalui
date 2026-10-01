#!/usr/bin/env node
// Prints one version's section of packages/metalui/CHANGELOG.md (without its heading), for release notes.
// Usage: node scripts/changelog-section.mjs 0.3.2
import { readFileSync } from 'node:fs';
import { root } from './lib/emit.mjs';

const version = process.argv[2]?.replace(/^v/, '');
if (!version) { console.error('usage: changelog-section.mjs <version>'); process.exit(2); }
const lines = readFileSync(root('packages/metalui/CHANGELOG.md'), 'utf8').split('\n');
const start = lines.findIndex((l) => new RegExp(`^## ${version.replace(/\./g, '\\.')}(\\s|$)`).test(l));
if (start < 0) { console.error(`no section for ${version} in CHANGELOG.md`); process.exit(1); }
let end = lines.findIndex((l, i) => i > start && l.startsWith('## '));
if (end < 0) end = lines.length;
const body = lines.slice(start + 1, end).join('\n').trim();
if (!body) { console.error(`the ${version} section is empty`); process.exit(1); }
console.log(body);
