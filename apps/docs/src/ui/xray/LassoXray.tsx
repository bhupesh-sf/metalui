import * as React from 'react';
import { SizeReadout } from '@unlocalhosted/metalui';
import { IsoCap, XrayFrame, scalePx, tones, useStateLayers, type SpotDef } from './kit';
import { SnapCanvas } from '../SnapCanvas';
import { HintLayer } from '../edit';
import { LASSO_INITIAL, LassoSpecimenCard, NOTES, PAGE, countOf, touches, type LassoModel } from './LassoSpecimens';

/* ─────────────────────────────────────────────────────────
 * X-RAY · LASSO
 *
 *   solid     the playground: drag on empty canvas to draw a box
 *   x-ray     three notes on the page, a box drawn on the page over some of them, its
 *             count under it
 *   card      the real Lasso over the same notes (LassoSpecimens), handled, not slid:
 *             Box     the pointer corner for width and height, the top line for the line
 *             Count   the count itself, dragged away from the box for the gap
 *             Touch   the box dragged over the notes; one counts as soon as it is touched
 *             Timing  still dragging, or let go (it fades on the release spring)
 * ───────────────────────────────────────────────────────── */

const S = 1.6;

type Spot = 'shape' | 'type' | 'slide' | 'press';
const SPOTS: SpotDef<Spot>[] = [
  { id: 'shape', title: 'Box', word: 'Line and fill' },
  { id: 'type', title: 'Count', word: 'What it will select' },
  { id: 'slide', title: 'Touch', word: 'When a note counts' },
  { id: 'press', title: 'Timing', word: 'With the pointer' },
];
const SIDE: Record<Spot, ['left' | 'right', number]> = {
  shape: ['left', 0.3], slide: ['left', 0.7], type: ['right', 0.3], press: ['right', 0.7],
};

export function LassoXray({ startOpen = false }: { startOpen?: boolean }) {
  const [xray, setXray] = React.useState(startOpen);
  const [spot, setSpot] = React.useState<Spot>('slide');
  const [m, setM] = React.useState<LassoModel>(LASSO_INITIAL);
  const set = React.useCallback((p: Partial<LassoModel>) => setM((o) => ({ ...o, ...p })), []);
  const card = useStateLayers('surface', 'raise-lite');
  const t = tones(card.colorway);
  const box = { x: m.x, y: m.y, w: m.w, h: m.h };
  const hit = (n: typeof NOTES[number]) => touches(m, n);
  const count = countOf(m);

  const Wp = PAGE.w, Hp = PAGE.h, W = Wp * S, H = Hp * S;
  const scene = (
    <>
      {NOTES.map((n) => (
        <IsoCap key={n.id} x={n.x * S} y={n.y * S} w={n.w * S} h={n.h * S} r={24 * S * 0.6} z={0.5} wall={3} fill={card.fill} shadow={scalePx(card.shadows.slice(0, 4).join(', '), S)} wallTone={t.wall}>
          <span className="type-ui" style={{ fontSize: 12 * S, color: hit(n) ? 'var(--ink)' : 'var(--ink3)' }}>{n.t}</span>
        </IsoCap>
      ))}
      {m.held && (
        <div className="xr-thumb" style={{ transform: 'translateZ(18px)' }}>
          <div className="mu-lasso presence-lasso" style={{ position: 'absolute', left: box.x * S, top: box.y * S, width: box.w * S, height: box.h * S, ['--mu-canvas-scale' as string]: 1 / S, ['--mu-presence-lasso-width' as string]: `${m.line}px`, ['--mu-presence-readout-gap' as string]: `${m.gap * 2}px` }}>
            {count > 0 && <span className="presence-lasso-readout"><SizeReadout value={count} unit={count === 1 ? 'block' : 'blocks'} /></span>}
          </div>
        </div>
      )}
    </>
  );

  const anchors: Record<Spot, [number, number, number]> = {
    shape: [(box.x + box.w) * S, (box.y + box.h * 0.5) * S, 18],
    type: [(box.x + box.w * 0.5) * S, (box.y + box.h + m.gap * 2) * S, 18],
    slide: [NOTES[1].x * S + 6, (NOTES[1].y + 10) * S, 4],
    press: [(box.x + box.w) * S, (box.y + box.h) * S, 18],
  };

  const cardBody = <LassoSpecimenCard spot={spot} m={m} set={set} />;

  return (
    <HintLayer><XrayFrame
      xray={xray} setXray={setXray} spots={SPOTS} side={SIDE} spot={spot} setSpot={setSpot}
      solid={<div onClick={(e) => e.stopPropagation()} style={{ width: '100%' }}><SnapCanvas height={300} lasso /></div>}
      W={W} H={H} scene={scene} anchors={anchors}
      onReset={() => setM(LASSO_INITIAL)} deps={[spot, m]}
      card={cardBody}
    /></HintLayer>
  );
}
