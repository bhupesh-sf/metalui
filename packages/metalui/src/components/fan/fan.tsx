'use client';

import * as React from 'react';
import { Toolbar as BaseToolbar } from '@base-ui/react/toolbar';
import { useIsoLayoutEffect } from '../../motion/layout-effect';

/* ─────────────────────────────────────────────────────────
 * FAN: a compact control bar whose cells open in place
 *
 *   rest      a row of graphite caps: a label (what the bar is about), the current choice, and an
 *             options cap; nothing else is on screen
 *   picker    pressing the current choice fans its siblings out along one axis from behind it
 *             (up, for a bar at the bottom of the screen; both ways, centred on it, elsewhere),
 *             each on the part spring, staggered by a beat; choosing one folds the fan and the
 *             choice takes the cap
 *   tray      pressing the options cap stretches it sideways into a capsule of more controls, on
 *             the part spring; the controls fade in as it opens; ‹ at its end folds it back
 *   one open  opening one cell folds any other; Escape or a press outside folds it and focus
 *             returns to the cell that opened it
 *   keys      Enter or Space opens; arrows move along the fan; Enter picks; Escape folds
 *   hover     caps brighten on settle (the icon-button recipe); a pressed cap sinks 1
 *   reduced   the fan and the tray appear and fold without travel (a crossfade)
 * Every option stays one press away and in view once opened: nothing hides in a menu.
 * ───────────────────────────────────────────────────────── */

type Open = { id: string; restore: () => void } | null;
const FanContext = React.createContext<{ open: Open; setOpen: (o: Open) => void } | null>(null);
const useFan = () => {
  const c = React.useContext(FanContext);
  if (!c) throw new Error('Fan cells go inside <Fan>');
  return c;
};

const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Styled with the theme's utilities: the icon-button tool cap for cells, the toolbar recipe for the tray. */
const ROW = 'mu-fan relative inline-flex items-end gap-toolbar-gap';
const CAP = 'mu-icon-trigger box-border inline-grid place-items-center flex-none p-0 border-0 cursor-pointer tap-highlight-none size-icon-button-tool-size rounded-icon-button-tool-radius text-icon-button-tool-ink recipe-icon-button-tool transition-icon-button-tool [&>svg]:size-icon-button-tool-glyph active:translate-y-icon-button-tool-press active:recipe-icon-button-tool-pressed focus-visible:focus-ring-flush';
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
      <div ref={root} role="toolbar" aria-label={props['aria-label']} className={className ? `${ROW} ${className}` : ROW}>{children}</div>
    </FanContext.Provider>
  );
}

/** What the bar is about right now: "Canvas", "Text", "Ink", "3 selected". */
function FanLabel({ children }: { children: React.ReactNode }) {
  return <div className={LABEL}>{children}</div>;
}

export interface FanOption<V extends string> { value: V; label: string; icon: React.ReactNode; shortcut?: string }

export interface FanPickerProps<V extends string> {
  /** The group's name: "Tool". */
  label: string;
  value: V;
  options: FanOption<V>[];
  onValueChange: (value: V) => void;
  /** up: the fan rises from the cap (a bar at the bottom). both: it opens above and below, centred. */
  direction?: 'up' | 'both';
}

/** The current choice; pressing it fans the other choices out from behind it. */
function FanPicker<V extends string>({ label, value, options, onValueChange, direction = 'up' }: FanPickerProps<V>) {
  const { open, setOpen } = useFan();
  const id = React.useId();
  const isOpen = open?.id === id;
  const cap = React.useRef<HTMLButtonElement>(null);
  const items = React.useRef<(HTMLButtonElement | null)[]>([]);
  const [step, setStep] = React.useState(0);
  const current = options.find((o) => o.value === value) ?? options[0];
  const others = options.filter((o) => o.value !== current.value);

  // One slot is a cap plus the bar's gap, measured as the fan opens so it follows the theme (and
  // never reads a size from before the styles arrived).
  const measure = () => {
    const el = cap.current; if (!el) return;
    const bar = el.closest('.mu-fan');
    const gap = bar ? parseFloat(getComputedStyle(bar).columnGap) || 0 : 0;
    setStep(el.offsetHeight + gap);
  };
  React.useEffect(() => { if (isOpen) items.current[0]?.focus(); }, [isOpen]);

  const slot = (k: number) => (direction === 'up' ? -(k + 1) : (k % 2 === 0 ? -1 : 1) * (Math.floor(k / 2) + 1));
  const choose = (v: V) => { onValueChange(v); setOpen(null); cap.current?.focus(); };
  const toggle = () => { if (!isOpen) measure(); setOpen(isOpen ? null : { id, restore: () => cap.current?.focus() }); };
  // Up moves away from the cap along the fan, down back toward it (list order in both directions).
  const move = (e: React.KeyboardEvent, k: number) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    const next = e.key === 'ArrowUp' ? k + 1 : k - 1;
    if (next < 0) { cap.current?.focus(); return; }
    items.current[Math.min(others.length - 1, next)]?.focus();
  };
  const still = reduced();

  return (
    <div className="mu-fan-picker relative">
      <div role="listbox" aria-label={label} aria-hidden={!isOpen} className="absolute inset-0 pointer-events-none">
        {others.map((o, k) => {
          const y = isOpen ? slot(k) * step : 0;
          return (
            <button
              key={o.value}
              ref={(el) => { items.current[k] = el; }}
              type="button"
              role="option"
              aria-selected={false}
              aria-label={o.shortcut ? `${o.label} · ${o.shortcut}` : o.label}
              title={o.shortcut ? `${o.label} · ${o.shortcut}` : o.label}
              tabIndex={isOpen ? 0 : -1}
              className={`${CAP} absolute inset-0 ${SPRING}`}
              style={{
                transform: `translateY(${y}px)`,
                opacity: isOpen ? 1 : 0,
                pointerEvents: isOpen ? 'auto' : 'none',
                transitionProperty: still ? 'opacity' : 'transform, opacity',
                transitionDelay: !still && isOpen ? `calc(${k} * var(--mu-motion-fan-stagger))` : undefined,
              }}
              onClick={() => choose(o.value)}
              onKeyDown={(e) => move(e, k)}
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

/** An options cap that stretches sideways into a capsule of more controls; ‹ folds it. */
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
  const still = reduced();

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
          <span aria-hidden className="type-toolbar-search">‹</span>
        </BaseToolbar.Button>
      </BaseToolbar.Root>
    </div>
  );
}

// Bound, not assigned as statements: a bundler can drop an unused `X = Object.assign(...)`, never a bare `Fan.Label = ...`.
export const Fan = Object.assign(FanRoot, { Label: FanLabel, Picker: FanPicker, Tray: FanTray });
