'use client';

import * as React from 'react';
import { useReducedMotion } from '../../motion/reduced';
import { CodeBlock, splitFences } from '../code-block/code-block';

/* ─────────────────────────────────────────────────────────
 * MARKDOWN, an answer's text, set as it arrives
 *
 *   blocks    paragraphs in the content type; # and ## in the display role, ### and #### in the
 *             subheading role (h2–h5, under the page's own title); bullets and numbers (nested by
 *             indent) with ink3 markers; a quote on a 2 rail; a rule; GFM tables with a hairline
 *             under the head, aligned columns, scrolling sideways when wide
 *   inline    bold, italic, struck, inline code (the code block's type on its ghost tint), links
 *             (http, https, mailto and relative only; anything else is text)
 *   fences    every fence is a CodeBlock (framed, its language as the label); one still open is
 *             streaming (its rows land, its own caret)
 *   pace      `pace` words a second: what has arrived is revealed a word at a time, catching up;
 *             nothing runs once it has caught up; when streaming ends, everything shows
 *   caret     while streaming, a green pill after the last word (not inside an open fence)
 *   unclosed  while streaming, a half-arrived **, * or ` in the last block is closed for the render
 * Reduce Motion: a phrase (10 words) at a time, no caret.
 * Safety: the source is never set as HTML; what isn't understood is shown as text.
 * Semantics: aria-busy while streaming; the writing state is the host's (Message's status word).
 * ───────────────────────────────────────────────────────── */

export interface MarkdownProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  /** The Markdown that has arrived so far. */
  children: string;
  /** More is still arriving: a caret after the last word, an open fence streams, half marks close. */
  streaming?: boolean;
  /** Words a second to reveal what has arrived (smooths bursts). Omit to show it as it comes. */
  pace?: number;
}

const PHRASE = 10; // words a step under Reduce Motion

const ROOT = 'mu-markdown grid min-w-0 gap-markdown-gap type-content text-ink break-words';
const H: Record<1 | 2 | 3 | 4, string> = {
  1:'m-0 mt-markdown-heading-gap type-display text-ink first:mt-0',
  2: 'm-0 mt-markdown-heading-gap type-display text-ink first:mt-0',
  3: 'm-0 mt-markdown-heading-gap type-doc-subheading text-ink first:mt-0',
  4: 'm-0 mt-markdown-heading-gap type-doc-subheading text-ink2 first:mt-0',
};
const P = 'm-0';
const LIST = 'm-0 grid gap-markdown-list-gap ps-markdown-list-indent marker:text-ink3';
const NESTED = 'grid gap-markdown-list-gap mt-markdown-list-gap';
const QUOTE = 'm-0 grid gap-markdown-gap ps-markdown-quote-pad text-ink2 markdown-quote';
const RULE = 'h-rule-thickness w-full border-0 m-0 recipe-rule';
const TABLE_WRAP = 'mu-markdown-table min-w-0 max-w-full overflow-x-auto';
const TABLE = 'border-collapse type-body text-ink tabular-nums';
const TH = 'normal-case px-markdown-table-pad-x py-markdown-table-pad-y border-b border-rule type-ui text-ink2 first:ps-0';
const TD = 'px-markdown-table-pad-x py-markdown-table-pad-y first:ps-0';
const CODE = 'px-markdown-code-pad-x rounded-markdown-code-radius bg-code-block-ghost-tint type-code-block-code';
const LINK = 'text-ink underline decoration-ink3 underline-offset-2 hover:decoration-ink outline-none focus-visible:focus-ring rounded-markdown-code-radius';
const CARET = 'mu-markdown-caret inline-block w-markdown-caret-width h-markdown-caret-height ms-markdown-caret-gap translate-y-markdown-caret-drop rounded-pill bg-green-deep reduced-motion:hidden';

// ── Blocks ──

type Align = 'left' | 'center' | 'right' | undefined;
type Item = { text: string; blocks: Block[] };
type Block =
  | { kind: 'heading'; level: 1 | 2 | 3 | 4; text: string }
  | { kind: 'p'; text: string }
  | { kind: 'list'; ordered: boolean; start: number; items: Item[] }
  | { kind: 'quote'; blocks: Block[] }
  | { kind: 'table'; align: Align[]; head: string[]; rows: string[][] }
  | { kind: 'rule' }
  | { kind: 'code'; lang?: string; code: string; open: boolean };

const HEADING = /^ {0,3}(#{1,6})\s+(.*?)\s*#*\s*$/;
const RULE_LINE = /^ {0,3}([-*_])(?:\s*\1){2,}\s*$/;
const QUOTE_LINE = /^ {0,3}>\s?/;
const ITEM = /^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/;
const SEPARATOR = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;

const indentOf = (s: string) => s.match(/^\s*/)![0].replace(/\t/g, '    ').length;
const blank = (s: string) => s.trim() === '';
const cells = (row: string) => row.trim().replace(/^\|/, '').replace(/(?<!\\)\|$/, '').split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|'));
const isTable = (lines: string[], i: number) => lines[i].includes('|') && i + 1 < lines.length && SEPARATOR.test(lines[i + 1]) && lines[i + 1].includes('-');
const starts = (lines: string[], i: number) => HEADING.test(lines[i]) || RULE_LINE.test(lines[i]) || QUOTE_LINE.test(lines[i]) || ITEM.test(lines[i]) || isTable(lines, i);

/** Lines of Markdown (no fences) into blocks. */
function parseBlocks(lines: string[]): Block[] {
  const out: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (blank(line)) { i++; continue; }
    const h = HEADING.exec(line);
    if (h) { out.push({ kind: 'heading', level: Math.min(4, h[1].length) as 1 | 2 | 3 | 4, text: h[2] }); i++; continue; }
    if (RULE_LINE.test(line)) { out.push({ kind: 'rule' }); i++; continue; }
    if (QUOTE_LINE.test(line)) {
      const inner: string[] = [];
      while (i < lines.length && QUOTE_LINE.test(lines[i])) inner.push(lines[i++].replace(QUOTE_LINE, ''));
      out.push({ kind: 'quote', blocks: parseBlocks(inner) });
      continue;
    }
    if (isTable(lines, i)) {
      const head = cells(line);
      const align = cells(lines[i + 1]).map((c): Align => (c.startsWith(':') && c.endsWith(':') ? 'center' : c.endsWith(':') ? 'right' : c.startsWith(':') ? 'left' : undefined));
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && !blank(lines[i]) && lines[i].includes('|')) rows.push(cells(lines[i++]));
      out.push({ kind: 'table', align, head, rows });
      continue;
    }
    const m = ITEM.exec(line);
    if (m) { i = parseList(lines, i, out); continue; }
    const para: string[] = [line.trim()];
    i++;
    while (i < lines.length && !blank(lines[i]) && !starts(lines, i)) para.push(lines[i++].trim());
    out.push({ kind: 'p', text: para.join('\n') });
  }
  return out;
}

/** One list from line i: its items, each with its own nested lines parsed as blocks. Returns the next line. */
function parseList(lines: string[], i: number, out: Block[]): number {
  const first = ITEM.exec(lines[i])!;
  const base = indentOf(first[1]);
  const ordered = /\d/.test(first[2]);
  const items: { text: string; sub: string[] }[] = [];
  while (i < lines.length) {
    const line = lines[i];
    const m = ITEM.exec(line);
    if (m && indentOf(m[1]) <= base + 1) {
      if (/\d/.test(m[2]) !== ordered) break;
      items.push({ text: m[3], sub: [] });
      i++;
      continue;
    }
    const item = items[items.length - 1];
    if (blank(line)) {
      const next = lines[i + 1];
      if (next !== undefined && (indentOf(next) > base || (ITEM.test(next) && indentOf(ITEM.exec(next)![1]) <= base + 1))) { item.sub.push(''); i++; continue; }
      break;
    }
    if (indentOf(line) > base) { item.sub.push(line.slice(Math.min(indentOf(line), base + 2))); i++; continue; }
    if (item.sub.length === 0 && !starts(lines, i)) { item.text += `\n${line.trim()}`; i++; continue; }
    break;
  }
  out.push({ kind: 'list', ordered, start: ordered ? parseInt(first[2], 10) : 1, items: items.map((it) => ({ text: it.text, blocks: parseBlocks(it.sub) })) });
  return i;
}

/** Markdown into blocks, fences included (a fence not closed yet is open). */
function parse(markdown: string): Block[] {
  return splitFences(markdown).flatMap((part): Block[] => (part.kind === 'code' ? [{ kind: 'code', lang: part.lang, code: part.code, open: part.open }] : parseBlocks(part.text.split('\n'))));
}

/** While streaming: a half-arrived `, ** or * at the end is closed, so it reads marked at once instead of as stars. */
function closeMarks(text: string) {
  let t = text;
  if ((t.match(/`/g)?.length ?? 0) % 2) return `${t}\``;
  const plain = t.replace(/`[^`]*`/g, '').replace(/^\s*[-*+]\s/gm, '');
  if ((plain.match(/\*\*/g)?.length ?? 0) % 2) t += '**';
  if ((plain.replace(/\*\*/g, '').match(/\*/g)?.length ?? 0) % 2) t += '*';
  return t;
}

// ── Inline ──

const INLINE = /(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)|\*\*(?=\S)([\s\S]*?\S)\*\*|__(?=\S)([\s\S]*?\S)__|~~(?=\S)([\s\S]*?\S)~~|\*(?=[^\s*])([\s\S]*?[^\s*])\*|(?<![\w])_(?=[^\s_])([\s\S]*?[^\s_])_(?![\w])|\[([^\]]+)\]\(\s*([^)\s]+)(?:\s+"[^"]*")?\s*\)|(\n)/g;
const SAFE = /^(https?:|mailto:|\/|#|\.{0,2}\/)/i;

function inline(text: string, key = 'i'): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let last = 0;
  let n = 0;
  for (const m of text.matchAll(INLINE)) {
    if (m.index! > last) out.push(text.slice(last, m.index));
    const k = `${key}.${n++}`;
    if (m[2] !== undefined) out.push(<code key={k} className={CODE}>{m[2].replace(/^ (.*) $/, '$1')}</code>);
    else if (m[3] !== undefined || m[4] !== undefined) out.push(<strong key={k} className="font-semibold">{inline(m[3] ?? m[4], k)}</strong>);
    else if (m[5] !== undefined) out.push(<s key={k}>{inline(m[5], k)}</s>);
    else if (m[6] !== undefined || m[7] !== undefined) out.push(<em key={k}>{inline(m[6] ?? m[7], k)}</em>);
    else if (m[8] !== undefined) out.push(SAFE.test(m[9]) ? <a key={k} className={LINK} href={m[9]} {...(/^https?:/i.test(m[9]) ? { target: '_blank', rel: 'noreferrer' } : null)}>{inline(m[8], k)}</a> : m[0]);
    else out.push(' ');
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

// ── Render ──

/** Blocks as elements; the caret goes at the end of the last one. */
function render(blocks: Block[], caret: React.ReactNode, streaming: boolean, key = 'b'): React.ReactNode[] {
  return blocks.map((b, i) => {
    const k = `${key}.${i}`;
    const end = i === blocks.length - 1 ? caret : null;
    switch (b.kind) {
      case 'heading': return React.createElement(`h${b.level + 1}`, { key: k, className: H[b.level] }, inline(b.text, k), end);
      case 'p': return <p key={k} className={P}>{inline(b.text, k)}{end}</p>;
      case 'rule': return <hr key={k} className={RULE} />;
      case 'quote': return <blockquote key={k} className={QUOTE}>{render(b.blocks, end, streaming, k)}</blockquote>;
      case 'code': return <CodeBlock key={k} code={b.code} lang={b.lang} streaming={streaming && b.open} />;
      case 'list': {
        const Tag = b.ordered ? 'ol' : 'ul';
        return (
          <Tag key={k} className={`${LIST} ${b.ordered ? 'list-decimal' : 'list-disc'}`} start={b.ordered && b.start !== 1 ? b.start : undefined}>
            {b.items.map((it, j) => {
              const lastItem = j === b.items.length - 1;
              const kk = `${k}.${j}`;
              return (
                <li key={kk}>
                  {inline(it.text, kk)}{lastItem && !it.blocks.length ? end : null}
                  {it.blocks.length > 0 && <div className={NESTED}>{render(it.blocks, lastItem ? end : null, streaming, kk)}</div>}
                </li>
              );
            })}
          </Tag>
        );
      }
      case 'table': return (
        <div key={k} className={TABLE_WRAP}>
          <table className={TABLE}>
            <thead><tr>{b.head.map((c, j) => <th key={j} className={TH} style={{ textAlign: b.align[j] ?? 'left' }}>{inline(c, `${k}.h${j}`)}</th>)}</tr></thead>
            <tbody>
              {b.rows.map((row, r) => (
                <tr key={r}>{b.head.map((_, j) => <td key={j} className={TD} style={{ textAlign: b.align[j] ?? 'left' }}>{inline(row[j] ?? '', `${k}.${r}.${j}`)}{r === b.rows.length - 1 && j === b.head.length - 1 ? end : null}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
  });
}

// ── Pace ──

/** The end of the word after `at` (words are runs of non-space and the space after them). */
function wordsAfter(text: string, at: number, count: number) {
  const re = /\S+\s*/y;
  re.lastIndex = at;
  let end = at;
  for (let i = 0; i < count; i++) {
    const m = re.exec(text);
    if (!m) return text.length;
    end = re.lastIndex;
  }
  return end;
}

/** How much of `text` to show: all of it, or, with a pace while streaming, a word at a time until caught up. */
function usePaced(text: string, pace: number | undefined, streaming: boolean, reduced: boolean, root: React.RefObject<HTMLElement | null>) {
  const paced = !!pace && streaming;
  const [shown, setShown] = React.useState(text.length);
  const end = paced ? Math.min(shown, text.length) : text.length;
  React.useEffect(() => {
    if (!paced || end >= text.length) return; // caught up: nothing runs
    const every = reduced
      ? parseFloat(getComputedStyle(root.current ?? document.documentElement).getPropertyValue('--mu-r-markdown-stream-phrase-every')) || 450
      : 1000 / pace!;
    const t = window.setTimeout(() => setShown(wordsAfter(text, end, reduced ? PHRASE : 1)), every);
    return () => window.clearTimeout(t);
  }, [paced, end, text, pace, reduced, root]);
  // A stream paces from what was there when it started; when it ends, everything that arrived shows (`end`).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => setShown(text.length), [paced]);
  return text.slice(0, end);
}

/** An answer's text: Markdown set as it arrives, with a caret while it writes and fences in code blocks. */
export function Markdown({ children, streaming = false, pace, className, ...props }: MarkdownProps) {
  const root = React.useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion(root);
  const shown = usePaced(children, pace, streaming, reduced, root);
  const blocks = React.useMemo(() => {
    const all = parse(shown);
    const last = all[all.length - 1];
    if (!streaming || !last || last.kind === 'code') return all;
    // Close half-arrived marks in the last text block only.
    if (last.kind === 'p' || last.kind === 'heading') return [...all.slice(0, -1), { ...last, text: closeMarks(last.text) }];
    return all;
  }, [shown, streaming]);
  const tail = blocks[blocks.length - 1];
  const caret = streaming && !reduced && tail?.kind !== 'code' && !(tail?.kind === 'rule') ? <span aria-hidden data-caret className={CARET} /> : null;
  return (
    <div ref={root} className={className ? `${ROOT} ${className}` : ROOT} aria-busy={streaming || undefined} data-streaming={streaming ? '' : undefined} {...props}>
      {render(blocks, caret, streaming)}
      {blocks.length === 0 && caret && <p className={P}>{caret}</p>}
    </div>
  );
}
