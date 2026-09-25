import * as React from 'react';
import { Swatch, swatchInk } from '@unlocalhosted/metalui';
import { tokens } from '../../lib/tokens';
import { Exploded, IsoCap, XrayFrame, aim, capTop, scalePx, type LayerDef, type SpotDef } from './kit';
import { HintLayer } from '../edit';
import { SwatchSpecimenCard } from './SwatchSpecimens';

/* ─────────────────────────────────────────────────────────
 * X-RAY · SWATCH
 *
 *   solid     a colour chip
 *   x-ray     a thick glossy chip in its own colour, its label engraved top left,
 *             a small dimple top right, its drop shadow tinted with its own colour
 *   card      the real chip has handles for its recipe dimensions, colour, light,
 *             dimple and shadow; layer switches show the construction.
 * ───────────────────────────────────────────────────────── */

const R = tokens.recipes.swatch as { props: { self: { size: number; radius: number }; label: { font: string; tracking: string; x: number; y: number; 'ink-dark': string; 'ink-light': string }; led: { size: number; inset: number } }; layers: { part: string; prop: string; value: string }[] };
const P = R.props;
const S = 3;
const SHEEN = R.layers.find((l) => l.part === 'self' && l.prop === 'background' && l.value !== 'self')!.value;
const SHEEN_ANGLE = Number(SHEEN.match(/linear-gradient\(([\d.]+)deg/)?.[1]);
const LABEL_SIZE = Number(P.label.font.match(/[\d.]+(?=px)/)?.[0]);
const SHADOWS = R.layers.filter((l) => l.part === 'self' && l.prop === 'shadow').map((l) => l.value);
const LED = R.layers.filter((l) => l.part === 'led');

type Spot = 'shape' | 'type' | 'light' | 'well' | 'shadow' | 'layers';
const SPOTS: SpotDef<Spot>[] = [
  { id: 'shape', title: 'Shape', word: 'Size and corners' },
  { id: 'type', title: 'Type', word: 'The engraved label' },
  { id: 'light', title: 'Light', word: 'The shine' },
  { id: 'well', title: 'Dimple', word: 'The small hole' },
  { id: 'shadow', title: 'Shadow', word: 'A shadow in its own colour' },
  { id: 'layers', title: 'Layers', word: 'What it is made of' },
];
const SIDE: Record<Spot, ['left' | 'right', number]> = {
  type: ['left', 0.2], light: ['left', 0.48], shape: ['left', 0.76],
  well: ['right', 0.2], layers: ['right', 0.48], shadow: ['right', 0.76],
};

export const LAYERS: LayerDef[] = [
  { name: 'Colour', why: 'The chip is made of its own colour, all the way through. The sides are the same colour, only darker.' },
  { name: 'Shine', why: 'A see-through white fade from the top left corner. It makes the chip look hard and glossy, like a sweet or a plastic tile.' },
  { name: 'Top edge', why: 'A thin bright line along the top. It shows the top edge is rounded and catches the light.' },
  { name: 'Bottom edge', why: 'A thin dark line along the bottom, where the chip turns away from the light.' },
  { name: 'Inner glow', why: 'A soft light just inside the edge, so the colour looks lit from within the plastic.' },
  { name: 'Contact', why: 'A small grey shadow right under the chip. It shows the chip is sitting on the page.' },
  { name: 'Coloured drop', why: 'A big soft shadow in the chip\'s own colour. Light passing through coloured plastic makes a coloured shadow, so this makes it look real.' },
];

export interface Model {
  hex: string; size: number; radius: number; sheen: number; lightDeg: number; lightK: number;
  dimple: number; lift: number; on: boolean[];
}
export const INITIAL: Model = {
  hex: '#FF6B3D', size: P.self.size, radius: P.self.radius, sheen: 1, lightDeg: 0, lightK: 1,
  dimple: 1, lift: 1, on: LAYERS.map(() => true),
};

const rgb = (hex: string) => { const v = hex.replace('#', ''); const n = parseInt(v.length === 3 ? v.replace(/./g, '$&$&') : v, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const shade = (hex: string, k: number) => `rgb(${rgb(hex).map((c) => Math.round(c * k)).join(',')})`;

/** The recipe's shadows with "self" swapped for the chip's colour. */
export function selfShadows(m: Model) {
  const [r, g, b] = rgb(m.hex);
  return SHADOWS.map((v, i) => {
    let s = v.replace(/self\/\.?(\d+)/, (_, a) => `rgba(${r},${g},${b},.${a})`);
    if (i >= 3) s = scalePx(s, 0.4 + m.lift * 0.6);
    return aim(s, m.lightDeg, i < 3 ? m.lightK : 1);
  });
}

export function SwatchXray({ startOpen = false }: { startOpen?: boolean }) {
  const [xray, setXray] = React.useState(startOpen);
  const [spot, setSpot] = React.useState<Spot>('shadow');
  const [m, setM] = React.useState<Model>(INITIAL);
  const [focus, setFocus] = React.useState<string | null>(null);
  const set = React.useCallback((p: Partial<Model>) => setM((o) => ({ ...o, ...p })), []);

  const W = m.size * S, H = m.size * S, Rr = m.radius * S;
  const shadows = selfShadows(m);
  const sheen = SHEEN.replace(`${SHEEN_ANGLE}deg`, `${SHEEN_ANGLE + m.lightDeg}deg`).replace(/rgba\(255,255,255,\.(\d+)\)/, (_, a) => `rgba(255,255,255,${(Number(`.${a}`) * m.sheen).toFixed(3)})`);
  const fill = [m.on[1] ? sheen : null, m.on[0] ? m.hex : null].filter(Boolean).join(', ') || 'transparent';
  const inset = shadows.slice(0, 3).filter((_, i) => m.on[i + 2]);
  const faceShadow = scalePx(inset.join(', '), S) || 'none';
  const z = m.lift * 4;
  const WALL = 10;
  const top = capTop(z, WALL);
  const ink = swatchInk(m.hex) === 'dark' ? P.label['ink-dark'] : P.label['ink-light'];
  const exploded = spot === 'layers';
  const led = P.led.size * S * m.dimple, ledX = W - P.led.inset * S - led, ledY = P.led.inset * S;

  const scene = exploded ? (
    <Exploded layers={LAYERS} on={m.on} fill={m.hex} backgrounds={[m.hex, sheen]} shadows={['none', ...shadows]} w={W} h={H} r={Rr} z0={4} gap={22} focus={focus} scale={S} />
  ) : (
    <>
      {m.on[6] && <div className="xr-shadow" style={{ width: W, height: H, borderRadius: Rr, background: m.hex, filter: `blur(${10 + m.lift * 8}px)`, opacity: 0.55, transform: `translate(${m.lift * 6}px, ${m.lift * 12}px)` }} />}
      {m.on[5] && <div className="xr-shadow" style={{ width: W, height: H, borderRadius: Rr, filter: 'blur(2px)', opacity: 0.18 }} />}
      <IsoCap w={W} h={H} r={Rr} z={z} wall={WALL} fill={fill} shadow={faceShadow} wallTone={m.on[0] ? shade(m.hex, 0.72) : 'transparent'}>
        <span style={{ position: 'absolute', left: P.label.x * S, top: P.label.y * S, font: `600 ${LABEL_SIZE * S}px/1 var(--mono)`, letterSpacing: P.label.tracking, color: ink }}>{m.hex}</span>
      </IsoCap>
      {m.dimple > 0 && (
        <div className="xr-face is-flat" style={{ left: ledX, top: ledY, width: led, height: led, borderRadius: '50%', transform: `translateZ(${top + 0.5}px)`, background: LED[0].value, boxShadow: scalePx(LED.slice(1).map((l) => l.value).join(', '), S) }} />
      )}
      {spot === 'shape' && (
        <svg className="xr-dims" viewBox={`-40 -40 ${W + 80} ${H + 80}`} style={{ width: W + 80, height: H + 80, left: -40, top: -40, transform: `translateZ(${top + 1}px)` }} aria-hidden>
          <path d={`M-18 0V${H}M-24 0H-12M-24 ${H}H-12`} />
          <text x="-28" y={H / 2} textAnchor="end" dominantBaseline="middle">{m.size}</text>
          {Rr > 2 && <path d={`M${Rr} 0A${Rr} ${Rr} 0 0 0 0 ${Rr}`} className="is-arc" />}
          <text x={Rr + 6} y={-8}>r {m.radius}</text>
        </svg>
      )}
    </>
  );

  const anchors: Record<Spot, [number, number, number]> = {
    shape: [Rr * 0.3, H - Rr * 0.3, top],
    type: [P.label.x * S + 30, P.label.y * S + 12, top + 1],
    light: [W * 0.3, H * 0.35, top],
    well: [ledX + led / 2, ledY + led / 2, top],
    shadow: [W * 0.9, H + 20, 0],
    layers: exploded ? [W * 0.8, H * 0.2, 4 + (LAYERS.length - 1) * 22] : [W * 0.7, H * 0.7, top],
  };

  const card = <SwatchSpecimenCard spot={spot} m={m} set={set} focus={setFocus} fill={fill} shadows={shadows} />;

  return (
    <HintLayer><XrayFrame
      xray={xray} setXray={setXray} spots={SPOTS} side={SIDE} spot={spot} setSpot={setSpot}
      solid={<div style={{ zoom: 2.2, cursor: 'zoom-in' }}><Swatch hex={m.hex} /></div>}
      W={W} H={H} scene={scene} anchors={anchors}
      sun={spot === 'light' ? { deg: m.lightDeg, k: m.lightK, z: top + 120 } : undefined}
      onReset={() => setM(INITIAL)} deps={[spot, m]}
      card={card}
    /></HintLayer>
  );
}
