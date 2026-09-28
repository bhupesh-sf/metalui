import * as React from 'react';
import { Kbd } from '@unlocalhosted/metalui';
import { tokens } from '../../lib/tokens';
import { Exploded, IsoCap, IsoTray, XrayFrame, aim, alphaK, capTop, scalePx, tones, useRecipeLayers, type LayerDef, type SpotDef } from './kit';
import { HintLayer } from '../edit';
import { KbdSpecimenCard } from './KbdSpecimens';

/* ─────────────────────────────────────────────────────────
 * X-RAY · KEYCAP
 *
 *   solid     a chord, ⌘ K
 *   x-ray     two small raised caps on the floor (or on a dark strip, or pressed into a pill)
 *   play      Shape    height · corners · padding; a cap is never narrower than it is tall
 *             Type     size · letter spacing
 *             Surface  raised on a light surface · dark cap on a strip · sunk into a toast's Undo
 *             Light    direction · strength
 *             Shadow   height above the page
 *             Layers   the current surface's layers, each switchable
 * ───────────────────────────────────────────────────────── */

export const KBD_PROPS = tokens.recipes.kbd.props;
const P = KBD_PROPS.self;
const S = 5;
const KEYS = ['⌘', 'K'];

export type Surface = 'self' | 'strip' | 'sunk';
type Spot = 'shape' | 'type' | 'surface' | 'light' | 'shadow' | 'layers';
const SPOTS: SpotDef<Spot>[] = [
  { id: 'shape', title: 'Shape', word: 'Size and corners' },
  { id: 'type', title: 'Type', word: 'The glyph' },
  { id: 'surface', title: 'Surface', word: 'Where the key sits' },
  { id: 'light', title: 'Light', word: 'Where the light comes from' },
  { id: 'shadow', title: 'Shadow', word: 'Height above the page' },
  { id: 'layers', title: 'Layers', word: 'What it is made of' },
];
const SIDE: Record<Spot, ['left' | 'right', number]> = {
  light: ['left', 0.2], layers: ['left', 0.48], shape: ['left', 0.76],
  type: ['right', 0.2], surface: ['right', 0.48], shadow: ['right', 0.76],
};

export const LAYERS: Record<Surface, LayerDef[]> = {
  self: [
    { name: 'Fill', why: 'The key colour. A little lighter at the top, where the light hits.' },
    { name: 'Inner glow', why: 'A soft light just inside the edge. It makes the key look like soft plastic.' },
    { name: 'Top light', why: 'A thin bright line on the top left edge. It shows the key is rounded and faces the light.' },
    { name: 'Rim', why: 'A very thin outline. It keeps the small key sharp on a light background.' },
    { name: 'Contact', why: 'A small shadow right under the key. It shows the key is sitting on the surface.' },
    { name: 'Drop', why: 'A bigger, softer shadow. It shows how high the key stands.' },
  ],
  strip: [
    { name: 'Fill', why: 'A dark key colour, a little lighter than the dark strip, so the key stands out from it.' },
    { name: 'Top light', why: 'One bright line on the top edge. On a dark surface this line is all you need to show the key is raised.' },
    { name: 'Edge', why: 'A dark outline that separates the key from the strip.' },
  ],
  sunk: [
    { name: 'Fill', why: 'A dark colour, darker than the pill around it, because the key is pressed in.' },
    { name: 'Inner shadow', why: 'A shadow inside the top edge. The pill\'s edge blocks the light, so the top of the hole is dark.' },
    { name: 'Bottom light', why: 'A faint bright line under the bottom edge, where the pill catches the light again.' },
  ],
};

export interface KbdXrayModel {
  h: number; radius: number; pad: number; size: number; track: number;
  surface: Surface; lightDeg: number; lightK: number; lift: number;
  on: Record<Surface, boolean[]>;
}
export const KBD_XRAY_INITIAL: KbdXrayModel = {
  h: P.height, radius: P.radius, pad: P.pad, size: Number(P.font.match(/\d+(?=px)/)?.[0]), track: Number(P.tracking.replace('em', '')),
  surface: 'self', lightDeg: 0, lightK: 1, lift: 1,
  on: { self: LAYERS.self.map(() => true), strip: LAYERS.strip.map(() => true), sunk: LAYERS.sunk.map(() => true) },
};

export function KbdXray({ startOpen = false }: { startOpen?: boolean }) {
  const [xray, setXray] = React.useState(startOpen);
  const [spot, setSpot] = React.useState<Spot>('surface');
  const [m, setM] = React.useState<KbdXrayModel>(KBD_XRAY_INITIAL);
  const [focus, setFocus] = React.useState<string | null>(null);
  const set = React.useCallback((p: Partial<KbdXrayModel>) => setM((o) => ({ ...o, ...p })), []);
  const rec = useRecipeLayers('kbd', m.surface);
  const on = m.on[m.surface];
  const t = tones(rec.colorway);

  // one cap is as wide as its glyph plus padding, and never narrower than the minimum width
  const measure = React.useRef<HTMLSpanElement>(null);
  const [glyphW, setGlyphW] = React.useState<number[]>([7, 7]);
  React.useLayoutEffect(() => {
    const el = measure.current; if (!el) return;
    setGlyphW([...el.children].map((c) => (c as HTMLElement).offsetWidth));
  }, [m.size, m.track]);
  const minW = P.min + (m.h - P.height);
  const capW = glyphW.map((g) => Math.max(minW, g + m.pad * 2));
  const Wp = capW[0] + P.gap * 3 + capW[1], Hp = m.h;
  const PAD = m.surface === 'self' ? 0 : 7; // the strip or the pill around the keys
  const W = (Wp + PAD * 2) * S, H = (Hp + PAD * 2) * S;
  const R = m.radius * S;

  const grad = `linear-gradient(${180 + m.lightDeg}deg, ${rec.stops.join(', ')})`;
  const fill = on[0] ? grad : 'transparent';
  const liftK = (v: string) => (/^inset/.test(v) ? v : alphaK(scalePx(v, 0.4 + m.lift * 0.6), 0.5 + m.lift * 0.5));
  const shadow = rec.shadows.map((v, i) => (on[i + 1] ? aim(m.surface === 'self' ? liftK(v) : v, m.lightDeg, m.lightK) : null)).filter(Boolean).join(', ') || 'none';
  const z = m.surface === 'self' ? m.lift * 3 : m.surface === 'strip' ? 6 : 0;
  const top = capTop(z, 5);
  const exploded = spot === 'layers';
  const x0 = PAD * S;
  const capX = [x0, x0 + (capW[0] + P.gap * 3) * S];
  const labelStyle: React.CSSProperties = { font: `500 ${m.size * S}px/1 var(--mono)`, letterSpacing: `${m.track}em`, color: m.surface === 'self' ? 'var(--ink2)' : m.surface === 'strip' ? '#A6A6A9' : '#9A9A9E' };

  const plate = m.surface === 'strip'
    ? <div className="xr-face is-flat" style={{ width: W, height: H, borderRadius: H / 2, transform: 'translateZ(0.5px)', background: 'linear-gradient(#2b2b2e, #1f1f21)', boxShadow: '0 0 0 1px rgba(0,0,0,.4)' }} />
    : m.surface === 'sunk'
      ? <div className="xr-face is-flat" style={{ width: W, height: H, borderRadius: H / 2, transform: 'translateZ(0.5px)', background: 'linear-gradient(#3a3a3d, #2e2e31)' }} />
      : null;

  const scene = exploded ? (
    <>
      {plate}
      <Exploded layers={LAYERS[m.surface]} on={on} fill={grad} shadows={rec.shadows} x={capX[0]} y={x0} w={capW[0] * S} h={Hp * S} r={R} z0={6} gap={16} focus={focus} scale={S} />
    </>
  ) : (
    <>
      {plate}
      {KEYS.map((k, i) => m.surface === 'sunk'
        ? (
          <IsoTray key={k} x={capX[i]} y={x0} w={capW[i] * S} h={Hp * S} r={R} depth={6} fill={fill} shadow={scalePx(shadow, S)} colorway="graphite" />
        ) : (
          <IsoCap key={k} x={capX[i]} y={x0} w={capW[i] * S} h={Hp * S} r={R} z={z} wall={5} fill={fill} shadow={scalePx(shadow, S)} wallTone={m.surface === 'strip' ? '#1a1a1c' : t.wall}>
            <span style={labelStyle}>{k}</span>
          </IsoCap>
        ))}
      {m.surface === 'sunk' && KEYS.map((k, i) => (
        <span key={k} className="xr-seglabel" style={{ ...labelStyle, left: capX[i], top: x0, width: capW[i] * S, height: Hp * S, transform: 'translateZ(2px)', pointerEvents: 'none' }}>{k}</span>
      ))}
      {spot === 'shape' && (
        <svg className="xr-dims" viewBox={`-40 -40 ${W + 80} ${H + 80}`} style={{ width: W + 80, height: H + 80, left: -40, top: -40, transform: `translateZ(${top + 1}px)` }} aria-hidden>
          <path d={`M${x0 - 18} ${x0}V${x0 + Hp * S}M${x0 - 24} ${x0}H${x0 - 12}M${x0 - 24} ${x0 + Hp * S}H${x0 - 12}`} />
          <text x={x0 - 28} y={x0 + (Hp * S) / 2} textAnchor="end" dominantBaseline="middle">{m.h}</text>
          <path d={`M${capX[1]} ${x0 + Hp * S + 16}H${capX[1] + capW[1] * S}M${capX[1]} ${x0 + Hp * S + 10}V${x0 + Hp * S + 22}M${capX[1] + capW[1] * S} ${x0 + Hp * S + 10}V${x0 + Hp * S + 22}`} />
          <text x={capX[1] + (capW[1] * S) / 2} y={x0 + Hp * S + 34} textAnchor="middle">{Number(capW[1].toFixed(1))}</text>
          {R > 2 && <path d={`M${capX[0] + R} ${x0}A${R} ${R} 0 0 0 ${capX[0]} ${x0 + R}`} className="is-arc" />}
          <text x={capX[0] + R + 6} y={x0 - 8}>r {m.radius}</text>
        </svg>
      )}
    </>
  );

  const Z = exploded ? 6 + (LAYERS[m.surface].length - 1) * 16 : top;
  const anchors: Record<Spot, [number, number, number]> = {
    shape: [capX[0] + R * 0.3, x0 + R * 0.3, top],
    type: [capX[1] + (capW[1] * S) / 2, x0 + (Hp * S) / 2, top + 1],
    surface: [W - x0 / 2 - 4, H * 0.8, 1],
    light: [capX[0] + (capW[0] * S) / 2, x0 + 2, top],
    shadow: [capX[1] + capW[1] * S * 0.7, x0 + Hp * S + 6, 0],
    layers: [capX[0] + capW[0] * S * 0.7, x0 + Hp * S * 0.3, Z],
  };

  const chord = () => (
    <span className="flex items-center gap-kbd-gap" aria-label="Command K">
      {KEYS.map((k) => <Kbd key={k} surface={m.surface === 'self' ? 'default' : m.surface}>{k}</Kbd>)}
    </span>
  );

  const card = <KbdSpecimenCard spot={spot} m={m} set={set} focus={setFocus} />;

  return (
    <HintLayer>
      <span ref={measure} aria-hidden className="xr-measure" style={{ font: `500 ${m.size}px/1 var(--mono)`, letterSpacing: `${m.track}em` }}>
        {KEYS.map((k) => <span key={k} style={{ display: 'inline-block' }}>{k}</span>)}
      </span>
      <XrayFrame
        xray={xray} setXray={setXray} spots={SPOTS} side={SIDE} spot={spot} setSpot={setSpot}
        solid={<div style={{ zoom: S, cursor: 'zoom-in' }}>{chord()}</div>}
        W={W} H={H} scene={scene} anchors={anchors}
        sun={spot === 'light' ? { deg: m.lightDeg, k: m.lightK, z: top + 120 } : undefined}
        onReset={() => setM(KBD_XRAY_INITIAL)} deps={[spot, m, glyphW]}
        card={card}
      />
    </HintLayer>
  );
}
