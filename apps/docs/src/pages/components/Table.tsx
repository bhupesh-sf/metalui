import * as React from 'react';
import { useDialKit } from 'dialkit';
import {
  Button, Field, Pagination, Properties, Segmented, SwapText, Table, TableCell, ToolStrip,
  type SortState, type TableCellFormat, type TableColumn, type TableColumnsState, type TableDensity, type TableKind, type TablePerson, type TableStatus,
} from '@unlocalhosted/metalui';
import { DownloadIcon, DuplicateIcon, Icon, SendIcon, TextIcon, TrashIcon } from '@unlocalhosted/metalui/icons';
import { type SpringName } from '../../../../../packages/metalui/src/motion/springs.generated';
import { SPRING_NAMES, springVars } from '../../ui/springTuning';
import reactSource from '../../../../../packages/metalui/src/components/table/table.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import swiftSource from '../../../../../swift/Sources/MetalUI/Components/MetalTable.swift?raw';
import agentSource from '../../../../../packages/metalui/src/components/table/table.agent.md?raw';
import { ComponentPage } from '../../ui/ComponentPage';

/* ─────────────────────────────────────────────────────────
 * TABLE PAGE · each kind of table, as real data
 *
 *   records    invoices: find, sort, choose several (the tool strip and its drum count), open one
 *              (the rail, and its details as Properties), act on one (the more key), pages
 *   numbers    services to compare: units in the headers, deltas, a trend, a budget meter
 *   totals     the same services with a totals row; a region filter turns the sums on the drum
 *   grouped    invoices by status: group headers with counts and subtotals, collapsible
 *   matrix     plans × features (row headers, the plan column pinned) and roles × permissions
 *              (checkbox cells)
 *   live log   an audit log that streams: rows land, or wait behind "N new" when you're away
 *   detail     deployments that open a panel in place
 *   columns    hide and show from the eye menu; drag a header's hairline to size
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
        { label: 'Send reminder', icon: <SendIcon />, primary: true, onSelect: () => actions?.(i) },
        { label: 'Download PDF', icon: <DownloadIcon />, onSelect: () => actions?.(i) },
        { label: 'Duplicate', icon: <DuplicateIcon />, onSelect: () => actions?.(i) },
        { label: 'Delete', icon: <TrashIcon />, danger: true, onSelect: () => actions?.(i) },
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

interface Kind { kind: TableKind; value: unknown; look: string; extra?: TableCellFormat }
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
  { kind: 'check', value: true, look: 'A row checkbox the person can change (a permissions matrix); read-only without onCheckedChange.' },
  { kind: 'code', value: 'a41f9c2', look: 'Monospaced; a copy key on hover and focus.' },
  { kind: 'actions', value: null, look: 'A more key at the row’s end, on hover and focus.' },
];
const KIND_COLUMNS: TableColumn<Kind>[] = [
  { key: 'kind', header: 'Kind', kind: 'code', cell: (k) => <span className="type-label-cell text-ink">{k.kind}</span> },
  {
    key: 'value', header: 'Looks like', cell: (k) => (
      <span className="inline-block max-w-[220px] align-middle">
        <TableCell kind={k.kind} value={k.value} label="Sample" now={NOW} {...k.extra} actions={k.kind === 'actions' ? [{ label: 'Rename', icon: <TextIcon />, onSelect: () => {} }, { label: 'Delete', icon: <TrashIcon />, danger: true, onSelect: () => {} }] : undefined} />
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

/* ── Should: totals, groups, a matrix, a live log, detail in place, columns ── */

const TOTAL_COLUMNS: TableColumn<Service>[] = SERVICE_COLUMNS.map((c) => (c.key === 'requests' || c.key === 'cost' ? { ...c, total: 'sum' } : c));
const REGIONS = ['all', 'eu-west', 'us-east'] as const;
function Totals() {
  // Choosing a region changes the rows; the totals turn on the drum to the new sums.
  const [region, setRegion] = React.useState<(typeof REGIONS)[number]>('all');
  const rows = region === 'all' ? SERVICES : SERVICES.filter((s) => s.region === region);
  return (
    <div className="grid w-full max-w-[860px] gap-16 justify-items-start">
      <Segmented aria-label="Region" value={region} onValueChange={setRegion} options={REGIONS.map((r) => ({ value: r, label: r === 'all' ? 'All regions' : r }))} />
      <div className="w-full">
        <Table caption="Services, with totals" density="compact" columns={TOTAL_COLUMNS} rows={rows} rowKey={(s) => s.id} defaultSort={{ key: 'cost', direction: 'descending' }} footer="Total" />
      </div>
    </div>
  );
}

function Grouped() {
  const columns = React.useMemo(() => invoiceColumns().filter((c) => c.key !== 'status').map((c) => (c.key === 'amount' ? { ...c, total: 'sum' as const } : c)), []);
  return (
    <div className="w-full max-w-[760px]">
      <Table
        caption="Invoices by status"
        columns={columns}
        rows={INVOICES.slice(0, 24)}
        rowKey={(i) => i.id}
        rowLabel={(i) => `${i.customer} ${i.id}`}
        groupBy={(i) => INVOICE_WORDS[i.status]}
        defaultCollapsed={['Draft']}
        defaultSort={{ key: 'due', direction: 'ascending' }}
        maxHeight={400}
        now={NOW}
      />
    </div>
  );
}

interface Plan { id: string; name: string; price: number; seats: number; storage: number; history: number; sso: boolean; audit: boolean; api: boolean; branding: boolean; support: string }
const PLANS: Plan[] = [
  { id: 'free', name: 'Free', price: 0, seats: 1, storage: 2, history: 7, sso: false, audit: false, api: false, branding: false, support: 'Community' },
  { id: 'starter', name: 'Starter', price: 9, seats: 5, storage: 50, history: 30, sso: false, audit: false, api: true, branding: false, support: 'Email' },
  { id: 'team', name: 'Team', price: 24, seats: 25, storage: 500, history: 90, sso: false, audit: true, api: true, branding: true, support: 'Email, 24 h' },
  { id: 'business', name: 'Business', price: 49, seats: 100, storage: 2000, history: 365, sso: true, audit: true, api: true, branding: true, support: 'Chat, 4 h' },
  { id: 'enterprise', name: 'Enterprise', price: 99, seats: 500, storage: 10000, history: 730, sso: true, audit: true, api: true, branding: true, support: 'A named person' },
];
const PLAN_COLUMNS: TableColumn<Plan>[] = [
  { key: 'name', header: 'Plan', rowHeader: true, pin: 'start' },
  { key: 'price', header: 'Price', kind: 'currency', currency: 'EUR', digits: 0, unit: '€ a seat' },
  { key: 'seats', header: 'Seats', kind: 'number' },
  { key: 'storage', header: 'Storage', kind: 'number', unit: 'GB' },
  { key: 'history', header: 'History', kind: 'number', unit: 'days' },
  { key: 'sso', header: 'SSO', kind: 'yes' },
  { key: 'audit', header: 'Audit log', kind: 'yes' },
  { key: 'api', header: 'API', kind: 'yes' },
  { key: 'branding', header: 'Own branding', kind: 'yes' },
  { key: 'support', header: 'Support' },
];
function Plans() {
  return (
    <div data-testid="table-plans" className="w-full max-w-[640px]">
      <Table caption="Plans compared" columns={PLAN_COLUMNS} rows={PLANS} rowKey={(p) => p.id} maxHeight={320} />
    </div>
  );
}

const ROLES = ['Owner', 'Admin', 'Editor', 'Viewer'] as const;
type Role = (typeof ROLES)[number];
interface Permission { id: string; name: string; grants: Record<Role, boolean | null> }
const PERMISSIONS: Permission[] = [
  { id: 'read', name: 'Read posts', grants: { Owner: true, Admin: true, Editor: true, Viewer: true } },
  { id: 'write', name: 'Write drafts', grants: { Owner: true, Admin: true, Editor: true, Viewer: false } },
  { id: 'publish', name: 'Publish', grants: { Owner: true, Admin: true, Editor: false, Viewer: false } },
  { id: 'comments', name: 'Moderate comments', grants: { Owner: true, Admin: true, Editor: true, Viewer: false } },
  { id: 'members', name: 'Invite members', grants: { Owner: true, Admin: false, Editor: false, Viewer: null } },
  { id: 'billing', name: 'Billing', grants: { Owner: true, Admin: false, Editor: null, Viewer: null } },
];
function Permissions() {
  // The owner holds every permission (read-only boxes); a dash is a permission the role can't have.
  const [grants, setGrants] = React.useState(PERMISSIONS);
  const set = (id: string, role: Role, on: boolean) => setGrants((all) => all.map((p) => (p.id === id ? { ...p, grants: { ...p.grants, [role]: on } } : p)));
  const columns: TableColumn<Permission>[] = [
    { key: 'name', header: 'Permission', rowHeader: true },
    ...ROLES.map((role): TableColumn<Permission> => ({
      key: role, header: role, kind: 'check', value: (p) => p.grants[role],
      onCheckedChange: role === 'Owner' ? undefined : (p, on) => set(p.id, role, on),
    })),
  ];
  const count = grants.reduce((n, p) => n + ROLES.filter((r) => p.grants[r]).length, 0);
  return (
    <div className="grid w-full max-w-[560px] gap-8">
      <Table caption="Roles and permissions" columns={columns} rows={grants} rowKey={(p) => p.id} />
      <p className="m-0 type-meta text-ink3 tabular-nums" aria-live="polite"><SwapText value={`${count} grants`} /></p>
    </div>
  );
}

interface LogEvent { id: string; at: Date; level: TableStatus; event: string; actor: TablePerson; message: string }
const LOG_LINES: [TableStatus, string, string][] = [
  ['live', 'deploy.finished', 'Deployed web@4.2.1 to eu-west'],
  ['live', 'member.joined', 'Lea Brandt joined Design'],
  ['waiting', 'quota.near', 'Storage at 82% of the plan'],
  ['live', 'invoice.paid', 'INV-2051 paid by Kite Labs'],
  ['failed', 'sync.failed', 'Calendar sync failed: token expired'],
  ['live', 'key.rotated', 'API key rotated for Billing'],
  ['waiting', 'login.unusual', 'Sign-in from a new device, Lisbon'],
  ['live', 'export.ready', 'Export of 2,400 rows is ready'],
];
const logEvent = (n: number): LogEvent => {
  const [level, event, message] = LOG_LINES[n % LOG_LINES.length];
  return { id: `evt_${(0x5a1c + n * 977).toString(16)}`, at: new Date(NOW.getTime() + n * 37_000), level, event, actor: PEOPLE[n % PEOPLE.length], message };
};
const LOG_COLUMNS: TableColumn<LogEvent>[] = [
  { key: 'at', header: 'Time', kind: 'date', format: 'time' },
  { key: 'level', header: 'Level', kind: 'status', words: { live: 'Info', waiting: 'Warn', failed: 'Error' } },
  { key: 'message', header: 'Message', primary: true },
  { key: 'event', header: 'Event', kind: 'code', priority: 3 },
  { key: 'actor', header: 'By', kind: 'person', priority: 2 },
];
const LOG_LIMIT = 80;
function LiveLog() {
  // Newest first. Streaming adds an event every beat while on, and stops by itself at the limit.
  const [events, setEvents] = React.useState(() => Array.from({ length: 24 }, (_, i) => logEvent(23 - i)));
  const [streaming, setStreaming] = React.useState(false);
  const add = (k: number) => setEvents((all) => [...Array.from({ length: k }, (_, i) => logEvent(all.length + k - 1 - i)), ...all].slice(0, LOG_LIMIT));
  React.useEffect(() => {
    if (!streaming) return;
    const t = window.setInterval(() => add(1), 1400);
    return () => window.clearInterval(t);
  }, [streaming]);
  React.useEffect(() => { if (events.length >= LOG_LIMIT) setStreaming(false); }, [events.length]);
  return (
    <div className="grid w-full max-w-[760px] gap-12 justify-items-start">
      <div className="flex gap-8">
        <Button size="compact" onClick={() => setStreaming((s) => !s)} icon={<Icon name={streaming ? 'stop' : 'send'} />}><SwapText value={streaming ? 'Pause' : 'Stream'} /></Button>
        <Button size="compact" onClick={() => add(3)} icon={<Icon name="plus" />}>Three events</Button>
      </div>
      <div className="w-full">
        <Table caption="Audit log" density="compact" live maxHeight={320} columns={LOG_COLUMNS} rows={events} rowKey={(e) => e.id} now={NOW} />
      </div>
    </div>
  );
}

function DeployDetail({ d }: { d: Deploy }) {
  return (
    <div className="grid gap-12 max-w-[520px]">
      <Properties size="compact">
        <Properties.Item label="Commit"><TableCell kind="code" value={d.sha} /></Properties.Item>
        <Properties.Item label="Branch">{d.branch}</Properties.Item>
        <Properties.Item label="By"><TableCell kind="person" value={d.author} /></Properties.Item>
        <Properties.Item label="Started"><TableCell kind="date" value={d.started} format="datetime" now={NOW} /></Properties.Item>
        <Properties.Item label="Took (s)"><TableCell kind="number" value={d.seconds} /></Properties.Item>
      </Properties>
      {d.status === 'failed' && <p className="m-0 type-code text-ink2">step 4/6 · npm run build · exit 1</p>}
    </div>
  );
}
function Detail() {
  return (
    <div className="w-full max-w-[720px]">
      <Table
        caption="Recent deploys"
        density="compact"
        columns={[
          { key: 'branch', header: 'Branch' },
          { key: 'status', header: 'Status', kind: 'status', words: { live: 'Deployed', waiting: 'Building', failed: 'Failed' } },
          { key: 'author', header: 'By', kind: 'person', priority: 2 },
          { key: 'started', header: 'Started', kind: 'date' },
        ]}
        rows={DEPLOYS.slice(0, 6)}
        rowKey={(d) => d.id}
        rowLabel={(d) => `${d.branch} ${d.sha}`}
        expandRow={(d) => <DeployDetail d={d} />}
        now={NOW}
      />
    </div>
  );
}

function Columns() {
  // The host keeps what the person changed (here it only says it; a product would save it).
  const columns = React.useMemo(() => invoiceColumns(), []);
  const [state, setState] = React.useState<TableColumnsState>({ hidden: ['owner'] });
  const said = [
    state.hidden?.length ? `Hidden: ${state.hidden.map((k) => columns.find((c) => c.key === k)?.header).join(', ')}` : 'Nothing hidden',
    ...Object.entries(state.widths ?? {}).map(([k, w]) => `${columns.find((c) => c.key === k)?.header} ${w}`),
  ].join(' · ');
  return (
    <div className="grid w-full max-w-[760px] gap-8">
      <Table caption="Invoices, your columns" columns={columns} rows={INVOICES.slice(0, 5)} rowKey={(i) => i.id} columnsMenu resizable columnsState={state} onColumnsChange={setState} now={NOW} />
      <p data-testid="table-columns-state" className="m-0 type-meta text-ink3" aria-live="polite">{said}</p>
    </div>
  );
}

/* HIERARCHY: a project's files. Folders open in place (Tree's guides and chevron in the name cell);
 * Archive's level loads when opened (and fails once when the Table rows panel says so). */
interface FileRow { id: string; name: string; kind: string; size: number | null; modified: Date; children?: FileRow[]; lazy?: boolean }
const file = (id: string, name: string, kind: string, size: number, minutes: number): FileRow => ({ id, name, kind, size, modified: ago(minutes) });
const folder = (id: string, name: string, children: FileRow[] | undefined, minutes: number, lazy?: boolean): FileRow => ({
  id, name, kind: 'Folder', size: children ? Math.round(children.reduce((n, c) => n + (c.size ?? 0), 0) * 10) / 10 : null, modified: ago(minutes), children, lazy,
});
const FILES: FileRow[] = [
  folder('brief', 'Brief', [file('brief/goals', 'Goals.md', 'Text', 0.1, 90), file('brief/audience', 'Audience.md', 'Text', 0.2, 300), file('brief/budget', 'Budget.xlsx', 'Sheet', 1.4, 2900)], 90),
  folder('design', 'Design', [
    folder('design/screens', 'Screens', [file('design/screens/home', 'Home.fig', 'Design', 18.2, 40), file('design/screens/search', 'Search.fig', 'Design', 12.6, 220), file('design/screens/settings', 'Settings.fig', 'Design', 9.8, 1500)], 40),
    folder('design/drafts', 'Drafts', [], 6000),
    file('design/tokens', 'Tokens.json', 'Data', 0.3, 700),
  ], 40),
  folder('archive', 'Archive', undefined, 20000, true),
  file('readme', 'Readme.md', 'Text', 0.1, 9000),
];
const FILE_COLUMNS: TableColumn<FileRow>[] = [
  { key: 'name', header: 'Name', sortable: true },
  { key: 'kind', header: 'Kind', priority: 3 },
  { key: 'size', header: 'Size', kind: 'number', unit: 'MB', digits: 1, sortable: true },
  { key: 'modified', header: 'Modified', kind: 'date', sortable: true, priority: 2 },
];
const ARCHIVE = [file('archive/2024', 'Report 2024.pdf', 'PDF', 4.1, 300000), file('archive/2025', 'Report 2025.pdf', 'PDF', 5.3, 50000)];

function Hierarchy({ delay, fails }: { delay: number; fails: boolean }) {
  const [archive, setArchive] = React.useState<FileRow[] | undefined>(undefined);
  const [opened, setOpened] = React.useState<string | null>(null);
  const failed = React.useRef(false);
  const rows = React.useMemo(() => FILES.map((f) => (f.id === 'archive' ? { ...f, children: archive } : f)), [archive]);
  const load = async () => {
    await new Promise((r) => setTimeout(r, delay));
    if (fails && !failed.current) { failed.current = true; throw new Error('offline'); }
    setArchive(ARCHIVE);
  };
  return (
    <div data-testid="table-tree" className="w-full max-w-[720px]">
      <Table
        caption="Project files"
        columns={FILE_COLUMNS}
        rows={rows}
        rowKey={(f) => f.id}
        childRows={(f) => f.children}
        hasChildRows={(f) => !!f.lazy}
        loadChildRows={load}
        defaultExpandedRows={['design']}
        onRowAction={(f) => setOpened(f.id)}
        opened={opened}
        defaultSort={{ key: 'name', direction: 'ascending' }}
        now={NOW}
      />
    </div>
  );
}

/* VIRTUAL: ten thousand sign-ins. Only the rows in view are in the page; the readout counts them. */
interface Signin { id: string; who: string; place: string; status: TableStatus; at: Date; ms: number }
const PLACES = ['Lisbon', 'Osaka', 'Berlin', 'Austin', 'Nairobi', 'Lima', 'Oslo', 'Pune'];
const signin = (i: number): Signin => ({
  id: `S-${String(i + 1).padStart(5, '0')}`,
  who: `${PEOPLE[i % PEOPLE.length].name}`,
  place: PLACES[(i * 5) % PLACES.length],
  status: STATES[(i * 7) % 13 % 3],
  at: ago(i * 3 + ((i * 7) % 3)),
  ms: 80 + ((i * 7919) % 900),
});
const SIGNIN_COLUMNS: TableColumn<Signin>[] = [
  { key: 'id', header: 'Sign-in', sortable: true, detail: (s) => s.who },
  { key: 'place', header: 'Place', priority: 2 },
  { key: 'status', header: 'Result', kind: 'status', words: { live: 'Signed in', waiting: 'Challenged', failed: 'Refused' }, sortable: true },
  { key: 'at', header: 'When', kind: 'date', sortable: true, priority: 3 },
  { key: 'ms', header: 'Took', kind: 'number', unit: 'ms', sortable: true },
];

/** How many rows of the table below are in the page right now. */
function InPage({ of, children }: { of: number; children: React.ReactNode }) {
  const box = React.useRef<HTMLDivElement>(null);
  const [count, setCount] = React.useState(0);
  React.useEffect(() => {
    const el = box.current;
    if (!el) return;
    const read = () => setCount(el.querySelectorAll('tbody tr[data-key]').length);
    read();
    const watch = new MutationObserver(read);
    watch.observe(el, { childList: true, subtree: true });
    return () => watch.disconnect();
  }, []);
  return (
    <div ref={box} className="grid w-full max-w-[720px] gap-8">
      {children}
      <p data-testid="table-in-page" className="m-0 type-meta tabular-nums text-ink3">{count} of {of.toLocaleString('en-US')} rows in the page</p>
    </div>
  );
}

function VirtualRows({ count }: { count: number }) {
  const rows = React.useMemo(() => Array.from({ length: count }, (_, i) => signin(i)), [count]);
  const [selected, setSelected] = React.useState(new Set<string>());
  const [opened, setOpened] = React.useState<string | null>(null);
  return (
    <InPage of={count}>
      <Table caption="Sign-ins" density="compact" virtual maxHeight={360} columns={SIGNIN_COLUMNS} rows={rows} rowKey={(s) => s.id}
        selected={selected} onSelectedChange={setSelected} onRowAction={(s) => setOpened(s.id)} opened={opened} now={NOW} />
    </InPage>
  );
}

/* INFINITE: a feed of sign-ins that loads forty more as its end comes into view, up to four hundred. */
function Infinite({ delay, fails }: { delay: number; fails: boolean }) {
  const [rows, setRows] = React.useState(() => Array.from({ length: 40 }, (_, i) => signin(i)));
  const loads = React.useRef(0);
  const loadMore = async () => {
    await new Promise((r) => setTimeout(r, delay));
    if (fails && ++loads.current === 2) throw new Error('offline');
    setRows((all) => [...all, ...Array.from({ length: 40 }, (_, i) => signin(all.length + i))]);
  };
  return (
    <InPage of={rows.length}>
      <Table caption="Sign-ins, as they load" density="compact" virtual maxHeight={360} columns={SIGNIN_COLUMNS} rows={rows} rowKey={(s) => s.id}
        hasMore={rows.length < 400} loadMore={loadMore} now={NOW} />
    </InPage>
  );
}

/* ROWS PANEL: the page's second DialKit panel, for the hierarchy, virtual and infinite sections. count
 * sets how many rows the virtual table holds, load how long a level or a page takes, fails makes the
 * first Archive load and the second page fail (on by default, so the page shows how; Try again then works). */
function useRowsDials() {
  return useDialKit('Table rows', {
    count: [10000, 1000, 50000],
    load: [700, 0, 3000],
    fails: true,
  }, { id: 'table-rows' }); // one panel, read by the three sections
}
function HierarchySection() { const d = useRowsDials(); return <Hierarchy key={String(d.fails)} delay={d.load} fails={d.fails} />; }
function VirtualSection() { const d = useRowsDials(); return <VirtualRows count={Math.round(d.count / 1000) * 1000} />; }
function InfiniteSection() { const d = useRowsDials(); return <Infinite key={String(d.fails)} delay={d.load} fails={d.fails} />; }

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
        { id: 'totals', title: 'Totals', lede: 'A column with a total fills a sunk readout row at the foot, held at the bottom while the rows scroll. Choose a region: the figures turn on the drum to the new sums.', node: <Totals /> },
        { id: 'grouped', title: 'Grouped', lede: 'Each group gets an engraved header with its count and subtotal, held under the head while its rows pass. Open or close one: the chevron turns and the groups below travel to their places.', node: <Grouped /> },
        { id: 'matrix', title: 'Comparison matrix', lede: 'Both axes are headers: each plan names its row, and that column stays on its plate while the features scroll sideways under it; the shadow at its edge shows only while something is under it.', node: <Plans /> },
        { id: 'permissions', title: 'A permissions matrix', lede: 'Cells that are checkboxes. The owner holds everything (read-only boxes); a dash is a permission the role can’t have.', node: <Permissions /> },
        { id: 'live', title: 'Live log', lede: 'New events land at the top and the rest travel down. Scroll down a little and stream: they wait behind a “new” key instead of pushing what you’re reading; press it, or come back to the top.', node: <LiveLog /> },
        { id: 'detail', title: 'Row detail in place', lede: 'The chevron at a row’s start opens a sunk panel under it, for a little more without leaving the list; the rows below make room.', node: <Detail /> },
        { id: 'columns', title: 'Columns to hide and size', lede: 'The eye key lists the columns to hide and show; drag the hairline at a header’s end (or focus it and use ← →) to size its column, and double-click it to give the column back its own width. The host keeps both.', node: <Columns /> },
        { id: 'cells', title: 'The cell kinds', lede: 'A fixed vocabulary: a column says its kind, and the kind sets the alignment, the type and the empty look. TableCell draws one alone, for Properties or a card.', node: <div className="w-full max-w-[860px]"><Table caption="Cell kinds" columns={KIND_COLUMNS} rows={KINDS} rowKey={(k) => k.kind} /></div> },
        { id: 'density', title: 'Density', lede: 'Roomy 48 for touch, regular 40, compact 32 for many rows on a desk.', node: <Densities /> },
        { id: 'waiting', title: 'Waiting and empty, told apart', lede: 'Loading shows rows in the columns’ shapes; a refresh keeps the rows and dims them after a beat; no rows, nothing matching and a failure each say so, with the one thing to do next.', node: <States /> },
        { id: 'narrow', title: 'Narrow widths', lede: 'Drag the frame’s corner. Under 720 the third-priority columns leave, under 560 the second; their values move to a line under the customer. No sideways scrolling.', node: <Narrow /> },
        { id: 'many', title: 'Many rows', lede: 'In a scroll container the head stays, on frost, over the rows passing under it. A feed loads more at its end; records take pages.', node: <ManyRows /> },
        { id: 'tree', title: 'Hierarchy', lede: 'Rows that hold rows: folders, accounts, an org. The name cell starts with the tree’s guides and chevron; → opens a row, ← closes it or goes to its parent. Children sort among themselves; a level can load when it is opened (Archive), and a failed load says so on the row (Archive’s first does). The Table rows panel sets how long a load takes and whether the first one fails.', node: <HierarchySection /> },
        { id: 'virtual', title: 'Virtual rows', lede: 'Ten thousand rows, and only those in view are in the page (the line under it counts them). Sort, select, open with ↩ and walk with ↑ ↓: the window follows, the head stays, and the row holding focus is kept. The Table rows panel sets the count.', node: <VirtualSection /> },
        { id: 'infinite', title: 'Infinite scroll', lede: 'A feed loads forty more as its end comes into view: a row in the columns’ shapes waits there while they come. A failed load (the second, here) says so in that row with Try again, and nothing else moves.', node: <InfiniteSection /> },
        { id: 'tune', title: 'Tune the motion', lede: 'The Table panel swaps the spring the reading guide and the sorted rows ride, stretches time, and sets the density.', node: <TableTuner /> },
      ]}
      usage={`<Table
  caption="Invoices"
  columns={[
    { key: 'customer', header: 'Customer', sortable: true, detail: (i) => i.email },
    { key: 'status', header: 'Status', kind: 'status', words: { live: 'Paid', waiting: 'Due', failed: 'Overdue' } },
    { key: 'due', header: 'Due', kind: 'date', sortable: true, priority: 2 },
    { key: 'amount', header: 'Amount', kind: 'currency', currency: 'EUR', sortable: true },
    { key: 'actions', header: 'Actions', kind: 'actions', actions: (i) => [{ label: 'Delete', icon: <TrashIcon />, danger: true, onSelect: () => remove(i) }] },
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
        { id: 'TB7', title: 'Arrivals never push the reader', body: 'New rows land at the top only while you are there; scrolled away, they wait behind a count you choose to open.', origin: 'Ours' },
        { id: 'TB8', title: 'Totals are a readout, not a row', body: 'Totals sit in a sunk bar at the foot, held in view, and turn on the drum when the rows change, so a sum is never mistaken for one more record.', origin: 'Ours' },
      ]}
    />
  );
}
