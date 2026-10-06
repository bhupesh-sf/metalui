'use client';

import * as React from 'react';
import { AttachIcon } from '../../icons/components.generated';
import { MorphPair } from '../../icons/MorphIcon';
import { checkMorph, copyMorph } from '../../icons/morph.generated';
import { SwapText } from '../../motion/swap';
import { IconButton } from '../icon-button/icon-button';
import { Button } from '../button/button';
import { Led } from '../led/led';

/* ─────────────────────────────────────────────────────────
 * CODE BLOCK, code to read and copy in the flow (docs, a README, an AI reply)
 *
 *   framed     a stage plate: a 40 head (the label, or the host's node such as tabs) over a
 *              hairline, the copy key at its end; then the lines
 *   ghost      no plate, no head: the lines on a faint sunk tint; the keys float in the top corner,
 *              pinned over the scroll, shown while the pointer or focus is in the block
 *   lines      the code role on the colorway's syntax inks; numbers in syn-line from `start`; `wrap`
 *              continues a long line under its own start, otherwise the body scrolls sideways;
 *              `maxLines` stops the body and scrolls it inside itself
 *   highlight  a quiet band with a 2 rail in ink3
 *   focus      the other lines fall to the dim opacity until the pointer or focus enters (settle)
 *   pick       `selectable`: the numbers are one roving key (↑ ↓ Home End, Space or ↩ picks, ⇧
 *              extends, Esc clears; click, ⇧-click); picked lines take the select tint, the label
 *              turns on the drum to name them, copy copies only them, `onReference` adds a key
 *   diff       added: a green band and a green sign; removed: red; a patch with hunks has two gutters
 *   problems   `diagnostics`: a lamp in the gutter (red error, amber warning, none for a note) and a
 *              note row under the line: the word, the message, an optional action
 *   streaming  rows are appended (memoised, never re-tinted), each fades up a nest on settle; a caret
 *              blinks after the last character; the body follows the end unless scrolled up; copy waits
 *   copy       the copy glyph morphs to the check for copy.hold (strain 1.96), then back; "Copied" is said once
 * Reduce Motion: rows land at once, the caret holds, the drum snaps.
 * Highlighting is the host's: pass `html` (Shiki, twinkleplop); the built-in tint covers the rest.
 * ───────────────────────────────────────────────────────── */

// ── The tint: the code card's and the block's (one pass per line, so a token is tinted once) ──

const KEYWORDS = /\b(func|let|var|if|else|return|for|in|while|const|function|import|export|from|class|struct|enum|case|switch|guard|def|async|await|new|true|false|nil|null|self|this)\b/g;
const TOKEN = new RegExp(
  [
    '(&quot;.*?&quot;|&#39;.*?&#39;)', // 1 string
    '(\\/\\/.*$|#(?![\\d]).*$)', // 2 comment
    `${KEYWORDS.source}`, // 3 keyword
    '\\b([A-Z][A-Za-z0-9]+)\\b', // 4 type
    '(?<![\\w#&])(\\d+(?:\\.\\d+)?)\\b', // 5 number (not an entity's digits)
  ].join('|'),
  'g',
);
// The glyphs Copy morphs between, and only those (MorphPair ships just their parts).
const COPY = { copy: copyMorph, check: checkMorph };
const TINT = ['', 'mu-code-st', 'mu-code-cm', 'mu-code-kw', 'mu-code-ty', 'mu-code-nu'];

/** Escapes text for HTML. */
export const escapeCode = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** One line, escaped and tinted: strings, a trailing comment, keywords, types, numbers. */
export function tintLine(line: string) {
  return escapeCode(line).replace(TOKEN, (m, ...groups) => {
    const k = groups.slice(0, 5).findIndex((g) => g !== undefined) + 1;
    return k ? `<span class="${TINT[k]}">${m}</span>` : m;
  });
}

export type DiffClass = 'add' | 'remove' | 'context';

/** The core's diff classes, for a host without the core: + adds, - removes, +++ and --- are headers. */
export function diffClasses(code: string): DiffClass[] {
  return code.split('\n').map((l) => (l.startsWith('+') && !l.startsWith('+++') ? 'add' : l.startsWith('-') && !l.startsWith('---') ? 'remove' : 'context'));
}

/** Highlighted HTML split into one string per line: spans open at a newline close there and reopen on the next line. */
export function splitHtmlLines(html: string): string[] {
  const out: string[] = [];
  const open: string[] = [];
  let line = '';
  const close = () => open.map((t) => `</${/^<([\w-]+)/.exec(t)?.[1] ?? 'span'}>`).reverse().join('');
  for (const part of html.split(/(<[^>]*>|\n)/)) {
    if (!part) continue;
    if (part === '\n') {
      out.push(line + close());
      line = open.join('');
    } else {
      if (part.startsWith('</')) open.pop();
      else if (part.startsWith('<') && !part.endsWith('/>')) open.push(part);
      line += part;
    }
  }
  out.push(line + close());
  return out;
}

/** Drops a line's first character (a diff sign) from highlighted HTML, past any opening tags. */
const dropSign = (h: string) => h.replace(/^((?:<[^>]+>)*)(&[#\w]+;|[^<])/, '$1');

// ── Fences: a Markdown reply split into text and code, while it streams ──

export type CodeFencePart = { kind: 'text'; text: string } | { kind: 'code'; lang?: string; code: string; open: boolean };

/** Splits Markdown into text and fenced code (``` or ~~~, any length ≥ 3); a fence not closed yet is `open`. */
export function splitFences(markdown: string): CodeFencePart[] {
  const parts: CodeFencePart[] = [];
  let text: string[] = [];
  let fence: { mark: string; lang?: string; body: string[] } | null = null;
  for (const line of markdown.split('\n')) {
    if (fence) {
      const end = /^ {0,3}(`{3,}|~{3,})\s*$/.exec(line);
      if (end && end[1][0] === fence.mark[0] && end[1].length >= fence.mark.length) {
        parts.push({ kind: 'code', lang: fence.lang, code: fence.body.join('\n'), open: false });
        fence = null;
      } else fence.body.push(line);
      continue;
    }
    const start = /^ {0,3}(`{3,}|~{3,})\s*([^\s`]*)/.exec(line);
    if (start) {
      if (text.length) parts.push({ kind: 'text', text: text.join('\n') });
      text = [];
      fence = { mark: start[1], lang: start[2] || undefined, body: [] };
    } else text.push(line);
  }
  if (fence) {
    // A closing fence half arrived ("``") is not code yet.
    const tail = fence.body[fence.body.length - 1];
    if (tail !== undefined && /^ {0,3}([`~])\1*$/.test(tail) && tail.trim()[0] === fence.mark[0]) fence.body.pop();
    parts.push({ kind: 'code', lang: fence.lang, code: fence.body.join('\n'), open: true });
  }
  else if (text.length) parts.push({ kind: 'text', text: text.join('\n') });
  return parts;
}

// ── The block ──

/** Lines by their shown number: `[3, [5, 7]]` is line 3 and lines 5 to 7. */
export type CodeLines = ReadonlyArray<number | readonly [number, number]>;
export interface CodeRange {
  start: number;
  end: number;
}
export interface CodeDiagnostic {
  /** The shown line number. */
  line: number;
  severity: 'error' | 'warning' | 'note';
  message: React.ReactNode;
  /** One action for the problem: "Fix with AI". */
  action?: { label: string; onAction: () => void };
}

export interface CodeBlockProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children' | 'onSelect'> {
  code: string;
  /** "ts", "swift", "diff". A diff is classed per line; with hunks and numbers it shows two gutters. */
  lang?: string;
  /** framed: a plate with a head. ghost: no plate and no head; the keys float in the corner. */
  look?: 'framed' | 'ghost';
  /** The head's words: a file name. Default the language, or "Code". */
  label?: string;
  /** A node in the head instead of the label (tabs). The keys stay at its end. */
  head?: React.ReactNode;
  /** The host's highlighted HTML for the whole code, no <pre> (Shiki, twinkleplop). Trusted: it is set as HTML. */
  html?: string;
  numbers?: boolean;
  /** The first line's number. Default 1. */
  start?: number;
  wrap?: boolean;
  /** Stops the body at this many lines; it scrolls inside itself. */
  maxLines?: number;
  highlight?: CodeLines;
  focus?: CodeLines;
  /** The host's diff class per line (from the core). Default for lang "diff": classed here. */
  diff?: DiffClass[];
  diagnostics?: CodeDiagnostic[];
  /** Lines can be picked by their numbers (turns `numbers` on). */
  selectable?: boolean;
  selection?: CodeRange | null;
  defaultSelection?: CodeRange | null;
  onSelect?: (range: CodeRange | null) => void;
  /** With lines picked, a key that hands them to the host: "Reference lines 4–7". */
  onReference?: (range: CodeRange) => void;
  /** The code is still arriving: rows land, a caret blinks, the body follows the end, copy waits. */
  streaming?: boolean;
}

const ROOT = 'mu-code-block relative min-w-0 max-w-full text-syn-text [&_.mu-code-kw]:text-syn-keyword [&_.mu-code-ty]:text-syn-type [&_.mu-code-st]:text-syn-string [&_.mu-code-cm]:text-syn-comment [&_.mu-code-nu]:text-syn-number [&_[data-diff=add]>.mu-code-sign]:text-code-block-diff-add-ink [&_[data-diff=remove]>.mu-code-sign]:text-code-block-diff-remove-ink';
const LOOK = {
  framed: 'overflow-hidden rounded-plate material-stage',
  ghost: 'rounded-code-block-ghost-radius bg-code-block-ghost-tint',
};
const HEAD = 'mu-code-block-head flex min-h-code-block-head-height items-center justify-between gap-code-block-head-gap border-b border-rule pl-code-block-head-pad-left pr-code-block-head-pad-right';
const LABEL = 'mu-code-block-label block min-w-0 truncate type-readout text-ink3';
const KEYS = 'mu-code-block-keys flex flex-none items-center';
const FLOAT = 'mu-code-block-keys absolute z-1 top-code-block-ghost-key-inset right-code-block-ghost-key-inset flex items-center rounded-pill material-stage code-block-float reduced-motion:transition-none';
const BODY = 'mu-code-block-body overflow-auto py-code-block-body-pad-y type-code-block-code';
const PRE = 'code-block-pre';
const LINES = 'code-block-lines';
const ROW = 'mu-code-row flex px-code-block-body-pad-x code-block-dim code-block-arrive reduced-motion:transition-none data-[diff=add]:bg-code-block-diff-add-bg data-[diff=remove]:bg-code-block-diff-remove-bg data-mark:bg-code-block-mark-tint data-mark:code-block-mark data-picked:bg-code-block-pick-tint data-hunk:text-ink3';
const NUM = 'mu-code-num code-block-num';
const PICK = 'cursor-pointer outline-none hover:text-ink2 focus-visible:focus-ring data-picked:text-ink2';
const LAMP = 'mu-code-lamp code-block-lamp';
const SIGN = 'mu-code-sign flex-none w-code-block-sign-width select-none';
const TEXT = 'mu-code-text min-w-0 flex-1';
const NOTE_BODY = 'flex min-w-0 flex-1 flex-wrap items-center gap-code-block-note-gap py-code-block-note-pad-y whitespace-normal type-meta text-ink2';
const CARET = 'mu-code-caret code-block-caret';

const has = (lines: CodeLines | undefined, n: number) => !!lines?.some((s) => (typeof s === 'number' ? s === n : n >= s[0] && n <= s[1]));
const rangeText = (r: CodeRange) => (r.start === r.end ? `${r.start}` : `${r.start}–${r.end}`);
type Severity = CodeDiagnostic['severity'];
const WORD: Record<Severity, string> = { error: 'Error', warning: 'Warning', note: 'Note' };

interface Line {
  html: string;
  /** The shown number (start + index). */
  n: number;
  sign?: string;
  diff?: DiffClass;
  hunk?: boolean;
  /** A patch's old and new numbers; undefined where that side has no line. */
  old?: number;
  next?: number;
}

function linesOf(code: string, html: string | undefined, lang: string | undefined, diff: DiffClass[] | undefined, start: number): { lines: Line[]; patch: boolean } {
  const raw = code.split('\n');
  const shown = html != null ? splitHtmlLines(html) : null;
  const isDiff = lang === 'diff';
  const classes = diff ?? (isDiff ? diffClasses(code) : undefined);
  const patch = !!classes && raw.some((l) => l.startsWith('@@'));
  let old = 0;
  let next = 0;
  let inHunk = false;
  const lines = raw.map((l, i): Line => {
    const d = classes?.[i];
    const hunk = patch && l.startsWith('@@');
    // A diff's sign column: + and - on changed lines; a leading space on a diff fence's context lines.
    const signed = d === 'add' || d === 'remove' || (isDiff && d === 'context' && l.startsWith(' '));
    // A hunk header is engraved, not tinted.
    const text = shown?.[i] ?? (hunk ? escapeCode(l) : tintLine(l));
    const line: Line = { html: signed ? (shown ? dropSign(text) : tintLine(l.slice(1))) : text, n: start + i, diff: d, hunk };
    if (classes) line.sign = signed && l[0] !== ' ' ? (l[0] === '-' ? '−' : l[0]) : '';
    if (hunk) {
      const m = /^@@ -(\d+)(?:,\d+)? \+(\d+)/.exec(l);
      old = m ? +m[1] : 0;
      next = m ? +m[2] : 0;
      inHunk = !!m;
    } else if (patch && inHunk && !l.startsWith('\\')) {
      if (d !== 'add') line.old = old++;
      if (d !== 'remove') line.next = next++;
    }
    return line;
  });
  return { lines, patch };
}

interface RowProps {
  line: Line;
  index: number;
  numbers: boolean;
  patch: boolean;
  lamps: boolean;
  signs: boolean;
  mark: boolean;
  dim: boolean;
  picked: boolean;
  /** Selectable: this row's number is the roving key's stop. */
  stop?: boolean;
  selectable: boolean;
  diagnostic?: CodeDiagnostic;
  caret: boolean;
  pick: (index: number, extend: boolean) => void;
  keys: (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => void;
}

/** Props equal, and the line's fields equal (each render builds new line objects). */
function same(a: RowProps, b: RowProps) {
  for (const k of Object.keys(a) as (keyof RowProps)[]) if (k !== 'line' && a[k] !== b[k]) return false;
  const x = a.line;
  const y = b.line;
  return x.html === y.html && x.n === y.n && x.sign === y.sign && x.diff === y.diff && x.hunk === y.hunk && x.old === y.old && x.next === y.next;
}

/** One line (and its note). Memoised by content: an arriving line never re-renders the ones before it. */
const Row = React.memo(function Row({ line, index, numbers, patch, lamps, signs, mark, dim, picked, stop, selectable, diagnostic, caret, pick, keys }: RowProps) {
  const lamp = diagnostic && diagnostic.severity !== 'note' ? <Led kind={diagnostic.severity === 'error' ? 'failed' : 'waiting'} size="small" /> : null;
  const gutter = (filler: boolean) => (
    <>
      {lamps && <span className={LAMP}>{filler ? null : lamp}</span>}
      {numbers && patch && (
        <>
          <span className={NUM} aria-hidden>{filler ? '' : line.old ?? ''}</span>
          <span className={NUM} aria-hidden>{filler ? '' : line.next ?? ''}</span>
        </>
      )}
      {numbers && !patch && (selectable && !filler ? (
        <button
          type="button"
          className={`${NUM} ${PICK}`}
          tabIndex={stop ? 0 : -1}
          aria-pressed={picked}
          aria-label={`Line ${line.n}`}
          data-line={index}
          data-picked={picked ? '' : undefined}
          onMouseDown={(e) => e.shiftKey && e.preventDefault()}
          onClick={(e) => pick(index, e.shiftKey)}
          onKeyDown={(e) => keys(e, index)}
        >
          {line.n}
        </button>
      ) : (
        <span className={NUM} aria-hidden>{filler ? '' : line.n}</span>
      ))}
      {signs && <span className={SIGN}>{filler ? '' : line.sign}</span>}
    </>
  );
  return (
    <>
      <span
        className={ROW}
        data-diff={line.diff && line.diff !== 'context' ? line.diff : undefined}
        data-hunk={line.hunk ? '' : undefined}
        data-mark={mark ? '' : undefined}
        data-dim={dim ? '' : undefined}
        data-picked={picked ? '' : undefined}
        data-severity={diagnostic?.severity}
      >
        {gutter(false)}
        <span className={TEXT} dangerouslySetInnerHTML={{ __html: line.html || ' ' }} />
        {caret && <span className={CARET} aria-hidden />}
      </span>
      {/* A newline between rows keeps textContent line by line; whitespace between grid items is not rendered. */}
      {'\n'}
      {diagnostic && (
        <span className={`${ROW} mu-code-note`} data-dim={dim ? '' : undefined} role="note">
          {gutter(true)}
          <span className={NOTE_BODY}>
            <span className="text-ink">{WORD[diagnostic.severity]}</span>
            <span>{diagnostic.message}</span>
            {diagnostic.action && <Button size="compact" onClick={diagnostic.action.onAction}>{diagnostic.action.label}</Button>}
          </span>
        </span>
      )}
    </>
  );
}, same);

function useHold(name: string) {
  const [held, setHeld] = React.useState(0);
  React.useEffect(() => {
    if (!held) return;
    const ms = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)) || 1400;
    const t = setTimeout(() => setHeld(0), ms);
    return () => clearTimeout(t);
  }, [held, name]);
  return [held > 0, () => setHeld((n) => n + 1), () => setHeld(0)] as const;
}

/** Code to read and copy: numbered, tinted lines with a copy key, in a plate or on its own. */
export const CodeBlock = React.forwardRef<HTMLDivElement, CodeBlockProps>(function CodeBlock(
  { code, lang, look = 'framed', label, head, html, numbers: numbersProp = false, start = 1, wrap = false, maxLines, highlight, focus, diff, diagnostics, selectable = false, selection: selectionProp, defaultSelection = null, onSelect, onReference, streaming = false, className, style, ...props },
  ref,
) {
  const numbers = numbersProp || selectable;
  const { lines, patch } = React.useMemo(() => linesOf(code, html, lang, diff, start), [code, html, lang, diff, start]);
  const signs = lines.some((l) => l.sign !== undefined);

  // Selection, in shown numbers outside and row indexes inside.
  const [own, setOwn] = React.useState<CodeRange | null>(defaultSelection);
  const selection = selectionProp !== undefined ? selectionProp : own;
  const anchor = React.useRef<number | null>(null);
  const [cursor, setCursor] = React.useState(0);
  const body = React.useRef<HTMLDivElement>(null);
  const live = React.useRef({ selection, onSelect, start, count: lines.length, controlled: selectionProp !== undefined });
  live.current = { selection, onSelect, start, count: lines.length, controlled: selectionProp !== undefined };

  const select = React.useCallback((next: CodeRange | null) => {
    const l = live.current;
    if (!l.controlled) setOwn(next);
    l.onSelect?.(next);
  }, []);
  const pick = React.useCallback((i: number, extend: boolean) => {
    const { selection: sel, start: s } = live.current;
    setCursor(i);
    if (extend && anchor.current != null) {
      const a = Math.min(anchor.current, i);
      const b = Math.max(anchor.current, i);
      return select({ start: s + a, end: s + b });
    }
    if (sel && sel.start === s + i && sel.end === s + i) {
      anchor.current = null;
      return select(null);
    }
    anchor.current = i;
    select({ start: s + i, end: s + i });
  }, [select]);
  const keys = React.useCallback((e: React.KeyboardEvent<HTMLButtonElement>, i: number) => {
    const last = live.current.count - 1;
    const to = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: last }[e.key];
    if (to !== undefined) {
      e.preventDefault();
      const j = Math.max(0, Math.min(last, to));
      setCursor(j);
      body.current?.querySelector<HTMLButtonElement>(`button[data-line="${j}"]`)?.focus();
      if (e.shiftKey) {
        if (anchor.current == null) anchor.current = i;
        pick(j, true);
      }
    } else if (e.key === 'Escape' && live.current.selection) {
      e.preventDefault();
      anchor.current = null;
      select(null);
    }
  }, [pick, select]);

  // Streaming: follow the end while the end is in view (an observer, no layout reads on scroll).
  const end = React.useRef<HTMLSpanElement>(null);
  const stick = React.useRef(true);
  React.useEffect(() => {
    const root = body.current;
    const el = end.current;
    if (!streaming || !root || !el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => { stick.current = e.isIntersecting; }, { root, rootMargin: '0px 0px 24px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [streaming]);
  React.useLayoutEffect(() => {
    if (streaming && stick.current && body.current) body.current.scrollTop = body.current.scrollHeight;
  }, [streaming, code]);

  // Copy: the picked lines when there are some, else all of it; it waits while the code streams.
  const [copied, copiedNow, copyFailed] = useHold('--mu-r-code-block-copy-hold');
  const rawLines = React.useMemo(() => code.split('\n'), [code]);
  const picked = selection ? rawLines.slice(selection.start - start, selection.end - start + 1).join('\n') : code;
  const copyName = streaming ? 'Still writing' : copied ? 'Copied' : selection ? `Copy lines ${rangeText(selection)}` : 'Copy';
  const copy = () => navigator.clipboard?.writeText(picked).then(copiedNow, copyFailed);
  const keysNode = (
    <>
      {selection && onReference && (
        <IconButton className="animate-code-block-in reduced-motion:animate-none" label={`Reference lines ${rangeText(selection)}`} icon={<AttachIcon />} onClick={() => onReference(selection)} />
      )}
      <IconButton label={copyName} disabled={streaming} icon={<MorphPair glyphs={COPY} name={copied ? 'check' : 'copy'} />} onClick={copy} />
      <span role="status" className="sr-only">{copied ? 'Copied' : ''}</span>
    </>
  );

  const name = label ?? lang ?? 'Code';
  const shownLabel = selection ? `${name} · ${rangeText(selection)}` : name;
  const byLine = React.useMemo(() => new Map(diagnostics?.map((d) => [d.line, d])), [diagnostics]);
  const digits = String(patch ? Math.max(0, ...lines.map((l) => Math.max(l.old ?? 0, l.next ?? 0))) : start + lines.length - 1).length;
  const vars = { ...style, '--mu-code-digits': digits, ...(maxLines ? { '--mu-code-max-lines': maxLines } : null) } as React.CSSProperties;
  const stop = Math.min(cursor, lines.length - 1);
  const cls = `${ROOT} ${LOOK[look]}${className ? ` ${className}` : ''}`;

  return (
    <div ref={ref} className={cls} style={vars} data-look={look} data-wrap={wrap ? '' : undefined} data-streaming={streaming ? '' : undefined} aria-busy={streaming || undefined} {...props}>
      {look === 'framed' && (
        <div className={HEAD}>
          <div className="flex min-w-0 max-w-full overflow-x-auto">{head ?? <span className={LABEL}><SwapText value={shownLabel} /></span>}</div>
          <div className={KEYS}>{keysNode}</div>
        </div>
      )}
      {look === 'ghost' && <div className={FLOAT} data-held={copied || selection ? '' : undefined}>{keysNode}</div>}
      <div ref={body} className={maxLines ? `${BODY} code-block-max` : BODY}>
        <pre className={PRE}>
          <code className={LINES}>
            {lines.map((line, i) => (
              <Row
                key={i}
                line={line}
                index={i}
                numbers={numbers}
                patch={patch && numbers}
                lamps={byLine.size > 0}
                signs={signs}
                mark={has(highlight, line.n)}
                dim={!!focus?.length && !has(focus, line.n)}
                picked={!!selection && line.n >= selection.start && line.n <= selection.end}
                stop={i === stop}
                selectable={selectable}
                diagnostic={byLine.get(line.n)}
                caret={streaming && i === lines.length - 1}
                pick={pick}
                keys={keys}
              />
            ))}
          </code>
        </pre>
        <span ref={end} aria-hidden />
      </div>
    </div>
  );
});
