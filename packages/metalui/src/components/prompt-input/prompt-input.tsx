'use client';

import * as React from 'react';
import { AttachIcon } from '../../icons/components.generated';
import { MorphPair } from '../../icons/MorphIcon';
import { sendMorph, stopMorph } from '../../icons/morph.generated';
import { SwapText } from '../../motion/swap';
import { Button } from '../button/button';
import { IconButton } from '../icon-button/icon-button';
import { Led } from '../led/led';
import { Textarea } from '../textarea/textarea';
import { Tooltip } from '../tooltip/tooltip';

/* ─────────────────────────────────────────────────────────
 * PROMPT INPUT, where a message is written and sent
 *
 *   rest      a raised plate (raise-sm, the card radius): the host's files (Attachments) above, the
 *             well (a large Textarea, one row, growing to maxRows on the settle spring, then
 *             scrolling), and a strip: attach, the host's tools (a model Select), the hint, Send
 *   write     ↩ sends (not while an IME composes); ⇧↩ is a new line
 *   empty     Send is disabled while the text is blank and no files are attached
 *   busy      a reply writes: Send becomes Stop (the send glyph morphs to stop, the word turns on
 *             the drum); Stop or ⎋ in the well calls onStop; the well stays writable, ↩ doesn't send
 *   attach    the attach key opens the file picker; files dropped on the plate or pasted into the
 *             well are handed over too; while files are over it the plate's edge lights green (the
 *             drop zone's edge)
 *   disabled  the well, attach and Send dim and refuse; the reason, with the amber lamp, stands in
 *             the hint's place
 *   narrow    under 28rem (a container query) the hint hides
 * Reduce Motion: the well's height snaps, the glyph and word change in place.
 * Semantics: a group named by its label; the well is the textbox ("Message"); Send's name turns to Stop.
 * ───────────────────────────────────────────────────────── */

export interface PromptInputProps {
  /** The text (controlled). */
  value?: string;
  /** The first text (uncontrolled; it empties itself after a send). */
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Send pressed or ↩: the text, trimmed. */
  onSend: (text: string) => void;
  /** A reply is writing: Send becomes Stop. */
  busy?: boolean;
  /** Stop pressed, or ⎋ in the well, while busy. */
  onStop?: () => void;
  /** Files picked, dropped or pasted. Without it there is no attach key and nothing is taken. */
  onAttach?: (files: File[]) => void;
  /** What the picker offers: the file input's accept ("image/*,.pdf"). */
  accept?: string;
  /** The host's attached files (`Attachment`s), above the well. Any attached file lets Send send. */
  attachments?: React.ReactNode;
  /** The host's controls in the strip after attach (a compact `Select` for the model). */
  tools?: React.ReactNode;
  /** Whether Send may send; default: text that isn't blank, or attached files. */
  canSend?: boolean;
  disabled?: boolean;
  /** Why it's disabled ("You're offline"), said in the strip with the amber lamp. */
  disabledReason?: string;
  placeholder?: string;
  /** Names the well and the group ("Message"). */
  label?: string;
  /** The hint beside Send ("⇧↩ new line"); `null` hides it. */
  hint?: string | null;
  /** Rows before the well scrolls (6). */
  maxRows?: number;
  maxLength?: number;
  /** The words that would come next, in grey after the text; Tab takes them (Textarea's ghost). */
  suggestion?: string;
  /** Escape let the suggestion go. */
  onSuggestionDismiss?: () => void;
  className?: string;
}

const ROOT = 'mu-prompt-input @container/prompt relative grid gap-prompt-input-gap p-prompt-input-pad rounded-card recipe-surface-raise-sm drop-zone-edge';
const FILES = 'mu-prompt-input-files flex flex-wrap gap-prompt-input-files-gap';
const STRIP = 'mu-prompt-input-strip flex min-w-0 items-center gap-prompt-input-strip-gap';
const HINT = 'mu-prompt-input-hint type-meta text-ink3 @max-md/prompt:hidden';
const REASON = 'mu-prompt-input-reason flex min-w-0 items-center gap-prompt-input-strip-gap type-meta text-ink2';
const GLYPHS = { send: sendMorph, stop: stopMorph };

const hasFiles = (e: React.DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files');

/** Where a message is written and sent: a well that grows, attach, the host's tools, and Send that becomes Stop. */
export const PromptInput = React.forwardRef<HTMLTextAreaElement, PromptInputProps>(function PromptInput(
  {
    value, defaultValue = '', onValueChange, onSend, busy = false, onStop, onAttach, accept, attachments, tools, canSend,
    disabled = false, disabledReason, placeholder, label = 'Message', hint = '⇧↩ new line', maxRows = 6, maxLength, suggestion, onSuggestionDismiss, className,
  },
  ref,
) {
  const [own, setOwn] = React.useState(defaultValue);
  const text = value ?? own;
  const picker = React.useRef<HTMLInputElement>(null);
  const well = React.useRef<HTMLTextAreaElement>(null);
  React.useImperativeHandle(ref, () => well.current!);
  const [over, setOver] = React.useState(false);
  const files = React.Children.toArray(attachments).length > 0;
  const ready = !disabled && (canSend ?? (text.trim() !== '' || files));

  const change = (next: string) => {
    if (value === undefined) setOwn(next);
    onValueChange?.(next);
  };
  const send = () => {
    if (!ready || busy) return;
    onSend(text.trim());
    if (value === undefined) setOwn('');
  };
  const stop = () => {
    onStop?.();
    well.current?.focus();
  };
  const take = (list: FileList | null | undefined) => {
    const all = Array.from(list ?? []);
    if (all.length && onAttach && !disabled) onAttach(all);
  };

  const keys = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape' && busy) { e.preventDefault(); stop(); return; }
    if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return;
    e.preventDefault();
    send();
  };
  const paste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (!onAttach || !e.clipboardData.files.length) return;
    e.preventDefault();
    take(e.clipboardData.files);
  };
  const drop = onAttach && !disabled ? {
    onDragOver: (e: React.DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      setOver(true);
    },
    onDragLeave: (e: React.DragEvent) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(false); },
    onDrop: (e: React.DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      setOver(false);
      take(e.dataTransfer.files);
    },
  } : null;

  return (
    <div
      role="group"
      aria-label={label}
      data-busy={busy ? '' : undefined}
      data-disabled={disabled ? '' : undefined}
      data-over={over ? '' : undefined}
      className={className ? `${ROOT} ${className}` : ROOT}
      {...drop}
    >
      {files && <div className={FILES}>{attachments}</div>}
      <Textarea
        ref={well}
        aria-label={label}
        placeholder={placeholder}
        minRows={1}
        maxRows={maxRows}
        maxLength={maxLength}
        suggestion={suggestion}
        onSuggestionDismiss={onSuggestionDismiss}
        value={text}
        disabled={disabled}
        onChange={(e) => change(e.target.value)}
        onKeyDown={keys}
        onPaste={paste}
      />
      <div className={STRIP}>
        {onAttach && (
          <>
            <input ref={picker} type="file" multiple accept={accept} hidden aria-hidden tabIndex={-1} data-attach-input onChange={(e) => { take(e.target.files); e.target.value = ''; well.current?.focus(); }} />
            <Tooltip label="Attach files">
              <IconButton label="Attach files" icon={<AttachIcon />} disabled={disabled} onClick={() => picker.current?.click()} />
            </Tooltip>
          </>
        )}
        {tools}
        <span className="min-w-0 flex-1" />
        {disabled && disabledReason
          ? <span className={REASON}><Led kind="waiting" size="small" /><span className="truncate">{disabledReason}</span></span>
          : hint && <span aria-hidden className={HINT}>{hint}</span>}
        <Button
          cap="primary"
          size="compact"
          onClick={busy ? stop : send}
          disabled={disabled || (!busy && !ready)}
          icon={<MorphPair glyphs={GLYPHS} name={busy ? 'stop' : 'send'} />}
        >
          <SwapText value={busy ? 'Stop' : 'Send'} />
        </Button>
      </div>
    </div>
  );
});
