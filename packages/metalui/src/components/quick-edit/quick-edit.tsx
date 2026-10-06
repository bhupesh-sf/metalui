'use client';

import * as React from 'react';
import { Button } from '../button/button';
import { Field } from '../field/field';
import { FormField } from '../form-field/form-field';
import { SwapText } from '../../motion/swap';
import { MorphPair, type GlyphParts } from '../../icons/MorphIcon';
import { penGlyph } from '../../icons/glyphs.generated';
import { checkMorph, penMorph, syncErrorMorph, type MorphIconName } from '../../icons/morph.generated';

/* ─────────────────────────────────────────────────────────
 * QUICK EDIT, one short value edited where it stands and committed with one key
 * (in a popover's body or a dialog: Rename, Tag, a label)
 *
 *   open      the field takes focus with the value selected (a file keeps its extension out)
 *   typing    the key is off while the value is empty or unchanged; Enter commits, Escape cancels
 *             (the plate's own Escape)
 *   refused   the value is not accepted (taken, too long): the field's invalid ring and the reason
 *             grow open under it (FormField, settle); the plate stays; typing re-checks it live
 *   commit      0 ms  the key goes down and stays down (Button state="waiting"); the word turns to
 *                     "Renaming…" on the drum; the field locks, Cancel and Escape are held off
 *             400 ms  still saving: the glyph cross-fades into the turning arc (a quick save never shows it)
 *             landed  state="done": the glyph morphs pen → check (settle), "Renamed" on the drum
 *             +800 ms (the recipe's hold) onClose: the plate closes; the host's toast offers Undo
 *   failed    the glyph morphs to sync-error, "Try again"; the field unlocks; editing turns it back
 * Reduce Motion: the morph and the drum change in place; the hold stays (it is for reading).
 * ───────────────────────────────────────────────────────── */

const FORM = 'mu-quick-edit grid gap-quick-edit-gap';
const ACTIONS = 'mu-quick-edit-actions flex justify-end gap-quick-edit-actions-gap';

export interface QuickEditWords {
  /** The key at rest: "Rename". */
  verb: string;
  /** While a save is out: "Renaming…". */
  doing: string;
  /** Landed: "Renamed". */
  done: string;
  /** Said to assistive tech when a save fails: "Couldn’t rename". The key says Try again. */
  failed: string;
}

const pen: GlyphParts = { glyph: penGlyph, morph: penMorph };

const renameWords: QuickEditWords = { verb: 'Rename', doing: 'Renaming…', done: 'Renamed', failed: "Couldn’t rename" };

export interface QuickEditProps {
  /** What it is now. The key stays off until the value differs from it. */
  value: string;
  /** Names the field for assistive tech ("Region name"); the plate's title says what is edited. */
  label: string;
  /**
   * Commit the new value (trimmed). Return a promise for an async save: the key waits until it
   * lands, and a rejection fails it (sync-error, Try again). Offer Undo in a toast once it lands.
   */
  onCommit: (next: string) => void | Promise<void>;
  /** Close the plate: Cancel, and the recipe's hold after the commit lands. */
  onClose: () => void;
  /** Why a value is not accepted ("A region is already called Lisbon."), or nothing. Checked on commit, then live. */
  validate?: (next: string) => string | null | undefined;
  /** The value is a file name: its extension stays out of the selection on open. */
  extension?: boolean;
  /** The key's words. Default: Rename, Renaming…, Renamed. */
  words?: QuickEditWords;
  /** The key's glyph as its parts, `{ glyph: tagGlyph, morph: tagMorph }`; default pen. It morphs to check when done, to sync-error on failure. */
  icon?: GlyphParts;
  className?: string;
}

type Phase = 'editing' | 'saving' | 'done' | 'failed';

function holdMs(el: HTMLElement | null) {
  if (!el) return 800;
  return parseFloat(getComputedStyle(el).getPropertyValue('--mu-r-quick-edit-self-hold')) || 800;
}

/** One short value and the key that commits it, for a popover's body or a dialog. */
export function QuickEdit({ value, label, onCommit, onClose, validate, extension, words = renameWords, icon = pen, className }: QuickEditProps) {
  const [draft, setDraft] = React.useState(value);
  const [phase, setPhase] = React.useState<Phase>('editing');
  const [checked, setChecked] = React.useState(false); // errors show once a commit was tried
  const form = React.useRef<HTMLFormElement>(null);
  const input = React.useRef<HTMLInputElement>(null);
  const selected = React.useRef(false);

  const next = draft.trim();
  const fresh = next !== '' && next !== value.trim();
  const why = checked && fresh ? validate?.(next) || undefined : undefined;
  const settled = phase === 'saving' || phase === 'done';

  // Landed: hold "Renamed" for a beat, then close. (StrictMode runs this twice; the cleanup cancels the first.)
  React.useEffect(() => {
    if (phase !== 'done') return;
    const t = window.setTimeout(onClose, holdMs(form.current));
    return () => window.clearTimeout(t);
  }, [phase, onClose]);

  const commit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (settled || !fresh) return;
    setChecked(true);
    if (validate?.(next)) { input.current?.focus(); return; }
    let pending: void | Promise<void>;
    try { pending = onCommit(next); } catch { setPhase('failed'); return; }
    if (!pending) { setPhase('done'); return; }
    setPhase('saving');
    try { await pending; setPhase('done'); } catch { setPhase('failed'); input.current?.focus(); }
  };

  // The key's glyph and the two it becomes (MorphPair ships just their parts).
  const own = icon.glyph.name as MorphIconName;
  const glyphs = { check: checkMorph, 'sync-error': syncErrorMorph, [own]: icon.morph };
  const glyph: MorphIconName = phase === 'done' ? 'check' : phase === 'failed' ? 'sync-error' : own;
  const word = phase === 'done' ? words.done : phase === 'saving' ? words.doing : phase === 'failed' ? 'Try again' : words.verb;

  return (
    <form
      ref={form}
      noValidate
      className={className ? `${FORM} ${className}` : FORM}
      onSubmit={commit}
      // While a save is out the plate holds: its Escape waits until the save lands.
      onKeyDown={(e) => { if (e.key === 'Escape' && phase === 'saving') { e.preventDefault(); e.stopPropagation(); } }}
    >
      <FormField invalid={!!why}>
        <Field size="regular">
          <Field.Input
            ref={input}
            aria-label={label}
            value={draft}
            readOnly={settled}
            onChange={(e) => { setDraft(e.target.value); if (phase === 'failed') setPhase('editing'); }}
            onFocus={(e) => {
              // The first focus selects the value, so typing replaces it; a file keeps its extension.
              if (selected.current) return;
              selected.current = true;
              const el = e.currentTarget;
              const dot = extension ? el.value.lastIndexOf('.') : -1;
              el.setSelectionRange(0, dot > 0 ? dot : el.value.length);
            }}
          />
        </Field>
        {/* Shown by `why` itself (match), not the input's own validity; Base UI keeps the last words while the row closes. */}
        <FormField.Error match={!!why}>{why}</FormField.Error>
      </FormField>
      <div className={ACTIONS}>
        <Button type="button" onClick={onClose} disabled={phase === 'saving'}>Cancel</Button>
        <Button
          type="submit"
          cap="primary"
          state={phase === 'saving' ? 'waiting' : phase === 'done' ? 'done' : 'ready'}
          disabled={!settled && !fresh}
          icon={<MorphPair glyphs={glyphs} name={glyph} />}
        >
          <SwapText value={word} />
        </Button>
      </div>
      <span role="status" className="sr-only">{phase === 'done' ? words.done : phase === 'failed' ? `${words.failed}. Try again.` : ''}</span>
    </form>
  );
}
