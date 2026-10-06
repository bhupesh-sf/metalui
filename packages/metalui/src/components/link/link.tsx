'use client';

import * as React from 'react';
import { useRender } from '@base-ui/react/use-render';
import { Icon } from '../../icons/Icon';

/* ─────────────────────────────────────────────────────────
 * LINK, an inline link in text
 *
 *   rest      the text's own type and ink, always underlined with an engraved hairline
 *             (colour alone never marks a link)
 *   hover     the underline darkens to the text's ink (160 ms)
 *   external  a small arrow after it; hovered, it nudges one step up and out on the part spring,
 *             toward where the link goes; it opens in a new tab and says so to assistive tech
 *   download  (the `download` attribute) the download glyph after it, playing its act on hover, and
 *             the file's size (`fileSize`) in a quieter ink; neither is underlined
 *   pressed   it dims for the press
 *   focus     the green ring
 * Reduce Motion: the arrow does not travel (the part spring is instant).
 * `render` swaps the element (a router's link) and keeps the look.
 * ───────────────────────────────────────────────────────── */

const LINK = 'mu-link link-anchor outline-none focus-visible:focus-ring';
// The underline lives on the text, so the external arrow beside it stays undecorated and inline.
const LINE = 'mu-link-line link-line';
const OUT = 'mu-link-out link-out';
const FILE = 'mu-link-file link-file';
const SIZE = 'mu-link-size link-file-size';

export interface LinkProps extends useRender.ComponentProps<'a'> {
  /** Leaves this site: adds the arrow, opens in a new tab, and says so. */
  external?: boolean;
  /** A download link's size, said after the glyph: "2.4 MB". */
  fileSize?: string;
}

/** An inline link. `external` marks and opens links that leave the site; `download` shows the download glyph. */
export const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(function Link({ external, fileSize, render, className, children, ...props }, ref) {
  const file = props.download !== undefined && props.download !== false;
  // A download link is the glyph's trigger, so hovering anywhere on it plays the act.
  const base = file ? `${LINK} mu-icon-trigger` : LINK;
  const own = className ? `${base} ${className}` : base;
  return useRender({
    render,
    ref,
    defaultTagName: 'a',
    props: {
      ...props,
      className: own,
      ...(external ? { target: '_blank', rel: 'noopener noreferrer' } : null),
      children: (
        <>
          <span className={LINE}>{children}</span>
          {file && (
            <>
              <span aria-hidden className={FILE}><Icon name="download" size={16} /></span>
              {fileSize && <span aria-hidden className={SIZE}>· {fileSize}</span>}
              <span className="sr-only">{` (download${fileSize ? `, ${fileSize}` : ''})`}</span>
            </>
          )}
          {external && (
            <>
              {/* A text glyph, not an inline-block: punctuation after the link stays on its line. */}
              <span aria-hidden className={OUT}>↗</span>
              <span className="sr-only"> (opens in a new tab)</span>
            </>
          )}
        </>
      ),
    },
  });
});
