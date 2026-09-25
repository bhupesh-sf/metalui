import * as React from 'react';
import { Checkbox } from '@unlocalhosted/metalui';
import { tokens } from '../../lib/tokens';
import { Exploded, IsoCap, IsoTray, XrayFrame, aim, capTop, scalePx, useStateLayers, type LayerDef, type SpotDef } from './kit';
import { HintLayer } from '../edit';
import { CheckboxSpecimenCard } from './CheckboxSpecimens';

/* ─────────────────────────────────────────────────────────
 * X-RAY · CHECKBOX
 *
 *   solid     a task line with its checkbox in the margin; click to tick it
 *   x-ray     at rest a small square hole; ticked, a dark key fills the hole and the tick draws on;
 *             doing, the hole is half green; suggested, a hollow ring
 *   play      States  rest · hover · done · doing · suggested
 *             Tick    how the tick is drawn, and replay it
 *             Shape   size · corners · its place in the margin
 *             Well    how deep the hole is
 *             Light   direction · strength
 *             Layers  the layers of the current state
 * ───────────────────────────────────────────────────────── */

const R = tokens.recipes.checkbox;
const P = R.props;
const DOING = R.layers.find((l) => l.part === 'doing')!.value;
const S = 10;

type State = 'rest' | 'hover' | 'on' | 'doing' | 'ghost';
type Spot = 'states' | 'tick' | 'shape' | 'well' | 'light' | 'layers';
const SPOTS: SpotDef<Spot>[] = [
  { id: 'states', title: 'States', word: 'Every way it can look' },
  { id: 'tick', title: 'Tick', word: 'How the tick is drawn' },
  { id: 'shape', title: 'Shape', word: 'Size and place' },
  { id: 'well', title: 'Well', word: 'The small hole' },
  { id: 'light', title: 'Light', word: 'Where the light comes from' },
  { id: 'layers', title: 'Layers', word: 'What it is made of' },
];
const SIDE: Record<Spot, ['left' | 'right', number]> = {
  light: ['left', 0.2], shape: ['left', 0.48], well: ['left', 0.76],
  layers: ['right', 0.2], tick: ['right', 0.48], states: ['right', 0.76],
};

export const LAYERS: Record<'rest' | 'on' | 'ghost', LayerDef[]> = {
  rest: [
    { name: 'Hole fill', why: 'The colour inside the hole. Darker at the top, lighter at the bottom, because the hole goes down into the page.' },
    { name: 'Inner shadow', why: 'A soft shadow inside the top edge. The edge blocks the light, so the top of the hole is darker.' },
    { name: 'Edge line', why: 'A very thin outline so the hole still has an edge on a light page.' },
    { name: 'Bottom light', why: 'A thin bright line on the bottom edge, where the light hits the far wall of the hole.' },
  ],
  on: [
    { name: 'Dark fill', why: 'When the task is done, the hole fills with a dark key. Dark means done, and it is easy to see in a long list.' },
    { name: 'Top light', why: 'A thin bright line on the top edge. It shows the dark key is raised a little, not a flat dark square.' },
    { name: 'Shadow', why: 'A small shadow under the key. With the top light, it makes the key look pressed into place.' },
  ],
  ghost: [
    { name: 'Clear fill', why: 'No fill at all. Nobody wrote this task. The app guessed it, so it is only an outline.' },
    { name: 'Ring', why: 'A thin outline. It says "there could be a task here" without looking like a real one.' },
    { name: 'Inner shadow', why: 'A faint shadow inside the top edge, so the ring still looks like a shallow hole.' },
  ],
};
export const groupOf = (s: State): 'rest' | 'on' | 'ghost' => (s === 'on' ? 'on' : s === 'ghost' ? 'ghost' : 'rest');

export interface Model {
  state: State; size: number; radius: number; depth: number; angle: number;
  lightDeg: number; lightK: number;
  on: Record<'rest' | 'on' | 'ghost', boolean[]>;
}
const INITIAL: Model = {
  state: 'rest', size: P.self.size, radius: P.self.radius, depth: 1, angle: parseFloat(P.tick.rotate),
  lightDeg: 0, lightK: 1,
  on: { rest: LAYERS.rest.map(() => true), on: LAYERS.on.map(() => true), ghost: LAYERS.ghost.map(() => true) },
};

export function CheckboxXray({ startOpen = false }: { startOpen?: boolean }) {
  const [xray, setXray] = React.useState(startOpen);
  const [spot, setSpot] = React.useState<Spot>('states');
  const [m, setM] = React.useState<Model>(INITIAL);
  const [focus, setFocus] = React.useState<string | null>(null);
  const [replay, setReplay] = React.useState(0);
  const set = React.useCallback((p: Partial<Model>) => setM((o) => ({ ...o, ...p })), []);
  const setState = (state: State) => {
    const ordinaryRadius = m.size === P.row.size ? P.row.radius : P.self.radius;
    const radius = state === 'ghost' && m.state !== 'ghost' && m.radius === ordinaryRadius ? P.ghost.radius
      : m.state === 'ghost' && state !== 'ghost' && m.radius === P.ghost.radius ? ordinaryRadius : m.radius;
    set({ state, radius });
    if (state === 'on') setReplay((n) => n + 1);
  };

  const rest = useStateLayers('checkbox', '');
  const hover = useStateLayers('checkbox', 'hover');
  const onL = useStateLayers('checkbox', 'on');
  const ghostL = useStateLayers('checkbox', 'ghost');
  const g = groupOf(m.state);
  const on = m.on[g];

  const ghost = m.state === 'ghost';
  const size = ghost ? P.ghost.size : m.size;
  const radius = m.radius;
  const W = m.size * S, H = m.size * S, w = size * S, r = radius * S, off = ((m.size - size) / 2) * S;

  const lit = (list: string[], mask: boolean[], k = 1) => list.map((v, i) => (mask[i + 1] ? aim(k === 1 ? v : v.replace(/rgba\(([^)]*),\s*([\d.]+)\)/, (_, c, a) => `rgba(${c},${Math.min(1, Number(a) * k).toFixed(3)})`), m.lightDeg, m.lightK) : null)).filter(Boolean).join(', ') || 'none';
  const restFill = (m.state === 'hover' ? hover.fill : rest.fill).replace('linear-gradient(', `linear-gradient(${180 + m.lightDeg}deg, `);
  const holeFill = on[0] ? restFill : 'transparent';
  const D = tokens.recipes.checkbox.props.doing as { inset: number; radius: number; opacity: string };
  const holeShadow = scalePx(lit(rest.shadows.map((v, i) => (i === 0 ? v : v)), m.on.rest, m.depth), S);
  const keyFill = m.on.on[0] ? onL.fill.replace('linear-gradient(', `linear-gradient(${180 + m.lightDeg}deg, `) : 'transparent';
  const keyShadow = scalePx(lit(onL.shadows, m.on.on), S);
  const ringShadow = scalePx(lit(ghostL.shadows, m.on.ghost), S);
  const exploded = spot === 'layers';
  const keyZ = 0.5, top = capTop(keyZ, 4);

  const tick = (
    <span key={replay} className="xr-tick" style={{ left: P.tick.x * S * (m.size / P.self.size), top: P.tick.y * S * (m.size / P.self.size), width: P.tick.w * S, height: P.tick.h * S, borderWidth: `0 ${P.tick.stroke * S}px ${P.tick.stroke * S}px 0`, transform: `rotate(${m.angle}deg)`, animationDuration: P.tick.draw, animationDelay: P.tick.delay }} />
  );

  const scene = exploded ? (
    <Exploded layers={LAYERS[g]} on={on} fill={g === 'on' ? keyFill : g === 'ghost' ? 'transparent' : holeFill}
      shadows={g === 'on' ? onL.shadows : g === 'ghost' ? ghostL.shadows : rest.shadows} x={off} y={off} w={w} h={w} r={r} z0={2} gap={26} focus={focus} scale={S} />
  ) : (
    <>
      {ghost
        ? <div className="xr-face is-flat" style={{ left: off, top: off, width: w, height: w, borderRadius: r, transform: 'translateZ(0.5px)', boxShadow: ringShadow }} />
        : <IsoTray w={W} h={H} r={r} depth={6 * m.depth} fill={holeFill} shadow={holeShadow} colorway={rest.colorway} />}
      {m.state === 'doing' && <div className="xr-face is-flat" style={{ left: D.inset * S, top: D.inset * S, width: W - D.inset * S * 2, height: H - D.inset * S * 2, borderRadius: D.radius * S, transform: 'translateZ(1px)', background: DOING, opacity: Number(D.opacity) }} />}
      {m.state === 'on' && (
        <IsoCap w={W} h={H} r={r} z={keyZ} wall={4} fill={keyFill} shadow={keyShadow} wallTone="#161618">{tick}</IsoCap>
      )}
      {spot === 'shape' && (
        <svg className="xr-dims" viewBox={`-40 -40 ${W + 80} ${H + 80}`} style={{ width: W + 80, height: H + 80, left: -40, top: -40, transform: `translateZ(${top + 1}px)` }} aria-hidden>
          <path d={`M-18 0V${H}M-24 0H-12M-24 ${H}H-12`} />
          <text x="-28" y={H / 2} textAnchor="end" dominantBaseline="middle">{m.size}</text>
          {r > 2 && <path d={`M${r} 0A${r} ${r} 0 0 0 0 ${r}`} className="is-arc" />}
          <text x={r + 6} y={-8}>r {m.radius}</text>
        </svg>
      )}
    </>
  );

  const Zl = exploded ? 2 + (LAYERS[g].length - 1) * 26 : m.state === 'on' ? top : 6 * m.depth;
  const anchors: Record<Spot, [number, number, number]> = {
    states: [W * 0.85, H * 0.85, Zl],
    tick: [W * 0.55, H * 0.4, m.state === 'on' ? top + 1 : 2],
    shape: [r * 0.3, H - r * 0.3, 6 * m.depth],
    well: [W * 0.3, H * 0.75, 1],
    light: [W * 0.4, 1, 6 * m.depth],
    layers: exploded ? [off + w * 0.7, off + w * 0.2, Zl] : [W * 0.2, H * 0.3, 2],
  };

  const real = (
    <Checkbox aria-label="Task" checked={m.state === 'on'} doing={m.state === 'doing'} ghost={ghost} size={m.size === P.row.size ? 'row' : 'margin'}
      onCheckedChange={(v) => setState(v ? 'on' : 'rest')} />
  );
  const line = (
    <span className="flex items-center gap-10" style={{ font: '500 15px/22px var(--sans)', letterSpacing: '-.015em' }}>
      {real}
      <span style={m.state === 'on' ? { color: 'var(--ink3)', textDecoration: 'line-through' } : undefined}>call printer about paper stock</span>
    </span>
  );

  const card = <CheckboxSpecimenCard spot={spot} m={m} set={set} setState={setState} focus={setFocus} />;

  return (
    <HintLayer><XrayFrame
      xray={xray} setXray={setXray} spots={SPOTS} side={SIDE} spot={spot} setSpot={(next) => { setSpot(next); if (next === 'tick') setState('on'); if (next === 'well') setState('rest'); }}
      solid={<div style={{ zoom: 2.4 }} onClick={(e) => e.stopPropagation()}>{line}</div>}
      W={W} H={H} scene={scene} anchors={anchors}
      sun={spot === 'light' ? { deg: m.lightDeg, k: m.lightK, z: top + 120 } : undefined}
      onReset={() => setM(INITIAL)} deps={[spot, m]}
      card={card}
    /></HintLayer>
  );
}
