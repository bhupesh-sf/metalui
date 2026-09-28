import * as React from 'react';
import { Lasso, Row, Switch } from '@unlocalhosted/metalui';
import { tokens } from '../../lib/tokens';
import { useStateLayers, scalePx } from './kit';
import { Outline, Readout, blip, clamp, summon, useHandle, useOnLand, useSpecimenZoom, type Seg } from '../edit';
import './lasso-specimens.css';

/* ─────────────────────────────────────────────────────────
 * LASSO · the specimens
 *
 *   Box      the real lasso over three notes; its far corner is the pointer (drag it
 *            for width and height), its top line is the line (drag up to thicken it,
 *            it catches on presence.lasso-width)
 *   Count    the count under the box is the handle: drag it down for more gap (it
 *            catches on half of presence.readout-gap)
 *   Touch    the box itself: drag it over the notes; the count changes the moment
 *            it touches one
 *   Timing   one switch: still dragging, or let go (the box fades on the release spring)
 * The model lives in LassoXray; the bench reads the same one.
 * Tokens are read here, never through LassoXray (it imports this file).
 * ───────────────────────────────────────────────────────── */

const PR = tokens.presence as unknown as { 'readout-gap': number; 'lasso-width': number };
/** The count sits half the readout gap under the box. */
export const GAP = PR['readout-gap'] / 2;
export const LINE = PR['lasso-width'];

/** The page the box is drawn on, in points, and the notes on it. */
export const PAGE = { w: 320, h: 210 };
export const NOTES = [
  { id: 'a', x: 20, y: 20, w: 120, h: 44, t: 'call the printer' },
  { id: 'b', x: 170, y: 70, w: 130, h: 44, t: 'pick the typeface' },
  { id: 'c', x: 40, y: 140, w: 110, h: 44, t: 'book the venue' },
];
const MIN = 20; // the smallest box worth drawing in this scene

export interface LassoModel { x: number; y: number; w: number; h: number; line: number; gap: number; held: boolean }
export const LASSO_INITIAL: LassoModel = { x: 0, y: 0, w: 170, h: 110, line: LINE, gap: GAP, held: true };

type Note = typeof NOTES[number];
export const touches = (m: LassoModel, n: Note) => n.x < m.x + m.w && n.x + n.w > m.x && n.y < m.y + m.h && n.y + n.h > m.y;
export const countOf = (m: LassoModel) => NOTES.filter((n) => touches(m, n)).length;

type Spot = 'shape' | 'type' | 'slide' | 'press';
type Props = { spot: Spot; m: LassoModel; set: (patch: Partial<LassoModel>) => void };

const round = (v: number, p = 1) => Number(v.toFixed(p));
const catchAt = (v: number, at: number, reach: number) => (Math.abs(v - at) <= reach ? at : v);
const token = (v: number, at: number, name: string) => (v === at ? { at, name } : undefined);

/** The scene: the notes and the real Lasso, magnified like every specimen; the line and count keep their screen size. */
function Page({ m, k, well, children }: { m: LassoModel; k: number; well: React.RefObject<HTMLDivElement | null>; children?: React.ReactNode }) {
  const card = useStateLayers('surface', 'raise-lite');
  const count = countOf(m);
  return (
    <div ref={well} className="ed-specimen ed-lasso-specimen">
      <div className="ed-lasso-page" data-hint-anchor style={{
        width: PAGE.w, height: PAGE.h, zoom: k,
        ['--mu-presence-lasso-width' as string]: `${m.line}px`,
        ['--mu-presence-readout-gap' as string]: `${m.gap * 2}px`,
      }}>
        {NOTES.map((n) => (
          <div key={n.id} className="ed-lasso-note type-ui" data-touched={touches(m, n) ? '' : undefined}
            style={{ left: n.x, top: n.y, width: n.w, height: n.h, background: card.fill, boxShadow: scalePx(card.shadows.slice(0, 4).join(', '), 0.6) }}>{n.t}</div>
        ))}
        <Lasso rect={m.held ? { x: m.x, y: m.y, width: m.w, height: m.h } : null} count={count} scale={k} />
        {children}
      </div>
    </div>
  );
}

/** Width and height (the pointer, at the far corner) and the line (the top edge). */
function Box({ m, set }: Props) {
  const [well, z] = useSpecimenZoom(); const k = z / 2;
  const [active, setActive] = React.useState<'size' | 'line' | null>(null);
  const [peek, setPeek] = React.useState<'size' | 'line' | null>(null);
  const segs = React.useRef<Partial<Record<Seg, SVGPathElement | null>>>({});
  const pointer = React.useRef<HTMLSpanElement>(null), top = React.useRef<HTMLSpanElement>(null);
  const size = (w: number, h: number) => set({ w: Math.round(clamp(w, MIN, PAGE.w - m.x)), h: Math.round(clamp(h, MIN, PAGE.h - m.y)) });
  const line = (v: number, caught = true) => { const n = round(clamp(v, 0.5, 4), 2); set({ line: caught ? catchAt(round(n, 1), LINE, 0.15) : n }); };
  const sizeHandle = useHandle({
    zoom: k,
    hint: () => ({ gesture: 'corner', title: 'Box size', value: active === 'size' ? `${m.w} × ${m.h}pt` : undefined, how: 'drag the corner, as the pointer would' }),
    keyHint: () => ({ gesture: 'corner', title: 'Box size', value: `${m.w} × ${m.h}pt`, keys: [{ k: '←→', say: 'width' }, { k: '↑↓', say: 'height' }] }),
    start: () => ({ w: m.w, h: m.h }), move: (s, dx, dy) => { setActive('size'); size(s.w + dx, s.h + dy); }, end: () => setActive(null),
    step: (d, e) => (e.key === 'ArrowUp' || e.key === 'ArrowDown' ? size(m.w, m.h - d * 5) : size(m.w + d * 5, m.h)), axis: 'both',
    over: (yes) => setPeek(yes ? 'size' : null), grab: () => blip(pointer.current?.querySelector('circle')),
  });
  const lineHandle = useHandle({
    zoom: k,
    hint: () => ({ gesture: 'sides', title: 'Line', value: active === 'line' ? `${m.line}pt` : undefined, how: 'drag up to thicken the line' }),
    keyHint: () => ({ gesture: 'sides', title: 'Line', value: `${m.line}pt`, keys: [{ k: '↑↓', say: 'change' }] }),
    start: () => m.line, move: (s, _dx, dy) => { setActive('line'); line(s - dy / 8); }, end: () => setActive(null),
    step: (d) => line(m.line + d * 0.25, false), axis: 'y', over: (yes) => setPeek(yes ? 'line' : null), grab: () => blip(segs.current.top),
  });
  useOnLand(active === 'line' && m.line === LINE ? 'line' : undefined, () => blip(segs.current.top));
  const lit = active ?? peek;
  const shown: Seg[] = lit === 'size' ? [] : ['top'];
  return (
    <>
      <p>A drag on empty space draws a box, a thin green line over a faint fill. Drag its far corner, where the pointer is, to change the box, or its top line up to thicken the line.</p>
      <Page m={m} k={k} well={well}>
        <div className="ed-lasso-frame" data-live={active ?? undefined} data-lit={lit ?? undefined} style={{ left: m.x, top: m.y, width: m.w, height: m.h }}>
          <Outline W={m.w} h={m.h} r={0} on={lit === 'line' ? ['top'] : []} only={shown} segs={segs} />
          <span ref={top} className="ed-edge is-y ed-lasso-top" role="slider" tabIndex={0} aria-label="Line" aria-valuenow={m.line} aria-valuemin={0.5} aria-valuemax={4} {...lineHandle} />
          <span ref={pointer} className="ed-lasso-pointer" data-hidden={lit === 'line' ? '' : undefined} role="slider" tabIndex={0} aria-label="Box size" aria-valuetext={`${m.w} by ${m.h} points`} aria-valuenow={m.w} aria-valuemin={MIN} aria-valuemax={PAGE.w} {...sizeHandle}><svg aria-hidden width="14" height="14" viewBox="-7 -7 14 14"><circle r="5" /></svg></span>
        </div>
      </Page>
      <div className="ed-readouts">
        <Readout label="Width" value={`${m.w}`} peek={(yes) => setPeek(yes ? 'size' : null)} pick={() => summon(pointer.current)} scrub={(d) => size(m.w + d * 5, m.h)} />
        <Readout label="Height" value={`${m.h}`} peek={(yes) => setPeek(yes ? 'size' : null)} pick={() => summon(pointer.current)} scrub={(d) => size(m.w, m.h + d * 5)} />
        <Readout label="Line" value={`${m.line}`} snap={token(m.line, LINE, 'lasso width')} peek={(yes) => setPeek(yes ? 'line' : null)} pick={() => summon(top.current)} scrub={(d) => line(m.line + d * 0.25, false)} />
      </div>
    </>
  );
}

/** The gap between the box and its count: the count itself is the handle. */
function Count({ m, set }: Props) {
  const [well, z] = useSpecimenZoom(); const k = z / 2;
  const [live, setLive] = React.useState(false); const [peek, setPeek] = React.useState(false);
  const ref = React.useRef<HTMLSpanElement>(null);
  const [at, setAt] = React.useState<{ l: number; t: number; w: number; h: number } | null>(null);
  const count = countOf(m);
  // the count is drawn inside the Lasso: frame it where it really is
  React.useLayoutEffect(() => {
    const page = ref.current?.parentElement, r = page?.querySelector('.presence-lasso-readout');
    if (!page || !r) { setAt(null); return; }
    const p = page.getBoundingClientRect(), b = r.getBoundingClientRect(), s = p.width / PAGE.w;
    const next = { l: (b.left - p.left) / s, t: (b.top - p.top) / s, w: b.width / s, h: b.height / s };
    setAt((o) => (o && Math.abs(o.l - next.l) + Math.abs(o.t - next.t) + Math.abs(o.w - next.w) + Math.abs(o.h - next.h) < 0.1 ? o : next));
  });
  const gap = (v: number, caught = true) => { const n = Math.round(clamp(v, 0, GAP * 3)); set({ gap: caught ? catchAt(n, GAP, 1) : n }); };
  const handle = useHandle({
    zoom: k,
    hint: () => ({ gesture: 'sides', title: 'Gap', value: live ? `${m.gap}pt` : undefined, how: 'drag the count down, away from the box' }),
    keyHint: () => ({ gesture: 'sides', title: 'Gap', value: `${m.gap}pt`, keys: [{ k: '↑↓', say: 'move' }] }),
    // the gap keeps its screen size at every zoom, so a drag reads in screen points
    start: () => m.gap, move: (s, _dx, dy) => { setLive(true); gap(s + dy * k); }, end: () => setLive(false),
    step: (d) => gap(m.gap - d, false), axis: 'y', over: setPeek,
  });
  useOnLand(live && m.gap === GAP ? 'gap' : undefined, () => blip(ref.current?.querySelector('rect')));
  return (
    <>
      <p>Under the box, a small dark count says how many notes it will select; with none, there is no count. Drag the count down to move it away from the box.</p>
      <Page m={m} k={k} well={well}>
        <span ref={ref} className="ed-lasso-count" data-live={live ? '' : undefined} data-peek={peek ? '' : undefined} hidden={!at || count === 0}
          style={at ? { left: at.l - 3, top: at.t - 3, width: at.w + 6, height: at.h + 6 } : undefined}
          role="slider" tabIndex={0} aria-label="Gap" aria-valuenow={m.gap} aria-valuemin={0} aria-valuemax={GAP * 3} {...handle}>
          <svg aria-hidden width="100%" height="100%"><rect width="100%" height="100%" rx="6" /></svg>
        </span>
      </Page>
      <div className="ed-readouts">
        <Readout label="Count" value={`${count}`} unit={count === 1 ? 'block' : 'blocks'} />
        <Readout label="Gap" value={`${m.gap}`} snap={token(m.gap, GAP, 'half the readout gap')} peek={setPeek} pick={() => summon(ref.current)} scrub={(d) => gap(m.gap + d, false)} />
      </div>
    </>
  );
}

/** Where the box is: drag it over the notes; one counts the moment the box touches it. */
function Touch({ m, set }: Props) {
  const [well, z] = useSpecimenZoom(); const k = z / 2;
  const [live, setLive] = React.useState(false); const [peek, setPeek] = React.useState(false);
  const ref = React.useRef<HTMLSpanElement>(null);
  const segs = React.useRef<Partial<Record<Seg, SVGPathElement | null>>>({});
  const count = countOf(m);
  const move = (x: number, y: number) => set({ x: Math.round(clamp(x, 0, PAGE.w - m.w)), y: Math.round(clamp(y, 0, PAGE.h - m.h)) });
  const handle = useHandle({
    zoom: k,
    hint: () => ({ gesture: 'corner', title: 'Box position', value: live ? `${count} of ${NOTES.length} touched` : undefined, how: 'drag the box over the notes' }),
    keyHint: () => ({ gesture: 'corner', title: 'Box position', value: `${count} of ${NOTES.length} touched`, keys: [{ k: '←→↑↓', say: 'move' }] }),
    start: () => ({ x: m.x, y: m.y }), move: (s, dx, dy) => { setLive(true); move(s.x + dx, s.y + dy); }, end: () => setLive(false),
    step: (d, e) => (e.key === 'ArrowUp' || e.key === 'ArrowDown' ? move(m.x, m.y - d * 5) : move(m.x + d * 5, m.y)), axis: 'both', over: setPeek,
  });
  // a note joining or leaving is the event worth marking
  useOnLand(live ? `${count}` : undefined, () => blip(...Object.values(segs.current)));
  return (
    <>
      <p>A note counts as soon as the box touches it, even by a corner; it does not have to fit inside. Drag the box over the notes and watch the count.</p>
      <Page m={m} k={k} well={well}>
        <div className="ed-lasso-frame" data-live={live ? '' : undefined} data-lit={live || peek ? 'move' : undefined} style={{ left: m.x, top: m.y, width: m.w, height: m.h }}>
          <Outline W={m.w} h={m.h} r={0} on={live || peek ? ['top', 'right', 'bottom', 'left'] : []} segs={segs} />
          <span ref={ref} className="ed-lasso-body" role="slider" tabIndex={0} aria-label="Box position" aria-valuetext={`${m.x}, ${m.y}; ${count} of ${NOTES.length} notes touched`} aria-valuenow={m.x} aria-valuemin={0} aria-valuemax={PAGE.w - m.w} {...handle} />
        </div>
      </Page>
      <div className="ed-readouts">
        <Readout label="Left" value={`${m.x}`} peek={setPeek} pick={() => summon(ref.current)} scrub={(d) => move(m.x + d * 5, m.y)} />
        <Readout label="Top" value={`${m.y}`} peek={setPeek} pick={() => summon(ref.current)} scrub={(d) => move(m.x, m.y + d * 5)} />
        <Readout label="Touched" value={`${count}`} unit={`of ${NOTES.length}`} />
      </div>
    </>
  );
}

/** Still dragging or let go: the real Lasso fades on the release spring. */
function Timing({ m, set }: Props) {
  const [well, z] = useSpecimenZoom(); const k = z / 2;
  return (
    <>
      <p>The box follows the pointer in the same frame, whichever way you drag. Let go and it fades while the notes it touched are selected.</p>
      <Page m={m} k={k} well={well} />
      <div className="ed-layers">
        <Row.Root variant="list" className="ed-layer" data-off={m.held ? undefined : ''} onClick={(e) => { if (!(e.target as HTMLElement).closest('.mu-switch')) set({ held: !m.held }); }}>
          <Row.Text>Still dragging</Row.Text>
          <Row.Trail><Switch size="small" aria-label="Still dragging" checked={m.held} onCheckedChange={(held) => set({ held })} /></Row.Trail>
        </Row.Root>
      </div>
    </>
  );
}

export function LassoSpecimenCard(props: Props) {
  switch (props.spot) {
    case 'shape': return <Box {...props} />;
    case 'type': return <Count {...props} />;
    case 'slide': return <Touch {...props} />;
    case 'press': return <Timing {...props} />;
  }
}
