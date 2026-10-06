'use client';

import * as React from 'react';
import { Field as BaseField } from '@base-ui/react/field';
import { useIsoLayoutEffect } from '../../motion/layout-effect';

/* ─────────────────────────────────────────────────────────
 * TEXTAREA, several lines of text in the field well that grows with what is written
 *
 *   rest      the field well, min rows tall (3); large is the content type role, regular and compact
 *             the ui role at Field's padding and radius, so it sits level with the fields beside it
 *   focus     the flush green ring
 *   grow      a new line grows the well on the settle spring (no overshoot); deleting shrinks it
 *             the same way; at max rows (8) it stops and scrolls. The text stays pinned to the top.
 *   count     with maxLength, a counter's row grows open below at 80 % (the form error's motion:
 *             settle spring, fading in) and turns red at the limit
 *   refused   typing or pasting past the limit shakes only the counter on the refusal spring
 *             (a nest's reach); the text is left alone and a screen reader hears it once
 *   invalid   a red hairline ring
 *   disabled  40 %
 *   ghost     with `suggestion`, while focused and the caret is at the end, the words that would come
 *             next sit after the text in the placeholder's ink, wrapping as the text will (the mirror,
 *             made visible); the well grows to hold them. Tab takes them (inserted as typed, so undo
 *             takes them back); Escape lets them go (onSuggestionDismiss); typing their next letters
 *             eats them; typing anything else hides them
 * Reduce Motion: the height snaps and nothing shakes; the counter still turns red.
 * The height is measured from a hidden mirror of the text, so it can spring between real numbers.
 * ───────────────────────────────────────────────────────── */

export interface TextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'rows'> {
  /** Field's sizes: large (the default) writes in the content role; regular and compact in the ui role, beside Fields of that size. */
  size?: 'large' | 'regular' | 'compact';
  /** The share of `maxLength` at which the counter shows: 0 shows it always, 1 only at the limit. Default the recipe's (0.8). */
  countFrom?: number;
  /** Rows before it starts to grow (3). */
  minRows?: number;
  /** Rows before it stops growing and scrolls (8). */
  maxRows?: number;
  /** Shows the red ring; also sets aria-invalid. */
  invalid?: boolean;
  /** The words that would come next (an assistant's completion), shown after the text in grey; Tab takes them. */
  suggestion?: string;
  /** Escape let the suggestion go. */
  onSuggestionDismiss?: () => void;
  /** Where the well goes: `className` sits on the well, `style` on the textarea. */
  className?: string;
}

const WELL = 'mu-textarea group/ta relative block box-border recipe-well-field cursor-text focus-within:focus-ring-flush data-invalid:invalid-ring has-[textarea[data-invalid]]:invalid-ring has-[textarea[data-disabled]]:opacity-textarea-disabled data-disabled:opacity-textarea-disabled data-disabled:cursor-default';
const RADIUS = { large: 'rounded-textarea-radius', regular: 'rounded-textarea-regular-radius', compact: 'rounded-textarea-compact-radius' };
// The text's box, shared by the textarea and its mirror so they wrap alike.
const TEXT = {
  large: 'px-textarea-pad-x py-textarea-pad-y type-content whitespace-pre-wrap break-words',
  regular: 'px-textarea-regular-pad-x py-textarea-regular-pad-y type-ui whitespace-pre-wrap break-words',
  compact: 'px-textarea-compact-pad-x py-textarea-compact-pad-y type-ui whitespace-pre-wrap break-words',
};
const INPUT = 'mu-textarea-input block w-full box-border m-0 border-0 outline-none bg-transparent resize-none text-field-field-ink caret-field-field-caret placeholder:text-field-field-hint transition-textarea-grow reduced-motion:transition-none disabled:cursor-default';
const MIRROR = 'mu-textarea-mirror invisible absolute inset-x-0 top-0 pointer-events-none';
const GHOST = 'mu-textarea-ghost absolute inset-x-0 top-0 pointer-events-none';
const GHOST_WORDS = 'mu-textarea-ghost-words text-field-field-hint';
const COUNT_ROW = 'mu-textarea-count-row textarea-count-row';
const COUNT = 'mu-textarea-count pt-textarea-count-gap text-right type-meta tabular-nums text-ink3 data-at-limit:text-red data-refused:textarea-refused';

/* Base UI's field control rendered as a textarea: inside a FormField it takes the label, description,
 * error and the field's states. Typed as the textarea it renders. */
type TextareaControl = React.ForwardRefExoticComponent<
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { render: React.ReactElement } & React.RefAttributes<HTMLTextAreaElement>
>;
// Read at render, not at module level: a property read on Base UI's namespace at load time is a side effect to a
// bundler, and would ship Field with every component in the package.
const control = () => BaseField.Control as unknown as TextareaControl;

const readPx = (style: CSSStyleDeclaration, prop: string) => parseFloat(style.getPropertyValue(prop)) || 0;

/** Several lines of text. It grows with what is written, between minRows and maxRows. */
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { size = 'large', countFrom, minRows, maxRows, invalid, suggestion, onSuggestionDismiss, maxLength, value, defaultValue, onChange, onKeyDown, onPaste, onSelect, onKeyUp, onMouseUp, onFocus, onBlur, onScroll, className, disabled, style, ...props },
  forwardedRef,
) {
  const TextareaControl = control();
  const inner = React.useRef<HTMLTextAreaElement>(null);
  React.useImperativeHandle(forwardedRef, () => inner.current!);
  const mirror = React.useRef<HTMLDivElement>(null);
  const [text, setText] = React.useState(() => String(value ?? defaultValue ?? ''));
  const [height, setHeight] = React.useState<number>();
  const [scrolls, setScrolls] = React.useState(false);
  const [refusals, setRefusals] = React.useState(0);
  const countId = React.useId();
  const current = value !== undefined ? String(value) : text;

  // The ghost: what is left of the suggestion after what was typed since it came.
  const ghost = React.useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = React.useState({ for: suggestion, base: current });
  if (anchor.for !== suggestion) setAnchor({ for: suggestion, base: current });
  const [dismissed, setDismissed] = React.useState<string | undefined>();
  const [atEnd, setAtEnd] = React.useState(false);
  const typed = current.startsWith(anchor.base) ? current.slice(anchor.base.length) : null;
  const rest = suggestion && typed !== null && suggestion.startsWith(typed) && dismissed !== suggestion ? suggestion.slice(typed.length) : '';
  const showing = rest !== '' && atEnd && !disabled;
  const caret = (ta: HTMLTextAreaElement) => setAtEnd(document.activeElement === ta && ta.selectionStart === ta.value.length && ta.selectionEnd === ta.value.length);

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
  }, [minRows, maxRows, size]);

  useIsoLayoutEffect(fit, [fit, current, showing]);
  React.useEffect(() => {
    const m = mirror.current;
    if (!m || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(fit);
    ro.observe(m);
    return () => ro.disconnect();
  }, [fit]);

  const room = maxLength != null ? maxLength - current.length : Infinity;
  const showCount = maxLength != null && current.length >= maxLength * (countFrom ?? readShow(inner.current));
  const atLimit = maxLength != null && room <= 0;

  return (
    <div className="mu-textarea-slot block">
      <label className={`${WELL} ${RADIUS[size]}${className ? ` ${className}` : ''}`} data-size={size} data-invalid={invalid ? '' : undefined} data-disabled={disabled ? '' : undefined}>
        <TextareaControl
          render={<textarea />}
          ref={inner}
          value={value}
          defaultValue={defaultValue}
          maxLength={maxLength}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          aria-describedby={maxLength != null ? countId : undefined}
          rows={1}
          className={`${INPUT} ${TEXT[size]}`}
          style={{ height, overflowY: scrolls ? 'auto' : 'hidden', ...style }}
          onChange={(e) => {
            if (value === undefined) setText(e.target.value);
            onChange?.(e);
          }}
          onKeyDown={(e) => {
            if (showing && !e.metaKey && !e.ctrlKey && !e.altKey && !e.nativeEvent.isComposing) {
              if (e.key === 'Tab' && !e.shiftKey) {
                e.preventDefault();
                take(e.currentTarget, rest);
                return;
              }
              if (e.key === 'Escape') {
                e.preventDefault();
                setDismissed(suggestion);
                onSuggestionDismiss?.();
                return;
              }
            }
            onKeyDown?.(e);
            if (maxLength == null || e.metaKey || e.ctrlKey || e.altKey) return;
            const printable = e.key.length === 1 || e.key === 'Enter';
            const ta = e.currentTarget;
            if (printable && room + (ta.selectionEnd - ta.selectionStart) <= 0) setRefusals((n) => n + 1);
          }}
          // Where the caret is decides whether the ghost shows: check whenever it may have moved.
          onSelect={(e) => { caret(e.currentTarget); onSelect?.(e); }}
          onKeyUp={(e) => { caret(e.currentTarget); onKeyUp?.(e); }}
          onMouseUp={(e) => { caret(e.currentTarget); onMouseUp?.(e); }}
          onFocus={(e) => { caret(e.currentTarget); onFocus?.(e); }}
          onBlur={(e) => { setAtEnd(false); onBlur?.(e); }}
          onScroll={(e) => {
            // The ghost rides the text when the well scrolls.
            if (ghost.current) ghost.current.style.transform = `translateY(${-e.currentTarget.scrollTop}px)`;
            onScroll?.(e);
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
        <div ref={mirror} aria-hidden className={`${MIRROR} ${TEXT[size]}`}>{current + (showing ? rest : '') + '​'}</div>
        {showing && (
          <div ref={ghost} aria-hidden className={`${GHOST} ${TEXT[size]}`}>
            <span className="invisible">{current}</span><span className={GHOST_WORDS}>{rest}</span>
          </div>
        )}
        {suggestion && <span role="status" className="sr-only">{showing ? `Suggestion: ${suggestion}. Tab to accept.` : ''}</span>}
      </label>
      {maxLength != null && (
        <div className={COUNT_ROW} data-shown={showCount ? '' : undefined}>
          {/* The row collapses to nothing; the counter keeps its own spacing inside. */}
          <div>
            <div
              key={refusals}
              id={countId}
              className={COUNT}
              data-at-limit={atLimit ? '' : undefined}
              data-refused={refusals > 0 ? '' : undefined}
            >
              {current.length}/{maxLength}
              <span className="sr-only" aria-live="polite">{refusals > 0 && atLimit ? `Limit reached, ${maxLength} characters` : ''}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

/** Puts the ghost's words in as if typed: one undo step, and the host's onChange hears it. */
function take(ta: HTMLTextAreaElement, words: string) {
  ta.focus();
  if (document.execCommand?.('insertText', false, words)) return;
  // Without execCommand: set the value through the native setter so React sees the input.
  const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
  set?.call(ta, ta.value + words);
  ta.setSelectionRange(ta.value.length, ta.value.length);
  ta.dispatchEvent(new Event('input', { bubbles: true }));
}

/** The share of the limit at which the counter shows (the recipe's count.show), as tuned where the textarea is. */
function readShow(el: Element | null) {
  if (typeof document === 'undefined') return 0.8;
  return parseFloat(getComputedStyle(el ?? document.documentElement).getPropertyValue('--mu-r-textarea-count-show')) || 0.8;
}
