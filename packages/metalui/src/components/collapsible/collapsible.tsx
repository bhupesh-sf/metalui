'use client';

import * as React from 'react';
import { Collapsible as BaseCollapsible } from '@base-ui/react/collapsible';
import { ChevronIcon } from '../../icons/components.generated';
import { IconButton } from '../icon-button/icon-button';
import { SwapText } from '../../motion/swap';
import { useTravelAfter } from '../../motion/rows';

/* ─────────────────────────────────────────────────────────
 * COLLAPSIBLE, show and hide in place on its own, on Base UI Collapsible
 *
 *   row       Collapsible.Trigger: a 32 row, the title, an optional summary (ink3) and the set's
 *             chevron at the end; the row's panel hover hangs past the column, so the title lines
 *             up with what it opens
 *   key       Collapsible.Key: a ghost key with the chevron, beside something that has a name
 *   more      Collapsible.More: a quiet key after the panel, "Show 3 more" turning on the drum to
 *             "Show less"; the chevron turns over; what was hidden opens above it
 *   open      the panel takes its place at once and is uncovered from its top edge as it slides out
 *             from one nest above, settle spring; everything after it travels down in step
 *   close     it slides back under its trigger on the release spring while what follows travels up
 *             into the gap; then it goes. Only clip, transform and opacity move, never height
 *   chevron   a quarter turn (row, key) or a half (more) on the part spring; it may overshoot
 *   summary   fades out as the section opens (its content now says it)
 *   focus     the green ring; Enter or Space opens and closes; aria-expanded, aria-controls
 *   disabled  40 %, still focusable
 * Reduce Motion: the content crossfades in place, nothing slides or travels, the chevron snaps.
 * Slots: Collapsible.Root, Collapsible.Trigger, Collapsible.Key, Collapsible.More, Collapsible.Panel.
 * ───────────────────────────────────────────────────────── */

const ROOT = 'mu-collapsible';
const ROW = 'mu-collapsible-trigger box-border flex items-center gap-collapsible-row-gap h-collapsible-row-height px-collapsible-row-pad-x collapsible-hang rounded-collapsible-row-radius border-0 bg-transparent type-ui text-ink text-left cursor-pointer outline-none transition-row hover:recipe-row-panel-hover focus-visible:focus-ring data-disabled:opacity-collapsible-row-disabled data-disabled:cursor-default';
const TITLE = 'min-w-0 flex-1 truncate';
const SUMMARY = 'mu-collapsible-summary min-w-0 truncate type-meta text-ink3 collapsible-summary reduced-motion:transition-none';
const CHEVRON = 'mu-collapsible-chevron flex-none size-collapsible-chevron-size text-ink2 collapsible-chevron reduced-motion:transition-none';
const KEY = 'mu-collapsible-key data-disabled:opacity-collapsible-row-disabled data-disabled:cursor-default';
const MORE = 'mu-collapsible-more box-border inline-flex items-center gap-collapsible-more-gap h-collapsible-more-height px-collapsible-more-pad-x collapsible-more-hang rounded-collapsible-more-radius border-0 bg-transparent type-ui text-ink2 cursor-pointer outline-none transition-row hover:recipe-row-panel-hover hover:text-ink focus-visible:focus-ring data-disabled:opacity-collapsible-row-disabled data-disabled:cursor-default';
const OVER = 'mu-collapsible-chevron flex-none size-collapsible-chevron-size collapsible-chevron-over reduced-motion:transition-none';
const PANEL = 'mu-collapsible-panel collapsible-panel';

const join = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(' ');

interface CollapsibleContext {
  open: boolean;
  panel: React.RefObject<HTMLDivElement | null>;
}
const Ctx = React.createContext<CollapsibleContext | null>(null);
const useCollapsible = (part: string) => {
  const c = React.useContext(Ctx);
  if (!c) throw new Error(`Collapsible.${part} must be inside Collapsible.Root`);
  return c;
};

export type CollapsibleRootProps = BaseCollapsible.Root.Props & { className?: string };

function Root({ open: openProp, defaultOpen = false, onOpenChange, className, ...props }: CollapsibleRootProps) {
  const root = React.useRef<HTMLDivElement>(null);
  const panel = React.useRef<HTMLDivElement>(null);
  const [own, setOwn] = React.useState(defaultOpen);
  const open = openProp ?? own;
  const before = useTravelAfter(root, panel, open);
  // A new `open` from the host (not from a trigger): note where things are before it lands.
  const last = React.useRef(open);
  if (open !== last.current) {
    last.current = open;
    before();
  }
  const change = (next: boolean, details: BaseCollapsible.Root.ChangeEventDetails) => {
    onOpenChange?.(next, details);
    if (details.isCanceled) return;
    before();
    last.current = next;
    if (openProp === undefined) setOwn(next);
  };
  const ctx = React.useMemo(() => ({ open, panel }), [open]);
  return (
    <Ctx.Provider value={ctx}>
      <BaseCollapsible.Root ref={root} open={open} onOpenChange={change} className={join(ROOT, className)} {...props} />
    </Ctx.Provider>
  );
}

export type CollapsibleTriggerProps = Omit<BaseCollapsible.Trigger.Props, 'className'> & {
  className?: string;
  /** What's inside, said while closed ("2 changed", "PNG, 2×"); it fades out as the section opens. */
  summary?: React.ReactNode;
};

/** The row: the title (children), an optional summary and the chevron at the end. */
function Trigger({ className, children, summary, ...props }: CollapsibleTriggerProps) {
  useCollapsible('Trigger');
  return (
    <BaseCollapsible.Trigger className={join(ROW, className)} {...props}>
      <span className={TITLE}>{children}</span>
      {summary != null && <span className={SUMMARY}>{summary}</span>}
      <ChevronIcon animate={false} className={CHEVRON} />
    </BaseCollapsible.Trigger>
  );
}

export type CollapsibleKeyProps = Omit<BaseCollapsible.Trigger.Props, 'className' | 'children' | 'render'> & {
  className?: string;
  /** What the key shows, read by assistive tech and shown as its tooltip by the host: "Show repositories". */
  label: string;
};

/** A ghost key with the chevron, for beside a heading or a line that already names what opens. */
function Key({ className, label, ...props }: CollapsibleKeyProps) {
  useCollapsible('Key');
  return (
    <BaseCollapsible.Trigger
      render={<IconButton variant="ghost" label={label} icon={<ChevronIcon animate={false} className={CHEVRON} />} />}
      className={join(KEY, className)}
      {...props}
    />
  );
}

export type CollapsibleMoreProps = Omit<BaseCollapsible.Trigger.Props, 'className' | 'children'> & {
  className?: string;
  /** How many are hidden: "Show 3 more". */
  count?: number;
  /** The words while closed, when a count doesn't say it ("Show all 12 files"). */
  more?: string;
  /** The words while open. */
  less?: string;
};

/** A quiet key after the panel: what was hidden opens above it, and its words turn on the drum. */
function More({ className, count, more, less = 'Show less', ...props }: CollapsibleMoreProps) {
  const { open } = useCollapsible('More');
  const closed = more ?? (count != null ? `Show ${count} more` : 'Show more');
  return (
    <BaseCollapsible.Trigger className={join(MORE, className)} {...props}>
      <SwapText value={open ? less : closed} />
      <ChevronIcon animate={false} className={OVER} />
    </BaseCollapsible.Trigger>
  );
}

export type CollapsiblePanelProps = Omit<BaseCollapsible.Panel.Props, 'className'> & { className?: string };

/** What opens. It adds no padding of its own: the host lays out what it holds. */
function Panel({ className, ...props }: CollapsiblePanelProps) {
  const { panel } = useCollapsible('Panel');
  return <BaseCollapsible.Panel ref={panel} className={join(PANEL, className)} {...props} />;
}

export const Collapsible = Object.assign(Root, { Root, Trigger, Key, More, Panel });
