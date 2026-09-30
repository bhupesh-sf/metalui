import * as React from 'react';
import { Link } from 'react-router';
import { Led } from '@unlocalhosted/metalui';
import { PARTS, partLabel } from '../app/parts';
import { NAV } from '../app/nav';
import { PageHeader, Rules, Section } from '../ui/doc';
import backlog from '../../../../docs/BACKLOG.md?raw';

/* ─────────────────────────────────────────────────────────
 * WORK IN PROGRESS · what is unfinished, read from the sources, never filed by hand
 *
 *   swift     parts whose meta.json says swift.status "wip" (a placeholder on the system's views)
 *   blocks    every block (React only for now)
 *   reworks   each backlog topic (docs/BACKLOG.md "## " headings) with its open items counted
 * ───────────────────────────────────────────────────────── */

/** The backlog's topics with how many items are still open under each. */
function topics() {
  const out: { title: string; open: number; done: number }[] = [];
  for (const line of backlog.split('\n')) {
    if (line.startsWith('## ')) out.push({ title: line.slice(3).replace(/:.*$/, '').trim(), open: 0, done: 0 });
    else if (out.length && /^\s*- \[ \]/.test(line)) out[out.length - 1].open++;
    else if (out.length && /^\s*- \[x\]/i.test(line)) out[out.length - 1].done++;
  }
  return out.filter((t) => t.open > 0);
}

const pill = 'inline-flex h-28 items-center rounded-pill px-12 type-ui text-ink no-underline recipe-button hover:text-ink focus-visible:focus-ring';

export default function WipPage() {
  const swift = PARTS.filter((m) => m.swift?.status === 'wip' && m.page).sort((a, b) => partLabel(a).localeCompare(partLabel(b)));
  const blocks = NAV.find((g) => g.label === 'Blocks')?.items ?? [];
  const open = topics();
  const openCount = open.reduce((n, t) => n + t.open, 0);
  return (
    <>
      <PageHeader
        title="Work in progress"
        lede="MetalUI is 0.0 alpha. This page lists what is unfinished, read straight from the components and the backlog, so it is always current."
        tags={[{ label: `${swift.length} SwiftUI placeholders`, led: 'amber' }, { label: `${openCount} open items`, led: 'amber' }]}
      />
      <Section id="swiftui" title="SwiftUI not yet" lede="These have a React component and a SwiftUI placeholder built on the system's own views, with the same API shape. Web is the reference until each one is ported.">
        <ul className="m-0 flex list-none flex-wrap gap-8 p-0">
          {swift.map((m) => <li key={m.name}><Link to={m.page!} className={pill}>{partLabel(m)}</Link></li>)}
        </ul>
      </Section>
      <Section id="blocks" title="Blocks" lede="Blocks are React only for now; they are copied into a project, and each lists the library gaps it worked around.">
        <ul className="m-0 flex list-none flex-wrap gap-8 p-0">
          {blocks.map((b) => <li key={b.to}><Link to={b.to} className={pill}>{b.label}</Link></li>)}
        </ul>
      </Section>
      <Section id="reworks" title="Being reworked" lede="Open items from the backlog, by topic. Each is a change that is planned, not yet made.">
        <ul className="m-0 grid max-w-measure list-none gap-0 p-0">
          {open.map((t) => (
            <li key={t.title} className="flex items-center justify-between gap-12 border-t border-rule py-10 first:border-t-0">
              <span className="flex min-w-0 items-center gap-8 type-ui text-ink">
                <Led kind="waiting" size="small" />
                <span className="truncate">{t.title}</span>
              </span>
              <span className="flex-none type-meta tabular-nums text-ink3">{t.open} open{t.done ? ` · ${t.done} done` : ''}</span>
            </li>
          ))}
        </ul>
      </Section>
      <Section id="meaning" title="What this means for you">
        <Rules
          rules={[
            { id: 'W1', title: 'APIs can change in a 0.x release', body: 'While the package is 0.x, a minor version may change behaviour; every such change is listed under Changed in the changelog.', origin: 'Semantic Versioning' },
            { id: 'W2', title: 'Copy blocks, pin the package', body: 'Blocks are yours once copied; pin @unlocalhosted/metalui to an exact version so a look you rely on doesn\'t move under you.', origin: 'Ours' },
            { id: 'W3', title: 'Tell us what breaks', body: 'Open an issue on GitHub (vijayksingh/metalui) with the page and what you expected.', origin: 'Ours' },
          ]}
        />
      </Section>
    </>
  );
}
