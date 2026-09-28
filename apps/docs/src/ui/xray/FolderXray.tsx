import * as React from 'react';
import { Folder, type FolderHue, type FolderPeek } from '@unlocalhosted/metalui';
import { tokens } from '../../lib/tokens';
import { useColorway, type Colorway } from '../../app/colorway';
import { XrayFrame, type LayerDef, type SpotDef } from './kit';
import { HintLayer } from '../edit';
import { FolderSpecimenCard } from './FolderSpecimens';

/* ─────────────────────────────────────────────────────────
 * X-RAY · FOLDER (an object: a pocket that holds blocks)
 *
 *   solid     the folder with three blocks peeking out
 *   x-ray     it lies on the floor: the paper back with its tab, the blocks fanned up out of
 *             it, and the frosted flap hinged up off the floor on its bottom edge
 *   card      the real folder, handled (FolderSpecimens):
 *             Drop in  point at it, drag a block onto it: it opens, takes it and shuts
 *             Paper    drag the tab sideways through its six colours (steps)
 *             Fan      drag the front block to set how far the blocks rise and lean
 *             Flap     drag the flap's top edge to tilt it
 *             Glass    drag across the flap: sideways for frost, up or down to see through
 *             Layers   a switch per layer
 * ───────────────────────────────────────────────────────── */

type ByColorway = { bone: string; graphite: string };
const R = tokens.recipes.folder as unknown as {
  props: {
    self: { width: number; height: number };
    back: { height: number; radius: number; 'tab-width': number; 'tab-rise': number; taper: number };
    hue: Record<string, ByColorway>;
    card: { width: number; height: number; radius: number; bottom: number; thumb: number; background: ByColorway; border: ByColorway; 'line-ink': ByColorway };
    flap: { height: number; radius: number; taper: number; rest: string; hover: string; open: string; frost: string; lift: ByColorway; 'fill-opacity': ByColorway; border: ByColorway };
    count: { size: number };
    shape: { edge: ByColorway; light: ByColorway };
    fan: Record<string, string>;
  };
};
export const FP = R.props;
export const HUES: FolderHue[] = ['neutral', 'red', 'amber', 'green', 'blue', 'violet'];
const deg = (v: string) => parseFloat(v);
export const FOLDER_TOKENS = {
  flap: deg(FP.flap.rest), hover: deg(FP.flap.hover), open: deg(FP.flap.open),
  lift: parseFloat(FP.fan['rest-y-front']), lean: deg(FP.fan['rest-r-front']),
  frost: Number(FP.flap.frost.match(/blur\(([\d.]+)px\)/)?.[1]),
  see: (cw: Colorway) => Number(FP.flap['fill-opacity'][cw]),
};

/* The outline from the recipe's numbers, as the component builds it: the back with its tab, and
 * the flap, both tapering toward the bottom like a pocket. */
const W = FP.self.width, RAD = FP.back.radius;
const f2 = (n: number) => +n.toFixed(2);
export function pocketPath(h: number, d: number, top = 0) {
  const k = RAD / h, y0 = top, y1 = top + h;
  return `M${RAD} ${y0}H${W - RAD}Q${W} ${y0} ${f2(W - d * k)} ${y0 + RAD}L${f2(W - d + d * k)} ${y1 - RAD}Q${W - d} ${y1} ${W - d - RAD} ${y1}`
    + `H${d + RAD}Q${d} ${y1} ${f2(d - d * k)} ${y1 - RAD}L${f2(d * k)} ${y0 + RAD}Q0 ${y0} ${RAD} ${y0}Z`;
}
export function backPath() {
  const h = FP.back.height, d = FP.back.taper, rise = FP.back['tab-rise'], tab = FP.back['tab-width'];
  const k = RAD / h, y0 = rise, y1 = rise + h, tr = 18;
  return `M0 ${tr}Q0 0 ${tr} 0H${tab - 14}C${tab - 4} 0 ${tab} ${y0} ${tab + 12} ${y0}`
    + `H${W - RAD}Q${W} ${y0} ${f2(W - d * k)} ${y0 + RAD}L${f2(W - d + d * k)} ${y1 - RAD}Q${W - d} ${y1} ${W - d - RAD} ${y1}`
    + `H${d + RAD}Q${d} ${y1} ${f2(d - d * k)} ${y1 - RAD}L0 ${y0 + RAD}Z`;
}
const BACK_H = FP.back.height + FP.back['tab-rise'];

export const LAYERS: LayerDef[] = [
  { name: 'Shadow', why: 'A soft shadow in the folder\'s outline, under the whole pocket. It sits on the canvas like paper.' },
  { name: 'Back paper', why: 'The back of the pocket, with its tab. Soft paper in the folder\'s colour, a little see-through, so the canvas shows softly behind it.' },
  { name: 'Edge', why: 'A hairline around the paper and a bright line along its top, where the light catches the fold.' },
  { name: 'Blocks', why: 'The things inside, peeking out as cards. Each leans by its place in the pile, so you can count them at a glance.' },
  { name: 'Frost', why: 'The flap is frosted glass: the blocks behind it blur, so the name in front stays easy to read.' },
  { name: 'Flap tint', why: 'A see-through fill in the paper\'s colour over the frost, so the flap belongs to the same folder.' },
  { name: 'Count', why: 'How many blocks it holds, in a small raised chip on the flap.' },
];

export const PEEKS: FolderPeek[] = [
  { id: 'poster', thumb: 'linear-gradient(135deg,#F2A56B,#E0673C 60%,#9E3B25)' },
  { id: 'type', thumb: 'radial-gradient(60% 60% at 30% 30%,#7FA8FF,#2B3F8F)', link: true },
  { id: 'night', thumb: 'linear-gradient(160deg,#3D4B45,#1E2623)' },
];
/** Blocks to drop in, in turn. */
export const MORE: FolderPeek[] = [
  { thumb: 'linear-gradient(135deg,#F7D774,#D99A1E 55%,#8C5A12)' },
  { thumb: 'linear-gradient(135deg,#C9B6F2,#6E54C9)', link: true },
  { thumb: 'linear-gradient(135deg,#9AD8C0,#2E8C6A)' },
];

export interface Model {
  hue: FolderHue; peeks: FolderPeek[]; count: number;
  flap: number; lift: number; lean: number; frost: number; see: number | null;
  on: boolean[];
}
export const INITIAL: Model = {
  hue: 'neutral', peeks: PEEKS, count: PEEKS.length,
  flap: FOLDER_TOKENS.flap, lift: FOLDER_TOKENS.lift, lean: FOLDER_TOKENS.lean, frost: FOLDER_TOKENS.frost, see: null,
  on: LAYERS.map(() => true),
};
export const seeOf = (m: Model, cw: Colorway) => m.see ?? FOLDER_TOKENS.see(cw);

/** The real Folder with its recipe variables set from the model. Layers that are off are hidden by the wrapper. */
export function FolderFace({ m, open, landed, className, still }: { m: Model; open?: boolean; landed?: number; className?: string; still?: boolean }) {
  const { colorway } = useColorway();
  const off = LAYERS.filter((_, i) => !m.on[i]).map((l) => l.name.toLowerCase().replace(' ', '-')).join(' ');
  return (
    <div className={['ed-folder', still ? 'is-still' : '', className].filter(Boolean).join(' ')} data-off={off || undefined}>
      <Folder name="poster refs" count={m.count} peeks={m.peeks} hue={m.hue} open={open} landed={landed} tabIndex={still ? -1 : 0} style={{
        ['--mu-r-folder-flap-rest' as string]: `${m.flap}deg`,
        ['--mu-r-folder-fan-rest-y-front' as string]: `${m.lift}px`,
        ['--mu-r-folder-fan-rest-r-front' as string]: `${m.lean}deg`,
        ['--mu-r-folder-flap-frost' as string]: `blur(${m.frost}px) saturate(1.2)`,
        ['--mu-r-folder-flap-fill-opacity' as string]: `${seeOf(m, colorway)}`,
      } as React.CSSProperties} />
    </div>
  );
}

type Spot = 'states' | 'surface' | 'thumb' | 'slide' | 'light' | 'layers';
const SPOTS: SpotDef<Spot>[] = [
  { id: 'states', title: 'Drop in', word: 'Putting a block in' },
  { id: 'surface', title: 'Paper', word: 'Six soft colours' },
  { id: 'thumb', title: 'Fan', word: 'The blocks peeking out' },
  { id: 'slide', title: 'Flap', word: 'The glass front' },
  { id: 'light', title: 'Glass', word: 'Frost and see-through' },
  { id: 'layers', title: 'Layers', word: 'What it is made of' },
];
const SIDE: Record<Spot, ['left' | 'right', number]> = {
  surface: ['left', 0.2], thumb: ['left', 0.48], states: ['left', 0.76],
  slide: ['right', 0.2], light: ['right', 0.48], layers: ['right', 0.76],
};
const S = 1.6;

export function FolderXray({ startOpen = false }: { startOpen?: boolean }) {
  const [xray, setXray] = React.useState(startOpen);
  const [spot, setSpot] = React.useState<Spot>('states');
  const [m, setM] = React.useState<Model>(INITIAL);
  const [focus, setFocus] = React.useState<string | null>(null);
  const set = React.useCallback((p: Partial<Model>) => setM((o) => ({ ...o, ...p })), []);
  const { colorway: cw } = useColorway();

  const Wp = W * S, Hp = FP.self.height * S;
  const top = FP.hue[`${m.hue}-top`][cw], bottom = FP.hue[`${m.hue}-bottom`][cw];
  const exploded = spot === 'layers';
  const lift = (i: number) => exploded ? 12 + i * 22 : [0, 2, 4, 8, 10, 14, 16][i];
  const layer = (i: number) => ['xr-face is-flat xr-folder-part', exploded ? 'is-layer' : '', focus === LAYERS[i].name ? 'is-focus' : '', m.on[i] ? '' : 'is-off'].join(' ');
  const backY = Hp - BACK_H * S, flapY = Hp - FP.flap.height * S;
  const cards = m.peeks.slice(-6);
  const n = cards.length;
  const k = Math.min(1.35, Math.max(0.8, Math.sqrt(n / 3)));
  const backLift = parseFloat(FP.fan['rest-y-back']), backLean = deg(FP.fan['rest-r-back']), spread = parseFloat(FP.fan.spread);
  const cw_ = FP.card.width * S, ch = FP.card.height * S;
  const svg = (d: string, h: number, fill: string, stroke?: string) => (
    <svg viewBox={`0 0 ${W} ${h}`} width={Wp} height={h * S} style={{ overflow: 'visible', display: 'block' }} aria-hidden>
      <path d={d} fill={fill} stroke={stroke ?? 'none'} strokeWidth={stroke ? 1 : 0} />
    </svg>
  );
  const gradId = `xr-folder-${m.hue}-${cw}`;

  const scene = (
    <>
      <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
        <defs><linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={top} /><stop offset="1" stopColor={bottom} /></linearGradient></defs>
      </svg>
      {/* shadow */}
      <div className={layer(0)} style={{ left: 0, top: backY, transform: `translate(${exploded ? 0 : 10}px, ${exploded ? 0 : 16}px) translateZ(${lift(0)}px)`, filter: exploded ? undefined : 'blur(10px)', opacity: exploded ? 1 : 0.35, borderRadius: 0 }}>
        {svg(backPath(), BACK_H, cw === 'graphite' ? '#000' : 'rgba(24,22,16,.55)')}
        {exploded && <span className="xr-tag eng">{LAYERS[0].name}</span>}
      </div>
      {/* back paper, then its edge */}
      <div className={layer(1)} style={{ left: 0, top: backY, transform: `translateZ(${lift(1)}px)`, opacity: 0.92, borderRadius: 0 }}>
        {svg(backPath(), BACK_H, `url(#${gradId})`)}
        {exploded && <span className="xr-tag eng">{LAYERS[1].name}</span>}
      </div>
      <div className={layer(2)} style={{ left: 0, top: backY, transform: `translateZ(${lift(2)}px)`, borderRadius: 0 }}>
        {svg(backPath(), BACK_H, 'none', FP.shape.edge[cw])}
        {exploded && <span className="xr-tag eng">{LAYERS[2].name}</span>}
      </div>
      {/* blocks, fanned by their place in the pile */}
      {cards.map((c, i) => {
        const t = n > 1 ? i / (n - 1) : 1;
        const y = (backLift + (m.lift - backLift) * t) * S, r = (backLean + (m.lean - backLean) * t) * k;
        const x = (t - 0.5) * (n - 1) * spread * S;
        return (
          <div key={c.id ?? i} className={[layer(3), 'xr-folder-card'].join(' ')} style={{
            left: (Wp - cw_) / 2, top: Hp - FP.card.bottom * S - ch, width: cw_, height: ch, borderRadius: FP.card.radius * S,
            background: FP.card.background[cw], boxShadow: `inset 0 0 0 1px ${FP.card.border[cw]}`,
            transform: `translateZ(${lift(3) + i * 1.5}px) translate(${x}px, ${y}px) rotate(${r}deg)`, transformOrigin: '50% 100%',
          }}>
            <i style={{ background: c.thumb, height: FP.card.thumb * S, borderRadius: 10 * S }} />
            <i className="xr-folder-line" style={{ width: '70%', height: 8 * S, background: FP.card['line-ink'][cw] }} />
            <i className="xr-folder-line" style={{ height: 6 * S, background: c.link ? '#B9CCF7' : FP.card['line-ink'][cw] }} />
            <i className="xr-folder-line" style={{ width: '60%', height: 6 * S, background: FP.card['line-ink'][cw] }} />
            {exploded && i === n - 1 && <span className="xr-tag eng">{LAYERS[3].name}</span>}
          </div>
        );
      })}
      {/* the flap, hinged on its bottom edge: frost, then its tint, then the count */}
      {[4, 5].map((li) => (
        <div key={li} className={[layer(li), 'xr-folder-flap'].join(' ')} style={{
          left: 0, top: flapY, borderRadius: 0, transformOrigin: '50% 100%',
          transform: `translateZ(${lift(li)}px) rotateX(${exploded ? 0 : m.flap * 0.9}deg)`,
          backdropFilter: li === 4 ? `blur(${m.frost}px)` : undefined,
        }}>
          {li === 4
            ? svg(pocketPath(FP.flap.height, FP.flap.taper), FP.flap.height, cw === 'graphite' ? 'rgba(255,255,255,.05)' : 'rgba(255,255,255,.35)', FP.flap.border[cw])
            : svg(pocketPath(FP.flap.height, FP.flap.taper), FP.flap.height, `color-mix(in srgb, ${top} 55%, ${FP.flap.lift[cw]})`)}
          {li === 5 && <span className="xr-folder-name" style={{ opacity: seeOf(m, cw) + 0.3 }}><b>poster refs</b><em>Folder · {m.count} blocks</em></span>}
          {exploded && <span className="xr-tag eng">{LAYERS[li].name}</span>}
        </div>
      ))}
      <div className={[layer(6), 'xr-folder-count'].join(' ')} style={{
        left: Wp - (16 + FP.count.size) * S, top: Hp - (14 + FP.count.size) * S, width: FP.count.size * S, height: FP.count.size * S,
        transformOrigin: `50% ${(14 + FP.count.size) * S}px`,
        transform: `translateZ(${lift(6)}px) rotateX(${exploded ? 0 : m.flap * 0.9}deg) translateZ(1px)`,
      }}>
        <span>{m.count}</span>
        {exploded && <span className="xr-tag eng">{LAYERS[6].name}</span>}
      </div>
    </>
  );

  const flapTop = flapY + FP.flap.height * S * (1 - Math.cos((m.flap * Math.PI) / 180));
  const anchors: Record<Spot, [number, number, number]> = {
    states: [Wp * 0.5, Hp - ch * 0.8, lift(3) + 6],
    surface: [FP.back['tab-width'] * S * 0.4, backY + 6, lift(1)],
    thumb: [Wp * 0.5, Hp - FP.card.bottom * S - ch + 12, lift(3) + 8],
    slide: [Wp * 0.8, flapTop, lift(5) + Math.sin((-m.flap * Math.PI) / 180) * FP.flap.height * S * 0.9],
    light: [Wp * 0.3, flapY + FP.flap.height * S * 0.6, lift(5) + 8],
    layers: exploded ? [Wp * 0.85, backY + 20, lift(6)] : [Wp * 0.9, Hp - 20, lift(6)],
  };

  const card = <FolderSpecimenCard spot={spot} m={m} set={set} focus={setFocus} />;

  return (
    <HintLayer><XrayFrame
      xray={xray} setXray={setXray} spots={SPOTS} side={SIDE} spot={spot} setSpot={setSpot}
      solid={<div style={{ zoom: 1.4, cursor: 'zoom-in', paddingTop: 40 }}><FolderFace m={m} still /></div>}
      W={Wp} H={Hp} scene={scene} anchors={anchors}
      onReset={() => setM(INITIAL)} deps={[spot, m]}
      card={card}
    /></HintLayer>
  );
}

/** A still of the folder for the home page's table. */
export function FolderStill() {
  return <FolderFace m={INITIAL} still />;
}
