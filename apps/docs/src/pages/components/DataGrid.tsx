import * as React from 'react';
import { useDialKit } from 'dialkit';
import { DataGrid, type DataGridChange, type DataGridColumn, type TableColumnsState, type TableDensity, type TableStatus } from '@unlocalhosted/metalui';
import reactSource from '../../../../../packages/metalui/src/components/data-grid/data-grid.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import swiftSource from '../../../../../swift/Sources/MetalUI/Components/MetalDataGrid.swift?raw';
import agentSource from '../../../../../packages/metalui/src/components/data-grid/data-grid.agent.md?raw';
import { ComponentPage } from '../../ui/ComponentPage';

/* ─────────────────────────────────────────────────────────
 * DATA GRID PAGE · a price list a person keeps
 *
 *   price list  walk the cells, edit them (text, figures, a status, a box), saves that land after a
 *               beat; the margin is computed (read-only, it shakes); totals turn as prices change
 *   clipboard   copy a range out, paste a column of prices in from a spreadsheet
 *   failed      every save fails: the old value comes back, the cell shakes and says so
 *   columns     reorder by the grips; the order is kept by the page
 *   tune        DialKit: how long a save takes, whether saves fail, the density
 * ───────────────────────────────────────────────────────── */

interface Product { id: string; name: string; sku: string; price: number; cost: number; stock: number; discount: number; status: TableStatus; taxed: boolean; updated: Date }

const NOW = new Date(2026, 9, 6, 12, 0);
const PRODUCTS: Product[] = [
  ['Linen notebook, A5', 'NB-A5-LIN', 18, 6.4, 240, 0, 'live', true, 3],
  ['Linen notebook, A4', 'NB-A4-LIN', 24, 8.9, 112, 0.1, 'live', true, 30],
  ['Brass pencil', 'PC-BRS-01', 32, 11.2, 0, 0, 'off', true, 300],
  ['Graphite refills (10)', 'PC-REF-10', 6.5, 1.1, 1840, 0, 'live', true, 1400],
  ['Desk pad, felt', 'DP-FLT-XL', 45, 17.8, 36, 0.15, 'waiting', true, 60],
  ['Gift card', 'GC-050', 50, 50, 999, 0, 'live', false, 5000],
  ['Wax seal kit', 'WX-KIT-02', 28, 9.6, 14, 0.05, 'waiting', true, 2],
  ['Postcards (set of 12)', 'PS-SET-12', 12, 3.2, 410, 0, 'failed', true, 9000],
].map(([name, sku, price, cost, stock, discount, status, taxed, minutes], i) => ({
  id: `p${i + 1}`, name: name as string, sku: sku as string, price: price as number, cost: cost as number, stock: stock as number,
  discount: discount as number, status: status as TableStatus, taxed: taxed as boolean, updated: new Date(NOW.getTime() - (minutes as number) * 60_000),
}));

const COLUMNS: DataGridColumn<Product>[] = [
  { key: 'name', header: 'Product', editable: true, sortable: true },
  { key: 'sku', header: 'SKU', kind: 'code', editable: true, priority: 3 },
  { key: 'price', header: 'Price', kind: 'currency', currency: 'EUR', editable: true, sortable: true, total: 'mean' },
  { key: 'margin', header: 'Margin', kind: 'percent', value: (p) => (p.price ? (p.price * (1 - p.discount) - p.cost) / p.price : null), priority: 2 },
  { key: 'stock', header: 'Stock', kind: 'number', editable: true, sortable: true, total: 'sum' },
  { key: 'discount', header: 'Discount', kind: 'percent', editable: true, priority: 2 },
  { key: 'status', header: 'Status', kind: 'status', words: { live: 'On sale', waiting: 'Low', failed: 'Recalled', off: 'Paused' }, editable: true },
  { key: 'taxed', header: 'VAT', kind: 'check', editable: (p) => p.id !== 'p6' },
  { key: 'updated', header: 'Updated', kind: 'date', priority: 3 },
];

/** The page's store: an edit lands in the rows at once, then "saves" after `delay`; a failed save puts the
 * old value back in the rows and rejects, so the grid shakes the cell and says so. */
function usePriceList(delay: number, fails: boolean) {
  const [rows, setRows] = React.useState(PRODUCTS);
  const put = (id: string, key: string, value: unknown) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, [key]: value, updated: NOW } : r)));
  const onCellCommit = ({ rowKey, column, value, previous }: DataGridChange<Product>) => {
    put(rowKey, column, value);
    if (!delay && !fails) return;
    return new Promise<void>((resolve, reject) => setTimeout(() => {
      if (fails) { put(rowKey, column, previous); reject(new Error('offline')); } else resolve();
    }, delay));
  };
  return { rows, onCellCommit };
}

function PriceList({ caption = 'Price list', delay = 600, fails = false, density, reorderable, testId }: { caption?: string; delay?: number; fails?: boolean; density?: TableDensity; reorderable?: boolean; testId?: string }) {
  const { rows, onCellCommit } = usePriceList(delay, fails);
  const [columns, setColumns] = React.useState<TableColumnsState>({});
  return (
    <div data-testid={testId} className="w-full max-w-[960px]">
      <DataGrid caption={caption} columns={COLUMNS} rows={rows} rowKey={(p) => p.id} now={NOW} density={density} footer="Mean · sum"
        onCellCommit={onCellCommit} reorderable={reorderable} columnsState={columns} onColumnsChange={setColumns} />
    </div>
  );
}

/* CLIPBOARD: a plain textarea beside the grid, to paste into and copy from (the clipboard round trip,
 * without leaving the page). */
function Clipboard() {
  return (
    <div className="grid w-full max-w-[960px] gap-12">
      <PriceList caption="Paste prices here" delay={0} testId="data-grid-clipboard" />
      <label className="grid gap-6 type-meta text-ink2">
        A scratch pad: copy cells into it, or copy these lines and paste them on a Price cell.
        <textarea className="min-h-[96px] rounded-row p-8 type-label-cell recipe-well-field text-ink" defaultValue={'21\n26.5\n30'} />
      </label>
    </div>
  );
}

/* GRID TUNER: the page's DialKit panel. delay is how long each save takes (0 lands at once), fails makes
 * every save fail, density sets the rows' height. */
function GridTuner() {
  const d = useDialKit('Data grid', {
    delay: [600, 0, 3000],
    fails: false,
    density: { type: 'select', options: ['roomy', 'regular', 'compact'], default: 'regular' },
  });
  return (
    <div data-testid="data-grid-tuner" className="flex w-full justify-center">
      <PriceList key={String(d.fails)} caption="Price list, tuned" delay={d.delay} fails={d.fails} density={d.density as TableDensity} />
    </div>
  );
}

export default function DataGridPage() {
  return (
    <ComponentPage
      capture="data-grid"
      title="Data grid"
      lede="A table whose cells are targets: walk them with the arrow keys, edit them where they stand, select a range and copy or paste it, and put the columns in your own order. It is Table in grid mode, so every kind, sort and total works the same."
      play={{ lede: 'Click a price and type a new one, then Enter. Shift with the arrows selects a range; ⌘C copies it. The margin is computed, so it won’t take an edit.', caption: 'a price list · saves land after a beat', wide: true, node: <PriceList testId="data-grid-play" /> }}
      more={[
        { id: 'clipboard', title: 'Copy and paste ranges', lede: 'What you copy is what the cells show, figures bare and a status in its word, as tab-separated lines, so it lands in a spreadsheet’s cells. Paste from the active cell rightwards and down; one value fills a whole range. Cells that can’t take a value shake and are counted.', node: <Clipboard /> },
        { id: 'failed', title: 'A save that fails', lede: 'Every save here fails. The new value shows, dimmed, while it is out; when it fails the old value comes back, the cell shakes once and keeps a red ring until you edit it again, and the grid says which cell.', node: <PriceList caption="Offline price list" fails delay={900} testId="data-grid-failed" /> },
        { id: 'columns', title: 'Columns in your order', lede: 'Each header has a grip at its start (hover or focus it). Drag it, or focus it and press Space, ← →, Space: the headers glide to make room and the order lands in onColumnsChange for the page to keep.', node: <PriceList caption="Reorder the columns" reorderable delay={0} testId="data-grid-columns" /> },
        { id: 'tune', title: 'Tune the saves', lede: 'The Data grid panel sets how long a save takes, makes every save fail, and sets the density.', node: <GridTuner /> },
      ]}
      usage={`<DataGrid
  caption="Price list"
  columns={[
    { key: 'name', header: 'Product', editable: true },
    { key: 'price', header: 'Price', kind: 'currency', currency: 'EUR', editable: true },
    { key: 'status', header: 'Status', kind: 'status', editable: true },
  ]}
  rows={products}
  rowKey={(p) => p.id}
  onCellCommit={async ({ rowKey, column, value }) => {
    setProducts((ps) => ps.map((p) => (p.id === rowKey ? { ...p, [column]: value } : p)));
    await save(rowKey, column, value); // reject to put the old value back
  }}
  reorderable
/>`}
      sources={[
        { id: 'react', label: 'React', code: reactSource },
        { id: 'css', label: 'CSS', code: cssSource },
        { id: 'swift', label: 'SwiftUI', code: swiftSource },
        { id: 'agent', label: 'Agent guide', code: agentSource },
      ]}
      rules={[
        { id: 'DG1', title: 'One cell holds focus', body: 'The grid is one tab stop; the arrows walk its cells and Tab leaves it. The ring sits inside the cell so neighbours never cover it.', origin: 'WAI-ARIA APG' },
        { id: 'DG2', title: 'Typing replaces, Enter keeps', body: 'Type over a cell and your key replaces the value; Enter or F2 edits with the caret at the end. Enter commits and goes down, Tab goes right, Escape puts it back.', origin: 'Spreadsheets' },
        { id: 'DG3', title: 'A failed save goes back', body: 'The new value shows, dimmed, while it saves; a rejection puts the old one back, shakes the cell and says which.', origin: 'Ours' },
        { id: 'DG4', title: 'Copy what you see', body: 'Figures bare, a status in its word, dates as year-month-day: tab-separated, so a spreadsheet takes it and gives it back.', origin: 'Ours' },
        { id: 'DG5', title: 'Read-only says no', body: 'A computed cell (a margin) is not editable; trying shakes it once, and it is aria-readonly.', origin: 'Ours' },
      ]}
    />
  );
}
