import * as React from 'react';
import { useDialKit } from 'dialkit';
import { Avatar, Combobox, type ComboboxGroup, type ComboboxItem } from '@unlocalhosted/metalui';
import {
  SettingsIcon, calendarGlyph, calendarMorph, documentGlyph, documentMorph, imageGlyph, imageMorph, linkGlyph, linkMorph,
  noteGlyph, noteMorph, taskGlyph, taskMorph,
} from '@unlocalhosted/metalui/icons';
import { type SpringName } from '../../../../../packages/metalui/src/motion/springs.generated';
import { SPRING_NAMES, springVars } from '../../ui/springTuning';
import reactSource from '../../../../../packages/metalui/src/components/combobox/combobox.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import swiftSource from '../../../../../swift/Sources/MetalUI/Components/MetalCombobox.swift?raw';
import agentSource from '../../../../../packages/metalui/src/components/combobox/combobox.agent.md?raw';
import { ComponentPage } from '../../ui/ComponentPage';

/* ─────────────────────────────────────────────────────────
 * COMBOBOX PAGE
 *
 *   playground  cities: type, move, choose, clear; compact, invalid, disabled
 *   detail      people with avatars and addresses; block kinds whose glyph shows in the well
 *   groups      every time zone by region: labels stay at the top; recent picks before typing
 *   search      a search you run yourself: loading, failed, nothing matched (DialKit: latency, fail)
 *   several     labels as chips, made on the spot, with a command at the end
 *   button      a picker in a row of keys: Assign
 *   fit         the spring the plate settles on (DialKit)
 * Springs are the system's classes; slow stretches every duration. The plate is portalled,
 * so tuned values ride on the document while a tuner is on the page.
 * ───────────────────────────────────────────────────────── */

const CITIES = ['Amsterdam', 'Athens', 'Barcelona', 'Berlin', 'Bologna', 'Bordeaux', 'Bruges', 'Budapest', 'Copenhagen', 'Dublin', 'Edinburgh', 'Florence', 'Geneva', 'Lisbon', 'Ljubljana', 'London', 'Lyon', 'Madrid', 'Marseille', 'Milan', 'Munich', 'Naples', 'Oslo', 'Paris', 'Porto', 'Prague', 'Rome', 'Seville', 'Stockholm', 'Valencia', 'Vienna', 'Zurich'];

const PEOPLE: ComboboxItem[] = [
  ['ana', 'Ana Duarte', 'ana@studio.pt'],
  ['ana-m', 'Ana Martins', 'ana.martins@field.io'],
  ['bea', 'Beatriz Lopes', 'bea@studio.pt'],
  ['jonas', 'Jonas Weber', 'jonas@north.de'],
  ['maria', 'Maria Costa', 'maria@studio.pt'],
  ['maria-s', 'Maria Silva', 'msilva@harbour.co'],
  ['tomas', 'Tomás Reis', 'tomas@studio.pt'],
  ['yuki', 'Yuki Tanaka', 'yuki@kumo.jp'],
].map(([value, label, description]) => ({ value, label, description, icon: <Avatar name={label} size="small" /> }));

const KINDS: ComboboxItem[] = [
  { value: 'note', label: 'Note', icon: { glyph: noteGlyph, morph: noteMorph }, description: 'Text you write' },
  { value: 'task', label: 'Task', icon: { glyph: taskGlyph, morph: taskMorph }, description: 'Something to do, with a due date' },
  { value: 'event', label: 'Event', icon: { glyph: calendarGlyph, morph: calendarMorph }, description: 'A time on the calendar' },
  { value: 'image', label: 'Image', icon: { glyph: imageGlyph, morph: imageMorph }, description: 'A photo or a drawing' },
  { value: 'link', label: 'Link', icon: { glyph: linkGlyph, morph: linkMorph }, description: 'A page on the web' },
  { value: 'document', label: 'Document', icon: { glyph: documentGlyph, morph: documentMorph }, description: 'A file: PDF, sheet, deck' },
];

/** Every time zone this browser knows, grouped by region: a long list. */
function timeZones(): ComboboxGroup[] {
  const zones = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : ['Europe/Lisbon', 'Europe/London', 'America/New_York', 'Asia/Tokyo'];
  const regions = new Map<string, ComboboxItem[]>();
  for (const zone of zones) {
    const [region, ...rest] = zone.split('/');
    if (!rest.length) continue;
    const list = regions.get(region) ?? [];
    list.push({ value: zone, label: rest.join(' · ').replace(/_/g, ' ') });
    regions.set(region, list);
  }
  return [...regions].map(([label, items]) => ({ label, items }));
}

const LABELS = ['Bug', 'Design', 'Docs', 'Research', 'Urgent', 'Writing'];

/* ─────────────────────────────── playground ─────────────────────────────── */

function Playground({ onCity }: { onCity: (city: string | null) => void }) {
  const [city, setCity] = React.useState<string | null>(null);
  return (
    <div className="flex min-h-[300px] items-start justify-center pt-16">
      <div className="grid gap-12">
        <Combobox items={CITIES} value={city} onValueChange={(c) => { setCity(c); onCity(c); }} placeholder="Choose a city" aria-label="City" />
        <Combobox items={CITIES} size="compact" placeholder="Compact" aria-label="Compact city" />
        <Combobox items={CITIES} invalid defaultValue="Atlantis" placeholder="Invalid" aria-label="Invalid city" />
        <Combobox items={CITIES} disabled placeholder="Disabled" aria-label="Disabled city" />
      </div>
    </div>
  );
}

/* ─────────────────────────────── with detail ─────────────────────────────── */

function Detail() {
  return (
    <div data-testid="combobox-detail" className="flex min-h-[340px] flex-wrap items-start justify-center gap-16 pt-16">
      <Combobox items={PEOPLE} placeholder="Find a person" aria-label="Person" />
      <Combobox items={KINDS} placeholder="Kind of block" aria-label="Kind" />
    </div>
  );
}

/* ─────────────────────────────── groups ─────────────────────────────── */

function Groups() {
  const zones = React.useMemo(timeZones, []);
  const [recent, setRecent] = React.useState(['Europe/Lisbon', 'America/New_York', 'Asia/Tokyo']);
  return (
    <div data-testid="combobox-groups" className="flex min-h-[340px] justify-center pt-16">
      <Combobox
        items={zones}
        recent={recent}
        onValueChange={(z) => { if (z) setRecent((r) => [z, ...r.filter((x) => x !== z)].slice(0, 3)); }}
        placeholder="Time zone"
        aria-label="Time zone"
      />
    </div>
  );
}

/* ─────────────────────────────── a search you run ─────────────────────────────── */

function Search() {
  const d = useDialKit('Combobox search', { latency: [900, 0, 4000], fail: false });
  const [query, setQuery] = React.useState('');
  const [found, setFound] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const [tries, setTries] = React.useState(0);
  React.useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!q) { setFound([]); setLoading(false); setFailed(false); return; }
    setLoading(true);
    const timer = window.setTimeout(() => {
      setLoading(false);
      setFailed(d.fail);
      if (!d.fail) setFound(CITIES.filter((c) => c.toLowerCase().includes(q)));
    }, d.latency);
    return () => window.clearTimeout(timer);
  }, [query, tries, d.fail, d.latency]);
  return (
    <div data-testid="combobox-search" className="flex min-h-[300px] justify-center pt-16">
      <Combobox
        items={found}
        filter={false}
        onQueryChange={setQuery}
        loading={loading}
        failed={failed}
        onRetry={() => setTries((n) => n + 1)}
        placeholder="Search cities"
        aria-label="Search cities"
      />
    </div>
  );
}

/* ─────────────────────────────── several values ─────────────────────────────── */

function Several() {
  const [labels, setLabels] = React.useState(LABELS);
  const [chosen, setChosen] = React.useState(['Design', 'Urgent']);
  const [managed, setManaged] = React.useState(0);
  return (
    <div data-testid="combobox-several" className="grid min-h-[320px] content-start justify-center gap-8 pt-16">
      <Combobox
        multiple
        items={labels}
        value={chosen}
        onValueChange={setChosen}
        onCreate={(label) => { setLabels((l) => [...l, label]); return label; }}
        actions={[{ id: 'manage', label: 'Manage labels…', icon: <SettingsIcon />, onAction: () => setManaged((n) => n + 1) }]}
        placeholder="Add labels"
        aria-label="Labels"
        className="w-[320px]"
      />
      <span className="type-doc-caption text-ink3">{chosen.length} labels{managed ? ` · manage opened ${managed}×` : ''}</span>
    </div>
  );
}

/* ─────────────────────────────── from a button ─────────────────────────────── */

function FromButton() {
  const [who, setWho] = React.useState<string | null>(null);
  return (
    <div data-testid="combobox-button" className="flex min-h-[340px] items-start justify-center gap-8 pt-16">
      <Combobox trigger="button" items={PEOPLE} value={who} onValueChange={setWho} placeholder="Assign" aria-label="Assign" />
      <Combobox trigger="button" size="compact" items={KINDS} defaultValue="task" placeholder="Kind" aria-label="Kind of block" />
    </div>
  );
}

/* ─────────────────────────────── fit ─────────────────────────────── */

function FitTuner() {
  const d = useDialKit('Combobox fit', {
    fit: { type: 'select', options: SPRING_NAMES, default: 'settle' },
    rows: [7, 3, 12],
    slow: [1, 1, 10],
  });
  const vars: Record<string, string> = { ...springVars('settle', d.fit as SpringName, d.slow), '--mu-r-combobox-self-max-rows': String(Math.round(d.rows)) };
  React.useEffect(() => {
    const el = document.documentElement;
    for (const [k, v] of Object.entries(vars)) el.style.setProperty(k, v);
    return () => { for (const k of Object.keys(vars)) el.style.removeProperty(k); };
  });
  return <div data-testid="combobox-fit-tuner" className="flex justify-center"><Combobox items={CITIES} placeholder="Tuned city" aria-label="Tuned city" /></div>;
}

export default function ComboboxPage() {
  const [city, setCity] = React.useState<string | null>(null);
  return (
    <ComponentPage
      title="Combobox"
      lede="Type to find one of many, or several. Rows filter as you type, never behind your fingers, while the plate settles to the new count; the typed letters stand out in each row, and the highlight glides from row to row."
      play={{ lede: 'Type "b", then "bo", then "x". Use ↑ ↓ and ↩, or the chevron key.', caption: city ? `trip to ${city}` : '32 cities · compact · invalid · disabled', node: <Playground onCity={setCity} /> }}
      capture="combobox"
      more={[
        { id: 'detail', title: 'Items with detail', lede: 'A glyph or an avatar and a second line tell similar items apart: two Anas, two Marias. A pick with a glyph shows it in the well, morphing from the search glyph.', node: <Detail /> },
        { id: 'groups', title: 'Groups and recent', lede: 'Every time zone, by region. The engraved labels stay at the top while their rows scroll; past a hundred matches a quiet line says how many more. Before you type, your recent picks come first.', node: <Groups /> },
        { id: 'search', title: 'A search you run', lede: 'Three empties, told apart. Loading: the ring takes the clear key’s place and the rows dim. Failed: Try again. Nothing matched: the query, said back. The Combobox search panel sets the latency and makes the next search fail.', node: <Search /> },
        { id: 'several', title: 'Several values', lede: 'Picks become chips; the query and the plate stay. Backspace on an empty query takes the last chip, a second Backspace removes it. A label that doesn’t exist yet is one row away, set apart by a hairline, and so is the command after it.', node: <Several /> },
        { id: 'button', title: 'From a button', lede: 'For a picker in a toolbar or a row (Assign): a key opens the plate and the search sits inside it.', node: <FromButton /> },
        { id: 'fit', title: 'Tune the fit', lede: 'The Combobox fit panel swaps the spring the plate settles on as matches change, sets how many rows show before it scrolls, and stretches time.', node: <FitTuner /> },
      ]}
      usage={`<Combobox items={cities} value={city} onValueChange={setCity} placeholder="Choose a city" aria-label="City" />`}
      sources={[
        { id: 'react', label: 'React', code: reactSource },
        { id: 'css', label: 'CSS', code: cssSource },
        { id: 'swift', label: 'SwiftUI', code: swiftSource },
        { id: 'agent', label: 'Agent guide', code: agentSource },
      ]}
      rules={[
        { id: 'CB1', title: 'Rows never lag the fingers', body: 'Filtering is instant; only the plate\'s size moves, on the settle spring.', origin: 'Ours' },
        { id: 'CB2', title: 'One highlight', body: 'Pointer and keys share one highlight that glides between rows.', origin: 'The menu' },
        { id: 'CB3', title: 'Tell the empties apart', body: 'Loading keeps the rows and dims them; a failure offers Try again; nothing matched says the query back. Never an empty plate.', origin: 'Ours' },
        { id: 'CB4', title: 'Show why it matched', body: 'The typed letters stand in ink, the rest of the row in ink2.', origin: 'Ours' },
        { id: 'CB5', title: 'Made and run apart from found', body: 'Create and commands come last, behind a hairline, each with its glyph, so they can’t be mistaken for an item.', origin: 'React Aria, Base UI' },
      ]}
    />
  );
}
