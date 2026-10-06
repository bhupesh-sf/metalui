'use client';

import * as React from 'react';
import { useSortable, useSortableLists, type SortableLists, type SortableListsWords, type SortableWords } from '../sortable/sortable';
import { Badge } from '../badge/badge';
import { Collapsible } from '../collapsible/collapsible';

/* ─────────────────────────────────────────────────────────
 * KANBAN, a board of the person's cards in columns (a place)
 *
 *   rest      columns side by side on a board that scrolls sideways: each a sunk tray (the well's
 *             field) with its header (grip, name, count, limit, fold key) and its cards, the host's
 *   move      press a card and move (a still press on touch): a copy rises on the overlay and follows
 *             the hand; its slot is the recess, live in the column under the hand; the others glide,
 *             across columns too; near an edge the board or the column scrolls
 *   drop      the copy lands in the recess on the object spring; onValueCommit(next, previous): a
 *             rejection glides every card back (the host's toast says so)
 *   keys      Space lifts a card, up and down in its column, left and right to the next column that
 *             takes cards, Space drops, Escape puts it back, every step said with the column's name
 *   columns   with onColumnsChange, each header has Sortable's grip: drag it, or Space and left/right
 *   count     a compact Badge on the drum; with a limit, "max 3" in words, and over it the amber LED
 *             and "Over by 1" (soft: the card still lands)
 *   empty     the column keeps its height as a target, a quiet line in its middle
 *   collapsed the header alone (the Collapsible's key and motion); it takes no cards
 *   disabled  a card: it can't be lifted (it shakes once and says so); a column: nothing lifts from
 *             it and nothing lands in it
 * Reduce Motion: Sortable's (no scale, no travel; the hand is still followed) and the Collapsible's.
 * A place: the cards are the host's objects (a compact Card); the drag is Sortable's instrument.
 * Slots: Kanban.Root, Kanban.Column, Kanban.Cards, Kanban.Card.
 * ───────────────────────────────────────────────────────── */

export type KanbanValue = SortableLists;

export interface KanbanWords extends Partial<SortableListsWords> {
  /** The count's name for assistive tech: "3 cards". */
  count?: (n: number) => string;
  /** The limit, while at or under it: "max 3". */
  limit?: (limit: number) => string;
  /** Over the limit: "Over by 1". */
  over?: (by: number) => string;
  /** The columns' drag (their grips). */
  columns?: Partial<SortableWords>;
}

const said = {
  count: (n: number) => `${n} ${n === 1 ? 'card' : 'cards'}`,
  limit: (limit: number) => `max ${limit}`,
  over: (by: number) => `Over by ${by}`,
};

interface BoardContext {
  value: Readonly<Record<string, readonly string[]>>;
  cards: ReturnType<typeof useSortableLists<HTMLDivElement>>;
  columns: ReturnType<typeof useSortable<HTMLDivElement>>;
  reorder: boolean;
  words: typeof said;
}
const Board = React.createContext<BoardContext | null>(null);
const ColumnContext = React.createContext<{ id: string; label: string; disabled?: boolean } | null>(null);

const useBoard = (part: string) => {
  const b = React.useContext(Board);
  if (!b) throw new Error(`Kanban.${part} goes inside Kanban.Root.`);
  return b;
};
const useColumn = (part: string) => {
  const c = React.useContext(ColumnContext);
  if (!c) throw new Error(`Kanban.${part} goes inside Kanban.Column.`);
  return c;
};

const join = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(' ');
const ROOT = 'mu-kanban kanban';
const BOARD = 'mu-kanban-board kanban-board';
const COLUMN = 'mu-kanban-column sortable-item kanban-column recipe-well-field';
const HEADER = 'mu-kanban-header kanban-header';
const NAME = 'min-w-0 flex-1 truncate m-0 type-label text-ink2';
const LIMIT = 'flex-none type-meta tabular-nums text-ink3';
const BODY = 'mu-kanban-body kanban-body';
const CARDS = 'mu-kanban-cards kanban-cards';
const EMPTY = 'mu-kanban-empty kanban-empty type-meta text-ink3';
const CARD = 'mu-kanban-card sortable-item kanban-card';

export interface KanbanRootProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange'> {
  /** Each column's card keys in order, by column id. */
  value: Readonly<Record<string, readonly string[]>>;
  /** The cards while moving (live), and on cancel or rollback. */
  onValueChange: (next: KanbanValue) => void;
  /** Once per drop that changed anything. Return a promise to hold the board busy; reject to roll back to `previous`. */
  onValueCommit?: (next: KanbanValue, previous: KanbanValue) => void | Promise<unknown>;
  /** The columns' order (their ids). Their keys in `value` by default. */
  columns?: readonly string[];
  /** Give the columns grips and let them reorder. */
  onColumnsChange?: (next: string[]) => void;
  /** Once per column drop that changed the order; reject to roll back. */
  onColumnsCommit?: (next: string[], previous: string[]) => void | Promise<unknown>;
  /** Nothing lifts. */
  disabled?: boolean;
  words?: KanbanWords;
  /** The board's name ("Orders"). */
  'aria-label'?: string;
}

const still = () => {};

function Root({ value, onValueChange, onValueCommit, columns, onColumnsChange, onColumnsCommit, disabled, words, className, children, 'aria-label': label, ...rest }: KanbanRootProps) {
  const { count, limit, over, columns: columnWords, ...cardWords } = words ?? {};
  const cards = useSortableLists<HTMLDivElement>({ value, onValueChange, onValueCommit, disabled, words: cardWords });
  const order = React.useMemo(() => [...(columns ?? Object.keys(value))], [columns, value]);
  const reorder = !!onColumnsChange;
  const lanes = useSortable<HTMLDivElement>({
    value: order, onValueChange: onColumnsChange ?? still, onValueCommit: onColumnsCommit,
    orientation: 'horizontal', handle: true, disabled: disabled || !reorder, words: columnWords,
  });
  const spoken = React.useMemo(() => ({ count: count ?? said.count, limit: limit ?? said.limit, over: over ?? said.over }), [count, limit, over]);
  const ctx = React.useMemo<BoardContext>(() => ({ value, cards, columns: lanes, reorder, words: spoken }), [value, cards, lanes, reorder, spoken]);
  return (
    <Board.Provider value={ctx}>
      <div ref={cards.rootRef} {...rest} {...cards.rootProps} className={join(ROOT, className)}>
        <div ref={lanes.listRef} role="list" aria-label={label} {...lanes.listProps} className={BOARD}>
          {children}
          <div ref={lanes.slotRef} className="mu-sortable-slot sortable-slot" aria-hidden />
        </div>
        <div ref={cards.overlayRef} className="mu-sortable-overlay sortable-overlay" aria-hidden />
        <span id={cards.instructionsId} hidden>{cards.instructions}</span>
        <span id={lanes.instructionsId} hidden>{lanes.instructions}</span>
        <div ref={cards.announcerRef} className="sr-only" aria-live="assertive" aria-atomic />
        <div ref={lanes.announcerRef} className="sr-only" aria-live="assertive" aria-atomic />
      </div>
    </Board.Provider>
  );
}

export interface KanbanColumnProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Its id: a key of the board's `value`. */
  value: string;
  /** Its name: the header, the list's name and what is said ("In progress"). */
  label: string;
  /** Work-in-progress limit: over it the header says so (the amber LED and words). Soft: cards still land. */
  limit?: number;
  /** Nothing lifts from it and nothing lands in it. */
  disabled?: boolean;
  /** A key in the header folds it to the header alone. */
  collapsible?: boolean;
  collapsed?: boolean;
  defaultCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

/** A column: its header, then what the host puts in it (Kanban.Cards, and a Card.EmptySlot to add one). */
function Column({ value: id, label, limit, disabled, collapsible, collapsed: own, defaultCollapsed = false, onCollapsedChange, className, children, ...rest }: KanbanColumnProps) {
  const { value, columns, reorder, words } = useBoard('Column');
  const [mine, setMine] = React.useState(defaultCollapsed);
  const collapsed = collapsible ? own ?? mine : false;
  const n = value[id]?.length ?? 0;
  const by = limit != null ? n - limit : 0;
  const column = React.useMemo(() => ({ id, label, disabled }), [id, label, disabled]);
  return (
    <ColumnContext.Provider value={column}>
      <Collapsible.Root
        open={!collapsed}
        onOpenChange={(open) => {
          if (own === undefined) setMine(!open);
          onCollapsedChange?.(!open);
        }}
        role="listitem"
        aria-label={label}
        {...rest}
        {...columns.itemProps(id, { label })}
        data-collapsed={collapsed ? '' : undefined}
        data-over={by > 0 ? '' : undefined}
        className={join(COLUMN, className)}
      >
        <div className={HEADER}>
          {reorder && <button {...columns.handleProps(label)} className="mu-sortable-grip sortable-grip" />}
          <h3 className={NAME}>{label}</h3>
          <Badge size="compact" count={n} label={limit != null ? `${words.count(n)}, ${words.limit(limit)}` : words.count(n)} />
          {limit != null && (by > 0 ? <Badge size="compact" led="waiting">{words.over(by)}</Badge> : <span aria-hidden className={LIMIT}>{words.limit(limit)}</span>)}
          {collapsible && <Collapsible.Key label={collapsed ? `Show ${label}` : `Hide ${label}`} />}
        </div>
        <Collapsible.Panel className={BODY}>{children}</Collapsible.Panel>
      </Collapsible.Root>
    </ColumnContext.Provider>
  );
}

export interface KanbanCardsProps extends React.HTMLAttributes<HTMLDivElement> {
  /** What an empty column says. */
  empty?: React.ReactNode;
}

/** The column's cards: a list that scrolls on its own and takes cards from the others. */
function Cards({ empty = 'No cards', className, children, ...rest }: KanbanCardsProps) {
  const { cards } = useBoard('Cards');
  const { id, label, disabled } = useColumn('Cards');
  return (
    <div role="list" aria-label={label} {...rest} {...cards.listProps(id, { label, disabled })} className={join(CARDS, className)}>
      {children}
      <p aria-hidden className={EMPTY}>{empty}</p>
    </div>
  );
}

export interface KanbanCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Its key in the board's `value`. */
  value: string;
  /** Its name when spoken; its text otherwise. */
  label?: string;
  /** It can't be lifted. */
  disabled?: boolean;
}

/** The slot a card sits in: a list item with the drag. Put the host's card (a compact Card) inside. */
function Card({ value, label, disabled, className, children, ...rest }: KanbanCardProps) {
  const { cards } = useBoard('Card');
  const column = useColumn('Card');
  return (
    <div role="listitem" {...rest} {...cards.itemProps(value, { label, disabled: disabled || column.disabled })} className={join(CARD, className)}>
      {children}
    </div>
  );
}

export const Kanban = { Root, Column, Cards, Card };
export type KanbanProps = KanbanRootProps;
