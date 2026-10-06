import * as React from 'react';
import { useDialKit } from 'dialkit';
import { Autocomplete, Avatar, Button, Form, FormField, type AutocompleteGroup, type AutocompleteItem } from '@unlocalhosted/metalui';
import { SearchIcon, PinIcon } from '@unlocalhosted/metalui/icons';
import reactSource from '../../../../../packages/metalui/src/components/autocomplete/autocomplete.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import swiftSource from '../../../../../swift/Sources/MetalUI/Components/MetalAutocomplete.swift?raw';
import agentSource from '../../../../../packages/metalui/src/components/autocomplete/autocomplete.agent.md?raw';
import { ComponentPage } from '../../ui/ComponentPage';

/* ─────────────────────────────────────────────────────────
 * AUTOCOMPLETE PAGE
 *
 *   playground  a city search: type anything; the rest of the best match after the caret, Tab takes
 *               it; large, compact, invalid, disabled. DialKit (Autocomplete): inline, highlight first
 *   to          an email "To": people with avatars; choosing writes the address, not the name
 *   groups      places and saved searches; recent searches before typing
 *   search      a search you run: loading and failed (DialKit: latency, fail)
 *   form        the text is submitted with the form, whatever it is
 * ───────────────────────────────────────────────────────── */

const CITIES = ['Amsterdam', 'Athens', 'Barcelona', 'Berlin', 'Bologna', 'Bordeaux', 'Bruges', 'Budapest', 'Copenhagen', 'Dublin', 'Edinburgh', 'Florence', 'Geneva', 'Lisbon', 'Ljubljana', 'London', 'Lyon', 'Madrid', 'Marseille', 'Milan', 'Munich', 'Naples', 'Oslo', 'Paris', 'Porto', 'Prague', 'Rome', 'Seville', 'Stockholm', 'Valencia', 'Vienna', 'Zurich'];

const PEOPLE: AutocompleteItem[] = [
  ['ana@studio.pt', 'Ana Duarte'],
  ['ana.martins@field.io', 'Ana Martins'],
  ['bea@studio.pt', 'Beatriz Lopes'],
  ['jonas@north.de', 'Jonas Weber'],
  ['maria@studio.pt', 'Maria Costa'],
  ['msilva@harbour.co', 'Maria Silva'],
  ['tomas@studio.pt', 'Tomás Reis'],
  ['yuki@kumo.jp', 'Yuki Tanaka'],
].map(([value, label]) => ({ value, label, description: value, icon: <Avatar name={label} size="small" /> }));

const PLACES: AutocompleteGroup[] = [
  { label: 'Places', items: ['Rua Augusta, Lisbon', 'Rua do Ouro, Lisbon', 'Rua das Flores, Porto', 'Rossio, Lisbon', 'Ribeira, Porto'] },
  { label: 'Saved', items: [{ value: 'Rua Garrett 12, Lisbon', label: 'Studio', description: 'Rua Garrett 12, Lisbon' }, { value: 'Rua de Santa Catarina 3, Porto', label: 'Print shop', description: 'Rua de Santa Catarina 3, Porto' }] },
];

/* ─────────────────────────────── playground ─────────────────────────────── */

function Playground({ onText }: { onText: (text: string) => void }) {
  const d = useDialKit('Autocomplete', { inline: true, highlightFirst: false });
  const [text, setText] = React.useState('');
  return (
    <div className="flex min-h-[360px] items-start justify-center pt-16">
      <div className="grid gap-12">
        <Autocomplete
          items={CITIES}
          value={text}
          onValueChange={(t) => { setText(t); onText(t); }}
          inline={d.inline}
          highlightFirst={d.highlightFirst}
          icon={<SearchIcon />}
          placeholder="Search a city"
          aria-label="City"
        />
        <Autocomplete items={CITIES} size="large" icon={<SearchIcon />} placeholder="Large" aria-label="Large city" />
        <Autocomplete items={CITIES} size="compact" placeholder="Compact" aria-label="Compact city" />
        <Autocomplete items={CITIES} invalid defaultValue="Atlantis" placeholder="Invalid" aria-label="Invalid city" />
        <Autocomplete items={CITIES} disabled placeholder="Disabled" aria-label="Disabled city" />
      </div>
    </div>
  );
}

/* ─────────────────────────────── an email "To" ─────────────────────────────── */

function To() {
  const [to, setTo] = React.useState('');
  return (
    <div data-testid="autocomplete-to" className="grid min-h-[300px] content-start justify-center gap-8 pt-16">
      <Autocomplete items={PEOPLE} value={to} onValueChange={setTo} placeholder="Name or address" aria-label="To" className="w-[300px]" />
      <span className="type-doc-caption text-ink3">{to ? `to: ${to}` : 'type a name or an address'}</span>
    </div>
  );
}

/* ─────────────────────────────── groups and recent ─────────────────────────────── */

function Groups() {
  const [recent, setRecent] = React.useState(['Rua Augusta, Lisbon', 'Ribeira, Porto']);
  const [where, setWhere] = React.useState('');
  return (
    <div data-testid="autocomplete-groups" className="flex min-h-[320px] justify-center pt-16">
      <form onSubmit={(e) => { e.preventDefault(); const w = where.trim(); if (w) setRecent((r) => [w, ...r.filter((x) => x !== w)].slice(0, 3)); }}>
        <Autocomplete items={PLACES} recent={recent} value={where} onValueChange={setWhere} icon={<PinIcon />} placeholder="Where to?" aria-label="Where to" className="w-[300px]" />
      </form>
    </div>
  );
}

/* ─────────────────────────────── a search you run ─────────────────────────────── */

function Search() {
  const d = useDialKit('Autocomplete search', { latency: [900, 0, 4000], fail: false });
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
    <div data-testid="autocomplete-search" className="flex min-h-[300px] justify-center pt-16">
      <Autocomplete
        items={found}
        filter={false}
        value={query}
        onValueChange={setQuery}
        loading={loading}
        failed={failed}
        onRetry={() => setTries((n) => n + 1)}
        icon={<SearchIcon />}
        placeholder="Search cities"
        aria-label="Search cities"
      />
    </div>
  );
}

/* ─────────────────────────────── in a form ─────────────────────────────── */

function InForm() {
  const [sent, setSent] = React.useState<string>();
  return (
    <div data-testid="autocomplete-form" className="flex min-h-[300px] justify-center pt-16">
      <Form className="w-full max-w-[320px]" onFormSubmit={(values) => setSent(String(values.city ?? ''))}>
        <FormField name="city" validate={(v) => (String(v ?? '').trim() ? null : 'Say where it was taken.')}>
          <FormField.Label>Taken in</FormField.Label>
          <Autocomplete items={CITIES} name="city" placeholder="A city, or anywhere" />
          <FormField.Description>Any place: the list only helps.</FormField.Description>
          <FormField.Error />
        </FormField>
        <div className="flex items-center gap-12">
          <Button cap="primary" type="submit">Save</Button>
          {sent !== undefined && <span className="type-meta text-ink2">Saved “{sent}”.</span>}
        </div>
      </Form>
    </div>
  );
}

export default function AutocompletePage() {
  const [text, setText] = React.useState('');
  return (
    <ComponentPage
      title="Autocomplete"
      lede="Free text with suggestions. The text is the value, whatever you type; the list only helps you finish it. The rest of the best match waits after the caret, and Tab takes it."
      play={{ lede: 'Type "li", then Tab. Type "zz": the plate closes and your text stays. The Autocomplete panel turns the completion and "highlight first" on and off.', caption: text ? `searching “${text}”` : '32 cities · large · compact · invalid · disabled', node: <Playground onText={setText} /> }}
      capture="autocomplete"
      more={[
        { id: 'to', title: 'An email "To"', lede: 'Rows show a person; choosing writes their address. Type a name or the start of an address: the completion is always the rest of what will be written.', node: <To /> },
        { id: 'groups', title: 'Groups and recent', lede: 'Places and saved addresses under engraved labels. Before you type, your recent searches; press ↩ to search what you typed and it joins them.', node: <Groups /> },
        { id: 'search', title: 'A search you run', lede: 'Combobox’s empties: the ring takes the clear key’s place and the rows dim while a search runs; a failure offers Try again. The Autocomplete search panel sets the latency and makes the next search fail.', node: <Search /> },
        { id: 'form', title: 'In a form', lede: 'The text is submitted with the form under its name, whether or not it is in the list. Leave it empty and save.', node: <InForm /> },
      ]}
      usage={`<Autocomplete items={cities} value={text} onValueChange={setText} icon={<SearchIcon />} placeholder="Search a city" aria-label="City" />`}
      sources={[
        { id: 'react', label: 'React', code: reactSource },
        { id: 'css', label: 'CSS', code: cssSource },
        { id: 'swift', label: 'SwiftUI', code: swiftSource },
        { id: 'agent', label: 'Agent guide', code: agentSource },
      ]}
      rules={[
        { id: 'AC1', title: 'The text is the value', body: 'Nothing typed is refused or thrown away because it isn’t in the list.', origin: 'Base UI' },
        { id: 'AC2', title: 'See before you take', body: 'The completion is drawn after the caret; only Tab or → writes it. ↩ keeps your text unless you lit a row.', origin: 'Ours, after fish' },
        { id: 'AC3', title: 'Finish what was started', body: 'Suggestions that start with the text come first.', origin: 'Ours' },
        { id: 'AC4', title: 'No news is no plate', body: 'Nothing matched closes the plate; free text needs no permission.', origin: 'Ours' },
        { id: 'AC5', title: 'One look with Combobox', body: 'The same well, plate, rows and empties: Autocomplete draws Combobox’s parts.', origin: 'Ours' },
      ]}
    />
  );
}
