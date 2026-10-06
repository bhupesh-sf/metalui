'use client';

import * as React from 'react';
import { Checkbox } from '../checkbox/checkbox';
import { Led, type LedKind } from '../led/led';
import { Avatar, AvatarGroup } from '../avatar/avatar';
import { Chip } from '../chip/chip';
import { Meter } from '../meter/meter';
import { Sparkline } from '../sparkline/sparkline';
import { Skeleton } from '../skeleton/skeleton';
import { Tooltip } from '../tooltip/tooltip';
import { IconButton } from '../icon-button/icon-button';
import { Button } from '../button/button';
import { Menu, MenuItem, ListGlide, menuParts } from '../menu/menu';
import { Menu as BaseMenu } from '@base-ui/react/menu';
import { Icon } from '../../icons/Icon';
import { MorphIcon } from '../../icons/MorphIcon';
import type { IconName } from '../../icons/catalog.generated';
import { SwapText } from '../../motion/swap';
import { useWait } from '../../motion/wait';
import { useRowMotion, springOf } from '../../motion/rows';
import { useIsoLayoutEffect } from '../../motion/layout-effect';
import { motionReduced } from '../../motion/reduced';

/* ─────────────────────────────────────────────────────────
 * TABLE, rows of a person's things, read across and compared down
 *
 *   rest      engraved column labels over rows parted by engraved hairlines; density roomy 48
 *             (touch), regular 40 or compact 32
 *   cells     each column says its `kind` and the kind sets the look: text, number, currency,
 *             percent, delta, date, status, person, tags, progress, trend, yes, code, actions;
 *             an empty value is "—" in ink3 in every kind
 *   guide     one plate (the menu's row highlight) glides under the hovered or focused row on the
 *             settle spring: a reading guide, not stripes
 *   open      `onRowAction`: the primary cell is a button stretched over its row (click or ↩; ↑ ↓
 *             move between rows); the opened row takes the row's green rail
 *   actions   a `more` key at the row's end, shown on hover and focus, opens a Menu; one primary
 *             action may show as its own key beside it
 *   sort      the column's arrow morphs up ↔ down; every row travels from where it was to where it
 *             now belongs on the settle spring
 *   select    the row checkbox; select-all is mixed when some are chosen; chosen rows take a quiet
 *             green tint (a ToolStrip over the list acts on them: the host's)
 *   filtered  `filter`: the caption says "12 of 240" (the drum) with a Clear key
 *   waiting   `loading` with no rows: skeleton rows in the columns' shapes; with rows: they stay and
 *             dim after the show delay (useWait)
 *   empty     one row says so: `empty`, or "Nothing matches" and Clear when filtered, or the error
 *             with `sync-error` and Try again
 *   narrow    under 720 the priority 3 columns leave, under 560 the priority 2 ones; their values
 *             move to a second line under the primary cell
 *   sticky    the head stays on frost while the table scrolls (`maxHeight`, or the page)
 *   totals    a column's `total` fills a sunk readout row at the foot (sticky at the bottom); its
 *             figures turn on the drum when the rows change
 *   groups    `groupBy`: an engraved header row per group (its name, a count, subtotals) that stays
 *             under the head while its rows scroll; its chevron turns a quarter on the part spring
 *             and the rows below travel up into the gap (settle) or land when it opens (object)
 *   pinned    `pin: 'start'`: the first column stays on an opaque plate while the rest scroll
 *             sideways under it; its edge casts a shadow only while something is under it
 *   matrix    `rowHeader` cells are `<th scope="row">`; `check` cells are row checkboxes
 *   live      new rows land at the top (one nest above, object spring) and the rest travel down;
 *             scrolled away from the top, they wait behind an "N new" key instead of pushing you
 *   detail    `expandRow`: a chevron key opens a sunk panel under the row; it lands like a row and
 *             the rows below travel down to make room
 *   columns   `columnsMenu`: hide and show columns from a menu of checkboxes; `resizable`: drag the
 *             hairline at a header's end (it thickens to a grip on the part spring), ← → step it,
 *             a double-click or ↩ gives it back its own width; `onColumnsChange` keeps both
 * Reduce Motion: rows jump to their places and land at once; the arrow, chevrons and guide change at once.
 * An object: it stands for a person's things.
 * ───────────────────────────────────────────────────────── */

export type TableKind = 'text' | 'number' | 'currency' | 'percent' | 'delta' | 'date' | 'status' | 'person' | 'tags' | 'progress' | 'trend' | 'yes' | 'check' | 'code' | 'actions';
export type TableDensity = 'roomy' | 'regular' | 'compact';
export type TableStatus = Extract<LedKind, 'live' | 'waiting' | 'failed' | 'off'>;
export type SortState = { key: string; direction: 'ascending' | 'descending' } | null;

export interface TablePerson { name: string; src?: string }

export interface TableAction {
  label: string;
  onSelect: () => void;
  /** The 14 glyph: in the menu row, and on the key for the primary action. */
  icon?: IconName;
  danger?: boolean;
  /** Shown as its own key beside `more` on hover (one per row; it needs an icon). */
  primary?: boolean;
}

/** How a cell of a kind looks: the column's settings that a TableCell takes too. */
export interface TableCellFormat {
  /** In the header after its label ("Size (MB)"); currency shows its symbol by default, percent "%". */
  unit?: string;
  /** currency: an ISO code ("EUR"). */
  currency?: string;
  /** Fraction digits for number, currency, percent and delta. */
  digits?: number;
  /** date: relative ("3 h ago", the exact time in a tooltip; the default), or a fixed short date, time or both. */
  format?: 'relative' | 'date' | 'time' | 'datetime';
  /** delta: which way is good (up by default; a cost is better down). Colours the arrow, never alone. */
  better?: 'up' | 'down';
  /** status: the words for each light ("Deployed", "Building", "Failed"). */
  words?: Partial<Record<TableStatus, string>>;
  /** progress: the meter's warn and danger shares, for a level that can be too high (quota). Off by default. */
  warn?: number;
  danger?: number;
}

export interface TableColumn<Row> extends TableCellFormat {
  key: string;
  header: string;
  /** The look of its cells (text by default). `cell` replaces it for anything else. */
  kind?: TableKind;
  /** What the kind shows: the row's field named `key` by default. */
  value?: (row: Row) => unknown;
  /** text: a second line in ink2 (the primary cell's detail). */
  detail?: (row: Row) => React.ReactNode;
  /** Anything the kinds don't cover. */
  cell?: (row: Row) => React.ReactNode;
  /** Makes the column sortable by this value. */
  sortBy?: (row: Row) => string | number;
  /** Sortable by its value, read the kind's way (numbers, times, names). */
  sortable?: boolean;
  /** Overrides the kind's alignment. */
  align?: 'start' | 'end' | 'center';
  /** 1 stays; 3 leaves first as the table narrows (under 720), 2 next (under 560); their values move under the primary cell. */
  priority?: 1 | 2 | 3;
  /** The column that names the row (the first by default): it takes the open button, the detail and the moved values. */
  primary?: boolean;
  /** actions: the row's actions, in the menu under `more`. */
  actions?: (row: Row) => TableAction[];
  /** The figure in the totals row and each group's header: the sum or mean of the column's values, or your own. */
  total?: 'sum' | 'mean' | ((rows: Row[]) => unknown);
  /** The first column only: it stays at the start on its plate while the rest scroll sideways under it. */
  pin?: 'start';
  /** Its cells name their rows (`<th scope="row">`): the first column of a matrix. */
  rowHeader?: boolean;
  /** check: the cells are checkboxes (a permissions matrix); a null value is "—", not a box. */
  onCheckedChange?: (row: Row, checked: boolean) => void;
}

/** What a person changed about the columns: the ones they hid and the widths they dragged. */
export interface TableColumnsState {
  hidden?: string[];
  widths?: Record<string, number>;
}

export interface TableProps<Row> {
  columns: TableColumn<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  /** Names the table: a caption above it (visible) or only for assistive tech (`captionHidden`). */
  caption: string;
  captionHidden?: boolean;
  density?: TableDensity;
  sort?: SortState;
  defaultSort?: SortState;
  onSortChange?: (sort: SortState) => void;
  /** Turns on the checkbox column. */
  selected?: Set<string>;
  /** Names a row ("Select Lisbon", "More for Lisbon"); the primary column's value by default. */
  rowLabel?: (row: Row) => string;
  onSelectedChange?: (selected: Set<string>) => void;
  /** Opens a row (click or ↩ on it). */
  onRowAction?: (row: Row) => void;
  /** The row whose detail is showing: the green rail. */
  opened?: string | null;
  /** The host filters: the caption says how many of how many, with Clear. */
  filter?: { total: number; matched?: number; onClear: () => void };
  /** Rows are on their way: skeleton rows when there are none, dimmed rows when there are. */
  loading?: boolean;
  /** Skeleton rows while loading with none (5). */
  loadingRows?: number;
  /** It couldn't load: one row with the reason and Try again. */
  error?: { message: React.ReactNode; onRetry?: () => void } | null;
  /** What to say, and the action to start, when there are no rows. */
  empty?: React.ReactNode;
  /** When a filter matches nothing ("Nothing matches."); Clear follows. */
  emptyFiltered?: React.ReactNode;
  /** Scrolls inside this height with the head held on frost. */
  maxHeight?: number | string;
  /** Relative dates are counted from here (now). */
  now?: Date;
  /** The totals row's label ("Total"); the row shows when a column has a `total`. */
  footer?: React.ReactNode;
  /** Groups the rows under header rows (in the order the groups first appear in `rows`). */
  groupBy?: (row: Row) => string;
  /** Groups that start closed. */
  defaultCollapsed?: string[];
  /** Rows keep arriving at the top: they land, or wait behind "N new" while you're scrolled away. */
  live?: boolean;
  /** A little more about a row, in a panel under it (a chevron key at the row's start opens it). */
  expandRow?: (row: Row) => React.ReactNode;
  /** A key beside the caption opens a menu of the columns to hide and show. */
  columnsMenu?: boolean;
  /** Drag the hairline at a header's end to size its column. */
  resizable?: boolean;
  columnsState?: TableColumnsState;
  defaultColumnsState?: TableColumnsState;
  /** Hidden columns and dragged widths, for the host to keep. */
  onColumnsChange?: (state: TableColumnsState) => void;
  className?: string;
}

const FRAME = 'mu-table-frame table-frame w-full';
const TABLE = 'mu-table relative z-1 w-full table-reset';
const CAPTION = 'mu-table-caption caption-top text-left pb-table-caption-gap';
const CAPTION_ROW = 'flex flex-wrap items-baseline gap-x-table-row-gap gap-y-table-row-detail-gap';
const TH = 'mu-table-th align-middle h-table-head-height px-table-row-pad-x py-0 type-label engraved font-normal whitespace-nowrap table-rule table-sticky';
const SORT = 'mu-table-sort inline-flex items-center gap-table-sort-gap border-0 bg-transparent p-0 table-sort-button cursor-pointer outline-none focus-visible:focus-ring';
const ARROW = 'mu-table-arrow size-table-sort-glyph table-sort-arrow';
const TR = 'mu-table-row relative data-selected:bg-table-select-tint';
const RAIL = <span aria-hidden className="mu-table-rail table-rail" />;
const TD = 'mu-table-td align-middle h-table-row-height px-table-row-pad-x py-table-row-pad-y type-ui text-ink table-rule';
const PRIMARY = 'table-primary';
const OPEN = 'mu-table-open table-open';
const DETAIL = 'mu-table-detail table-truncate mt-table-row-detail-gap type-meta text-ink2';
const MORE = 'mu-table-more table-truncate type-meta text-ink2';
const STATE = 'mu-table-state py-table-state-pad-y px-table-row-pad-x type-body text-ink2 text-center';
const STATE_ROW = 'inline-flex flex-wrap items-center justify-center gap-table-state-gap';
const CHECK = 'mu-table-check w-table-row-height px-table-row-pad-x';
const LEAD = 'mu-table-lead w-table-row-height px-0 text-center';
const FOOT = 'mu-table-foot align-middle h-table-row-height px-table-row-pad-x py-0 type-ui text-ink table-total';
const GROUP = 'mu-table-group-cell align-middle px-table-row-pad-x py-0 type-ui text-ink2 table-group';
const GROUP_TOGGLE = 'mu-table-group-toggle type-label engraved table-group-toggle';
const CHEVRON = 'mu-table-chevron size-table-glyph-size table-chevron reduced-motion:transition-none';
const PIN = 'table-pin';
const RESIZE = 'mu-table-resize table-resize';
const NEWS = 'mu-table-news table-news';
const DETAIL_CELL = 'mu-table-detail-cell table-detail type-ui text-ink';
const SIZED = 'block overflow-hidden';
const NUMERIC = new Set<TableKind>(['number', 'currency', 'percent', 'delta']);
const LIFT = 'relative z-1';
const INLINE = 'inline-flex items-center gap-table-row-gap align-top';
const EMPTY = <span className="mu-table-none text-ink3">—<span className="sr-only">none</span></span>;
const DENSITY: Record<TableDensity, string> = { roomy: 'table-roomy', regular: '', compact: 'table-compact' };
type Align = NonNullable<TableColumn<unknown>['align']>;
const ALIGN: Record<Align, string> = { start: 'text-left', end: 'text-right', center: 'text-center' };
const kindAlign: Partial<Record<TableKind, 'end' | 'center'>> = { number: 'end', currency: 'end', percent: 'end', delta: 'end', yes: 'center', check: 'center', actions: 'end' };
const STATUS_WORDS: Record<TableStatus, string> = { live: 'Live', waiting: 'Waiting', failed: 'Failed', off: 'Off' };
const STATUS_ORDER: Record<TableStatus, number> = { failed: 0, waiting: 1, live: 2, off: 3 };
const TAGS_SHOWN = 2;
const PEOPLE_SHOWN = 4; // AvatarGroup max: three discs, then +N

const join = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join(' ');

/* ── formatting ─────────────────────────────────────────── */

const formats = new Map<string, Intl.NumberFormat>();
function numberFormat(options: Intl.NumberFormatOptions) {
  const key = JSON.stringify(options);
  let f = formats.get(key);
  if (!f) formats.set(key, (f = new Intl.NumberFormat(undefined, options)));
  return f;
}
/** A real minus sign, never the hyphen. */
const minus = (s: string) => s.replace(/-/g, '−');

const isEmpty = (v: unknown) => v == null || v === '' || (Array.isArray(v) && v.length === 0) || (typeof v === 'number' && Number.isNaN(v));

function digitsOf(kind: TableKind, f: TableCellFormat) {
  return f.digits ?? (kind === 'currency' ? 2 : kind === 'delta' ? 1 : 0);
}

/** The unit a header shows after its label. */
export function tableUnit(kind: TableKind | undefined, f: TableCellFormat) {
  if (f.unit != null) return f.unit;
  if (kind === 'percent') return '%';
  if (kind === 'currency' && f.currency) return numberFormat({ style: 'currency', currency: f.currency }).formatToParts(0).find((p) => p.type === 'currency')?.value;
  return undefined;
}

function plainNumber(kind: TableKind, value: number, f: TableCellFormat) {
  const d = digitsOf(kind, f);
  const shown = kind === 'percent' ? value * 100 : value;
  return minus(numberFormat({ minimumFractionDigits: d, maximumFractionDigits: d, signDisplay: kind === 'delta' ? 'exceptZero' : 'auto' }).format(shown));
}

const toDate = (v: unknown) => (v instanceof Date ? v : new Date(v as string | number));

const SECOND = 1000, MINUTE = 60 * SECOND, HOUR = 60 * MINUTE, DAY = 24 * HOUR;
let relativeFormat: Intl.RelativeTimeFormat | undefined;
function relative(date: Date, now: Date) {
  const ms = date.getTime() - now.getTime();
  const a = Math.abs(ms);
  relativeFormat ??= new Intl.RelativeTimeFormat(undefined, { numeric: 'auto', style: 'narrow' });
  if (a < 45 * SECOND) return relativeFormat.format(0, 'second');
  if (a < 45 * MINUTE) return relativeFormat.format(Math.round(ms / MINUTE), 'minute');
  if (a < 22 * HOUR) return relativeFormat.format(Math.round(ms / HOUR), 'hour');
  if (a < 7 * DAY) return relativeFormat.format(Math.round(ms / DAY), 'day');
  return shortDate(date, now, 'date');
}
function shortDate(date: Date, now: Date, format: 'date' | 'time' | 'datetime') {
  const year = date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined;
  const day: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year };
  const time: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };
  return date.toLocaleString(undefined, format === 'date' ? day : format === 'time' ? time : { ...day, ...time });
}
const exact = (date: Date) => date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

/** A value read the kind's way, for sorting. */
function sortValue(kind: TableKind, v: unknown): string | number {
  if (isEmpty(v)) return '';
  switch (kind) {
    case 'date': return toDate(v).getTime();
    case 'status': return STATUS_ORDER[(typeof v === 'object' ? (v as { status: TableStatus }).status : v) as TableStatus] ?? 9;
    case 'person': return (Array.isArray(v) ? (v[0] as TablePerson)?.name : (v as TablePerson).name) ?? '';
    case 'tags': return (v as string[]).join(' ');
    case 'trend': { const a = v as number[]; return a[a.length - 1] ?? 0; }
    case 'yes':
    case 'check': return v ? 1 : 0;
    default: return typeof v === 'number' ? v : String(v);
  }
}

/* ── cells ───────────────────────────────────────────────── */

/** Text that truncates; the whole shows in a tooltip only when it is cut. */
function Truncated({ children, className, render }: { children: React.ReactNode; className?: string; render?: React.ReactElement<React.HTMLAttributes<HTMLElement>> }) {
  const [cut, setCut] = React.useState(false);
  const measure = (e: React.SyntheticEvent<HTMLElement>) => setCut(e.currentTarget.scrollWidth > e.currentTarget.clientWidth + 1);
  const own = join('table-truncate', className);
  const node = render
    ? React.cloneElement(render, { className: join(render.props.className, own), onPointerEnter: measure, onFocus: measure, children })
    : <span className={own} onPointerEnter={measure}>{children}</span>;
  return <Tooltip label={children} wrap disabled={!cut}>{node}</Tooltip>;
}

function CopyKey({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);
  React.useEffect(() => {
    if (!copied) return;
    // The check holds for the recipe's copy.hold, then the copy glyph comes back.
    const t = setTimeout(() => setCopied(false), parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--mu-r-table-copy-hold')) || 0);
    return () => clearTimeout(t);
  }, [copied]);
  const copy = () => navigator.clipboard?.writeText(text).then(() => setCopied(true), () => setCopied(false));
  return (
    <span className={join(LIFT, 'table-reveal')} data-copied={copied ? '' : undefined}>
      <IconButton variant="ghost" label={copied ? `Copied ${text}` : `Copy ${text}`} icon={<MorphIcon name={copied ? 'check' : 'copy'} />} onClick={copy} />
    </span>
  );
}

function Actions({ actions, name }: { actions: TableAction[]; name: string }) {
  // The primary action also stays in the menu: its own key leaves when the table is narrow.
  const primary = actions.find((a) => a.primary && a.icon);
  const rest = actions;
  return (
    <span className={join(LIFT, 'inline-flex items-center table-reveal')}>
      {primary && <IconButton variant="ghost" className="mu-table-primary-key" label={`${primary.label} ${name}`} icon={<Icon name={primary.icon!} />} onClick={primary.onSelect} />}
      {rest.length > 0 && (
        <Menu align="end" trigger={<IconButton variant="ghost" label={`More for ${name}`} icon={<Icon name="more" />} />}>
          {rest.map((a) => <MenuItem key={a.label} icon={a.icon && <Icon name={a.icon} />} danger={a.danger} onSelect={a.onSelect}>{a.label}</MenuItem>)}
        </Menu>
      )}
    </span>
  );
}

export interface TableCellProps extends TableCellFormat {
  kind?: TableKind;
  value: unknown;
  /** What the value is, for assistive tech where the look has no words (a meter, a trend): the column's header. */
  label?: string;
  /** Relative dates are counted from here (now). */
  now?: Date;
  /** actions: the row's actions; `label` names the row ("More for Lisbon"). */
  actions?: TableAction[];
  /** Plain words for a line of text (the narrow line under the primary cell): people by name, tags joined. */
  inline?: boolean;
  /** check: the box changed (without it the box is read-only). `label` names it ("Publish, Editor"). */
  onCheckedChange?: (checked: boolean) => void;
}

/** One value in the look of its kind: the table's cells, and values in Properties. */
export function TableCell({ kind = 'text', value, label = '', now, actions, inline, onCheckedChange, ...f }: TableCellProps) {
  if (kind === 'actions') return actions?.length ? <Actions actions={actions} name={label} /> : null;
  if (isEmpty(value)) return EMPTY;
  if (kind === 'check' && inline) kind = 'yes';
  switch (kind) {
    case 'check':
      return <Checkbox size="row" className={join(LIFT, 'align-middle')} aria-label={label} checked={!!value} disabled={!onCheckedChange} onCheckedChange={(on) => onCheckedChange?.(!!on)} />;
    case 'number':
    case 'currency':
    case 'percent':
      return <span className="tabular-nums">{plainNumber(kind, Number(value), f)}</span>;
    case 'delta': {
      const n = Number(value);
      if (n === 0) return <span className="tabular-nums text-ink2">{plainNumber(kind, 0, f)}</span>;
      const up = n > 0;
      const good = up === ((f.better ?? 'up') === 'up');
      return (
        <span className={join(INLINE, 'tabular-nums')} data-trend={up ? 'up' : 'down'}>
          <span aria-hidden className={join('inline-flex table-arrow', good ? 'text-green' : 'text-red')}><Icon name="arrow" animate={false} turn={up ? 0 : 180} className="size-table-glyph-size" /></span>
          {plainNumber(kind, n, f)}
        </span>
      );
    }
    case 'date': {
      const d = toDate(value);
      if (Number.isNaN(d.getTime())) return EMPTY;
      const at = now ?? new Date();
      const format = f.format ?? 'relative';
      const words = format === 'relative' ? relative(d, at) : shortDate(d, at, format);
      return (
        <Tooltip label={exact(d)} disabled={format !== 'relative'}>
          <time dateTime={d.toISOString()} className="tabular-nums">{words}</time>
        </Tooltip>
      );
    }
    case 'status': {
      const s = (typeof value === 'object' ? (value as { status: TableStatus }).status : value) as TableStatus;
      const word = (typeof value === 'object' ? (value as { label?: string }).label : undefined) ?? f.words?.[s] ?? STATUS_WORDS[s];
      return <span className={INLINE} data-status={s}><Led kind={s} size="small" />{word}</span>;
    }
    case 'person': {
      const people = (Array.isArray(value) ? value : [value]) as TablePerson[];
      if (inline) return <>{people.map((p) => p.name).join(', ')}</>;
      if (people.length === 1) return <span className={join(INLINE, 'min-w-0')}><Avatar {...people[0]} size="small" label="" /><span className="table-truncate">{people[0].name}</span></span>;
      return <AvatarGroup people={people} max={PEOPLE_SHOWN} size="small" aria-label={people.map((p) => p.name).join(', ')} className="align-top" />;
    }
    case 'tags': {
      const tags = value as string[];
      if (inline) return <>{tags.join(', ')}</>;
      const rest = tags.slice(TAGS_SHOWN);
      return (
        <span className={join(INLINE, 'gap-table-sort-gap')}>
          {tags.slice(0, TAGS_SHOWN).map((t) => <Chip key={t} variant="tag">{t}</Chip>)}
          {rest.length > 0 && (
            <Tooltip label={rest.join(', ')}>
              <span className={join(LIFT, 'type-meta tabular-nums text-ink2')}>+{rest.length}<span className="sr-only">: {rest.join(', ')}</span></span>
            </Tooltip>
          )}
        </span>
      );
    }
    case 'progress': {
      const share = Math.min(1, Math.max(0, Number(value)));
      return (
        <Tooltip label={`${plainNumber('percent', share, f)}%`}>
          <span className="inline-grid align-top"><Meter value={share * 100} segments={12} warn={f.warn ?? 1} danger={f.danger ?? 1} aria-label={label} className="table-meter" /></span>
        </Tooltip>
      );
    }
    case 'trend': {
      const points = value as number[];
      return (
        <span className="inline-block align-top w-table-trend-width">
          <Sparkline points={points.map((v) => ({ value: v }))} size="mini" width={72} role="img" aria-label={`${label} trend, ${minus(String(points[0]))} to ${minus(String(points[points.length - 1]))}`} />
        </span>
      );
    }
    case 'yes':
      return value ? <><Icon name="check" animate={false} className="inline-block size-table-glyph-size align-top text-ink" /><span className="sr-only">Yes</span></> : <span className="sr-only">No</span>;
    case 'code':
      if (inline) return <span className="type-label-cell">{String(value)}</span>;
      return <span className={INLINE}><span className="type-label-cell text-ink">{String(value)}</span><CopyKey text={String(value)} /></span>;
    default:
      return <Truncated>{String(value)}</Truncated>;
  }
}

/* ── the table ───────────────────────────────────────────── */

const valueOf = <Row,>(c: TableColumn<Row>, r: Row) => (c.value ? c.value(r) : (r as Record<string, unknown>)[c.key]);
/** A column's look settings, for its TableCell. */
const formatOf = ({ unit, currency, digits, format, better, words, warn, danger }: TableCellFormat): TableCellFormat => ({ unit, currency, digits, format, better, words, warn, danger });
/** A length token read off an element, in px. */
const cssPx = (el: Element, name: string) => parseFloat(getComputedStyle(el).getPropertyValue(name)) || 0;

/** A skeleton in a column's shape. */
function Shape({ kind = 'text', primary }: { kind?: TableKind; primary: boolean }) {
  if (kind === 'actions' || kind === 'yes' || kind === 'check') return null;
  if (kind === 'person') return <span className={INLINE}><Skeleton.Circle size={24} /><Skeleton.Text lines={1} width={64} /></span>;
  const width = primary ? '60%' : kind === 'text' || kind === 'tags' || kind === 'trend' || kind === 'progress' ? 72 : kind === 'status' || kind === 'date' || kind === 'code' ? 56 : 44;
  return <Skeleton.Text lines={1} width={width} className={kindAlign[kind] === 'end' ? 'ml-auto' : undefined} />;
}

/** A column's total over some rows: the sum or mean of its values, or the host's own. */
function totalOf<Row>(c: TableColumn<Row>, rows: Row[]): unknown {
  if (typeof c.total === 'function') return c.total(rows);
  const ns = rows.map((r) => valueOf(c, r)).filter((v) => !isEmpty(v)).map(Number).filter((n) => !Number.isNaN(n));
  if (ns.length === 0) return null;
  const sum = ns.reduce((a, b) => a + b, 0);
  return c.total === 'mean' ? sum / ns.length : sum;
}

/** A total in its column's look; figures turn on the drum when they change. */
function Total<Row>({ column, rows, now }: { column: TableColumn<Row>; rows: Row[]; now?: Date }) {
  const kind = column.kind ?? 'text';
  const value = totalOf(column, rows);
  if (typeof value === 'number' && NUMERIC.has(kind)) return <span className="tabular-nums"><SwapText value={plainNumber(kind, value, column)} /></span>;
  return <TableCell kind={kind} value={value} label={column.header} now={now} {...formatOf(column)} />;
}

/** One row of the column menu: the column's name and a checkbox drawn as the Checkbox part. */
function ColumnItem({ checked, disabled, onCheckedChange, children }: { checked: boolean; disabled?: boolean; onCheckedChange: (on: boolean) => void; children: React.ReactNode }) {
  return (
    <BaseMenu.CheckboxItem className={menuParts.LIVE_ROW} checked={checked} disabled={disabled} closeOnClick={false} onCheckedChange={(on) => onCheckedChange(on)}>
      <span aria-hidden inert className={join(menuParts.GLYPH, 'pointer-events-none')}><Checkbox size="row" checked={checked} disabled={disabled} tabIndex={-1} /></span>
      <span className={menuParts.LABEL}>{children}</span>
    </BaseMenu.CheckboxItem>
  );
}

/** A row's detail panel: it opens from its top edge on the settle spring, in step with the rows below
 * travelling down, so their edge and the panel's reveal move together and nothing overlaps. */
function DetailCell({ span, children }: { span: number; children: React.ReactNode }) {
  const ref = React.useRef<HTMLTableCellElement>(null);
  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { ms, easing } = springOf(el, 'settle');
    if (!ms) return;
    const a = el.animate([{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: ms, easing });
    return () => a.cancel();
  }, []);
  return <td ref={ref} colSpan={span} className={DETAIL_CELL}><div>{children}</div></td>;
}

/** A row group: its rows travel when they move and land when they arrive (the rows' motion). */
function Body({ order, land, open = true, waiting, children }: { order: string; land: Set<string>; open?: boolean; waiting?: boolean; children: React.ReactNode }) {
  const ref = React.useRef<HTMLTableSectionElement>(null);
  const was = React.useRef(open);
  useRowMotion(ref, order, land);
  // A group opening reveals its rows from under its header, in step with the groups below travelling down.
  useIsoLayoutEffect(() => {
    const el = ref.current;
    const opening = open && !was.current;
    was.current = open;
    const head = el?.rows[0];
    if (!el || !head || !opening) return;
    const { ms, easing } = springOf(el, 'settle');
    if (ms) el.animate([{ clipPath: `inset(0 0 ${el.offsetHeight - head.offsetHeight}px 0)` }, { clipPath: 'inset(0 0 0 0)' }], { duration: ms, easing });
  }, [open]);
  return <tbody ref={ref} data-waiting={waiting ? '' : undefined} className="spinner-item">{children}</tbody>;
}

/** Rows of things: kinds of cells, sort, selection, open, actions, and every way of having none. */
export function Table<Row>({
  columns, rows, rowKey, caption, captionHidden, density = 'regular', sort, defaultSort = null, onSortChange,
  selected, onSelectedChange, rowLabel, onRowAction, opened, filter, loading, loadingRows = 5, error, empty = 'Nothing here yet.',
  emptyFiltered = 'Nothing matches.', maxHeight, now, footer = 'Total', groupBy, defaultCollapsed, live, expandRow,
  columnsMenu, resizable, columnsState, defaultColumnsState, onColumnsChange, className,
}: TableProps<Row>) {
  const [ownSort, setOwnSort] = React.useState<SortState>(defaultSort);
  const current = sort !== undefined ? sort : ownSort;
  const frame = React.useRef<HTMLDivElement>(null);
  const table = React.useRef<HTMLTableElement>(null);
  const [guide, setGuide] = React.useState<string | null>(null);
  const wait = useWait(loading ? 'working' : 'idle', frame);
  const [collapsed, setCollapsed] = React.useState(() => new Set(defaultCollapsed));
  const [expanded, setExpanded] = React.useState(() => new Set<string>());
  const [away, setAway] = React.useState(false);
  const known = React.useRef<Set<string> | null>(null);
  // Keys to land on their next arrival (live rows, an opened group's rows, a detail panel), taken out as they land.
  const [landing] = React.useState(() => new Set<string>());

  // Columns the person hid or sized.
  const [ownLayout, setOwnLayout] = React.useState<TableColumnsState>(defaultColumnsState ?? {});
  const layout = columnsState ?? ownLayout;
  const [dragged, setDragged] = React.useState<Record<string, number> | null>(null);
  const widths = dragged ?? layout.widths ?? {};
  const hidden = new Set(layout.hidden);
  const setLayout = (next: TableColumnsState) => {
    if (columnsState === undefined) setOwnLayout(next);
    onColumnsChange?.(next);
  };

  const primaryAt = Math.max(0, columns.findIndex((c) => c.primary));
  const primary = columns[primaryAt];
  const shown = columns.filter((c) => c === primary || !hidden.has(c.key));
  const primaryIndex = shown.indexOf(primary);
  const labelOf = (r: Row) => (rowLabel ? rowLabel(r) : String(valueOf(primary, r) ?? rowKey(r)));
  const moved = shown.filter((c, i) => i !== primaryIndex && (c.priority ?? 1) > 1 && c.kind !== 'actions');
  const totals = shown.some((c) => c.total);
  const pinned = shown[0]?.pin === 'start';

  // Live: rows that arrive while you're scrolled away wait, unseen, until you come back or ask.
  let present = rows;
  if (live) {
    if (!known.current) known.current = new Set(rows.map(rowKey));
    else if (!away) {
      for (const r of rows) {
        const k = rowKey(r);
        if (!known.current.has(k)) { known.current.add(k); landing.add(k); }
      }
    }
    const seen = known.current;
    present = rows.filter((r) => seen.has(rowKey(r)));
  }
  const waiting = rows.length - present.length;

  React.useEffect(() => {
    const el = frame.current;
    if (!live || !el) return;
    const check = () => {
      const slop = cssPx(el, '--mu-r-table-live-slop');
      setAway(el.scrollTop > slop || el.getBoundingClientRect().top < -slop);
    };
    el.addEventListener('scroll', check, { passive: true });
    window.addEventListener('scroll', check, { passive: true });
    return () => { el.removeEventListener('scroll', check); window.removeEventListener('scroll', check); };
  }, [live]);

  const release = () => {
    const el = frame.current;
    setAway(false);
    if (!el) return;
    const behavior = motionReduced(el) ? 'auto' : 'smooth';
    if (el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: 'start', behavior });
    el.scrollTo({ top: 0, behavior });
  };

  const sorted = React.useMemo(() => {
    const col = current && columns.find((c) => c.key === current.key);
    if (!col || !(col.sortBy || col.sortable)) return present;
    const by = col.sortBy ?? ((r: Row) => sortValue(col.kind ?? 'text', valueOf(col, r)));
    const dir = current!.direction === 'ascending' ? 1 : -1;
    return [...present].sort((a, b) => {
      const x = by(a), y = by(b);
      return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y))) * dir;
    });
  }, [present, columns, current]);

  // Groups in the order they first appear in the host's rows; each group's rows in the sorted order.
  const groups: { name: string | null; rows: Row[] }[] = [];
  if (groupBy) {
    const at = new Map<string, Row[]>();
    for (const r of present) { const g = groupBy(r); if (!at.has(g)) { at.set(g, []); groups.push({ name: g, rows: at.get(g)! }); } }
    for (const r of sorted) at.get(groupBy(r))!.push(r);
  } else groups.push({ name: null, rows: sorted });

  const open = (g: string | null) => g == null || !collapsed.has(g);
  const order = groups.map((g) => [g.name == null ? '' : `group:${g.name}`, ...(open(g.name) ? g.rows.flatMap((r) => {
    const k = rowKey(r);
    return expandRow && expanded.has(k) ? [k, `${k}:detail`] : [k];
  }) : [])].join(' ')).join(' ');

  const toggleGroup = (g: { name: string | null; rows: Row[] }) => {
    if (g.name == null) return;
    const next = new Set(collapsed);
    if (!next.delete(g.name)) next.add(g.name);
    setCollapsed(next);
  };
  const toggleRow = (key: string) => {
    const next = new Set(expanded);
    if (!next.delete(key)) next.add(key);
    setExpanded(next);
  };

  const toggleSort = (key: string) => {
    const next: SortState = current?.key === key ? { key, direction: current.direction === 'ascending' ? 'descending' : 'ascending' } : { key, direction: 'ascending' };
    if (sort === undefined) setOwnSort(next);
    onSortChange?.(next);
  };

  const selectable = selected != null;
  const all = rows.length > 0 && selectable && rows.every((r) => selected!.has(rowKey(r)));
  const some = selectable && !all && rows.some((r) => selected!.has(rowKey(r)));
  const setAll = (on: boolean) => onSelectedChange?.(on ? new Set(rows.map(rowKey)) : new Set());
  const setOne = (key: string, on: boolean) => {
    const next = new Set(selected);
    if (on) next.add(key); else next.delete(key);
    onSelectedChange?.(next);
  };

  // Sizing: a column's cells hold their content in a box of the dragged width (the table stays auto, so
  // the primary column still takes what is left). Keys step it; ↩ or a double-click gives it back.
  const setWidth = (key: string, width: number | null, final: boolean) => {
    const next = { ...widths };
    if (width == null) delete next[key]; else next[key] = width;
    if (final) { setDragged(null); setLayout({ ...layout, widths: next }); } else setDragged(next);
  };
  const resizeStart = (key: string) => (e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const handle = e.currentTarget;
    const min = cssPx(handle, '--mu-r-table-resize-min');
    const x0 = e.clientX, w0 = handle.parentElement!.getBoundingClientRect().width;
    let w = w0;
    handle.setPointerCapture(e.pointerId);
    handle.dataset.dragging = '';
    const move = (ev: PointerEvent) => { w = Math.max(min, Math.round(w0 + ev.clientX - x0)); setWidth(key, w, false); };
    const up = () => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
      handle.removeEventListener('pointercancel', up);
      delete handle.dataset.dragging;
      setWidth(key, w, true);
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
    handle.addEventListener('pointercancel', up);
  };
  const resizeKey = (key: string) => (e: React.KeyboardEvent<HTMLElement>) => {
    const handle = e.currentTarget;
    if (e.key === 'Enter') { e.preventDefault(); setWidth(key, null, true); return; }
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const step = cssPx(handle, '--mu-r-table-resize-step') * (e.key === 'ArrowLeft' ? -1 : 1);
    const w = widths[key] ?? Math.round(handle.parentElement!.getBoundingClientRect().width);
    setWidth(key, Math.max(cssPx(handle, '--mu-r-table-resize-min'), w + step), true);
  };
  /** A sized column's content, in a box as wide as the column less its padding. */
  const sized = (c: TableColumn<Row>, node: React.ReactNode) => (widths[c.key] == null ? node : (
    <span className={SIZED} style={{ width: `calc(${widths[c.key]}px - 2 * var(--mu-r-table-row-pad-x))` }}>{node}</span>
  ));

  // The guide follows the pointer, and focus inside a row (keyboard included).
  const rowOf = (el: EventTarget | null) => (el instanceof Element ? el.closest<HTMLElement>('tr[data-key]')?.dataset.key ?? null : null);
  const onKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key !== 'ArrowDown' && e.key !== 'ArrowUp') || !(e.target as Element).classList?.contains('mu-table-open')) return;
    const opens = [...(table.current?.querySelectorAll<HTMLElement>('tbody .mu-table-open') ?? [])];
    const at = opens.indexOf(e.target as HTMLElement);
    const to = opens[at + (e.key === 'ArrowDown' ? 1 : -1)];
    if (to) { e.preventDefault(); to.focus(); }
  };

  const leads = (selectable ? 1 : 0) + (expandRow ? 1 : 0);
  const span = shown.length + leads;
  // Pinned: the lead cells and the first column stay at the start, each after the ones before it.
  const pinAt = (i: number) => (pinned ? { left: `calc(var(--mu-r-table-row-height) * ${i})` } : undefined);
  const matched = filter?.matched ?? rows.length;
  const filtered = !!filter && matched < filter.total;
  const align = (c: TableColumn<Row>) => c.align ?? kindAlign[c.kind ?? 'text'] ?? 'start';
  const leave = (c: TableColumn<Row>) => (c.priority && c.priority > 1 ? c.priority : undefined);
  const stateRow = (node: React.ReactNode, kind: string) => <tr data-state={kind}><td colSpan={span} className={STATE}><span className={STATE_ROW}>{node}</span></td></tr>;
  const clear = filter && <Button size="compact" className={LIFT} onClick={filter.onClear}>Clear</Button>;
  const dim = loading && rows.length > 0 && wait.showing;

  const leadCells = (part: 'head' | 'body' | 'foot', node: { check?: React.ReactNode; expand?: React.ReactNode; rail?: boolean } = {}) => {
    const head = part === 'head';
    const Cell = head ? 'th' : 'td';
    const base = head ? TH : part === 'foot' ? FOOT : TD;
    let i = 0;
    return (
      <>
        {selectable && <Cell scope={head ? 'col' : undefined} className={join(base, CHECK, pinned && PIN)} style={pinAt(i++)}>{node.rail && RAIL}{node.check}</Cell>}
        {expandRow && <Cell scope={head ? 'col' : undefined} className={join(base, LEAD, pinned && PIN)} style={pinAt(i++)}>{node.rail && !selectable && RAIL}{head ? <span className="sr-only">Details</span> : node.expand}</Cell>}
      </>
    );
  };

  const rowOfData = (r: Row) => {
    const key = rowKey(r);
    const on = selectable && selected!.has(key);
    const name = labelOf(r);
    const isOpen = expanded.has(key);
    const detailId = `${key}-detail`;
    const out = [
      <tr
        key={key}
        data-key={key}
        data-row={key}
        data-selected={on ? '' : undefined}
        data-open={opened === key ? '' : undefined}
        data-highlighted={guide === key ? '' : undefined}
        aria-selected={selectable ? on : undefined}
        onPointerEnter={() => setGuide(key)}
        className={TR}
      >
        {leadCells('body', {
          rail: opened === key,
          check: <Checkbox size="row" className={LIFT} aria-label={`Select ${name}`} checked={on} onCheckedChange={(v) => setOne(key, !!v)} />,
          expand: <IconButton variant="ghost" className={join(LIFT, 'align-middle')} label={`Details for ${name}`} aria-expanded={isOpen} aria-controls={isOpen ? detailId : undefined} icon={<Icon name="chevron" animate={false} className={CHEVRON} />} onClick={() => toggleRow(key)} />,
        })}
        {shown.map((c, ci) => {
          const isPrimary = ci === primaryIndex;
          const value = valueOf(c, r);
          let inner: React.ReactNode = c.cell ? c.cell(r) : (
            <TableCell kind={c.kind} value={value} label={c.kind === 'actions' ? name : c.kind === 'check' ? `${name}, ${c.header}` : c.header} now={now}
              actions={c.actions?.(r)} onCheckedChange={c.onCheckedChange && ((v) => c.onCheckedChange!(r, v))} {...formatOf(c)} />
          );
          if (isPrimary) {
            const detail = c.detail?.(r);
            if (onRowAction && !c.cell) {
              inner = <Truncated render={<button type="button" className={OPEN} onClick={() => onRowAction(r)} />}>{isEmpty(value) ? key : String(value)}</Truncated>;
            }
            inner = (
              <>
                {inner}
                {detail != null && <span className={DETAIL}>{detail}</span>}
                {moved.length > 0 && (
                  <span className={MORE}>
                    {moved.map((m) => (
                      <span key={m.key} data-more={m.priority} className="me-table-row-gap">
                        <span className="text-ink3">{m.header} </span>
                        {m.cell ? m.cell(r) : <TableCell kind={m.kind} value={valueOf(m, r)} label={m.header} now={now} inline {...formatOf(m)} />}
                      </span>
                    ))}
                  </span>
                )}
              </>
            );
          }
          const Cell = c.rowHeader ? 'th' : 'td';
          return (
            <Cell
              key={c.key}
              scope={c.rowHeader ? 'row' : undefined}
              data-leave={leave(c)}
              data-kind={c.kind ?? 'text'}
              style={ci === 0 ? pinAt(leads) : undefined}
              className={join(TD, ALIGN[align(c)], isPrimary && !pinned ? PRIMARY : 'whitespace-nowrap', (c.kind ?? 'text') === 'text' && !isPrimary && 'table-text', ci === 0 && pinned && PIN, c.rowHeader && 'normal-case')}
            >
              {ci === 0 && leads === 0 && opened === key && RAIL}
              {sized(c, inner)}
            </Cell>
          );
        })}
      </tr>,
    ];
    if (expandRow && isOpen) {
      out.push(
        <tr key={`${key}:detail`} id={detailId} data-row={`${key}:detail`} data-detail className="mu-table-detail-row">
          <DetailCell span={span}>{expandRow(r)}</DetailCell>
        </tr>,
      );
    }
    return out;
  };

  let content: React.ReactNode;
  if (error) {
    content = <tbody>{stateRow(<><Icon name="sync-error" animate={false} className="size-table-glyph-size text-red" />{error.message}{error.onRetry && <Button size="compact" onClick={error.onRetry}>Try again</Button>}</>, 'error')}</tbody>;
  } else if (loading && rows.length === 0) {
    content = (
      <tbody>
        {Array.from({ length: loadingRows }, (_, i) => (
          <tr key={i} data-state="loading" aria-hidden>
            {leadCells('body')}
            {shown.map((c, ci) => <td key={c.key} data-leave={leave(c)} className={join(TD, ALIGN[align(c)])}><Shape kind={c.kind} primary={ci === primaryIndex} /></td>)}
          </tr>
        ))}
      </tbody>
    );
  } else if (sorted.length === 0) {
    content = <tbody>{filter && filter.total > 0 ? stateRow(<>{emptyFiltered}{clear}</>, 'filtered') : stateRow(empty, 'empty')}</tbody>;
  } else {
    content = groups.map((g) => (
      <Body key={g.name ?? ''} order={order} land={landing} open={open(g.name)} waiting={dim}>
        {g.name != null && (
          <tr data-row={`group:${g.name}`} data-group={g.name} className="mu-table-group">
            <th scope="rowgroup" colSpan={leads + primaryIndex + 1} className={join(GROUP, pinned && PIN)} style={pinAt(0)}>
              <button type="button" className={GROUP_TOGGLE} aria-expanded={open(g.name)} onClick={() => toggleGroup(g)}>
                <Icon name="chevron" animate={false} className={CHEVRON} />
                {g.name}
                <span className="text-ink3 tabular-nums"><SwapText value={String(g.rows.length)} /></span>
              </button>
            </th>
            {shown.slice(primaryIndex + 1).map((c) => (
              <td key={c.key} data-leave={leave(c)} className={join(GROUP, ALIGN[align(c)], 'whitespace-nowrap')}>{c.total && sized(c, <Total column={c} rows={g.rows} now={now} />)}</td>
            ))}
          </tr>
        )}
        {open(g.name) && g.rows.flatMap(rowOfData)}
      </Body>
    ));
  }

  const menu = columnsMenu && (
    <Menu align="end" heading="Columns" trigger={<IconButton variant="ghost" label="Columns" className={join(LIFT, 'ms-auto self-center')} icon={<Icon name="eye" />} />}>
      {columns.filter((c) => c.kind !== 'actions').map((c) => (
        <ColumnItem key={c.key} checked={c === primary || !hidden.has(c.key)} disabled={c === primary}
          onCheckedChange={(on) => setLayout({ ...layout, hidden: on ? [...hidden].filter((k) => k !== c.key) : [...hidden, c.key] })}>
          {c.header}
        </ColumnItem>
      ))}
    </Menu>
  );

  return (
    <div
      ref={frame}
      className={join(FRAME, DENSITY[density], maxHeight != null && 'overflow-y-auto', (pinned || resizable) && 'overflow-x-auto', className)}
      style={maxHeight != null ? { maxHeight } : undefined}
      onScroll={(e) => e.currentTarget.toggleAttribute('data-scrolled-x', e.currentTarget.scrollLeft > 0)}
      onPointerLeave={() => setGuide(null)}
      onFocus={(e) => setGuide(rowOf(e.target))}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setGuide(null); }}
    >
      <ListGlide />
      {live && (
        <div className={NEWS}>
          <Button size="compact" inert={!waiting} aria-hidden={!waiting} onClick={release} icon={<span className="inline-flex table-arrow"><Icon name="arrow" animate={false} className="size-table-glyph-size" /></span>}>
            <SwapText value={`${waiting} new`} />
          </Button>
        </div>
      )}
      <table ref={table} className={TABLE} aria-busy={wait.busy || (loading && rows.length === 0) || undefined} data-density={density} onKeyDown={onKeyDown}>
        <caption className={captionHidden && !filtered && !menu ? 'sr-only' : CAPTION}>
          <span className={CAPTION_ROW}>
            <span className={captionHidden ? 'sr-only' : 'type-title text-ink'}>{caption}</span>
            {filtered && (
              <>
                <span className="type-ui tabular-nums text-ink2" aria-live="polite"><SwapText value={`${matched} of ${filter.total}`} /></span>
                {matched > 0 && clear}
              </>
            )}
            {menu}
          </span>
        </caption>
        <thead>
          <tr>
            {selectable || expandRow ? leadCells('head', {
              check: <Checkbox size="row" aria-label="Select all" checked={all} doing={some} disabled={rows.length === 0} onCheckedChange={(on) => setAll(!!on)} />,
            }) : null}
            {shown.map((c, ci) => {
              const dir = current?.key === c.key ? current.direction : undefined;
              const unit = tableUnit(c.kind, c);
              const label = <>{c.kind === 'actions' ? <span className="sr-only">{c.header}</span> : c.header}{unit && <span className="text-ink3"> ({unit})</span>}</>;
              const sortable = !!(c.sortBy || c.sortable);
              const sizable = resizable && ci !== primaryIndex && c.kind !== 'actions';
              return (
                <th key={c.key} scope="col" data-col={c.key} aria-sort={sortable ? dir ?? 'none' : undefined} data-leave={leave(c)}
                  style={ci === 0 ? pinAt(leads) : undefined} className={join(TH, ALIGN[align(c)], ci === 0 && pinned && PIN)}>
                  {sized(c, sortable ? (
                    <button type="button" className={SORT} onClick={() => toggleSort(c.key)}>
                      {label}
                      <MorphIcon name="arrow" turn={dir === 'descending' ? 180 : 0} className={ARROW} />
                    </button>
                  ) : label)}
                  {sizable && (
                    <span
                      role="separator"
                      aria-orientation="vertical"
                      aria-label={`Size ${c.header}`}
                      aria-valuenow={widths[c.key]}
                      tabIndex={0}
                      className={RESIZE}
                      onPointerDown={resizeStart(c.key)}
                      onKeyDown={resizeKey(c.key)}
                      onDoubleClick={() => setWidth(c.key, null, true)}
                    />
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        {content}
        {totals && sorted.length > 0 && !error && (
          <tfoot>
            <tr className="mu-table-total">
              {leadCells('foot')}
              {shown.map((c, ci) => (
                <td key={c.key} data-leave={leave(c)} style={ci === 0 ? pinAt(leads) : undefined}
                  className={join(FOOT, ALIGN[align(c)], 'whitespace-nowrap', ci === 0 && pinned && PIN)}>
                  {ci === primaryIndex ? (
                    <>
                      <span className="type-label engraved">{footer}</span>
                      {moved.some((m) => m.total) && (
                        <span className={MORE}>
                          {moved.filter((m) => m.total).map((m) => (
                            <span key={m.key} data-more={m.priority} className="me-table-row-gap"><span className="text-ink3">{m.header} </span><Total column={m} rows={sorted} now={now} /></span>
                          ))}
                        </span>
                      )}
                    </>
                  ) : c.total && sized(c, <Total column={c} rows={sorted} now={now} />)}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
