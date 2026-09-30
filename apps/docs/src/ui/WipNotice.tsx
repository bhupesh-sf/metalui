import * as React from 'react';
import { Link, useLocation } from 'react-router';
import { Led } from '@unlocalhosted/metalui';

/* ─────────────────────────────────────────────────────────
 * WIP NOTICE · one quiet line at the top of every page
 *
 *   rest      a breathing amber lamp (in progress), "Work in progress", what it means in a few
 *             words, and a link to the page that lists what is unfinished
 *   on /wip   the link is left out: you are there
 * Reduce Motion: the lamp holds steady (the LED's own rule).
 * ───────────────────────────────────────────────────────── */

export function WipNotice() {
  const { pathname } = useLocation();
  return (
    <aside aria-label="Work in progress" className="mb-24 flex max-w-full flex-wrap items-center gap-x-8 gap-y-2 rounded-card px-14 py-8 recipe-switcher type-meta text-ink2">
      <Led kind="waiting" size="small" gesture="breathe" />
      <strong className="font-semibold text-ink">Work in progress</strong>
      <span>MetalUI is 0.0 alpha: components, APIs and looks still change.</span>
      {pathname !== '/wip' && <Link to="/wip" className="text-ink underline underline-offset-2 decoration-rule hover:decoration-ink focus-visible:focus-ring rounded-[4px]">What's unfinished</Link>}
    </aside>
  );
}
