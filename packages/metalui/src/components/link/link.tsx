'use client';

import * as React from 'react';
import { useRender } from '@base-ui/react/use-render';

/* ─────────────────────────────────────────────────────────
 * LINK, an inline link in text
 *
 *   rest      the text's own type and ink, always underlined with an engraved hairline
 *             (colour alone never marks a link)
 *   hover     the underline darkens to the text's ink (160 ms)
 *   external  a small arrow after it; hovered, it nudges one step up and out on the part spring,
 *             toward where the link goes; it opens in a new tab and says so to assistive tech
 *   pressed   it dims for the press
 *   focus     the green ring
 * Reduce Motion: the arrow does not travel (the part spring is instant).
 * `render` swaps the element (a router's link) and keeps the look.
 * ───────────────────────────────────────────────────────── */

const LINK = 'mu-link link-anchor outline-none focus-visible:focus-ring';
// The underline lives on the text, so the external arrow beside it stays undecorated and inline.
const LINE = 'mu-link-line link-line';
const OUT = 'mu-link-out link-out';

export interface LinkProps extends useRender.ComponentProps<'a'> {
  /** Leaves this site: adds the arrow, opens in a new tab, and says so. */
  external?: boolean;
}

/** An inline link. `external` marks and opens links that leave the site. */
export const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(function Link({ external, render, className, children, ...props }, ref) {
  const own = className ? `${LINK} ${className}` : LINK;
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
