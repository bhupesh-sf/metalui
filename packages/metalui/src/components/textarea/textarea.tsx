'use client';

import * as React from 'react';

/* ─────────────────────────────────────────────────────────
 * TEXTAREA, several lines of text in the field well that grows with what is written
 *
 *   rest      the field well, min rows tall (3), the content type role
 *   focus     the flush green ring
 *   grow      a new line grows the well on the settle spring (no overshoot); deleting shrinks it
 *             the same way; at max rows (8) it stops and scrolls. The text stays pinned to the top.
 *   count     with maxLength, a counter below fades in at 80 % and turns red at the limit
 *   refused   typing or pasting past the limit shakes only the counter on the refusal spring
 *             (a nest's reach); the text is left alone and a screen reader hears it once
 *   invalid   a red hairline ring
 *   disabled  40 %
 * Reduce Motion: the height snaps and nothing shakes; the counter still turns red.
 * The height is measured from a hidden mirror of the text, so it can spring between real numbers.
 * ───────────────────────────────────────────────────────── */

export interface TextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'rows'> {
  /** Rows before it starts to grow (3). */
  minRows?: number;
  /** Rows before it stops growing and scrolls (8). */
  maxRows?: number;
  /** Shows the red ring; also sets aria-invalid. */
  invalid?: boolean;
  /** Where the well goes: `className` sits on the well, `style` on the textarea. */
  className?: string;
}

const WELL = 'mu-textarea group/ta relative block box-border rounded-textarea-radius recipe-well-field cursor-text focus-within:focus-ring-flush data-invalid:textarea-invalid data-disabled:opacity-textarea-disabled data-disabled:cursor-default';
const TEXT = 'px-textarea-pad-x py-textarea-pad-y type-content whitespace-pre-wrap break-words';
const INPUT = `mu-textarea-input block w-full box-border m-0 border-0 outline-none bg-transparent resize-none ${TEXT} text-field-field-ink caret-field-field-caret placeholder:text-field-field-hint transition-textarea-grow reduced-motion:transition-none disabled:cursor-default`;
const MIRROR = `mu-textarea-mirror invisible absolute inset-x-0 top-0 pointer-events-none ${TEXT}`;
const COUNT = 'mu-textarea-count mt-textarea-count-gap text-right type-meta tabular-nums text-ink3 transition-opacity duration-textarea-count-fade data-at-limit:text-red data-refused:textarea-refused';

const readPx = (style: CSSStyleDeclaration, prop: string) => parseFloat(style.getPropertyValue(prop)) || 0;

/** Several lines of text. It grows with what is written, between minRows and maxRows. */
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { minRows, maxRows, invalid, maxLength, value, defaultValue, onChange, onKeyDown, onPaste, className, disabled, style, ...props },
  forwardedRef,
) {
  const inner = React.useRef<HTMLTextAreaElement>(null);
  React.useImperativeHandle(forwardedRef, () => inner.current!);
  const mirror = React.useRef<HTMLDivElement>(null);
  const [text, setText] = React.useState(() => String(value ?? defaultValue ?? ''));
  const [height, setHeight] = React.useState<number>();
  const [scrolls, setScrolls] = React.useState(false);
  const [refusals, setRefusals] = React.useState(0);
  const countId = React.useId();
  const current = value !== undefined ? String(value) : text;

  // Fit the well to the mirror, clamped to the rows; the settle spring carries the change.
  const fit = React.useCallback(() => {
    const ta = inner.current, m = mirror.current;
    if (!ta || !m) return;
    const s = getComputedStyle(ta);
    const line = parseFloat(s.lineHeight) || readPx(s, '--mu-r-textarea-self-line');
    const pad = parseFloat(s.paddingTop) + parseFloat(s.paddingBottom);
    const lo = (minRows ?? readPx(s, '--mu-r-textarea-self-min-rows')) * line + pad;
    const hi = (maxRows ?? readPx(s, '--mu-r-textarea-self-max-rows')) * line + pad;
    const natural = m.offsetHeight;
    setHeight(Math.min(hi, Math.max(lo, natural)));
    setScrolls(natural > hi);
  }, [minRows, maxRows]);

  React.useLayoutEffect(fit, [fit, current]);
  React.useEffect(() => {
    const m = mirror.current;
    if (!m || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(fit);
    ro.observe(m);
    return () => ro.disconnect();
  }, [fit]);

  const room = maxLength != null ? maxLength - current.length : Infinity;
  const showCount = maxLength != null && current.length >= maxLength * readShow();
  const atLimit = maxLength != null && room <= 0;

  return (
    <div className="mu-textarea-slot block">
      <label className={className ? `${WELL} ${className}` : WELL} data-invalid={invalid ? '' : undefined} data-disabled={disabled ? '' : undefined}>
        <textarea
          ref={inner}
          value={value}
          defaultValue={defaultValue}
          maxLength={maxLength}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          aria-describedby={maxLength != null ? countId : undefined}
          rows={1}
          className={INPUT}
          style={{ height, overflowY: scrolls ? 'auto' : 'hidden', ...style }}
          onChange={(e) => {
            if (value === undefined) setText(e.target.value);
            onChange?.(e);
          }}
          onKeyDown={(e) => {
            onKeyDown?.(e);
            if (maxLength == null || e.metaKey || e.ctrlKey || e.altKey) return;
            const printable = e.key.length === 1 || e.key === 'Enter';
            const ta = e.currentTarget;
            if (printable && room + (ta.selectionEnd - ta.selectionStart) <= 0) setRefusals((n) => n + 1);
          }}
          onPaste={(e) => {
            onPaste?.(e);
            if (maxLength == null) return;
            const ta = e.currentTarget;
            const selected = ta.selectionEnd - ta.selectionStart;
            if (e.clipboardData.getData('text').length > room + selected) setRefusals((n) => n + 1);
          }}
          {...props}
        />
        <div ref={mirror} aria-hidden className={MIRROR}>{current + '​'}</div>
      </label>
      {maxLength != null && (
        <div
          key={refusals}
          id={countId}
          className={COUNT}
          style={{ opacity: showCount ? 1 : 0 }}
          data-at-limit={atLimit ? '' : undefined}
          data-refused={refusals > 0 ? '' : undefined}
        >
          {current.length}/{maxLength}
          <span className="sr-only" aria-live="polite">{refusals > 0 && atLimit ? `Limit reached, ${maxLength} characters` : ''}</span>
        </div>
      )}
    </div>
  );
});

/** The share of the limit at which the counter shows (the recipe's count.show). */
function readShow() {
  if (typeof document === 'undefined') return 0.8;
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--mu-r-textarea-count-show')) || 0.8;
}
