import * as React from 'react';
import { useDialKit } from 'dialkit';
import { Button, Card, SwapText, Switcher, useWait, type CardFrameVariant, type CardSize, type WaitWork } from '@unlocalhosted/metalui';
import { type SpringName } from '../../../../../packages/metalui/src/motion/springs.generated';
import { SPRING_NAMES, springVars } from '../../ui/springTuning';
import reactSource from '../../../../../packages/metalui/src/components/card/card.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import swiftSource from '../../../../../swift/Sources/MetalUI/Components/MetalCard.swift?raw';
import agentSource from '../../../../../packages/metalui/src/components/card/card.agent.md?raw';
import { ComponentPage } from '../../ui/ComponentPage';

/* ─────────────────────────────────────────────────────────
 * CARD PAGE · cards by the job they do, each in a real host
 *
 *   playground  trips in a tray: linked cards that lift, a corner action, a chosen one, and an
 *               empty slot that makes a new trip (it arrives waiting on its own edge)
 *   size        regular and compact, side by side
 *   side        search results: square media at the start, one result refreshing
 *   status      a wall of services, scanned for trouble by their LEDs
 *   choice      a plan (one of them) and add-ons (several): cards that latch down
 *   frames      the same cards separated, stacked and ghost, regular or compact
 *   tune        the Card lift and Card frame panels (DialKit)
 * ───────────────────────────────────────────────────────── */

const cover = (a: string, b: string) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 160"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="320" height="160" fill="url(#g)"/><circle cx="250" cy="44" r="18" fill="rgba(255,255,255,.6)"/><path d="M0 130 90 70l60 40 50-30 120 80H0z" fill="rgba(255,255,255,.35)"/></svg>`)}`;
const thumb = (a: string, b: string) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="80" height="80" fill="url(#g)"/><circle cx="58" cy="22" r="8" fill="rgba(255,255,255,.6)"/><path d="M0 66 24 44l16 12 14-9 26 21v12H0z" fill="rgba(255,255,255,.35)"/></svg>`)}`;

/** Pretend work for `ms`, ending `end`. */
function useWork(ms: number, end: WaitWork = 'idle') {
  const [work, setWork] = React.useState<WaitWork>('idle');
  const timer = React.useRef(0);
  React.useEffect(() => () => window.clearTimeout(timer.current), []);
  const start = React.useCallback(() => {
    window.clearTimeout(timer.current);
    setWork('working');
    timer.current = window.setTimeout(() => setWork(end), ms);
  }, [ms, end]);
  return [work, start] as const;
}

/* ───────────────────────── playground ───────────────────────── */

function NewTrip({ name }: { name: string }) {
  const [work, start] = useWork(1400);
  const wait = useWait(work);
  React.useEffect(start, [start]);
  return (
    <Card waiting={wait.busy}>
      <Card.Title href="#new">{name}</Card.Title>
      <Card.Action label={`More for ${name}`} />
      <Card.Description><SwapText value={wait.busy ? 'Making the trip…' : 'Empty: add notes, photos or a map.'} /></Card.Description>
    </Card>
  );
}

function Trips({ onDid }: { onDid: (s: string) => void }) {
  const [chosen, setChosen] = React.useState('lisbon');
  const [made, setMade] = React.useState(0);
  return (
    <Card.Frame className="w-full max-w-[760px]">
      <Card selected={chosen === 'lisbon'}>
        <Card.Media src={cover('#E8C9A0', '#C27D5F')} />
        <Card.Title href="#lisbon">Trip to Lisbon</Card.Title>
        <Card.Action label="More for Trip to Lisbon" onClick={() => onDid('More for Lisbon')} />
        <Card.Description>14 notes, 3 photos, a tram map.</Card.Description>
        <Card.Footer>
          <Button size="compact" onClick={() => { setChosen('lisbon'); onDid('Chose Lisbon'); }}>Choose</Button>
          <Button size="compact" onClick={() => onDid('Shared Lisbon')}>Share</Button>
        </Card.Footer>
      </Card>
      <Card selected={chosen === 'porto'}>
        <Card.Media src={cover('#A7C6E8', '#5F84B6')} />
        <Card.Title href="#porto">Weekend in Porto</Card.Title>
        <Card.Action label="More for Weekend in Porto" onClick={() => onDid('More for Porto')} />
        <Card.Description>A list of cafés and a train time.</Card.Description>
        <Card.Footer>
          <Button size="compact" onClick={() => { setChosen('porto'); onDid('Chose Porto'); }}>Choose</Button>
        </Card.Footer>
      </Card>
      <Card>
        <Card.Title>Packing list</Card.Title>
        <Card.Description>This card goes nowhere, so it stays still.</Card.Description>
      </Card>
      {Array.from({ length: made }, (_, i) => <NewTrip key={i} name={`Untitled trip ${i + 1}`} />)}
      {made < 3 && <Card.EmptySlot onClick={() => { setMade((n) => n + 1); onDid('Made a trip'); }}>New trip</Card.EmptySlot>}
    </Card.Frame>
  );
}

/* ───────────────────────── size ───────────────────────── */

function Sizes() {
  return (
    <div className="grid w-full max-w-[640px] grid-cols-[repeat(auto-fit,minmax(220px,1fr))] items-start gap-24">
      {(['regular', 'compact'] as const).map((size) => (
        <Card key={size} size={size} data-testid={`card-${size}`}>
          <Card.Media src={cover('#C9D9B0', '#7FA06A')} />
          <Card.Title href={`#garden-${size}`}>Garden plan</Card.Title>
          <Card.Action label={`More for Garden plan (${size})`} />
          <Card.Description>{size === 'regular' ? 'Regular: pad 16, a page of a few cards.' : 'Compact: pad 12, a dense board.'}</Card.Description>
        </Card>
      ))}
    </div>
  );
}

/* ───────────────────────── media at the side ───────────────────────── */

const RESULTS = [
  { id: 'harbour', title: 'Harbour at dusk', line: 'Photo · Lisbon · 12 Apr', a: '#E8C9A0', b: '#C27D5F' },
  { id: 'tram', title: 'Tram 28 timetable', line: 'Note · Lisbon · 11 Apr', a: '#E8DFA0', b: '#B9A04F' },
  { id: 'azulejo', title: 'Azulejo study', line: 'Sketch · Porto · 3 May', a: '#A7C6E8', b: '#5F84B6' },
];

function Results() {
  const [work, start] = useWork(1800);
  const wait = useWait(work);
  return (
    <div className="grid w-full max-w-[520px] gap-12">
      <Card.Frame size="compact" orientation="horizontal" data-testid="card-results">
        {RESULTS.map((r) => (
          <Card key={r.id} waiting={r.id === 'tram' && wait.busy}>
            <Card.Media src={thumb(r.a, r.b)} />
            <Card.Title href={`#${r.id}`}>{r.title}</Card.Title>
            <Card.Description>{r.id === 'tram' ? <SwapText value={wait.busy ? 'Refreshing the timetable…' : r.line} /> : r.line}</Card.Description>
          </Card>
        ))}
      </Card.Frame>
      <div><Button size="compact" onClick={start} disabled={wait.busy}>Refresh the timetable</Button></div>
    </div>
  );
}

/* ───────────────────────── status ───────────────────────── */

const SERVICES = [
  { name: 'Sync', line: 'Up 14 days', status: 'live' },
  { name: 'Search index', line: 'Up 3 days', status: 'live' },
  { name: 'Thumbnails', line: 'Deploy failed at 09:12', status: 'failed', label: 'Deploy failed' },
  { name: 'Backups', line: 'Queued behind Thumbnails', status: 'waiting', label: 'Queued' },
  { name: 'Mail', line: 'Up 21 days', status: 'live' },
  { name: 'Exports', line: 'Up 6 hours', status: 'live' },
] as const;

function Services() {
  return (
    <Card.Frame variant="ghost" size="compact" className="w-full max-w-[760px]" data-testid="card-services">
      {SERVICES.map((s) => (
        <Card key={s.name} status={s.status} statusLabel={'label' in s ? s.label : undefined}>
          <Card.Title href={`#${s.name}`}>{s.name}</Card.Title>
          <Card.Action label={`More for ${s.name}`} />
          <Card.Description>{s.line}</Card.Description>
        </Card>
      ))}
    </Card.Frame>
  );
}

/* ───────────────────────── choice ───────────────────────── */

const PLANS = [
  { value: 'solo', title: 'Solo', line: 'One person, every canvas.' },
  { value: 'team', title: 'Team', line: 'Up to ten, shared regions.' },
  { value: 'studio', title: 'Studio', line: 'Unlimited, with history.' },
];
const ADDONS = [
  { value: 'backups', title: 'Daily backups', line: 'Kept for 30 days.', doing: 'Turning on backups…' },
  { value: 'domain', title: 'Own domain', line: 'Share from your address.', doing: 'Checking the domain…' },
];

function AddOn({ value, title, line, doing, on }: (typeof ADDONS)[number] & { on: boolean }) {
  const [work, start] = useWork(1400);
  const wait = useWait(work);
  const was = React.useRef(on);
  React.useEffect(() => { if (on && !was.current) start(); was.current = on; }, [on, start]);
  return (
    <Card.Choice value={value} waiting={wait.busy}>
      <Card.Title>{title}</Card.Title>
      <Card.Description><SwapText value={wait.busy ? doing : line} /></Card.Description>
    </Card.Choice>
  );
}

function Choices() {
  const [plan, setPlan] = React.useState('team');
  const [addons, setAddons] = React.useState<string[]>(['backups']);
  return (
    <div className="grid w-full max-w-[640px] gap-16">
      <Card.Choices aria-label="Plan" value={plan} onValueChange={setPlan} render={<Card.Frame data-testid="card-plans" />}>
        {PLANS.map((p) => (
          <Card.Choice key={p.value} value={p.value}>
            <Card.Title>{p.title}</Card.Title>
            <Card.Description>{p.line}</Card.Description>
          </Card.Choice>
        ))}
      </Card.Choices>
      <Card.Choices multiple aria-label="Add-ons" value={addons} onValueChange={setAddons} render={<Card.Frame variant="ghost" size="compact" data-testid="card-addons" />}>
        {ADDONS.map((a) => <AddOn key={a.value} {...a} on={addons.includes(a.value)} />)}
      </Card.Choices>
      <p className="m-0 type-doc-caption text-ink3" data-testid="card-choice-readout">{`Plan: ${plan} · add-ons: ${addons.join(', ') || 'none'}`}</p>
    </div>
  );
}

/* ───────────────────────── frames ───────────────────────── */

const VARIANTS: { value: CardFrameVariant; label: string }[] = [
  { value: 'separated', label: 'Separated' },
  { value: 'stacked', label: 'Stacked' },
  { value: 'ghost', label: 'Ghost' },
];
const SIZES: { value: CardSize; label: string }[] = [{ value: 'regular', label: 'Regular' }, { value: 'compact', label: 'Compact' }];
const JOBS: Record<CardFrameVariant, string> = {
  separated: 'Peers to compare, held in a sunk tray.',
  stacked: 'Parts of one whole: one plate, sections between engraved hairlines.',
  ghost: 'Cards on the page, with no tray.',
};

function Frames() {
  const [variant, setVariant] = React.useState<CardFrameVariant>('stacked');
  const [size, setSize] = React.useState<CardSize>('regular');
  return (
    <div className="grid w-full max-w-[560px] justify-items-start gap-16">
      <div className="flex flex-wrap gap-12">
        <Switcher size="compact" aria-label="Frame" options={VARIANTS} value={variant} onValueChange={setVariant} />
        <Switcher size="compact" aria-label="Size" options={SIZES} value={size} onValueChange={setSize} />
      </div>
      <Card.Frame variant={variant} size={size} className="w-full" data-testid="card-frame">
        <Card>
          <Card.Title href="#profile">Profile</Card.Title>
          <Card.Description>Your name, picture and the address people see.</Card.Description>
        </Card>
        <Card status="live" statusLabel="Syncing">
          <Card.Title href="#devices">Devices</Card.Title>
          <Card.Description>Three devices, last synced a minute ago.</Card.Description>
        </Card>
        <Card>
          <Card.Title>Storage</Card.Title>
          <Card.Description>4.2 GB of 10 GB used.</Card.Description>
          <Card.Footer><Button size="compact">Free up space</Button></Card.Footer>
        </Card>
      </Card.Frame>
      <p className="m-0 type-doc-caption text-ink3">{JOBS[variant]}</p>
    </div>
  );
}

/* ───────────────────────── tune ───────────────────────── */

function Tuner() {
  const lift = useDialKit('Card lift', {
    spring: { type: 'select', options: SPRING_NAMES, default: 'settle' },
    lift: [4, 0, 12],
    slow: [1, 1, 10],
  });
  const frame = useDialKit('Card frame', { pad: [8, 0, 16], gap: [8, 0, 24], column: [200, 140, 320] });
  const vars = {
    ...springVars('settle', lift.spring as SpringName, lift.slow),
    '--mu-motion-step': `${lift.lift}px`,
    '--mu-r-card-frame-pad': `${frame.pad}px`,
    '--mu-r-card-frame-gap': `${frame.gap}px`,
    '--mu-r-card-frame-column': `${frame.column}px`,
  } as React.CSSProperties;
  return <div data-testid="card-lift-tuner" className="flex w-full justify-center" style={vars}><Trips onDid={() => {}} /></div>;
}

export default function CardPage() {
  const [did, setDid] = React.useState<string | null>(null);
  return (
    <ComponentPage
      title="Card"
      lede="A person's thing, held on a raised plate. A card that goes somewhere lifts one step under the pointer as its shadow grows; its title is the one link, and its actions stay buttons of their own. A card that goes nowhere stays still. A frame holds cards: a sunk tray of peers, one plate of sections, or no tray at all."
      play={{ lede: 'Hover the cards, open one, use its buttons, or make a new trip in the empty slot.', caption: did ?? 'two linked cards (one chosen) · one that goes nowhere · an empty slot', wide: true, node: <Trips onDid={setDid} /> }}
      capture="card"
      more={[
        { id: 'size', title: 'Regular and compact', lede: 'Compact takes the padding from 16 to 12 and tightens the gaps, for a dense board. A frame’s size reaches every card in it.', node: <Sizes /> },
        { id: 'side', title: 'Media at the side', lede: 'For result lists: square media at the start, its corners concentric with the plate. A frame of side cards (`orientation="horizontal"` on the frame or the cards) is a single column. Refresh the timetable to see a side card wait on its own edge.', node: <Results /> },
        { id: 'status', title: 'Status', lede: 'A wall of cards scanned for trouble: each lights an LED at the end of its title’s line, green live, amber waiting (breathing), red failed (two blinks). The word is its accessible name and its tooltip; rest on a lamp to read it.', node: <Services /> },
        { id: 'choice', title: 'Choice cards', lede: 'A card as a radio or a checkbox. Pressed, it sinks at once; chosen, it stays down, seated flush, with the icon key’s 4 pt green LED in its corner. The one it replaces rises. Arrows move and choose; Space toggles an add-on, which waits on its own edge while it turns on.', node: <Choices /> },
        { id: 'frames', title: 'A frame of cards', lede: 'Separated is a sunk tray of peers; stacked is one raised plate whose sections sit between engraved hairlines (they never lift; a linked one washes on hover); ghost is the cards with no tray.', node: <Frames /> },
        { id: 'tune', title: 'Tune the lift and the frame', lede: 'The Card lift panel swaps the lift’s spring, sets how far it lifts, and stretches time; the Card frame panel sets the tray’s lip, the gap between cards and the narrowest column.', node: <Tuner /> },
      ]}
      usage={`<Card.Frame>
  <Card status="live">
    <Card.Media src={trip.cover} />
    <Card.Title href={\`/trips/\${trip.id}\`}>{trip.name}</Card.Title>
    <Card.Action label={\`More for \${trip.name}\`} onClick={openMenu} />
    <Card.Description>{trip.summary}</Card.Description>
    <Card.Footer>
      <Button size="compact" onClick={share}>Share</Button>
    </Card.Footer>
  </Card>
  <Card.EmptySlot onClick={newTrip}>New trip</Card.EmptySlot>
</Card.Frame>`}
      sources={[
        { id: 'react', label: 'React', code: reactSource },
        { id: 'css', label: 'CSS', code: cssSource },
        { id: 'swift', label: 'SwiftUI', code: swiftSource },
        { id: 'agent', label: 'Agent guide', code: agentSource },
      ]}
      rules={[
        { id: 'CD1', title: 'One link, the title', body: 'The title\'s link covers the card; actions, the corner one too, are separate buttons above it.', origin: 'Inclusive components' },
        { id: 'CD2', title: 'Only what goes somewhere moves', body: 'A card lifts only when it has a link; a still card promises nothing. A stacked section never lifts.', origin: 'Ours' },
        { id: 'CD3', title: 'Still before the pointer leaves', body: 'The hover lift rides the settle spring, done by the time the pointer is gone.', origin: 'Transitions T5a' },
        { id: 'CD4', title: 'A lamp says it in words too', body: 'Status keeps the LED meanings (green live, amber waiting, red failed) and its word is the lamp\'s name and tooltip.', origin: 'Ours' },
        { id: 'CD5', title: 'A choice latches', body: 'A choice card stays down with the green LED, the icon key\'s latch; it holds no link and no other button.', origin: 'Ours, after the tool key' },
        { id: 'CD6', title: 'The frame says the relation', body: 'Separated for peers to compare, stacked for parts of one whole, ghost when the page is enough.', origin: 'ReUI Frame' },
      ]}
    />
  );
}
