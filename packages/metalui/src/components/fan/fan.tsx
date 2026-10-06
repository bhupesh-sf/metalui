'use client';

import * as React from 'react';
import { Toolbar as BaseToolbar } from '@base-ui/react/toolbar';
import { useIsoLayoutEffect } from '../../motion/layout-effect';
import { useReducedMotion } from '../../motion/reduced';
import { ChevronIcon } from '../../icons/components.generated';

/* ─────────────────────────────────────────────────────────
 * FAN: a compact control bar whose cells open in place
 *
 *   rest      a row of graphite caps: a label (what the bar is about, a word or a glyph), the
 *             current choice, and an options cap; nothing else is on screen
 *   picker    pressing the current choice unfolds every choice into a grid, one row per group of
 *             related choices, from behind the cap (above it, for a bar at the bottom of the
 *             screen; rows above and below, centred, elsewhere): each key grows out of the cap and
 *             travels to its cell on the part spring, nearest first, one beat per ring of
 *             distance; the current choice sits latched (sunk, LED) in its cell; choosing one
 *             folds the grid back into the cap, all together, and the choice takes the cap
 *   tray      pressing the options cap stretches it sideways into a capsule of more controls, on
 *             the part spring; the controls fade in as it opens; the chevron at its end, pointing
 *             the way the tray folds, folds it back
 *   one open  opening one cell folds any other; Escape or a press outside folds it and focus
 *             returns to the cell that opened it
 *   keys      Enter or Space opens (focus on the current choice); arrows move in two dimensions,
 *             down past the bottom row returns to the cap; Enter picks; Escape folds
 *   hover     caps brighten on settle (the icon-button recipe); a pressed cap sinks 1
 *   reduced   the grid and the tray appear and fold without travel (a crossfade)
 * Every option stays one press away and in view once opened: nothing hides in a menu.
 * ───────────────────────────────────────────────────────── */

type Open = { id: string; restore: () => void } | null;
const FanContext = React.createContext<{ open: Open; setOpen: (o: Open) => void } | null>(null);
const useFan = () => {
  const c = React.useContext(FanContext);
  if (!c) throw new Error('Fan cells go inside <Fan>');
  return c;
};

/* Styled with the theme's utilities: the icon-button tool cap for cells, the toolbar recipe for the tray. */
/* A graphite toolbar to what it holds (data-variant="graphite"): separators, picks and the plain ink read on the dark caps. */
const ROW = 'mu-fan mu-toolbar group/toolbar relative inline-flex items-end gap-toolbar-gap';
const CAP = 'mu-icon-trigger box-border inline-grid place-items-center flex-none p-0 border-0 cursor-pointer tap-highlight-none size-icon-button-tool-size rounded-icon-button-tool-radius text-icon-button-tool-ink recipe-icon-button-tool transition-icon-button-tool [&>svg]:size-icon-button-tool-glyph active:translate-y-icon-button-tool-press active:recipe-icon-button-tool-pressed focus-visible:focus-ring-flush';
/** The latched look of the icon-button tool: sunk, with its green LED. */
const LATCH = 'data-pressed:translate-y-icon-button-tool-press data-pressed:recipe-icon-button-tool-pressed data-pressed:after:absolute data-pressed:after:top-icon-button-led-inset data-pressed:after:right-icon-button-led-inset data-pressed:after:size-icon-button-led-size data-pressed:after:rounded-round data-pressed:after:recipe-status-led-live';
const GLYPH_LABEL = 'mu-fan-label box-border inline-grid place-items-center flex-none size-icon-button-tool-size rounded-icon-button-tool-radius recipe-icon-button-tool text-icon-button-tool-ink [&>svg]:size-icon-button-tool-glyph';
const LABEL = 'mu-fan-label box-border inline-flex items-center h-icon-button-tool-size px-toolbar-pad rounded-icon-button-tool-radius recipe-icon-button-tool type-toolbar-search text-icon-button-tool-ink whitespace-nowrap';
const TRAY = 'mu-fan-tray relative box-border inline-flex items-center h-icon-button-tool-size overflow-hidden rounded-icon-button-tool-radius recipe-icon-button-tool';
/** The part spring, from the theme (duration and curve). */
const SPRING = 'duration-part ease-part';

export interface FanProps {
  'aria-label': string;
  className?: string;
  children: React.ReactNode;
}

/** The bar. It keeps which cell is open (one at a time) and folds it on Escape or a press outside. */
function FanRoot({ className, children, ...props }: FanProps) {
  const [open, setOpenState] = React.useState<Open>(null);
  const root = React.useRef<HTMLDivElement>(null);
  const setOpen = React.useCallback((o: Open) => setOpenState(o), []);
  React.useEffect(() => {
    if (!open) return;
    const fold = () => { const o = open; setOpenState(null); o.restore(); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); fold(); } };
    const press = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) {
        setOpenState(null);
        // Pointerdown's default focus move runs after this listener; restore after release.
        window.setTimeout(open.restore, 100);
      }
    };
    window.addEventListener('keydown', key);
    window.addEventListener('pointerdown', press, true);
    return () => { window.removeEventListener('keydown', key); window.removeEventListener('pointerdown', press, true); };
  }, [open]);
  return (
    <FanContext.Provider value={{ open, setOpen }}>
      <div ref={root} role="toolbar" data-variant="graphite" aria-label={props['aria-label']} className={className ? `${ROW} ${className}` : ROW}>{children}</div>
    </FanContext.Provider>
  );
}

export interface FanLabelProps {
  /** What the bar is about right now: "Canvas", "Text", "3 selected". With `icon`, the name the glyph stands for ("Ink"): its tooltip and accessible name. */
  children: React.ReactNode;
  /** Say it with a glyph instead of a word (a palette while inking). */
  icon?: React.ReactNode;
}

/** What the bar is about right now: a word ("Canvas", "3 selected"), or a glyph named by its tooltip. */
function FanLabel({ children, icon }: FanLabelProps) {
  if (!icon) return <div className={LABEL}>{children}</div>;
  const name = typeof children === 'string' ? children : undefined;
  return <div role="img" aria-label={name} title={name} className={GLYPH_LABEL}>{icon}</div>;
}

export interface FanOption<V extends string> {
  value: V;
  label: string;
  icon: React.ReactNode;
  shortcut?: string;
  /** Related choices share a group and a row of the grid ("pointer", "freehand", "shapes"). */
  group?: string;
}

export interface FanPickerProps<V extends string> {
  /** The group's name: "Tool". */
  label: string;
  value: V;
  options: FanOption<V>[];
  onValueChange: (value: V) => void;
  /** up: the grid rises from the cap (a bar at the bottom). both: its rows open above and below, centred. */
  direction?: 'up' | 'both';
}

/** The grid's rows: one per group, in order; without groups, rows of ⌈√n⌉. */
function rowsOf<T extends { group?: string }>(options: T[]): T[][] {
  if (options.some((o) => o.group)) {
    return options.reduce<T[][]>((rows, o, k) => {
      if (k > 0 && o.group === options[k - 1].group) rows[rows.length - 1].push(o); else rows.push([o]);
      return rows;
    }, []);
  }
  const n = Math.max(1, Math.ceil(Math.sqrt(options.length)));
  return Array.from({ length: Math.ceil(options.length / n) }, (_, r) => options.slice(r * n, r * n + n));
}

/** The current choice; pressing it unfolds every choice into a grid from behind it. */
function FanPicker<V extends string>({ label, value, options, onValueChange, direction = 'up' }: FanPickerProps<V>) {
  const { open, setOpen } = useFan();
  const id = React.useId();
  const isOpen = open?.id === id;
  const cap = React.useRef<HTMLButtonElement>(null);
  const keys = React.useRef(new Map<V, HTMLButtonElement | null>());
  const [step, setStep] = React.useState(0);
  const current = options.find((o) => o.value === value) ?? options[0];
  const rows = rowsOf(options);

  // Each cell's place in cap steps: the cap's column is the grid's middle (left of middle for an
  // even width), and the rows sit above the cap (up) or split around it (both).
  const columns = Math.max(...rows.map((r) => r.length));
  const above = direction === 'up' ? rows.length : Math.ceil(rows.length / 2);
  const cells = rows.flatMap((row, r) => row.map((o, c) => ({
    o, r, c,
    x: c - Math.floor((columns - 1) / 2),
    y: r < above ? r - above : r - above + 1,
  })));
  // Staggered by distance from the cap: one beat per ring of equal distance, nearest first.
  const rings = [...new Set(cells.map((k) => Math.round(Math.hypot(k.x, k.y) * 100)))].sort((a, b) => a - b);
  const ring = (k: { x: number; y: number }) => rings.indexOf(Math.round(Math.hypot(k.x, k.y) * 100));

  // One step is a cap plus the bar's gap, measured as the grid opens so it follows the theme (and
  // never reads a size from before the styles arrived).
  const measure = () => {
    const el = cap.current; if (!el) return;
    const bar = el.closest('.mu-fan');
    const gap = bar ? parseFloat(getComputedStyle(bar).columnGap) || 0 : 0;
    setStep(el.offsetHeight + gap);
  };
  React.useEffect(() => { if (isOpen) keys.current.get(current.value)?.focus(); }, [isOpen, current.value]);

  const choose = (v: V) => { onValueChange(v); setOpen(null); cap.current?.focus(); };
  const toggle = () => { if (!isOpen) measure(); setOpen(isOpen ? null : { id, restore: () => cap.current?.focus() }); };
  // Arrows move in two dimensions, as the grid is drawn; past the row nearest the cap, back to the cap.
  const move = (e: React.KeyboardEvent, r: number, c: number) => {
    const d = ({ ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] } as Record<string, [number, number]>)[e.key];
    if (!d) return;
    e.preventDefault();
    const nr = r + d[0];
    if (nr === above && d[0] === 1 && direction === 'up') { cap.current?.focus(); return; }
    const row = rows[Math.max(0, Math.min(rows.length - 1, nr))];
    const nc = Math.max(0, Math.min(row.length - 1, c + d[1]));
    keys.current.get(row[nc].value)?.focus();
  };
  const still = useReducedMotion(cap);

  return (
    <div className="mu-fan-picker relative">
      <div role="listbox" aria-label={label} aria-hidden={!isOpen} className="absolute inset-0 pointer-events-none">
        {cells.map(({ o, r, c, x, y }) => {
          const chosen = o.value === current.value;
          const name = o.shortcut ? `${o.label} · ${o.shortcut}` : o.label;
          return (
            <button
              key={o.value}
              ref={(el) => { keys.current.set(o.value, el); }}
              type="button"
              role="option"
              aria-selected={chosen}
              aria-label={name}
              title={name}
              tabIndex={isOpen ? 0 : -1}
              data-pressed={chosen ? '' : undefined}
              className={`${CAP} ${LATCH} absolute inset-0 ${SPRING}`}
              style={{
                transform: isOpen ? `translate(${x * step}px, ${y * step}px)` : 'translate(0, 0) scale(.6)',
                opacity: isOpen ? 1 : 0,
                pointerEvents: isOpen ? 'auto' : 'none',
                transitionProperty: still ? 'opacity' : 'transform, opacity',
                transitionDelay: !still && isOpen ? `calc(${ring({ x, y })} * var(--mu-motion-fan-stagger))` : undefined,
              }}
              onClick={() => choose(o.value)}
              onKeyDown={(e) => move(e, r, c)}
            >
              {o.icon}
            </button>
          );
        })}
      </div>
      <button
        ref={cap}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`${label}: ${current.label}`}
        title={`${label}: ${current.label}`}
        className={`${CAP} relative`}
        onClick={toggle}
      >
        {current.icon}
      </button>
    </div>
  );
}

export interface FanTrayProps {
  /** The options' name: "Ink", "Actions". */
  label: string;
  /** The cap's glyph when folded. */
  icon: React.ReactNode;
  children: React.ReactNode;
}

/** An options cap that stretches sideways into a capsule of more controls; the chevron at its end folds it. */
function FanTray({ label, icon, children }: FanTrayProps) {
  const { open, setOpen } = useFan();
  const id = React.useId();
  const isOpen = open?.id === id;
  const cap = React.useRef<HTMLButtonElement>(null);
  const shell = React.useRef<HTMLDivElement>(null);
  const inner = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState<number | null>(null);

  useIsoLayoutEffect(() => {
    if (!isOpen) { setWidth(null); return; }
    setWidth(inner.current?.scrollWidth ?? null);
  }, [isOpen, children]);
  React.useEffect(() => {
    if (!isOpen) return;
    const first = inner.current?.querySelector<HTMLElement>('button, [tabindex="0"]');
    first?.focus();
  }, [isOpen]);

  const toggle = () => { setOpen(isOpen ? null : { id, restore: () => cap.current?.focus() }); };
  const fold = () => { setOpen(null); requestAnimationFrame(() => cap.current?.focus()); };
  const still = useReducedMotion(cap);

  return (
    <div
      ref={shell}
      className={`${isOpen ? TRAY : `${TRAY} w-icon-button-tool-size`} ${SPRING}`}
      style={{ width: isOpen && width ? width : undefined, transitionProperty: still ? 'none' : 'width' }}
    >
      <button
        ref={cap}
        type="button"
        aria-expanded={isOpen}
        aria-label={label}
        title={label}
        className={`${CAP} absolute left-0 top-0 ${SPRING}`}
        style={{ opacity: isOpen ? 0 : 1, pointerEvents: isOpen ? 'none' : 'auto', transitionProperty: 'opacity' }}
        tabIndex={isOpen ? -1 : 0}
        onClick={toggle}
      >
        {icon}
      </button>
      <BaseToolbar.Root
        ref={inner}
        aria-label={label}
        aria-hidden={!isOpen}
        className={`mu-fan-tray-inner inline-flex items-center gap-toolbar-gap px-toolbar-pad whitespace-nowrap ${SPRING}`}
        style={{ opacity: isOpen ? 1 : 0, visibility: isOpen ? 'visible' : 'hidden', transitionProperty: 'opacity' }}
      >
        {children}
        <BaseToolbar.Button aria-label={`Fold ${label}`} title="Fold" className={`${CAP} mu-fan-fold`} onClick={fold}>
          <ChevronIcon size={16} turn={90} />
        </BaseToolbar.Button>
      </BaseToolbar.Root>
    </div>
  );
}

// Bound, not assigned as statements: a bundler can drop an unused `X = Object.assign(...)`, never a bare `Fan.Label = ...`.
export const Fan = Object.assign(FanRoot, { Label: FanLabel, Picker: FanPicker, Tray: FanTray });
