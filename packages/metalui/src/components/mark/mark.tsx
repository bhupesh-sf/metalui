'use client';

import * as React from 'react';
import { ClockIcon } from '../../icons/components.generated';
import { motionReduced } from '../../motion/reduced';

/* ─────────────────────────────────────────────────────────
 * CUE FAMILY: one grammar of kinds
 *
 *   time      date, duration   an engraved groove under the words, the clock glyph before them
 *   money     amount           a quiet hairline, tabular figures, the coin glyph (the host's: CoinIcon)
 *   body      measurement      a soft green line, the body's glyph (the host's: moon, steps)
 *   colour    hex              a 3 pt line in the colour, the live swatch as its glyph
 *   tag       tag              a luggage tag: a raised paper tab in the tag's own hue (a stable hash of
 *                              its name to the palette), its point and punched hole on the left, the
 *                              hash a quiet mark. One look everywhere; a derived tag is an inferred tag.
 *   person    person           the person's avatar (the host's) before their name, no line
 *   link      MarkUrl          the host pill
 *   match     match            a search's matched words (result rows only)
 *
 * The words never move: the line and the tag's paper are drawn behind them (::before), the words
 * keep their advance (width delta 0.00 pt). The glyph is the one thing with an advance, at full ink
 * before the words; raw keeps its slot, so toggling raw ↔ cued fades the glyph and moves nothing.
 *
 * Recognition (fresh: the host sets it once the caret has left the words; never while inside them)
 *     0ms   the line draws in from the left (settle spring); a tag's paper rises (object spring)
 *    83ms   the glyph pops in beside the words with a small overshoot (object spring); a swatch blooms
 *     0ms   money: the figures turn one step on the drum (the drum's spring and step)
 *     0ms   date: the resolved day rises as the chip, holds, and goes (chip-hold)
 *   +1 rAF  the glyph's own act, once: the clock passes an hour, a life glyph plays its hover once
 * Inferred: the line dashes and the words step to ink2. Confirmed (inferred → false): a small press
 *   (stamp) and one sparkle. Nothing loops; Reduce Motion: everything is there at once, no act.
 * ───────────────────────────────────────────────────────── */

export type MarkKind = 'date' | 'duration' | 'amount' | 'measurement' | 'tag' | 'derived-tag' | 'hex' | 'person' | 'match';

export interface MarkProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'color'> {
  kind: MarkKind;
  /** The resolved value, shown on hover in the chip: "TUE 30 SEP · 16:00", "1 H 30 · 90 MIN". */
  resolved?: string;
  /** For hex: the colour the text names. The line and the swatch take it. */
  color?: string;
  /** The glyph before the words, at full ink. Default: the kind's own (time: the clock; hex: the swatch).
   *  Pass a Life*Icon or an Avatar for money, body and person; `false` for none. */
  glyph?: React.ReactNode;
  /** What the glyph stands for, first in the chip: "Sleep", "A meal · breakfast?". Default: the kind's name. */
  label?: string;
  /** Just recognised: plays the moment of recognition once. Set it when the caret has left the words. */
  fresh?: boolean;
  /** Read by the model, not confirmed: a dashed line (a dashed tag), ink2. Turning it false stamps it. */
  inferred?: boolean;
  /** Raw text: the drawing and the glyph fade out; every word and the glyph's slot stay where they are. */
  raw?: boolean;
  /** @deprecated The swatch is the hex glyph now; `swatch={false}` is `glyph={false}`. */
  swatch?: boolean;
}

const LABELS: Partial<Record<MarkKind, string>> = { date: 'Date', duration: 'Duration', amount: 'Amount', measurement: 'Measure', hex: 'Colour', person: 'Person' };

/** The tag palette's size (recipe mark: tag.hue-0 … tag.hue-5). */
const TAG_HUES = 6;

/** A tag's place in the palette, stable for its name (case and hash ignored): the same tag is the same colour everywhere. */
export function markTagHue(tag: string) {
  let h = 0;
  for (const c of tag.replace(/^#/, '').toLowerCase()) h = (h * 31 + c.charCodeAt(0)) % 9973;
  return h % TAG_HUES;
}

const textOf = (node: React.ReactNode): string => (typeof node === 'string' || typeof node === 'number' ? String(node) : Array.isArray(node) ? node.map(textOf).join('') : '');

function readMs(el: Element, name: string) {
  const raw = getComputedStyle(el).getPropertyValue(name).trim();
  const n = parseFloat(raw);
  return raw.endsWith('ms') ? n : n * 1000;
}

/** Plays a life glyph's own hover once in `slot` when `fresh` turns on (the cup steams once, the moon tilts). */
function useLifeAct(slot: React.RefObject<HTMLElement | null>, fresh: boolean | undefined) {
  React.useEffect(() => {
    const el = slot.current;
    const svg = el?.querySelector('.mu-life');
    if (!fresh || !el || !svg || motionReduced(el)) return;
    el.setAttribute('data-acting', '');
    svg.setAttribute('data-hover', '');
    const done = () => { el.removeAttribute('data-acting'); svg.removeAttribute('data-hover'); };
    const timer = window.setTimeout(done, readMs(el, '--mu-r-mark-motion-act'));
    return () => { clearTimeout(timer); done(); };
  }, [slot, fresh]);
}

/** True from the moment `inferred` turns false (a confirmation), for the stamp and the sparkle. */
function useStamp(inferred: boolean | undefined) {
  const was = React.useRef(inferred);
  const [stamped, setStamped] = React.useState(false);
  React.useEffect(() => {
    if (was.current && !inferred) setStamped(true);
    if (inferred) setStamped(false);
    was.current = inferred;
  }, [inferred]);
  return stamped;
}

// Whole class lists, so the theme's scanner sees every utility name.
const CUE = 'mu-cue mark-cue mark-chip';
const LIFE = 'mu-cue-life mark-life';
const INFERRED = 'mu-cue mu-cue-inferred mark-inferred mark-chip';

function Sparkle() {
  return <i aria-hidden className="mu-cue-sparkle mark-sparkle" />;
}

/** An in-flow cue on recognised text. The words keep their exact advance; the glyph sits before them. */
export const Mark = React.forwardRef<HTMLSpanElement, MarkProps>(function Mark(
  { kind, resolved, color, glyph, label, fresh, inferred, raw, swatch, className, style, children, ...props },
  ref,
) {
  const slot = React.useRef<HTMLSpanElement>(null);
  const tag = kind === 'tag' || kind === 'derived-tag';
  const unconfirmed = inferred ?? kind === 'derived-tag';
  const stamped = useStamp(unconfirmed);
  useLifeAct(slot, fresh);

  const own =
    glyph !== undefined ? glyph
    : kind === 'date' || kind === 'duration' ? <ClockIcon size={14} act={fresh || undefined} />
    : kind === 'hex' && swatch !== false ? <i className="mu-cue-swatch mark-swatch" />
    : null;
  const named = own ? label ?? LABELS[kind] : label;
  const text = textOf(children);
  const words = tag && typeof children === 'string' && children.startsWith('#') ? <><span className="mu-cue-hash">#</span>{children.slice(1)}</> : children;
  const vars = {
    ...(color ? { '--mu-cue-hex': color } : {}),
    ...(tag ? { '--mu-cue-tag-h': `var(--mu-r-mark-tag-hue-${markTagHue(text)})` } : {}),
    ...style,
  } as React.CSSProperties;

  return (
    <span
      ref={ref}
      data-kind={kind}
      data-chip={resolved}
      data-label={named || undefined}
      data-fresh={fresh ? '' : undefined}
      data-inferred={unconfirmed ? '' : undefined}
      data-stamped={stamped ? '' : undefined}
      data-raw={raw ? '' : undefined}
      className={[CUE, kind === 'match' && 'mark-match', className].filter(Boolean).join(' ')}
      style={vars}
      {...props}
    >
      {own && <span ref={slot} aria-hidden className="mu-cue-glyph mu-icon-trigger">{own}</span>}
      <span className="mu-cue-words">{words}</span>
      {stamped && !raw && <Sparkle />}
    </span>
  );
});

export interface MarkUrlProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  /** The host the pill shows at rest: "figma.com". */
  host: string;
  /** The glyph before the host, at 11: pass the set's link glyph, e.g. <LinkIcon size={11} />. */
  glyph?: React.ReactNode;
}

/** A URL at rest: a short host pill. While writing, show the raw URL as plain text instead. */
export const MarkUrl = React.forwardRef<HTMLAnchorElement, MarkUrlProps>(function MarkUrl({ host, glyph, className, ...props }, ref) {
  return (
    <a ref={ref} target="_blank" rel="noopener noreferrer" className={className ? `mu-cue-url type-ui mark-url ${className}` : 'mu-cue-url type-ui mark-url'} {...props}>
      {glyph}
      {host}
    </a>
  );
});

export interface MarkInferredProps extends React.HTMLAttributes<HTMLElement> {
  /** The value and where it came from, on hover: "TUE 30 SEP · 0.82". */
  resolved?: string;
  /** Confirmed by the person: solid. Turning true stamps it with a small press and one sparkle. */
  confirmed?: boolean;
  /** Makes the pill a button that confirms it (the host also confirms on Tab). */
  onConfirm?: () => void;
}

/** A value the recognizer read that is not in the text (a date, a measurement): a dashed pill after the
 *  words, a suggestion until the person confirms it. */
export const MarkInferred = React.forwardRef<HTMLElement, MarkInferredProps>(function MarkInferred({ resolved, confirmed, onConfirm, className, children, ...props }, ref) {
  const stamped = useStamp(!confirmed);
  const own = className ? `${INFERRED} ${className}` : INFERRED;
  const shared = { 'data-chip': resolved, 'data-confirmed': confirmed ? '' : undefined, 'data-stamped': stamped ? '' : undefined, className: own };
  const body = <>{children}{stamped && <Sparkle />}</>;
  return onConfirm && !confirmed ? (
    <button ref={ref as React.Ref<HTMLButtonElement>} type="button" onClick={onConfirm} aria-label={`Confirm ${textOf(children)}${resolved ? `, ${resolved}` : ''}`} {...shared} {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}>
      {body}
    </button>
  ) : (
    <span ref={ref as React.Ref<HTMLSpanElement>} {...shared} {...props}>
      {body}
    </span>
  );
});

/** Urgency: a 5 pt amber LED in the margin of an open task that is due soon. */
export function MarkUrgency({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span role="img" aria-label="Due soon" className={className ? `mu-cue-urgency mark-urgency ${className}` : 'mu-cue-urgency mark-urgency'} {...props} />;
}

export interface MarkLifeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** The glyph at 16, e.g. <LifeCoffeeIcon size={16} /> from @unlocalhosted/metalui/icons/life. */
  children: React.ReactNode;
  /** What the glyph says about the whole line, in the chip on hover: "A meal · breakfast?". */
  label?: string;
  /** Just recognised: the glyph plays its own act once (the cup steams once). */
  fresh?: boolean;
  /** Raw text: the dot and the glyph fade out where they are. */
  raw?: boolean;
}

/** The life glyph trailing a block: the kind of the whole line. A middle dot, then the glyph; its label on
 *  hover. Display only: never while writing. */
export function MarkLife({ children, label, fresh, raw, className, ...props }: MarkLifeProps) {
  const slot = React.useRef<HTMLSpanElement>(null);
  useLifeAct(slot, fresh);
  return (
    <span className={[LIFE, label && 'relative mark-chip', className].filter(Boolean).join(' ')} data-label={raw ? undefined : label} data-raw={raw ? '' : undefined} {...props}>
      <span aria-hidden className="mu-cue-md">·</span>
      <span ref={slot} className="mu-cue-lg" role={label ? 'img' : undefined} aria-label={label}>{children}</span>
    </span>
  );
}

/** Earlier names (kept for existing hosts). */
export { Mark as Cue, MarkUrl as CueUrl, MarkInferred as CueInferred, MarkUrgency as CueUrgency, MarkLife as CueLife };
export type { MarkKind as CueKind, MarkProps as CueProps, MarkUrlProps as CueUrlProps, MarkInferredProps as CueInferredProps, MarkLifeProps as CueLifeProps };
