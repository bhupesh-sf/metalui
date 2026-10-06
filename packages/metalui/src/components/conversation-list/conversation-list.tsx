'use client';

import * as React from 'react';
import { MoreIcon, PenIcon, TrashIcon } from '../../icons/components.generated';
import { leaveRows, useRowMotion } from '../../motion/rows';
import { IconButton } from '../icon-button/icon-button';
import { Menu, MenuItem, MenuSeparator } from '../menu/menu';
import { Popover } from '../popover/popover';
import { QuickEdit } from '../quick-edit/quick-edit';
import { Row } from '../row/row';
import { Skeleton } from '../skeleton/skeleton';

/* ─────────────────────────────────────────────────────────
 * CONVERSATION LIST, the person's past conversations, in a Sidebar's body
 *
 *   groups    by the day they were last spoken in: Pinned, Today, Yesterday, Previous 7 days,
 *             Previous 30 days, then by month; the sidebar's engraved section titles and gaps
 *   row       a list row: the title on one line (ellipsis); pressing it calls onSelect
 *   current   the open conversation: aria-current="page" on its row, so the Sidebar's lifted highlight
 *             sits under the whole row and glides to the next one chosen (settle spring)
 *   more      a ghost More key at the row's end, shown on hover, on focus, while its menu is open and
 *             on the current row (settle spring; always on touch): Rename, the host's actions, Delete
 *   rename    QuickEdit in a popover anchored to the row; a promise from onRename holds its key
 *   delete    the row leaves one nest down (release spring), then onDelete; the rows under it close up
 *             (settle); focus goes to the next row (or the one before)
 *   arrive    a row new to the list lands on the object spring (never on the first render)
 *   loading   skeleton lines in the rows' places
 *   empty     the host's node in place of the groups
 * Reduce Motion: rows appear, leave and close up at once; the More key appears at once.
 * Semantics: a group named by `aria-label`; each day a group named by its title, a list of rows; the
 * row's title is a button, the current one aria-current="page"; the More key is "More for <title>".
 * ───────────────────────────────────────────────────────── */

export interface Conversation {
  id: string;
  title: string;
  /** When it was last spoken in: it decides the group. */
  time: Date | string | number;
  /** Kept at the top, under Pinned. */
  pinned?: boolean;
}

export interface ConversationAction {
  label: string;
  /** A 14 glyph from the icon set. */
  icon?: React.ReactNode;
  onSelect: (id: string) => void;
}

export interface ConversationListProps {
  conversations: Conversation[];
  /** The open conversation's id. */
  current?: string | null;
  onSelect: (id: string) => void;
  /** Rename it; return a promise for an async save (reject to fail). Omit for no Rename. */
  onRename?: (id: string, title: string) => void | Promise<void>;
  /** Delete it, once its row has left; offer Undo in a toast. Omit for no Delete. */
  onDelete?: (id: string) => void;
  /** The host's rows in the More menu, between Rename and Delete (Pin, Archive). */
  actions?: ConversationAction[];
  /** The conversations are on their way: skeleton rows. */
  loading?: boolean;
  /** Shown when there are none (and not loading). */
  empty?: React.ReactNode;
  /** Groups are counted from here. */
  now?: Date;
  /** Names the list: "Chats". */
  'aria-label'?: string;
  className?: string;
}

const ROOT = 'mu-conversation-list flex flex-col gap-sidebar-gap';
const GROUP = 'mu-conversation-list-group flex flex-col gap-sidebar-section-gap';
const TITLE = 'mu-conversation-list-title px-sidebar-section-title-pad type-label engraved';
const LIST = 'mu-conversation-list-rows m-0 p-0 list-none flex flex-col gap-sidebar-section-gap';
const ROW = 'mu-conversation-list-row items-center has-[:focus-visible]:recipe-row-list-hover';
const HIT = 'mu-conversation-list-hit min-w-0 flex-1 truncate border-0 bg-transparent p-0 text-left type-row-list text-inherit cursor-pointer outline-none after:absolute after:inset-0 after:rounded-row-list-radius';
const MORE = 'mu-conversation-list-more relative z-1 -my-row-list-pad-y conversation-list-reveal';
const LOADING = 'mu-conversation-list-loading flex flex-col gap-sidebar-section-gap';

const DAY = 86_400_000;
const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** The group a conversation falls in, counted from `now`. */
function groupOf(c: Conversation, now: Date) {
  if (c.pinned) return 'Pinned';
  const t = new Date(c.time);
  const days = Math.round((startOf(now) - startOf(t)) / DAY);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return 'Previous 7 days';
  if (days < 30) return 'Previous 30 days';
  return t.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

/** Pinned first, then newest first, grouped in that order. */
function grouped(list: Conversation[], now: Date) {
  const sorted = [...list].sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || new Date(b.time).getTime() - new Date(a.time).getTime());
  const groups: { title: string; items: Conversation[] }[] = [];
  for (const c of sorted) {
    const title = groupOf(c, now);
    const last = groups[groups.length - 1];
    if (last?.title === title) last.items.push(c);
    else groups.push({ title, items: [c] });
  }
  return groups;
}

interface GroupProps {
  title: string;
  items: Conversation[];
  current?: string | null;
  more: (c: Conversation) => React.ReactNode;
  onSelect: (id: string) => void;
}

function Group({ title, items, current, more, onSelect }: GroupProps) {
  const id = React.useId();
  const list = React.useRef<HTMLUListElement>(null);
  useRowMotion(list, items.map((c) => c.id).join('|'), true);
  return (
    <div role="group" aria-labelledby={id} className={GROUP} data-row={`group:${title}`}>
      <span id={id} className={TITLE}>{title}</span>
      <ul ref={list} className={LIST}>
        {items.map((c) => {
          const on = c.id === current;
          return (
            <li key={c.id} data-row={c.id} data-current={on ? '' : undefined}>
              <Row variant="list" aria-current={on ? 'page' : undefined} className={ROW}>
                <button type="button" className={HIT} aria-current={on ? 'page' : undefined} title={c.title} onClick={() => onSelect(c.id)}>{c.title}</button>
                {more(c)}
              </Row>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** The person's past conversations, grouped by day, with Rename and Delete; skeletons while loading. */
export function ConversationList({ conversations, current, onSelect, onRename, onDelete, actions, loading, empty, now, className, ...aria }: ConversationListProps) {
  const root = React.useRef<HTMLDivElement>(null);
  const [renaming, setRenaming] = React.useState<string | null>(null);
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);
  const groups = React.useMemo(() => grouped(conversations, now ?? new Date()), [conversations, now]);
  useRowMotion(root, groups.map((g) => `${g.title}:${g.items.length}`).join('|'));

  const rowOf = (id: string) => root.current?.querySelector<HTMLElement>(`li[data-row="${CSS.escape(id)}"]`) ?? null;
  const hitOf = (li: Element | null | undefined) => li?.querySelector<HTMLButtonElement>('.mu-conversation-list-hit') ?? null;

  const remove = (id: string) => {
    const li = rowOf(id);
    const rows = [...(root.current?.querySelectorAll('li[data-row]') ?? [])];
    const at = li ? rows.indexOf(li) : -1;
    const after = rows[at + 1] ?? rows[at - 1];
    leaveRows([li], () => {
      onDelete?.(id);
      hitOf(after)?.focus();
    });
  };

  const more = (c: Conversation) => (onRename || onDelete || actions?.length) ? (
    <Row.Trail className={MORE}>
      <Menu align="end" trigger={<IconButton variant="ghost" label={`More for ${c.title}`} icon={<MoreIcon />} />}>
        {onRename && <MenuItem icon={<PenIcon />} onSelect={() => { setAnchor(rowOf(c.id)); setRenaming(c.id); }}>Rename…</MenuItem>}
        {actions?.map((a) => <MenuItem key={a.label} icon={a.icon} onSelect={() => a.onSelect(c.id)}>{a.label}</MenuItem>)}
        {onDelete && (onRename || actions?.length) ? <MenuSeparator /> : null}
        {onDelete && <MenuItem icon={<TrashIcon />} danger onSelect={() => remove(c.id)}>Delete</MenuItem>}
      </Menu>
    </Row.Trail>
  ) : null;

  const editing = renaming ? conversations.find((c) => c.id === renaming) : undefined;
  const close = () => {
    const back = renaming ? hitOf(rowOf(renaming)) : null;
    setRenaming(null);
    back?.focus();
  };

  const body = loading ? (
    <div role="status" aria-busy aria-label="Loading conversations" className={LOADING}>
      {Array.from({ length: loadingRows() }, (_, i) => (
        <span key={i} className="block py-row-list-pad-y px-row-list-pad-x"><Skeleton.Text lines={1} width={`${92 - ((i * 17) % 40)}%`} /></span>
      ))}
    </div>
  ) : conversations.length === 0 ? empty : (
    groups.map((g) => <Group key={g.title} title={g.title} items={g.items} current={current} more={more} onSelect={onSelect} />)
  );

  return (
    <div ref={root} role="group" aria-label={aria['aria-label'] ?? 'Conversations'} className={className ? `${ROOT} ${className}` : ROOT}>
      {body}
      {onRename && (
        <Popover open={!!editing} onOpenChange={(open) => { if (!open) close(); }}>
          <Popover.Content anchor={anchor} side="right" align="start">
            <Popover.Title>Rename conversation</Popover.Title>
            <Popover.Body>
              {editing && (
                <QuickEdit
                  key={editing.id}
                  label="Conversation title"
                  value={editing.title}
                  onCommit={(next) => onRename(editing.id, next)}
                  onClose={close}
                />
              )}
            </Popover.Body>
          </Popover.Content>
        </Popover>
      )}
    </div>
  );
}

/** How many skeleton rows stand in while loading: the recipe's loading.rows. */
function loadingRows() {
  if (typeof document === 'undefined') return 6;
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--mu-r-conversation-list-loading-rows')) || 6;
}
