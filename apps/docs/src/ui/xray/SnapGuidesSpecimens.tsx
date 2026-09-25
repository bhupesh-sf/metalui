import * as React from 'react';
import { Row, SnapGuides, Surface, Switch, type SnapGuide } from '@unlocalhosted/metalui';
import { tokens } from '../../lib/tokens';
import { snapMove, type Box } from '../snapdemo';
import { Readout, blip, clamp, summon, useHandle, useOnLand, useSpecimenZoom } from '../edit';
import './snap-guides-specimens.css';

/* ─────────────────────────────────────────────────────────
 * THE SNAP GUIDES' SPECIMENS · the x-ray card for each part
 *
 *   The card holds a small canvas with the real SnapGuides between two real notes; the
 *   model on the bench reads the same values.
 *     catch      drag the note sideways: inside a band it jumps onto the line (⌘ drags free)
 *     line       drag the canvas up or down to zoom: the line stays one point on screen
 *     centre     drag along the dashed line between the notes to change its dash
 *     overshoot  drag the lines' lower tips to change how far they run past the notes
 *     timing     press and hold the note, then let go: the lines fade on release
 *   Nothing here steps: the guides have no sizes or kinds to choose (edge or centre is
 *   whatever lines up), so every handle is a tunable or a switch.
 *
 * This file owns the model and the scene geometry; the x-ray imports them. It never reads
 * from SnapGuidesXray (the x-ray imports this file, so that would be a circular import).
 * ───────────────────────────────────────────────────────── */

export const PR = tokens.presence as unknown as { 'snap-threshold': number; 'guide-overshoot': number; 'guide-dash': number; 'guide-width': number };

/** The note that stays put, and the note you drag (its x comes from the model). */
export const A: Box = { id: 'a', x: 40, y: 0, w: 120, h: 44 };
export const B0 = { id: 'b', y: 80, w: 120, h: 44 };
/** The canvas zoom the page promises the guides hold at (rule SN3: 25 % to 300 %). */
export const ZOOM = { min: 0.25, max: 3 };
/** How far either way the note can be dragged, in canvas points. */
const REACH = 30;

export type Spot = 'slide' | 'shape' | 'states' | 'surface' | 'press';
export interface Model {
  /** Where you drag the note, from lined up with the other one (canvas points). */
  dx: number;
  /** Still dragging: the guides show; let go and they fade. */
  held: boolean;
  /** ⌘ held: no snapping, no guides. */
  cmd: boolean;
  /** The canvas zoom (1 at 100 %). */
  zoom: number;
  /** The centre line's dash, and the overshoot past the notes, in screen points. */
  dash: number;
  over: number;
}
export const INITIAL: Model = { dx: 4, held: true, cmd: false, zoom: 1, dash: PR['guide-dash'], over: PR['guide-overshoot'] };

/** The snap for this model: where the note would be, where it is, and the lines that explain it. */
export function snapOf(m: Model) {
  const free: Box = { ...B0, x: A.x + m.dx };
  const snap = m.cmd ? { box: free, guides: [] as SnapGuide[] } : snapMove(free, [A], PR['snap-threshold'], m.zoom);
  return { free, box: snap.box, guides: m.held ? snap.guides : [], caught: snap.guides.length > 0 };
}

/**
 * The guides with the overshoot tuned: the component adds its token overshoot (read at run
 * time from the theme) past both ends, so a tuned overshoot extends each line by the
 * difference, in the same units the component is drawn in (screen points / scale).
 */
export function stretch(guides: SnapGuide[], over: number, scale: number): SnapGuide[] {
  const more = (over - PR['guide-overshoot']) / scale;
  return guides.map((g) => ({ ...g, start: Math.min(g.start, g.end) - more, end: Math.max(g.start, g.end) + more }));
}

const round = (v: number, step: number) => Math.round(v / step) * step;
const fmt = (v: number) => `${Number(v.toFixed(2))}`;
const token = (v: number, at: number, name: string) => (v === at ? { at, name } : undefined);
const signed = (v: number) => `${v > 0 ? '+' : ''}${v}`;

type Props = { spot: Spot; m: Model; set: (patch: Partial<Model>) => void };

/* ───────────────────────── the canvas ───────────────────────── */

/** The canvas the specimen shows: 200 × 170 points, the notes' middle held still while it zooms. */
const FRAME = { w: 200, h: 170, top: 22 };
const MID = { x: A.x + A.w / 2, y: (A.y + B0.y + B0.h) / 2 };
/** A little smaller than the other specimens: this one is a whole patch of canvas, not one part. */
const CANVAS_ZOOM = 0.7;

function useCanvasZoom() {
  const [well, z] = useSpecimenZoom();
  return [well, z * CANVAS_ZOOM] as const;
}

/** A note on the canvas: the same Surface the canvas page uses. */
function Note({ b, words, className, style, children, ...rest }: { b: Box; words: string } & React.ComponentProps<'span'>) {
  return (
    <span className={['ed-snap-note', className].filter(Boolean).join(' ')} style={{ left: b.x, top: b.y, width: b.w, height: b.h, ...style }} {...rest}>
      <Surface material="raise-lite" radius="card" className="ed-snap-note-face"><span className="type-ui text-ink2">{words}</span></Surface>
      {children}
    </span>
  );
}

/**
 * The real SnapGuides between two notes. `note` is spread on the dragged note (a handle in
 * some cards), `frame` on the canvas (the zoom handle), and `children` are drawn in canvas
 * points above everything (the other handles).
 */
function Canvas({ m, zoom, bands, note, frame, children, frameRef, noteRef, peek }: {
  m: Model; zoom: number; bands?: boolean; note?: React.HTMLAttributes<HTMLSpanElement>; frame?: React.HTMLAttributes<HTMLDivElement>;
  children?: React.ReactNode; frameRef?: React.Ref<HTMLDivElement>; noteRef?: React.Ref<HTMLSpanElement>; peek?: string;
}) {
  const s = snapOf(m);
  const guides = React.useMemo(() => stretch(s.guides, m.over, m.zoom), [s.guides.map((g) => `${g.axis}${g.position}${g.start}${g.end}${g.kind}`).join('|'), m.over, m.zoom]); // eslint-disable-line react-hooks/exhaustive-deps
  const th = PR['snap-threshold'] / m.zoom;
  return (
    <div style={{ zoom }}>
      <div ref={frameRef} className="ed-snap-canvas" data-hint-anchor data-peek={peek} style={{ width: FRAME.w, height: FRAME.h }} {...frame}>
        <div className="ed-snap-world" style={{ top: FRAME.top, transform: `scale(${m.zoom})`, transformOrigin: `${MID.x}px ${MID.y}px`, ['--mu-presence-guide-dash' as string]: `${m.dash}px` }}>
          {bands && !m.cmd && [A.x, A.x + A.w / 2, A.x + A.w].map((x) => (
            <i key={x} className="ed-snap-band xr-catch" style={{ left: x - th, width: th * 2, top: A.y - 10, height: B0.y + B0.h - A.y + 20 }} />
          ))}
          <Note b={A} words="call the printer" />
          <SnapGuides guides={guides} scale={m.zoom} />
          <Note b={s.box} words="drag me" ref={noteRef} data-held={m.held ? '' : undefined} {...note} />
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * Bring the note back onto the line, so a card about the lines has lines to handle. The catch
 * is in screen points, so a note caught at 100 % can fall out of the band as you zoom in;
 * `anyZoom` puts it exactly on the line, where it stays caught at every zoom.
 */
const inLine = (m: Model, anyZoom = false): Partial<Model> => {
  const holds = anyZoom ? Math.abs(m.dx) <= PR['snap-threshold'] / ZOOM.max : snapOf({ ...m, cmd: false }).caught;
  return holds ? { held: true, cmd: false } : { dx: 0, held: true, cmd: false };
};

/* ───────────────────────── the cards ───────────────────────── */

function Catch({ m, set }: Props) {
  const [well, zoom] = useCanvasZoom();
  const [live, setLive] = React.useState(false);
  const [peek, setPeek] = React.useState(false);
  const note = React.useRef<HTMLSpanElement>(null);
  const s = snapOf(m);
  const move = (dx: number) => set({ dx: clamp(Math.round(dx), -REACH, REACH), held: true });
  const handle = useHandle({
    zoom: zoom * m.zoom,
    hint: () => ({ gesture: 'sides', title: 'Where you drag', value: live ? `${signed(m.dx)}pt${m.cmd ? ' · free' : s.caught ? ' · on the line' : ''}` : undefined, how: 'drag the note sideways', keys: [{ k: '⌘', say: 'free' }] }),
    keyHint: () => ({ gesture: 'sides', title: 'Where you drag', value: `${signed(m.dx)}pt`, keys: [{ k: '←→', say: 'move' }] }),
    // a real ⌘ held while dragging drags free, as on the canvas; the switch below holds it down for you
    start: () => ({ dx: m.dx, cmd: m.cmd }),
    move: (st, dx, _dy, e) => { setLive(true); set({ dx: clamp(Math.round(st.dx + dx), -REACH, REACH), held: true, cmd: st.cmd || e.metaKey }); },
    end: () => setLive(false),
    step: (d) => move(m.dx + d), axis: 'x', over: setPeek,
  });
  // the line blips the moment the note catches it
  useOnLand(live && s.caught && !m.cmd ? `${s.box.x}` : undefined, () => well.current && blip(...Array.from(well.current.querySelectorAll('.mu-snap-guides path'))));
  return <>
    <p>Around the other note's edges and centre there is an invisible band; drag the note sideways and it jumps onto the line when it enters one.</p>
    <div ref={well} className="ed-specimen">
      <Canvas m={m} zoom={zoom} bands noteRef={note} peek={peek || live ? '' : undefined}
        note={{ className: 'is-handle is-x', role: 'slider', tabIndex: 0, 'aria-label': 'Where you drag', 'aria-valuenow': m.dx, 'aria-valuemin': -REACH, 'aria-valuemax': REACH, 'aria-valuetext': `${m.dx} points${s.caught && !m.cmd ? ', on the line' : ''}`, ...handle } as React.HTMLAttributes<HTMLSpanElement>} />
    </div>
    <div className="ed-readouts">
      <Readout label="Where you drag" value={signed(m.dx)} snap={s.caught && !m.cmd ? { at: s.box.x - A.x, name: 'on the line' } : undefined} peek={setPeek} pick={() => summon(note.current)} scrub={(d) => move(m.dx + d)} />
      <Readout label="Catch distance" value={`${PR['snap-threshold']}`} snap={{ at: PR['snap-threshold'], name: 'snap threshold' }} />
    </div>
    <div className="ed-layers">
      <Row.Root variant="list" className="ed-layer" data-off={m.cmd ? undefined : ''} onClick={(e) => { if (!(e.target as HTMLElement).closest('.mu-switch')) set({ cmd: !m.cmd }); }}>
        <Row.Text>Hold ⌘</Row.Text>
        <Row.Trail><Switch size="small" aria-label="Hold ⌘" checked={m.cmd} onCheckedChange={(v) => set({ cmd: v })} /></Row.Trail>
      </Row.Root>
    </div>
  </>;
}

function Line({ m, set }: Props) {
  const [well, zoom] = useCanvasZoom();
  const [live, setLive] = React.useState(false);
  const [peek, setPeek] = React.useState(false);
  const frame = React.useRef<HTMLDivElement>(null);
  const change = (z: number, caught = true) => { const n = round(clamp(z, ZOOM.min, ZOOM.max), 0.01); set({ zoom: caught && Math.abs(n - 1) <= 0.06 ? 1 : Number(n.toFixed(2)) }); };
  const pct = Math.round(m.zoom * 100);
  const handle = useHandle({
    zoom,
    hint: () => ({ gesture: 'press', title: 'Zoom', value: live ? `${pct}%` : undefined, how: 'drag the canvas up to zoom in' }),
    keyHint: () => ({ gesture: 'press', title: 'Zoom', value: `${pct}%`, keys: [{ k: '↑↓', say: 'zoom' }] }),
    start: () => m.zoom,
    // up zooms in: every 40 points doubles it, so 25 % to 300 % is one easy drag
    move: (z0, _dx, dy) => { setLive(true); change(z0 * 2 ** (-dy / 40)); },
    end: () => setLive(false),
    step: (d) => { set(inLine(m, true)); change(round(m.zoom + d * 0.25, 0.25), false); }, axis: 'y', over: setPeek,
    grab: () => set(inLine(m, true)),
  });
  useOnLand(live && m.zoom === 1 ? 'one' : undefined, () => frame.current && blip(...Array.from(frame.current.querySelectorAll('.mu-snap-guides path'))));
  return <>
    <p>A guide is one point wide on your screen at every zoom, so it never covers what it lines up; drag the canvas up or down to zoom and watch the line stay thin.</p>
    <div ref={well} className="ed-specimen">
      <Canvas m={m} zoom={zoom} frameRef={frame} peek={peek || live ? '' : undefined}
        frame={{ className: 'ed-snap-canvas is-handle is-y', role: 'slider', tabIndex: 0, 'aria-label': 'Zoom', 'aria-valuenow': pct, 'aria-valuemin': ZOOM.min * 100, 'aria-valuemax': ZOOM.max * 100, 'aria-valuetext': `${pct} percent`, ...handle } as React.HTMLAttributes<HTMLDivElement>} />
    </div>
    <div className="ed-readouts">
      <Readout label="Zoom" value={`${pct}`} unit="%" snap={token(m.zoom, 1, 'actual size')} peek={setPeek} pick={() => summon(frame.current)} scrub={(d) => { set(inLine(m, true)); change(round(m.zoom + d * 0.25, 0.25), false); }} />
      <Readout label="Line on screen" value={`${PR['guide-width']}`} snap={{ at: PR['guide-width'], name: 'guide width' }} />
      <Readout label="Line in the canvas" value={fmt(PR['guide-width'] / m.zoom)} snap={token(m.zoom, 1, 'guide width')} />
    </div>
  </>;
}

function Centre({ m, set }: Props) {
  const [well, zoom] = useCanvasZoom();
  const [live, setLive] = React.useState(false);
  const [peek, setPeek] = React.useState(false);
  const ref = React.useRef<HTMLSpanElement>(null);
  const change = (v: number, caught = true) => { const n = round(clamp(v, 1, 9), 0.1); set({ dash: caught && Math.abs(n - PR['guide-dash']) <= 0.3 ? PR['guide-dash'] : Number(n.toFixed(1)) }); };
  const handle = useHandle({
    zoom: zoom * m.zoom,
    hint: () => ({ gesture: 'press', title: 'Dash', value: live ? `${m.dash}pt` : undefined, how: 'drag along the dashed line to lengthen its dashes' }),
    keyHint: () => ({ gesture: 'press', title: 'Dash', value: `${m.dash}pt`, keys: [{ k: '↑↓', say: 'change' }] }),
    start: () => m.dash,
    move: (d0, _dx, dy) => { setLive(true); change(d0 + (dy * m.zoom) / 3); },
    end: () => setLive(false),
    step: (d) => change(m.dash + d * 0.5), axis: 'y', over: setPeek,
    grab: () => set(inLine(m)),
  });
  useOnLand(live && m.dash === PR['guide-dash'] ? 'dash' : undefined, () => well.current && blip(well.current.querySelector('.mu-snap-guides path + path')));
  // the handle is the stretch of the dashed line in the gap between the notes, where it crosses no words
  const x = A.x + A.w / 2, top = A.y + A.h, gap = B0.y - top;
  return <>
    <p>A solid line means two edges line up and a dashed line means two centres do; drag along the dashed line between the notes to change its dashes.</p>
    <div ref={well} className="ed-specimen">
      <Canvas m={m} zoom={zoom} peek={peek || live ? '' : undefined}>
        <span ref={ref} className="ed-snap-grip is-y" data-live={live ? '' : undefined} data-peek={peek ? '' : undefined} style={{ left: x - 5, top: top + 4, width: 10, height: gap - 8 }}
          role="slider" tabIndex={0} aria-label="Dash" aria-valuenow={m.dash} aria-valuemin={1} aria-valuemax={9} aria-valuetext={`${m.dash} points on, ${m.dash} off`} {...handle} />
      </Canvas>
    </div>
    <div className="ed-readouts">
      <Readout label="Dash" value={`${m.dash}`} snap={token(m.dash, PR['guide-dash'], 'guide dash')} peek={setPeek} pick={() => summon(ref.current)} scrub={(d) => change(m.dash + d * 0.5, false)} />
    </div>
  </>;
}

function Overshoot({ m, set }: Props) {
  const [well, zoom] = useCanvasZoom();
  const [live, setLive] = React.useState(false);
  const [peek, setPeek] = React.useState(false);
  const ref = React.useRef<HTMLSpanElement>(null);
  const s = snapOf(m);
  const change = (v: number, caught = true) => { const n = round(clamp(v, 0, 24), 0.5); set({ over: caught && Math.abs(n - PR['guide-overshoot']) <= 0.8 ? PR['guide-overshoot'] : n }); };
  const handle = useHandle({
    zoom: zoom * m.zoom,
    hint: () => ({ gesture: 'press', title: 'Overshoot', value: live ? `${m.over}pt` : undefined, how: 'drag the lines’ ends down to run them farther' }),
    keyHint: () => ({ gesture: 'press', title: 'Overshoot', value: `${m.over}pt`, keys: [{ k: '↑↓', say: 'change' }] }),
    start: () => m.over,
    // the overshoot is in screen points: a drag in canvas points counts at the zoom
    move: (o0, _dx, dy) => { setLive(true); change(o0 + dy * m.zoom); },
    end: () => setLive(false),
    step: (d) => change(m.over + d * 0.5), axis: 'y', over: setPeek,
    grab: () => set(inLine(m)),
  });
  useOnLand(live && m.over === PR['guide-overshoot'] ? 'over' : undefined, () => ref.current && blip(ref.current.querySelector('path')));
  // the handle sits on the lines' lower ends, below the dragged note, where there are no words
  const tip = s.box.y + s.box.h + m.over / m.zoom;
  return <>
    <p>Each line runs a little past both notes so it reads as a line joining them, not as the edge of one; drag the lines' lower ends to change how far.</p>
    <div ref={well} className="ed-specimen">
      <Canvas m={m} zoom={zoom} peek={peek || live ? '' : undefined}>
        <span ref={ref} className="ed-snap-grip is-y is-tip" data-live={live ? '' : undefined} data-peek={peek ? '' : undefined} style={{ left: s.box.x - 6, top: tip - 5, width: s.box.w + 12, height: 10 }}
          role="slider" tabIndex={0} aria-label="Overshoot" aria-valuenow={m.over} aria-valuemin={0} aria-valuemax={24} {...handle}>
          <svg width={s.box.w + 12} height={10} aria-hidden><path d={`M3 5H${s.box.w + 9}`} /></svg>
        </span>
      </Canvas>
    </div>
    <div className="ed-readouts">
      <Readout label="Overshoot" value={`${m.over}`} snap={token(m.over, PR['guide-overshoot'], 'guide overshoot')} peek={setPeek} pick={() => summon(ref.current)} scrub={(d) => change(m.over + d * 0.5, false)} />
    </div>
  </>;
}

function Timing({ m, set }: Props) {
  const [well, zoom] = useCanvasZoom();
  const [peek, setPeek] = React.useState(false);
  const note = React.useRef<HTMLSpanElement>(null);
  const handle = useHandle({
    zoom: zoom * m.zoom,
    hint: () => ({ gesture: 'press', title: 'Still dragging', value: m.held ? 'held' : undefined, how: 'press and hold the note, then let go' }),
    keyHint: () => ({ gesture: 'press', title: 'Still dragging', value: m.held ? 'held' : 'let go', keys: [{ k: '↑', say: 'hold' }, { k: '↓', say: 'let go' }] }),
    start: () => set({ ...inLine(m), held: true }),
    move: () => {},
    end: () => set({ held: false }),
    step: (d) => set(d > 0 ? { ...inLine(m), held: true } : { held: false }), axis: 'y', over: setPeek,
  });
  return <>
    <p>The lines appear in the same instant as the snap and fade away when you let go; press and hold the note, then let go.</p>
    <div ref={well} className="ed-specimen">
      <Canvas m={m} zoom={zoom} noteRef={note} peek={peek ? '' : undefined}
        note={{ className: 'is-handle is-press', role: 'slider', tabIndex: 0, 'aria-label': 'Still dragging', 'aria-valuenow': m.held ? 1 : 0, 'aria-valuemin': 0, 'aria-valuemax': 1, 'aria-valuetext': m.held ? 'held' : 'let go', ...handle } as React.HTMLAttributes<HTMLSpanElement>} />
    </div>
    <div className="ed-layers">
      <Row.Root variant="list" className="ed-layer" data-off={m.held ? undefined : ''} onClick={(e) => { if (!(e.target as HTMLElement).closest('.mu-switch')) set(m.held ? { held: false } : { ...inLine(m), held: true }); }}>
        <Row.Text>Still dragging</Row.Text>
        <Row.Trail><Switch size="small" aria-label="Still dragging" checked={m.held} onCheckedChange={(v) => set(v ? { ...inLine(m), held: true } : { held: false })} /></Row.Trail>
      </Row.Root>
    </div>
  </>;
}

export function SnapGuidesSpecimenCard(props: Props) {
  switch (props.spot) {
    case 'slide': return <Catch {...props} />;
    case 'shape': return <Line {...props} />;
    case 'states': return <Centre {...props} />;
    case 'surface': return <Overshoot {...props} />;
    case 'press': return <Timing {...props} />;
  }
}
