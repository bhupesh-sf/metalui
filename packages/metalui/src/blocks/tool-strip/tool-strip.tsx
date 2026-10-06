'use client';

import * as React from 'react';
import { Toolbar } from '@base-ui/react/toolbar';
import { Surface } from '../../components/surface/surface';
import { Button } from '../../components/button/button';
import { Rule } from '../../components/rule/rule';
import { Menu, MenuItem } from '../../components/menu/menu';

/* ─────────────────────────────────────────────────────────
 * SELECTION TOOL STRIP (the reference design's #selTools): a composition on Base UI Toolbar
 *   Surface(graphite-strip, strip) › Button(strip) × n, Rule(graphite) + Button(strip-danger) for the one destructive verb
 *
 *   a click selection  rises 4 from the selection on the part spring (instant under Reduce Motion)
 *   hover / press      the strip cap's own: a soft light well; down 1 onto a dark well
 *   count              an optional lead ("3 selected") before an engraved separator
 *   menu               a verb with choices (Assign to…, Snooze until…) opens its menu above the strip
 * Never for a selection made by finishing (quiet), never while dragging, resizing or in the past.
 * ───────────────────────────────────────────────────────── */

/* Layout from the toolstrip group; it rises on the part spring (animate-toolstrip-in). */
const STRIP = 'mu-toolstrip inline-flex items-center gap-toolstrip-gap p-toolstrip-pad animate-toolstrip-in [&>.mu-rule]:h-toolstrip-sep-height';

const COUNT = 'mu-toolstrip-count px-toolstrip-pad type-ui whitespace-nowrap tabular-nums text-toolstrip-ink-hover';

export interface ToolStripItem {
  /** The verb. With `iconOnly` it names the key for assistive tech and the tooltip only. */
  label: string;
  /** Runs the verb. A verb with a `menu` runs its choices instead. */
  onSelect?: () => void;
  /** The verb's glyph, before the word, sized by the strip cap. */
  icon?: React.ReactNode;
  /** Only the glyph shows (Clear selection's ×). */
  iconOnly?: boolean;
  /** Choices that open above the strip instead of an action: Assign to…, Snooze until…. */
  menu?: { heading?: string; items: { label: string; onSelect: () => void }[] };
  /** The one destructive verb (Send away), set apart by an engraved separator. */
  destructive?: boolean;
  disabled?: boolean;
  /** The key, in the tooltip and aria-keyshortcuts. */
  shortcut?: string;
}

export interface ToolStripProps {
  items: ToolStripItem[];
  /** What the verbs act on, for assistive tech: "3 blocks". */
  label: string;
  /** A lead before the verbs, set off by a separator: "3 selected" (a SwapText keeps the count turning). */
  count?: React.ReactNode;
  /** A class on every verb's word, e.g. "sr-only @lg:not-sr-only" to keep only glyphs when narrow; the word still names the key. */
  wordClassName?: string;
  className?: string;
}

/** Verbs over a selection. Tools compose, and never own the data before or after. */
export function ToolStrip({ items, label, count, wordClassName, className }: ToolStripProps) {
  return (
    <Toolbar.Root
      aria-label={`Tools for ${label}`}
      render={<Surface material="graphite-strip" radius="strip" className={className ? `${STRIP} ${className}` : STRIP} />}
    >
      {count != null && <span className={COUNT}>{count}</span>}
      {count != null && <Toolbar.Separator render={<Rule tone="graphite" />} />}
      {items.flatMap((it, i) => {
        const key = (
          <Toolbar.Button
            key={it.label}
            render={<Button cap={it.destructive ? 'strip-danger' : 'strip'} icon={it.icon} className="mu-toolstrip-button" />}
            disabled={it.disabled}
            aria-label={it.iconOnly || wordClassName ? it.label : undefined}
            aria-keyshortcuts={it.shortcut}
            title={it.shortcut ? `${it.label} · ${it.shortcut}` : it.iconOnly ? it.label : undefined}
            onClick={it.menu ? undefined : it.onSelect}
          >
            {it.iconOnly ? null : wordClassName ? <span className={wordClassName}>{it.label}</span> : it.label}
          </Toolbar.Button>
        );
        return [
          // The destructive verb is set apart; anything after it (a close key) stays beside it.
          it.destructive && !items[i - 1]?.destructive ? <Toolbar.Separator key={`${it.label}-rule`} render={<Rule tone="graphite" />} /> : null,
          it.menu ? (
            <Menu key={it.label} side="top" heading={it.menu.heading} trigger={key}>
              {it.menu.items.map((m) => <MenuItem key={m.label} onSelect={m.onSelect}>{m.label}</MenuItem>)}
            </Menu>
          ) : key,
        ];
      })}
    </Toolbar.Root>
  );
}
