'use client';

import * as React from 'react';
import { Toolbar } from '@base-ui/react/toolbar';
import { Button } from '../button/button';
import { IconButton } from '../icon-button/icon-button';
import { Menu, MenuItem } from '../menu/menu';
import { Popover } from '../popover/popover';
import { Field } from '../field/field';
import { NumberField } from '../number-field/number-field';
import { CheckboxGroup } from '../checkbox-group/checkbox-group';
import { Calendar, type DateRange } from '../calendar/calendar';
import { CheckIcon, CloseIcon, FilterIcon, SearchIcon } from '../../icons/components.generated';
import { leaveRows, useRowMotion } from '../../motion/rows';
import { SwapText } from '../../motion/swap';

/* ─────────────────────────────────────────────────────────
 * FILTERS, a row of conditions you build, each read as a sentence, on Base UI Toolbar
 *
 *   rest      tokens ("Status is Open"), then the Filter key; Clear once there are two or more
 *   add       Filter opens the menu of fields; choosing one lands a token on the object spring
 *             with its value editor open under it, focus inside
 *   operator  a key: the menu of the operators the field's type allows, the current one checked
 *   value     a key: a popover holding its editor (field, number, ticked list, calendar); text,
 *             numbers and ticks apply as you go, dates on Apply. The words turn on the drum and
 *             the tokens after them glide to their places
 *   empty     an editor that closes with nothing in it takes its token away again
 *   remove    the mini key: the token leaves one nest down on the release spring, the rest close up
 *   keys      one tab stop; ← → between keys; Enter or Space opens; Esc closes, focus returns
 * Reduce Motion: tokens come and go at once, words change in place.
 * The token is the combobox chip's plate; keys hover with the menu row's plate (the filters recipe).
 * ───────────────────────────────────────────────────────── */

const BAR = 'mu-filters flex flex-wrap items-center gap-filters-bar-gap min-w-0';
const TOKEN = 'mu-filters-token inline-flex items-center flex-none gap-filters-token-gap h-filters-token-height pl-filters-token-pad-start pr-filters-token-pad-end rounded-pill recipe-combobox-chip type-ui whitespace-nowrap';
const NAME = 'mu-filters-field inline-flex items-center gap-filters-seg-glyph-gap pr-filters-seg-pad-x text-ink2 [&>svg]:size-filters-seg-glyph';
const KEY = 'mu-filters-key inline-flex items-center h-filters-seg-height px-filters-seg-pad-x rounded-filters-seg-radius border-0 bg-transparent type-ui cursor-default outline-none hover:recipe-menu-row-hover data-popup-open:recipe-menu-row-hover focus-visible:focus-ring-flush';
const OP = `${KEY} text-ink2`;
const OP_STILL = 'mu-filters-op px-filters-seg-pad-x text-ink2';
const VALUE = `${KEY} text-ink`;
const GLYPH_SLOT = 'inline-grid size-menu-row-glyph';
const EDITOR = 'mu-filters-editor grid gap-filters-editor-gap w-filters-editor-width';
const DATES = 'mu-filters-editor grid gap-filters-editor-gap max-w-none!';
const AND = 'type-ui text-ink2';
const LIST = 'filters-list';
const QUIET = 'type-ui text-ink3';
const FOOT = 'flex justify-end gap-filters-editor-gap';

const cx = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join(' ');

export type FilterType = 'text' | 'number' | 'select' | 'multiselect' | 'boolean' | 'date';
export type FilterOp = 'contains' | 'is' | 'is-not' | 'starts' | 'ends' | 'empty' | 'not-empty' | 'gt' | 'lt' | 'between' | 'before' | 'after' | 'any' | 'all' | 'none';
/** text: a string; number: a number, or [low, high] for between; select and multiselect: the chosen values; boolean: true or
 *  false; date: an ISO day ("2026-10-06"), or [start, end] for between. */
export type FilterValue = string | number | boolean | string[] | [number | null, number | null] | [string, string] | null;

/** One condition: "Status is Open". `id` is its own, so one field can hold two (more than 100, less than 900). */
export interface FilterCondition {
  id: string;
  field: string;
  op: FilterOp;
  value: FilterValue;
}

export interface FilterOption {
  value: string;
  label: string;
}

/** What can be filtered. */
export interface FilterField<Row = unknown> {
  id: string;
  label: string;
  type: FilterType;
  /** The field's glyph, as an element: `<UserIcon />`. Shown in the token and the field menu. */
  icon?: React.ReactElement;
  /** select and multiselect: what can be chosen. */
  options?: FilterOption[];
  /** number: engraved after the value ("€", "MB"). */
  unit?: string;
  /** The operator a new condition starts with (each type has one: contains, more than, is, has any of, is, is). */
  defaultOp?: FilterOp;
  /** The row's value for this field. Default: `row[id]`. */
  get?: (row: Row) => unknown;
}

const opsByType: Record<FilterType, FilterOp[]> = {
  text: ['contains', 'is', 'starts', 'ends', 'empty', 'not-empty'],
  number: ['is', 'is-not', 'gt', 'lt', 'between', 'empty'],
  select: ['is', 'is-not', 'empty'],
  multiselect: ['any', 'all', 'none'],
  boolean: ['is'],
  date: ['is', 'before', 'after', 'between', 'empty'],
};
const defaultOpOf: Record<FilterType, FilterOp> = { text: 'contains', number: 'gt', select: 'is', multiselect: 'any', boolean: 'is', date: 'is' };
const wordsOf: Record<FilterOp, string> = {
  contains: 'contains', is: 'is', 'is-not': 'isn’t', starts: 'starts with', ends: 'ends with', empty: 'is empty', 'not-empty': 'isn’t empty',
  gt: 'more than', lt: 'less than', between: 'between', before: 'before', after: 'after', any: 'has any of', all: 'has all of', none: 'has none of',
};
const noValue = new Set<FilterOp>(['empty', 'not-empty']);

/** The operator's words; a select's follow the count: "is" with one value, "is any of" with several. */
export function filterOpWords(op: FilterOp, type: FilterType, count = 1) {
  if (type === 'select' && count > 1 && op === 'is') return 'is any of';
  if (type === 'select' && count > 1 && op === 'is-not') return 'is none of';
  return wordsOf[op];
}

/* ── Values ─────────────────────────────────────────────── */

const pad = (n: number) => String(n).padStart(2, '0');
/** A day as "YYYY-MM-DD", in local time. */
export function isoDay(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
const fromIso = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
function dayOf(raw: unknown): string | null {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const d = raw instanceof Date ? raw : new Date(raw as string | number);
  return Number.isNaN(d.getTime()) ? null : isoDay(d);
}
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const pair = (v: FilterValue): [unknown, unknown] => (Array.isArray(v) && v.length === 2 ? [v[0], v[1]] : [null, null]);

/** The condition has what its operator needs (an empty editor's condition is never applied). */
export function filterComplete(c: FilterCondition, field: FilterField<never> | undefined) {
  if (!field) return false;
  if (noValue.has(c.op)) return true;
  const v = c.value;
  switch (field.type) {
    case 'text': return typeof v === 'string' && v.trim() !== '';
    case 'number': return c.op === 'between' ? pair(v).every((x) => num(x) !== null) : num(v) !== null;
    case 'select': case 'multiselect': return Array.isArray(v) && v.length > 0;
    case 'boolean': return typeof v === 'boolean';
    case 'date': return c.op === 'between' ? pair(v).every((x) => typeof x === 'string') : typeof v === 'string';
  }
}

function test(c: FilterCondition, type: FilterType, raw: unknown): boolean {
  const v = c.value;
  switch (type) {
    case 'text': {
      const s = raw == null ? '' : String(raw).toLocaleLowerCase();
      const q = String(v ?? '').toLocaleLowerCase();
      if (c.op === 'empty') return s.trim() === '';
      if (c.op === 'not-empty') return s.trim() !== '';
      if (c.op === 'is') return s === q;
      if (c.op === 'starts') return s.startsWith(q);
      if (c.op === 'ends') return s.endsWith(q);
      return s.includes(q);
    }
    case 'number': {
      const n = raw == null || raw === '' ? null : Number(raw);
      if (c.op === 'empty') return n === null || Number.isNaN(n);
      if (n === null || Number.isNaN(n)) return false;
      if (c.op === 'between') {
        const [a, b] = pair(v) as [number, number];
        return n >= Math.min(a, b) && n <= Math.max(a, b);
      }
      const x = v as number;
      return c.op === 'is' ? n === x : c.op === 'is-not' ? n !== x : c.op === 'gt' ? n > x : n < x;
    }
    case 'select': {
      if (c.op === 'empty') return raw == null || raw === '';
      const hit = (v as string[]).includes(String(raw));
      return c.op === 'is-not' ? !hit : hit;
    }
    case 'multiselect': {
      const has = Array.isArray(raw) ? raw.map(String) : raw == null ? [] : [String(raw)];
      const want = v as string[];
      if (c.op === 'all') return want.every((w) => has.includes(w));
      const any = want.some((w) => has.includes(w));
      return c.op === 'none' ? !any : any;
    }
    case 'boolean':
      return Boolean(raw) === v;
    case 'date': {
      const d = dayOf(raw);
      if (c.op === 'empty') return d === null;
      if (d === null) return false;
      if (c.op === 'between') {
        const [a, b] = pair(v) as [string, string];
        return a <= b ? d >= a && d <= b : d >= b && d <= a;
      }
      const x = v as string;
      return c.op === 'before' ? d < x : c.op === 'after' ? d > x : d === x;
    }
  }
}

const valueOf = <Row,>(field: FilterField<Row>, row: Row) => (field.get ? field.get(row) : (row as unknown as Record<string, unknown>)[field.id]);

/** The rows every complete condition keeps (conditions are joined by "and"). Feed the result to a Table. */
export function filterRows<Row>(rows: readonly Row[], conditions: readonly FilterCondition[], fields: readonly FilterField<Row>[]): Row[] {
  const live = conditions
    .map((c) => ({ c, f: fields.find((f) => f.id === c.field) }))
    .filter((x): x is { c: FilterCondition; f: FilterField<Row> } => !!x.f && filterComplete(x.c, x.f as FilterField<never>));
  if (!live.length) return [...rows];
  return rows.filter((row) => live.every(({ c, f }) => test(c, f.type, valueOf(f, row))));
}

const dayFormat = (s: string) => {
  const d = fromIso(s);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: sameYear ? undefined : 'numeric' });
};

/** The value as the token says it: “ana”, 500 €, Open +2, 1 Oct – 14 Oct. */
export function filterValueWords(c: FilterCondition, field: FilterField<never>) {
  const v = c.value;
  switch (field.type) {
    case 'text': return `“${typeof v === 'string' ? v : ''}”`;
    case 'number': {
      const f = (x: unknown) => (num(x) === null ? '…' : new Intl.NumberFormat().format(x as number));
      const unit = field.unit ? ` ${field.unit}` : '';
      if (c.op === 'between') { const [a, b] = pair(v); return `${f(a)} and ${f(b)}${unit}`; }
      return `${f(v)}${unit}`;
    }
    case 'select': case 'multiselect': {
      const chosen = (Array.isArray(v) ? (v as string[]) : []).map((x) => field.options?.find((o) => o.value === x)?.label ?? x);
      if (chosen.length <= 2) return chosen.join(', ') || '…';
      return `${chosen[0]} +${chosen.length - 1}`;
    }
    case 'boolean': return v === false ? 'No' : 'Yes';
    case 'date': {
      if (c.op === 'between') {
        const [a, b] = pair(v);
        if (typeof a !== 'string' || typeof b !== 'string') return '…';
        return dayFormat(a).formatRange(fromIso(a), fromIso(b));
      }
      return typeof v === 'string' ? dayFormat(v).format(fromIso(v)) : '…';
    }
  }
}

const countOf = (c: FilterCondition) => (Array.isArray(c.value) ? c.value.length : 1);

/** One condition as a sentence: "Status is any of Open, Paused". */
export function describeFilter(c: FilterCondition, field: FilterField<never>) {
  const op = filterOpWords(c.op, field.type, countOf(c));
  return noValue.has(c.op) ? `${field.label} ${op}` : `${field.label} ${op} ${filterValueWords(c, field)}`;
}

/** Every complete condition as one sentence, joined by "and" (a FilterBar's query, a saved view's name). */
export function describeFilters<Row>(conditions: readonly FilterCondition[], fields: readonly FilterField<Row>[]) {
  return conditions
    .map((c) => ({ c, f: fields.find((f) => f.id === c.field) as FilterField<never> | undefined }))
    .filter(({ c, f }) => filterComplete(c, f))
    .map(({ c, f }) => describeFilter(c, f!))
    .join(' and ');
}

/** The value a condition keeps when its operator changes: one end of a range, or a range from one value. */
function reshape(c: FilterCondition, type: FilterType, op: FilterOp): FilterValue {
  const v = c.value;
  const wasRange = c.op === 'between', isRange = op === 'between';
  if (wasRange === isRange || noValue.has(op)) return v;
  if (type === 'number') return isRange ? [num(v), null] : num(pair(v)[0]);
  if (type === 'date') return isRange ? (typeof v === 'string' ? [v, v] : null) : (pair(v)[0] as string | null) ?? null;
  return v;
}

function blank(field: FilterField<never>): FilterValue {
  if (field.type === 'boolean') return true;
  if (field.type === 'select' || field.type === 'multiselect') return [];
  return field.type === 'text' ? '' : null;
}

let seq = 0;
const newId = (field: string) => `${field}-${Date.now().toString(36)}${(seq++).toString(36)}`;

/* ── Editors ────────────────────────────────────────────── */

interface EditorProps {
  condition: FilterCondition;
  field: FilterField<never>;
  onChange: (value: FilterValue) => void;
  onDone: () => void;
}

function TextEditor({ condition, field, onChange, onDone }: EditorProps) {
  return (
    <Field size="compact">
      <Field.Input
        aria-label={`${field.label} ${filterOpWords(condition.op, 'text')}`}
        value={typeof condition.value === 'string' ? condition.value : ''}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') onDone(); }}
      />
    </Field>
  );
}

function NumberEditor({ condition, field, onChange, onDone }: EditorProps) {
  const enter = (e: React.KeyboardEvent) => { if (e.key === 'Enter') onDone(); };
  const name = `${field.label} ${filterOpWords(condition.op, 'number')}`;
  if (condition.op !== 'between') {
    return <NumberField size="compact" aria-label={name} unit={field.unit} value={num(condition.value)} onValueChange={(n) => onChange(n)} onKeyDown={enter} />;
  }
  const [a, b] = pair(condition.value).map(num);
  return (
    <div className="grid gap-filters-editor-gap">
      <NumberField size="compact" aria-label={`${name}, from`} unit={field.unit} value={a} onValueChange={(n) => onChange([n, b])} onKeyDown={enter} />
      <span className={AND}>and</span>
      <NumberField size="compact" aria-label={`${name}, to`} unit={field.unit} value={b} onValueChange={(n) => onChange([a, n])} onKeyDown={enter} />
    </div>
  );
}

function OptionsEditor({ condition, field, onChange }: EditorProps) {
  const options = field.options ?? [];
  const chosen = Array.isArray(condition.value) ? (condition.value as string[]) : [];
  // Chosen options stand first, in the order they had when the editor opened; they stay put while it is open.
  const [order] = React.useState(() => [...options].sort((x, y) => Number(chosen.includes(y.value)) - Number(chosen.includes(x.value))));
  const [query, setQuery] = React.useState('');
  const threshold = typeof window === 'undefined' ? 8 : parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--mu-r-filters-editor-search')) || 8;
  const q = query.trim().toLocaleLowerCase();
  const shown = q ? order.filter((o) => o.label.toLocaleLowerCase().includes(q)) : order;
  return (
    <>
      {options.length > threshold && (
        <Field size="compact">
          <Field.Icon><SearchIcon /></Field.Icon>
          <Field.Input aria-label={`Find ${field.label.toLocaleLowerCase()}`} placeholder={`Find ${field.label.toLocaleLowerCase()}`} value={query} onChange={(e) => setQuery(e.target.value)} />
        </Field>
      )}
      <div className={LIST}>
        <CheckboxGroup aria-label={`${field.label} ${filterOpWords(condition.op, field.type, chosen.length)}`} value={chosen} onValueChange={(next) => onChange(options.filter((o) => next.includes(o.value)).map((o) => o.value))}>
          {shown.map((o) => <CheckboxGroup.Item key={o.value} value={o.value}>{o.label}</CheckboxGroup.Item>)}
        </CheckboxGroup>
        {!shown.length && <p className={`m-0 ${QUIET}`}>No matches for “{query}”</p>}
      </div>
    </>
  );
}

function DateEditor({ condition, field, onChange, onDone }: EditorProps) {
  const range = condition.op === 'between';
  const [draft, setDraft] = React.useState<Date | DateRange | null>(() => {
    if (range) {
      const [a, b] = pair(condition.value);
      return typeof a === 'string' ? { start: fromIso(a), end: typeof b === 'string' ? fromIso(b) : null } : null;
    }
    return typeof condition.value === 'string' ? fromIso(condition.value) : null;
  });
  const ready = draft instanceof Date || (!!draft && !!draft.end);
  const apply = () => {
    if (!draft) return;
    onChange(draft instanceof Date ? isoDay(draft) : [isoDay(draft.start), isoDay(draft.end!)]);
    onDone();
  };
  const label = `${field.label} ${filterOpWords(condition.op, 'date')}`;
  return (
    <>
      {range
        ? <Calendar mode="range" aria-label={label} months={2} autoFocus value={draft instanceof Date ? null : draft} onValueChange={setDraft} />
        : <Calendar aria-label={label} autoFocus value={draft instanceof Date ? draft : null} onValueChange={setDraft} />}
      <div className={FOOT}>
        <Button size="compact" onClick={onDone}>Cancel</Button>
        <Button size="compact" cap="primary" disabled={!ready} onClick={apply}>Apply</Button>
      </div>
    </>
  );
}

const editors: Record<Exclude<FilterType, 'boolean'>, React.ComponentType<EditorProps>> = {
  text: TextEditor, number: NumberEditor, select: OptionsEditor, multiselect: OptionsEditor, date: DateEditor,
};

/* ── The bar ────────────────────────────────────────────── */

export interface FiltersProps<Row = unknown> {
  /** What can be filtered. */
  fields: FilterField<Row>[];
  /** The conditions (controlled). Keep them: save them, put them in a URL, send them to a server. */
  value?: FilterCondition[];
  defaultValue?: FilterCondition[];
  onValueChange?: (value: FilterCondition[]) => void;
  /** Names the bar. Default "Filters". */
  'aria-label'?: string;
  /** The add key's word. Default "Filter". */
  addLabel?: string;
  className?: string;
}

/** A row of conditions you build and change in place, each read as a sentence: "Status is Open". */
export function Filters<Row = unknown>({ fields, value, defaultValue, onValueChange, 'aria-label': ariaLabel = 'Filters', addLabel = 'Filter', className }: FiltersProps<Row>) {
  const [own, setOwn] = React.useState<FilterCondition[]>(defaultValue ?? []);
  const list = value ?? own;
  const latest = React.useRef(list);
  latest.current = list;
  const commit = React.useCallback((next: FilterCondition[]) => {
    latest.current = next;
    if (value === undefined) setOwn(next);
    onValueChange?.(next);
  }, [value, onValueChange]);

  const [editing, setEditing] = React.useState<string | null>(null);
  const bar = React.useRef<HTMLDivElement>(null);
  const add = React.useRef<HTMLButtonElement>(null);
  const fieldOf = (id: string) => fields.find((f) => f.id === id) as FilterField<never> | undefined;
  const shown = list.filter((c) => fieldOf(c.field));
  const clearable = shown.length >= 2;

  const words = shown.map((c) => `${c.id}:${describeFilter(c, fieldOf(c.field)!)}`).join('|');
  useRowMotion(bar, `${words}|${clearable}`, true);

  const update = (id: string, patch: Partial<FilterCondition>) => commit(latest.current.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const remove = (ids: string[]) => {
    const rows = ids.map((id) => bar.current?.querySelector<HTMLElement>(`:scope > [data-row="${CSS.escape(id)}"]`) ?? null);
    if (clearable && shown.length - ids.length < 2) rows.push(bar.current?.querySelector<HTMLElement>(':scope > [data-row="clear"]') ?? null);
    add.current?.focus();
    leaveRows(rows, () => commit(latest.current.filter((c) => !ids.includes(c.id))));
  };
  const close = (c: FilterCondition) => {
    setEditing(null);
    const now = latest.current.find((x) => x.id === c.id);
    if (now && !filterComplete(now, fieldOf(now.field))) remove([now.id]);
  };

  // A menu hands focus back to its key as it closes (after its fade); the editor opens once it has, so
  // focus lands in the editor and stays. The timer covers a menu whose key already held focus.
  const editAfterMenu = (id: string) => {
    const el = bar.current;
    let done = false;
    const go = () => { if (!done) { done = true; el?.removeEventListener('focusin', go); setEditing(id); } };
    el?.addEventListener('focusin', go);
    window.setTimeout(go, 600);
  };

  const start = (field: FilterField<never>) => {
    const op = field.defaultOp ?? defaultOpOf[field.type];
    const c: FilterCondition = { id: newId(field.id), field: field.id, op, value: blank(field) };
    commit([...latest.current, c]);
    if (field.type !== 'boolean') editAfterMenu(c.id);
  };

  return (
    <Toolbar.Root ref={bar} aria-label={ariaLabel} className={cx(BAR, className)}>
      {shown.map((c) => {
        const field = fieldOf(c.field)!;
        const ops = opsByType[field.type];
        const sentence = describeFilter(c, field);
        const opWords = filterOpWords(c.op, field.type, countOf(c));
        const Editor = field.type === 'boolean' ? null : editors[field.type];
        return (
          <div key={c.id} data-row={c.id} role="group" aria-label={sentence} className={TOKEN}>
            <span className={NAME}>{field.icon}{field.label}</span>
            {ops.length > 1 ? (
              <Menu
                heading={field.label}
                trigger={<Toolbar.Button className={OP} aria-label={`Operator: ${opWords}`}><SwapText value={opWords} /></Toolbar.Button>}
              >
                {ops.map((op) => (
                  <MenuItem
                    key={op}
                    icon={op === c.op ? <CheckIcon /> : <span className={GLYPH_SLOT} />}
                    onSelect={() => {
                      if (op === c.op) return;
                      const next = { ...c, op, value: reshape(c, field.type, op) };
                      update(c.id, { op, value: next.value });
                      if (!filterComplete(next, field)) editAfterMenu(c.id);
                    }}
                  >
                    {filterOpWords(op, field.type, countOf(c))}
                  </MenuItem>
                ))}
              </Menu>
            ) : (
              <span className={OP_STILL}>{opWords}</span>
            )}
            {!noValue.has(c.op) && (Editor ? (
              <Popover open={editing === c.id} onOpenChange={(open) => (open ? setEditing(c.id) : close(c))}>
                <Popover.Trigger>
                  <Toolbar.Button className={VALUE} aria-label={`Value: ${filterValueWords(c, field)}`}><SwapText value={filterValueWords(c, field)} /></Toolbar.Button>
                </Popover.Trigger>
                <Popover.Content align="start" aria-label={`${field.label} ${opWords}`} className={field.type === 'date' ? DATES : EDITOR}>
                  <Editor condition={c} field={field} onChange={(v) => update(c.id, { value: v })} onDone={() => close(c)} />
                </Popover.Content>
              </Popover>
            ) : (
              <Menu heading={field.label} trigger={<Toolbar.Button className={VALUE} aria-label={`Value: ${filterValueWords(c, field)}`}><SwapText value={filterValueWords(c, field)} /></Toolbar.Button>}>
                {[true, false].map((b) => (
                  <MenuItem key={String(b)} icon={c.value === b ? <CheckIcon /> : <span className={GLYPH_SLOT} />} onSelect={() => update(c.id, { value: b })}>{b ? 'Yes' : 'No'}</MenuItem>
                ))}
              </Menu>
            ))}
            <Toolbar.Button render={<IconButton variant="mini" label={`Remove ${sentence}`} icon={<CloseIcon className="size-attachment-remove-glyph" />} />} onClick={() => remove([c.id])} />
          </div>
        );
      })}
      <div data-row="add" className="flex-none">
        <Menu
          heading="Filter by"
          trigger={<Toolbar.Button ref={add} render={<Button size="compact" icon={<FilterIcon />} />}>{addLabel}</Toolbar.Button>}
        >
          {fields.map((f) => (
            <MenuItem key={f.id} icon={f.icon ?? <span className={GLYPH_SLOT} />} onSelect={() => start(f as FilterField<never>)}>{f.label}</MenuItem>
          ))}
        </Menu>
      </div>
      {clearable && (
        <div data-row="clear" className="flex-none">
          <Toolbar.Button render={<Button size="compact" />} onClick={() => remove(shown.map((c) => c.id))}>Clear</Toolbar.Button>
        </div>
      )}
    </Toolbar.Root>
  );
}
