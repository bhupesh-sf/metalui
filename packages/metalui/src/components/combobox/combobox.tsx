'use client';

import * as React from 'react';
import { Combobox as BaseCombobox } from '@base-ui/react/combobox';
import { InheritColorway, useColorwayAnchor } from '../../theme/colorway';
import { menuParts, ListGlide } from '../menu/menu';
import { Field } from '../field/field';
import { Row } from '../row/row';
import { Chip } from '../chip/chip';
import { IconButton } from '../icon-button/icon-button';
import { Spinner } from '../spinner/spinner';
import { buttonClasses } from '../button/button';
import { GlyphIcon } from '../../icons/Icon';
import { CheckIcon, CloseIcon, PlusIcon, SyncErrorIcon } from '../../icons/components.generated';
import { MorphPair, type GlyphParts } from '../../icons/MorphIcon';
import { chevronMorph, searchMorph, type MorphIconName } from '../../icons/morph.generated';
import { useIsoLayoutEffect } from '../../motion/layout-effect';
import { leaveRows, useRowMotion } from '../../motion/rows';
import { useWait } from '../../motion/wait';

/* ─────────────────────────────────────────────────────────
 * COMBOBOX, type to find one of many, on Base UI Combobox
 *
 *   rest      a field well led by the search glyph; the trail's chevron key opens the whole list
 *   type      the menu's frosted plate opens (fades in on settle); rows filter at once, never
 *             lagging the fingers, while the plate's height settles to the new count on the
 *             settle spring, so it never snaps size. In each row the typed letters stand in ink,
 *             the rest in ink2: you see why it matched
 *   move      ↑ ↓ or the pointer: the one highlight glides row to row (the menu's live list)
 *   choose    ↩ or a click fills the field; the plate fades out on release. A pick with a glyph
 *             shows it in the well's leading slot, morphing from the search glyph
 *   open      the chevron key turns (one glyph, morphing) while the plate is open
 *   clear     the clear key pops in once there is something to clear (the field's mini key)
 *   groups    engraved labels that stay at the plate's top while their rows scroll
 *   recent    before anything is typed: recent picks under an engraved "Recent"
 *   create    when nothing matches exactly: a plus row, "Create 'Lisbon'", behind a hairline
 *   commands  action rows after the items, behind a hairline, each leading with its glyph
 *   loading   after the wait's show delay the spinner's ring takes the clear key's place;
 *             the rows stay, dimmed to the spinner's item look
 *   failed    one row: sync-error, "Couldn't load", Try again (↩ or a click retries)
 *   nothing   one quiet line with the query in it: No matches for "lisb"
 *   several   chosen values are chips in the well: they land on the object spring and leave
 *             on the release spring (the rows' motion); the well grows a line when they wrap.
 *             The query and the plate stay after a pick. Backspace on an empty query takes the
 *             last chip (its focus ring), a second Backspace removes it
 *   button    trigger="button": a raised cap with the pick and a chevron; the plate opens under
 *             it with the search well at its top (pickers in toolbars and rows)
 *   focus     the flush green ring on the well
 *   invalid   the foundation's invalid ring; disabled 40 % (the form field's looks and sizes)
 * Reduce Motion: the height snaps, chips come and go at once, glyphs change in place; fades stay.
 * The well and its keys are the field's, the plate and rows the menu recipe; combobox adds the fit.
 * ───────────────────────────────────────────────────────── */

const GROUP = 'mu-combobox relative flex items-center min-w-combobox-min-width box-border cursor-text recipe-well-field text-field-field-hint focus-within:focus-ring-flush data-disabled:opacity-field-state-disabled data-disabled:cursor-default data-invalid:invalid-ring';
const SIZE = {
  regular: 'gap-field-regular-gap h-field-regular-height pl-field-regular-pad-left pr-field-regular-pad-right rounded-field-regular-radius [&_.mu-field-icon>svg]:size-field-regular-glyph',
  compact: 'gap-field-compact-gap h-field-compact-height pl-field-compact-pad-left pr-field-compact-pad-right rounded-field-compact-radius [&_.mu-field-icon>svg]:size-field-compact-glyph',
};
const INPUT = 'mu-combobox-input flex-1 min-w-0 h-full p-0 border-0 outline-none bg-transparent type-ui text-field-field-ink caret-field-field-caret placeholder:text-field-field-hint disabled:cursor-default';
// Several values: the well grows a line at a time; the glyph and the trail sit on the first line.
const CHIPS_WELL = 'combobox-chips! items-start';
const CHIPS = 'mu-combobox-chips flex flex-1 flex-wrap items-center gap-combobox-chips-gap min-w-0';
const CHIPS_INPUT = 'combobox-line flex-1 min-w-combobox-chips-input-min';
const LINE = 'combobox-line inline-flex items-center';
const CHIP = 'mu-combobox-chip recipe-combobox-chip! outline-none focus-visible:focus-ring-flush';
const CHIP_GLYPH = 'size-attachment-remove-glyph';
const POSITIONER = 'mu-menu-positioner z-menu-z';
const POP = `${menuParts.PLATE} relative mu-combobox-pop`;
const FIT = 'mu-combobox-fit combobox-fit';
const SCROLL = 'mu-combobox-scroll combobox-scroll outline-none';
const LIST = 'mu-combobox-list outline-none';
const LABEL = `mu-combobox-label ${menuParts.HEADING} combobox-label`;
const ROW = `mu-combobox-row ${menuParts.LIVE_ROW}`;
const DETAIL = 'combobox-detail!';
const LEAD = `${menuParts.GLYPH}`;
const TEXT = 'flex flex-col gap-combobox-detail-gap';
const DESC = 'mu-combobox-detail type-meta text-ink2 overflow-hidden text-ellipsis whitespace-nowrap';
const MATCH_REST = 'text-ink2';
const CHECK = 'mu-combobox-check inline-grid flex-none text-ink2 [&>svg]:size-menu-row-glyph';
const TRY = 'mu-combobox-retry type-meta text-ink2';
const QUIET = 'mu-combobox-empty px-menu-row-pad py-menu-heading-pad-bottom type-ui text-ink3';
const CAP = 'mu-combobox-trigger min-w-combobox-button-min-width max-w-combobox-button-max-width justify-start data-popup-open:translate-y-button-travel';
const CAP_PRESSED = { regular: 'data-popup-open:recipe-button-pressed', compact: 'data-popup-open:recipe-button-compact-pressed' };
const CAP_TEXT = 'mu-combobox-value flex-1 min-w-0 text-left overflow-hidden text-ellipsis whitespace-nowrap';
const CAP_HINT = 'text-ink3';
const CAP_CHEVRON = 'mu-combobox-chevron flex-none text-ink2';

const cx = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join(' ');

/** Combobox's drawing, shared with Autocomplete: the well, the plate, its rows, labels and quiet line. */
export const comboboxParts = { GROUP, SIZE, INPUT, POSITIONER, POP, SCROLL, LIST, LABEL, ROW, DETAIL, LEAD, TEXT, DESC, TRY, QUIET } as const;

export function comboboxOffset() {
  if (typeof window === 'undefined') return 6;
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--mu-menu-offset')) || 6;
}

/** The plate's height follows its content on the settle spring. */
export function ComboboxFit({ children }: { children: React.ReactNode }) {
  const inner = React.useRef<HTMLDivElement>(null);
  const [height, setHeight] = React.useState<number>();
  useIsoLayoutEffect(() => {
    const el = inner.current;
    if (!el) return;
    setHeight(el.offsetHeight);
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setHeight(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return <div className={FIT} style={{ height }}><div ref={inner}>{children}</div></div>;
}

/** One thing that can be found. */
export interface ComboboxItem<V extends string = string> {
  value: V;
  label: string;
  /** A second line in ink2, so similar items can be told apart ("Portugal", "maria@studio.pt"). */
  description?: string;
  /** A glyph of the set as its parts, `{ glyph: tagGlyph, morph: tagMorph }` (drawn in the row with its act on hover, and in
   *  the well once picked, morphing from search), or an element such as an `Avatar` (shown as it is). */
  icon?: GlyphParts | React.ReactElement;
  disabled?: boolean;
}

/** Items under an engraved label. */
export interface ComboboxGroup<V extends string = string> {
  label: string;
  items: (ComboboxItem<V> | V)[];
}

/** A command row after the items ("Manage labels…"): it runs and closes the plate; it never becomes the value. */
export interface ComboboxAction {
  id: string;
  label: string;
  /** The row's glyph, as an element: `<SettingsIcon />`. */
  icon: React.ReactElement;
  onAction: () => void;
}

interface ComboboxCommon<V extends string> {
  /** Everything that can be found: strings, items with detail, or groups of them. */
  items: (ComboboxItem<V> | V)[] | ComboboxGroup<V>[];
  placeholder?: string;
  /** Names the field for assistive tech when there is no visible label. */
  'aria-label'?: string;
  disabled?: boolean;
  /** The field's form sizes: regular (32, the default) or compact (28). */
  size?: 'regular' | 'compact';
  /** The value will not be accepted: the invalid ring, and aria-invalid on the input. */
  invalid?: boolean;
  /** Said in the quiet line when nothing matches. Default: No matches for "<query>". */
  emptyText?: string | ((query: string) => string);
  /** Hears every change of the typed query (for a search you run yourself). */
  onQueryChange?: (query: string) => void;
  /** false: the items are already the matches (a search you run yourself); rows are not filtered here. */
  filter?: boolean;
  /** A search is under way: after the show delay the ring stands in the clear key's place and the rows dim. */
  loading?: boolean;
  /** The search failed: one row says "Couldn't load" and offers Try again, which calls `onRetry`. */
  failed?: boolean;
  onRetry?: () => void;
  /** Values picked lately, shown under "Recent" before anything is typed. */
  recent?: V[];
  /** Offered when nothing matches exactly: a "Create '<query>'" row. Return the new item's value to choose it. */
  onCreate?: (label: string) => V | void;
  /** Command rows after the items, behind a hairline. */
  actions?: ComboboxAction[];
  /** How many matches are drawn; past it a quiet line says how many more (type to narrow). Default 100. */
  limit?: number;
  /** "field" (the default): type into the well. "button": a cap opens the plate, with the search inside it. */
  trigger?: 'field' | 'button';
  className?: string;
}

interface ComboboxSingle<V extends string> extends ComboboxCommon<V> {
  multiple?: false;
  value?: V | null;
  defaultValue?: V | null;
  onValueChange?: (value: V | null) => void;
}

interface ComboboxMultiple<V extends string> extends ComboboxCommon<V> {
  /** Several values: chosen ones become chips in the well. */
  multiple: true;
  value?: V[];
  defaultValue?: V[];
  onValueChange?: (value: V[]) => void;
}

export type ComboboxProps<V extends string = string> = ComboboxSingle<V> | ComboboxMultiple<V>;

/* The plate's rows as Base UI sees them: every row is in a group (an unlabelled one for a flat list). */
type RowKind = 'item' | 'create' | 'action' | 'retry';
interface ViewRow {
  kind: RowKind;
  value: string;
  label: string;
  description?: string;
  icon?: GlyphParts | React.ReactElement;
  disabled?: boolean;
  run?: () => void;
}
type ViewGroup = { value: string; label?: string; apart?: boolean; more?: number; items: ViewRow[] };

const SPECIAL = '\u0000';
const isGroups = <V extends string>(items: ComboboxCommon<V>['items']): items is ComboboxGroup<V>[] =>
  items.length > 0 && typeof items[0] === 'object' && 'items' in items[0];
const toItem = <V extends string>(i: ComboboxItem<V> | V): ComboboxItem<V> => (typeof i === 'string' ? { value: i, label: i } : i);
const fold = (s: string) => s.toLocaleLowerCase();

/** The label with the typed letters in ink and the rest in ink2. */
export function ComboboxMatched({ label, query }: { label: string; query: string }) {
  const at = query ? fold(label).indexOf(fold(query)) : -1;
  if (at < 0) return <>{label}</>;
  // ponytail: assumes lower-casing keeps lengths (true outside a few scripts, e.g. Turkish İ)
  return (
    <>
      <span className={MATCH_REST}>{label.slice(0, at)}</span>
      <span className="mu-combobox-match">{label.slice(at, at + query.length)}</span>
      <span className={MATCH_REST}>{label.slice(at + query.length)}</span>
    </>
  );
}

const isParts = (icon: GlyphParts | React.ReactElement | undefined): icon is GlyphParts => !!icon && 'glyph' in icon && 'morph' in icon;

/** An item's glyph: its parts drawn as a glyph, or the element as it is. */
export function ComboboxGlyph({ icon }: { icon: GlyphParts | React.ReactElement }) {
  return isParts(icon) ? <GlyphIcon glyph={icon.glyph} /> : icon;
}

// The glyphs the combobox morphs itself (MorphPair ships just their parts); a pick's glyph joins search in the well.
const SEARCH = { search: searchMorph };
const CHEVRON = { chevron: chevronMorph };

function Option({ row, query }: { row: ViewRow; query: string }) {
  const lead = row.kind === 'create' ? <PlusIcon /> : row.kind === 'retry' ? <SyncErrorIcon /> : row.icon;
  return (
    <BaseCombobox.Item
      value={row.value}
      disabled={row.disabled}
      data-kind={row.kind}
      className={cx(ROW, row.description && DETAIL)}
      // Create, commands and Try again run instead of choosing.
      onClick={row.run ? (e) => { e.preventBaseUIHandler(); row.run?.(); } : undefined}
    >
      {lead && <Row.Lead aria-hidden className={LEAD}><ComboboxGlyph icon={lead} /></Row.Lead>}
      <Row.Text className={TEXT}>
        <span className={menuParts.LABEL}>{row.kind === 'item' ? <ComboboxMatched label={row.label} query={query} /> : row.label}</span>
        {row.description && <span className={DESC}>{row.description}</span>}
      </Row.Text>
      {row.kind === 'retry' && <Row.Trail className={TRY}>Try again</Row.Trail>}
      {row.kind === 'item' && <BaseCombobox.ItemIndicator className={CHECK}><CheckIcon /></BaseCombobox.ItemIndicator>}
    </BaseCombobox.Item>
  );
}

/** Type to find one of many (or several). */
export function Combobox<V extends string = string>(props: ComboboxProps<V>) {
  const {
    items, placeholder, disabled, size = 'regular', invalid, emptyText, onQueryChange, filter = true, loading, failed, onRetry,
    recent, onCreate, actions, limit = 100, trigger = 'field', className,
  } = props;
  const multiple = props.multiple === true;
  const button = trigger === 'button';

  const groups = React.useMemo(
    () => (isGroups(items) ? items.map((g) => ({ label: g.label, items: g.items.map(toItem) })) : [{ label: '', items: items.map(toItem) }]),
    [items],
  );
  const byValue = React.useMemo(() => new Map(groups.flatMap((g) => g.items).map((i) => [i.value as string, i])), [groups]);
  const labelOf = React.useCallback((v: string | null | undefined) => (v == null ? '' : byValue.get(v)?.label ?? v), [byValue]);

  // The value, held here as a list either way (one or none for a single value).
  const asList = (v: V | V[] | null | undefined): V[] => (Array.isArray(v) ? v : v == null ? [] : [v]);
  const controlled = props.value !== undefined;
  const [own, setOwn] = React.useState<V[]>(() => asList(props.defaultValue));
  const chosen = controlled ? asList(props.value) : own;
  const chosenKey = chosen.join('\u0001');

  const [query, setQueryState] = React.useState(() => (multiple || button ? '' : labelOf(chosen[0])));
  const setQuery = (q: string) => { setQueryState(q); onQueryChange?.(q); };
  const [open, setOpen] = React.useState(false);
  const keep = React.useRef(false);

  // A value set from outside (or cleared) shows in a single field's input while the plate is shut.
  React.useEffect(() => {
    if (!multiple && !button && !open) setQueryState(labelOf(chosen[0]));
  }, [chosenKey, labelOf]);

  const chips = React.useRef<HTMLDivElement>(null);
  useRowMotion(chips, chosenKey, true);
  const well = React.useRef<HTMLDivElement | null>(null);
  const wait = useWait(loading ? 'working' : 'idle', well);

  const emit = (next: V[]) => {
    if (!controlled) setOwn(next);
    if (props.multiple === true) props.onValueChange?.(next);
    else props.onValueChange?.(next[0] ?? null);
  };
  // Chips that go leave first (the rows' motion), then the value changes.
  const commit = (next: V[]) => {
    const gone = chosen.filter((v) => !next.includes(v));
    const list = chips.current;
    if (!multiple || !gone.length || !list) return emit(next);
    leaveRows(gone.map((v) => list.querySelector<HTMLElement>(`:scope > [data-row="${CSS.escape(v)}"]`)), () => emit(next));
  };

  // What the plate shows.
  const trimmed = query.trim();
  // A single pick shown in its own input is not a query: reopening shows every row.
  const q = !multiple && !button && chosen.length && trimmed === labelOf(chosen[0]) ? '' : trimmed;
  const view = React.useMemo(() => {
    const out: ViewGroup[] = [];
    if (failed) {
      out.push({ value: 'failed', items: [{ kind: 'retry', value: `${SPECIAL}retry`, label: 'Couldn’t load', run: () => onRetry?.() }] });
    } else {
      const recentRows = !q && recent?.length ? recent.map((v) => byValue.get(v)).filter((i): i is ComboboxItem<V> => !!i) : [];
      if (recentRows.length) out.push({ value: 'recent', label: 'Recent', items: recentRows.map((i) => ({ kind: 'item', ...i })) });
      const skip = new Set<string>(recentRows.map((i) => i.value));
      let shown = 0;
      let last: ViewGroup | undefined;
      let more = 0;
      for (const g of groups) {
        const matches = g.items.filter((i) => !skip.has(i.value) && (!q || !filter || fold(i.label).includes(fold(q))));
        const take = matches.slice(0, Math.max(0, limit - shown));
        more += matches.length - take.length;
        shown += take.length;
        if (!take.length) continue;
        last = { value: `group:${g.label}`, label: g.label || undefined, items: take.map((i) => ({ kind: 'item', ...i })) };
        out.push(last);
      }
      if (last && more) last.more = more;
      const exact = [...byValue.values()].some((i) => fold(i.label) === fold(q));
      if (onCreate && q && !exact) {
        out.push({ value: 'create', apart: out.length > 0, items: [{ kind: 'create', value: `${SPECIAL}create`, label: `Create “${q}”`, run: () => create(q) }] });
      }
    }
    if (actions?.length) {
      out.push({ value: 'actions', apart: out.length > 0, items: actions.map((a) => ({ kind: 'action', value: `${SPECIAL}action:${a.id}`, label: a.label, icon: a.icon, run: () => act(a) })) });
    }
    return out;
    // create and act read the latest state through the closure; chosenKey re-runs it after a pick
  }, [failed, q, recent, groups, byValue, filter, limit, onCreate, actions, onRetry, chosenKey]);
  const matched = view.some((g) => g.items.some((r) => r.kind === 'item'));

  function create(label: string) {
    const made = onCreate?.(label);
    if (made == null) return setOpen(false);
    if (multiple) { commit([...chosen, made]); setQuery(''); return; }
    commit([made]);
    if (!button) setQueryState(label);
    setOpen(false);
  }
  function act(a: ComboboxAction) {
    a.onAction();
    setOpen(false);
    if (!multiple && !button) setQueryState(labelOf(chosen[0]));
  }

  let quiet = '';
  if (!failed && !matched) {
    if (wait.busy) quiet = wait.showing ? 'Searching…' : '';
    else if (q) quiet = typeof emptyText === 'function' ? emptyText(q) : emptyText ?? `No matches for “${q}”`;
  }

  // The pick's glyph stands in the well's leading slot, morphing from search.
  const pick = !multiple ? byValue.get(chosen[0] ?? '') : undefined;
  const parts = isParts(pick?.icon) ? pick.icon : undefined;
  const lead = pick?.icon && !isParts(pick.icon) ? pick.icon : (
    <MorphPair glyphs={parts ? { ...SEARCH, [parts.glyph.name]: parts.morph } : SEARCH} name={parts ? (parts.glyph.name as MorphIconName) : 'search'} />
  );

  const at = useColorwayAnchor();
  const setWell = React.useCallback((el: HTMLDivElement | null) => { at.ref(el); well.current = el; }, [at]);
  const chevron = <MorphPair glyphs={CHEVRON} name="chevron" turn={open ? 180 : 0} />;
  const clearable = chosen.length > 0 || query.length > 0;
  const ring = wait.showing && <Spinner phase={wait.phase} label="Searching" />;

  const input = (
    <BaseCombobox.Input
      className={cx(INPUT, multiple && !button && CHIPS_INPUT)}
      // From a button, the cap carries the name and the pick; the search inside the plate is its own field.
      placeholder={button ? 'Search' : multiple && chosen.length ? undefined : placeholder}
      aria-label={button ? `Search ${props['aria-label'] ?? placeholder ?? ''}`.trim() : props['aria-label']}
      aria-invalid={invalid || undefined}
      aria-busy={wait.busy || undefined}
      onFocus={() => { if (!button && !q && recent?.length) setOpen(true); }}
      onKeyDown={(e) => {
        // Several values: the first Backspace on an empty query takes the last chip; the chip's own Backspace removes it.
        if (!multiple || button || e.key !== 'Backspace' || e.currentTarget.value || !chosen.length) return;
        const last = chips.current?.querySelector<HTMLElement>(':scope > [data-row]:last-of-type');
        if (!last) return;
        e.preventDefault();
        e.preventBaseUIHandler();
        last.focus();
      }}
    />
  );

  const plate = (
    <BaseCombobox.Portal>
      <InheritColorway anchor={at} />
      <BaseCombobox.Positioner className={POSITIONER} sideOffset={comboboxOffset()} align="start" collisionPadding={8}>
        <BaseCombobox.Popup className={cx(POP, button ? 'combobox-pop-button' : 'combobox-pop-width')} aria-busy={wait.busy || undefined}>
          {button && (
            <div className={cx(GROUP, SIZE.regular, 'mu-combobox-search mb-menu-pad')}>
              <Field.Icon><MorphPair glyphs={SEARCH} name="search" /></Field.Icon>
              {input}
              <Field.Trail>{ring || <Field.Key label="Clear" icon={<CloseIcon />} shown={query.length > 0} onClick={() => setQuery('')} />}</Field.Trail>
            </div>
          )}
          <ComboboxFit>
            <div className={SCROLL} data-waiting={wait.showing && matched ? '' : undefined}>
              <ListGlide />
              {quiet && <div role="status" className={QUIET}>{quiet}</div>}
              <BaseCombobox.List className={LIST}>
                {(group: ViewGroup) => (
                  <React.Fragment key={group.value}>
                    {group.apart && <BaseCombobox.Separator className={menuParts.SEP} />}
                    <BaseCombobox.Group items={group.items} data-group={group.value}>
                      {group.label && <BaseCombobox.GroupLabel className={LABEL}>{group.label}</BaseCombobox.GroupLabel>}
                      <BaseCombobox.Collection>{(row: ViewRow) => <Option key={row.value} row={row} query={q} />}</BaseCombobox.Collection>
                      {group.more ? <div className={QUIET}>{group.more} more {group.more === 1 ? 'match' : 'matches'}; type to narrow</div> : null}
                    </BaseCombobox.Group>
                  </React.Fragment>
                )}
              </BaseCombobox.List>
            </div>
          </ComboboxFit>
        </BaseCombobox.Popup>
      </BaseCombobox.Positioner>
    </BaseCombobox.Portal>
  );

  const root = {
    filteredItems: view,
    value: multiple ? (chosen as string[]) : ((chosen[0] as string | undefined) ?? null),
    onValueChange: (next: string | string[] | null) => {
      // Several values: the pick keeps the plate open and the query as it is (Base UI would close and clear it in the same event).
      const list = asList(next as V | V[] | null);
      if (multiple && list.length > chosen.length) { keep.current = true; window.setTimeout(() => { keep.current = false; }); }
      commit(list);
    },
    inputValue: query,
    onInputValueChange: (next: string) => {
      if (keep.current) return;
      setQuery(next);
    },
    open,
    onOpenChange: (next: boolean) => {
      if (!next && keep.current) return;
      setOpen(next);
      if (next && button) setQuery('');
    },
    itemToStringLabel: (v: string) => labelOf(v),
    disabled,
  };

  if (button) {
    const said = chosen.map(labelOf).join(', ');
    const cap = cx(buttonClasses('standard', size === 'compact' ? 'compact' : 'default'), CAP, CAP_PRESSED[size], className);
    return (
      <BaseCombobox.Root<string, boolean, ViewRow> multiple={multiple} {...root}>
        <BaseCombobox.Trigger ref={at.ref} className={cap} aria-label={props['aria-label']} data-invalid={invalid ? '' : undefined}>
          {pick?.icon && <span aria-hidden className={LEAD}><ComboboxGlyph icon={pick.icon} /></span>}
          <span className={cx(CAP_TEXT, !said && CAP_HINT)}>{said || placeholder}</span>
          <span aria-hidden className={CAP_CHEVRON}>{chevron}</span>
        </BaseCombobox.Trigger>
        {plate}
      </BaseCombobox.Root>
    );
  }

  return (
    <BaseCombobox.Root<string, boolean, ViewRow> multiple={multiple} {...root}>
      <BaseCombobox.InputGroup
        ref={setWell}
        data-invalid={invalid ? '' : undefined}
        data-size={size}
        className={cx(GROUP, SIZE[size], multiple && CHIPS_WELL, className)}
      >
        <Field.Icon className={multiple ? LINE : undefined}>{lead}</Field.Icon>
        {multiple ? (
          <BaseCombobox.Chips ref={chips} className={CHIPS}>
            {chosen.map((v) => (
              <BaseCombobox.Chip key={v} data-row={v} aria-label={labelOf(v)} render={<Chip as="div" variant="suggestion" className={CHIP} />}>
                <Chip.Text>{labelOf(v)}</Chip.Text>
                <Chip.Actions>
                  <BaseCombobox.ChipRemove render={<IconButton variant="mini" label={`Remove ${labelOf(v)}`} icon={<CloseIcon className={CHIP_GLYPH} />} />} />
                </Chip.Actions>
              </BaseCombobox.Chip>
            ))}
            {input}
          </BaseCombobox.Chips>
        ) : input}
        <Field.Trail className={multiple ? LINE : undefined}>
          {ring || <BaseCombobox.Clear keepMounted render={<Field.Key label="Clear" icon={<CloseIcon />} shown={clearable} disabled={disabled} />} />}
          <BaseCombobox.Trigger render={<Field.Key label="Show all" icon={chevron} disabled={disabled} />} />
        </Field.Trail>
      </BaseCombobox.InputGroup>
      {plate}
    </BaseCombobox.Root>
  );
}
