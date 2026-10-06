import * as React from 'react';
import { useDialKit } from 'dialkit';
import { Tree, TreeGuides, TreeDisclosure, ToastProvider, useToast, type TreeItem, type TreeSelectionMode, type TreeSize } from '@unlocalhosted/metalui';
import { CalendarIcon, DocumentIcon, ImageIcon, PersonIcon, SettingsIcon } from '@unlocalhosted/metalui/icons';
import { type SpringName } from '../../../../../packages/metalui/src/motion/springs.generated';
import { SPRING_NAMES, springVars } from '../../ui/springTuning';
import reactSource from '../../../../../packages/metalui/src/components/tree/tree.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import swiftSource from '../../../../../swift/Sources/MetalUI/Components/MetalTree.swift?raw';
import agentSource from '../../../../../packages/metalui/src/components/tree/tree.agent.md?raw';
import { ComponentPage } from '../../ui/ComponentPage';

/* ─────────────────────────────────────────────────────────
 * TREE PAGE
 *
 *   playground  a project's files: arrows walk it, → and ← open and close, Enter opens a file (the
 *               rail), F2 renames, letters jump; Photos loads when opened. The Tree panel sets the
 *               size, the selection, how long a load takes and whether it fails, and the springs
 *   more        several at once (multiple), levels that load (one fails, then Try again lands),
 *               the pieces on their own (Tree.Guides and Tree.Disclosure in a table's rows)
 * ───────────────────────────────────────────────────────── */

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const doc = <DocumentIcon />;
const img = <ImageIcon />;

const PROJECT: TreeItem[] = [
  { id: 'brief', label: 'Brief', children: [
    { id: 'brief/goals', label: 'Goals.md', icon: doc },
    { id: 'brief/audience', label: 'Audience.md', icon: doc },
    { id: 'brief/budget', label: 'Budget.xlsx', icon: doc, disabled: true, trail: 'Locked' },
  ] },
  { id: 'design', label: 'Design', children: [
    { id: 'design/screens', label: 'Screens', children: [
      { id: 'design/screens/home', label: 'Home.fig', icon: img },
      { id: 'design/screens/search', label: 'Search.fig', icon: img },
      { id: 'design/screens/settings', label: 'Settings.fig', icon: img },
    ] },
    { id: 'design/tokens', label: 'Tokens.json', icon: doc },
    { id: 'design/archive', label: 'Archive', children: [] },
  ] },
  { id: 'photos', label: 'Photos', hasChildren: true, trail: '3' },
  { id: 'notes', label: 'Notes.md', icon: doc },
  { id: 'readme', label: 'Read me.md', icon: doc },
];

const PHOTOS: TreeItem[] = [
  { id: 'photos/lisbon', label: 'Lisbon.jpg', icon: img },
  { id: 'photos/porto', label: 'Porto.jpg', icon: img },
  { id: 'photos/sintra', label: 'Sintra.jpg', icon: img },
];

/** Puts `children` under `id`, or renames it, wherever it is. */
function update(items: TreeItem[], id: string, change: (item: TreeItem) => TreeItem): TreeItem[] {
  return items.map((item) => (item.id === id ? change(item) : item.children ? { ...item, children: update(item.children, id, change) } : item));
}

function siblingsOf(items: TreeItem[], id: string): TreeItem[] | null {
  if (items.some((i) => i.id === id)) return items;
  for (const i of items) { const found = i.children && siblingsOf(i.children, id); if (found) return found; }
  return null;
}

interface Load { ms: number; fails: () => boolean }

/** A project whose Photos level loads, with rename and a toast for each rename. */
function useProject(initial: TreeItem[], load: Load) {
  const [items, setItems] = React.useState(initial);
  const toast = useToast();
  const loadChildren = React.useCallback(async (item: TreeItem) => {
    await wait(load.ms);
    if (load.fails()) throw new Error('The folder did not load.');
    setItems((was) => update(was, item.id, (it) => ({ ...it, children: item.id === 'photos' ? PHOTOS : [] })));
  }, [load]);
  const onRename = React.useCallback((item: TreeItem, next: string) => {
    setItems((was) => update(was, item.id, (it) => ({ ...it, label: next })));
    toast.show({ title: `Renamed to ${next}`, undo: () => setItems((was) => update(was, item.id, (it) => ({ ...it, label: item.label }))) });
  }, [toast]);
  const validateName = React.useCallback((item: TreeItem, next: string) => {
    const taken = siblingsOf(items, item.id)?.some((s) => s.id !== item.id && s.label.toLowerCase() === next.toLowerCase());
    return taken ? `Something here is already called ${next}.` : null;
  }, [items]);
  return { items, loadChildren, onRename, validateName };
}

function Project({ id, size = 'regular', selectionMode = 'single', load, defaultExpanded = ['design'] }: { id: string; size?: TreeSize; selectionMode?: TreeSelectionMode; load: Load; defaultExpanded?: string[] }) {
  const project = useProject(PROJECT, load);
  const [opened, setOpened] = React.useState<string | null>('brief/goals');
  return (
    <div data-testid={id} className="w-full max-w-[360px]">
      <Tree
        label="Project files"
        items={project.items}
        size={size}
        selectionMode={selectionMode}
        defaultExpanded={defaultExpanded}
        defaultSelected={['design/tokens']}
        opened={opened}
        onAction={(item) => { if (!item.children && !item.hasChildren) setOpened(item.id); }}
        loadChildren={project.loadChildren}
        onRename={project.onRename}
        validateName={project.validateName}
        fileNames
      />
      <p className="mt-12 type-meta text-ink2" data-testid={`${id}-opened`}>Showing {opened ?? 'nothing'}</p>
    </div>
  );
}

function Playground() {
  const d = useDialKit('Tree', {
    size: { type: 'select', options: ['large', 'regular', 'compact'], default: 'regular' },
    selection: { type: 'select', options: ['single', 'multiple', 'none'], default: 'single' },
    load: [900, 0, 3000],
    fails: false,
    chevron: { type: 'select', options: SPRING_NAMES, default: 'part' },
    land: { type: 'select', options: SPRING_NAMES, default: 'object' },
    glide: { type: 'select', options: SPRING_NAMES, default: 'settle' },
    slow: [1, 1, 10],
  });
  const load = React.useMemo<Load>(() => ({ ms: d.load, fails: () => d.fails }), [d.load, d.fails]);
  const vars = {
    ...springVars('part', d.chevron as SpringName, d.slow),
    ...springVars('object', d.land as SpringName, d.slow),
    ...springVars('settle', d.glide as SpringName, d.slow),
    ...springVars('release', 'release', d.slow),
  } as React.CSSProperties;
  return (
    <div className="flex w-full justify-center" style={vars}>
      <Project key={`${d.size}-${d.selection}`} id="tree-play" size={d.size as TreeSize} selectionMode={d.selection as TreeSelectionMode} load={load} />
    </div>
  );
}

/** Archive fails the first time it opens; Try again lands. */
function Loading() {
  const tries = React.useRef(0);
  const [items, setItems] = React.useState<TreeItem[]>([
    { id: 'shared', label: 'Shared with me', hasChildren: true },
    { id: 'archive', label: 'Archive', hasChildren: true },
    { id: 'new', label: 'New folder', hasChildren: true },
  ]);
  const loadChildren = React.useCallback(async (item: TreeItem) => {
    await wait(item.id === 'new' ? 150 : 1200);
    if (item.id === 'archive' && ++tries.current === 1) throw new Error('offline');
    const children: TreeItem[] = item.id === 'shared'
      ? [{ id: 'shared/plan', label: 'Launch plan.md', icon: doc }, { id: 'shared/people', label: 'People', icon: <PersonIcon />, children: [{ id: 'shared/people/ana', label: 'Ana Duarte', icon: <PersonIcon /> }] }]
      : item.id === 'archive' ? [{ id: 'archive/2025', label: '2025', icon: <CalendarIcon />, hasChildren: true }] : [];
    setItems((was) => update(was, item.id, (it) => ({ ...it, children })));
  }, []);
  return (
    <div data-testid="tree-loading" className="w-full max-w-[360px]">
      <Tree label="Drive" items={items} loadChildren={loadChildren} selectionMode="none" />
    </div>
  );
}

const TEAM: TreeItem[] = [
  { id: 'eng', label: 'Engineering', icon: <SettingsIcon />, children: [
    { id: 'eng/web', label: 'Web', children: [{ id: 'eng/web/ana', label: 'Ana Duarte', icon: <PersonIcon /> }, { id: 'eng/web/kenji', label: 'Kenji Mori', icon: <PersonIcon /> }] },
    { id: 'eng/apps', label: 'Apps', children: [{ id: 'eng/apps/lea', label: 'Lea Brandt', icon: <PersonIcon /> }] },
  ] },
  { id: 'design', label: 'Design', icon: <ImageIcon />, children: [{ id: 'design/omar', label: 'Omar Haddad', icon: <PersonIcon /> }] },
];

function Several() {
  const [selected, setSelected] = React.useState<string[]>(['eng/web/ana']);
  return (
    <div data-testid="tree-multiple" className="w-full max-w-[360px]">
      <Tree label="Team" items={TEAM} selectionMode="multiple" size="compact" defaultExpanded={['eng', 'eng/web', 'eng/apps', 'design']} selected={selected} onSelectedChange={setSelected} />
      <p className="mt-12 type-meta text-ink2" data-testid="tree-multiple-count">{selected.length} selected</p>
    </div>
  );
}

/** Tree.Guides and Tree.Disclosure on their own: an account table's hierarchy rows. */
function Pieces() {
  const [open, setOpen] = React.useState(new Set(['assets']));
  const rows = [
    { id: 'assets', name: 'Assets', level: 1, amount: '€ 48,200', branch: true },
    { id: 'cash', name: 'Cash', level: 2, amount: '€ 12,900', parent: 'assets' },
    { id: 'bank', name: 'Bank', level: 2, amount: '€ 35,300', parent: 'assets' },
    { id: 'debts', name: 'Debts', level: 1, amount: '€ 9,450', branch: true },
    { id: 'card', name: 'Card', level: 2, amount: '€ 9,450', parent: 'debts' },
  ].filter((r) => !r.parent || open.has(r.parent));
  return (
    <div data-testid="tree-pieces" className="w-full max-w-[420px] type-ui text-ink">
        {rows.map((r) => (
          <div key={r.id} className="flex h-[32px] items-center justify-between">
              <span className="flex h-full items-center gap-[6px]">
                <TreeGuides level={r.level} size="regular">
                  <TreeDisclosure
                    branch={!!r.branch}
                    open={open.has(r.id)}
                    role={r.branch ? 'button' : undefined}
                    aria-label={r.branch ? `${open.has(r.id) ? 'Close' : 'Open'} ${r.name}` : undefined}
                    aria-expanded={r.branch ? open.has(r.id) : undefined}
                    tabIndex={r.branch ? 0 : undefined}
                    className="cursor-pointer"
                    onClick={() => setOpen((was) => { const next = new Set(was); if (!next.delete(r.id)) next.add(r.id); return next; })}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); (e.currentTarget as HTMLElement).click(); } }}
                  />
                </TreeGuides>
                {r.name}
              </span>
            <span className="tabular-nums text-ink2">{r.amount}</span>
          </div>
        ))}
    </div>
  );
}

export default function TreePage() {
  return (
    <ToastProvider>
      <ComponentPage
        title="Tree"
        lede="Nested rows that open and close in place, walked with the keyboard. Engraved guides show the levels and light for the branch you're in, the chevron turns a quarter on the part spring, children land and leave like the rows of any list, and a level that loads waits in the chevron's own slot."
        play={{ lede: 'Click a row, or Tab in and use the arrows: → opens, ← closes, Enter opens a file, F2 renames, letters jump. Photos loads when opened. The Tree panel sets the size, the selection, the load and the springs.', caption: 'single selection · the opened file\'s rail · a disabled row · an empty folder · a level that loads · F2 to rename', node: <Playground /> }}
        more={[
          { id: 'multiple', title: 'Several at once', lede: 'selectionMode="multiple": ⌘-click or Space toggles a row, Shift-click or Shift+↑↓ takes a range, ⌘A takes every row that shows. Compact size.', node: <Several /> },
          { id: 'loading', title: 'Levels that load', lede: 'Each folder loads when opened. A fast load shows nothing; a slower one turns the ring in the chevron\'s place after 400 ms. Archive fails the first time: the chevron becomes sync-error and the row says Try again; opening it again lands. New folder is empty.', node: <Loading /> },
          { id: 'pieces', title: 'The pieces, on their own', lede: 'Tree.Guides and Tree.Disclosure are exported for other rows at a level: here an account table\'s hierarchy rows. Table\'s tree rows and the Cascader\'s tree mode use the same two.', node: <Pieces /> },
        ]}
        usage={`<Tree
  label="Project files"
  items={items}               // { id, label, icon?, children?, hasChildren?, disabled?, trail? }
  selectionMode="single"      // none | single | multiple
  defaultExpanded={['design']}
  opened={openFile}           // the green rail
  onAction={(item) => open(item)}
  loadChildren={async (item) => {
    const children = await fetchFolder(item.id); // a rejection: sync-error, Try again
    setItems((was) => withChildren(was, item.id, children));
  }}
  onRename={(item, next) => rename(item.id, next)} // F2
/>`}
        sources={[
          { id: 'react', label: 'React', code: reactSource },
          { id: 'css', label: 'CSS', code: cssSource },
          { id: 'swift', label: 'SwiftUI', code: swiftSource },
          { id: 'agent', label: 'Agent guide', code: agentSource },
        ]}
        rules={[
          { id: 'TR1', title: 'One tab stop', body: 'Tab enters the tree on the selected row (or the first) and leaves it; the arrows walk the rows that show. → opens, then goes in; ← closes, then goes up.', origin: 'WAI-ARIA tree pattern' },
          { id: 'TR2', title: 'Focus is not a choice', body: 'Arrowing through a project never opens or selects what it passes. Space or a click selects; Enter acts.', origin: 'Ours' },
          { id: 'TR3', title: 'You can see the branch you\'re in', body: 'The grooves of the focused row\'s branch light from the rule to the lit ink; nothing else boxes it in.', origin: 'Ours' },
          { id: 'TR4', title: 'Wait where you pressed', body: 'A level that loads waits in the chevron\'s own slot, after the show delay; a failure says so on the row, in words, and opening it again retries.', origin: 'Ours' },
          { id: 'TR5', title: 'Rows land and leave', body: 'Opening, children land from one nest above while the rows below glide down; closing, they leave and the gap closes. Reduce Motion: all at once.', origin: 'Ours' },
        ]}
      />
    </ToastProvider>
  );
}
