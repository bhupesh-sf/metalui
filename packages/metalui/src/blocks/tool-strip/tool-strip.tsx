'use client';

import * as React from 'react';
import { Toolbar } from '@base-ui/react/toolbar';
import { Surface } from '../../components/surface/surface';
import { Button } from '../../components/button/button';
import { Rule } from '../../components/rule/rule';
import { Menu, MenuItem } from '../../components/menu/menu';
import { Tooltip, TooltipProvider } from '../../components/tooltip/tooltip';
import { MoreIcon } from '../../icons/components.generated';
import { useIsoLayoutEffect } from '../../motion/layout-effect';
import { springOf } from '../../motion/rows';

/* ─────────────────────────────────────────────────────────
 * SELECTION TOOL STRIP (the reference design's #selTools): a composition on Base UI Toolbar
 *   a plate of Surface(graphite-strip) › Button(strip) × n, Rule(graphite) + Button(strip-danger) for the one destructive verb
 *
 *   a click selection  rises 4 from the selection on the part spring (instant under Reduce Motion)
 *   placed             with `anchor` (the selection's bounds in the positioned parent's space): centred 12
 *                      above it, below it when there's no room (it then comes down from it), kept 12 inside
 *                      the parent's edges; a pan or zoom moves the anchor and the strip follows at once
 *   the verbs change   (a new selection: `items` or `label` changes) one morph, all on the settle spring:
 *      0 ms            kept verbs glide from where they were (no jump); the plate's two ends travel to the
 *                      new width (each end is half a plate sliding under a fixed clip: only transforms)
 *      0 ms            leaving verbs fade where they stood (release spring); new ones fade in (settle)
 *    ~214 ms           reads as done
 *   doesn't fit        the verbs that don't fit the strip's room (the parent's width when placed, else the
 *                      nearest container's) go into a More key (`more`) before the destructive verb
 *   hover / press      the strip cap's own: a soft light well; down 1 onto a dark well
 *   count              an optional lead ("3 selected") before an engraved separator
 *   menu               a verb with choices (Assign to…, Snooze until…) opens its menu on the strip's far side
 *   disabled           40 %; the tooltip says why (`disabledReason`), and so does the accessible description
 *   waiting            the key's own wait: held down, its glyph turns into the arc after the show delay
 *   hold               an irreversible destructive verb fills while held, and runs only at the end
 * Reduce Motion: the morph is instant (no glide, no fades); the strip still places itself.
 * Never for a selection made by finishing (quiet), never while dragging, resizing or in the past.
 * ───────────────────────────────────────────────────────── */

/* Layout from the toolstrip group; it rises on the part spring (animate-toolstrip-in). The plate sits under the
 * keys (its own layer, -z-1 inside the isolated strip). */
const STRIP = 'mu-toolstrip relative isolate inline-flex items-center gap-toolstrip-gap p-toolstrip-pad animate-toolstrip-in [&>.mu-rule]:h-toolstrip-sep-height';
const LAYER = 'pointer-events-none absolute inset-0';
const HALF = 'mu-toolstrip-half absolute inset-0';
// The measure row: every verb at its natural width, unseen, so the strip knows what fits before it paints.
const MEASURE = 'mu-toolstrip-measure invisible pointer-events-none absolute left-0 top-0 inline-flex items-center gap-toolstrip-gap p-toolstrip-pad [&>.mu-rule]:h-toolstrip-sep-height';

// The count's place only: a composition doesn't paint, so its words come styled from the host.
const COUNT = 'mu-toolstrip-count inline-flex items-center px-toolstrip-pad whitespace-nowrap';


export interface ToolStripItem {
  /** The verb. With `iconOnly` (or words hidden) it names the key for assistive tech and the tooltip. */
  label: string;
  /** Runs the verb. A verb with a `menu` runs its choices instead. */
  onSelect?: () => void;
  /** The verb's glyph, before the word, sized by the strip cap. */
  icon?: React.ReactNode;
  /** Only the glyph shows (Clear selection's ×). */
  iconOnly?: boolean;
  /** Choices that open from the strip instead of an action: Assign to…, Snooze until…. */
  menu?: { heading?: string; items: { label: string; onSelect: () => void }[] };
  /** The one destructive verb (Send away), set apart by an engraved separator, last. */
  destructive?: boolean;
  disabled?: boolean;
  /** Why it's disabled, in its tooltip and accessible description: "Crop needs one image". */
  disabledReason?: string;
  /** The key, in the tooltip and aria-keyshortcuts. */
  shortcut?: string;
  /** The verb is working: `waiting` holds the key down and its glyph turns into the arc; `done` holds it for the result. */
  state?: 'ready' | 'waiting' | 'done';
  /** The destructive verb can't be undone: it runs only after a hold (the Button's hold to confirm). */
  hold?: boolean;
  /** Only for a selection of one (Rename); `verbsFor` drops it for several. */
  single?: boolean;
}

/** The selection's bounds in the strip's positioned parent (the canvas), after pan and zoom. */
export interface ToolStripAnchor { x: number; y: number; width: number; height: number }

export interface ToolStripProps {
  items: ToolStripItem[];
  /** What the verbs act on, for assistive tech: "3 blocks". A new selection says something new. */
  label: string;
  /** A lead before the verbs, set off by a separator, styled by you: "3 selected" (a SwapText keeps the count turning). */
  count?: React.ReactNode;
  /** A class on every verb's word, e.g. "sr-only" (glyphs only, names in tooltips) or "sr-only @lg:not-sr-only". */
  wordClassName?: string;
  /** Place the strip over this selection (absolute in its positioned parent); without it the host places it. */
  anchor?: ToolStripAnchor;
  className?: string;
}

/**
 * The verbs a selection gets: those every selected kind shares, in the first kind's order (list shared verbs in
 * the same order in every set so muscle memory holds), without the `single` ones when more than one is selected.
 *
 *   verbsFor(['text', 'image'], { text: [...], image: [...], link: [...] })  // Gather, Export, Send away
 */
export function verbsFor<K extends string>(selection: readonly K[], sets: Record<K, ToolStripItem[]>): ToolStripItem[] {
  const kinds = [...new Set(selection)];
  if (!kinds.length) return [];
  return sets[kinds[0]].filter((v) => !(v.single && selection.length > 1) && kinds.every((k) => sets[k].some((s) => s.label === v.label)));
}

interface VerbProps extends Omit<React.ComponentPropsWithoutRef<'button'>, 'onClick'> {
  item: ToolStripItem;
  word?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
}

/** One key: a toolbar button on the strip cap, in a tooltip when something about it isn't in its word. */
const Verb = React.forwardRef<HTMLButtonElement, VerbProps>(function Verb({ item: it, word, ...rest }, ref) {
  const named = it.iconOnly || word != null;
  const reason = it.disabled ? it.disabledReason : undefined;
  const key = (
    <Toolbar.Button
      ref={ref}
      {...rest}
      data-verb={reason ? undefined : it.label}
      render={<Button cap={it.destructive ? 'strip-danger' : 'strip'} icon={it.icon} state={it.state} hold={it.hold} className="mu-toolstrip-button" />}
      disabled={it.disabled}
      aria-label={named ? it.label : undefined}
      aria-keyshortcuts={it.shortcut}
      aria-description={reason}
    >
      {it.iconOnly ? null : word != null ? <span className={word}>{it.label}</span> : it.label}
    </Toolbar.Button>
  );
  const note = reason ?? (it.hold ? 'hold to confirm' : undefined);
  if (!named && !note && !it.shortcut) return key;
  return (
    <Tooltip label={note ? <>{it.label}<Tooltip.Dim> · {note}</Tooltip.Dim></> : it.label} shortcut={it.shortcut}>
      {/* A disabled key doesn't open its own tooltip; its slot does, so the reason is one hover away. */}
      {reason ? <span data-verb={it.label} className="inline-flex">{key}</span> : key}
    </Tooltip>
  );
});

// How far past its clip a plate half reaches beyond the travel itself: room for the settle spring's overshoot.
const SLACK = 24;

const MORE: ToolStripItem = { label: 'More', icon: <MoreIcon />, iconOnly: true };

/** What the strip remembers of the last layout it showed, in its positioned parent's space. */
interface Placed { el: HTMLElement; x: number; y: number }
interface Snapshot { sig: string; x: number; y: number; w: number; keys: Map<string, Placed> }

/** Verbs over a selection. Tools compose, and never own the data before or after. */
export function ToolStrip({ items, label, count, wordClassName, anchor, className }: ToolStripProps) {
  const root = React.useRef<HTMLDivElement>(null);
  const measure = React.useRef<HTMLSpanElement>(null);
  const ghosts = React.useRef<HTMLSpanElement>(null);
  const plate = React.useRef<HTMLSpanElement>(null);
  const snap = React.useRef<Snapshot | null>(null);
  const [fit, setFit] = React.useState(Infinity);
  const [side, setSide] = React.useState<'top' | 'bottom'>('top');
  const [, remeasure] = React.useReducer((n: number) => n + 1, 0);

  // The verbs that may fold into More: the plain ones before the destructive verb.
  const cut = items.findIndex((it) => it.destructive);
  const foldable = items.filter((it, i) => (cut < 0 || i < cut) && !it.iconOnly);
  const folded = foldable.slice(fit);
  const shown = items.filter((it) => !folded.includes(it));
  const moreAt = folded.length ? (cut < 0 ? shown.length : shown.indexOf(items[cut])) : -1;

  // Room changes (the parent resizes, fonts land): measure again.
  React.useEffect(() => {
    const el = root.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(remeasure);
    const room = roomOf(el, !!anchor);
    if (room) ro.observe(room);
    if (measure.current) ro.observe(measure.current);
    return () => ro.disconnect();
  }, [anchor != null]); // eslint-disable-line react-hooks/exhaustive-deps

  // Every commit, before paint: what fits, where it goes, and (when the verbs changed) the morph.
  useIsoLayoutEffect(() => {
    const el = root.current;
    const m = measure.current;
    if (!el || !m) return;
    const margin = parseFloat(getComputedStyle(el).getPropertyValue('--mu-toolstrip-gap-above')) || 0;
    const room = roomOf(el, !!anchor);
    const n = fitOf(m, (room?.clientWidth ?? window.innerWidth) - 2 * margin, foldable.length);
    if (n !== fit) return setFit(n); // renders again before paint; the morph waits for the settled layout
    if (anchor && el.offsetParent) {
      const placed = place(el, anchor, el.offsetParent as HTMLElement, margin);
      if (placed !== side) return setSide(placed);
    }
    const keys = new Map<string, Placed>();
    el.querySelectorAll<HTMLElement>(':scope > [data-verb]').forEach((k) => keys.set(k.dataset.verb!, { el: k, x: k.offsetLeft, y: k.offsetTop }));
    const next: Snapshot = { sig: `${label}\n${[...keys.keys()].join('\n')}`, x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, keys };
    const prev = snap.current;
    snap.current = next;
    if (prev && prev.sig !== next.sig) morph(el, prev, next, ghosts.current, plate.current);
  });

  const word = wordClassName;
  const verb = (it: ToolStripItem) => {
    const key = <Verb item={it} word={word} onClick={it.menu ? undefined : it.onSelect} />;
    return it.menu ? (
      <Menu key={it.label} side={side} heading={it.menu.heading} trigger={key}>
        {it.menu.items.map((m) => <MenuItem key={m.label} onSelect={m.onSelect}>{m.label}</MenuItem>)}
      </Menu>
    ) : <React.Fragment key={it.label}>{key}</React.Fragment>;
  };
  const more = (
    <Menu key="More" side={side} align="end" heading="More" trigger={<Verb item={MORE} />}>
      {folded.flatMap((it) => it.menu
        ? it.menu.items.map((m) => <MenuItem key={`${it.label}-${m.label}`} icon={it.icon} onSelect={m.onSelect}>{`${it.menu!.heading ?? it.label} ${m.label}`}</MenuItem>)
        : [<MenuItem key={it.label} icon={it.icon} shortcut={it.shortcut} disabled={it.disabled || it.state === 'waiting'} onSelect={it.onSelect}>{it.label}</MenuItem>])}
    </Menu>
  );
  // The destructive verb is set apart; anything after it (a close key) stays beside it.
  const rule = (it: ToolStripItem, i: number, list: ToolStripItem[]) => (it.destructive && !list[i - 1]?.destructive
    ? <Toolbar.Separator key={`${it.label}-rule`} data-verb={`${it.label}-rule`} render={<Rule tone="graphite" />} />
    : null);

  return (
    <TooltipProvider>
      <Toolbar.Root
        ref={root}
        aria-label={`Tools for ${label}`}
        data-side={anchor ? side : undefined}
        className={className ? `${STRIP} ${className}` : STRIP}
        style={anchor ? { position: 'absolute' } : undefined}
      >
        {/* The plate: whole at rest; while its width travels, two halves (the whole one hides) */}
        <span ref={plate} aria-hidden className={`${LAYER} -z-1`}>
          <Surface material="graphite-strip" radius="strip" className="absolute inset-0" />
          <span className={`${HALF} invisible`}><Surface material="graphite-strip" radius="strip" className="absolute inset-0" /></span>
          <span className={`${HALF} invisible`}><Surface material="graphite-strip" radius="strip" className="absolute inset-0" /></span>
        </span>
        {count != null && <span className={COUNT} data-verb="#count">{count}</span>}
        {count != null && <Toolbar.Separator data-verb="#count-rule" render={<Rule tone="graphite" />} />}
        {shown.flatMap((it, i) => [i === moreAt ? more : null, rule(it, i, shown), verb(it)])}
        {moreAt === shown.length ? more : null}
        <span ref={ghosts} aria-hidden className={LAYER} />
        {/* Every verb at its natural width, and the More key, unseen: what fits is known before paint. */}
        <span ref={measure} aria-hidden inert className={MEASURE}>
          {count != null && <span className={COUNT}>{count}</span>}
          {count != null && <Rule tone="graphite" />}
          {items.map((it, i) => (
            <React.Fragment key={it.label}>
              {it.destructive && !items[i - 1]?.destructive ? <Rule tone="graphite" /> : null}
              <Button cap={it.destructive ? 'strip-danger' : 'strip'} icon={it.icon} tabIndex={-1} data-fold={foldable.includes(it) ? '' : undefined}>
                {it.iconOnly ? null : word != null ? <span className={word}>{it.label}</span> : it.label}
              </Button>
            </React.Fragment>
          ))}
          <Button cap="strip" icon={MORE.icon} tabIndex={-1} data-more="" />
        </span>
      </Toolbar.Root>
    </TooltipProvider>
  );
}

/** The strip's room: its positioned parent when placed, else the nearest size container (a block), else the page. */
function roomOf(el: HTMLElement, placed: boolean): HTMLElement | null {
  if (placed) return el.offsetParent as HTMLElement | null;
  for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
    if (getComputedStyle(p).containerType !== 'normal') return p;
  }
  return document.documentElement;
}

/** How many foldable verbs fit in `room` (Infinity: all of them, no More key). */
function fitOf(m: HTMLElement, room: number, foldable: number) {
  const gap = parseFloat(getComputedStyle(m).columnGap) || 0;
  const more = m.querySelector<HTMLElement>(':scope > [data-more]')?.offsetWidth ?? 0;
  let w = m.offsetWidth - more - gap;
  if (w <= room) return Infinity;
  const widths = [...m.querySelectorAll<HTMLElement>(':scope > [data-fold]')].map((k) => k.offsetWidth);
  w += more + gap;
  let n = foldable;
  while (n > 0 && w > room) w -= widths[--n] + gap;
  return n;
}

/** Centred over the anchor, `margin` above it (below when there's no room), inside the parent's edges. */
function place(el: HTMLElement, a: ToolStripAnchor, parent: HTMLElement, margin: number): 'top' | 'bottom' {
  const w = el.offsetWidth, h = el.offsetHeight;
  const x = Math.min(Math.max(a.x + a.width / 2 - w / 2, margin), parent.clientWidth - w - margin);
  const above = a.y - margin - h;
  const below = a.y + a.height + margin;
  const side = above >= margin || below + h > parent.clientHeight - margin ? 'top' : 'bottom';
  el.style.left = `${Math.round(x)}px`;
  el.style.top = `${Math.round(side === 'top' ? Math.max(above, margin) : below)}px`;
  // Below the selection it comes down from it: the arrival's rise turns over.
  el.style.setProperty('--mu-toolstrip-enter-rise', side === 'bottom' ? `calc(-1 * ${getComputedStyle(parent).getPropertyValue('--mu-toolstrip-enter-rise')})` : '');
  return side;
}

/**
 * The morph from the last layout to this one, by FLIP on the settle spring, added to whatever is still running
 * (an interrupted morph carries on from where it is). The strip itself stays put: its parts travel from where the
 * old strip had them, in the new strip's space. The plate becomes two halves, each the whole plate under a fixed
 * clip on a whole pixel inside both spans (so they meet without a hairline), sliding from the old ends to the new.
 * Kept keys glide; leaving keys fade where they stood; new ones fade in once the plate nears them. When the old
 * strip and the new one don't overlap at all (the selection jumped), the strip glides by its centre instead.
 */
function morph(el: HTMLElement, prev: Snapshot, next: Snapshot, ghosts: HTMLElement | null, plate: HTMLElement | null) {
  const settle = springOf(el, 'settle');
  if (!settle.ms) return; // Reduce Motion: the new strip, at once
  const release = springOf(el, 'release');
  const slide = (k: Element, dx: number, dy: number) => (dx || dy
    ? k.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: settle.ms, easing: settle.easing, composite: 'add' })
    : null);
  // Where the old strip's left edge and top were, in the new strip's space.
  let [ox, oy] = [prev.x - next.x, prev.y - next.y];
  if (Math.min(ox + prev.w, next.w) - Math.max(ox, 0) < 2) {
    slide(el, ox + (prev.w - next.w) / 2, oy);
    [ox, oy] = [(next.w - prev.w) / 2, 0];
  }
  if (plate && (ox || oy || prev.w !== next.w)) {
    const [whole, start, end] = [...plate.children] as HTMLElement[];
    const lo = Math.ceil(Math.max(ox, 0)) + 1;
    const hi = Math.floor(Math.min(ox + prev.w, next.w)) - 1;
    const mid = Math.min(Math.max(Math.round(next.w / 2), lo), hi);
    start.style.clipPath = `inset(-100vmax ${next.w - mid}px -100vmax -100vmax)`;
    end.style.clipPath = `inset(-100vmax -100vmax -100vmax ${mid}px)`;
    const split = (on: boolean) => {
      whole.style.visibility = on ? 'hidden' : '';
      start.style.visibility = end.style.visibility = on ? 'visible' : '';
    };
    split(true);
    // Each half reaches past the clip for the whole travel (and a spring's overshoot), so the two never part.
    const halves = [
      { clip: start, edge: 'right', dx: ox, reach: mid - ox - next.w },
      { clip: end, edge: 'left', dx: ox + prev.w - next.w, reach: ox + prev.w - next.w - mid },
    ] as const;
    const travelling = () => halves.some((h) => h.clip.firstElementChild!.getAnimations().length);
    for (const { clip, edge, dx, reach } of halves) {
      const p = clip.firstElementChild as HTMLElement;
      const now = -parseFloat(p.style[edge] || '0');
      p.style[edge] = `${-Math.max(now, reach + SLACK, 0)}px`;
      slide(p, dx, oy);
    }
    // Back to the whole plate once both halves have arrived (a later morph keeps them split).
    window.setTimeout(function rest() {
      if (travelling()) return void window.setTimeout(rest, settle.ms / 4);
      for (const { clip, edge } of halves) (clip.firstElementChild as HTMLElement).style[edge] = '';
      split(false);
    }, settle.ms);
  }
  for (const [id, now] of next.keys) {
    const was = prev.keys.get(id);
    if (was?.el === now.el) slide(now.el, ox + was.x - now.x, oy);
    // New verbs wait a beat for the plate to reach them, then fade in.
    else now.el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: settle.ms, delay: release.ms / 2, easing: settle.easing, fill: 'backwards' });
  }
  for (const [id, was] of prev.keys) {
    const k = was.el;
    if (next.keys.get(id)?.el === k || k.isConnected || !ghosts) continue;
    // The key React let go of stays a moment where it stood (unreachable), and fades.
    k.getAnimations().forEach((a) => a.cancel());
    k.setAttribute('inert', '');
    k.style.position = 'absolute';
    k.style.left = `${ox + was.x}px`;
    k.style.top = `${oy + was.y}px`;
    ghosts.append(k);
    const gone = () => k.remove();
    k.animate([{ opacity: 1 }, { opacity: 0 }], { duration: release.ms || settle.ms, easing: release.easing, fill: 'forwards' }).finished.then(gone, gone);
  }
}
