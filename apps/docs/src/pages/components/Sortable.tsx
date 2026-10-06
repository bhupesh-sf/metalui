import * as React from 'react';
import { useDialKit } from 'dialkit';
import { Checkbox, Sortable, ToastProvider, useToast, type SortableOrientation } from '@unlocalhosted/metalui';
import { CalendarIcon, DocumentIcon, ImageIcon, LockIcon, NoteIcon, PinIcon, TaskIcon } from '@unlocalhosted/metalui/icons';
import { type SpringName } from '../../../../../packages/metalui/src/motion/springs.generated';
import { SPRING_NAMES, springVars } from '../../ui/springTuning';
import reactSource from '../../../../../packages/metalui/src/components/sortable/sortable.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import swiftSource from '../../../../../swift/Sources/MetalUI/Components/MetalSortable.swift?raw';
import agentSource from '../../../../../packages/metalui/src/components/sortable/sortable.agent.md?raw';
import { ComponentPage } from '../../ui/ComponentPage';

/* ─────────────────────────────────────────────────────────
 * SORTABLE PAGE
 *
 *   playground  today's plan in a sunk tray: drag a row, or focus it and use Space and the arrows;
 *               the first is pinned. The Sortable panel: a grip instead of the whole row, the save's
 *               wait and failure, the springs it lifts and lands on, and slow motion
 *   more        a grip for rows that hold controls; a row of places (horizontal); a grid of mixed
 *               sizes; a save that fails and glides back with a toast; groups that reorder with the
 *               rows inside them; a long list that scrolls while you drag
 * ───────────────────────────────────────────────────────── */

interface Thing { id: string; title: string; meta?: string; icon?: React.ReactNode; pinned?: boolean; wide?: boolean }

const GLYPH = 'size-14 flex-none text-ink2';
const PLAN: Thing[] = [
  { id: 'standup', title: 'Standup', meta: '9:00', icon: <PinIcon className={GLYPH} />, pinned: true },
  { id: 'brief', title: 'Write the brief for the Lisbon trip', meta: '1 h', icon: <DocumentIcon className={GLYPH} /> },
  { id: 'framer', title: 'Book the framer', meta: '15 m', icon: <TaskIcon className={GLYPH} /> },
  { id: 'review', title: 'Review the photo selects', meta: '45 m', icon: <ImageIcon className={GLYPH} /> },
  { id: 'call', title: 'Call the printer', meta: '10 m', icon: <CalendarIcon className={GLYPH} /> },
];

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const TRAY = 'w-full max-w-[420px] rounded-card recipe-well-field p-6';
const LINE = 'flex items-center gap-10 min-h-[40px] px-10 rounded-row';

function useOrder(things: Thing[]) {
  const [order, setOrder] = React.useState(() => things.map((t) => t.id));
  const byId = React.useMemo(() => new Map(things.map((t) => [t.id, t])), [things]);
  return { order, setOrder, byId };
}

/** A list of the day's plan, with its save. */
function Plan({ id, label, handle, pinned = true, save, things = PLAN }: { id: string; label: string; handle?: boolean; pinned?: boolean; save?: { ms: number; fails: () => boolean }; things?: Thing[] }) {
  const { order, setOrder, byId } = useOrder(things);
  const toast = useToast();
  const commit = React.useCallback(async (next: string[], previous: string[]) => {
    if (!save) return;
    await wait(save.ms);
    if (save.fails()) {
      toast.show({ title: 'Couldn’t save the order', sub: 'it’s back the way it was', tone: 'error', timeout: 4000 });
      throw new Error('The save did not reach the server.');
    }
    const moved = next.find((k, i) => k !== previous[i]);
    if (moved) toast.show({ title: 'Order saved', undo: () => setOrder(previous) });
  }, [save, toast, setOrder]);
  return (
    <div data-testid={id} className="flex w-full justify-center">
      <Sortable.Root aria-label={label} value={order} onValueChange={setOrder} onValueCommit={commit} handle={handle} className={TRAY}>
        {order.map((k) => {
          const t = byId.get(k)!;
          const fixed = pinned && t.pinned;
          return (
            <Sortable.Item key={k} value={k} label={t.title} disabled={fixed} className="rounded-row">
              <div className={LINE}>
                {handle && <Sortable.Handle />}
                {t.icon}
                <span className="type-ui flex-1 min-w-0 truncate text-ink">{t.title}</span>
                {fixed ? <LockIcon className={GLYPH} aria-label="Pinned" /> : <span className="type-meta tabular-nums text-ink3">{t.meta}</span>}
              </div>
            </Sortable.Item>
          );
        })}
      </Sortable.Root>
    </div>
  );
}

function Playground() {
  const d = useDialKit('Sortable', {
    handle: false,
    pinned: true,
    wait: [0, 0, 3000],
    fails: false,
    lift: { type: 'select', options: SPRING_NAMES, default: 'surface' },
    land: { type: 'select', options: SPRING_NAMES, default: 'object' },
    slow: [1, 1, 10],
  });
  const save = React.useMemo(() => (d.wait || d.fails ? { ms: d.wait, fails: () => d.fails } : undefined), [d.wait, d.fails]);
  const vars = { ...springVars('surface', d.lift as SpringName, d.slow), ...springVars('object', d.land as SpringName, d.slow), ...springVars('settle', 'settle', d.slow) } as React.CSSProperties;
  return <div className="flex w-full justify-center" style={vars}><Plan key={`${d.handle}`} id="sortable-play" label="Today" handle={d.handle} pinned={d.pinned} save={save} /></div>;
}

/** Rows that hold a checkbox lift by their grip, so the checkbox stays a checkbox. */
function WithControls() {
  const things = React.useMemo<Thing[]>(() => [
    { id: 'passport', title: 'Passport' },
    { id: 'charger', title: 'Camera charger' },
    { id: 'tickets', title: 'Train tickets' },
    { id: 'adapter', title: 'Plug adapter' },
  ], []);
  const { order, setOrder, byId } = useOrder(things);
  const [done, setDone] = React.useState<Set<string>>(() => new Set(['tickets']));
  return (
    <div data-testid="sortable-grip" className="flex w-full justify-center">
      <Sortable.Root aria-label="Packing list" value={order} onValueChange={setOrder} handle className={TRAY}>
        {order.map((k) => (
          <Sortable.Item key={k} value={k} label={byId.get(k)!.title} className="rounded-row">
            <div className={`${LINE} pl-2`}>
              <Sortable.Handle />
              <Checkbox size="row" aria-label={byId.get(k)!.title} checked={done.has(k)} onCheckedChange={(on) => setDone((s) => { const n = new Set(s); if (on) n.add(k); else n.delete(k); return n; })} />
              <span className="type-ui flex-1 text-ink">{byId.get(k)!.title}</span>
            </div>
          </Sortable.Item>
        ))}
      </Sortable.Root>
    </div>
  );
}

const TILE = 'grid place-items-center gap-4 rounded-plate recipe-surface-raise-sm px-14 py-12 type-ui text-ink';

/** A row of places, or a grid of tiles of two sizes. */
function Tiles({ id, label, orientation, things }: { id: string; label: string; orientation: SortableOrientation; things: Thing[] }) {
  const { order, setOrder, byId } = useOrder(things);
  return (
    <div data-testid={id} className="flex w-full justify-center">
      <Sortable.Root aria-label={label} value={order} onValueChange={setOrder} orientation={orientation} className={orientation === 'grid' ? 'w-full max-w-[560px]' : 'max-w-[560px] justify-center'}>
        {order.map((k) => {
          const t = byId.get(k)!;
          return (
            <Sortable.Item key={k} value={k} label={t.title} className={`rounded-plate${t.wide ? ' col-span-2' : ''}`}>
              <div className={`${TILE}${orientation === 'grid' ? ' h-[88px]' : ''}`}>{t.icon}<span>{t.title}</span></div>
            </Sortable.Item>
          );
        })}
      </Sortable.Root>
    </div>
  );
}

const PLACES: Thing[] = ['Lisbon', 'Porto', 'Sintra', 'Évora', 'Faro'].map((p) => ({ id: p.toLowerCase(), title: p }));
const BOARD: Thing[] = [
  { id: 'cover', title: 'Cover', wide: true, icon: <ImageIcon className={GLYPH} /> },
  { id: 'tram', title: 'Tram 28', icon: <ImageIcon className={GLYPH} /> },
  { id: 'tiles', title: 'Azulejos', icon: <ImageIcon className={GLYPH} /> },
  { id: 'notes', title: 'Notes', icon: <NoteIcon className={GLYPH} /> },
  { id: 'map', title: 'Map', wide: true, icon: <DocumentIcon className={GLYPH} /> },
  { id: 'bill', title: 'Receipt', icon: <DocumentIcon className={GLYPH} /> },
];

/** The first save fails: a toast says so and the list glides back. */
function FailsOnce() {
  const tries = React.useRef(0);
  const save = React.useMemo(() => ({ ms: 700, fails: () => ++tries.current === 1 }), []);
  return <Plan id="sortable-fails" label="Today, saved to a server" pinned={false} save={save} />;
}

/** Groups reorder by their grip; the rows inside a group reorder on their own. */
function Nested() {
  const groups = React.useMemo(() => [
    { id: 'morning', title: 'Morning', rows: ['Coffee at Fábrica', 'Tram 28 to Graça', 'Miradouro'] },
    { id: 'afternoon', title: 'Afternoon', rows: ['Lunch in Alfama', 'Tile museum'] },
    { id: 'evening', title: 'Evening', rows: ['Fado', 'Late dinner'] },
  ], []);
  const [order, setOrder] = React.useState(() => groups.map((g) => g.id));
  const [rows, setRows] = React.useState<Record<string, string[]>>(() => Object.fromEntries(groups.map((g) => [g.id, g.rows])));
  const byId = new Map(groups.map((g) => [g.id, g]));
  return (
    <div data-testid="sortable-nested" className="flex w-full justify-center">
      <Sortable.Root aria-label="Day in Lisbon" value={order} onValueChange={setOrder} handle className={`${TRAY} gap-8`}>
        {order.map((g) => (
          <Sortable.Item key={g} value={g} label={byId.get(g)!.title} className="rounded-plate">
            <div className="grid gap-2 rounded-plate p-4">
              <div className="flex items-center gap-6 px-2"><Sortable.Handle /><span className="type-label text-ink2">{byId.get(g)!.title}</span></div>
              <Sortable.Root aria-label={`${byId.get(g)!.title} plans`} value={rows[g]} onValueChange={(next) => setRows((r) => ({ ...r, [g]: next }))} className="gap-2">
                {rows[g].map((r) => (
                  <Sortable.Item key={r} value={r} className="rounded-row">
                    <div className={LINE}><span className="type-ui text-ink">{r}</span></div>
                  </Sortable.Item>
                ))}
              </Sortable.Root>
            </div>
          </Sortable.Item>
        ))}
      </Sortable.Root>
    </div>
  );
}

const LONG: Thing[] = Array.from({ length: 30 }, (_, i) => ({ id: `shot-${i + 1}`, title: `Shot ${String(i + 1).padStart(2, '0')}`, meta: `IMG_${4100 + i}`, icon: <ImageIcon className={GLYPH} /> }));

function Long() {
  const { order, setOrder, byId } = useOrder(LONG);
  return (
    <div data-testid="sortable-long" className="flex w-full justify-center">
      <div data-testid="sortable-long-scroller" className="h-[280px] w-full max-w-[420px] overflow-y-auto rounded-card recipe-well-field">
        <Sortable.Root aria-label="Contact sheet" value={order} onValueChange={setOrder} className="p-6">
          {order.map((k) => (
            <Sortable.Item key={k} value={k} label={byId.get(k)!.title} className="rounded-row">
              <div className={LINE}>{byId.get(k)!.icon}<span className="type-ui flex-1 text-ink">{byId.get(k)!.title}</span><span className="type-meta tabular-nums text-ink3">{byId.get(k)!.meta}</span></div>
            </Sortable.Item>
          ))}
        </Sortable.Root>
      </div>
    </div>
  );
}

export default function SortablePage() {
  return (
    <ToastProvider>
      <ComponentPage
        title="Sortable"
        lede="The drag that puts things in order. Pick one up and it rises onto a plate and follows your hand, the others step aside, a recess shows where it will land, and it lands. Keys do the same, step by step, out loud."
        play={{ lede: 'Drag a row, or Tab to one and press Space, move it with the arrows and press Space again. Standup is pinned. Escape puts it back. The Sortable panel adds a grip, makes the save slow or fail, and swaps the springs.', caption: 'lift on surface · the others glide (settle) · the recess · land on object · pinned · keys, said out loud', node: <Playground /> }}
        more={[
          { id: 'grip', title: 'By the grip', lede: 'Rows that hold a control lift only by their grip, so the checkbox still ticks. The grip is six engraved dimples; on touch it lifts at once, where a whole row waits for a still press so the page can scroll.', node: <WithControls /> },
          { id: 'horizontal', title: 'A row', lede: 'Left to right, for places, tabs and chips: the left and right arrows move it.', node: <Tiles id="sortable-row" label="Stops" orientation="horizontal" things={PLACES} /> },
          { id: 'grid', title: 'A grid of two sizes', lede: 'The item under your hand is the target, measured from where each tile really is, so a wide tile and a small one trade places without flicker. Up and down go to the nearest tile.', node: <Tiles id="sortable-grid" label="Board" orientation="grid" things={BOARD} /> },
          { id: 'rollback', title: 'When the save fails', lede: 'The first save here fails: the list waits while it is out, then everything glides back to the order before, and the toast says so. Try again and it holds.', node: <FailsOnce /> },
          { id: 'nested', title: 'Groups and their rows', lede: 'A sortable inside an item: the groups move by their grips, and the rows inside a group reorder on their own.', node: <Nested /> },
          { id: 'long', title: 'A long list', lede: 'Hold a row near the top or bottom edge and the list scrolls toward it, faster the closer you are.', node: <Long /> },
        ]}
        usage={`const [order, setOrder] = React.useState(tasks.map((t) => t.id));

<Sortable.Root
  aria-label="Today"
  value={order}
  onValueChange={setOrder}
  onValueCommit={async (next, previous) => {
    try { await save(next); }
    catch (e) { toast.show({ title: 'Couldn’t save the order', tone: 'error' }); throw e; } // rolls back
  }}
>
  {order.map((id) => (
    <Sortable.Item key={id} value={id} label={byId[id].title} disabled={byId[id].pinned}>
      <TaskRow task={byId[id]} />
    </Sortable.Item>
  ))}
</Sortable.Root>`}
        sources={[
          { id: 'react', label: 'React', code: reactSource },
          { id: 'css', label: 'CSS', code: cssSource },
          { id: 'swift', label: 'SwiftUI', code: swiftSource },
          { id: 'agent', label: 'Agent guide', code: agentSource },
        ]}
        rules={[
          { id: 'SO1', title: 'Show the order you would get', body: 'The others move while you hold it, so letting go never surprises. A recess marks the slot.', origin: 'Ours' },
          { id: 'SO2', title: 'Lift, then land', body: 'It rises on the surface spring and lands on the object spring; a cancel goes home on settle, with no overshoot, because nothing new happened.', origin: 'Ours' },
          { id: 'SO3', title: 'Every drag has keys', body: 'Space lifts, arrows move, Space drops, Escape puts it back, and each step is said.', origin: 'WCAG 2.5.7' },
          { id: 'SO4', title: 'A failed save goes back', body: 'onValueCommit gets the previous order; a rejection glides it back and the host says so in a toast.', origin: 'ReUI' },
          { id: 'SO5', title: 'Controls inside take a grip', body: 'A row with a checkbox, a field or a menu lifts by its grip, never by the whole row.', origin: 'Ours' },
        ]}
      />
    </ToastProvider>
  );
}
