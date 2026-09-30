import * as React from 'react';
import { Link } from 'react-router';
import { Bench, Code, PageHeader, Rules, Section, SourceTabs, type Rule } from './doc';

/* ─────────────────────────────────────────────────────────
 * BLOCK PAGE · the shape every block page shares
 *
 *   head        title and one plain line
 *   preview     the live block with sample data, full width
 *   use         when to use it, when not (and what to use instead)
 *   install     copy the file into your project, import it, render it
 *   built from  the MetalUI parts it composes, each a link
 *   behaviour   keyboard, accessibility, motion, responsive: what a builder must keep
 *   tune        the block's DialKit panel
 *   source      the block's own file
 * A block is a working screen made of components, not a component: it is copied, not imported.
 * ───────────────────────────────────────────────────────── */

export interface BlockPageProps {
  title: string;
  lede: React.ReactNode;
  preview: { lede: string; caption?: string; node: React.ReactNode };
  use: Rule[];
  avoid: Rule[];
  /** Where the file goes in your project, and the smallest render. */
  install: { file: string; usage: string };
  builtFrom: { label: string; to: string }[];
  behaviour: { title: string; rules: Rule[] }[];
  tune?: { lede: string; node: React.ReactNode };
  source: string;
}

export function BlockPage({ title, lede, preview, use, avoid, install, builtFrom, behaviour, tune, source }: BlockPageProps) {
  return (
    <>
      <PageHeader title={title} lede={lede} tags={[{ label: 'Block', led: 'blue' }, { label: 'React', led: 'green' }, { label: 'SwiftUI not yet', led: 'off' }]} />
      <Section title="Preview" lede={preview.lede}>
        <Bench caption={preview.caption} className="wide">{preview.node}</Bench>
      </Section>
      <Section id="when" title="When to use it">
        <Rules rules={use} />
      </Section>
      <Section id="when-not" title="When not to">
        <Rules rules={avoid} />
      </Section>
      <Section id="install" title="Install" lede={`A block is copied, not imported: put the file at ${install.file} in your project, with @unlocalhosted/metalui installed.`}>
        <Code code={install.usage} label="example.tsx" lang="tsx" />
      </Section>
      <Section id="built-from" title="Built from" lede="The MetalUI parts it composes. Change one and the block follows.">
        <ul className="m-0 flex list-none flex-wrap gap-8 p-0">
          {builtFrom.map((b) => (
            <li key={b.to + b.label}>
              <Link to={b.to} className="inline-flex h-28 items-center rounded-pill px-12 type-ui text-ink no-underline recipe-button hover:text-ink focus-visible:focus-ring">{b.label}</Link>
            </li>
          ))}
        </ul>
      </Section>
      {behaviour.map((b) => (
        <Section key={b.title} id={b.title.toLowerCase().replace(/\W+/g, '-')} title={b.title}>
          <Rules rules={b.rules} />
        </Section>
      ))}
      {tune && (
        <Section id="tune" title="Tune it" lede={tune.lede}>
          {tune.node}
        </Section>
      )}
      <Section title="Source">
        <SourceTabs tabs={[{ id: 'react', label: 'React', code: source }]} />
      </Section>
    </>
  );
}
