import * as React from 'react';
import { useDialKit } from 'dialkit';
import { Filters, Table, describeFilters, filterRows, type FilterCondition, type FilterField, type TableColumn, type TablePerson, type TableStatus } from '@unlocalhosted/metalui';
import { CalendarIcon, CheckIcon, CoinIcon, PersonIcon, TagIcon, TextIcon, InfoIcon } from '@unlocalhosted/metalui/icons';
import { type SpringName } from '../../../../../packages/metalui/src/motion/springs.generated';
import { SPRING_NAMES, springVars } from '../../ui/springTuning';
import reactSource from '../../../../../packages/metalui/src/components/filters/filters.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import swiftSource from '../../../../../swift/Sources/MetalUI/Components/MetalFilters.swift?raw';
import agentSource from '../../../../../packages/metalui/src/components/filters/filters.agent.md?raw';
import { ComponentPage } from '../../ui/ComponentPage';

/* ─────────────────────────────────────────────────────────
 * FILTERS PAGE · conditions over a real table
 *
 *   invoices   a bar over 36 invoices: the table says "12 of 36" and its Clear empties the bar
 *   types      one token of every field type, and the sentence describeFilters reads from them
 *   tune       DialKit: the spring tokens glide on, slowed; how many conditions to start with
 * ───────────────────────────────────────────────────────── */

const NOW = new Date(2026, 9, 6, 12, 0);
const day = (offset: number) => new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() + offset);

const PEOPLE: TablePerson[] = [{ name: 'Ana Duarte' }, { name: 'Kenji Mori' }, { name: 'Lea Brandt' }, { name: 'Omar Haddad' }];
const CUSTOMERS = ['Northwind Studio', 'Atelier Sol', 'Harbour & Co', 'Kite Labs', 'Pine Supply', 'Oslo Print', 'Tram 28 Café', 'Azul Ceramics', 'Field Notes', 'Lumen Works', 'Mesa Bikes', 'Quiet Type'];
const STATES: TableStatus[] = ['live', 'waiting', 'failed', 'off'];
const WORDS = { live: 'Paid', waiting: 'Due', failed: 'Overdue', off: 'Draft' } as const;
const LABELS = ['print', 'studio', 'retainer', 'q4', 'shared'];

interface Invoice { id: string; customer: string; status: TableStatus; owner: TablePerson; due: Date; amount: number; labels: string[]; reminded: boolean }
const INVOICES: Invoice[] = Array.from({ length: 36 }, (_, i) => {
  const customer = CUSTOMERS[i % CUSTOMERS.length];
  return {
    id: `INV-${2040 + i}`,
    customer: i >= CUSTOMERS.length ? `${customer} ${['East', 'West'][i % 2]}` : customer,
    status: STATES[(i * 7) % 11 % 4],
    owner: PEOPLE[(i * 3) % PEOPLE.length],
    due: day(((i * 37) % 41) - 20),
    amount: Math.round((((i * 7919) % 4800) + 120) * 100) / 100,
    labels: LABELS.filter((_, k) => (i + k * 3) % 5 === 0 || (i * (k + 1)) % 7 === 1),
    reminded: i % 3 === 0,
  };
});

const COLUMNS: TableColumn<Invoice>[] = [
  { key: 'customer', header: 'Customer', detail: (i) => i.id },
  { key: 'status', header: 'Status', kind: 'status', words: WORDS },
  { key: 'owner', header: 'Owner', kind: 'person', priority: 2 },
  { key: 'labels', header: 'Labels', kind: 'tags', priority: 3 },
  { key: 'due', header: 'Due', kind: 'date', format: 'date', priority: 2 },
  { key: 'amount', header: 'Amount', kind: 'currency', currency: 'EUR' },
];

const FIELDS: FilterField<Invoice>[] = [
  { id: 'customer', label: 'Customer', type: 'text', icon: <TextIcon /> },
  { id: 'status', label: 'Status', type: 'select', icon: <InfoIcon />, options: STATES.map((s) => ({ value: s, label: WORDS[s] })) },
  { id: 'owner', label: 'Owner', type: 'select', icon: <PersonIcon />, options: PEOPLE.map((p) => ({ value: p.name, label: p.name })), get: (i) => i.owner.name },
  { id: 'labels', label: 'Labels', type: 'multiselect', icon: <TagIcon />, options: LABELS.map((l) => ({ value: l, label: l })) },
  { id: 'due', label: 'Due', type: 'date', icon: <CalendarIcon /> },
  { id: 'amount', label: 'Amount', type: 'number', icon: <CoinIcon />, unit: '€' },
  { id: 'reminded', label: 'Reminded', type: 'boolean', icon: <CheckIcon /> },
];

const START: FilterCondition[] = [
  { id: 'status', field: 'status', op: 'is', value: ['waiting', 'failed'] },
  { id: 'amount', field: 'amount', op: 'gt', value: 1000 },
];

function Invoices({ initial = START, label = 'Invoice filters' }: { initial?: FilterCondition[]; label?: string }) {
  const [filters, setFilters] = React.useState(initial);
  const rows = filterRows(INVOICES, filters, FIELDS);
  return (
    <div className="grid w-full max-w-[760px] gap-12">
      <Filters aria-label={label} fields={FIELDS} value={filters} onValueChange={setFilters} />
      <Table
        caption="Invoices"
        columns={COLUMNS}
        rows={rows}
        rowKey={(i) => i.id}
        maxHeight={360}
        defaultSort={{ key: 'due', direction: 'ascending' }}
        filter={{ total: INVOICES.length, matched: rows.length, onClear: () => setFilters([]) }}
        now={NOW}
      />
    </div>
  );
}

const EVERY: FilterCondition[] = [
  { id: 't', field: 'customer', op: 'contains', value: 'o' },
  { id: 's', field: 'status', op: 'is-not', value: ['off'] },
  { id: 'm', field: 'labels', op: 'any', value: ['print', 'q4'] },
  { id: 'd', field: 'due', op: 'between', value: ['2026-09-20', '2026-10-20'] },
  { id: 'n', field: 'amount', op: 'between', value: [500, 4000] },
  { id: 'b', field: 'reminded', op: 'is', value: false },
];

function EveryType() {
  const [filters, setFilters] = React.useState(EVERY);
  const sentence = describeFilters(filters, FIELDS);
  return (
    <div className="grid w-full max-w-[760px] gap-12">
      <Filters aria-label="Every field type" fields={FIELDS} value={filters} onValueChange={setFilters} />
      <p data-testid="filters-sentence" className="m-0 type-body text-ink2">{sentence ? `${filterRows(INVOICES, filters, FIELDS).length} invoices where ${sentence}.` : 'No conditions: every invoice.'}</p>
    </div>
  );
}

function FiltersTuner() {
  const d = useDialKit('Filters', {
    spring: { type: 'select', options: SPRING_NAMES, default: 'settle' },
    slow: [1, 1, 10],
    start: [2, 0, 6],
  });
  const vars = springVars('settle', d.spring as SpringName, d.slow) as React.CSSProperties;
  const start = Math.round(d.start);
  return (
    <div data-testid="filters-tuner" className="flex w-full justify-center" style={vars}>
      <Invoices key={start} label="Tuned filters" initial={[...START, ...EVERY].slice(0, start)} />
    </div>
  );
}

export default function FiltersPage() {
  return (
    <ComponentPage
      title="Filters"
      capture="filters"
      lede="A row of conditions you build and change in place, each read as a sentence: Status is Open, Amount more than 500. The operator and the value are keys; a new condition opens its editor at once, and one left empty takes itself away."
      play={{ lede: 'Add Due, pick a range and Apply; tick another status; take Amount away and watch the table count.', caption: 'filters over 36 invoices; the table says how many match', node: <div className="flex w-full justify-center"><Invoices /></div> }}
      more={[
        { id: 'types', title: 'Every field type', lede: 'Text, select, multiselect, date, number and boolean, each with its own operators and editor. A select’s words follow its count (is, is any of); a date waits for Apply. describeFilters reads the whole row as one sentence, for a FilterBar’s query or a saved view’s name.', node: <div className="flex w-full justify-center"><EveryType /></div> },
        { id: 'tune', title: 'Tune the row', lede: 'The Filters panel sets the spring the tokens glide on as words change and tokens leave, slowed to watch, and how many conditions the row starts with.', node: <FiltersTuner /> },
      ]}
      usage={`const [filters, setFilters] = React.useState<FilterCondition[]>([]);
const rows = filterRows(invoices, filters, fields);

<Filters fields={fields} value={filters} onValueChange={setFilters} />
<Table
  columns={columns}
  rows={rows}
  filter={{ total: invoices.length, matched: rows.length, onClear: () => setFilters([]) }}
/>`}
      sources={[
        { id: 'react', label: 'React', code: reactSource },
        { id: 'css', label: 'CSS', code: cssSource },
        { id: 'swift', label: 'SwiftUI', code: swiftSource },
        { id: 'agent', label: 'Agent guide', code: agentSource },
      ]}
      rules={[
        { id: 'FI1', title: 'A condition is a sentence', body: 'Field, operator, value, read left to right; the operator’s words follow the value (is → is any of), so two operators do the work of four.', origin: 'Ours' },
        { id: 'FI2', title: 'Nothing half-built stays', body: 'An editor that closes empty takes its token with it, and filterRows ignores a condition without a value.', origin: 'Ours' },
        { id: 'FI3', title: 'Live, except a range of days', body: 'Text, numbers and ticks apply as you go; a date waits for Apply, since half a range means nothing.', origin: 'Date selector' },
        { id: 'FI4', title: 'One count', body: 'The table says "12 of 36"; the bar holds conditions, not a second count.', origin: 'Ours' },
        { id: 'FI5', title: 'One tab stop', body: 'The row is a toolbar: ← → between keys, Enter opens, Esc closes and focus returns.', origin: 'WAI-ARIA' },
      ]}
    />
  );
}
