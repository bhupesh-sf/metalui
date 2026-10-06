import * as React from 'react';
import { useDialKit } from 'dialkit';
import {
  Button, Field, Pagination, Properties, Segmented, SwapText, Table, TableCell, ToolStrip,
  type SortState, type TableColumn, type TableDensity, type TableKind, type TablePerson, type TableStatus,
} from '@unlocalhosted/metalui';
import { Icon } from '@unlocalhosted/metalui/icons';
import { type SpringName } from '../../../../../packages/metalui/src/motion/springs.generated';
import { SPRING_NAMES, springVars } from '../../ui/springTuning';
import reactSource from '../../../../../packages/metalui/src/components/table/table.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import swiftSource from '../../../../../swift/Sources/MetalUI/Components/MetalTable.swift?raw';
import agentSource from '../../../../../packages/metalui/src/components/table/table.agent.md?raw';
import { ComponentPage } from '../../ui/ComponentPage';

/* ─────────────────────────────────────────────────────────
 * TABLE PAGE · each kind of table the Must tier covers, as real data
 *
 *   records    invoices: find, sort, choose several (the tool strip and its drum count), open one
 *              (the rail, and its details as Properties), act on one (the more key), pages
 *   numbers    services to compare: units in the headers, deltas, a trend, a budget meter
 *   cells      the vocabulary: every kind, its look, its alignment and its empty
 *   density    roomy 48 · regular 40 · compact 32
 *   waiting    loading, refreshing, empty, nothing matches, failed
 *   narrow     drag the frame's corner: low-priority columns move under the name
 *   many rows  a scrolling table with its head held on frost
 *   tune       DialKit: the spring the guide and the rows ride, slowed; the density
 * ───────────────────────────────────────────────────────── */

const NOW = new Date(2026, 9, 6, 12, 0);
const ago = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000);

const PEOPLE: TablePerson[] = [{ name: 'Ana Duarte' }, { name: 'Kenji Mori' }, { name: 'Lea Brandt' }, { name: 'Omar Haddad' }];
const CUSTOMERS = ['Northwind Studio', 'Atelier Sol', 'Harbour & Co', 'Kite Labs', 'Pine Supply', 'Oslo Print', 'Tram 28 Café', 'Azul Ceramics', 'Field Notes', 'Lumen Works', 'Mesa Bikes', 'Quiet Type'];
const STATES: TableStatus[] = ['live', 'waiting', 'failed', 'off'];

interface Invoice { id: string; customer: string; email: string; status: TableStatus; owner: TablePerson; due: Date; amount: number; items: number }
const INVOICES: Invoice[] = Array.from({ length: 36 }, (_, i) => {
  const customer = CUSTOMERS[i % CUSTOMERS.length];
  return {
    id: `INV-${2040 + i}`,
    customer: i >= CUSTOMERS.length ? `${customer} ${['East', 'West'][i % 2]}` : customer,
    email: `billing@${customer.toLowerCase().replace(/[^a-z]+/g, '')}.com`,
    status: STATES[(i * 7) % 11 % 4],
    owner: PEOPLE[(i * 3) % PEOPLE.length],
    due: ago((((i * 37) % 41) - 20) * 60 * 8 + ((i * 13) % 24) * 7),
    amount: Math.round((((i * 7919) % 4800) + 120) * 100) / 100,
    items: (i % 5) + 1,
  };
});
const INVOICE_WORDS = { live: 'Paid', waiting: 'Due', failed: 'Overdue', off: 'Draft' } as const;

function invoiceColumns(actions?: (i: Invoice) => void): TableColumn<Invoice>[] {
  return [
    { key: 'customer', header: 'Customer', sortable: true, detail: (i) => `${i.id} · ${i.items} ${i.items === 1 ? 'item' : 'items'}` },
    { key: 'status', header: 'Status', kind: 'status', words: INVOICE_WORDS, sortable: true },
    { key: 'owner', header: 'Owner', kind: 'person', priority: 2 },
    { key: 'due', header: 'Due', kind: 'date', sortable: true, priority: 2 },
    { key: 'amount', header: 'Amount', kind: 'currency', currency: 'EUR', sortable: true },
    {
      key: 'actions', header: 'Actions', kind: 'actions', actions: (i) => [
        { label: 'Send reminder', icon: 'send', primary: true, onSelect: () => actions?.(i) },
        { label: 'Download PDF', icon: 'download', onSelect: () => actions?.(i) },
        { label: 'Duplicate', icon: 'duplicate', onSelect: () => actions?.(i) },
        { label: 'Delete', icon: 'trash', danger: true, onSelect: () => actions?.(i) },
      ],
    },
  ];
}

const PAGE = 8;

function Invoices({ density = 'regular' }: { density?: TableDensity }) {
  const [query, setQuery] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [sort, setSort] = React.useState<SortState>({ key: 'due', direction: 'ascending' });
  const [selected, setSelected] = React.useState(new Set<string>());
  const [opened, setOpened] = React.useState<string | null>(null);
  const [said, setSaid] = React.useState('');
  const columns = React.useMemo(() => invoiceColumns((i) => setSaid(`Acted on ${i.id}`)), []);
  const q = query.trim().toLowerCase();
  const matched = q ? INVOICES.filter((i) => i.customer.toLowerCase().includes(q) || i.id.toLowerCase().includes(q)) : INVOICES;
  // The host sorts across pages, then shows one page; the table sorts the page it's given the same way.
  const col = columns.find((c) => c.key === sort?.key);
  const ordered = sort && col ? [...matched].sort((a, b) => {
    const x = a[sort.key as keyof Invoice], y = b[sort.key as keyof Invoice];
    const n = x instanceof Date && y instanceof Date ? x.getTime() - y.getTime() : typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
    return sort.direction === 'ascending' ? n : -n;
  }) : matched;
  const pages = Math.max(1, Math.ceil(ordered.length / PAGE));
  const shown = ordered.slice((Math.min(page, pages) - 1) * PAGE, Math.min(page, pages) * PAGE);
  const open = INVOICES.find((i) => i.id === opened);
  const clear = () => { setQuery(''); setPage(1); };
  return (
    <div className="grid w-full max-w-[760px] gap-16">
      <Field size="regular" className="max-w-[320px]">
        <Field.Icon><Icon name="search" /></Field.Icon>
        <Field.Input placeholder="Find a customer or invoice" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} aria-label="Find invoices" />
      </Field>
      <Table
        caption="Invoices"
        columns={columns}
        rows={shown}
        rowKey={(i) => i.id}
        rowLabel={(i) => `${i.customer} ${i.id}`}
        density={density}
        sort={sort}
        onSortChange={(s) => { setSort(s); setPage(1); }}
        selected={selected}
        onSelectedChange={setSelected}
        onRowAction={(i) => setOpened((o) => (o === i.id ? null : i.id))}
        opened={opened}
        filter={{ total: INVOICES.length, matched: matched.length, onClear: clear }}
        empty="No invoices yet. Send the first one from a project."
        now={NOW}
      />
      <div className="relative grid min-h-[44px] items-center justify-items-center">
        {selected.size > 0 ? (
          <ToolStrip
            label={`${selected.size} selected invoices`}
            count={<span className="type-ui tabular-nums text-toolstrip-ink-hover"><SwapText value={`${selected.size} selected`} /></span>}
            items={[
              { label: 'Send reminders', icon: <Icon name="send" />, onSelect: () => setSaid(`Reminded ${selected.size}`) },
              { label: 'Export', icon: <Icon name="download" />, onSelect: () => setSaid(`Exported ${selected.size}`) },
              { label: 'Delete', icon: <Icon name="trash" />, destructive: true, onSelect: () => { setSelected(new Set()); setSaid('Deleted (not really)'); } },
              { label: 'Clear selection', icon: <Icon name="close" />, iconOnly: true, onSelect: () => setSelected(new Set()) },
            ]}
          />
        ) : (
          <Pagination page={Math.min(page, pages)} count={pages} onPageChange={setPage} aria-label="Invoice pages" />
        )}
      </div>
      <p className="m-0 min-h-[16px] type-meta text-ink3" aria-live="polite">{said}</p>
      {open && (
        <section aria-label={`Invoice ${open.id}`} className="grid gap-8 max-w-[420px]">
          <h3 className="m-0 type-title text-ink">{open.customer}</h3>
          <Properties>
            <Properties.Item label="Invoice"><TableCell kind="code" value={open.id} /></Properties.Item>
            <Properties.Item label="Status"><TableCell kind="status" value={open.status} words={INVOICE_WORDS} /></Properties.Item>
            <Properties.Item label="Owner"><TableCell kind="person" value={open.owner} /></Properties.Item>
            <Properties.Item label="Due"><TableCell kind="date" value={open.due} format="datetime" now={NOW} /></Properties.Item>
            <Properties.Item label="Amount (€)"><TableCell kind="currency" value={open.amount} currency="EUR" /></Properties.Item>
            <Properties.Item label="Billing">{open.email}</Properties.Item>
          </Properties>
        </section>
      )}
    </div>
  );
}

interface Service { id: string; name: string; region: string; requests: number; p95: number; errors: number | null; cost: number; change: number; trend: number[]; budget: number }
const SERVICES: Service[] = [
  { id: 'api', name: 'API gateway', region: 'eu-west', requests: 412.6, p95: 84, errors: 0.0012, cost: 1840.5, change: -6.2, trend: [12, 14, 13, 15, 17, 16, 18, 19, 18, 17, 16, 15, 15, 14], budget: 0.62 },
  { id: 'search', name: 'Search', region: 'eu-west', requests: 188.1, p95: 212, errors: 0.0041, cost: 2310, change: 18.4, trend: [8, 9, 9, 11, 12, 14, 15, 17, 18, 20, 21, 22, 24, 25], budget: 0.94 },
  { id: 'media', name: 'Media resize', region: 'us-east', requests: 96.4, p95: 640, errors: 0.021, cost: 980.75, change: 2.1, trend: [9, 9, 10, 9, 10, 10, 9, 10, 11, 10, 10, 11, 10, 10], budget: 0.48 },
  { id: 'mail', name: 'Mail', region: 'eu-central', requests: 22.9, p95: 1120, errors: 0, cost: 140.2, change: 0, trend: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3], budget: 0.18 },
  { id: 'sync', name: 'Sync', region: 'us-east', requests: 640.3, p95: 46, errors: 0.0006, cost: 3120.9, change: -12.8, trend: [30, 29, 28, 28, 26, 25, 25, 24, 23, 22, 22, 21, 21, 20], budget: 0.81 },
  { id: 'billing', name: 'Billing', region: 'eu-west', requests: 5.2, p95: 300, errors: null, cost: 0, change: 0.4, trend: [], budget: 0.05 },
];
const SERVICE_COLUMNS: TableColumn<Service>[] = [
  { key: 'name', header: 'Service', sortable: true, detail: (s) => s.region },
  { key: 'requests', header: 'Requests', kind: 'number', unit: 'k/day', digits: 1, sortable: true },
  { key: 'p95', header: 'p95', kind: 'number', unit: 'ms', sortable: true, priority: 3 },
  { key: 'errors', header: 'Errors', kind: 'percent', digits: 2, sortable: true, priority: 3 },
  { key: 'cost', header: 'Cost', kind: 'currency', currency: 'EUR', sortable: true },
  { key: 'change', header: 'Change', kind: 'delta', unit: '%', better: 'down', sortable: true },
  { key: 'trend', header: 'Trend', kind: 'trend', priority: 2 },
  { key: 'budget', header: 'Budget', kind: 'progress', warn: 0.75, danger: 0.9, sortable: true, priority: 2 },
];

function Services({ density = 'compact', caption = 'Services this month' }: { density?: TableDensity; caption?: string }) {
  return (
    <div className="w-full max-w-[860px]">
      <Table caption={caption} columns={SERVICE_COLUMNS} rows={SERVICES} rowKey={(s) => s.id} density={density} defaultSort={{ key: 'cost', direction: 'descending' }} />
    </div>
  );
}

interface Kind { kind: TableKind; value: unknown; look: string; extra?: Partial<TableColumn<Kind>> }
const KINDS: Kind[] = [
  { kind: 'text', value: 'Studio rent, October, shared with the print room', look: 'Truncates; the whole in a tooltip; an optional second line in ink2.' },
  { kind: 'number', value: 1204.5, look: 'Tabular, end-aligned, the unit in the header.', extra: { digits: 1 } },
  { kind: 'currency', value: -86.4, look: 'Two places, a real minus; the symbol in the header.', extra: { currency: 'EUR' } },
  { kind: 'percent', value: 0.425, look: 'A share, shown in hundreds; % in the header.', extra: { digits: 1 } },
  { kind: 'delta', value: -3.2, look: 'The sign and an arrow; green or red only on top of the sign.' },
  { kind: 'date', value: ago(190), look: 'Relative, with the exact time in a tooltip; or a short date.' },
  { kind: 'status', value: 'waiting', look: 'An LED and its word: live, waiting, failed, off.' },
  { kind: 'person', value: [PEOPLE[0], PEOPLE[1], PEOPLE[2], PEOPLE[3], { name: 'Sam Reyes' }], look: 'Avatar and name; several overlap with +N.' },
  { kind: 'tags', value: ['print', 'studio', 'q4', 'shared'], look: 'Up to two chips, then +N.' },
  { kind: 'progress', value: 0.64, look: 'A slim meter sized to the row; its share is said, not printed.' },
  { kind: 'trend', value: [4, 6, 5, 8, 7, 9, 11, 10], look: 'A mini sparkline; its last point marked.' },
  { kind: 'yes', value: true, look: 'A check for yes; nothing for no, never a red cross.' },
  { kind: 'code', value: 'a41f9c2', look: 'Monospaced; a copy key on hover and focus.' },
  { kind: 'actions', value: null, look: 'A more key at the row’s end, on hover and focus.' },
];
const KIND_COLUMNS: TableColumn<Kind>[] = [
  { key: 'kind', header: 'Kind', kind: 'code', cell: (k) => <span className="type-label-cell text-ink">{k.kind}</span> },
  {
    key: 'value', header: 'Looks like', cell: (k) => (
      <span className="inline-block max-w-[220px] align-middle">
        <TableCell kind={k.kind} value={k.value} label="Sample" now={NOW} {...k.extra} actions={k.kind === 'actions' ? [{ label: 'Rename', icon: 'text', onSelect: () => {} }, { label: 'Delete', icon: 'trash', danger: true, onSelect: () => {} }] : undefined} />
      </span>
    ),
  },
  { key: 'look', header: 'Look', priority: 2 },
  { key: 'empty', header: 'Empty', cell: (k) => (k.kind === 'actions' ? <span className="type-meta text-ink3">nothing</span> : <TableCell kind={k.kind} value={null} />), priority: 3 },
];

function People({ density }: { density: TableDensity }) {
  const rows = PEOPLE.map((p, i) => ({ id: p.name, person: p, role: ['Owner', 'Editor', 'Editor', 'Viewer'][i], seen: ago([3, 50, 1440, 9000][i]), here: (['live', 'waiting', 'off', 'off'] as TableStatus[])[i] }));
  return (
    <Table
      caption={`Members, ${density}`}
      density={density}
      columns={[
        { key: 'person', header: 'Name', kind: 'person' },
        { key: 'role', header: 'Role' },
        { key: 'here', header: 'Here', kind: 'status', words: { live: 'Online', waiting: 'Away', off: 'Offline' } },
        { key: 'seen', header: 'Seen', kind: 'date' },
      ]}
      rows={rows}
      rowKey={(r) => r.id}
      rowLabel={(r) => r.person.name}
      now={NOW}
    />
  );
}

function Densities() {
  const [density, setDensity] = React.useState<TableDensity>('roomy');
  return (
    <div className="grid w-full max-w-[560px] gap-16 justify-items-start">
      <Segmented aria-label="Density" value={density} onValueChange={setDensity} options={[{ value: 'roomy', label: 'Roomy 48' }, { value: 'regular', label: 'Regular 40' }, { value: 'compact', label: 'Compact 32' }]} />
      <div className="w-full"><People density={density} /></div>
    </div>
  );
}

type Waiting = 'rows' | 'loading' | 'refreshing' | 'empty' | 'nothing' | 'failed';
function States() {
  const [state, setState] = React.useState<Waiting>('loading');
  const columns = React.useMemo(() => invoiceColumns(), []);
  const rows = state === 'rows' || state === 'refreshing' ? INVOICES.slice(0, 4) : [];
  return (
    <div className="grid w-full max-w-[760px] gap-16 justify-items-start">
      <Segmented aria-label="State" value={state} onValueChange={setState} options={[
        { value: 'rows', label: 'Rows' }, { value: 'loading', label: 'Loading' }, { value: 'refreshing', label: 'Refreshing' },
        { value: 'empty', label: 'Empty' }, { value: 'nothing', label: 'Nothing matches' }, { value: 'failed', label: 'Failed' },
      ]} />
      <div className="w-full">
        <Table
          caption="Invoices, waiting"
          columns={columns}
          rows={rows}
          rowKey={(i) => i.id}
          loading={state === 'loading' || state === 'refreshing'}
          loadingRows={4}
          error={state === 'failed' ? { message: 'Couldn’t load invoices.', onRetry: () => setState('loading') } : null}
          filter={state === 'nothing' ? { total: INVOICES.length, matched: 0, onClear: () => setState('rows') } : undefined}
          empty={<>No invoices yet. <Button size="compact" cap="primary" icon={<Icon name="plus" />}>New invoice</Button></>}
          now={NOW}
        />
      </div>
    </div>
  );
}

function Narrow() {
  const columns = React.useMemo(() => invoiceColumns(), []);
  return (
    <div data-testid="table-narrow" className="w-full max-w-[760px] min-w-[300px] overflow-hidden p-8 [resize:horizontal] rounded-surface-radius-card recipe-well-field">
      <Table caption="Invoices, any width" columns={columns} rows={INVOICES.slice(0, 5)} rowKey={(i) => i.id} now={NOW} />
    </div>
  );
}

interface Deploy { id: string; sha: string; status: TableStatus; author: TablePerson; started: Date; seconds: number; branch: string }
const DEPLOYS: Deploy[] = Array.from({ length: 40 }, (_, i) => ({
  id: `d${i}`,
  sha: (0x9a3f1c + i * 7417).toString(16).slice(0, 7),
  status: i === 0 ? 'waiting' : i % 9 === 4 ? 'failed' : 'live',
  author: PEOPLE[(i * 5) % PEOPLE.length],
  started: ago(i * 47 + 2),
  seconds: 40 + ((i * 53) % 180),
  branch: ['main', 'release/4.2', 'fix/sync-retry', 'main'][i % 4],
}));
function ManyRows() {
  // A feed: twenty at a time, "Load more" for the next twenty (pages are for records).
  const [shown, setShown] = React.useState(20);
  return (
    <div className="grid w-full max-w-[720px] justify-items-center gap-12">
      <Table
        caption="Deployments"
        density="compact"
        maxHeight={320}
        columns={[
          { key: 'branch', header: 'Branch', sortable: true },
          { key: 'status', header: 'Status', kind: 'status', words: { live: 'Deployed', waiting: 'Building', failed: 'Failed' } },
          { key: 'sha', header: 'Commit', kind: 'code', priority: 3 },
          { key: 'author', header: 'By', kind: 'person', priority: 2 },
          { key: 'started', header: 'Started', kind: 'date', sortable: true },
          { key: 'seconds', header: 'Took', kind: 'number', unit: 's', sortable: true },
        ]}
        rows={DEPLOYS.slice(0, shown)}
        rowKey={(d) => d.id}
        now={NOW}
      />
      {shown < DEPLOYS.length && <Button size="compact" onClick={() => setShown((n) => n + 20)}>Load more</Button>}
    </div>
  );
}

/* TABLE TUNER: the page's DialKit panel. spring is the one the guide and the rows ride (settle by
 * default), slow stretches it, density sets the rows' height. */
function TableTuner() {
  const d = useDialKit('Table', {
    spring: { type: 'select', options: SPRING_NAMES, default: 'settle' },
    slow: [1, 1, 10],
    density: { type: 'select', options: ['roomy', 'regular', 'compact'], default: 'regular' },
  });
  return (
    <div data-testid="table-tuner" className="flex w-full justify-center" style={springVars('settle', d.spring as SpringName, d.slow) as React.CSSProperties}>
      <Services caption="Services, tuned" density={d.density as TableDensity} />
    </div>
  );
}

export default function TablePage() {
  return (
    <ComponentPage
      capture="table"
      title="Table"
      lede="Rows of a person's things, read across and compared down. Each column says what kind of value it holds, and the kind sets the look, so every table in a product reads the same."
      play={{ lede: 'Find a customer, sort by Amount, choose a few (the strip counts them), open one (click or ↩), or act on one from its more key.', caption: 'thirty-six invoices · eight to a page', wide: true, node: <Invoices /> }}
      more={[
        { id: 'numbers', title: 'Numbers to compare', lede: 'Units live in the headers, so the cells are bare figures that line up; a change carries its sign and an arrow, and colour only adds to it. Costs are better down.', node: <Services /> },
        { id: 'cells', title: 'The cell kinds', lede: 'A fixed vocabulary: a column says its kind, and the kind sets the alignment, the type and the empty look. TableCell draws one alone, for Properties or a card.', node: <div className="w-full max-w-[860px]"><Table caption="Cell kinds" columns={KIND_COLUMNS} rows={KINDS} rowKey={(k) => k.kind} /></div> },
        { id: 'density', title: 'Density', lede: 'Roomy 48 for touch, regular 40, compact 32 for many rows on a desk.', node: <Densities /> },
        { id: 'waiting', title: 'Waiting and empty, told apart', lede: 'Loading shows rows in the columns’ shapes; a refresh keeps the rows and dims them after a beat; no rows, nothing matching and a failure each say so, with the one thing to do next.', node: <States /> },
        { id: 'narrow', title: 'Narrow widths', lede: 'Drag the frame’s corner. Under 720 the third-priority columns leave, under 560 the second; their values move to a line under the customer. No sideways scrolling.', node: <Narrow /> },
        { id: 'many', title: 'Many rows', lede: 'In a scroll container the head stays, on frost, over the rows passing under it. A feed loads more at its end; records take pages.', node: <ManyRows /> },
        { id: 'tune', title: 'Tune the motion', lede: 'The Table panel swaps the spring the reading guide and the sorted rows ride, stretches time, and sets the density.', node: <TableTuner /> },
      ]}
      usage={`<Table
  caption="Invoices"
  columns={[
    { key: 'customer', header: 'Customer', sortable: true, detail: (i) => i.email },
    { key: 'status', header: 'Status', kind: 'status', words: { live: 'Paid', waiting: 'Due', failed: 'Overdue' } },
    { key: 'due', header: 'Due', kind: 'date', sortable: true, priority: 2 },
    { key: 'amount', header: 'Amount', kind: 'currency', currency: 'EUR', sortable: true },
    { key: 'actions', header: 'Actions', kind: 'actions', actions: (i) => [{ label: 'Delete', icon: 'trash', danger: true, onSelect: () => remove(i) }] },
  ]}
  rows={invoices}
  rowKey={(i) => i.id}
  selected={selected}
  onSelectedChange={setSelected}
  onRowAction={(i) => open(i.id)}
  opened={openId}
/>`}
      sources={[
        { id: 'react', label: 'React', code: reactSource },
        { id: 'css', label: 'CSS', code: cssSource },
        { id: 'swift', label: 'SwiftUI', code: swiftSource },
        { id: 'agent', label: 'Agent guide', code: agentSource },
      ]}
      rules={[
        { id: 'TB1', title: 'Say the kind, not the look', body: 'A column names its kind (status, currency, date) and gets the shared look, so every table in a product reads the same.', origin: 'Ours' },
        { id: 'TB2', title: 'Units in the header', body: 'Cells are bare tabular figures that line up at the end; the unit is said once, above them. A real minus sign, never red alone.', origin: 'Ours' },
        { id: 'TB3', title: 'A guide, not stripes', body: 'One plate glides under the row you are reading, by pointer or by keys; the rest stays quiet.', origin: 'Ours' },
        { id: 'TB4', title: 'Rows travel when sorted', body: 'Each row moves from where it was to where it now belongs, so the eye can follow it.', origin: 'Ours' },
        { id: 'TB5', title: 'Every way of having none says which', body: 'Loading, empty, nothing matching and failed look different and each offers the next step.', origin: 'Ours' },
        { id: 'TB6', title: 'Narrow by leaving, not by scrolling', body: 'Low-priority columns leave first and their values move under the name; records never scroll sideways.', origin: 'Ours' },
      ]}
    />
  );
}
