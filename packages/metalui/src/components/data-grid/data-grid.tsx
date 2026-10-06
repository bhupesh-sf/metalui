'use client';

import * as React from 'react';
import { flushSync } from 'react-dom';
import { Table, TableCell, type TableColumn, type TableColumnsState, type TableGrid, type TableProps, type TableStatus } from '../table/table';
import { Field } from '../field/field';
import { NumberField } from '../number-field/number-field';
import { Select, type SelectOption } from '../select/select';
import { Checkbox } from '../checkbox/checkbox';
import { useSortable } from '../sortable/sortable';
import { refuse } from '../../motion/refuse';
import { useIsoLayoutEffect } from '../../motion/layout-effect';

/* ─────────────────────────────────────────────────────────
 * DATA GRID, a table whose cells are targets: walk them, edit them where they stand, copy and paste ranges
 * (a price list, a bulk edit). Table in grid mode: role="grid", the APG grid pattern.
 *
 *   rest      Table's look, plus a hairline between cells (cells are targets now)
 *   focus     one cell holds focus (roving tabindex): a 2 ring inside it. ← → ↑ ↓ walk, Home/End the row's
 *             ends, ⌘/Ctrl with them the grid's; Tab leaves the grid
 *   range     Shift with the arrows, Shift-click or a drag: the cells take a quiet green tint; ⌘A all;
 *             Escape back to one cell
 *   edit      Enter, F2, a double-click, or typing over it: the cell's editor stands in it (Field for text
 *             and dates, NumberField for figures, Select for a status or `options`); check and yes cells
 *             toggle with Space, Enter or a click. Enter commits and goes down, Tab right, Escape puts it back
 *   saving    `onCellCommit` returned a promise: the new value shows, dimmed, `aria-busy`, until it lands
 *   failed    it rejected: the old value comes back, the cell shakes once (refusal) and a red ring holds
 *             until it is edited again; said in the live region ("Couldn’t save Price for Lisbon.")
 *   refused   a cell that can't be edited, or text that means nothing for its kind, shakes once
 *   clipboard ⌘C copies the range as tab-separated text (what the cells show); ⌘V pastes from the active
 *             cell (one value fills the whole range); ⌘X copies and clears; Delete clears
 *   columns   `reorderable`: a grip at each header's start (Sortable's knurl, shown on hover and focus)
 *             lifts the column; the headers glide (the rows' motion), the body follows at once
 * Reduce Motion: no shake, Sortable's own.
 * A place: the person's rows live in it and you work inside it; it hosts Sortable (an instrument) for the columns.
 * ───────────────────────────────────────────────────────── */

export interface DataGridColumn<Row> extends TableColumn<Row> {
  /** Edited in place: Enter, F2, a double-click or typing over it. */
  editable?: boolean | ((row: Row) => boolean);
  /** Choices, for a cell edited with a Select (an owner, a plan); a status column takes its words by default. */
  options?: SelectOption[];
  /** Typed or pasted text (or a chosen option's value) to the cell's value; undefined refuses it. By kind otherwise. */
  parse?: (text: string, row: Row) => unknown;
  /** The cell's value as copied text. What the cell shows by default (figures bare, a status's word). */
  text?: (value: unknown, row: Row) => string;
}

export interface DataGridChange<Row> {
  row: Row;
  rowKey: string;
  column: string;
  value: unknown;
  previous: unknown;
}

export interface DataGridProps<Row> extends Omit<TableProps<Row>, 'columns' | 'grid' | 'onRowAction' | 'opened' | 'expandRow' | 'childRows' | 'hasChildRows' | 'loadChildRows' | 'expandedRows' | 'defaultExpandedRows' | 'onExpandedRowsChange' | 'virtual'> {
  columns: DataGridColumn<Row>[];
  /**
   * A cell changed (an edit, a toggle, each pasted or cleared cell). Put the value in `rows`; return a promise
   * to show it saving until it lands. A rejection (or a throw) puts the old value back and says so.
   */
  onCellCommit?: (change: DataGridChange<Row>) => void | Promise<unknown>;
  /** Columns move by a grip at each header's start; the order lands in `onColumnsChange` (`order`). */
  reorderable?: boolean;
}

interface Cell { row: string; col: string }
interface Range { anchor: Cell; rows: string[]; cols: string[] }
interface Editing extends Cell { typed: boolean }
type Move = 'up' | 'down' | 'left' | 'right' | null;

const REFUSE = Symbol('refuse');
const FRAME = 'mu-data-grid data-grid';
const EDITOR = 'mu-data-grid-editor data-grid-editor';
const GRIP = 'mu-sortable-grip sortable-grip mu-data-grid-grip data-grid-grip';
const NUMBERS = new Set(['number', 'currency', 'percent', 'delta', 'progress']);
const SHARES = new Set(['percent', 'progress']);
const TOGGLES = new Set(['check', 'yes']);
const STATUS_WORDS: Record<TableStatus, string> = { live: 'Live', waiting: 'Waiting', failed: 'Failed', off: 'Off' };

const same = (a: Cell | null, b: Cell | null) => !!a && !!b && a.row === b.row && a.col === b.col;
const valueOf = <Row,>(c: TableColumn<Row>, r: Row) => (c.value ? c.value(r) : (r as Record<string, unknown>)[c.key]);
const kindOf = (c: { kind?: TableColumn<unknown>['kind'] }) => c.kind ?? 'text';
/** A float shown in hundreds without the binary dust (0.62 × 100). */
const clean = (n: number) => +n.toPrecision(12);
const pad = (n: number) => String(n).padStart(2, '0');
const toDate = (v: unknown) => (v instanceof Date ? v : new Date(v as string | number));
function dateText(d: Date, withTime: boolean) {
  const day = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return withTime ? `${day}T${pad(d.getHours())}:${pad(d.getMinutes())}` : day;
}

function optionsOf<Row>(c: DataGridColumn<Row>): SelectOption[] | undefined {
  if (c.options) return c.options;
  if (c.kind !== 'status') return undefined;
  return (Object.keys(STATUS_WORDS) as TableStatus[]).map((s) => ({ value: s, label: c.words?.[s] ?? STATUS_WORDS[s] }));
}

/** A value as the text a person would copy: what the cell shows, figures bare. */
function textOf<Row>(c: DataGridColumn<Row>, v: unknown, row: Row): string {
  if (c.text) return c.text(v, row);
  if (v == null || v === '') return '';
  const kind = kindOf(c);
  if (NUMBERS.has(kind)) return (Number(v) * (SHARES.has(kind) ? 100 : 1)).toFixed(c.digits ?? (kind === 'currency' ? 2 : kind === 'delta' ? 1 : 0));
  if (TOGGLES.has(kind)) return v ? 'TRUE' : 'FALSE';
  if (kind === 'date') { const d = toDate(v); return Number.isNaN(d.getTime()) ? '' : dateText(d, c.format !== 'date').replace('T', ' '); }
  if (kind === 'person') return (Array.isArray(v) ? v : [v]).map((p: { name: string }) => p.name).join(', ');
  if (Array.isArray(v)) return v.join(kind === 'trend' ? ' ' : ', ');
  const key = typeof v === 'object' ? (v as { status?: string }).status ?? '' : String(v);
  const label = typeof v === 'object' ? (v as { label?: string }).label : undefined;
  return label ?? optionsOf(c)?.find((o) => o.value === key)?.label ?? key;
}

/** Text to a value the kind's way, or REFUSE when it means nothing for it. */
function parseOf<Row>(c: DataGridColumn<Row>, text: string, row: Row): unknown {
  if (c.parse) { const v = c.parse(text, row); return v === undefined ? REFUSE : v; }
  const t = text.trim();
  const kind = kindOf(c);
  const options = optionsOf(c);
  if (options) {
    if (t === '') return null;
    const o = options.find((x) => x.value === t || x.label.toLowerCase() === t.toLowerCase() || x.value.toLowerCase() === t.toLowerCase());
    return o ? o.value : REFUSE;
  }
  if (NUMBERS.has(kind)) {
    if (t === '') return null;
    // ponytail: commas read as thousands (en); a locale with a decimal comma needs the column's `parse`.
    const bare = t.replace(/[−–]/g, '-').replace(/[\s,%]/g, '').replace(/^([+-]?)[^\d.+-]{1,3}/, '$1'); // a sign, then a currency symbol
    const n = /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(bare) ? Number(bare) : NaN;
    return Number.isNaN(n) ? REFUSE : SHARES.has(kind) ? clean(n / 100) : n;
  }
  if (TOGGLES.has(kind)) return /^(true|yes|y|1|x|✓)$/i.test(t) ? true : /^(false|no|n|0|)$/i.test(t) ? false : REFUSE;
  if (kind === 'date') {
    if (t === '') return null;
    const d = new Date(/^\d{4}-\d\d-\d\d$/.test(t) ? `${t}T00:00` : t.replace(' ', 'T'));
    return Number.isNaN(d.getTime()) ? REFUSE : d;
  }
  if (kind === 'tags') return t ? t.split(/\s*,\s*/).filter(Boolean) : [];
  if (kind === 'person' || kind === 'trend' || kind === 'actions') return REFUSE;
  return text;
}

/** The cell's editor, standing in the cell: Field, NumberField or Select by kind. `read` hands back what it holds. */
function Editor<Row>({ column, row, value, label, typed, read, onPick, onCancel, onLeave }: {
  column: DataGridColumn<Row>; row: Row; value: unknown; label: string; typed: boolean;
  read: React.MutableRefObject<() => unknown>;
  onPick: (value: unknown) => void; onCancel: () => void; onLeave: () => void;
}) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const kind = kindOf(column);
  const options = optionsOf(column);
  const scale = SHARES.has(kind) ? 100 : 1;
  const [n, setN] = React.useState<number | null>(value == null || value === '' ? null : clean(Number(value) * scale));
  // NumberField commits its draft in the same Enter that ends the edit: read it from here, not the next render.
  const held = React.useRef(n);
  const withTime = column.format !== 'date';
  const [text, setText] = React.useState(() => (kind === 'date' && value != null && value !== '' ? dateText(toDate(value), withTime) : textOf(column, value, row)));
  read.current = options ? () => REFUSE : NUMBERS.has(kind) ? () => (held.current == null ? null : clean(held.current / scale)) : () => parseOf(column, text, row);

  // Focus lands inside at once (in the keydown that started it, so a typed key goes into the field); typing
  // replaces what was there, Enter and F2 leave the caret at the end.
  useIsoLayoutEffect(() => {
    const el = ref.current?.querySelector<HTMLElement>('input:not([type=hidden]), button');
    el?.focus();
    if (!(el instanceof HTMLInputElement)) return;
    try { if (typed) el.select(); else el.setSelectionRange(el.value.length, el.value.length); } catch { /* date inputs have no caret */ }
  }, []);

  const leave = (e: React.FocusEvent) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) onLeave(); };
  let node: React.ReactNode;
  if (options) {
    const current = value != null && typeof value === 'object' ? (value as { status?: string }).status ?? null : value == null ? null : String(value);
    node = (
      <Select size="compact" aria-label={label} options={options} value={current} defaultOpen className="w-full"
        onValueChange={(v) => onPick(column.parse ? column.parse(v, row) : v)} onOpenChange={(open) => { if (!open) onCancel(); }} />
    );
  } else if (NUMBERS.has(kind)) {
    node = <NumberField kind="inspector" size="compact" aria-label={label} value={n} onValueChange={(v) => { held.current = v; setN(v); }} className="w-full" />;
  } else {
    node = (
      <Field size="compact" className="w-full">
        <Field.Input aria-label={label} type={kind === 'date' ? (withTime ? 'datetime-local' : 'date') : 'text'} value={text} onChange={(e) => setText(e.target.value)} />
      </Field>
    );
  }
  return <span ref={ref} className={EDITOR} onBlur={options ? undefined : leave}>{node}</span>;
}

/** A table whose cells you walk, edit where they stand, and copy and paste as ranges. */
export function DataGrid<Row>({
  columns, rows, rowKey, rowLabel, onCellCommit, reorderable, columnsState, defaultColumnsState, onColumnsChange, className, ...table
}: DataGridProps<Row>) {
  const wrap = React.useRef<HTMLDivElement>(null);
  const [active, setActiveState] = React.useState<Cell | null>(null);
  const [range, setRangeState] = React.useState<Range | null>(null);
  const [editing, setEditingState] = React.useState<Editing | null>(null);
  const [saving, setSaving] = React.useState<ReadonlyMap<string, unknown>>(new Map());
  const [failed, setFailed] = React.useState<ReadonlySet<string>>(new Set());
  const [said, setSaid] = React.useState('');
  // Mirrors of the state for handlers that run before a render (a keydown that moves twice, a blur on unmount).
  const now = React.useRef({ active, range, editing });
  const setActive = (c: Cell | null) => { now.current.active = c; setActiveState(c); };
  const setRange = (r: Range | null) => { now.current.range = r; setRangeState(r); };
  const setEditing = (e: Editing | null) => { now.current.editing = e; setEditingState(e); };
  const read = React.useRef<() => unknown>(() => REFUSE);
  const saves = React.useRef(new Map<string, object>());
  const dragging = React.useRef(false);

  // Columns: the person's order and hidden ones (the host's or ours).
  const [ownLayout, setOwnLayout] = React.useState<TableColumnsState>(defaultColumnsState ?? {});
  const layout = columnsState ?? ownLayout;
  const setLayout = (next: TableColumnsState) => {
    if (columnsState === undefined) setOwnLayout(next);
    onColumnsChange?.(next);
  };
  const primary = columns.find((c) => c.primary) ?? columns[0];
  const byKey = new Map(columns.map((c) => [c.key, c]));
  const rank = (k: string) => { const i = layout.order?.indexOf(k) ?? -1; return i < 0 ? Infinity : i; };
  const visible = columns.filter((c) => c === primary || !layout.hidden?.includes(c.key)).map((c) => c.key).sort((a, b) => rank(a) - rank(b));
  const sortable = useSortable<HTMLTableRowElement>({
    value: visible,
    onValueChange: (next) => setLayout({ ...layout, order: [...next, ...columns.map((c) => c.key).filter((k) => !next.includes(k))] }),
    orientation: 'horizontal',
    handle: true,
    disabled: !reorderable,
  });

  const byRow = new Map(rows.map((r) => [rowKey(r), r]));
  const labelOf = (r: Row) => (rowLabel ? rowLabel(r) : String(valueOf(primary, r) ?? rowKey(r)));
  const cellId = (row: string, col: string) => `${row}\u001f${col}`;
  const canEdit = (c: DataGridColumn<Row>, r: Row) => !!onCellCommit && (typeof c.editable === 'function' ? c.editable(r) : !!c.editable);
  const say = (text: string) => setSaid((was) => (was === text ? `${text} ` : text));

  /* ── the grid as it shows: rows in their sorted order, columns in theirs (narrow widths hide some) ── */
  const layoutNow = () => {
    const t = wrap.current?.querySelector('table');
    const rowKeys = [...(t?.querySelectorAll<HTMLElement>('tbody tr[data-key]') ?? [])].map((tr) => tr.dataset.key!);
    const colKeys = [...(t?.querySelectorAll<HTMLElement>('thead th[data-col]') ?? [])]
      .filter((th) => th.offsetParent !== null && kindOf(byKey.get(th.dataset.col!) ?? primary) !== 'actions')
      .map((th) => th.dataset.col!);
    return { rowKeys, colKeys };
  };
  const cellEl = (c: Cell) => wrap.current?.querySelector<HTMLElement>(`tr[data-key="${CSS.escape(c.row)}"] > [data-col="${CSS.escape(c.col)}"]`) ?? null;
  const cellOf = (el: EventTarget | null): Cell | null => {
    const td = el instanceof Element ? el.closest<HTMLElement>('tbody tr[data-key] > [data-col]') : null;
    return td && wrap.current?.contains(td) ? { row: td.parentElement!.dataset.key!, col: td.dataset.col! } : null;
  };
  const rangeOf = (a: Cell, b: Cell): Range => {
    const { rowKeys, colKeys } = layoutNow();
    const span = (keys: string[], x: string, y: string) => { const i = keys.indexOf(x), j = keys.indexOf(y); return i < 0 || j < 0 ? [y] : keys.slice(Math.min(i, j), Math.max(i, j) + 1); };
    return { anchor: a, rows: span(rowKeys, a.row, b.row), cols: span(colKeys, a.col, b.col) };
  };
  const cellsOf = (r: Range | null, at: Cell | null) => (r ? r.rows.flatMap((row) => r.cols.map((col) => ({ row, col }))) : at ? [at] : []);

  /** Puts the cursor on a cell: one cell, or the range from the anchor when extending. */
  const goTo = (to: Cell, extend = false) => {
    const anchor = extend ? now.current.range?.anchor ?? now.current.active ?? to : to;
    setRange(rangeOf(anchor, to));
    setActive(to);
    cellEl(to)?.focus();
  };
  const step = (from: Cell, move: Move, edge = false, extend = false) => {
    if (!move) return;
    const { rowKeys, colKeys } = layoutNow();
    let ri = rowKeys.indexOf(from.row), ci = colKeys.indexOf(from.col);
    if (ri < 0 || ci < 0) return;
    if (move === 'up') ri = edge ? 0 : Math.max(0, ri - 1);
    if (move === 'down') ri = edge ? rowKeys.length - 1 : Math.min(rowKeys.length - 1, ri + 1);
    if (move === 'left') ci = edge ? 0 : Math.max(0, ci - 1);
    if (move === 'right') ci = edge ? colKeys.length - 1 : Math.min(colKeys.length - 1, ci + 1);
    goTo({ row: rowKeys[ri], col: colKeys[ci] }, extend);
  };

  /* ── commits: the new value shows while it saves; a rejection brings the old one back ── */
  const commit = (c: Cell, value: unknown) => {
    const row = byRow.get(c.row), column = byKey.get(c.col);
    if (!row || !column || !onCellCommit) return;
    const previous = valueOf(column, row);
    if (textOf(column, value, row) === textOf(column, previous, row) && (value == null) === (previous == null)) return;
    const id = cellId(c.row, c.col);
    const token = {};
    saves.current.set(id, token);
    setFailed((was) => { if (!was.has(id)) return was; const next = new Set(was); next.delete(id); return next; });
    const settle = (ok: boolean) => {
      if (saves.current.get(id) !== token) return;
      saves.current.delete(id);
      setSaving((was) => { const next = new Map(was); next.delete(id); return next; });
      if (ok) return;
      setFailed((was) => new Set(was).add(id));
      say(`Couldn’t save ${column.header} for ${labelOf(row)}.`);
      requestAnimationFrame(() => refuse(cellEl(c)));
    };
    let out: void | Promise<unknown>;
    try { out = onCellCommit({ row, rowKey: c.row, column: c.col, value, previous }); } catch { settle(false); return; }
    if (!out || typeof out.then !== 'function') { saves.current.delete(id); return; }
    setSaving((was) => new Map(was).set(id, value));
    out.then(() => settle(true), () => settle(false));
  };

  const startEdit = (c: Cell, typed: boolean) => {
    const row = byRow.get(c.row), column = byKey.get(c.col);
    if (!row || !column) return false;
    if (!canEdit(column, row)) { refuse(cellEl(c)); return false; }
    if (TOGGLES.has(kindOf(column))) { if (!typed) commit(c, !valueOf(column, row)); return false; }
    if (typed && optionsOf(column)) return false;
    flushSync(() => setEditing({ ...c, typed }));
    return true;
  };
  /** Ends an edit: commits what the editor holds (text that means nothing refuses and stays), then moves. */
  const finish = (keep: boolean, move: Move = null, refocus = true) => {
    const ed = now.current.editing;
    if (!ed) return;
    const value = keep ? read.current() : REFUSE;
    if (keep && value === REFUSE && !optionsOf(byKey.get(ed.col)!)) { refuse(cellEl(ed)?.querySelector('.mu-data-grid-editor') ?? null); return; }
    flushSync(() => setEditing(null));
    if (keep && value !== REFUSE) commit(ed, value);
    if (move) step(ed, move); else if (refocus) cellEl(ed)?.focus();
  };

  /* ── the clipboard: tab-separated text, what the cells show ── */
  const copy = (e: React.ClipboardEvent) => {
    if (now.current.editing || !cellOf(e.target)) return;
    const r = now.current.range, at = now.current.active;
    const rowsOut = r ? r.rows : at ? [at.row] : [];
    const colsOut = r ? r.cols : at ? [at.col] : [];
    const tsv = rowsOut.map((rk) => colsOut.map((ck) => {
      const row = byRow.get(rk), column = byKey.get(ck);
      return row && column ? textOf(column, saving.get(cellId(rk, ck)) ?? valueOf(column, row), row).replace(/[\t\n\r]+/g, ' ') : '';
    }).join('\t')).join('\n');
    e.clipboardData.setData('text/plain', tsv);
    e.preventDefault();
    const count = rowsOut.length * colsOut.length;
    say(count === 1 ? 'Copied.' : `Copied ${count} cells.`);
  };
  /** Writes text into cells from the range's top-left; one value fills the whole range. */
  const write = (grid: string[][], verb: string) => {
    const r = now.current.range, at = now.current.active;
    if (!at) return;
    const { rowKeys, colKeys } = layoutNow();
    const top = r ? r.rows[0] : at.row, left = r ? r.cols[0] : at.col;
    const fill = grid.length === 1 && grid[0].length === 1 && r && (r.rows.length > 1 || r.cols.length > 1);
    const ri = rowKeys.indexOf(top), ci = colKeys.indexOf(left);
    if (ri < 0 || ci < 0) return;
    const h = fill ? r!.rows.length : grid.length, w = fill ? r!.cols.length : Math.max(...grid.map((l) => l.length));
    let done = 0, refused = 0;
    for (let y = 0; y < h && ri + y < rowKeys.length; y++) {
      for (let x = 0; x < w && ci + x < colKeys.length; x++) {
        const text = fill ? grid[0][0] : grid[y][x];
        if (text === undefined) continue;
        const c = { row: rowKeys[ri + y], col: colKeys[ci + x] };
        const row = byRow.get(c.row)!, column = byKey.get(c.col)!;
        const value = canEdit(column, row) ? parseOf(column, text, row) : REFUSE;
        if (value === REFUSE) { refused++; refuse(cellEl(c)); continue; }
        commit(c, value);
        done++;
      }
    }
    const end = { row: rowKeys[Math.min(rowKeys.length - 1, ri + h - 1)], col: colKeys[Math.min(colKeys.length - 1, ci + w - 1)] };
    setRange(rangeOf({ row: top, col: left }, end));
    say(`${verb} ${done} ${done === 1 ? 'cell' : 'cells'}.${refused ? ` ${refused} can’t take it.` : ''}`);
  };
  const paste = (e: React.ClipboardEvent) => {
    if (now.current.editing || !cellOf(e.target)) return;
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain').replace(/\r?\n$/, '');
    // ponytail: no quoted cells (a value holding a tab or a line break pastes split); add a TSV quote reader if hosts need it.
    if (text) write(text.split(/\r?\n/).map((l) => l.split('\t')), 'Pasted');
  };
  const clear = () => {
    const r = now.current.range;
    write(r ? r.rows.map(() => r.cols.map(() => '')) : [['']], 'Cleared');
  };

  /* ── keys ── */
  const onKeyDownCapture = (e: React.KeyboardEvent) => {
    // Escape puts the value back at once (a field's own Escape would only drop its draft first).
    if (e.key !== 'Escape' || !now.current.editing) return;
    e.preventDefault();
    e.stopPropagation();
    finish(false);
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    const ed = now.current.editing;
    if (ed) {
      if (!cellEl(ed)?.contains(e.target as Node)) return; // keys in a Select's list (a portal) are its own
      if (e.key === 'Enter' && !e.altKey) { e.preventDefault(); finish(true, e.shiftKey ? 'up' : 'down'); }
      else if (e.key === 'Tab') { e.preventDefault(); finish(true, e.shiftKey ? 'left' : 'right'); }
      return;
    }
    const at = cellOf(e.target);
    if (!at) return;
    const mod = e.metaKey || e.ctrlKey;
    const arrows: Record<string, Move> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
    if (arrows[e.key]) { e.preventDefault(); step(at, arrows[e.key], mod, e.shiftKey); return; }
    if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      if (mod) step(at, e.key === 'Home' ? 'up' : 'down', true, e.shiftKey);
      step(now.current.active ?? at, e.key === 'Home' ? 'left' : 'right', true, e.shiftKey);
      return;
    }
    if (mod && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      const { rowKeys, colKeys } = layoutNow();
      setRange({ anchor: { row: rowKeys[0], col: colKeys[0] }, rows: rowKeys, cols: colKeys });
      return;
    }
    if (e.key === 'Escape' && now.current.range && cellsOf(now.current.range, at).length > 1) { setRange(rangeOf(at, at)); return; }
    if (e.key === 'Enter' || e.key === 'F2' || (e.key === ' ' && TOGGLES.has(kindOf(byKey.get(at.col)!)))) { e.preventDefault(); startEdit(at, false); return; }
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); clear(); return; }
    // Typing over a cell starts its edit; the key itself lands in the field that just took focus.
    if (e.key.length === 1 && !mod && !e.altKey && e.key !== ' ') startEdit(at, true);
  };

  /* ── the pointer: press a cell, Shift-press to extend, drag over cells for a range ── */
  const onPointerDown = (e: React.PointerEvent) => {
    const at = cellOf(e.target);
    if (!at || e.button !== 0 || same(at, now.current.editing)) return;
    if (now.current.editing) finish(true);
    goTo(at, e.shiftKey);
    dragging.current = true;
    const up = () => { dragging.current = false; window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); };
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };
  const onPointerOver = (e: React.PointerEvent) => {
    const at = cellOf(e.target);
    if (dragging.current && at && !same(at, now.current.active)) goTo(at, true);
  };
  const onFocus = (e: React.FocusEvent) => {
    const at = cellOf(e.target);
    if (!at || e.target !== cellEl(at) || same(at, now.current.active)) return;
    setActive(at);
    setRange(rangeOf(at, at));
  };

  /* ── what Table draws: each cell's state, and its content (or its editor) ── */
  const firstCol = visible.find((k) => kindOf(byKey.get(k)!) !== 'actions');
  const live = active && byRow.has(active.row) && byKey.has(active.col) ? active : null;
  const tabStop: Cell | null = live ?? (rows.length && firstCol ? { row: rowKey(rows[0]), col: firstCol } : null);
  const inRange = (row: string, col: string) => !!range && range.rows.length * range.cols.length > 1 && range.rows.includes(row) && range.cols.includes(col);

  const gridColumns: TableColumn<Row>[] = columns.map((c) => ({
    ...c,
    cell: (r: Row) => {
      const k = rowKey(r);
      const id = cellId(k, c.key);
      const value = saving.has(id) ? saving.get(id) : valueOf(c, r);
      const label = `${c.header}, ${labelOf(r)}`;
      if (editing && editing.row === k && editing.col === c.key) {
        return (
          <Editor column={c} row={r} value={value} label={label} typed={editing.typed} read={read}
            onPick={(v) => { if (now.current.editing) { flushSync(() => setEditing(null)); commit(editing, v); cellEl(editing)?.focus(); } }}
            onCancel={() => setTimeout(() => { if (same(now.current.editing, editing)) finish(false); })}
            onLeave={() => finish(true, null, false)} />
        );
      }
      if (c.cell) return c.cell(r);
      if (kindOf(c) === 'check' && value != null) {
        return <Checkbox size="row" tabIndex={-1} className="relative z-1 align-middle" aria-label={label} checked={!!value} disabled={!canEdit(c, r)}
          onMouseDown={(e) => e.preventDefault()} onCheckedChange={(on) => commit({ row: k, col: c.key }, !!on)} />;
      }
      return <TableCell kind={c.kind} value={value} label={c.header} now={table.now} actions={c.actions?.(r)} inline={c.kind === 'code'}
        unit={c.unit} currency={c.currency} digits={c.digits} format={c.format} better={c.better} words={c.words} warn={c.warn} danger={c.danger} />;
    },
  }));

  const grid: TableGrid<Row> = {
    table: { role: 'grid', 'aria-multiselectable': true },
    cell: (r, c) => {
      const k = rowKey(r);
      const id = cellId(k, c.key);
      const editable = canEdit(c as DataGridColumn<Row>, r);
      return {
        tabIndex: tabStop && tabStop.row === k && tabStop.col === c.key ? 0 : -1,
        'data-col': c.key,
        'aria-selected': inRange(k, c.key),
        'aria-readonly': editable ? undefined : true,
        'aria-busy': saving.has(id) || undefined,
        'data-in-range': inRange(k, c.key) ? '' : undefined,
        'data-editing': editing && editing.row === k && editing.col === c.key ? '' : undefined,
        'data-saving': saving.has(id) ? '' : undefined,
        'data-failed': failed.has(id) ? '' : undefined,
        'data-editable': editable ? '' : undefined,
      };
    },
    ...(reorderable && {
      headRow: { ref: sortable.listRef, ...sortable.listProps },
      headCell: (c) => sortable.itemProps(c.key, { label: c.header, disabled: c.pin === 'start' }),
      headGrip: (c) => <button {...sortable.handleProps(c.header, { disabled: c.pin === 'start' })} className={GRIP} />,
    }),
  };

  return (
    <div
      ref={wrap}
      className={className ? `${FRAME} ${className}` : FRAME}
      data-dragging={sortable.dragging ? '' : undefined}
      onKeyDownCapture={onKeyDownCapture}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerOver={onPointerOver}
      onDoubleClick={(e) => { const at = cellOf(e.target); if (at && !now.current.editing) startEdit(at, false); }}
      onFocus={onFocus}
      onCopy={copy}
      onCut={(e) => { copy(e); if (e.defaultPrevented) clear(); }}
      onPaste={paste}
    >
      <Table {...table} columns={gridColumns} rows={rows} rowKey={rowKey} rowLabel={rowLabel} grid={grid} columnsState={layout} onColumnsChange={setLayout} />
      <div className="sr-only" aria-live="polite">{said}</div>
      {reorderable && (
        <>
          <div ref={sortable.announcerRef} className="sr-only" aria-live="assertive" />
          <span id={sortable.instructionsId} hidden>{sortable.instructions}</span>
        </>
      )}
    </div>
  );
}
