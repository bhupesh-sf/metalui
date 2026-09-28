import * as React from 'react';
import { SnapGuides } from '@unlocalhosted/metalui';
import { IsoCap, XrayFrame, capTop, scalePx, tones, useStateLayers, type SpotDef } from './kit';
import { SnapCanvas } from '../SnapCanvas';
import { HintLayer } from '../edit';
import { A, INITIAL, PR, SnapGuidesSpecimenCard, snapOf, stretch, type Model, type Spot } from './SnapGuidesSpecimens';

/* ─────────────────────────────────────────────────────────
 * X-RAY · SNAP GUIDES
 *
 *   solid     the playground canvas: drag a note near the others
 *   x-ray     a note on the page, a second note lifted as if you are dragging it, the
 *             invisible catch zones around the first note's edges and centre shown as
 *             pale bands, and the guides drawn on the page when the second note catches
 *   card      a small canvas with the real guides, handled: drag the note (catch), drag
 *             the canvas to zoom (line), drag the dashed line (centre), drag the lines'
 *             ends (overshoot), press and let go (timing). The bench reads the same model:
 *             it is the canvas itself, so at a zoom its line is 1 / zoom canvas points wide.
 * ───────────────────────────────────────────────────────── */

const S = 2.2;

const SPOTS: SpotDef<Spot>[] = [
  { id: 'slide', title: 'Catch', word: 'The invisible band' },
  { id: 'shape', title: 'Line', word: 'One point at every zoom' },
  { id: 'states', title: 'Centre', word: 'Solid or dashed' },
  { id: 'surface', title: 'Overshoot', word: 'A little past both' },
  { id: 'press', title: 'Timing', word: 'With the snap' },
];
const SIDE: Record<Spot, ['left' | 'right', number]> = {
  slide: ['left', 0.25], shape: ['left', 0.55], surface: ['left', 0.85],
  states: ['right', 0.3], press: ['right', 0.7],
};

export function SnapGuidesXray({ startOpen = false }: { startOpen?: boolean }) {
  const [xray, setXray] = React.useState(startOpen);
  const [spot, setSpot] = React.useState<Spot>('slide');
  const [m, setM] = React.useState<Model>(INITIAL);
  const set = React.useCallback((p: Partial<Model>) => setM((o) => ({ ...o, ...p })), []);
  const card = useStateLayers('surface', 'raise-lite');
  const t = tones(card.colorway);
  const th = PR['snap-threshold'] / m.zoom;

  const { box: b } = snapOf(m);
  const guides = snapOf(m).guides;

  const Wp = 200, Hp = 140, W = Wp * S, H = Hp * S;
  const lift = m.held ? 14 : 2;
  const fill = card.fill;
  const shadow = scalePx(card.shadows.slice(0, 4).join(', '), S);
  const bands = [A.x, A.x + A.w / 2, A.x + A.w];
  // The bench is the canvas world, magnified S times. The guides take the canvas zoom, so at
  // 200 % the line is half a canvas point wide here (and still one point on the screen).
  const scale = m.zoom / S;
  // In the tilted scene a 1 × 1 svg is clipped to its own box, so the guides get a layer the
  // size of the scene plus a margin for the overshoot, and are drawn shifted into it.
  const PAD = 60;
  const sceneGuides = stretch(guides.map((g) => ({ ...g, position: g.position * S + PAD, start: g.start * S + PAD, end: g.end * S + PAD })), m.over, scale);

  const label = (s: string) => <span className="type-ui" style={{ fontSize: 13 * S, color: 'var(--ink2)' }}>{s}</span>;
  const scene = (
    <>
      {spot === 'slide' && !m.cmd && bands.map((x) => (
        <div key={x} className="xr-face is-flat xr-catch" style={{ left: (x - th) * S, top: -12 * S, width: th * 2 * S, height: (Hp + 10) * S, transform: 'translateZ(0.4px)' }} />
      ))}
      <div className="xr-thumb xr-snap-guides" style={{ transform: `translate3d(${-PAD}px, ${-PAD}px, 0.8px)`, ['--mu-presence-guide-dash' as string]: `${m.dash}px`, ['--xr-snap-w' as string]: `${W + PAD * 2}px`, ['--xr-snap-h' as string]: `${H + PAD * 2}px` }}><SnapGuides guides={sceneGuides} scale={scale} /></div>
      <IsoCap x={A.x * S} y={A.y * S} w={A.w * S} h={A.h * S} r={24 * S * 0.6} z={0.5} wall={3} fill={fill} shadow={shadow} wallTone={t.wall}>{label('call the printer')}</IsoCap>
      {m.held && <div className="xr-shadow" style={{ left: b.x * S, top: b.y * S, width: b.w * S, height: b.h * S, borderRadius: 24 * S * 0.6, filter: 'blur(10px)', opacity: 0.2, transform: 'translate(6px, 12px)' }} />}
      {/* no transition: the note and its guides land in the same frame, as on the canvas */}
      <IsoCap x={b.x * S} y={b.y * S} w={b.w * S} h={b.h * S} r={24 * S * 0.6} z={lift} wall={3} fill={fill} shadow={shadow} wallTone={t.wall}>{label('drag me')}</IsoCap>
    </>
  );

  const top = capTop(lift, 3);
  const anchors: Record<Spot, [number, number, number]> = {
    slide: [(A.x - th) * S, (A.y + A.h + 18) * S, 0.4],
    shape: [(A.x + A.w) * S, (A.y + A.h + 18) * S, 0.8],
    states: [(A.x + A.w / 2) * S, (A.y + A.h + 18) * S, 0.8],
    surface: [A.x * S, (b.y + b.h + 6) * S, 0.8],
    press: [(b.x + b.w) * S, (b.y + b.h / 2) * S, top],
  };

  return (
    <HintLayer><XrayFrame
      xray={xray} setXray={setXray} spots={SPOTS} side={SIDE} spot={spot} setSpot={setSpot}
      solid={<div onClick={(e) => e.stopPropagation()} style={{ width: '100%' }}><SnapCanvas height={300} /></div>}
      W={W} H={H} scene={scene} anchors={anchors}
      onReset={() => setM(INITIAL)} deps={[spot, m]}
      card={<SnapGuidesSpecimenCard spot={spot} m={m} set={set} />}
    /></HintLayer>
  );
}
