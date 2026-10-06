'use client';

import * as React from 'react';
import { Collapsible } from '../collapsible/collapsible';
import { Link } from '../link/link';
import { PreviewCard } from '../preview-card/preview-card';

/* ─────────────────────────────────────────────────────────
 * CITATION, where an answer's words came from
 *
 *   mark      in the text, the source's number on the link cue's host pill (mark-url), meta type,
 *             tabular: a link to the source, named by its number and title (the provenance
 *             tooltip's idea: a cue says where it came from)
 *   preview   a steady hover or focus opens the preview card on it: the title, a line, the host
 *   sources   Citation.Sources, under the answer: one collapsible row ("4 sources"), folded by
 *             default; open, each source on a line with its number, its title as a quiet external
 *             Link and its host in ink3. The numbers are the marks' numbers
 * Reduce Motion: the preview card's and the fold's own (they crossfade).
 * Slots: Citation.Root, Citation.Sources.
 * ───────────────────────────────────────────────────────── */

export interface CitationSource {
  /** Where it lives. */
  href: string;
  title: string;
  /** A line about it, on the preview card. */
  description?: string;
  /** Shown small: "w3.org". Default: the href's host. */
  host?: string;
  /** An image of it, on the preview card. */
  image?: string;
}

export interface CitationRootProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'children'> {
  /** The source's number: the same in the text and in the list under the answer. */
  n: number;
  source: CitationSource;
}

export interface CitationSourcesProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children' | 'onChange'> {
  /** In the order of their numbers: the first is 1. */
  sources: CitationSource[];
  /** The row's words (default "4 sources"). */
  label?: string;
  open?: boolean;
  /** Open at first (default: folded). */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const MARK = 'mu-citation mark-url type-meta tabular-nums justify-center min-w-citation-mark-min-width px-citation-mark-pad-x';
const LIST = 'mu-citation-list m-0 grid list-none gap-citation-list-gap p-0 py-citation-list-pad-y';
const ITEM = 'flex min-w-0 items-baseline gap-citation-list-number-gap type-ui';
const NUMBER = 'mark-url type-meta tabular-nums justify-center flex-none min-w-citation-mark-min-width px-citation-mark-pad-x text-ink2';
const HOST = 'flex-none type-meta text-ink3';

function hostOf(source: CitationSource) {
  if (source.host) return source.host;
  try {
    return new URL(source.href).hostname.replace(/^www\./, '');
  } catch {
    return undefined;
  }
}

/** A numbered mark in the text: a link to the source that previews it on a steady hover. */
function Root({ n, source, className, ...props }: CitationRootProps) {
  const host = hostOf(source);
  return (
    <PreviewCard preview={{ title: source.title, description: source.description, host, image: source.image }}>
      <a
        href={source.href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Source ${n}: ${source.title}`}
        className={className ? `${MARK} ${className}` : MARK}
        {...props}
      >
        {n}
      </a>
    </PreviewCard>
  );
}

/** The sources under an answer, folded under one row: "4 sources". */
function Sources({ sources, label, open, defaultOpen = false, onOpenChange, className, ...props }: CitationSourcesProps) {
  const words = label ?? `${sources.length} ${sources.length === 1 ? 'source' : 'sources'}`;
  return (
    <Collapsible.Root open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange} className={className ? `mu-citation-sources ${className}` : 'mu-citation-sources'} {...props}>
      <Collapsible.Trigger>{words}</Collapsible.Trigger>
      <Collapsible.Panel>
        <ol className={LIST} aria-label="Sources">
          {sources.map((s, i) => (
            <li key={s.href + i} className={ITEM}>
              <span aria-hidden className={NUMBER}>{i + 1}</span>
              <Link href={s.href} external kind="quiet" className="min-w-0 truncate">{s.title}</Link>
              {hostOf(s) && <span className={HOST}>{hostOf(s)}</span>}
            </li>
          ))}
        </ol>
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}

export const Citation = Object.assign(Root, { Root, Sources });
export type CitationProps = CitationRootProps;
