'use client';

import * as React from 'react';
import { Popover as BasePopover } from '@base-ui/react/popover';
import { InheritColorway, useColorwayAnchor } from '../../theme/colorway';
import { menuParts, ListGlide } from '../menu/menu';
import { Field } from '../field/field';
import { Row } from '../row/row';
import { Chip } from '../chip/chip';
import { IconButton } from '../icon-button/icon-button';
import { Checkbox } from '../checkbox/checkbox';
import { TreeDisclosure, type TreeItem } from '../tree/tree';
import { CheckIcon, ChevronIcon, CloseIcon, SearchIcon, SyncErrorIcon } from '../../icons/components.generated';
import { MorphPair } from '../../icons/MorphIcon';
import { chevronMorph } from '../../icons/morph.generated';
import { leaveRows, useRowMotion } from '../../motion/rows';
import { useWait, type WaitWork } from '../../motion/wait';

/* ─────────────────────────────────────────────────────────
 * CASCADER, a value chosen through nested levels (a category, a place, a folder)
 *
 *   rest      the field's well holding the path: the levels above in ink2, small engraved chevrons
 *             in ink3, the last in ink; a long path keeps the last two and folds the start into "…"
 *   open      the menu's frosted plate under the well, aligned to its start (fades in on settle): the
 *             search well, focused, then one column per level opened; the well keeps its ring
 *   walk      ↑ ↓ Home End in a column (the one highlight glides, the menu's live list); → opens a
 *             branch and goes in; ← goes back to the parent's column. The row a column opened holds
 *             the option's raised plate, so the trail reads left to right; the value ends in a check
 *   deeper    the new column arrives one grid step from the right on the settle spring, fading in;
 *             the plate grows to the right (columns there when it opened stand still)
 *   load      a branch with `hasChildren` and no `children` calls loadChildren: its chevron waits in
 *             place (the tree's disclosure on useWait: nothing for a fast load, then the ring), and
 *             the column arrives with the children
 *   failed    the column is one row: sync-error, Couldn't load, Try again (↩ or a click retries)
 *   empty     the column says Empty in ink3
 *   choose    ↩ or a click on a leaf (or on any row with pick="any") sets the value; the plate fades
 *             out on release and focus returns to the well. With pick="any" a click on a branch
 *             chooses it and opens it, and the plate stays
 *   search    typing turns the columns into one list of matches across the loaded levels: the name
 *             (typed letters in ink, the rest ink2) over its path; nothing matched says the query back
 *   drill     layout="drill": one column as wide as the well under a header with Back and the level's
 *             name; going in, the level arrives from the right, going back, from the left
 *   several   multiple: a row-size checkbox leads each row; a branch is on when all of it is and shows
 *             the dash when some is; Space or a click on the box ticks; chips in the well land and leave
 *             with the rows' motion; `max` dims the boxes past it and counts under the columns
 *   focus     focus stays in the search well (aria-activedescendant), one place for letters and keys
 *   invalid   the foundation's invalid ring; disabled 40 % (the field's looks and sizes)
 * Reduce Motion: levels fade in without travel; the chevron turns at once; chips come and go at once.
 * ───────────────────────────────────────────────────────── */

/** Tree's item: `{ id, label, icon?, children?, hasChildren?, disabled?, trail? }`. The same data feeds both. */
export type CascaderItem = TreeItem;

export type CascaderSize = 'regular' | 'compact';

export interface CascaderWords {
  /** The search well's hint. */
  search: string;
  /** A level with nothing in it. */
  empty: string;
  /** A level that failed to load. */
  failed: string;
  /** After `failed`. */
  retry: string;
  /** Said while a level loads ("Loading Portugal"). */
  loading: (item: CascaderItem) => string;
  /** The drill header's back key. */
  back: string;
  /** The clear key. */
  clear: string;
  /** Nothing matched the search. */
  noMatches: (query: string) => string;
  /** Matches past `limit`. */
  more: (count: number) => string;
  /** Under the columns when there is a `max`. */
  count: (chosen: number, max: number) => string;
  /** Said when a level opens ("Portugal, 5 items"). */
  opened: (item: CascaderItem, count: number) => string;
}

const defaultWords: CascaderWords = {
  search: 'Search',
  empty: 'Empty',
  failed: 'Couldn’t load',
  retry: 'Try again',
  loading: (item) => `Loading ${item.label}`,
  back: 'Back',
  clear: 'Clear',
  noMatches: (q) => `No matches for “${q}”`,
  more: (n) => `${n} more ${n === 1 ? 'match' : 'matches'}; type to narrow`,
  count: (n, max) => `${n} of ${max}`,
  opened: (item, n) => `${item.label}, ${n} ${n === 1 ? 'item' : 'items'}`,
};

interface CascaderCommon {
  items: CascaderItem[];
  /** Names the well for assistive tech ("Category"). */
  'aria-label': string;
  placeholder?: string;
  /** The field's form sizes: regular (32, the default) or compact (28). */
  size?: CascaderSize;
  invalid?: boolean;
  disabled?: boolean;
  /** leaf (the default): a branch only opens. any: a branch can be the value too. Several values ignore it. */
  pick?: 'leaf' | 'any';
  /** columns (the default): Miller columns side by side. drill: one level at a time with Back, for a narrow well. */
  layout?: 'columns' | 'drill';
  /** Loads a level: add the item's `children` in your items, then resolve. A rejection shows Try again. */
  loadChildren?: (item: CascaderItem) => Promise<void>;
  /** How many search matches are drawn; past it a quiet line says how many more. Default 100. */
  limit?: number;
  words?: Partial<CascaderWords>;
  className?: string;
}

interface CascaderSingle extends CascaderCommon {
  multiple?: false;
  value?: string | null;
  defaultValue?: string | null;
  /** The chosen id and its path from the top (the items must be loaded down to it). */
  onValueChange?: (value: string | null, path: CascaderItem[]) => void;
}

interface CascaderMultiple extends CascaderCommon {
  /** Several values, as a covering set: a branch chosen whole is its own id. */
  multiple: true;
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  /** At most this many values. */
  max?: number;
}

export type CascaderProps = CascaderSingle | CascaderMultiple;

/* ── the hierarchy, indexed ── */

interface Node { item: CascaderItem; parent: string | null; path: CascaderItem[]; n: number }

function indexItems(items: CascaderItem[]) {
  const map = new Map<string, Node>();
  let n = 0;
  const walk = (list: CascaderItem[], parent: string | null, path: CascaderItem[]) => {
    for (const item of list) {
      const here = [...path, item];
      map.set(item.id, { item, parent, path: here, n: n++ });
      if (item.children) walk(item.children, item.id, here);
    }
  };
  walk(items, null, []);
  return map;
}

const isBranch = (item: CascaderItem) => item.children != null || !!item.hasChildren;
const fold = (s: string) => s.toLocaleLowerCase();
const RETRY = '\u0000retry:';

/** Ticks or unticks `id` in a covering set: a branch whole is its own id; splitting one keeps the rest of it. */
function toggled(chosen: string[], id: string, index: Map<string, Node>): string[] {
  const node = index.get(id);
  if (!node) return chosen;
  const ids = node.path.map((i) => i.id);
  const top = ids.find((a) => chosen.includes(a));
  if (top === id) return chosen.filter((c) => c !== id);
  if (top) {
    // ponytail: a split takes disabled siblings along; skip them here if a host needs them left out
    const next = chosen.filter((c) => c !== top);
    for (let i = ids.indexOf(top); i < ids.length - 1; i++) {
      for (const child of index.get(ids[i])?.item.children ?? []) if (child.id !== ids[i + 1]) next.push(child.id);
    }
    return next;
  }
  let next = [...chosen.filter((c) => !index.get(c)?.path.some((a) => a.id === id)), id];
  for (let p = node.parent; p; p = index.get(p)?.parent ?? null) {
    const kids = index.get(p)?.item.children ?? [];
    if (!kids.length || !kids.every((k) => next.includes(k.id))) break;
    next = [...next.filter((c) => !kids.some((k) => k.id === c)), p];
  }
  return next;
}

/* ── classes (the field, menu, row and combobox recipes; the cascader's own) ── */

const cx = (...parts: (string | false | undefined | null)[]) => parts.filter(Boolean).join(' ');

const WELL = 'mu-cascader relative flex items-center min-w-cascader-min-width box-border recipe-well-field text-field-field-hint has-[.mu-cascader-trigger:focus-visible]:focus-ring-flush has-[.mu-cascader-trigger[data-popup-open]]:focus-ring-flush data-disabled:opacity-field-state-disabled data-invalid:invalid-ring';
const SIZE = {
  regular: 'gap-field-regular-gap h-field-regular-height pl-field-regular-pad-left pr-field-regular-pad-right rounded-field-regular-radius',
  compact: 'gap-field-compact-gap h-field-compact-height pl-field-compact-pad-left pr-field-compact-pad-right rounded-field-compact-radius',
};
const TRIGGER = 'mu-cascader-trigger absolute inset-0 p-0 border-0 bg-transparent cursor-pointer outline-none disabled:cursor-default';
const ABOVE = 'relative z-1 pointer-events-none';
const PATH = `mu-cascader-path cascader-path flex-1 type-ui ${ABOVE}`;
const CRUMB = 'mu-cascader-crumb';
const SEP = 'mu-cascader-sep size-breadcrumbs-sep-size -rotate-90 text-ink3';
const TRAIL = `${ABOVE} [&_button]:pointer-events-auto`;
const CHEVRON = 'mu-cascader-chevron inline-grid flex-none text-ink2 [&>svg]:size-field-key-glyph';
const CHIPS_WELL = 'combobox-chips! items-start';
const CHIPS = `mu-cascader-chips flex flex-1 flex-wrap items-center gap-combobox-chips-gap min-w-0 ${ABOVE}`;
const CHIP = 'mu-cascader-chip recipe-combobox-chip! [&_button]:pointer-events-auto';
const CHIP_GLYPH = 'size-attachment-remove-glyph';
const LINE = 'combobox-line inline-flex items-center';
const POSITIONER = 'mu-menu-positioner z-menu-z';
const SEARCH = 'mb-menu-pad';
const COLUMNS = 'mu-cascader-columns cascader-columns tree-size';
const COLUMN = 'mu-cascader-column cascader-column outline-none';
const DIVIDE = 'mu-cascader-divide cascader-divide recipe-menu-sep';
const ROW = `mu-cascader-row ${menuParts.LIVE_ROW} cursor-pointer data-on:recipe-row-option-on aria-disabled:opacity-menu-row-disabled aria-disabled:cursor-default`;
const DETAIL = 'combobox-detail!';
const TEXT = 'flex flex-col gap-combobox-detail-gap';
const DESC = 'mu-cascader-where type-meta text-ink2 overflow-hidden text-ellipsis whitespace-nowrap';
const MATCH_REST = 'text-ink2';
const ROW_TRAIL = 'type-meta text-ink2';
const CHECK = 'mu-cascader-check inline-grid flex-none text-ink2 [&>svg]:size-menu-row-glyph';
const BOX = 'mu-cascader-box inline-flex flex-none';
const QUIET = 'mu-cascader-quiet px-menu-row-pad py-menu-heading-pad-bottom type-ui text-ink3';
const HEAD = 'mu-cascader-head flex items-center gap-menu-row-gap h-menu-row-height pl-menu-heading-pad-x';
const HEAD_LABEL = `${menuParts.HEADING} px-0! pt-0! pb-0! flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap`;

function offset() {
  if (typeof window === 'undefined') return 6;
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--mu-menu-offset')) || 6;
}

/** The label with the typed letters in ink and the rest in ink2 (the combobox's). */
function Matched({ label, query }: { label: string; query: string }) {
  const at = query ? fold(label).indexOf(fold(query)) : -1;
  if (at < 0) return <>{label}</>;
  return (
    <>
      <span className={MATCH_REST}>{label.slice(0, at)}</span>
      <span className="mu-cascader-match">{label.slice(at, at + query.length)}</span>
      <span className={MATCH_REST}>{label.slice(at + query.length)}</span>
    </>
  );
}

const Sep = () => <ChevronIcon aria-hidden animate={false} className={SEP} />;

/** The checkbox as the row's look: the option row carries the state for assistive tech. */
function Box({ on, mixed, disabled }: { on: boolean; mixed: boolean; disabled?: boolean }) {
  // ponytail: Checkbox leaves out Base UI's `indeterminate` (it steers to `doing`); passed through here for the dash.
  // Give Checkbox a `mixed` prop when a second component needs it.
  const dash: object = { indeterminate: mixed && !on };
  return (
    <span aria-hidden className={BOX}>
      <Checkbox size="row" checked={on} disabled={disabled} tabIndex={-1} {...dash} />
    </span>
  );
}

interface Column { key: string; parent: CascaderItem | null; items: CascaderItem[]; failed?: boolean }

/** Choose a value through nested levels: columns side by side (or one level at a time), search across them. */
export function Cascader(props: CascaderProps) {
  const {
    items, placeholder, size = 'regular', invalid, disabled, pick = 'leaf', layout = 'columns', loadChildren, limit = 100,
    words: wordsProp, className,
  } = props;
  const label = props['aria-label'];
  const multiple = props.multiple === true;
  const max = props.multiple === true ? props.max : undefined;
  const drill = layout === 'drill';
  const words = { ...defaultWords, ...wordsProp };
  const index = React.useMemo(() => indexItems(items), [items]);

  // The value, held as a list either way (one or none for a single value).
  const asList = (v: string | string[] | null | undefined): string[] => (Array.isArray(v) ? v : v == null ? [] : [v]);
  const controlled = props.value !== undefined;
  const [own, setOwn] = React.useState<string[]>(() => asList(props.defaultValue));
  const chosen = controlled ? asList(props.value) : own;
  const chosenKey = chosen.join('\u0001');

  const [open, setOpen] = React.useState(false);
  const [trail, setTrail] = React.useState<string[]>([]);
  const [col, setCol] = React.useState(0);
  const [active, setActive] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState('');
  const [loads, setLoads] = React.useState<Record<string, WaitWork>>({});
  const [dir, setDir] = React.useState<'in' | 'back'>('in');
  const into = React.useRef<string | null>(null);
  const uid = React.useId();
  const domId = (id: string) => `${uid}-${id.startsWith(RETRY) ? `r${index.get(id.slice(RETRY.length))?.n}` : index.get(id)?.n}`;

  const at = useColorwayAnchor();
  const chips = React.useRef<HTMLDivElement>(null);
  const input = React.useRef<HTMLInputElement>(null);
  useRowMotion(chips, chosenKey, true);

  /* ── the value ── */

  const emit = (next: string[]) => {
    if (!controlled) setOwn(next);
    if (props.multiple === true) props.onValueChange?.(next);
    else props.onValueChange?.(next[0] ?? null, next[0] ? index.get(next[0])?.path ?? [] : []);
  };
  // Chips that go leave first (the rows' motion), then the value changes.
  const commit = (next: string[]) => {
    const gone = chosen.filter((v) => !next.includes(v));
    const list = chips.current;
    if (!multiple || !gone.length || !list) return emit(next);
    leaveRows(gone.map((v) => list.querySelector<HTMLElement>(`:scope > [data-row="${CSS.escape(v)}"]`)), () => emit(next));
  };
  const chosenSet = new Set(chosen);
  const isOn = (id: string) => (index.get(id)?.path ?? []).some((a) => chosenSet.has(a.id));
  const isMixed = (id: string) => !isOn(id) && chosen.some((c) => index.get(c)?.path.some((a) => a.id === id && a.id !== c));
  const blocked = (id: string) => max != null && !isOn(id) && toggled(chosen, id, index).length > max;
  const tick = (id: string) => {
    if (blocked(id) || index.get(id)?.item.disabled) return;
    commit(toggled(chosen, id, index));
  };

  /* ── the columns ── */

  const columns: Column[] = [{ key: '', parent: null, items }];
  for (const id of trail) {
    const node = index.get(id);
    if (!node) break;
    if (node.item.children) columns.push({ key: id, parent: node.item, items: node.item.children });
    else if (loads[id] === 'failed') columns.push({ key: id, parent: node.item, items: [], failed: true });
    else break;
  }
  const here = Math.min(col, columns.length - 1);
  const rowsOf = (c: Column) => (c.failed ? [RETRY + c.key] : c.items.map((i) => i.id));
  const enabledOf = (c: Column) => (c.failed ? [RETRY + c.key] : c.items.filter((i) => !i.disabled).map((i) => i.id));

  /* ── search ── */

  const q = query.trim();
  const results = React.useMemo(() => {
    if (!q) return null;
    const all = [...index.values()].filter((n) => fold(n.item.label).includes(fold(q)) && (multiple || pick === 'any' || !isBranch(n.item)));
    return { shown: all.slice(0, limit), more: Math.max(0, all.length - limit) };
  }, [q, index, multiple, pick, limit]);
  // While searching, the first match is highlighted until the keys or the pointer move it: ↩ takes it.
  const matchIds = results ? results.shown.filter((n) => !n.item.disabled).map((n) => n.item.id) : [];
  const current = results ? (active && matchIds.includes(active) ? active : matchIds[0] ?? null) : active;

  /* ── opening and closing ── */

  const setLoad = (id: string, work: WaitWork) => setLoads((was) => ({ ...was, [id]: work }));
  const load = (item: CascaderItem) => {
    if (!loadChildren || loads[item.id] === 'working') return;
    setLoad(item.id, 'working');
    loadChildren(item).then(() => setLoad(item.id, 'idle'), () => setLoad(item.id, 'failed'));
  };

  const onOpenChange = (next: boolean) => {
    if (next) {
      // Open on the value: the columns down to it, the keys on it.
      const path = !multiple && chosen[0] ? index.get(chosen[0])?.path ?? [] : [];
      const opened = path.filter((i) => i.children).map((i) => i.id);
      const last = path.length ? path[path.length - 1].id : null;
      setTrail(opened);
      setCol(last ? path.length - 1 : 0);
      setActive(last ?? items.find((i) => !i.disabled)?.id ?? null);
      setDir('in');
    } else {
      setQuery('');
      into.current = null;
    }
    setOpen(next);
  };

  const close = () => onOpenChange(false);

  /** Opens a branch in column `k` (it loads first if it must); `go` moves the keys into it once it's there. */
  const openBranch = (item: CascaderItem, k: number, go: boolean) => {
    if (!isBranch(item) || item.disabled) return;
    setTrail((was) => [...was.slice(0, k), item.id]);
    if (item.children == null) load(item);
    else if (loads[item.id] === 'failed') setLoad(item.id, 'idle');
    if (go) {
      into.current = item.id;
      setDir('in');
    }
  };

  // The keys go into a level once its children (or its failure) are there.
  React.useEffect(() => {
    const id = into.current;
    if (!id) return;
    const node = index.get(id);
    const k = trail.indexOf(id);
    if (!node || k < 0) { into.current = null; return; }
    if (node.item.children) {
      into.current = null;
      setCol(k + 1);
      setActive(node.item.children.find((i) => !i.disabled)?.id ?? null);
    } else if (loads[id] === 'failed') {
      into.current = null;
      setCol(k + 1);
      setActive(RETRY + id);
    }
  }, [index, loads, trail]);

  const back = () => {
    if (here === 0) return;
    setActive(trail[here - 1]);
    setCol(here - 1);
    setTrail((was) => was.slice(0, here));
    setDir('back');
  };

  const chooseOne = (id: string) => {
    commit([id]);
    close();
  };

  /** ↩ or a click on a row of column `k`. */
  const press = (id: string, k: number, how: 'click' | 'enter') => {
    if (id.startsWith(RETRY)) {
      const item = index.get(id.slice(RETRY.length))?.item;
      if (item) load(item);
      return;
    }
    const item = index.get(id)?.item;
    if (!item || item.disabled) return;
    setActive(id);
    setCol(k);
    const branch = isBranch(item);
    if (multiple) {
      if (branch) openBranch(item, k, how === 'enter');
      else tick(id);
      return;
    }
    if (!branch) return chooseOne(id);
    if (pick === 'any' && how === 'enter') return chooseOne(id);
    if (pick === 'any') commit([id]);
    openBranch(item, k, how === 'enter' || drill);
  };

  const pressResult = (id: string) => {
    if (multiple) return tick(id);
    chooseOne(id);
  };

  /* ── the keys (focus stays in the search well) ── */

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const mod = e.metaKey || e.ctrlKey || e.altKey;
    if (results) {
      const i = current ? matchIds.indexOf(current) : -1;
      const go = (to: number) => setActive(matchIds[Math.max(0, Math.min(matchIds.length - 1, to))] ?? null);
      switch (e.key) {
        case 'ArrowDown': go(i + 1); break;
        case 'ArrowUp': go(i - 1); break;
        case 'Enter': if (current) pressResult(current); break;
        default: return;
      }
      e.preventDefault();
      return;
    }
    const column = columns[here];
    const list = enabledOf(column);
    const i = active ? list.indexOf(active) : -1;
    const go = (to: number) => { const id = list[Math.max(0, Math.min(list.length - 1, to))]; if (id) setActive(id); };
    const item = active ? index.get(active)?.item : undefined;
    switch (e.key) {
      case 'ArrowDown': go(i + 1); break;
      case 'ArrowUp': go(i < 0 ? list.length - 1 : i - 1); break;
      case 'Home': if (mod || e.shiftKey) return; go(0); break;
      case 'End': if (mod || e.shiftKey) return; go(list.length - 1); break;
      case 'ArrowRight':
        if (!item || !isBranch(item)) return;
        openBranch(item, here, true);
        break;
      case 'ArrowLeft':
        if (here === 0) return;
        back();
        break;
      case 'Enter':
        if (active) press(active, here, 'enter');
        break;
      case ' ':
        if (!multiple || query || !item) return;
        tick(item.id);
        break;
      default: return;
    }
    e.preventDefault();
  };

  // The keys' row stays in view (and the column it's in, sideways).
  React.useEffect(() => {
    if (!open || !current) return;
    document.getElementById(domId(current))?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [open, current, here, columns.length]);

  // Levels that arrive: only what wasn't on screen in the last frame, never what was there when the plate opened.
  const shownKeys = drill ? [columns[here].key] : columns.map((c) => c.key);
  // A level keeps its arrival until it leaves, so later renders don't cut the motion short.
  const seen = React.useRef<Set<string> | null>(null);
  const arrivals = React.useRef(new Map<string, string>());
  const arriving = (key: string) => {
    if (seen.current != null && !seen.current.has(key) && !arrivals.current.has(key)) {
      arrivals.current.set(key, drill && dir === 'back' ? 'cascader-back' : 'cascader-in');
    }
    return arrivals.current.get(key);
  };
  React.useEffect(() => {
    seen.current = open ? new Set(shownKeys) : null;
    for (const key of arrivals.current.keys()) if (!open || !shownKeys.includes(key)) arrivals.current.delete(key);
  });

  /* ── what the well shows ── */

  const path = !multiple && chosen[0] ? index.get(chosen[0])?.path ?? [] : [];
  const pathText = path.map((i) => i.label).join(' › ') || (chosen[0] ?? '');
  const folded = path.length > 3 ? [null, ...path.slice(-2)] : path;
  const said = multiple ? chosen.map((c) => index.get(c)?.item.label ?? c).join(', ') : pathText;

  const chevron = <MorphPair glyphs={CHEV} name="chevron" turn={open ? 180 : 0} />;
  const clear = (
    <Field.Key label={words.clear} icon={<CloseIcon />} shown={chosen.length > 0 && !disabled} disabled={disabled} onClick={() => commit([])} />
  );

  const status = here > 0 && columns[here].parent ? words.opened(columns[here].parent!, columns[here].items.length) : '';
  const activeColumnId = `${uid}-col-${results ? 'results' : here}`;

  const columnView = (c: Column, k: number) => {
    const arrive = arriving(c.key);
    return (
      <div
        key={c.key || '\u0000top'}
        id={`${uid}-col-${k}`}
        role="listbox"
        aria-label={c.parent?.label ?? label}
        aria-multiselectable={multiple || undefined}
        className={cx(COLUMN, arrive)}
        data-column={k}
      >
        <ListGlide />
        {c.failed ? (
          <CascaderRetry id={domId(RETRY + c.key)} highlighted={active === RETRY + c.key} words={words} onPress={() => press(RETRY + c.key, k, 'click')} onHover={() => { setActive(RETRY + c.key); setCol(k); }} />
        ) : c.items.length === 0 ? (
          <div className={QUIET}>{words.empty}</div>
        ) : c.items.map((item) => (
          <CascaderRow
            key={item.id}
            id={domId(item.id)}
            item={item}
            words={words}
            work={loads[item.id] ?? 'idle'}
            highlighted={active === item.id && k === here}
            on={trail[k] === item.id && columns.length > k + 1}
            chosen={!multiple && chosenSet.has(item.id)}
            box={multiple ? { on: isOn(item.id), mixed: isMixed(item.id), blocked: blocked(item.id) } : undefined}
            onPress={() => press(item.id, k, 'click')}
            onBox={() => { setActive(item.id); setCol(k); tick(item.id); }}
            onHover={() => { if (!item.disabled) { setActive(item.id); setCol(k); } }}
          />
        ))}
      </div>
    );
  };

  const plate = (
    <BasePopover.Portal>
      <InheritColorway anchor={at} />
      <BasePopover.Positioner className={POSITIONER} sideOffset={offset()} align="start" collisionPadding={8}>
        <BasePopover.Popup className={cx(menuParts.PLATE, 'relative mu-cascader-pop', drill ? 'cascader-drill' : 'cascader-pop!')} initialFocus={input}>
          <Field.Root size="regular" className={SEARCH}>
            <Field.Icon><SearchIcon /></Field.Icon>
            <Field.Input
              ref={input}
              role="combobox"
              aria-label={`${words.search} ${label}`}
              aria-expanded
              aria-controls={activeColumnId}
              aria-autocomplete="list"
              aria-activedescendant={current ? domId(current) : undefined}
              placeholder={words.search}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(null);
              }}
              onKeyDown={onKeyDown}
            />
          </Field.Root>
          {results ? (
            <div id={`${uid}-col-results`} role="listbox" aria-label={label} aria-multiselectable={multiple || undefined} className={cx(COLUMN, 'mu-cascader-results w-full!')}>
              <ListGlide />
              {results.shown.length === 0 && <div role="status" className={QUIET}>{words.noMatches(q)}</div>}
              {results.shown.map((n) => (
                <CascaderRow
                  key={n.item.id}
                  id={domId(n.item.id)}
                  item={n.item}
                  words={words}
                  work="idle"
                  where={n.path.slice(0, -1).map((i) => i.label).join(' › ')}
                  query={q}
                  highlighted={current === n.item.id}
                  on={false}
                  chosen={!multiple && chosenSet.has(n.item.id)}
                  box={multiple ? { on: isOn(n.item.id), mixed: isMixed(n.item.id), blocked: blocked(n.item.id) } : undefined}
                  onPress={() => pressResult(n.item.id)}
                  onBox={() => tick(n.item.id)}
                  onHover={() => { if (!n.item.disabled) setActive(n.item.id); }}
                />
              ))}
              {results.more > 0 && <div className={QUIET}>{words.more(results.more)}</div>}
            </div>
          ) : drill ? (
            <div className="mu-cascader-drill tree-size">
              {here > 0 && (
                <div className={HEAD}>
                  <IconButton variant="mini" label={words.back} icon={<ChevronIcon animate={false} className="size-tree-chevron-size rotate-90" />} onMouseDown={(e) => e.preventDefault()} onClick={back} />
                  <span className={HEAD_LABEL}>{columns[here].parent?.label}</span>
                </div>
              )}
              {columnView(columns[here], here)}
            </div>
          ) : (
            <div className={COLUMNS}>
              {columns.map((c, k) => (
                <React.Fragment key={c.key || '\u0000top'}>
                  {k > 0 && <span aria-hidden className={DIVIDE} />}
                  {columnView(c, k)}
                </React.Fragment>
              ))}
            </div>
          )}
          {max != null && <div className={QUIET}>{words.count(chosen.length, max)}</div>}
          <div role="status" className="sr-only">{results ? '' : status}</div>
        </BasePopover.Popup>
      </BasePopover.Positioner>
    </BasePopover.Portal>
  );

  return (
    <BasePopover.Root open={open} onOpenChange={onOpenChange}>
      <div
        ref={at.ref}
        data-size={size}
        data-invalid={invalid ? '' : undefined}
        data-disabled={disabled ? '' : undefined}
        className={cx(WELL, SIZE[size], multiple && CHIPS_WELL, className)}
      >
        <BasePopover.Trigger
          className={TRIGGER}
          disabled={disabled}
          aria-label={said ? `${label}, ${said}` : label}
          aria-invalid={invalid || undefined}
          onKeyDown={(e) => {
            // Letters typed on the well start a search; ↓ opens the plate.
            if (e.key === 'ArrowDown' || (e.key.length === 1 && e.key !== ' ' && !e.metaKey && !e.ctrlKey && !e.altKey)) {
              e.preventDefault();
              onOpenChange(true);
              if (e.key.length === 1) setQuery(e.key);
            }
          }}
        />
        {multiple ? (
          <div ref={chips} className={CHIPS}>
            {chosen.map((v) => {
              const name = index.get(v)?.item.label ?? v;
              return (
                <Chip key={v} as="div" variant="suggestion" data-row={v} className={CHIP}>
                  <Chip.Text>{name}</Chip.Text>
                  <Chip.Actions>
                    <IconButton variant="mini" label={`Remove ${name}`} disabled={disabled} icon={<CloseIcon className={CHIP_GLYPH} />} onClick={() => commit(chosen.filter((c) => c !== v))} />
                  </Chip.Actions>
                </Chip>
              );
            })}
            {!chosen.length && <span className={cx(LINE, 'type-ui')}>{placeholder}</span>}
          </div>
        ) : (
          <span aria-hidden className={PATH}>
            {path.length || chosen[0] ? (
              (path.length ? folded : [{ id: chosen[0], label: chosen[0] } as CascaderItem]).map((item, i, all) => {
                const last = i === all.length - 1;
                return (
                  <React.Fragment key={item?.id ?? '\u0000fold'}>
                    <span className={cx(CRUMB, last ? 'text-ink' : 'text-ink2')}>{item ? item.label : '…'}</span>
                    {!last && <Sep />}
                  </React.Fragment>
                );
              })
            ) : placeholder}
          </span>
        )}
        <Field.Trail className={cx(TRAIL, multiple && LINE)}>
          {clear}
          <span aria-hidden className={CHEVRON}>{chevron}</span>
        </Field.Trail>
      </div>
      {plate}
    </BasePopover.Root>
  );
}

const CHEV = { chevron: chevronMorph };

interface CascaderRowProps {
  id: string;
  item: CascaderItem;
  words: CascaderWords;
  work: WaitWork;
  highlighted: boolean;
  /** The row its column opened (the raised plate). */
  on: boolean;
  /** The single value (the check). */
  chosen: boolean;
  /** Several values: the box's state. */
  box?: { on: boolean; mixed: boolean; blocked: boolean };
  /** A search match: its path, in a second line. */
  where?: string;
  query?: string;
  onPress: () => void;
  onBox: () => void;
  onHover: () => void;
}

/** One row: its wait has its own clock (useWait), so each loading level keeps its own time. */
function CascaderRow({ id, item, words, work, highlighted, on, chosen, box, where, query, onPress, onBox, onHover }: CascaderRowProps) {
  const wait = useWait(work);
  const branch = isBranch(item);
  const selected = box ? box.on : chosen;
  return (
    <div
      id={id}
      role="option"
      aria-selected={selected}
      aria-checked={box && box.mixed ? 'mixed' : undefined}
      aria-disabled={item.disabled || (box && box.blocked && !box.on) || undefined}
      aria-busy={wait.busy || undefined}
      data-highlighted={highlighted ? '' : undefined}
      data-on={on ? '' : undefined}
      data-branch={branch ? '' : undefined}
      className={cx(ROW, where != null && DETAIL)}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onPress}
      onPointerMove={highlighted ? undefined : onHover}
    >
      {box && (
        <span className="contents" onClick={(e) => { e.stopPropagation(); onBox(); }}>
          <Box on={box.on} mixed={box.mixed} disabled={item.disabled || (box.blocked && !box.on)} />
        </span>
      )}
      {item.icon != null && typeof item.icon !== 'function' && <Row.Lead aria-hidden className={menuParts.GLYPH}>{item.icon}</Row.Lead>}
      {typeof item.icon === 'function' && <Row.Lead aria-hidden className={menuParts.GLYPH}>{item.icon(on)}</Row.Lead>}
      <Row.Text className={where != null ? TEXT : undefined}>
        <span className={menuParts.LABEL}>{query ? <Matched label={item.label} query={query} /> : item.label}</span>
        {where ? <span className={DESC}>{where}</span> : null}
      </Row.Text>
      {item.trail != null && <Row.Trail className={ROW_TRAIL}>{item.trail}</Row.Trail>}
      {chosen && <span aria-hidden className={CHECK}><CheckIcon /></span>}
      {branch && where == null && <TreeDisclosure aria-hidden phase={wait.phase} failed={work === 'failed'} label={words.loading(item)} />}
    </div>
  );
}

function CascaderRetry({ id, highlighted, words, onPress, onHover }: { id: string; highlighted: boolean; words: CascaderWords; onPress: () => void; onHover: () => void }) {
  return (
    <div
      id={id}
      role="option"
      aria-selected={false}
      data-highlighted={highlighted ? '' : undefined}
      className={ROW}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onPress}
      onPointerMove={highlighted ? undefined : onHover}
    >
      <Row.Lead aria-hidden className={menuParts.GLYPH}><SyncErrorIcon /></Row.Lead>
      <Row.Text className={menuParts.LABEL}>{words.failed}</Row.Text>
      <Row.Trail className={ROW_TRAIL}>{words.retry}</Row.Trail>
    </div>
  );
}
