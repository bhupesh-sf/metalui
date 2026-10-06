import * as React from 'react';
import { useDialKit } from 'dialkit';
import {
  Attachment, Avatar, Button, Card, Chip, Field, IconButton, Led, Row, Skeleton, Spinner, Surface, SwapText, Switcher, Progress, useWait,
  type LedGesture, type LedKind, type Wait, type WaitWork,
} from '@unlocalhosted/metalui';
import { DocumentIcon, MorphIcon, SearchIcon, type MorphIconName } from '@unlocalhosted/metalui/icons';
import reactSource from '../../../../../packages/metalui/src/components/spinner/spinner.tsx?raw';
import waitSource from '../../../../../packages/metalui/src/motion/wait.ts?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import swiftSource from '../../../../../swift/Sources/MetalUI/Components/MetalSpinner.swift?raw';
import agentSource from '../../../../../packages/metalui/src/components/spinner/spinner.agent.md?raw';
import { ComponentPage } from '../../ui/ComponentPage';
import { Stage } from '../../ui/doc';

/* ─────────────────────────────────────────────────────────
 * SPINNER PAGE · waiting, shown where it happens, each placement in a real host
 *
 *   action     a Save key: the glyph becomes the arc, the label turns
 *   small      a row, a chip and an avatar: the ring in the glyph slot, the item dims and holds
 *   large      a card: its own edge waits, with words; Progress takes over once the amount is known
 *   field      a search field: the ring in the trailing slot, in place of the clear key
 *   place      a view: skeletons on first load, a thin top bar on a route change
 *   background a sync lamp breathes while you keep working
 *   known      the ring fills, the attachment's track fills, as soon as the amount is known
 * The Waiting timing panel (DialKit) sets the timing tokens for the whole page, and how long the
 * pretend work takes and how it ends.
 * ───────────────────────────────────────────────────────── */

type Outcome = 'done' | 'failed';
const Timing = React.createContext<{ work: number; outcome: Outcome }>({ work: 2400, outcome: 'done' });

/** Pretend work: it runs for the panel's time (or `ms`) and ends the panel's way (or `end`). */
function useWork(ms?: number, end?: WaitWork) {
  const t = React.useContext(Timing);
  const [work, setWork] = React.useState<WaitWork>('idle');
  const timer = React.useRef(0);
  React.useEffect(() => () => window.clearTimeout(timer.current), []);
  const start = () => {
    window.clearTimeout(timer.current);
    setWork('working');
    timer.current = window.setTimeout(() => setWork(end ?? t.outcome), ms ?? t.work);
  };
  return [work, start] as const;
}

/** The words of a wait: what is happening (once the sign shows), more after a long while, then the result. */
const words = (wait: Wait, w: { rest: string; doing: string; still: string; done: string; failed: string }) =>
  wait.phase === 'shown' ? (wait.still ? w.still : w.doing) : wait.phase === 'done' ? w.done : wait.phase === 'failed' ? w.failed : w.rest;

const PLATE = 'box-border flex w-full flex-col gap-4 p-8';
const plate = (width: number): React.CSSProperties => ({ width, maxWidth: '100%' });

/* ───────────────────────── on an action ───────────────────────── */

function SaveKey({ ms, label = 'Save' }: { ms?: number; label?: string }) {
  const [work, start] = useWork(ms);
  const wait = useWait(work);
  const glyph: MorphIconName = wait.phase === 'done' ? 'check' : wait.phase === 'failed' ? 'retry' : 'save';
  return (
    <>
      <Button cap="primary" state={wait.busy ? 'waiting' : wait.phase === 'done' ? 'done' : 'ready'} onClick={start} icon={<MorphIcon name={glyph} />}>
        <SwapText value={words(wait, { rest: label, doing: 'Saving…', still: 'Still saving…', done: 'Saved', failed: 'Try again' })} />
      </Button>
      <Spinner.Status phase={wait.phase} label="Saving" result="Saved" />
    </>
  );
}

/* ───────────────────────── on a small item ───────────────────────── */

function FileRow({ name, size }: { name: string; size: string }) {
  const [work, start] = useWork();
  const wait = useWait(work);
  const failed = wait.phase === 'failed';
  return (
    <Row variant="option" waiting={wait.busy} data-testid="spinner-row">
      <Spinner phase={wait.phase} label={`Archiving ${name}`} result={`Archived ${name}`}>
        <MorphIcon name={failed ? 'sync-error' : 'document'} />
      </Spinner>
      <Row.Text>{name}</Row.Text>
      <Row.Trail>
        <span className="type-meta text-ink3">{words(wait, { rest: size, doing: 'Archiving…', still: 'Still archiving…', done: 'Archived', failed: 'Couldn’t archive' })}</span>
        <Button size="compact" onClick={start}>{failed ? 'Try again' : 'Archive'}</Button>
      </Row.Trail>
    </Row>
  );
}

function TagChip() {
  const [work, start] = useWork();
  const wait = useWait(work);
  return (
    <Chip.Root as="button" variant="suggestion" waiting={wait.busy} onClick={start} data-testid="spinner-chip" aria-label={wait.phase === 'failed' ? 'Couldn’t apply Travel. Try again' : 'Apply Travel'} className="cursor-pointer">
      <Spinner size="small" phase={wait.phase} label="Applying Travel" result="Travel applied">
        <MorphIcon name={wait.phase === 'failed' ? 'sync-error' : 'tag'} />
      </Spinner>
      <Chip.Text>Travel</Chip.Text>
    </Chip.Root>
  );
}

const portrait = (a: string, b: string) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="64" height="64" fill="url(#g)"/><circle cx="32" cy="26" r="11" fill="rgba(255,255,255,.55)"/><path d="M12 60c3-12 11-18 20-18s17 6 20 18z" fill="rgba(255,255,255,.55)"/></svg>`)}`;
const PHOTOS = [portrait('#E8B9A0', '#B77B63'), portrait('#A7C6E8', '#5F84B6'), portrait('#B9D9B0', '#5E9A63')];

function PhotoAvatar() {
  const [work, start] = useWork();
  const wait = useWait(work);
  const [n, setN] = React.useState(0);
  React.useEffect(() => { if (wait.phase === 'done') setN((k) => k + 1); }, [wait.phase]);
  return (
    <div className="flex items-center gap-12">
      <Avatar name="Ana Rocha" src={PHOTOS[n % PHOTOS.length]} size="large" waiting={wait.busy} />
      <Spinner.Status phase={wait.phase} label="Uploading a new photo" result="Photo updated" />
      <div className="grid gap-4">
        <span className="type-ui text-ink">Ana Rocha</span>
        <Button size="compact" onClick={start} disabled={wait.busy}>{wait.phase === 'failed' ? 'Try again' : 'Change photo'}</Button>
      </div>
    </div>
  );
}

function SmallItems() {
  return (
    <div className="grid w-full justify-items-center gap-24">
      <Surface material="raise" radius="card" className={PLATE} style={plate(440)}>
        <FileRow name="Harbour survey.pdf" size="2.4 MB" />
        <FileRow name="Tide tables 2026.csv" size="88 KB" />
      </Surface>
      <div className="flex flex-wrap items-center justify-center gap-32">
        <TagChip />
        <PhotoAvatar />
      </div>
    </div>
  );
}

/* ───────────────────────── on a large item ───────────────────────── */

const cover = (a: string, b: string) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 160"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="320" height="160" fill="url(#g)"/><circle cx="250" cy="44" r="18" fill="rgba(255,255,255,.6)"/><path d="M0 130 90 70l60 40 50-30 120 80H0z" fill="rgba(255,255,255,.35)"/></svg>`)}`;

function LiftCard() {
  const [work, start] = useWork();
  const wait = useWait(work);
  return (
    <Card waiting={wait.busy} className="w-[300px] max-w-full" data-testid="spinner-card">
      <Card.Media src={cover('#E8C9A0', '#C27D5F')} />
      <Card.Title>Harbour at dusk</Card.Title>
      <Card.Description><SwapText value={words(wait, { rest: '4032 × 3024 · 3.1 MB', doing: 'Lifting the subject…', still: 'Still lifting the subject…', done: 'Subject lifted', failed: 'Couldn’t lift the subject' })} /></Card.Description>
      <Spinner.Status phase={wait.phase} label="Lifting the subject" result="Subject lifted" />
      <Card.Footer>
        <Button size="compact" onClick={start} disabled={wait.busy}>{wait.phase === 'failed' ? 'Try again' : 'Lift subject'}</Button>
      </Card.Footer>
    </Card>
  );
}

/** Unknown first (the edge travels), then known (Progress takes over), then done. */
function useMeasuredWork() {
  const t = React.useContext(Timing);
  const [work, setWork] = React.useState<WaitWork>('idle');
  const [value, setValue] = React.useState<number | null>(null);
  const timers = React.useRef<number[]>([]);
  const stop = () => { timers.current.forEach((id) => { window.clearTimeout(id); window.clearInterval(id); }); timers.current = []; };
  React.useEffect(() => stop, []);
  const start = () => {
    stop();
    setWork('working');
    setValue(null);
    // A third of the time to learn how much there is, then steady steps to the end.
    const learn = t.work / 3, step = 120, steps = Math.max(1, Math.round((t.work - learn) / step));
    timers.current.push(window.setTimeout(() => {
      let k = 0;
      setValue(0);
      const id = window.setInterval(() => {
        k += 1;
        setValue(Math.min(100, Math.round((k / steps) * 100)));
        if (k >= steps) { window.clearInterval(id); setValue(null); setWork(t.outcome); }
      }, step);
      timers.current.push(id);
    }, learn));
  };
  return { work, value, start };
}

function ExportCard() {
  const { work, value, start } = useMeasuredWork();
  const wait = useWait(work);
  const known = value != null && wait.busy;
  return (
    <Card waiting={wait.busy && !known} className="w-[300px] max-w-full" data-testid="spinner-export">
      <Card.Title>Lisbon, spring</Card.Title>
      <Card.Description><SwapText value={known ? `Exporting 12 photos` : words(wait, { rest: '12 photos · 41 MB', doing: 'Preparing the export…', still: 'Still preparing…', done: 'Exported 12 photos', failed: 'Couldn’t export' })} /></Card.Description>
      <Spinner.Status phase={wait.phase} label="Preparing the export" result="Exported 12 photos" />
      <Card.Footer>
        {known
          ? <Progress value={value} aria-label="Exporting 12 photos" showValue className="w-full" />
          : <Button size="compact" onClick={start} disabled={wait.busy}>{wait.phase === 'failed' ? 'Try again' : 'Export'}</Button>}
      </Card.Footer>
    </Card>
  );
}

/* ───────────────────────── in a field ───────────────────────── */

const PLACES = ['Lisbon', 'Lima', 'Lille', 'Linz', 'Lyon', 'Leeds', 'Lagos', 'Luxor'];
const CLEAR = <svg aria-hidden viewBox="0 0 10 10" className="size-attachment-remove-glyph" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round"><path d="M2.5 2.5l5 5M7.5 2.5l-5 5" /></svg>;

function SearchPlaces() {
  const t = React.useContext(Timing);
  const [query, setQuery] = React.useState('');
  const [shown, setShown] = React.useState('');
  // A search ends in its results, not in a tick: the work ends idle.
  const [work, start] = useWork(Math.min(t.work, 1600), 'idle');
  const wait = useWait(work);
  const ask = (q: string) => { setQuery(q); start(); };
  React.useEffect(() => { if (work === 'idle') setShown(query); }, [work, query]);
  const found = PLACES.filter((p) => p.toLowerCase().startsWith(shown.trim().toLowerCase()));
  return (
    <div className="grid w-[300px] max-w-full gap-8">
      <Field size="regular" data-testid="spinner-field" aria-busy={wait.busy || undefined}>
        <Field.Icon><SearchIcon /></Field.Icon>
        <Field.Input aria-label="Search places" placeholder="Search places" value={query} onChange={(e) => ask(e.target.value)} />
        <Field.Trail>
          {wait.showing
            ? <Spinner phase={wait.phase} label="Searching" />
            : query && <IconButton variant="mini" label="Clear search" icon={CLEAR} onClick={() => ask('')} />}
        </Field.Trail>
      </Field>
      <ul className="m-0 grid list-none gap-2 p-0 transition-opacity duration-150" style={{ opacity: wait.showing ? 0.5 : 1 }} aria-busy={wait.busy || undefined}>
        {found.slice(0, 4).map((p) => <Row key={p} as="li" variant="list"><Row.Text>{p}</Row.Text></Row>)}
        {!found.length && <li className="type-meta px-8 py-4 text-ink3">No places match “{shown}”</li>}
      </ul>
    </div>
  );
}

/* ───────────────────────── for the whole place ───────────────────────── */

const VIEWS = [{ value: 'notes', label: 'Notes' }, { value: 'photos', label: 'Photos' }];
const NOTES = ['Pick up the prints on Thursday', 'Two copies of the plan, one folded for the car', 'Ask about the matte paper'];

function NoteShapes() {
  return (
    <div className="grid gap-16">
      {NOTES.map((n) => (
        <div key={n} className="flex items-start gap-12"><Skeleton.Circle size={24} /><div className="grid flex-1 gap-8"><Skeleton.Text lines={2} /></div></div>
      ))}
    </div>
  );
}

const title = (v: string) => (v === 'notes' ? 'Notes' : 'Photos');

function ViewBody({ view }: { view: string }) {
  return view === 'notes'
    ? <ul className="m-0 grid list-none gap-12 p-0">{NOTES.map((n) => <li key={n} className="flex items-center gap-12 type-ui text-ink"><DocumentIcon size={16} className="text-ink3" />{n}</li>)}</ul>
    : <div className="grid grid-cols-3 gap-8">{PHOTOS.map((p) => <img key={p} alt="" src={p} className="aspect-square w-full rounded-[10px] object-cover" />)}</div>;
}

function PlaceView() {
  const [view, setView] = React.useState('notes');
  const [landed, setLanded] = React.useState<string | null>(null);
  const [work, start] = useWork();
  const wait = useWait(work);
  React.useEffect(() => { if (wait.phase === 'done') setLanded(view); }, [wait.phase, view]);
  const go = (v: string) => { setView(v); start(); };
  // A first load shows the shapes of what is coming; a move between views keeps the old one and runs the bar.
  const moving = landed != null;
  return (
    <Surface material="raise" radius="card" className="relative box-border grid w-full gap-16 overflow-hidden p-20" style={plate(440)} data-testid="spinner-place">
      <Spinner.Bar phase={moving ? wait.phase : 'idle'} />
      <Spinner.Status phase={wait.phase} label={`Opening ${title(view)}`} result={`${title(view)} open`} />
      <Switcher size="compact" aria-label="View" options={VIEWS} value={view} onValueChange={go} />
      <div aria-busy={wait.busy || undefined} className="min-h-[136px] transition-opacity duration-150" style={{ opacity: moving && wait.phase === 'shown' ? 0.55 : 1 }}>
        {wait.phase === 'failed' && <p className="type-meta m-0 mb-12 flex items-center gap-8 text-ink2">Couldn’t open {title(view)}. <Button size="compact" onClick={() => go(view)}>Try again</Button></p>}
        {moving
          ? <div key={landed} className="skeleton-swap-in"><ViewBody view={landed} /></div>
          : <Skeleton.Swap loading={wait.busy} label={`Loading ${title(view)}`} fallback={<NoteShapes />}>
              {wait.phase !== 'failed' && <div className="grid justify-items-start gap-12"><p className="type-meta m-0 text-ink3">Nothing open yet.</p><Button size="compact" onClick={() => go(view)}>Open {title(view)}</Button></div>}
            </Skeleton.Swap>}
      </div>
    </Surface>
  );
}

/* ───────────────────────── background work ───────────────────────── */

const LAMP: Record<Wait['phase'], { kind: LedKind; gesture: LedGesture }> = {
  idle: { kind: 'live', gesture: 'steady' },
  quiet: { kind: 'live', gesture: 'steady' },
  shown: { kind: 'waiting', gesture: 'breathe' },
  done: { kind: 'live', gesture: 'flicker' },
  failed: { kind: 'failed', gesture: 'blink2' },
};

function SyncStatus() {
  const [work, start] = useWork();
  const wait = useWait(work);
  const [typed, setTyped] = React.useState('');
  const lamp = LAMP[wait.phase];
  return (
    <Surface material="raise" radius="card" className="box-border grid w-full gap-16 p-20" style={plate(440)} data-testid="spinner-sync">
      <div className="flex items-center justify-between gap-12">
        <span className="flex items-center gap-8 type-meta text-ink2" aria-busy={wait.busy || undefined}>
          <Led kind={lamp.kind} gesture={lamp.gesture} />
          <SwapText value={words(wait, { rest: 'Synced', doing: 'Syncing 3 notes…', still: 'Still syncing…', done: 'Synced just now', failed: 'Couldn’t sync' })} />
        </span>
        <Spinner.Status phase={wait.phase} label="Syncing 3 notes" result="Synced" />
        <Button size="compact" onClick={start} disabled={wait.busy}>{wait.phase === 'failed' ? 'Try again' : 'Sync now'}</Button>
      </div>
      <Field size="regular">
        <Field.Input aria-label="A note" placeholder="Keep writing while it syncs" value={typed} onChange={(e) => setTyped(e.target.value)} />
      </Field>
    </Surface>
  );
}

/* ───────────────────────── known or unknown ───────────────────────── */

function UploadRing() {
  const { work, value, start } = useMeasuredWork();
  const wait = useWait(work);
  const known = value != null && wait.busy;
  return (
    <Surface material="raise" radius="card" className={PLATE} style={plate(440)}>
      <Row variant="option" waiting={wait.busy} data-testid="spinner-upload">
        <Spinner phase={wait.phase} value={known ? value : null} label="Uploading harbour.jpg" result="Uploaded harbour.jpg">
          <MorphIcon name={wait.phase === 'failed' ? 'sync-error' : 'upload'} />
        </Spinner>
        <Row.Text>harbour.jpg</Row.Text>
        <Row.Trail>
          <span className="type-meta tabular-nums text-ink3">{known ? `${value} %` : words(wait, { rest: '3.1 MB', doing: 'Preparing…', still: 'Still preparing…', done: 'Uploaded', failed: 'Couldn’t upload' })}</span>
          <Button size="compact" onClick={start}>{wait.phase === 'failed' ? 'Try again' : 'Upload'}</Button>
        </Row.Trail>
      </Row>
    </Surface>
  );
}

function UploadAttachment() {
  const { work, value, start } = useMeasuredWork();
  const busy = work === 'working';
  return (
    <div className="grid w-full justify-items-center gap-12" data-testid="spinner-attachment">
      <Attachment name="Tide tables 2026.csv" size={88_000} progress={busy ? value : undefined} error={work === 'failed' ? 'Upload failed' : undefined} onRetry={start} fill />
      <Button size="compact" onClick={start} disabled={busy}>Upload again</Button>
    </div>
  );
}

/* ───────────────────────── timing ───────────────────────── */

function TimingKeys() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-16" data-testid="spinner-timing">
      <SaveKey ms={250} label="Quick save" />
      <SaveKey ms={600} label="Brief save" />
      <SaveKey ms={3000} label="Slow save" />
    </div>
  );
}

/* ───────────────────────── the page ───────────────────────── */

function useTimingPanel() {
  const d = useDialKit('Waiting timing', {
    delay: [400, 0, 1500],
    minimum: [600, 0, 2000],
    result: [1400, 0, 4000],
    still: [8000, 1000, 15000],
    turn: [900, 400, 2400],
    work: [2400, 100, 12000],
    outcome: { type: 'select', options: ['done', 'failed'], default: 'done' },
  });
  // The tokens live on the root, so every wait on the page (and the hook's clock) reads the panel.
  React.useEffect(() => {
    const root = document.documentElement.style;
    const vars = { delay: d.delay, minimum: d.minimum, result: d.result, still: d.still, turn: d.turn };
    for (const [k, v] of Object.entries(vars)) root.setProperty(`--mu-r-spinner-self-${k}`, `${v}ms`);
    return () => { for (const k of Object.keys(vars)) root.removeProperty(`--mu-r-spinner-self-${k}`); };
  }, [d.delay, d.minimum, d.result, d.still, d.turn]);
  return { work: d.work, outcome: d.outcome === 'failed' ? 'failed' as const : 'done' as const };
}

function Placements() {
  return (
    <div className="grid w-full justify-items-center gap-28">
      <div className="flex flex-wrap items-center justify-center gap-24"><SaveKey /><TagChip /></div>
      <Surface material="raise" radius="card" className={PLATE} style={plate(440)}><FileRow name="Harbour survey.pdf" size="2.4 MB" /></Surface>
      <div className="flex flex-wrap items-start justify-center gap-24"><LiftCard /><SearchPlaces /></div>
    </div>
  );
}

export default function SpinnerPage() {
  const timing = useTimingPanel();
  const beat = (id: string, title: string, lede: string, caption: React.ReactNode, node: React.ReactNode, cost?: string) =>
    ({ id, title, lede, node: <Stage caption={caption} cost={cost}>{node}</Stage> });
  const more = [
    beat('action', 'On an action', 'The key that started the work holds it: it stays down and refuses a second press, and only if the work outlasts a beat does its glyph become the arc, in the key’s own ink.', 'Press Save. The label turns to Saving…, then Saved with a check.', <SaveKey />, 'Button state, driven by useWait so the arc never flashes.'),
    beat('small', 'On a small item', 'A row, a chip or an avatar: the ring stands in for the item’s glyph, sized by its slot and in its ink; the rest of the item dims and can’t be acted on. Done, the ring draws a tick, then the glyph comes back.', 'Archive a row, apply the tag, change the photo.', <SmallItems />, 'waiting on the item, <Spinner phase> in its glyph slot.'),
    beat('large', 'On a large item', 'Not a spinner in the middle: the card’s own edge waits, a light travelling round its border, while its words say what is happening. Once the amount is known, Progress takes over.', 'Lift the subject; then export, and watch the edge hand over to a bar.', <div className="flex flex-wrap items-start justify-center gap-24"><LiftCard /><ExportCard /></div>, 'waiting on Card; the words are yours.'),
    beat('field', 'In a field', 'While a search runs, a small ring takes the clear key’s place in the trailing slot; the results stay, dimmed, until the new ones land.', 'Type a place. Typing fast shows nothing but the results.', <SearchPlaces />),
    beat('place', 'For the whole place', 'A view loading for the first time shows skeletons of what will arrive. Moving between views keeps the old one, dimmed, while a thin bar creeps across the top, then completes as the new one lands.', 'Open the place, then switch between Notes and Photos.', <PlaceView />, 'Skeleton.Swap for a first load, Spinner.Bar for a route change.'),
    beat('background', 'Background work', 'Work that doesn’t need you (syncing, uploading) blocks nothing: the status lamp breathes and its words say what it is doing. Keep typing.', 'Sync now, and keep writing in the field.', <SyncStatus />, 'the LED part’s breathe gesture; nothing is held.'),
    beat('known', 'Known or unknown', 'As soon as the amount is known, the ring stops turning and fills, and an attachment’s sweeping segment becomes its fill: a wait you can measure is shown as progress.', 'Upload, and watch the turning hand over to filling.', <div className="grid w-full justify-items-center gap-24"><UploadRing /><div style={plate(360)}><UploadAttachment /></div></div>, 'value on the ring; progress null, then a number, on an attachment.'),
    beat('timing', 'Timing', 'Nothing shows for fast work. Once a sign shows, it stays long enough to read, then gives way to the result; a long wait says more. The Waiting timing panel sets every number on this page.', 'Press all three: the quick one goes straight to Saved; the brief one holds its arc for the minimum instead of flashing it.', <TimingKeys />, 'one clock, useWait; the same tokens in CSS, React and SwiftUI.'),
  ];
  return (
    <Timing.Provider value={timing}>
      <ComponentPage
        title="Spinner"
        lede="Waiting, shown where it happens. A key holds its own wait, a small item’s glyph becomes a ring, a card’s edge waits, a field’s trailing slot turns, a place shows skeletons and a thin bar, background work breathes a lamp. One clock decides when any of it shows."
        play={{ lede: 'Press Save, apply the tag, archive the row, lift the subject, search. Set the work under 400 ms in the Waiting timing panel and nothing shows but the result.', caption: 'a key · a chip · a row · a card · a field', node: <Placements /> }}
        more={more}
        capture="spinner"
        usage={`const wait = useWait(work); // 'idle' | 'working' | 'done' | 'failed'

<Row variant="option" waiting={wait.busy}>
  <Spinner phase={wait.phase} label="Archiving notes.pdf" result="Archived">
    <DocumentIcon />
  </Spinner>
  <Row.Text>notes.pdf</Row.Text>
</Row>`}
        sources={[
          { id: 'react', label: 'React', code: `${reactSource}\n\n// motion/wait.ts\n\n${waitSource}` },
          { id: 'css', label: 'CSS', code: cssSource },
          { id: 'swift', label: 'SwiftUI', code: swiftSource },
          { id: 'agent', label: 'Agent guide', code: agentSource },
        ]}
        rules={[
          { id: 'SP1', title: 'Where the wait is', body: 'In the key, the item’s glyph slot, the card’s edge, the field’s trailing slot, the top of the place, the status lamp. Never a spinner floating in the middle or in a corner.', origin: 'Ours' },
          { id: 'SP2', title: 'Nothing for fast work', body: 'A sign shows only after 400 ms; work that ends sooner goes straight to its result.', origin: 'Adapted · Apple HIG, Progress indicators' },
          { id: 'SP3', title: 'No flash', body: 'Once shown, a sign stays at least 600 ms, then the result: a check for a while, or the failure in words with Try again.', origin: 'Ours' },
          { id: 'SP4', title: 'Say more after a while', body: 'After 8 s the words say “Still …”, so a long wait never looks stuck.', origin: 'Ours' },
          { id: 'SP5', title: 'Measure when you can', body: 'As soon as the amount is known, fill rather than turn: the ring fills, a card hands over to Progress.', origin: 'Ours' },
          { id: 'SP6', title: 'In the host’s ink and size', body: 'The ring takes the slot’s size and colour: white on a primary key, ink2 in a row.', origin: 'Ours' },
          { id: 'SP7', title: 'Busy, then heard twice', body: 'aria-busy on the waiting thing; a polite status when the sign shows and when it is done, nothing in between. Reduce Motion: nothing turns; the sign breathes.', origin: 'Adapted · WAI-ARIA aria-busy' },
        ]}
      />
    </Timing.Provider>
  );
}
