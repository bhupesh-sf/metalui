import * as React from 'react';
import { useDialKit } from 'dialkit';
import { Card, Kanban, Menu, MenuItem, ToastProvider, moveBetween, useToast, type KanbanValue } from '@unlocalhosted/metalui';
import { LockIcon } from '@unlocalhosted/metalui/icons';
import { type SpringName } from '../../../../../packages/metalui/src/motion/springs.generated';
import { SPRING_NAMES, springVars } from '../../ui/springTuning';
import reactSource from '../../../../../packages/metalui/src/components/kanban/kanban.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import swiftSource from '../../../../../swift/Sources/MetalUI/Components/MetalKanban.swift?raw';
import agentSource from '../../../../../packages/metalui/src/components/kanban/kanban.agent.md?raw';
import { ComponentPage } from '../../ui/ComponentPage';

/* ─────────────────────────────────────────────────────────
 * KANBAN PAGE
 *
 *   playground  a print studio's orders: drag a card between columns, or focus it and use Space and
 *               the arrows; Printing is over its limit; the catalogue is on press and can't move. The
 *               Kanban panel: grips on the columns, the limit, folding, the save's wait and failure,
 *               the springs it lifts and lands on, and slow motion
 *   more        a save that fails and glides back with a toast; an empty column and a folded one;
 *               a long board that scrolls sideways while you drag
 * ───────────────────────────────────────────────────────── */

interface Order { title: string; who: string; due: string; locked?: boolean }

const ORDERS: Record<string, Order> = {
  poster: { title: 'Gig poster, A2', who: 'Lux Frágil', due: 'Fri' },
  menus: { title: 'Menus, 40 copies', who: 'Taberna da Rua', due: 'Mon' },
  zine: { title: 'Riso zine', who: 'Ana Costa', due: 'Wed' },
  cards: { title: 'Business cards', who: 'Estúdio Mar', due: 'Tue' },
  labels: { title: 'Wine labels', who: 'Quinta do Vale', due: 'Thu' },
  banner: { title: 'Shop banner', who: 'Livraria Ler', due: 'Today' },
  catalogue: { title: 'Autumn catalogue', who: 'Casa Azul', due: 'Today', locked: true },
  tickets: { title: 'Raffle tickets', who: 'Bairro Alto Fest', due: 'Sat' },
  invites: { title: 'Wedding invites', who: 'Rita & João', due: 'Next week' },
  maps: { title: 'Walking maps', who: 'Lisbon on Foot', due: 'Oct 20' },
};

interface Lane { id: string; label: string; limit?: number }
const LANES: Lane[] = [
  { id: 'new', label: 'New' },
  { id: 'proofing', label: 'Proofing', limit: 3 },
  { id: 'printing', label: 'Printing', limit: 2 },
  { id: 'shipped', label: 'Shipped' },
];
const START: KanbanValue = {
  new: ['poster', 'menus', 'zine'],
  proofing: ['cards', 'labels'],
  printing: ['banner', 'catalogue', 'tickets'],
  shipped: ['invites'],
};

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const GLYPH = 'size-14 flex-none text-ink3';

/** One order on a compact card, with "Move to" in its corner for a move without dragging. */
function OrderCard({ id, lanes, move }: { id: string; lanes: Lane[]; move: (id: string, to: string) => void }) {
  const o = ORDERS[id] ?? { title: 'New order', who: 'No client yet', due: '–' };
  return (
    <Card size="compact">
      <Card.Title level={4}>{o.title}</Card.Title>
      {!o.locked && (
        <Menu heading={o.title} align="end" trigger={<Card.Action label={`Move ${o.title}`} />}>
          {lanes.map((l) => <MenuItem key={l.id} onSelect={() => move(id, l.id)}>Move to {l.label}</MenuItem>)}
        </Menu>
      )}
      <Card.Description className="flex items-center gap-6">
        {o.locked && <LockIcon className={GLYPH} aria-label="On press" />}
        <span className="min-w-0 flex-1 truncate">{o.who}</span>
        <span className="type-meta tabular-nums text-ink3">{o.due}</span>
      </Card.Description>
    </Card>
  );
}

interface BoardProps {
  id: string;
  label: string;
  lanes?: Lane[];
  start?: KanbanValue;
  reorder?: boolean;
  limits?: boolean;
  limit?: number;
  collapsible?: boolean;
  folded?: string[];
  save?: { ms: number; fails: () => boolean };
  className?: string;
}

/** A board of orders, with its save and its toasts. */
function Orders({ id, label, lanes: given = LANES, start = START, reorder, limits = true, limit, collapsible, folded = [], save, className = 'h-[460px]' }: BoardProps) {
  const [value, setValue] = React.useState<KanbanValue>(start);
  const [columns, setColumns] = React.useState(() => given.map((l) => l.id));
  const byId = React.useMemo(() => new Map(given.map((l) => [l.id, l])), [given]);
  const toast = useToast();
  const commit = React.useCallback(async (next: KanbanValue, previous: KanbanValue) => {
    if (!save) return;
    await wait(save.ms);
    const card = Object.keys(next).flatMap((c) => next[c].filter((k) => !previous[c]?.includes(k)))[0];
    const name = card ? ORDERS[card]?.title ?? card : 'the order';
    if (save.fails()) {
      toast.show({ title: `Couldn’t move ${name}`, sub: 'it’s back where it was', tone: 'error', timeout: 4000 });
      throw new Error('The save did not reach the server.');
    }
    if (card) toast.show({ title: `${name} moved`, undo: () => setValue(previous) });
  }, [save, toast]);
  const move = (card: string, to: string) => {
    const next = moveBetween(value, card, to);
    setValue(next);
    void commit(next, value).catch(() => setValue(value));
  };
  return (
    <div data-testid={id} className="flex w-full justify-center">
      <Kanban.Root
        aria-label={label}
        value={value}
        onValueChange={setValue}
        onValueCommit={commit}
        columns={columns}
        onColumnsChange={reorder ? setColumns : undefined}
        className={`w-full ${className}`}
      >
        {columns.map((c) => {
          const lane = byId.get(c)!;
          return (
            <Kanban.Column
              key={c}
              value={c}
              label={lane.label}
              limit={limits ? (c === 'printing' && limit != null ? limit || undefined : lane.limit) : undefined}
              collapsible={collapsible}
              defaultCollapsed={folded.includes(c)}
            >
              <Kanban.Cards empty="No orders">
                {value[c].map((k) => (
                  <Kanban.Card key={k} value={k} label={ORDERS[k]?.title ?? 'New order'} disabled={ORDERS[k]?.locked}>
                    <OrderCard id={k} lanes={given.filter((l) => l.id !== c)} move={move} />
                  </Kanban.Card>
                ))}
              </Kanban.Cards>
              {c === 'new' && (
                <Card.EmptySlot className="min-h-[44px]! grid-flow-col items-center gap-6 py-0!" onClick={() => {
                  const k = `order-${Object.values(value).flat().length + 1}`;
                  setValue((v) => ({ ...v, new: [...v.new, k] }));
                }}>New order</Card.EmptySlot>
              )}
            </Kanban.Column>
          );
        })}
      </Kanban.Root>
    </div>
  );
}

function Playground() {
  const d = useDialKit('Kanban', {
    columns: true,
    limit: [2, 0, 6],
    fold: true,
    wait: [0, 0, 3000],
    fails: false,
    lift: { type: 'select', options: SPRING_NAMES, default: 'surface' },
    land: { type: 'select', options: SPRING_NAMES, default: 'object' },
    slow: [1, 1, 10],
  });
  const save = React.useMemo(() => (d.wait || d.fails ? { ms: d.wait, fails: () => d.fails } : undefined), [d.wait, d.fails]);
  const vars = { ...springVars('surface', d.lift as SpringName, d.slow), ...springVars('object', d.land as SpringName, d.slow), ...springVars('settle', 'settle', d.slow) } as React.CSSProperties;
  return (
    <div className="w-full" style={vars}>
      <Orders key={`${d.columns}`} id="kanban-play" label="Orders" reorder={d.columns} limit={Math.round(d.limit)} collapsible={d.fold} save={save} />
    </div>
  );
}

/** The first save fails: a toast says so and the card glides back. */
function FailsOnce() {
  const tries = React.useRef(0);
  const save = React.useMemo(() => ({ ms: 700, fails: () => ++tries.current === 1 }), []);
  return <Orders id="kanban-fails" label="Orders, saved to a server" save={save} limits={false} className="h-[400px]" />;
}

const QUIET: KanbanValue = { new: ['poster', 'zine'], proofing: [], printing: ['banner'], shipped: ['invites', 'maps', 'menus'] };

const MANY: Lane[] = [
  { id: 'new', label: 'New' }, { id: 'quote', label: 'Quoted' }, { id: 'proofing', label: 'Proofing' },
  { id: 'approved', label: 'Approved' }, { id: 'printing', label: 'Printing' }, { id: 'finishing', label: 'Finishing' }, { id: 'shipped', label: 'Shipped' },
];
const SPREAD: KanbanValue = {
  new: ['poster', 'menus'], quote: ['zine'], proofing: ['cards'], approved: ['labels'], printing: ['banner', 'tickets'], finishing: ['maps'], shipped: ['invites'],
};

export default function KanbanPage() {
  return (
    <ToastProvider>
      <ComponentPage
        title="Kanban"
        lede="A board of the person's things in columns. Pick a card up and a copy rises above the board and follows your hand, a recess opens where it will land, the others make room, across columns too, and it lands. Keys do the same, step by step, out loud."
        play={{ wide: true, lede: 'Drag a card to another column, or Tab to one, press Space, move it with the arrows (left and right change column) and press Space again. Printing is over its limit; the catalogue is on press and won’t move. The Kanban panel adds grips to the columns, sets the limit, makes the save slow or fail, and swaps the springs.', caption: 'a copy on the overlay · the recess, live · the others glide across columns · land on object · limits in words · keys, said out loud', node: <Playground /> }}
        more={[
          { id: 'rollback', title: 'When the save fails', lede: 'The first move here fails: the board waits while the save is out, then every card glides back to where it was, and the toast says so. Move it again and it holds.', node: <FailsOnce /> },
          { id: 'empty', title: 'Empty and folded', lede: 'An empty column keeps its height, so there is somewhere to drop. A folded column is its header alone, still counting; it takes nothing until it opens.', node: <Orders id="kanban-quiet" label="Quiet week" start={QUIET} collapsible folded={['shipped']} limits={false} className="h-[360px]" /> },
          { id: 'long', title: 'A long board', lede: 'Hold a card near the board’s left or right edge and it scrolls that way; near a column’s top or bottom, the column scrolls.', node: <div className="w-full max-w-[640px]"><Orders id="kanban-long" label="Every stage" lanes={MANY} start={SPREAD} limits={false} className="h-[360px]" /></div> },
        ]}
        usage={`const [cards, setCards] = React.useState<KanbanValue>({ todo: ['a', 'b'], doing: ['c'], done: [] });

<Kanban.Root
  aria-label="Orders"
  value={cards}
  onValueChange={setCards}
  onValueCommit={async (next, previous) => {
    try { await save(next); }
    catch (e) { toast.show({ title: 'Couldn’t move it', tone: 'error' }); throw e; } // rolls back
  }}
>
  {columns.map((c) => (
    <Kanban.Column key={c.id} value={c.id} label={c.name} limit={c.limit} collapsible>
      <Kanban.Cards empty="No orders">
        {cards[c.id].map((id) => (
          <Kanban.Card key={id} value={id} label={byId[id].title} disabled={byId[id].locked}>
            <Card size="compact"><Card.Title>{byId[id].title}</Card.Title></Card>
          </Kanban.Card>
        ))}
      </Kanban.Cards>
    </Kanban.Column>
  ))}
</Kanban.Root>`}
        sources={[
          { id: 'react', label: 'React', code: reactSource },
          { id: 'css', label: 'CSS', code: cssSource },
          { id: 'swift', label: 'SwiftUI', code: swiftSource },
          { id: 'agent', label: 'Agent guide', code: agentSource },
        ]}
        rules={[
          { id: 'KB1', title: 'Show where it lands', body: 'The recess opens in the column under your hand and the others make room, so letting go never surprises.', origin: 'Ours' },
          { id: 'KB2', title: 'The held card rides above', body: 'A copy on a layer over the board follows the hand, so no column clips it; the card itself is the recess until it lands.', origin: 'dnd-kit' },
          { id: 'KB3', title: 'Every drag has keys', body: 'Space lifts, up and down move it in its column, left and right to the next, Space drops, Escape puts it back, and each step is said.', origin: 'WCAG 2.1.1' },
          { id: 'KB4', title: 'A limit says so in words', body: 'Over its limit a column shows the amber LED and “Over by 1”; the card still lands, because the board records what is true.', origin: 'Jira' },
          { id: 'KB5', title: 'A failed save goes back', body: 'onValueCommit gets the board before the move; a rejection glides every card back and the host says so in a toast.', origin: 'ReUI' },
        ]}
      />
    </ToastProvider>
  );
}
