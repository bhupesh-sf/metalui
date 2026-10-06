import * as React from 'react';
import { useDialKit } from 'dialkit';
import { IconButton, SelectionFrame, SwapText, ToolStrip, verbsFor, type ToolStripAnchor, type ToolStripItem } from '@unlocalhosted/metalui';
import { Icon } from '@unlocalhosted/metalui/icons';
import { type SpringName } from '../../../../../packages/metalui/src/motion/springs.generated';
import { SPRING_NAMES, springVars } from '../../ui/springTuning';
import reactSource from '../../../../../packages/metalui/src/blocks/tool-strip/tool-strip.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import agentGuide from '../../../../../packages/metalui/src/blocks/tool-strip/tool-strip.agent.md?raw';
import swiftSource from '../../../../../swift/Sources/MetalUI/Blocks/MetalToolStrip.swift?raw';
import { Bench, PageHeader, Rules, Section, SourceTabs } from '../../ui/doc';
import { SwiftCapture } from '../../ui/SwiftCapture';
import { UsageSection, useOwnCss } from '../../ui/Usage';

/* ─────────────────────────────────────────────────────────
 * A SMALL CANVAS: the strip adapts to what was clicked
 *
 *   click        a text block, an image or a link: the strip rises over it with that kind's verbs
 *   ⇧/⌘-click    adds or removes one: the strip morphs to the verbs every kind shares (Rename only for one)
 *   drag empty   pans the canvas; the zoom keys zoom it; the strip follows the selection at once
 *   click empty  clears the selection: the strip goes
 * The page's DialKit panel (Strip morph) swaps the morph's spring, stretches time and sets the narrow room.
 * ───────────────────────────────────────────────────────── */

type Kind = 'text' | 'image' | 'link';
interface Node { id: string; kind: Kind; x: number; y: number; w: number; h: number; title: string; body?: string }

const NODES: Node[] = [
  { id: 'brief', kind: 'text', x: 56, y: 120, w: 210, h: 92, title: 'Poster brief', body: 'Two colours, the venue, the date in large type.' },
  { id: 'untitled', kind: 'text', x: 292, y: 262, w: 150, h: 58, title: 'Untitled' },
  { id: 'photo', kind: 'image', x: 286, y: 92, w: 160, h: 116, title: 'venue.jpg' },
  { id: 'link', kind: 'link', x: 452, y: 160, w: 180, h: 48, title: 'printer.example/quote' },
];
const ZOOMS = [0.75, 1, 1.25];

function Canvas({ onSay }: { onSay: (s: string) => void }) {
  const [sel, setSel] = React.useState<string[]>([]);
  const [pan, setPan] = React.useState({ x: 0, y: 0 });
  const [zoom, setZoom] = React.useState(1);
  const [lifting, setLifting] = React.useState<'ready' | 'waiting' | 'done'>('ready');
  const drag = React.useRef<{ x: number; y: number; px: number; py: number; moved: boolean } | null>(null);

  const picked = NODES.filter((n) => sel.includes(n.id));
  const what = picked.length === 1 ? picked[0].title : `${picked.length} things`;
  const say = (verb: string) => () => onSay(`${verb} · ${what}`);
  const lift = () => {
    setLifting('waiting');
    window.setTimeout(() => { setLifting('done'); onSay(`Lifted the subject · ${what}`); }, 1600);
    window.setTimeout(() => setLifting('ready'), 2400);
  };
  const shared: ToolStripItem[] = [
    { label: 'Rename', icon: <Icon name="pen" />, single: true, shortcut: 'F2', onSelect: say('Rename') },
    { label: 'Gather', icon: <Icon name="group" />, onSelect: say('Gathered into a lens') },
    { label: 'Export', icon: <Icon name="share" />, onSelect: say('Copied as Markdown') },
    { label: 'Send away', icon: <Icon name="send-away" />, destructive: true, shortcut: '⌫', onSelect: () => onSay(`Sent away ${what} · Undo`) },
  ];
  const empty = picked.every((n) => !n.body);
  const items = verbsFor(picked.map((n) => n.kind), {
    text: [
      { label: 'Tasks', icon: <Icon name="task" />, onSelect: say('Made tasks') },
      { label: 'Summarise', icon: <Icon name="document" />, disabled: empty, disabledReason: 'nothing to summarise yet', onSelect: say('Summarised') },
      { label: 'Region', icon: <Icon name="region" />, onSelect: say('Wrapped in a region') },
      ...shared,
    ],
    image: [
      { label: 'Lift subject', icon: <Icon name="capture" />, state: lifting, onSelect: lift },
      { label: 'Copy', icon: <Icon name="copy" />, onSelect: say('Copied the image') },
      { label: 'Crop', icon: <Icon name="fit" />, onSelect: say('Cropping') },
      ...shared,
    ],
    link: [
      { label: 'Open', icon: <Icon name="external" />, onSelect: say('Opened') },
      { label: 'Copy link', icon: <Icon name="link" />, onSelect: say('Copied the link') },
      ...shared,
    ],
  });
  const anchor: ToolStripAnchor | undefined = picked.length ? picked.reduce<ToolStripAnchor | undefined>((a, n) => {
    const r = { x: n.x * zoom + pan.x, y: n.y * zoom + pan.y, width: n.w * zoom, height: n.h * zoom };
    if (!a) return r;
    const x = Math.min(a.x, r.x), y = Math.min(a.y, r.y);
    return { x, y, width: Math.max(a.x + a.width, r.x + r.width) - x, height: Math.max(a.y + a.height, r.y + r.height) - y };
  }, undefined) : undefined;

  const pick = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    const adds = e.shiftKey || e.metaKey || e.ctrlKey;
    setSel((s) => adds ? (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]) : [id]);
  };

  return (
    <div
      data-testid="strip-canvas"
      className="relative h-[380px] w-[720px] max-w-full touch-none select-none overflow-clip rounded-card cursor-grab active:cursor-grabbing"
      onPointerDown={(e) => { if ((e.target as Element).closest('[role="toolbar"]')) return; e.currentTarget.setPointerCapture(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y, moved: false }; }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d) return;
        const dx = e.clientX - d.x, dy = e.clientY - d.y;
        if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
        if (d.moved) setPan({ x: d.px + dx, y: d.py + dy });
      }}
      onPointerUp={() => { if (drag.current && !drag.current.moved) setSel([]); drag.current = null; }}
    >
      <div className="absolute left-0 top-0 origin-top-left" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
        {NODES.map((n) => (
          <div
            key={n.id}
            role="button"
            tabIndex={-1}
            aria-pressed={sel.includes(n.id)}
            aria-label={`${n.kind === 'text' ? 'Text block' : n.kind === 'image' ? 'Image' : 'Link'} ${n.title}`}
            data-node={n.id}
            className={`absolute cursor-default ${n.kind === 'link' ? 'rounded-pill material-raised flex items-center gap-8 px-16' : n.kind === 'image' ? 'rounded-card material-raised grid place-items-center' : 'rounded-card material-raised px-18 py-14'}`}
            style={{ left: n.x, top: n.y, width: n.w, height: n.h }}
            onPointerDown={(e) => pick(e, n.id)}
          >
            {n.kind === 'text' && (<><div className="type-ui text-ink">{n.title}</div>{n.body ? <div className="type-meta mt-4 text-ink2">{n.body}</div> : <div className="type-meta mt-4 text-ink3">Empty</div>}</>)}
            {n.kind === 'image' && (<><Icon name="image" className="size-32 text-ink3" /><span className="type-meta absolute bottom-10 left-14 text-ink2">{n.title}</span></>)}
            {n.kind === 'link' && (<><Icon name="link" className="size-16 text-ink2" /><span className="type-meta truncate text-ink">{n.title}</span></>)}
            {sel.includes(n.id) && <SelectionFrame state="selected" variant={sel.length > 1 ? 'lite' : 'ring'} handles="none" readout={false} entrance={false} radius={n.kind === 'link' ? n.h / 2 : 24} />}
          </div>
        ))}
      </div>
      {anchor && <ToolStrip label={what} anchor={anchor} items={items} wordClassName="sr-only" />}
      <div className="absolute bottom-10 right-10 flex gap-4" onPointerDown={(e) => e.stopPropagation()}>
        <IconButton label="Zoom out" icon={<Icon name="zoom-out" />} disabled={zoom === ZOOMS[0]} onClick={() => setZoom(ZOOMS[ZOOMS.indexOf(zoom) - 1])} />
        <IconButton label="Zoom in" icon={<Icon name="zoom-in" />} disabled={zoom === ZOOMS[ZOOMS.length - 1]} onClick={() => setZoom(ZOOMS[ZOOMS.indexOf(zoom) + 1])} />
      </div>
    </div>
  );
}

const TEXT_VERBS = (say: (s: string) => () => void): ToolStripItem[] => [
  { label: 'Tasks', icon: <Icon name="task" />, onSelect: say('Made tasks') },
  { label: 'Summarise', icon: <Icon name="document" />, onSelect: say('Summarised') },
  { label: 'Region', icon: <Icon name="region" />, onSelect: say('Wrapped in a region') },
  { label: 'Gather', icon: <Icon name="group" />, onSelect: say('Gathered into a lens') },
  { label: 'Export', icon: <Icon name="share" />, onSelect: say('Copied as Markdown') },
  { label: 'Send away', icon: <Icon name="send-away" />, destructive: true, onSelect: say('Sent away · Undo') },
];

export default function ToolStripPage() {
  const ownCss = useOwnCss(cssSource);
  const d = useDialKit('Strip morph', {
    spring: { type: 'select', options: SPRING_NAMES, default: 'settle' },
    slow: [1, 1, 10],
    room: [300, 200, 640, 10],
  });
  const [said, setSaid] = React.useState('Click a block, an image or a link; ⇧-click to add');
  const [stateSaid, setStateSaid] = React.useState('Hover a verb for its name');
  const [roomSaid, setRoomSaid] = React.useState('The rest are in More');
  const [listSaid, setListSaid] = React.useState('Pick a verb');
  const [lifting, setLifting] = React.useState(false);
  const morph = springVars('settle', d.spring as SpringName, d.slow) as React.CSSProperties;
  return (
    <>
      <PageHeader title="Tool strip" lede="Verbs over a selection, adapted to it: a graphite strip that rises over what you clicked with the verbs that apply to it (a text block, an image, a link, or the ones several share), placed at the selection and following it, morphing when the selection changes. A selection made by finishing is quiet and never raises it. Built on Base UI Toolbar." />
      <Section title="Over a selection" lede="Click a text block, the image or the link; ⇧-click adds another, and the strip keeps only the verbs they share. Kept verbs glide, the rest fade, and the plate settles to its new width. Drag the canvas or zoom: the strip follows. It sits above the selection, below it when there's no room, and inside the canvas's edges.">
        <Bench caption={said} className="flex-col" style={morph}>
          <Canvas onSay={setSaid} />
        </Bench>
        <SwiftCapture name="tool-strip" maxWidth={560} />
      </Section>
      <Section title="States" lede="A disabled verb says why in its tooltip; a verb at work shows the wait in its own key (the glyph turns into the arc); an irreversible destructive verb fills while held and runs only at the end.">
        <Bench caption={stateSaid} className="min-h-[160px]">
          <ToolStrip
            label="2 things in the past"
            wordClassName="sr-only"
            items={[
              { label: 'Bring back', icon: <Icon name="undo" />, onSelect: () => setStateSaid('Brought back 2 things') },
              { label: 'Summarise', icon: <Icon name="document" />, disabled: true, disabledReason: 'nothing to summarise yet' },
              { label: 'Lift subject', icon: <Icon name="capture" />, state: lifting ? 'waiting' : 'ready', onSelect: () => { setLifting(true); setStateSaid('Lifting the subject…'); window.setTimeout(() => { setLifting(false); setStateSaid('Lifted the subject'); }, 2000); } },
              { label: 'Erase', icon: <Icon name="trash" />, destructive: true, hold: true, onSelect: () => setStateSaid('Erased 2 things for good') },
            ]}
          />
        </Bench>
      </Section>
      <Section title="When the verbs don't fit" lede="In a narrow room (the Strip morph panel's room) the verbs that don't fit go into More, before the destructive verb, which stays last and apart.">
        <Bench caption={roomSaid} className="min-h-[200px]">
          <div data-testid="narrow-room" className="@container grid justify-items-center" style={{ width: d.room }}>
            <ToolStrip label="the poster brief" items={TEXT_VERBS((s) => () => setRoomSaid(s))} />
          </div>
        </Bench>
      </Section>
      <Section title="Over a list" lede="Over rows picked in a list, the strip leads with the count, its verbs carry glyphs, a verb with choices opens its menu above the strip, and a close key ends the selection. This is the task inbox's strip.">
        <Bench caption={listSaid} className="min-h-[160px]">
          <ToolStrip
            label="3 selected tasks"
            count={<span className="type-ui tabular-nums text-toolstrip-ink-hover"><SwapText value="3 selected" /></span>}
            items={[
              { label: 'Complete', icon: <Icon name="check" />, shortcut: 'E', onSelect: () => setListSaid('Completed 3 tasks · Undo') },
              { label: 'Snooze', icon: <Icon name="clock" />, menu: { heading: 'Snooze until', items: [
                { label: 'Tomorrow', onSelect: () => setListSaid('Snoozed 3 tasks until tomorrow') },
                { label: 'Next week', onSelect: () => setListSaid('Snoozed 3 tasks until next week') },
              ] } },
              { label: 'Delete', icon: <Icon name="trash" />, destructive: true, onSelect: () => setListSaid('Deleted 3 tasks · Undo') },
              { label: 'Clear selection', icon: <Icon name="close" />, iconOnly: true, shortcut: 'Escape', onSelect: () => setListSaid('Selection cleared') },
            ]}
          />
        </Bench>
      </Section>
      <UsageSection agent={agentGuide} />
      <Section title="Source">
        <SourceTabs tabs={[
          { id: 'react', label: 'React', code: reactSource },
          { id: 'css', label: 'CSS', code: ownCss },
          { id: 'swift', label: 'SwiftUI', code: swiftSource },
          { id: 'agent', label: 'Agent guide', code: agentGuide },
        ]} />
      </Section>
      <Section title="Rules">
        <Rules rules={[
          { id: 'T1', title: 'Only for a click selection', body: 'A selection made by finishing is quiet; never while dragging, resizing, in the past or with the palette open.', origin: 'DS-31' },
          { id: 'T2', title: 'Every verb says what it did', body: 'A toast names the result and offers Undo: Made 3 tasks, Sent away 3 blocks.', origin: 'reference brief' },
          { id: 'T3', title: 'One destructive verb, last', body: 'After the engraved separator, in the warm red, never folded into More. Canvas delete is send away; an irreversible one holds to confirm.', origin: 'DS-33' },
          { id: 'T4', title: 'The selection decides the verbs', body: 'Each kind has its verbs; several show only the ones they share, in a stable order; Rename only for one.', origin: 'Owner, 2026-09-30' },
          { id: 'T5', title: 'A new selection morphs the strip', body: 'Kept verbs stay where they are and glide; the rest fade; the plate settles to its width. Nothing jumps.', origin: 'Ours' },
        ]} />
      </Section>
    </>
  );
}
