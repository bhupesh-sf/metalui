'use client';

import * as React from 'react';
import { Mark, type MarkKind, type MarkProps } from '../mark/mark';
import { Popover } from '../popover/popover';
import { Combobox, type ComboboxItem } from '../combobox/combobox';

/* ─────────────────────────────────────────────────────────
 * MARK PICK, a tag or a person inside the text that you swap for another
 *
 *   rest      the Mark exactly (a tag's luggage tag, a person's avatar and name); the cursor says pointer
 *   press     (a click, Enter or Space) a popover rises from the words on the popover's own motion,
 *             holding a small Combobox: its field takes focus and every choice stands under it at once,
 *             under "Recent" (the tags you've used, the people you write about)
 *   type      the rows filter as in the Combobox; ↑ ↓ move, ↩ picks
 *   pick      the words are replaced by the pick in place (onWordsChange, then onWordsCommit once:
 *             the host's one undo step); the popover fades and focus returns to the words
 *   leave     Esc or a click outside: nothing changes
 * A pick is a jump, not a step: the words change at once (the drum is for steps). The text stays the
 * source: there is no value beside the words. Reduce Motion: the popover's and the combobox's own.
 * ───────────────────────────────────────────────────────── */

export interface MarkPickProps extends Omit<MarkProps, 'children'> {
  /** The words as written ("#poster", "Sam"). They are the value: rewrite them from onWordsChange. */
  children: string;
  /** What the words can become: strings, or items with a description or an icon (an Avatar for a person). */
  options: (ComboboxItem | string)[];
  /** Every pick: the new words. */
  onWordsChange?: (words: string) => void;
  /** Once per pick: the host's one undo step. */
  onWordsCommit?: (words: string) => void;
}

const PICK = 'mu-cue-pick mark-pick';
const NAMES: Partial<Record<MarkKind, string>> = { tag: 'Tag', 'derived-tag': 'Tag', person: 'Person' };

/** A recognised tag or person you swap for another from a small combobox. Composes Mark; the words stay the source. */
export const MarkPick = React.forwardRef<HTMLSpanElement, MarkPickProps>(function MarkPick(
  { children: words, options, onWordsChange, onWordsCommit, kind, label, className, ...props },
  ref,
) {
  const [open, setOpen] = React.useState(false);
  const name = props['aria-label'] ?? label ?? NAMES[kind] ?? 'Choice';
  const values = options.map((o) => (typeof o === 'string' ? o : o.value));

  const pick = (next: string | null) => {
    setOpen(false);
    if (!next || next === words) return;
    onWordsChange?.(next);
    onWordsCommit?.(next);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Popover.Trigger nativeButton={false}>
        <Mark
          ref={ref}
          kind={kind}
          label={label}
          tabIndex={0}
          aria-label={`${name}, ${words}`}
          className={className ? `${PICK} ${className}` : PICK}
          {...props}
        >
          {words}
        </Mark>
      </Popover.Trigger>
      <Popover.Content side="bottom" align="start" aria-label={`Change ${name.toLowerCase()}`} className="mark-pick-plate">
        <Combobox items={options} recent={values} value={null} onValueChange={pick} aria-label={name} placeholder={`Find a ${name.toLowerCase()}`} size="compact" />
      </Popover.Content>
    </Popover>
  );
});
