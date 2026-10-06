'use client';

import * as React from 'react';
import { Autocomplete as BaseAutocomplete } from '@base-ui/react/autocomplete';
import { InheritColorway, useColorwayAnchor } from '../../theme/colorway';
import { menuParts, ListGlide } from '../menu/menu';
import { Field } from '../field/field';
import { Row } from '../row/row';
import { Spinner } from '../spinner/spinner';
import {
  comboboxParts as cb, comboboxOffset, ComboboxFit, ComboboxGlyph, ComboboxMatched,
  type ComboboxGroup, type ComboboxItem,
} from '../combobox/combobox';
import { CloseIcon, SyncErrorIcon } from '../../icons/components.generated';
import { useWait } from '../../motion/wait';

/* ─────────────────────────────────────────────────────────
 * AUTOCOMPLETE, free text with suggestions, on Base UI Autocomplete
 *
 *   rest      the field well (an optional leading glyph); the text is the value, always
 *   type      Combobox's frosted plate opens with the suggestions that contain what you typed (label
 *             or value), those that start with it first; the typed letters stand in ink, the rest in
 *             ink2; the plate's height settles to the new count. Nothing matched: the plate closes
 *   complete  the rest of the best match is drawn after the caret in ink3, in the input's own type;
 *             Tab or → at the end takes it. Only at the end of the text, only while the plate is open,
 *             only for a suggestion whose value starts with what you typed. The input's value is never
 *             touched until you take it
 *   move      ↑ ↓: the one highlight glides (the menu's live list); the completion follows the keys
 *   choose    ↩ or a click writes the row's value into the field; the plate fades out on release;
 *             nothing is remembered (no check, no chip)
 *   first     highlightFirst: the first row is lit as you type, so ↩ takes it (off: ↩ keeps your text)
 *   clear     the field's clear key pops in once there is text
 *   recent    before typing, on focus: recent searches under an engraved "Recent"
 *   loading   after the wait's show delay the ring takes the clear key's place; rows stay, dimmed;
 *             with no rows yet, Searching…
 *   failed    one row: sync-error, "Couldn't load", Try again (↩ or a click retries)
 *   focus     the flush green ring on the well; invalid the foundation's ring; disabled 40 %
 * Reduce Motion: the height snaps; the fades stay. Everything drawn is Combobox's (its exported parts)
 * on the field, menu and combobox recipes; Autocomplete adds the completion and its keys.
 * ───────────────────────────────────────────────────────── */

/** A suggestion: `value` is what is written into the field, `label` what the row shows. */
export type AutocompleteItem = ComboboxItem;
/** Suggestions under an engraved label. */
export type AutocompleteGroup = ComboboxGroup;

export interface AutocompleteProps {
  /** The suggestions: strings, items with detail, or groups of them. */
  items: (AutocompleteItem | string)[] | AutocompleteGroup[];
  /** The text. It is the value, whatever it is: suggestions only help finish it. */
  value?: string;
  defaultValue?: string;
  /** Hears every keystroke, a taken completion, a chosen suggestion and the clear key. */
  onValueChange?: (value: string) => void;
  placeholder?: string;
  /** Names the field for assistive tech when there is no visible label. */
  'aria-label'?: string;
  /** The form field's name: the text is submitted with the form. */
  name?: string;
  required?: boolean;
  disabled?: boolean;
  /** The text will not be accepted: the invalid ring, and aria-invalid on the input. */
  invalid?: boolean;
  /** large (44, the palette's field), regular (32, the default) or compact (28). */
  size?: 'large' | 'regular' | 'compact';
  /** A glyph in the well's leading slot, as an element (`<SearchIcon />`). None by default. */
  icon?: React.ReactElement;
  /** The rest of the best match drawn after the caret; Tab or → takes it. Default true. */
  inline?: boolean;
  /** Light the first suggestion as you type, so ↩ takes it. Default false: ↩ keeps what you typed. */
  highlightFirst?: boolean;
  /** false: the items are already the suggestions (a search you run yourself); they are not filtered here. */
  filter?: boolean;
  /** A search is under way: after the show delay the ring stands in the clear key's place and the rows dim. */
  loading?: boolean;
  /** The search failed: one row says "Couldn't load" and offers Try again, which calls `onRetry`. */
  failed?: boolean;
  onRetry?: () => void;
  /** Recent searches, shown under "Recent" when the field is focused and empty. */
  recent?: string[];
  /** How many suggestions are drawn. Default the recipe's (8): past that, type more. */
  limit?: number;
  className?: string;
}

/* The plate's rows as Base UI sees them. */
interface ViewRow {
  kind: 'item' | 'retry';
  key: string;
  /** What choosing it writes. */
  fill: string;
  label: string;
  description?: string;
  icon?: AutocompleteItem['icon'];
  disabled?: boolean;
}
type ViewGroup = { value: string; label?: string; items: ViewRow[] };

// The large well (the palette field's sizes); regular and compact are Combobox's. Module values stay literals,
// so an app that imports another component drops this module whole.
const LARGE = 'gap-field-field-gap h-field-field-height pl-field-field-pad-left pr-field-field-pad-right rounded-field-field-radius [&_.mu-field-icon>svg]:size-field-field-glyph';
const TYPE = { large: 'type-field-field', regular: 'type-ui', compact: 'type-ui' };
const LINE = 'mu-autocomplete-line relative flex flex-1 min-w-0 h-full';
const INPUT = 'mu-autocomplete-input flex-1 min-w-0 h-full p-0 border-0 outline-none bg-transparent text-field-field-ink caret-field-field-caret placeholder:text-field-field-hint disabled:cursor-default';
// The completion is drawn in the input's own box and type: the typed part invisible, the rest in ink3.
const GHOST = 'mu-autocomplete-completion absolute inset-0 flex items-center overflow-hidden whitespace-pre pointer-events-none';
const GHOST_TYPED = 'invisible';
const GHOST_REST = 'mu-autocomplete-rest text-ink3';

/** How many suggestions are drawn by default: the recipe's self.limit. */
function defaultLimit() {
  if (typeof window === 'undefined') return 8;
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--mu-r-autocomplete-self-limit')) || 8;
}

const cx = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join(' ');
const fold = (s: string) => s.toLocaleLowerCase();
const isGroups = (items: AutocompleteProps['items']): items is AutocompleteGroup[] =>
  items.length > 0 && typeof items[0] === 'object' && 'items' in items[0];
const toItem = (i: AutocompleteItem | string): AutocompleteItem => (typeof i === 'string' ? { value: i, label: i } : i);
const toRow = (i: AutocompleteItem): ViewRow => ({ kind: 'item', key: i.value, fill: i.value, label: i.label, description: i.description, icon: i.icon, disabled: i.disabled });
const starts = (row: ViewRow, q: string) => fold(row.fill).startsWith(fold(q)) || fold(row.label).startsWith(fold(q));
/** A row whose value starts with the text, and is longer: its rest can be drawn after the caret. */
const completes = (row: ViewRow | undefined, text: string): row is ViewRow =>
  !!row && row.kind === 'item' && !row.disabled && row.fill.length > text.length && fold(row.fill).startsWith(fold(text));

function Option({ row, query }: { row: ViewRow; query: string }) {
  return (
    <BaseAutocomplete.Item value={row} disabled={row.disabled} className={cx(cb.ROW, 'mu-autocomplete-row', row.description && cb.DETAIL)}>
      {row.icon && <Row.Lead aria-hidden className={cb.LEAD}><ComboboxGlyph icon={row.icon} /></Row.Lead>}
      <Row.Text className={cb.TEXT}>
        <span className={menuParts.LABEL}><ComboboxMatched label={row.label} query={query} /></span>
        {row.description && <span className={cb.DESC}>{row.description}</span>}
      </Row.Text>
    </BaseAutocomplete.Item>
  );
}

/** Free text with suggestions: the text is the value; the list helps finish it. */
export function Autocomplete(props: AutocompleteProps) {
  const {
    items, placeholder, name, required, disabled, invalid, size = 'regular', icon, inline = true, highlightFirst = false,
    filter = true, loading, failed, onRetry, recent, limit = defaultLimit(), className,
  } = props;

  const groups = React.useMemo(
    () => (isGroups(items) ? items.map((g) => ({ label: g.label, items: g.items.map(toItem) })) : [{ label: '', items: items.map(toItem) }]),
    [items],
  );

  const controlled = props.value !== undefined;
  const [own, setOwn] = React.useState(props.defaultValue ?? '');
  const text = controlled ? (props.value as string) : own;
  const write = (next: string) => {
    if (!controlled) setOwn(next);
    props.onValueChange?.(next);
  };

  const [open, setOpen] = React.useState(false);
  // Try again keeps the plate open (Base UI closes it on any row press), so the new suggestions arrive in it.
  const retrying = React.useRef(false);
  const retry = () => { retrying.current = true; onRetry?.(); };
  // The row lit by the keys (or by highlightFirst); the pointer doesn't move the completion.
  const [lit, setLit] = React.useState<ViewRow>();
  // The caret is at the end of the text, with nothing selected: only then is a completion drawn.
  const [atEnd, setAtEnd] = React.useState(true);

  const well = React.useRef<HTMLDivElement | null>(null);
  const wait = useWait(loading ? 'working' : 'idle', well);

  const q = text.trim();
  const view = React.useMemo(() => {
    // Try again writes nothing: its fill is the text as it is, in case Base UI fills the input on ↩.
    if (failed) return [{ value: 'failed', items: [{ kind: 'retry', key: 'retry', fill: text, label: 'Couldn’t load' } as ViewRow] }];
    const out: ViewGroup[] = [];
    if (!q) {
      if (recent?.length) {
        const known = new Map(groups.flatMap((g) => g.items).map((i) => [i.value, i]));
        out.push({ value: 'recent', label: 'Recent', items: recent.map((r) => toRow(known.get(r) ?? { value: r, label: r })) });
      }
      return out;
    }
    let shown = 0;
    for (const g of groups) {
      const rows = g.items.map(toRow).filter((r) => !filter || fold(r.label).includes(fold(q)) || fold(r.fill).includes(fold(q)));
      // An autocomplete finishes what you started: rows that start with the text come first.
      const ranked = [...rows.filter((r) => starts(r, q)), ...rows.filter((r) => !starts(r, q))].slice(0, Math.max(0, limit - shown));
      shown += ranked.length;
      if (ranked.length) out.push({ value: `group:${g.label}`, label: g.label || undefined, items: ranked });
    }
    return out;
  }, [failed, text, q, recent, groups, filter, limit]);

  const rows = view.flatMap((g) => g.items);
  const quiet = !failed && !rows.length && wait.showing ? 'Searching…' : '';
  // Nothing to suggest is not news: the plate closes and the text stays as it is.
  const shown = open && (rows.length > 0 || !!quiet);

  const current = lit && rows.find((r) => r.key === lit.key);
  const best = completes(current, text) ? current : rows.find((r) => completes(r, text));
  const completion = inline && shown && atEnd && !!text && best ? best : undefined;

  const at = useColorwayAnchor();
  const setWell = React.useCallback((el: HTMLDivElement | null) => { at.ref(el); well.current = el; }, [at]);
  const ring = wait.showing && <Spinner phase={wait.phase} label="Searching" />;

  const caret = (el: HTMLInputElement) => setAtEnd(el.selectionStart === el.value.length && el.selectionEnd === el.value.length);

  return (
    <BaseAutocomplete.Root
      filteredItems={view}
      itemToStringValue={(row: ViewRow) => row.fill}
      value={text}
      onValueChange={(next) => { setLit(undefined); write(next); }}
      open={shown}
      onOpenChange={(next) => {
        if (!next && retrying.current) { retrying.current = false; return; }
        setOpen(next);
      }}
      onItemHighlighted={(row: ViewRow | undefined, details) => setLit(details.reason === 'pointer' ? undefined : row)}
      autoHighlight={highlightFirst}
      name={name}
      required={required}
      disabled={disabled}
    >
      <BaseAutocomplete.InputGroup
        ref={setWell}
        data-invalid={invalid ? '' : undefined}
        data-size={size}
        className={cx(cb.GROUP, 'mu-autocomplete has-[input[data-invalid]]:invalid-ring', size === 'large' ? LARGE : cb.SIZE[size], className)}
      >
        {icon && <Field.Icon>{icon}</Field.Icon>}
        <span className={LINE}>
          <BaseAutocomplete.Input
            className={cx(INPUT, TYPE[size])}
            placeholder={placeholder}
            aria-label={props['aria-label']}
            aria-invalid={invalid || undefined}
            aria-busy={wait.busy || undefined}
            onFocus={() => { if (!q && recent?.length) setOpen(true); }}
            onSelect={(e) => caret(e.currentTarget)}
            onKeyDown={(e) => {
              // ↩ with no row lit submits the form, as a lone text field would: Base UI's hidden input is a second
              // field, which stops the browser's implicit submission.
              const el = e.currentTarget;
              if (e.key === 'Enter' && !e.nativeEvent.isComposing && el.form && !el.getAttribute('aria-activedescendant')) {
                e.preventDefault();
                el.form.requestSubmit();
                return;
              }
              // Tab or → (or End) at the end takes the completion; Shift-Tab and other keys go on as usual.
              if (!completion || e.shiftKey || e.altKey || e.metaKey || e.ctrlKey) return;
              if (e.key !== 'Tab' && e.key !== 'ArrowRight' && e.key !== 'End') return;
              e.preventDefault();
              e.preventBaseUIHandler();
              setLit(undefined);
              setAtEnd(true);
              write(completion.fill);
            }}
          />
          {completion && (
            <span aria-hidden className={cx(GHOST, TYPE[size])}>
              <span className={GHOST_TYPED}>{text}</span>
              <span className={GHOST_REST}>{completion.fill.slice(text.length)}</span>
            </span>
          )}
        </span>
        <Field.Trail>
          {ring || <BaseAutocomplete.Clear keepMounted render={<Field.Key label="Clear" icon={<CloseIcon />} shown={text.length > 0} disabled={disabled} />} />}
        </Field.Trail>
      </BaseAutocomplete.InputGroup>
      <BaseAutocomplete.Portal>
        <InheritColorway anchor={at} />
        <BaseAutocomplete.Positioner className={cb.POSITIONER} sideOffset={comboboxOffset()} align="start" collisionPadding={8}>
          <BaseAutocomplete.Popup className={cx(cb.POP, 'mu-autocomplete-pop combobox-pop-width')} aria-busy={wait.busy || undefined}>
            <ComboboxFit>
              <div className={cb.SCROLL} data-waiting={wait.showing && rows.length ? '' : undefined}>
                <ListGlide />
                {quiet && <div role="status" className={cb.QUIET}>{quiet}</div>}
                <BaseAutocomplete.List className={cb.LIST}>
                  {(group: ViewGroup) => (
                    <BaseAutocomplete.Group key={group.value} items={group.items} data-group={group.value}>
                      {group.label && <BaseAutocomplete.GroupLabel className={cb.LABEL}>{group.label}</BaseAutocomplete.GroupLabel>}
                      <BaseAutocomplete.Collection>
                        {(row: ViewRow) => (
                          row.kind === 'retry'
                            ? <RetryOption key={row.key} row={row} onRetry={retry} />
                            : <Option key={row.key} row={row} query={q} />
                        )}
                      </BaseAutocomplete.Collection>
                    </BaseAutocomplete.Group>
                  )}
                </BaseAutocomplete.List>
              </div>
            </ComboboxFit>
          </BaseAutocomplete.Popup>
        </BaseAutocomplete.Positioner>
      </BaseAutocomplete.Portal>
    </BaseAutocomplete.Root>
  );
}

/** Try again runs instead of writing into the field. */
function RetryOption({ row, onRetry }: { row: ViewRow; onRetry?: () => void }) {
  return (
    <BaseAutocomplete.Item
      value={row}
      data-kind="retry"
      className={cx(cb.ROW, 'mu-autocomplete-row')}
      onClick={(e) => { e.preventBaseUIHandler(); onRetry?.(); }}
    >
      <Row.Lead aria-hidden className={cb.LEAD}><SyncErrorIcon /></Row.Lead>
      <Row.Text className={cb.TEXT}><span className={menuParts.LABEL}>{row.label}</span></Row.Text>
      <Row.Trail className={cb.TRY}>Try again</Row.Trail>
    </BaseAutocomplete.Item>
  );
}
