'use client';

import * as React from 'react';
import { Popover as BasePopover } from '@base-ui/react/popover';
import { Row } from '../row/row';
import { QuickEdit } from '../quick-edit/quick-edit';
import { popoverParts } from '../popover/popover';
import { InheritColorway, type ColorwayAnchor } from '../../theme/colorway';
import { useRowMotion, leaveRows } from '../../motion/rows';
import { Spinner } from '../spinner/spinner';
import { MorphPair } from '../../icons/MorphIcon';
import { chevronMorph, syncErrorMorph } from '../../icons/morph.generated';
import { useWait, type WaitWork, type WaitPhase } from '../../motion/wait';

/* ─────────────────────────────────────────────────────────
 * TREE, nested rows that open and close in place (the WAI-ARIA tree pattern; Base UI has none)
 *
 *   rest      one flat list of the visible rows (aria-level, -setsize, -posinset), each a Row:
 *             guides, the disclosure, the item's glyph, its name, a trail
 *   focus     one tab stop (roving tabindex); the focused row raises (the row's hover) with the
 *             focus ring; the grooves of the branch it is in light (opacity, settle)
 *   open        0 ms  the chevron turns a quarter down (part spring, may overshoot its stop)
 *                     the children land from one nest above (object spring), fading in;
 *                     the rows below glide down to their places (settle)
 *   close       0 ms  the chevron turns back; the children leave one nest down (release)
 *             +release  they are gone; the rows below glide up into the gap (settle)
 *   load      a branch with `hasChildren` and no `children` calls loadChildren on opening:
 *             quiet for 400 ms (a fast load shows nothing), then the ring in the chevron's slot and
 *             the rest of the row dimmed (useWait); the children land when the host passes them
 *   failed    the branch closes, the chevron morphs to sync-error (settle), "Couldn’t load · Try again" in the trail;
 *             opening it again retries
 *   select    none / single / multiple: the raised plate (Row selected), never following focus
 *   opened    the row whose content is showing: the green rail (Row opened)
 *   rename    F2: QuickEdit on a plate under the row; focus comes back to the row
 *   typing    letters within the type-ahead window go to the next row starting with them; the
 *             letters it heard are underlined until the window closes
 * Reduce Motion: rows jump, land and leave at once; the chevron and the grooves change at once.
 * ───────────────────────────────────────────────────────── */

/* ─────────────────────────────────────────────────────────
 * THE TREE'S OWN PIECES, for any row that sits at a level (Tree, Table's hierarchy rows, the
 * Cascader's tree mode)
 *
 *   TreeGuides      the indent: one column per ancestor, each an engraved groove at the centre of
 *                   that ancestor's chevron, the full height of the row (so the grooves join down a
 *                   list); `lit` lights one column's groove (opacity, settle): the branch you are in
 *   TreeDisclosure  the set's chevron in a column of the indent's width: pointing right when closed,
 *                   a quarter turn down on the part spring when `open`; while a level loads it gives
 *                   way to the spinner's ring (`phase` from useWait), and `failed` shows sync-error;
 *                   a leaf keeps the empty column so labels line up
 * Sizes set the indent and glyphs: large 44, regular 32, compact 28 (the field ladder).
 * Reduce Motion: the chevron and the lit groove change at once.
 * ───────────────────────────────────────────────────────── */

export type TreeSize = 'large' | 'regular' | 'compact';

export interface TreeGuidesProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** The row's level, from 1 (the top): a row at level 3 draws two grooves. */
  level: number;
  /** The level whose groove is lit (the branch holding the focus), if it is one of this row's. */
  lit?: number;
  /** Sets the indent and glyphs where no Tree does (a table cell). Inside a Tree the tree's size applies. */
  size?: TreeSize;
  /** What follows the grooves inside the indent: the disclosure. */
  children?: React.ReactNode;
}

const INDENT = 'mu-tree-indent tree-indent';

/** The indent of a row at `level`, with a groove per ancestor; the disclosure goes inside it. */
export function TreeGuides({ level, lit, size, className, children, ...props }: TreeGuidesProps) {
  return (
    <span data-size={size} className={[INDENT, size && 'tree-size', className].filter(Boolean).join(' ')} {...props}>
      {level > 1 && (
        <span className="mu-tree-guides" aria-hidden>
          {Array.from({ length: level - 1 }, (_, i) => <span key={i} data-lit={lit === i + 1 ? '' : undefined} />)}
        </span>
      )}
      {children}
    </span>
  );
}

export interface TreeDisclosureProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** A branch draws the chevron; a leaf keeps the empty column. Default true. */
  branch?: boolean;
  /** Open: the chevron points down. */
  open?: boolean;
  /** From useWait, while the level loads: the ring stands in for the chevron after the show delay. */
  phase?: WaitPhase;
  /** The last load failed: sync-error in place of the chevron (say it in words beside it). */
  failed?: boolean;
  /** What is loading, said when the ring shows: "Loading Photos". */
  label?: string;
}

const DISCLOSURE = 'mu-tree-disclosure tree-disclosure';
const DISCLOSURE_GLYPHS = { chevron: chevronMorph, 'sync-error': syncErrorMorph };

/** The chevron that opens a branch, in the indent's column; the wait and a failed load show in its place. */
export function TreeDisclosure({ branch = true, open, phase, failed, label, className, ...props }: TreeDisclosureProps) {
  const showing = phase === 'shown' || phase === 'done';
  const broken = failed && !showing;
  return (
    <span
      data-open={open ? '' : undefined}
      data-showing={showing ? '' : undefined}
      className={className ? `${DISCLOSURE} ${className}` : DISCLOSURE}
      {...props}
    >
      {/* One glyph that morphs chevron ↔ sync-error (strain 1.48). The column's quarter turn stays CSS (part spring);
          sync-error is planned a quarter turn back so it stands upright inside that turn. */}
      {branch && <MorphPair glyphs={DISCLOSURE_GLYPHS} name={broken ? 'sync-error' : 'chevron'} turn={broken && !open ? 90 : 0} className={broken ? 'mu-tree-chevron mu-tree-failed' : 'mu-tree-chevron'} />}
      {branch && phase && phase !== 'idle' && phase !== 'failed' && <Spinner size="small" phase={phase} label={label} />}
    </span>
  );
}

export interface TreeItem {
  /** Unique in the whole tree. */
  id: string;
  /** The row's name: what type-ahead matches and what is renamed. */
  label: string;
  /** The row's glyph (an Icon), or one for each state of a branch: `(open) => …`. */
  icon?: React.ReactNode | ((open: boolean) => React.ReactNode);
  /** Its children. Leave out with `hasChildren` for a level that loads when opened. */
  children?: TreeItem[];
  /** A branch whose children aren't loaded yet: opening it calls `loadChildren`. */
  hasChildren?: boolean;
  /** Dimmed; can't be selected, acted on or renamed; the keyboard still reaches it. */
  disabled?: boolean;
  /** Quiet detail at the row's end (a count, a size, a status). */
  trail?: React.ReactNode;
}

export type TreeSelectionMode = 'none' | 'single' | 'multiple';

export interface TreeWords {
  /** An opened branch with no children. */
  empty: string;
  /** A level that failed to load, in the row's trail. */
  failed: string;
  /** After `failed`. */
  retry: string;
  /** Said while a level loads ("Loading Photos"). */
  loading: (item: TreeItem) => string;
  /** The rename plate's title. */
  rename: string;
}

const defaultWords: TreeWords = {
  empty: 'Empty',
  failed: 'Couldn’t load',
  retry: 'Try again',
  loading: (item) => `Loading ${item.label}`,
  rename: 'Rename',
};

export interface TreeProps {
  items: TreeItem[];
  /** Names the tree for assistive tech ("Files"). */
  label: string;
  /** large 44 / regular 32 / compact 28. */
  size?: TreeSize;
  /** none: rows act; single: one raised row; multiple: ⌘-click, Shift ranges, ⌘A. Default single. */
  selectionMode?: TreeSelectionMode;
  selected?: string[];
  defaultSelected?: string[];
  onSelectedChange?: (ids: string[]) => void;
  expanded?: string[];
  defaultExpanded?: string[];
  onExpandedChange?: (ids: string[]) => void;
  /** The row whose content is showing (the green rail). */
  opened?: string | null;
  /** Enter, a double-click, or a click when selectionMode is none. Without it, they open and close a branch. */
  onAction?: (item: TreeItem) => void;
  /** Loads a level: add the item's `children` in your items, then resolve. A rejection shows Try again. */
  loadChildren?: (item: TreeItem) => Promise<void>;
  /** Turns F2 on: QuickEdit under the row. Return a promise for an async save. */
  onRename?: (item: TreeItem, next: string) => void | Promise<void>;
  /** Why a name is not accepted, or nothing. */
  validateName?: (item: TreeItem, next: string) => string | null | undefined;
  /** Rows are file names: a leaf's extension stays out of the rename selection. */
  fileNames?: boolean;
  words?: Partial<TreeWords>;
  className?: string;
}

type Flat =
  | { kind: 'item'; id: string; item: TreeItem; level: number; pos: number; size: number; parent: string | null; ancestors: string[]; branch: boolean; open: boolean }
  | { kind: 'empty'; id: string; level: number; parent: string; ancestors: string[] };

const isBranch = (item: TreeItem) => item.children != null || !!item.hasChildren;

function flatten(items: TreeItem[], expanded: Set<string>, out: Flat[] = [], parent: string | null = null, ancestors: string[] = []): Flat[] {
  items.forEach((item, i) => {
    const branch = isBranch(item);
    const open = branch && expanded.has(item.id);
    out.push({ kind: 'item', id: item.id, item, level: ancestors.length + 1, pos: i + 1, size: items.length, parent, ancestors, branch, open });
    if (!open || !item.children) return;
    const inside = [...ancestors, item.id];
    if (item.children.length) flatten(item.children, expanded, out, item.id, inside);
    else out.push({ kind: 'empty', id: `${item.id}\u0000empty`, level: inside.length + 1, parent: item.id, ancestors: inside });
  });
  return out;
}

/** Every loaded item's parent, so focus can find a visible ancestor of a row that was hidden. */
function parents(items: TreeItem[], out = new Map<string, string | null>(), parent: string | null = null) {
  for (const item of items) {
    out.set(item.id, parent);
    if (item.children) parents(item.children, out, item.id);
  }
  return out;
}

function useControlled<T>(value: T | undefined, initial: T, onChange?: (next: T) => void) {
  const [own, setOwn] = React.useState(initial);
  const current = value !== undefined ? value : own;
  const latest = React.useRef(current);
  latest.current = current;
  const set = React.useCallback((next: T) => {
    latest.current = next;
    if (value === undefined) setOwn(next);
    onChange?.(next);
  }, [value, onChange]);
  return [current, set, latest] as const;
}

const ms = (el: Element | null, name: string, fallback: number) =>
  (el && parseFloat(getComputedStyle(el).getPropertyValue(name))) || fallback;

const ROOT = 'mu-tree tree-size flex flex-col outline-none';
const ROW = 'mu-tree-row tree-row focus-visible:focus-ring-flush';
const TYPED = 'mu-tree-typed';

/** Nested rows that open and close in place, walked with the keyboard. */
function TreeRoot({
  items, label, size = 'regular', selectionMode = 'single', selected, defaultSelected = [], onSelectedChange,
  expanded, defaultExpanded = [], onExpandedChange, opened, onAction, loadChildren, onRename, validateName, fileNames,
  words: wordsProp, className,
}: TreeProps) {
  const words = { ...defaultWords, ...wordsProp };
  const [open, setOpen, openNow] = useControlled(expanded, defaultExpanded, onExpandedChange);
  const [picked, setPicked] = useControlled(selected, defaultSelected, onSelectedChange);
  const openSet = React.useMemo(() => new Set(open), [open]);
  const pickedSet = React.useMemo(() => new Set(picked), [picked]);
  const rows = React.useMemo(() => flatten(items, openSet), [items, openSet]);
  const nav = React.useMemo(() => rows.filter((r): r is Extract<Flat, { kind: 'item' }> => r.kind === 'item'), [rows]);
  const parentOf = React.useMemo(() => parents(items), [items]);

  const list = React.useRef<HTMLDivElement>(null);
  const els = React.useRef(new Map<string, HTMLElement>());
  const anchor = React.useRef<string | null>(null);
  const [loads, setLoads] = React.useState<Record<string, WaitWork>>({});
  const [active, setActive] = React.useState<string | null>(null);
  const [focused, setFocused] = React.useState(false);
  const [typed, setTyped] = React.useState<{ id: string; text: string } | null>(null);
  const typing = React.useRef({ text: '', at: 0 });
  const [renaming, setRenaming] = React.useState<string | null>(null);
  const uid = React.useId();

  useRowMotion(list, rows.map((r) => r.id).join('\u0001'), true);

  // The roving row: the active one if it shows, else its nearest showing ancestor, else the first selected, else the first.
  const visible = new Set(nav.map((r) => r.id));
  let current = active;
  while (current != null && !visible.has(current)) current = parentOf.get(current) ?? null;
  current ??= nav.find((r) => pickedSet.has(r.id))?.id ?? nav[0]?.id ?? null;
  const here = nav.find((r) => r.id === current);
  const lit = focused && here && here.level > 1 ? { level: here.level - 1, branch: here.parent } : null;

  const focusRow = (id: string) => {
    setActive(id);
    els.current.get(id)?.focus();
  };

  const setLoad = (id: string, work: WaitWork) => setLoads((was) => ({ ...was, [id]: work }));

  const expand = (row: Extract<Flat, { kind: 'item' }>) => {
    if (!row.branch || row.open) return;
    const { item } = row;
    if (item.children == null && loadChildren) {
      if (loads[item.id] === 'working') return;
      setLoad(item.id, 'working');
      setOpen([...openNow.current, item.id]);
      loadChildren(item).then(
        () => setLoad(item.id, 'idle'),
        () => {
          setLoad(item.id, 'failed');
          setOpen(openNow.current.filter((id) => id !== item.id));
        },
      );
      return;
    }
    setOpen([...openNow.current, item.id]);
  };

  const collapse = (row: Extract<Flat, { kind: 'item' }>) => {
    if (!row.open) return;
    const inside = rows.filter((r) => r.ancestors.includes(row.id));
    if (current && inside.some((r) => r.id === current)) focusRow(row.id);
    leaveRows(inside.map((r) => els.current.get(r.id) ?? null), () => setOpen(openNow.current.filter((id) => id !== row.id)));
  };

  const toggle = (row: Extract<Flat, { kind: 'item' }>) => (row.open ? collapse(row) : expand(row));

  const act = (row: Extract<Flat, { kind: 'item' }>) => {
    if (row.item.disabled) return;
    if (onAction) onAction(row.item);
    else if (row.branch) toggle(row);
  };

  const pickable = (row: Extract<Flat, { kind: 'item' }>) => !row.item.disabled;
  const selectOnly = (id: string) => { anchor.current = id; setPicked([id]); };
  const selectToggle = (id: string) => {
    anchor.current = id;
    setPicked(pickedSet.has(id) ? picked.filter((p) => p !== id) : [...picked, id]);
  };
  const selectRange = (id: string) => {
    const from = nav.findIndex((r) => r.id === (anchor.current ?? id));
    const to = nav.findIndex((r) => r.id === id);
    if (from < 0 || to < 0) return selectOnly(id);
    const [a, b] = from < to ? [from, to] : [to, from];
    setPicked(nav.slice(a, b + 1).filter(pickable).map((r) => r.id));
  };

  const choose = (row: Extract<Flat, { kind: 'item' }>, how: { toggle?: boolean; range?: boolean }) => {
    if (selectionMode === 'none' || !pickable(row)) return;
    if (selectionMode === 'single') return selectOnly(row.id);
    if (how.range) return selectRange(row.id);
    if (how.toggle) return selectToggle(row.id);
    selectOnly(row.id);
  };

  const onRowClick = (row: Extract<Flat, { kind: 'item' }>, e: React.MouseEvent) => {
    focusRow(row.id);
    if (selectionMode === 'none') return act(row);
    choose(row, { toggle: e.metaKey || e.ctrlKey, range: e.shiftKey });
  };

  const typeAhead = (key: string) => {
    const now = performance.now();
    const window = ms(list.current, '--mu-r-tree-self-typeahead', 500);
    const text = (now - typing.current.at < window ? typing.current.text : '') + key.toLocaleLowerCase();
    typing.current = { text, at: now };
    const at = nav.findIndex((r) => r.id === current);
    // A first letter looks past the current row, and so does one letter repeated (it cycles); a word may stay on it.
    const same = new Set(text).size === 1;
    const start = same ? at + 1 : Math.max(at, 0);
    const order = [...nav.slice(start), ...nav.slice(0, start)];
    const hit = order.find((r) => r.item.label.toLocaleLowerCase().startsWith(text))
      ?? (same ? order.find((r) => r.item.label.toLocaleLowerCase().startsWith(text[0])) : undefined);
    if (!hit) return;
    focusRow(hit.id);
    setTyped({ id: hit.id, text: hit.item.label.toLocaleLowerCase().startsWith(text) ? text : text[0] });
  };

  // The underline goes when the type-ahead window closes.
  React.useEffect(() => {
    if (!typed) return;
    const timer = window.setTimeout(() => setTyped(null), ms(list.current, '--mu-r-tree-self-typeahead', 500));
    return () => window.clearTimeout(timer);
  }, [typed]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.target !== e.currentTarget && !(e.target as HTMLElement).matches('[role=treeitem]')) return;
    const at = nav.findIndex((r) => r.id === current);
    const row = nav[at];
    if (!row) return;
    const multiple = selectionMode === 'multiple';
    const move = (i: number) => {
      const to = nav[Math.max(0, Math.min(nav.length - 1, i))];
      focusRow(to.id);
      if (e.shiftKey && multiple) selectRange(to.id);
    };
    const mod = e.metaKey || e.ctrlKey;
    const typingNow = performance.now() - typing.current.at < ms(list.current, '--mu-r-tree-self-typeahead', 500) && typing.current.text;
    switch (e.key) {
      case 'ArrowDown': move(at + 1); break;
      case 'ArrowUp': move(at - 1); break;
      case 'Home': move(0); break;
      case 'End': move(nav.length - 1); break;
      case 'ArrowRight':
        if (!row.branch) return;
        if (!row.open) expand(row);
        else if (nav[at + 1]?.parent === row.id) focusRow(nav[at + 1].id);
        break;
      case 'ArrowLeft':
        if (row.open) collapse(row);
        else if (row.parent) focusRow(row.parent);
        break;
      case 'Enter': act(row); break;
      case '*': nav.filter((r) => r.parent === row.parent && r.branch).forEach(expand); break;
      case 'F2':
        if (!onRename || row.item.disabled) return;
        setRenaming(row.id);
        break;
      case ' ':
        if (typingNow) { typeAhead(' '); break; }
        if (selectionMode === 'none') return;
        if (multiple && e.shiftKey) selectRange(row.id);
        else choose(row, { toggle: multiple });
        break;
      default:
        if (multiple && mod && e.key.toLowerCase() === 'a') { setPicked(nav.filter(pickable).map((r) => r.id)); break; }
        if (e.key.length !== 1 || mod || e.altKey) return;
        typeAhead(e.key);
    }
    e.preventDefault();
  };

  const renamingRow = renaming ? nav.find((r) => r.id === renaming) : undefined;
  const renameAnchor = React.useMemo<ColorwayAnchor>(() => ({ current: null, ref: () => {} }), []);
  renameAnchor.current = renaming ? els.current.get(renaming) ?? null : null;
  const finalFocus = React.useRef<HTMLElement | null>(null);
  finalFocus.current = renamingRow ? els.current.get(renamingRow.id) ?? null : finalFocus.current;

  return (
    <>
      <div
        ref={list}
        role="tree"
        aria-label={label}
        aria-multiselectable={selectionMode === 'multiple' || undefined}
        data-size={size}
        className={className ? `${ROOT} ${className}` : ROOT}
        onKeyDown={onKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false); }}
      >
        {rows.map((row, i) => {
          const litLevel = lit && row.ancestors[lit.level - 1] === lit.branch ? lit.level : undefined;
          const ref = (el: HTMLElement | null) => { if (el) els.current.set(row.id, el); else els.current.delete(row.id); };
          if (row.kind === 'empty') {
            return (
              <Row.Root key={row.id} ref={ref} data-row={row.id} data-empty="" role="none" aria-hidden variant="list" className={`${ROW} pointer-events-none`}>
                <TreeGuides level={row.level} lit={litLevel}><TreeDisclosure branch={false} /></TreeGuides>
                <Row.Text className="text-ink3">{words.empty}</Row.Text>
              </Row.Root>
            );
          }
          return (
            <TreeRow
              key={row.id}
              rowRef={ref}
              id={`${uid}-${i}`}
              row={row}
              lit={litLevel}
              tabbable={row.id === current}
              selectable={selectionMode !== 'none'}
              selected={pickedSet.has(row.id)}
              opened={opened === row.id}
              work={loads[row.id] ?? 'idle'}
              typed={typed?.id === row.id ? typed.text.length : 0}
              words={words}
              onClick={(e) => onRowClick(row, e)}
              onDoubleClick={() => { if (selectionMode !== 'none') act(row); }}
              onDisclosure={() => { focusRow(row.id); toggle(row); }}
            />
          );
        })}
      </div>
      {renamingRow && onRename && (
        <BasePopover.Root open onOpenChange={(next) => { if (!next) setRenaming(null); }}>
          <BasePopover.Portal>
            <InheritColorway anchor={renameAnchor} />
            <BasePopover.Positioner className="mu-popover-positioner z-menu-z" anchor={els.current.get(renamingRow.id)} side="bottom" align="start" sideOffset={ms(list.current, '--mu-r-popover-self-offset', 6)} collisionPadding={8}>
              <BasePopover.Popup className={popoverParts.PLATE} finalFocus={finalFocus}>
                <BasePopover.Title className={popoverParts.TITLE}>{words.rename}</BasePopover.Title>
                <div className="mu-popover-body mt-popover-body-gap">
                  <QuickEdit
                    label={words.rename}
                    value={renamingRow.item.label}
                    extension={fileNames && !renamingRow.branch}
                    validate={validateName ? (next) => validateName(renamingRow.item, next) : undefined}
                    onCommit={(next) => onRename(renamingRow.item, next)}
                    onClose={() => setRenaming(null)}
                  />
                </div>
              </BasePopover.Popup>
            </BasePopover.Positioner>
          </BasePopover.Portal>
        </BasePopover.Root>
      )}
    </>
  );
}

interface TreeRowProps {
  rowRef: (el: HTMLElement | null) => void;
  id: string;
  row: Extract<Flat, { kind: 'item' }>;
  lit?: number;
  tabbable: boolean;
  selectable: boolean;
  selected: boolean;
  opened: boolean;
  work: WaitWork;
  typed: number;
  words: TreeWords;
  onClick: (e: React.MouseEvent) => void;
  onDoubleClick: () => void;
  onDisclosure: () => void;
}

/** One row: its wait has its own clock (useWait), so each loading level keeps its own time. */
function TreeRow({ rowRef, id, row, lit, tabbable, selectable, selected, opened, work, typed, words, onClick, onDoubleClick, onDisclosure }: TreeRowProps) {
  const { item } = row;
  const wait = useWait(work);
  const failed = work === 'failed';
  const icon = typeof item.icon === 'function' ? item.icon(row.open) : item.icon;
  const name = typed ? <><span className={TYPED}>{item.label.slice(0, typed)}</span>{item.label.slice(typed)}</> : item.label;
  return (
    <Row.Root
      ref={rowRef}
      data-row={row.id}
      role="treeitem"
      variant="list"
      tabIndex={tabbable ? 0 : -1}
      aria-level={row.level}
      aria-setsize={row.size}
      aria-posinset={row.pos}
      aria-expanded={row.branch ? row.open : undefined}
      aria-selected={selectable ? selected : undefined}
      aria-disabled={item.disabled || undefined}
      aria-labelledby={`${id}-name`}
      aria-describedby={failed ? `${id}-trail` : undefined}
      selected={selectable && selected}
      opened={opened}
      waiting={wait.busy}
      className={ROW}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      <TreeGuides level={row.level} lit={lit}>
        <TreeDisclosure
          branch={row.branch}
          open={row.open}
          phase={wait.phase}
          failed={failed}
          label={words.loading(item)}
          onClick={(e) => { e.stopPropagation(); onDisclosure(); }}
          onDoubleClick={(e) => e.stopPropagation()}
        />
      </TreeGuides>
      {icon && <Row.Lead aria-hidden>{icon}</Row.Lead>}
      <Row.Text id={`${id}-name`}>{name}</Row.Text>
      {failed
        ? <Row.Trail id={`${id}-trail`}>{words.failed} · {words.retry}</Row.Trail>
        : item.trail != null && <Row.Trail>{item.trail}</Row.Trail>}
    </Row.Root>
  );
}

/** The tree, with its pieces for other rows at a level (Table's hierarchy, the Cascader): Tree.Guides, Tree.Disclosure. */
export const Tree = /* @__PURE__ */ Object.assign(TreeRoot, { Root: TreeRoot, Guides: TreeGuides, Disclosure: TreeDisclosure });
