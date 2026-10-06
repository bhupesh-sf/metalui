'use client';

import * as React from 'react';
import { useRender } from '@base-ui/react/use-render';
import { Icon } from '../../icons/Icon';
import { Tooltip } from '../tooltip/tooltip';

/* ─────────────────────────────────────────────────────────
 * LINK, an inline link in text
 *
 *   rest      the text's own type and ink, always underlined with an engraved hairline under the
 *             descenders (colour alone never marks a link)
 *   hover     the line rises toward the baseline and thickens on the settle spring as it darkens to
 *             the text's ink (160 ms); a faint tint of that ink lies behind the words
 *   pressed   the words sink one step (the press travel) and dim, at once
 *   focus     the green ring
 *   visited   opt-in (`visited`): the words in ink2, the line in ink3
 *   current   (aria-current) no line, full ink: it reads as "here"
 *   disabled  ink3, no line, no pointer; still focusable, so its tooltip (`reason`) can say why
 *   loading   a run of ink travels along the line, again and again, until `loading` clears
 *   external  the `external` glyph after the words; it plays its act on hover (the arrow leaves);
 *             opens in a new tab and says so to assistive tech
 *   download  (the `download` attribute) the download glyph, then the size (`fileSize`) quieter
 *   kinds     quiet: no line until hover; standalone: on its own line, a trailing chevron
 * Glyphs sit outside the line. Reduce Motion: the line jumps instead of rising, the glyphs do not
 * act, and loading breathes instead of running.
 * Stills: data-hovered and data-pressed draw those states without a pointer (a states strip, a row
 * that owns the hover).
 * `render` swaps the element (a router's link) and keeps the look.
 * ───────────────────────────────────────────────────────── */

const LINK = 'mu-link link-anchor outline-none focus-visible:focus-ring data-focused:focus-ring';
const LINE = 'mu-link-line link-line';
const GLYPH = 'mu-link-glyph link-glyph';
const SIZE = 'mu-link-size link-file-size';

export type LinkKind = 'inline' | 'quiet' | 'standalone';

export interface LinkProps extends useRender.ComponentProps<'a'> {
  /** Leaves this site: adds the external glyph, opens in a new tab, and says so. */
  external?: boolean;
  /** A download link's size, said after the glyph: "2.4 MB". */
  fileSize?: string;
  /** inline (default): in a sentence. quiet: no line until hover, only where the context already says
   *  "these are links" (a dense list, a table). standalone: on its own line, with a trailing chevron. */
  kind?: LinkKind;
  /** Shows where you have been: the words step to ink2, the line to ink3. Off in apps, on in documents. */
  visited?: boolean;
  /** The route is on its way: the line runs like a progress line until this clears. */
  loading?: boolean;
  /** Unavailable: ink3, no line, does not follow. It stays focusable so `reason` can be read. */
  disabled?: boolean;
  /** Why a disabled link is unavailable, said in a tooltip: "Export is on the Pro plan". */
  reason?: string;
}

/** An inline link. `external` marks and opens links that leave the site; `download` shows the download glyph. */
export const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { external, fileSize, kind = 'inline', visited, loading, disabled, reason, render, className, children, ...props },
  ref,
) {
  const file = props.download !== undefined && props.download !== false;
  const current = props['aria-current'] !== undefined && props['aria-current'] !== false && props['aria-current'] !== 'false';
  const trail = file ? 'download' : external ? 'external' : kind === 'standalone' && !current ? 'chevron' : null;
  // A link with a glyph is the glyph's trigger, so hovering anywhere on it plays the act.
  const base = trail ? `${LINK} mu-icon-trigger` : LINK;
  const own = className ? `${base} ${className}` : base;
  // Unavailable: no destination at all (not even a router's), but still a focusable link that refuses.
  const off = disabled
    ? {
        href: undefined, download: undefined, role: 'link', tabIndex: props.tabIndex ?? 0, 'aria-disabled': true as const,
        onClick: (e: React.MouseEvent<HTMLAnchorElement>) => e.preventDefault(),
      }
    : null;
  const element = useRender({
    render: disabled ? undefined : render,
    ref,
    defaultTagName: 'a',
    props: {
      ...props,
      ...(external && !disabled ? { target: '_blank', rel: 'noopener noreferrer' } : null),
      ...off,
      className: own,
      'data-kind': kind === 'inline' ? undefined : kind,
      'data-visited': visited ? '' : undefined,
      'data-current': current ? '' : undefined,
      'data-loading': loading && !disabled ? '' : undefined,
      'aria-busy': loading && !disabled ? true : undefined,
      children: (
        <>
          <span className={LINE}>{children}</span>
          {trail && (
            // The glyph (and a download's size) in one no-wrap span, joined to the last word (U+2060,
            // the word joiner): they never part from the words, and punctuation after stays on its line.
            <span aria-hidden className={GLYPH}>
              {'\u2060'}
              <Icon name={trail} size={16} turn={trail === 'chevron' ? 270 : undefined} />
              {file && fileSize && <span className={SIZE}>· {fileSize}</span>}
            </span>
          )}
          {file && <span className="sr-only">{` (download${fileSize ? `, ${fileSize}` : ''})`}</span>}
          {external && <span className="sr-only"> (opens in a new tab)</span>}
          {loading && !disabled && <span className="sr-only"> (loading)</span>}
          {disabled && reason && <span className="sr-only">{` (${reason})`}</span>}
        </>
      ),
    },
  });
  return disabled && reason ? <Tooltip label={reason} wrap>{element}</Tooltip> : element;
});
