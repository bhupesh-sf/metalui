'use client';

import * as React from 'react';
import { Toast } from '@base-ui/react/toast';
import { CheckIcon, CloseIcon, SyncErrorIcon } from '../../icons/components.generated';
import { Kbd } from '../kbd/kbd';
import { useIsoLayoutEffect } from '../../motion/layout-effect';

/* ─────────────────────────────────────────────────────────
 * TOAST (object sheet) on Base UI Toast: a deck in depth, not a column
 *
 * rest      the newest toast in front; each older one a step back behind it:
 *           scale .95 per step, peeking 8 past the card in front on the side away
 *           from the screen edge (a bottom deck peeks upward), 20% dimmer, its
 *           words hidden, and as wide as the front card (fanned out, each its own
 *           width); 3 drawn, the rest counted (+2) on a tab in the back card's edge
 * marks     success leads with the set's check in green, an error with sync-error in red
 * arrive
 *     0ms   the new toast rises 8 from below, from .97 and opacity 0, into the
 *           front on the object spring (0.92 s); in the same frame every card
 *           behind moves back one step on the same spring; the fade is on settle
 * fan out   pointer on the deck, or Tab / F6 into it: the cards spread into a
 *           readable column, 8 apart, on the surface spring (0.5 s); every
 *           timer pauses (Base UI)
 * fold      the pointer or focus leaves: back into the deck on the surface spring;
 *           the timers resume
 * swipe     the card follows the pointer one to one (down or right); on release
 *           past 40 it leaves the way it was thrown on the release spring;
 *           short of it, it springs home; the next card comes forward
 * close     its close key, or Esc on the focused toast: it leaves on release,
 *           sinking 8; the next card comes forward on the object spring
 * repeat    the same result again adds no card: the front card presses to .96
 *           and springs back on the part spring, and counts (×2, ×3 …); its
 *           timer starts over
 * time out  undoable 5 s, plain 2.6 s, an error never
 * undo      its Undo cap, or ⌘Z anywhere but a text field: the newest undoable result is undone once
 *           and its card leaves on release
 * Only the front card is new, so only it is announced (the polite region).
 * Reduce Motion: no travel or scale; cards cross-fade into place (settle),
 * the press is only the count.
 * ───────────────────────────────────────────────────────── */

export type ToastTone = 'default' | 'success' | 'error';

export interface ToastOptions {
  /** What happened, as the person would say it: "Moved 3 blocks", "Pinned as a live region". */
  title: string;
  /** A short detail after a middle dot: "it updates as you write". */
  sub?: string;
  /** Undo the action. Adds the Undo cap and keeps the toast 5 s. */
  undo?: () => void;
  /** success carries its check; error stays until resolved. */
  tone?: ToastTone;
  /** Override how long it stays, in ms (0: until dismissed). */
  timeout?: number;
}

/** What a toast carries besides its words: how many times it has been said in a row, and its undo. */
interface ToastData { count: number; undo?: () => void }

const cssValue = (name: string) => (typeof window === 'undefined' ? '' : getComputedStyle(document.documentElement).getPropertyValue(name).trim());
const ms = (name: string, fallback: number) => {
  const v = cssValue(name);
  const n = parseFloat(v);
  if (!Number.isFinite(n)) return fallback;
  return v.endsWith('ms') ? n : v.endsWith('s') ? n * 1000 : n;
};
const count = (name: string, fallback: number) => Math.max(1, Math.round(parseFloat(cssValue(name))) || fallback);

/** Shows toasts. Call show() from anywhere under a ToastProvider. */
export function useToast() {
  const manager = Toast.useToastManager();
  const toasts = React.useRef(manager.toasts);
  toasts.current = manager.toasts;
  return React.useMemo(() => ({
    show({ title, sub, undo, tone = 'default', timeout }: ToastOptions) {
      // The same result again merges into the front card: Base UI updates a toast added with its id in place
      // and starts its timer over.
      const front = toasts.current.find((t) => t.transitionStatus !== 'ending');
      const repeat = front && front.title === title && (front.description ?? undefined) === sub && front.type === tone;
      const times = repeat ? ((front.data as ToastData | undefined)?.count ?? 1) + 1 : 1;
      // Undo runs once, from the cap or ⌘Z, and takes its toast with it.
      let id = '';
      const run = undo && (() => { manager.close(id); undo(); });
      id = manager.add<ToastData>({
        id: repeat ? front.id : undefined,
        title,
        description: sub,
        type: tone,
        timeout: timeout ?? (tone === 'error' ? 0 : undo ? ms('--mu-toast-undo-ms', 5000) : ms('--mu-toast-plain-ms', 2600)),
        actionProps: run ? { onClick: run } : undefined,
        data: { count: times, undo: run },
      });
      return id;
    },
    dismiss: (id: string) => manager.close(id),
  }), [manager]);
}

/* Styled with the theme's utilities (the toast recipe): a glass pill in the colorway; DECK stacks the pills in
 * depth, fans them out, follows a swipe, and moves them in and out; the Undo cap presses by the material's travel. */
const VIEWPORT = 'mu-toast-viewport fixed inset-x-0 bottom-toast-bottom z-toast-z h-0 outline-none toast-deck-viewport';
const TOAST = 'mu-toast group/toast flex items-center gap-toast-gap min-h-toast-height pl-toast-pad-left pr-toast-pad-right not-has-[button]:pr-toast-pad-left rounded-pill whitespace-nowrap type-toast text-toast-ink recipe-toast backdrop-toast-blur reduce-transparency:opaque-frost';
const DECK = 'toast-deck transition-toast toast-bump outline-none focus-visible:toast-undo-focus touch-none select-none';
const CONTENT = 'mu-toast-content toast-content';
const TEXT = 'mu-toast-text inline-flex items-center gap-toast-text-gap';
const SUB = 'mu-toast-sub text-toast-sub-ink';
const COUNT = 'mu-toast-count text-toast-sub-ink tabular-nums';
const CHECK = 'mu-toast-check inline-grid text-success';
const FAILED = 'mu-toast-error inline-grid text-red';
const UNDO = 'mu-toast-undo inline-flex items-center gap-toast-undo-gap h-toast-undo-height pl-toast-undo-pad-left pr-toast-undo-pad-right border-0 rounded-pill type-toast-undo text-inherit recipe-toast-undo cursor-pointer transition-transform ease-release duration-release active:translate-y-press active:duration-toast-undo-press focus-visible:toast-undo-focus';
const CLOSE = 'mu-toast-close inline-grid place-items-center size-toast-close-size p-0 border-0 rounded-pill bg-transparent text-toast-close-ink cursor-pointer hover:recipe-toast-undo hover:text-toast-ink transition-transform ease-release duration-release active:translate-y-press active:duration-toast-undo-press focus-visible:toast-undo-focus';
const MORE = 'mu-toast-more toast-more type-readout text-toast-sub-ink recipe-toast';
const KEY = 'text-toast-kbd-ink recipe-toast-kbd';

/** The toast's part classes, for stills of it outside the toast region (docs, previews). */
export const toastParts = { TOAST, TEXT, SUB, UNDO, KEY } as const;

/** The viewport, told when the deck folds: folding plays on the surface spring, like fanning out. */
function DeckViewport({ expanded, ...props }: React.ComponentPropsWithRef<'div'> & { expanded: boolean }) {
  const [folding, setFolding] = React.useState(false);
  const was = React.useRef(expanded);
  // A layout effect, so data-folding lands in the same style change as the fold itself.
  useIsoLayoutEffect(() => {
    const fold = was.current && !expanded;
    was.current = expanded;
    if (!fold) return setFolding(false);
    setFolding(true);
    const t = window.setTimeout(() => setFolding(false), ms('--mu-spring-surface-d', 500));
    return () => window.clearTimeout(t);
  }, [expanded]);
  return <div {...props} data-folding={folding ? '' : undefined} />;
}

function ToastList({ visible }: { visible: number }) {
  const { toasts } = Toast.useToastManager();
  const live = toasts.filter((t) => t.transitionStatus !== 'ending');
  const newest = React.useRef(live);
  newest.current = live;

  // ⌘Z (Ctrl+Z) undoes the newest undoable result, as its cap does. A field keeps its own undo, and a host
  // that owns ⌘Z (an editor's history) takes it first by calling preventDefault.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.key.toLowerCase() !== 'z' || !(e.metaKey || e.ctrlKey) || e.shiftKey || e.altKey) return;
      if (e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return;
      const undo = newest.current.map((t) => (t.data as ToastData | undefined)?.undo).find(Boolean);
      if (!undo) return;
      e.preventDefault();
      undo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const more = Math.max(0, live.length - visible);
  const back = more > 0 ? live[visible - 1]?.id : undefined;
  // The cards behind take the front card's width (its layout width, not the drawn one, so its arrival
  // scale doesn't narrow them).
  const front = live[0]?.id;
  const [frontWidth, setFrontWidth] = React.useState<number>();
  const watching = React.useRef<ResizeObserver | null>(null);
  const measureFront = React.useCallback((el: HTMLElement | null) => {
    watching.current?.disconnect();
    watching.current = null;
    if (!el || typeof ResizeObserver === 'undefined') return;
    watching.current = new ResizeObserver(() => { if (el.offsetWidth) setFrontWidth(el.offsetWidth); });
    watching.current.observe(el);
  }, []);
  return (
    <Toast.Portal>
      <Toast.Viewport className={VIEWPORT} style={frontWidth ? ({ '--mu-toast-front-w': `${frontWidth}px` } as React.CSSProperties) : undefined} render={(props, state) => <DeckViewport {...props} expanded={state.expanded} />}>
        {toasts.map((t) => {
          const times = (t.data as ToastData | undefined)?.count ?? 1;
          return (
            <Toast.Root key={t.id} ref={t.id === front ? measureFront : undefined} toast={t} className={`${TOAST} ${DECK}`} data-type={t.type} data-back={t.id !== front ? '' : undefined} data-bump={times > 1 ? (times % 2 ? 'a' : 'b') : undefined}>
              <Toast.Content className={CONTENT}>
                <span className={TEXT}>
                  {t.type === 'success' && <span aria-hidden className={CHECK}><CheckIcon size={14} animate={false} /></span>}
                  {t.type === 'error' && <span aria-hidden className={FAILED}><SyncErrorIcon size={14} animate={false} /></span>}
                  <Toast.Title render={<span />}>{t.title}</Toast.Title>
                  {t.description && <Toast.Description render={<span className={SUB} />}>· {t.description}</Toast.Description>}
                  {times > 1 && <span className={COUNT}>×{times}</span>}
                </span>
                {t.actionProps && (
                  <Toast.Action className={UNDO} aria-keyshortcuts="Meta+Z">
                    Undo <Kbd surface="plain" className={KEY}>⌘Z</Kbd>
                  </Toast.Action>
                )}
                <Toast.Close className={CLOSE} aria-label="Dismiss">
                  <CloseIcon size={14} animate={false} />
                </Toast.Close>
              </Toast.Content>
              {t.id === back && <span aria-hidden className={MORE}>+{more}</span>}
            </Toast.Root>
          );
        })}
      </Toast.Viewport>
    </Toast.Portal>
  );
}

/** Put once near the root: the toast deck at the bottom centre, newest in front. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  // How many cards the deck draws is the recipe's; Base UI marks the rest limited (inert, not drawn).
  const [visible] = React.useState(() => count('--mu-r-toast-deck-visible', 3));
  return (
    <Toast.Provider limit={visible}>
      {children}
      <ToastList visible={visible} />
    </Toast.Provider>
  );
}
