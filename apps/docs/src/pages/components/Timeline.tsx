import * as React from 'react';
import { useDialKit } from 'dialkit';
import { Button, Switch, Timeline, type TimelineEvent, type TimelineState } from '@unlocalhosted/metalui';
import { DocumentIcon, NoteIcon, PenIcon, ShareIcon, TagIcon, UploadIcon } from '@unlocalhosted/metalui/icons';
import { type SpringName } from '../../../../../packages/metalui/src/motion/springs.generated';
import { SPRING_NAMES, springVars } from '../../ui/springTuning';
import reactSource from '../../../../../packages/metalui/src/components/timeline/timeline.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import swiftSource from '../../../../../swift/Sources/MetalUI/Components/MetalTimeline.swift?raw';
import agentSource from '../../../../../packages/metalui/src/components/timeline/timeline.agent.md?raw';
import { ComponentPage } from '../../ui/ComponentPage';

/* ─────────────────────────────────────────────────────────
 * TIMELINE PAGE · records read top to bottom, where they are used
 *
 *   order     a parcel's status, oldest first: the next scan moves it along; the expected
 *             delivery is planned, under the now marker, until it arrives
 *   ci        a pipeline's steps: Run starts it; each step runs on the Spinner's clock and takes
 *             its duration; a broken test turns red and the deploy stays planned
 *   feed      who did what on a board, newest first, with glyphs: new activity lands from above
 *   roadmap   dates on the left: what shipped, what is planned, and where now is
 *   narrow    the feed in a sidebar: times move under the titles
 *   tune      DialKit: the arrival's and the glide's springs, time stretched; flip one event's state
 * ───────────────────────────────────────────────────────── */

const MIN = 60_000, HOUR = 60 * MIN, DAY = 24 * HOUR;
const NOW = new Date();
const ago = (ms: number) => new Date(NOW.getTime() - ms);

/* ── an order's status ───────────────────────────────────── */

const SCANS: TimelineEvent[] = [
  { id: 'placed', title: 'Order placed', description: '3 prints, €60', time: ago(2 * DAY + 3 * HOUR) },
  { id: 'packed', title: 'Packed', description: 'Rua da Rosa studio, Lisbon', time: ago(DAY + 5 * HOUR) },
  { id: 'shipped', title: 'Shipped', description: 'CTT Expresso · RR 4312 PT', time: ago(DAY) },
  { id: 'hub', title: 'At the Porto hub', description: 'Sorted for delivery', time: ago(3 * HOUR) },
  { id: 'out', title: 'Out for delivery', description: 'Van 12, before 18:00', time: ago(25 * MIN) },
  { id: 'delivered', title: 'Delivered', description: 'Left with the concierge', time: NOW },
];

function Order() {
  const [at, setAt] = React.useState(4);
  const events: TimelineEvent[] = SCANS.slice(0, at + 1).map((e, i) => ({ ...e, state: i === at && at < SCANS.length - 1 ? 'live' : 'done' }));
  if (at < SCANS.length - 1) events.push({ id: 'expected', title: 'Expected delivery', description: 'Thursday, before 18:00', time: new Date(NOW.getTime() + 2 * DAY), state: 'planned' });
  return (
    <div className="grid w-full max-w-[520px] gap-16">
      <Timeline aria-label="Order 4312" events={events} format="datetime" now={NOW} />
      <div className="flex gap-8">
        <Button size="compact" disabled={at === SCANS.length - 1} onClick={() => setAt((a) => a + 1)}>Next scan</Button>
        <Button size="compact" onClick={() => setAt(2)}>Start over</Button>
      </div>
    </div>
  );
}

/* ── a pipeline's steps ──────────────────────────────────── */

const STEPS = [
  { id: 'checkout', title: 'Checkout', took: 900 },
  { id: 'install', title: 'Install', took: 1600 },
  { id: 'lint', title: 'Lint', took: 700 },
  { id: 'test', title: 'Test', took: 2200 },
  { id: 'deploy', title: 'Deploy to production', took: 1400 },
];
const SCALE = 24; // a docs second stands for 24 of the pipeline's

function Pipeline() {
  const [run, setRun] = React.useState<{ at: number; failed: boolean; approved: boolean } | null>(null);
  const [broken, setBroken] = React.useState(false);
  const timer = React.useRef(0);
  React.useEffect(() => () => window.clearTimeout(timer.current), []);
  const waiting = !!run && STEPS[run.at]?.id === 'deploy' && !run.approved;
  React.useEffect(() => {
    if (!run || run.failed || run.at >= STEPS.length || waiting) return;
    const step = STEPS[run.at];
    timer.current = window.setTimeout(() => {
      setRun((r) => r && (step.id === 'test' && broken ? { ...r, failed: true } : { ...r, at: r.at + 1 }));
    }, step.took);
    return () => window.clearTimeout(timer.current);
  }, [run, broken, waiting]);
  const state = (i: number): TimelineState => {
    if (!run) return 'planned';
    if (i < run.at) return 'done';
    if (i === run.at) return run.failed ? 'failed' : waiting ? 'waiting' : 'running';
    return 'planned';
  };
  const said = (id: string, i: number) => {
    if (run?.failed && i === run.at) return '2 of 148 tests failed · canvas/snap.spec.ts';
    if (id === 'deploy') return waiting && i === run?.at ? 'metalui.dev · needs an approval' : 'metalui.dev';
    return undefined;
  };
  const events: TimelineEvent[] = STEPS.map((s, i) => ({
    id: s.id,
    title: s.title,
    state: state(i),
    duration: run && (i < run.at || (i === run.at && run.failed)) ? s.took * SCALE : undefined,
    description: said(s.id, i),
  }));
  const running = !!run && !run.failed && run.at < STEPS.length;
  return (
    <div className="grid w-full max-w-[520px] gap-16">
      <Timeline aria-label="Pipeline run" events={events} />
      <div className="flex items-center gap-16">
        {waiting
          ? <Button size="compact" cap="primary" onClick={() => setRun((r) => r && { ...r, approved: true })}>Approve deploy</Button>
          : <Button size="compact" cap="primary" disabled={running} onClick={() => setRun({ at: 0, failed: false, approved: false })}>{run ? 'Run again' : 'Run'}</Button>}
        <Switch label="Break a test" checked={broken} onCheckedChange={setBroken} />
      </div>
    </div>
  );
}

/* ── an activity feed ────────────────────────────────────── */

const FEED: TimelineEvent[] = [
  { id: 'f5', title: 'Ana is editing Alfama sketches', time: ago(MIN), state: 'live', glyph: <PenIcon /> },
  { id: 'f4', title: 'Rui tagged 6 notes Lisbon', time: ago(12 * MIN), glyph: <TagIcon /> },
  { id: 'f3', title: 'Ana uploaded 3 photos', description: 'Tram 28, Tiles, River light', time: ago(2 * HOUR), glyph: <UploadIcon /> },
  { id: 'f2', title: 'Ana shared Alfama sketches with Rui', time: ago(5 * HOUR), glyph: <ShareIcon /> },
  { id: 'f1', title: 'Board created', description: 'From the Lisbon template', time: ago(3 * DAY), glyph: <DocumentIcon /> },
];
const ARRIVALS: TimelineEvent[] = [
  { id: 'a1', title: 'Rui commented on River light', description: '“Warmer, like the 6 pm one”', glyph: <NoteIcon /> },
  { id: 'a2', title: 'Rui moved 4 notes to Belém', glyph: <NoteIcon /> },
  { id: 'a3', title: 'Rui uploaded 2 photos', glyph: <UploadIcon /> },
];

function Feed({ label = 'Board activity', live = true }: { label?: string; live?: boolean }) {
  const [events, setEvents] = React.useState(FEED);
  const [next, setNext] = React.useState(0);
  const add = () => {
    const now = new Date();
    setEvents((list) => [{ ...ARRIVALS[next % ARRIVALS.length], id: `a${next}`, time: now }, ...list]);
    setNext((n) => n + 1);
  };
  return (
    <div className="grid w-full gap-16">
      <Timeline aria-label={label} events={events} />
      {live && <div><Button size="compact" onClick={add}>New activity</Button></div>}
    </div>
  );
}

/* ── a roadmap, dates on the left ────────────────────────── */

const ROADMAP: TimelineEvent[] = [
  { id: 'r1', title: 'Boards', description: 'Canvases grouped by place', time: ago(80 * DAY) },
  { id: 'r2', title: 'Offline sync', description: 'Edits wait and merge', time: ago(31 * DAY) },
  { id: 'r3', title: 'Shared regions', description: 'Rolling out to 20 % of teams', time: ago(4 * DAY), state: 'live' },
  { id: 'r4', title: 'Comments on photos', time: new Date(NOW.getTime() + 18 * DAY), state: 'planned' },
  { id: 'r5', title: 'iPad app', description: 'Pencil and the same canvas', time: new Date(NOW.getTime() + 70 * DAY), state: 'planned' },
];

/* TIMELINE TUNER: the page's DialKit panel. land and glide swap the arrival's springs; slow stretches every
 * duration; side, glyphs and format change the layout; state flips the newest event, so its lamp's gesture
 * plays (flicker to live, two blinks to failed) and running shows the ring. */
function Tuner() {
  const d = useDialKit('Timeline', {
    land: { type: 'select', options: SPRING_NAMES, default: 'object' },
    glide: { type: 'select', options: SPRING_NAMES, default: 'settle' },
    slow: [1, 1, 10],
    side: { type: 'select', options: ['end', 'start'], default: 'end' },
    format: { type: 'select', options: ['relative', 'date', 'time', 'datetime'], default: 'relative' },
    glyphs: false,
    state: { type: 'select', options: ['live', 'running', 'waiting', 'failed', 'done'], default: 'live' },
  });
  const [extra, setExtra] = React.useState(0);
  const vars = {
    ...springVars('object', d.land as SpringName, d.slow),
    ...springVars('settle', d.glide as SpringName, d.slow),
  } as React.CSSProperties;
  const glyph = (g: React.ReactElement) => (d.glyphs ? g : undefined);
  const events: TimelineEvent[] = [
    ...Array.from({ length: extra }, (_, i) => ({ id: `x${extra - i}`, title: `Note ${extra - i} added`, time: NOW, glyph: glyph(<NoteIcon />) })),
    { id: 't3', title: 'Export to PDF', description: 'Alfama sketches, 12 pages', time: ago(2 * MIN), state: d.state as TimelineState, glyph: glyph(<DocumentIcon />) },
    { id: 't2', title: 'Photos uploaded', time: ago(40 * MIN), glyph: glyph(<UploadIcon />) },
    { id: 't1', title: 'Board created', time: ago(2 * DAY), glyph: glyph(<PenIcon />) },
  ];
  return (
    <div data-testid="timeline-tuner" className="grid w-full max-w-[520px] gap-16 justify-self-center" style={vars}>
      <Timeline aria-label="Tuned activity" events={events} now={NOW} format={d.format as 'relative'} timeSide={d.side as 'end' | 'start'} />
      <div className="flex gap-8">
        <Button size="compact" onClick={() => setExtra((n) => n + 1)}>Add an event</Button>
        <Button size="compact" disabled={!extra} onClick={() => setExtra(0)}>Clear</Button>
      </div>
    </div>
  );
}

export default function TimelinePage() {
  return (
    <ComponentPage
      capture="timeline"
      title="Timeline"
      lede="A record of what happened and what is planned, read top to bottom: lamps that say each event's state, times in tabular figures, and a now marker where the past meets the plan."
      play={{ lede: 'Press Next scan to move the parcel along: the live lamp follows it, and the expected delivery waits under the now marker until it arrives. Hover a time for the exact one.', caption: "an order's status", wide: true, node: <div className="flex w-full justify-center"><Order /></div> }}
      more={[
        { id: 'pipeline', title: 'A pipeline', lede: 'Each step runs on the Spinner\'s clock and keeps its duration. The deploy waits, amber, for an approval. Break a test and run again: the step turns red with two blinks and says what failed, and the deploy stays planned.', node: <div className="flex w-full justify-center"><Pipeline /></div> },
        { id: 'feed', title: 'An activity feed', lede: 'Newest first, with the host\'s glyphs in sunk wells on the rail. New activity lands from above and the rest glide down; a reader hears it once.', node: <div className="flex w-full justify-center"><div className="w-full max-w-[520px]"><Feed /></div></div> },
        { id: 'roadmap', title: 'Dates on the left', lede: 'timeSide="start" stands the dates in a column before the rail. What shipped, what is rolling out now, and what is planned past the now marker.', node: <div className="flex w-full justify-center"><div className="w-full max-w-[520px]"><Timeline aria-label="Roadmap" events={ROADMAP} format="date" now={NOW} timeSide="start" /></div></div> },
        { id: 'narrow', title: 'Out of width', lede: 'Under 360 px the times move under the titles, so a title never squeezes beside a date.', node: <div className="flex w-full justify-center"><div className="w-full max-w-[300px]"><Feed label="Narrow board activity" live={false} /></div></div> },
        { id: 'tune', title: 'Tune the timeline', lede: 'The Timeline panel swaps the arrival\'s and the glide\'s springs, stretches time, moves the times, turns glyphs on and flips the newest event\'s state.', node: <Tuner /> },
      ]}
      usage={`<Timeline
  aria-label="Order 4312"
  format="datetime"
  events={[
    { id: 'placed', title: 'Order placed', time: placedAt },
    { id: 'out', title: 'Out for delivery', time: outAt, state: 'live' },
    { id: 'expected', title: 'Expected delivery', time: eta, state: 'planned' },
  ]}
/>`}
      sources={[
        { id: 'react', label: 'React', code: reactSource },
        { id: 'css', label: 'CSS', code: cssSource },
        { id: 'swift', label: 'SwiftUI', code: swiftSource },
        { id: 'agent', label: 'Agent guide', code: agentSource },
      ]}
      rules={[
        { id: 'TL1', title: 'A lamp has a word', body: 'Live, Running, Waiting and Failed are written beside the time; colour never says a state alone.', origin: 'Ours' },
        { id: 'TL2', title: 'Now comes from the states', body: 'The now marker sits where events turn planned, so it can never disagree with them.', origin: 'Ours' },
        { id: 'TL3', title: 'News blinks, history doesn\'t', body: 'A lamp plays its gesture only when its state changes on screen; a page that opens on a failure shows it steady.', origin: 'Ours' },
      ]}
    />
  );
}
