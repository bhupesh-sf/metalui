'use client';

import * as React from 'react';
import { Field as BaseField } from '@base-ui/react/field';
import { Well } from '../well/well';
import { Rule } from '../rule/rule';
import { Button } from '../button/button';
import { IconButton } from '../icon-button/icon-button';
import { UndoIcon, RedoIcon, TextIcon, PenIcon, EraserIcon } from '../../icons/components.generated';

/* ─────────────────────────────────────────────────────────
 * SIGNATURE PAD, a form field that captures a signature (the value posts on Base UI Field)
 *
 *   paper     the field's well, as wide as its container (regular 160, compact 88 for initials), an
 *             engraved baseline (the rule's groove) across its lower part, "Sign here" engraved under it
 *   drawing   the line is raw and exactly under the pen; its width follows the pen: pressure from a
 *             stylus, speed from a mouse or finger (`sizing`), between minWidth and maxWidth, tapered
 *   settle    on lift the levelled stroke cross-fades in over the raw one on the settle spring
 *   inked     the hint fades; Clear and Undo wake
 *   typed     "Type instead": an input on the baseline in the typed font; the keyboard and screen-reader
 *             path. Each mode keeps its own content; the value is the mode that shows
 *   history   Undo / Redo (keys, and ⌘Z / ⇧⌘Z, Ctrl+Z / Ctrl+Y in the pad); Clear is one step of it
 *   palm      once a pen has touched the pad, touches don't ink until it is cleared; one pointer at a time
 *   required  empty on submit: the field's error, and focus goes to "Type instead"
 *   read-only the mark on the paper, no keys, no hint (proof of delivery)
 *   disabled  40 %, no ink, keys off
 * Reduce Motion: the settle and the hint swap at once.
 * The form posts SVG markup (`name`); onValueChange gives the strokes or the typed name.
 * ───────────────────────────────────────────────────────── */

/** One point of a drawn stroke in the pad's box: x, y and the ink's width there. */
export type SignaturePoint = [x: number, y: number, width: number];

export type Signature =
  | { kind: 'drawn'; strokes: SignaturePoint[][]; width: number; height: number }
  /** Typed: the name, set on the baseline (x, y) in `font` (a CSS font shorthand). */
  | { kind: 'typed'; name: string; width: number; height: number; x: number; y: number; font: string };

export type SignatureMode = 'draw' | 'type';
export type SignatureSizing = 'auto' | 'pressure' | 'velocity';
export type SignaturePadSize = 'regular' | 'compact';

export interface SignaturePadProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange' | 'children'> {
  /** A signature given before (a saved one, or proof of delivery with `readOnly`). Remount with `key` to reset. */
  defaultValue?: Signature | null;
  /** Every change: a stroke, an undo, a clear, a typed letter, a mode switch. null when empty. */
  onValueChange?: (value: Signature | null) => void;
  mode?: SignatureMode;
  defaultMode?: SignatureMode;
  onModeChange?: (mode: SignatureMode) => void;
  /** What sets the ink's width: auto (pressure from a pen, speed otherwise), pressure, or velocity. */
  sizing?: SignatureSizing;
  /** The thinnest and widest ink, in px. Default: the recipe's (1.2 and 3.6). */
  minWidth?: number;
  maxWidth?: number;
  /** Posts the signature as SVG markup with a form. */
  name?: string;
  required?: boolean;
  disabled?: boolean;
  /** Shows the signature; nothing to draw or press. */
  readOnly?: boolean;
  /** regular (160) for a signature, compact (88) for initials. */
  size?: SignaturePadSize;
  /** The words under the baseline. Default "Sign here". */
  hint?: string;
  /** What the pad signs, said with its state ("Signature, empty"). Default "Signature". */
  'aria-label'?: string;
}

const ROOT = 'mu-signature-pad group/signature grid gap-signature-pad-gap min-w-0';
const PAPER: Record<SignaturePadSize, string> = {
  regular: 'h-signature-pad-regular-height',
  compact: 'h-signature-pad-compact-height',
};
const PAPER_BASE = 'mu-signature-paper overflow-hidden rounded-signature-pad-radius text-ink group-has-[input[data-invalid]]/signature:invalid-ring';
const LINE: Record<SignaturePadSize, string> = {
  regular: 'left-signature-pad-regular-pad right-signature-pad-regular-pad bottom-signature-pad-regular-baseline',
  compact: 'left-signature-pad-compact-pad right-signature-pad-compact-pad bottom-signature-pad-compact-baseline',
};
const LINE_BASE = 'mu-signature-baseline absolute';
const HINT_BASE = 'mu-signature-hint absolute type-label engraved pointer-events-none select-none signature-hint mt-signature-pad-hint-gap';
const HINT: Record<SignaturePadSize, string> = {
  regular: 'left-signature-pad-regular-pad signature-hint-regular',
  compact: 'left-signature-pad-compact-pad signature-hint-compact',
};
const INK = 'mu-signature-ink absolute inset-0 size-full touch-none';
const DRAWABLE = 'cursor-crosshair';
// The em box sits on the baseline (the recipe's typed utilities): its bottom is ~0.2em under the text's baseline.
const TYPED: Record<SignaturePadSize, string> = {
  regular: 'left-signature-pad-regular-pad right-signature-pad-regular-pad signature-typed-regular',
  compact: 'left-signature-pad-compact-pad right-signature-pad-compact-pad signature-typed-compact',
};
const TYPED_BASE = 'mu-signature-typed absolute m-0 p-0 border-0 outline-none bg-transparent type-signature-pad-typed text-ink caret-ink placeholder:text-ink3 disabled:cursor-default';
const KEYS = 'mu-signature-keys flex items-center gap-signature-pad-keys-gap';
const MODE = 'mu-signature-mode';
const HIDDEN = 'sr-only';

const cx = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join(' ');
const round = (n: number) => Math.round(n * 10) / 10;
/** The recipe's export ink and paper (dark ink on paper, whatever the colorway on screen). */
const exportColor = (k: 'ink' | 'paper', fallback: string) =>
  (typeof document === 'undefined' ? '' : getComputedStyle(document.documentElement).getPropertyValue(`--mu-r-signature-pad-export-${k}`).trim()) || fallback;
const TAPER = 10;

/* ── Ink ─────────────────────────────────────────────── */

/** A stroke's outline: a filled shape around its centre line, as wide as each point says, tapered at both ends, curved through midpoints. */
export function strokeOutline(pts: SignaturePoint[]): string {
  const [x0, y0, w0] = pts[0] ?? [0, 0, 0];
  const lens = [0];
  for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = lens[lens.length - 1] ?? 0;
  // A tap is a dot.
  if (total < 1) {
    const r = Math.max(0.5, w0 / 2);
    return `M${round(x0 - r)} ${round(y0)}a${r} ${r} 0 1 0 ${round(2 * r)} 0a${r} ${r} 0 1 0 ${round(-2 * r)} 0Z`;
  }
  const taper = Math.min(TAPER, total / 2);
  const left: [number, number][] = [], right: [number, number][] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let tx = b[0] - a[0], ty = b[1] - a[1];
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl; ty /= tl;
    const s = Math.min(1, lens[i] / taper), e = Math.min(1, (total - lens[i]) / taper);
    const r = Math.max(0.3, (pts[i][2] / 2) * s * (2 - s) * (1 - (1 - e) ** 3));
    left.push([pts[i][0] - ty * r, pts[i][1] + tx * r]);
    right.push([pts[i][0] + ty * r, pts[i][1] - tx * r]);
  }
  const ring = [...left, ...right.reverse()];
  let d = `M${round(ring[0][0])} ${round(ring[0][1])}`;
  for (let i = 1; i < ring.length; i++) {
    const [ax, ay] = ring[i], [bx, by] = ring[(i + 1) % ring.length];
    d += `Q${round(ax)} ${round(ay)} ${round((ax + bx) / 2)} ${round((ay + by) / 2)}`;
  }
  return `${d}Z`;
}

/**
 * The stroke levelled: each point a Gaussian average of its neighbours (x, y and width), the ends pinned so
 * it starts where the pen landed and stops where it lifted.
 * ponytail: smooths by sample index, so a very fast mouse stroke (samples far apart) is barely levelled;
 * weigh by time or path length (ink-assist's settle) if a host's input is that sparse.
 */
function settle(pts: SignaturePoint[]): SignaturePoint[] {
  const reach = 3, weights = [1, 0.8, 0.45, 0.17];
  return pts.map((p, i) => {
    if (i === 0 || i === pts.length - 1) return p.map(round) as SignaturePoint;
    let x = 0, y = 0, w = 0, sum = 0;
    for (let k = -reach; k <= reach; k++) {
      const q = pts[Math.min(pts.length - 1, Math.max(0, i + k))], g = weights[Math.abs(k)];
      x += q[0] * g; y += q[1] * g; w += q[2] * g; sum += g;
    }
    return [round(x / sum), round(y / sum), round(w / sum)];
  });
}

/* ── Export ──────────────────────────────────────────── */

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** A CSS font shorthand split into its size and family, for SVG text. */
const fontParts = (font: string) => {
  const m = font.match(/^(.*?)(\d+(?:\.\d+)?)px(?:\/\S+)?\s+(.+)$/);
  return m ? { weight: m[1].trim().split(/\s+/).find((t) => /^\d+$|bold/.test(t)) ?? '400', size: +m[2], family: m[3] } : { weight: '400', size: 26, family: 'sans-serif' };
};

export interface SignatureExportOptions {
  /** The ink. Default a dark ink, whatever the colorway on screen. */
  ink?: string;
}

/** The signature as standalone SVG markup, in its pad's box: the strokes as filled paths, or the typed name as text. */
export function signatureToSvg(value: Signature, { ink = exportColor('ink', 'black') }: SignatureExportOptions = {}): string {
  const { width, height } = value;
  const open = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`;
  if (value.kind === 'typed') {
    const f = fontParts(value.font);
    return `${open}<text x="${round(value.x)}" y="${round(value.y)}" fill="${escape(ink)}" font-family="${escape(f.family)}" font-size="${f.size}" font-weight="${escape(f.weight)}">${escape(value.name)}</text></svg>`;
  }
  return `${open}<g fill="${escape(ink)}">${value.strokes.map((s) => `<path d="${strokeOutline(s)}"/>`).join('')}</g></svg>`;
}

export interface SignatureImageOptions extends SignatureExportOptions {
  /** image/png (default, transparent) or image/jpeg (on `background`, white by default). */
  type?: 'image/png' | 'image/jpeg';
  /** Pixels per box unit. Default 2. */
  scale?: number;
  /** A fill behind the ink. Default none for PNG, white for JPEG. */
  background?: string;
  /** JPEG quality, 0 to 1. */
  quality?: number;
}

/** The signature as a PNG or JPEG, drawn straight onto a canvas (a typed name keeps the page's loaded font). */
export function signatureToImage(value: Signature, { ink = exportColor('ink', 'black'), type = 'image/png', scale = 2, background, quality }: SignatureImageOptions = {}): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(value.width * scale);
  canvas.height = Math.ceil(value.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('signatureToImage: no 2D canvas'));
  ctx.scale(scale, scale);
  const paper = background ?? (type === 'image/jpeg' ? exportColor('paper', 'white') : undefined);
  if (paper) { ctx.fillStyle = paper; ctx.fillRect(0, 0, value.width, value.height); }
  ctx.fillStyle = ink;
  if (value.kind === 'typed') {
    ctx.font = value.font;
    ctx.fillText(value.name, value.x, value.y);
  } else {
    for (const s of value.strokes) ctx.fill(new Path2D(strokeOutline(s)));
  }
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('signatureToImage: encoding failed'))), type, quality));
}

/* ── The pad ─────────────────────────────────────────── */

interface Box { width: number; height: number }
interface Live { id: number; pts: SignaturePoint[]; scale: number; ox: number; oy: number; left: number; top: number; pressure: boolean; min: number; max: number; vel: number; w: number; last: { x: number; y: number; t: number } }

/** Reads one of the recipe's numbers from the pad (custom properties, so DialKit and hosts can tune them). */
const recipeNumber = (el: Element, name: string, fallback: number) => {
  const v = parseFloat(getComputedStyle(el).getPropertyValue(`--mu-r-signature-pad-${name}`));
  return Number.isFinite(v) ? v : fallback;
};

/** A form field that captures a signature: draw it on the paper, or type your name. */
export function SignaturePad({
  defaultValue = null, onValueChange, mode: modeProp, defaultMode = 'draw', onModeChange, sizing = 'auto', minWidth, maxWidth,
  name, required, disabled, readOnly, size = 'regular', hint = 'Sign here', className, 'aria-label': ariaLabel = 'Signature', onKeyDown, ...props
}: SignaturePadProps) {
  const [ownMode, setOwnMode] = React.useState<SignatureMode>(defaultValue?.kind === 'typed' ? 'type' : defaultMode);
  const mode = modeProp ?? ownMode;
  const [box, setBoxState] = React.useState<Box | null>(defaultValue ? { width: defaultValue.width, height: defaultValue.height } : null);
  // The box as of the latest event, so a stroke's first emit has it before the render.
  const boxNow = React.useRef(box);
  const setBox = (b: Box) => { boxNow.current = b; setBoxState(b); };
  // One history of strokes: each stroke, undo, redo and clear moves along it.
  const [history, setHistory] = React.useState<{ list: SignaturePoint[][][]; at: number }>({ list: [defaultValue?.kind === 'drawn' ? defaultValue.strokes : []], at: 0 });
  const strokes = history.list[history.at];
  const [typed, setTyped] = React.useState<{ name: string; x: number; y: number; font: string } | null>(defaultValue?.kind === 'typed' ? defaultValue : null);
  // The latest stroke's raw outline, fading out while its levelled twin fades in.
  const [fresh, setFresh] = React.useState<{ index: number; raw: string } | null>(null);

  const paper = React.useRef<HTMLDivElement>(null);
  const livePath = React.useRef<SVGPathElement>(null);
  const live = React.useRef<Live | null>(null);
  const penSeen = React.useRef(false);
  const root = React.useRef<HTMLDivElement>(null);
  const input = React.useRef<HTMLInputElement>(null);

  const valueOf = (m: SignatureMode, s: SignaturePoint[][], t: typeof typed, b: Box | null): Signature | null => {
    if (!b) return null;
    if (m === 'type') return t && t.name.trim() ? { kind: 'typed', ...t, ...b } : null;
    return s.length ? { kind: 'drawn', strokes: s, ...b } : null;
  };
  const value = valueOf(mode, strokes, typed, box);
  const svg = value ? signatureToSvg(value) : '';
  const emit = (m: SignatureMode, s: SignaturePoint[][], t: typeof typed) => onValueChange?.(valueOf(m, s, t, boxNow.current));

  const go = (list: SignaturePoint[][][], at: number) => { setHistory({ list, at }); setFresh(null); emit(mode, list[at], typed); };
  const push = (next: SignaturePoint[][]) => go([...history.list.slice(0, history.at + 1), next], history.at + 1);
  const canUndo = mode === 'draw' && history.at > 0;
  const canRedo = mode === 'draw' && history.at < history.list.length - 1;
  const undo = () => { if (canUndo) go(history.list, history.at - 1); };
  const redo = () => { if (canRedo) go(history.list, history.at + 1); };
  const empty = mode === 'draw' ? strokes.length === 0 : !typed?.name;
  const clear = () => {
    if (mode === 'draw') { if (strokes.length) { push([]); penSeen.current = false; } return; }
    setTyped(null);
    emit(mode, strokes, null);
    input.current?.focus();
  };
  const switchMode = () => {
    const next: SignatureMode = mode === 'draw' ? 'type' : 'draw';
    if (modeProp === undefined) setOwnMode(next);
    onModeChange?.(next);
    emit(next, strokes, typed);
  };
  // Typing: the input takes focus as the mode opens (only when asked for by its key, not on first render).
  const asked = React.useRef(false);
  React.useEffect(() => {
    if (asked.current && mode === 'type') input.current?.focus();
    asked.current = false;
  }, [mode]);

  /** The box: the paper's size when the first mark is made, kept after so later strokes land in the same space. */
  const measure = () => {
    const r = paper.current!.getBoundingClientRect();
    const b = box && (strokes.length || typed) ? box : { width: Math.round(r.width), height: Math.round(r.height) };
    // The box is drawn with preserveAspectRatio "meet": its scale and offsets on this paper.
    const k = Math.min(r.width / b.width, r.height / b.height);
    return { r, b, k, ox: (r.width - b.width * k) / 2, oy: (r.height - b.height * k) / 2 };
  };

  const drawable = mode === 'draw' && !disabled && !readOnly;

  const down = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!drawable || live.current || e.button !== 0) return;
    if (e.pointerType === 'pen') penSeen.current = true;
    else if (e.pointerType === 'touch' && penSeen.current) return; // a palm while a pen is in use
    e.preventDefault();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* a synthetic pointer */ }
    const { r, b, k, ox, oy } = measure();
    if (b !== box) setBox(b);
    const el = paper.current!;
    const min = minWidth ?? recipeNumber(el, 'ink-min', 1.2);
    const max = maxWidth ?? recipeNumber(el, 'ink-max', 3.6);
    const pressure = sizing === 'pressure' || (sizing === 'auto' && e.pointerType === 'pen');
    const x = (e.clientX - r.left - ox) / k, y = (e.clientY - r.top - oy) / k;
    const w = pressure ? (e.pressure > 0 ? e.pressure : 0.5) : 0.6;
    live.current = { id: e.pointerId, pts: [[x, y, min + (max - min) * w]], scale: k, ox, oy, left: r.left, top: r.top, pressure, min, max, vel: recipeNumber(el, 'ink-velocity', 2.4), w, last: { x, y, t: e.timeStamp } };
    livePath.current?.setAttribute('d', strokeOutline(live.current.pts));
  };

  const move = (e: React.PointerEvent<SVGSVGElement>) => {
    const L = live.current;
    if (!L || e.pointerId !== L.id) return;
    const list = e.nativeEvent.getCoalescedEvents?.();
    for (const ev of list && list.length ? list : [e.nativeEvent]) {
      const x = (ev.clientX - L.left - L.ox) / L.scale, y = (ev.clientY - L.top - L.oy) / L.scale;
      const dist = Math.hypot(x - L.last.x, y - L.last.y);
      if (dist < 0.5) continue;
      if (L.pressure) L.w = ev.pressure > 0 ? ev.pressure : L.w;
      else {
        // Speed thins the ink: full width at rest, the thinnest at `vel` px per ms; eased so it never jumps.
        const v = dist / Math.max(1, ev.timeStamp - L.last.t);
        L.w += (Math.max(0, 1 - v / L.vel) - L.w) * 0.35;
      }
      L.pts.push([x, y, L.min + (L.max - L.min) * L.w]);
      L.last = { x, y, t: ev.timeStamp };
    }
    // ponytail: the whole outline per move (O(n)); a signature is a few hundred points
    livePath.current?.setAttribute('d', strokeOutline(L.pts));
  };

  const up = (e: React.PointerEvent<SVGSVGElement>) => {
    const L = live.current;
    if (!L || e.pointerId !== L.id) return;
    live.current = null;
    livePath.current?.setAttribute('d', '');
    const raw = L.pts.map((p) => p.map(round) as SignaturePoint);
    const next = [...strokes, settle(raw)];
    push(next);
    setFresh({ index: next.length - 1, raw: strokeOutline(raw) });
  };

  const type = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { r, b, k, ox, oy } = measure();
    if (b !== box) setBox(b);
    const s = getComputedStyle(e.currentTarget);
    const ir = e.currentTarget.getBoundingClientRect();
    // The name sits on the baseline: the rule's top, in the box.
    const line = paper.current!.querySelector('.mu-signature-baseline')!.getBoundingClientRect();
    const next = e.currentTarget.value
      ? { name: e.currentTarget.value, x: round((ir.left - r.left - ox) / k), y: round((line.top - r.top - oy) / k), font: `${s.fontWeight} ${s.fontSize} ${s.fontFamily}` }
      : null;
    setTyped(next);
    emit(mode, strokes, next);
  };

  const keys = (e: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented || mode !== 'draw' || !(e.metaKey || e.ctrlKey)) return;
    const k = e.key.toLowerCase();
    if (k === 'z' && !e.shiftKey && canUndo) { e.preventDefault(); undo(); }
    else if (((k === 'z' && e.shiftKey) || (k === 'y' && e.ctrlKey)) && canRedo) { e.preventDefault(); redo(); }
  };

  const said = mode === 'type'
    ? `${ariaLabel}, ${typed?.name ? `typed: ${typed.name}` : 'empty'}`
    : `${ariaLabel}, ${strokes.length ? `drawn, ${strokes.length} ${strokes.length === 1 ? 'stroke' : 'strokes'}` : 'empty'}`;
  const inked = !empty;
  const modeLabel = mode === 'draw' ? 'Type instead' : 'Draw instead';
  const toggle = () => { asked.current = true; switchMode(); };

  return (
    <div
      ref={root}
      className={cx(ROOT, disabled && 'opacity-signature-pad-disabled', className)}
      data-mode={mode}
      data-empty={empty ? '' : undefined}
      data-disabled={disabled ? '' : undefined}
      data-readonly={readOnly ? '' : undefined}
      onKeyDown={keys}
      {...props}
    >
      <Well ref={paper} variant="field" className={cx(PAPER_BASE, PAPER[size])} data-inked={inked || readOnly ? '' : undefined}>
        <Rule orientation="horizontal" aria-hidden role="presentation" className={cx(LINE_BASE, LINE[size])} />
        {!readOnly && <span aria-hidden className={cx(HINT_BASE, HINT[size])}>{hint}</span>}
        {mode === 'draw' ? (
          <svg
            role="img"
            aria-label={said}
            className={cx(INK, drawable && DRAWABLE)}
            viewBox={box ? `0 0 ${box.width} ${box.height}` : undefined}
            preserveAspectRatio="xMidYMid meet"
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
          >
            <g fill="currentColor">
              {strokes.map((s, i) => <path key={i} d={strokeOutline(s)} className={fresh?.index === i ? 'signature-settle-in' : undefined} />)}
              {fresh && <path key={`raw-${fresh.index}`} d={fresh.raw} className="signature-settle-out" />}
              <path ref={livePath} />
            </g>
          </svg>
        ) : readOnly || disabled ? (
          <span role="img" aria-label={said} className={cx(TYPED_BASE, TYPED[size], 'whitespace-nowrap overflow-hidden')}>{typed?.name}</span>
        ) : (
          <input
            ref={input}
            className={cx(TYPED_BASE, TYPED[size])}
            value={typed?.name ?? ''}
            onChange={type}
            placeholder="Type your full name"
            aria-label={`${ariaLabel}, type your full name`}
            autoComplete="name"
            spellCheck={false}
          />
        )}
      </Well>
      {!readOnly && (
        <div className={KEYS}>
          {/* Compact (initials) is narrow: its keys are glyphs, and Redo is the keyboard's. */}
          {size === 'compact' ? (
            <IconButton label={modeLabel} icon={mode === 'draw' ? <TextIcon /> : <PenIcon />} disabled={disabled} className={cx(MODE, 'mr-auto')} onClick={toggle} />
          ) : (
            <Button cap="link" disabled={disabled} className={cx(MODE, 'mr-auto')} onClick={toggle}>{modeLabel}</Button>
          )}
          {mode === 'draw' && <IconButton label="Undo" icon={<UndoIcon />} disabled={disabled || !canUndo} onClick={undo} />}
          {mode === 'draw' && size === 'regular' && <IconButton label="Redo" icon={<RedoIcon />} disabled={disabled || !canRedo} onClick={redo} />}
          {size === 'compact'
            ? <IconButton label="Clear" icon={<EraserIcon />} disabled={disabled || empty} onClick={clear} />
            : <Button size="compact" disabled={disabled || empty} onClick={clear}>Clear</Button>}
        </div>
      )}
      {/* The value the form sees and posts: the SVG. Empty is what `required` refuses; focus goes to Type instead. */}
      <BaseField.Control
        className={HIDDEN}
        tabIndex={-1}
        name={name}
        required={required}
        disabled={disabled}
        value={svg}
        onFocus={() => root.current?.querySelector<HTMLElement>('.mu-signature-mode')?.focus()}
      />
    </div>
  );
}
