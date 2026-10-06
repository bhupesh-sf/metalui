import * as React from 'react';
import { useDialKit } from 'dialkit';
import { Cascader, type CascaderItem, type CascaderSize } from '@unlocalhosted/metalui';
import { DocumentIcon, ImageIcon } from '@unlocalhosted/metalui/icons';
import { type SpringName } from '../../../../../packages/metalui/src/motion/springs.generated';
import { SPRING_NAMES, springVars } from '../../ui/springTuning';
import reactSource from '../../../../../packages/metalui/src/components/cascader/cascader.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import swiftSource from '../../../../../swift/Sources/MetalUI/Components/MetalCascader.swift?raw';
import agentSource from '../../../../../packages/metalui/src/components/cascader/cascader.agent.md?raw';
import { ComponentPage } from '../../ui/ComponentPage';

/* ─────────────────────────────────────────────────────────
 * CASCADER PAGE
 *
 *   playground  places: region › country › city; Asia loads when opened. The Cascader panel sets
 *               the size, the layout, leaves or any branch, several values with a max, the load and
 *               whether it fails, and the springs
 *   any         a shop's categories where a branch can be the value (pick="any")
 *   loading     a drive's folders, each loading when opened; Archive fails the first time
 *   drill       one level at a time with Back, in a narrow well
 *   several     where to ship: cascading boxes, the covering set, at most three
 * The plate is portalled, so tuned springs ride on the document while the panel is on the page.
 * ───────────────────────────────────────────────────────── */

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const city = (country: string, names: string[]): CascaderItem[] => names.map((n) => ({ id: `${country}/${n.toLowerCase().replace(/\W+/g, '-')}`, label: n }));

const PLACES: CascaderItem[] = [
  { id: 'europe', label: 'Europe', children: [
    { id: 'pt', label: 'Portugal', children: city('pt', ['Lisbon', 'Porto', 'Coimbra', 'Faro', 'Braga']) },
    { id: 'es', label: 'Spain', children: city('es', ['Madrid', 'Barcelona', 'Seville', 'Valencia']) },
    { id: 'fr', label: 'France', children: [
      ...city('fr', ['Paris', 'Lyon', 'Marseille', 'Bordeaux']),
      { id: 'fr/nice', label: 'Nice', disabled: true, trail: 'Closed' },
    ] },
    { id: 'it', label: 'Italy', children: city('it', ['Rome', 'Milan', 'Naples', 'Florence', 'Bologna', 'Turin', 'Venice', 'Genoa', 'Palermo', 'Verona']) },
    { id: 'is', label: 'Iceland', children: [] },
  ] },
  { id: 'americas', label: 'Americas', children: [
    { id: 'us', label: 'United States', children: [
      { id: 'us/tx', label: 'Texas', children: city('us/tx', ['Austin', 'Houston', 'Paris']) },
      { id: 'us/ny', label: 'New York', children: city('us/ny', ['New York City', 'Buffalo']) },
    ] },
    { id: 'br', label: 'Brazil', children: city('br', ['São Paulo', 'Rio de Janeiro', 'Lisbon']) },
  ] },
  { id: 'asia', label: 'Asia', hasChildren: true },
];

const ASIA: CascaderItem[] = [
  { id: 'jp', label: 'Japan', children: city('jp', ['Tokyo', 'Kyoto', 'Osaka']) },
  { id: 'kr', label: 'South Korea', children: city('kr', ['Seoul', 'Busan']) },
];

/** Puts `children` under `id`, wherever it is. */
function withChildren(items: CascaderItem[], id: string, children: CascaderItem[]): CascaderItem[] {
  return items.map((item) => (item.id === id ? { ...item, children } : item.children ? { ...item, children: withChildren(item.children, id, children) } : item));
}

interface Load { ms: number; fails: () => boolean }

function usePlaces(load: Load) {
  const [items, setItems] = React.useState(PLACES);
  const loadChildren = React.useCallback(async (item: CascaderItem) => {
    await wait(load.ms);
    if (load.fails()) throw new Error('The level did not load.');
    setItems((was) => withChildren(was, item.id, item.id === 'asia' ? ASIA : []));
  }, [load]);
  return { items, loadChildren };
}

function Playground() {
  const d = useDialKit('Cascader', {
    size: { type: 'select', options: ['regular', 'compact'], default: 'regular' },
    layout: { type: 'select', options: ['columns', 'drill'], default: 'columns' },
    pick: { type: 'select', options: ['leaf', 'any'], default: 'leaf' },
    several: false,
    max: [0, 0, 6],
    load: [900, 0, 3000],
    fails: false,
    arrive: { type: 'select', options: SPRING_NAMES, default: 'settle' },
    slow: [1, 1, 10],
  });
  const load = React.useMemo<Load>(() => ({ ms: d.load, fails: () => d.fails }), [d.load, d.fails]);
  const places = usePlaces(load);
  const [one, setOne] = React.useState<string | null>('pt/lisbon');
  const [path, setPath] = React.useState<CascaderItem[]>([]);
  const [many, setMany] = React.useState<string[]>(['pt', 'es/madrid']);
  // The plate is portalled: tuned springs ride on the document while the panel is here.
  React.useEffect(() => {
    const vars = springVars('settle', d.arrive as SpringName, d.slow);
    const el = document.documentElement;
    for (const [k, v] of Object.entries(vars)) el.style.setProperty(k, v);
    return () => { for (const k of Object.keys(vars)) el.style.removeProperty(k); };
  }, [d.arrive, d.slow]);
  const common = {
    items: places.items,
    loadChildren: places.loadChildren,
    size: d.size as CascaderSize,
    layout: d.layout as 'columns' | 'drill',
    'aria-label': 'Place',
    className: 'w-[280px]',
  };
  return (
    <div data-testid="cascader-play" className="grid min-h-[360px] content-start justify-center gap-12 pt-16">
      {d.several ? (
        <Cascader {...common} multiple value={many} onValueChange={setMany} max={d.max || undefined} placeholder="Choose places" />
      ) : (
        <Cascader {...common} pick={d.pick as 'leaf' | 'any'} value={one} onValueChange={(v, p) => { setOne(v); setPath(p); }} placeholder="Choose a place" />
      )}
      <span data-testid="cascader-play-value" className="type-doc-caption text-ink3">
        {d.several ? `${many.length} chosen: ${many.join(', ') || 'none'}` : one ? `${one}${path.length ? ` · ${path.length} levels deep` : ''}` : 'nothing chosen'}
      </span>
    </div>
  );
}

const CATEGORIES: CascaderItem[] = [
  { id: 'audio', label: 'Audio', trail: '1,204', children: [
    { id: 'audio/headphones', label: 'Headphones', trail: '412', children: [
      { id: 'audio/headphones/over', label: 'Over-ear', trail: '180' },
      { id: 'audio/headphones/in', label: 'In-ear', trail: '232' },
    ] },
    { id: 'audio/speakers', label: 'Speakers', trail: '530' },
    { id: 'audio/turntables', label: 'Turntables', trail: '262' },
  ] },
  { id: 'photo', label: 'Photo', trail: '880', children: [
    { id: 'photo/cameras', label: 'Cameras', trail: '310' },
    { id: 'photo/lenses', label: 'Lenses', trail: '570' },
  ] },
];

function AnyBranch() {
  const [value, setValue] = React.useState<string | null>('audio/headphones');
  return (
    <div data-testid="cascader-any" className="grid min-h-[300px] content-start justify-center gap-12 pt-16">
      <Cascader items={CATEGORIES} pick="any" value={value} onValueChange={setValue} aria-label="Category" placeholder="Any category" className="w-[280px]" />
      <span className="type-doc-caption text-ink3">{value ?? 'every category'}</span>
    </div>
  );
}

const doc = <DocumentIcon />;

function Loading() {
  const tries = React.useRef(0);
  const [items, setItems] = React.useState<CascaderItem[]>([
    { id: 'drive', label: 'My drive', hasChildren: true },
    { id: 'archive', label: 'Archive', hasChildren: true },
    { id: 'new', label: 'New folder', hasChildren: true },
  ]);
  const loadChildren = React.useCallback(async (item: CascaderItem) => {
    await wait(item.id === 'new' ? 150 : 1200);
    if (item.id === 'archive' && ++tries.current === 1) throw new Error('offline');
    const children: CascaderItem[] = item.id === 'drive'
      ? [{ id: 'drive/plans', label: 'Plans', hasChildren: true }, { id: 'drive/photos', label: 'Photos', icon: <ImageIcon />, children: [] }, { id: 'drive/notes', label: 'Notes.md', icon: doc }]
      : item.id === 'drive/plans' ? [{ id: 'drive/plans/launch', label: 'Launch.md', icon: doc }, { id: 'drive/plans/budget', label: 'Budget.xlsx', icon: doc }]
      : item.id === 'archive' ? [{ id: 'archive/2025', label: '2025', children: [{ id: 'archive/2025/report', label: 'Report.pdf', icon: doc }] }] : [];
    setItems((was) => withChildren(was, item.id, children));
  }, []);
  return (
    <div data-testid="cascader-loading" className="grid min-h-[300px] content-start justify-center pt-16">
      <Cascader items={items} loadChildren={loadChildren} pick="any" aria-label="Save to" placeholder="Choose a folder" className="w-[280px]" />
    </div>
  );
}

function Drill() {
  const [value, setValue] = React.useState<string | null>('us/tx/paris');
  return (
    <div data-testid="cascader-drill" className="grid min-h-[340px] content-start justify-center pt-16">
      <Cascader items={PLACES.filter((p) => p.id !== 'asia')} layout="drill" size="compact" value={value} onValueChange={setValue} aria-label="City" placeholder="Choose a city" className="w-[240px]" />
    </div>
  );
}

function Several() {
  const [value, setValue] = React.useState<string[]>(['pt', 'fr/paris']);
  return (
    <div data-testid="cascader-several" className="grid min-h-[340px] content-start justify-center gap-12 pt-16">
      <Cascader items={PLACES.filter((p) => p.id !== 'asia')} multiple max={3} value={value} onValueChange={setValue} aria-label="Ship to" placeholder="Ship to" className="w-[320px]" />
      <span data-testid="cascader-several-value" className="type-doc-caption text-ink3">{value.join(', ') || 'nowhere'}</span>
    </div>
  );
}

export default function CascaderPage() {
  return (
    <ComponentPage
      title="Cascader"
      lede="A value chosen through nested levels: a category, a place, a folder. Each level opens a column beside the last, the way through stays raised, and the search at the top finds a name at any depth. The well shows the path you chose."
      play={{ lede: 'Click the well, or Tab to it and press ↓. → opens a level, ← goes back, ↩ chooses; type to search across every level. Asia loads when opened. The Cascader panel sets the size, the layout, leaves or any branch, several values, the load and the spring.', caption: 'columns · the trail raised · a disabled city · an empty country · a level that loads · search across levels', node: <Playground /> }}
      more={[
        { id: 'any', title: 'Any branch', lede: 'pick="any": a branch can be the value. A click on Headphones chooses it and opens it, so you can still go deeper; ↩ chooses and closes; → only opens.', node: <AnyBranch /> },
        { id: 'loading', title: 'Levels that load', lede: 'Each folder loads when opened. A fast load shows nothing; a slower one turns the ring in the chevron\'s place, and the column arrives with the children. Archive fails the first time: its column is one row, Try again. New folder is empty.', node: <Loading /> },
        { id: 'drill', title: 'One level at a time', lede: 'layout="drill" for a well too narrow for columns: one level as wide as the well, Back and the level\'s name above it. Going in, the level arrives from the right; going back, from the left. The same keys. Compact size.', node: <Drill /> },
        { id: 'several', title: 'Several values', lede: 'multiple: a box leads each row. Ticking a country takes all of it, and it stays one value (Portugal), even for a level that was never loaded; a country shows the dash when some of it is chosen. Unticking one city of a whole country keeps the rest. At most three here.', node: <Several /> },
      ]}
      usage={`<Cascader
  aria-label="Place"
  items={places}            // Tree's items: { id, label, icon?, children?, hasChildren?, disabled?, trail? }
  value={place}
  onValueChange={(id, path) => setPlace(id)}
  pick="leaf"               // leaf | any
  layout="columns"          // columns | drill
  loadChildren={async (item) => {
    const children = await fetchLevel(item.id); // a rejection: Try again
    setPlaces((was) => withChildren(was, item.id, children));
  }}
/>

// Several values: a covering set (a branch chosen whole is its own id)
<Cascader aria-label="Ship to" items={places} multiple max={3} value={ids} onValueChange={setIds} />

// A tree that opens in place is Tree, not a cascader mode:
<Tree label="Folders" items={folders} selectionMode="single" />`}
      sources={[
        { id: 'react', label: 'React', code: reactSource },
        { id: 'css', label: 'CSS', code: cssSource },
        { id: 'swift', label: 'SwiftUI', code: swiftSource },
        { id: 'agent', label: 'Agent guide', code: agentSource },
      ]}
      rules={[
        { id: 'CA1', title: 'The way through stays raised', body: 'The row each column opened holds the raised plate, so the trail reads left to right; the one highlight moves only in the column the keys are in.', origin: 'Finder\'s column view' },
        { id: 'CA2', title: 'Focus never leaves the search', body: 'Letters search and the arrows walk the columns from the same place; the row they are on is named to assistive tech. Esc returns to the well.', origin: 'Ours' },
        { id: 'CA3', title: 'Highlighting never opens', body: 'Only → and a click open a level, so arrowing down a column never starts a load for every row it crosses.', origin: 'Ours' },
        { id: 'CA4', title: 'Wait where you pressed', body: 'A level that loads waits in its chevron\'s slot after the show delay; a failure is a column that says so and offers Try again.', origin: 'Tree' },
        { id: 'CA5', title: 'The end of the path tells values apart', body: 'The well keeps the last two levels and folds the start: Paris › Texas, not Americas › United States › …', origin: 'Ours' },
        { id: 'CA6', title: 'A tree in place is Tree', body: 'A hierarchy that opens where it stands is Tree with single selection; the cascader is for choosing one value from a plate.', origin: 'Ours' },
      ]}
    />
  );
}
