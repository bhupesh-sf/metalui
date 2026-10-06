import * as React from 'react';
import { IconButton } from '@unlocalhosted/metalui';
import { Icon } from '@unlocalhosted/metalui/icons';
import { tokens } from '../../lib/tokens';
import { Exploded, IsoCap, XrayFrame, aim, capTop, scalePx, useStateLayers, type LayerDef, type SpotDef } from './kit';
import { HintLayer } from '../edit';
import { IconButtonSpecimenCard } from './IconButtonSpecimens';

/* ─────────────────────────────────────────────────────────
 * X-RAY · ICON BUTTON (the tool cap)
 *
 *   solid     a graphite tool cap with a glyph; click to latch it
 *   x-ray     the cap standing on a dark strip; pressed, it drops, turns dark inside,
 *             and a small green LED lights in its corner
 *   card      the real icon button, handled (IconButtonSpecimens.tsx); the bench reads the same model
 *             Press    press it and pull down for how far it sinks
 *             Latch    stay down, a switch (or click the cap)
 *             Shape    top edge for size, corner for corners, the glyph up or down for its size
 *             Kinds    drag it sideways: tool · ghost · mini (steps, never between)
 *             Light    the sun on an arc
 *             Layers   up and down layers, each a row with a switch
 * ───────────────────────────────────────────────────────── */

const P = tokens.recipes['icon-button'].props;
const S = 5;

export type Spot = 'press' | 'states' | 'shape' | 'surface' | 'light' | 'layers';
const SPOTS: SpotDef<Spot>[] = [
  { id: 'press', title: 'Press', word: 'A quick tap' },
  { id: 'states', title: 'Latch', word: 'Staying down' },
  { id: 'shape', title: 'Shape', word: 'Size and corners' },
  { id: 'surface', title: 'Kinds', word: 'Tool, ghost and mini' },
  { id: 'light', title: 'Light', word: 'Where the light comes from' },
  { id: 'layers', title: 'Layers', word: 'What it is made of' },
];
const SIDE: Record<Spot, ['left' | 'right', number]> = {
  light: ['left', 0.2], shape: ['left', 0.48], surface: ['left', 0.76],
  states: ['right', 0.2], layers: ['right', 0.48], press: ['right', 0.76],
};

export const UP: LayerDef[] = [
  { name: 'Fill', why: 'A dark grey cap, a little lighter at the top. Tools sit on a dark bar, so the cap is dark too.' },
  { name: 'Top light', why: 'A thin bright line on the top edge. On a dark cap this line is what shows it is raised.' },
  { name: 'Bottom line', why: 'A thin dark line on the bottom edge, where the cap turns away from the light.' },
  { name: 'Edge', why: 'A dark outline that keeps the cap apart from the dark bar.' },
  { name: 'Contact', why: 'A small shadow right under the cap, where it touches the bar.' },
  { name: 'Drop', why: 'A soft shadow a little lower. It shows the cap stands up.' },
];
export const DOWN: LayerDef[] = [
  { name: 'Dark fill', why: 'Pressed, the cap is almost black. It looks like you are seeing into the hole it dropped into.' },
  { name: 'Inner shadow', why: 'A shadow inside the top edge. The cap is now below the bar, so the edge hides the light.' },
  { name: 'Edge', why: 'A dark outline, the same as when it is up.' },
  { name: 'Bottom light', why: 'A faint bright line under the bottom edge, like every hole in this system.' },
];

export type Kind = 'tool' | 'ghost' | 'mini';
export interface Model {
  kind: Kind; latched: boolean; size: number; radius: number; glyph: number; press: number; lightDeg: number; lightK: number;
  up: boolean[]; down: boolean[];
}
const INITIAL: Model = {
  kind: 'tool', latched: false, size: P.tool.size, radius: P.tool.radius, glyph: P.tool.glyph, press: P.tool.press, lightDeg: 0, lightK: 1,
  up: UP.map(() => true), down: DOWN.map(() => true),
};

export function IconButtonXray({ startOpen = false }: { startOpen?: boolean }) {
  const [xray, setXray] = React.useState(startOpen);
  const [spot, setSpot] = React.useState<Spot>('states');
  const [m, setM] = React.useState<Model>(INITIAL);
  // held down on the specimen (the Press card): the model sinks with it
  const [tap, setTap] = React.useState(false);
  const [focus, setFocus] = React.useState<string | null>(null);
  const set = React.useCallback((p: Partial<Model>) => setM((o) => ({ ...o, ...p })), []);
  const up = useStateLayers('icon-button', '', 'tool');
  const down = useStateLayers('icon-button', 'pressed', 'tool');
  const hoverFill = useStateLayers('icon-button', 'hover', m.kind === 'mini' ? 'mini' : 'ghost');
  const colorway = up.colorway as 'bone' | 'graphite';

  const tool = m.kind === 'tool';
  const isDown = m.latched || tap;
  const PAD = 8;
  const W = (m.size + PAD * 2) * S, H = W, x0 = PAD * S, w = m.size * S, r = m.radius * S;
  const grad = (v: string) => v.replace('linear-gradient(', `linear-gradient(${180 + m.lightDeg}deg, `);
  const shade = (list: string[], mask: boolean[]) => scalePx(list.map((v, i) => (mask[i + 1] ? aim(v, m.lightDeg, m.lightK) : null)).filter(Boolean).join(', ') || 'none', S);
  const fill = isDown ? (m.down[0] ? grad(down.fill) : 'transparent') : (m.up[0] ? grad(up.fill) : 'transparent');
  const shadow = isDown ? shade(down.shadows, m.down) : shade(up.shadows, m.up);
  const z = isDown ? 0.5 : 0.5 + m.press * S;
  const WALL = 4;
  const top = capTop(z, WALL);
  const exploded = tool && spot === 'layers';
  const press = `transform ${P.tool['press-time']} linear, box-shadow ${P.tool['shadow-time']} ease-out`;
  const led = P.led.size * S;
  // The latch lights the LED part's live lamp (the status recipe), as the real key does.
  const lamp = useStateLayers('status', 'live', 'led');
  // a ghost or a mini is flat: no strip, no wall, only its own footprint on the page
  const fw = (m.kind === 'ghost' ? P.ghost.size : P.mini.w) * S, fh = (m.kind === 'ghost' ? P.ghost.size : P.mini.h) * S;
  const fx = (W - fw) / 2, fy = (H - fh) / 2;

  const scene = !tool ? (
    <div className="xr-face is-flat" data-ib-kind={m.kind} style={{ width: fw, height: fh, borderRadius: fh / 2, transform: `translate(${fx}px, ${fy}px) translateZ(0.5px)`, background: hoverFill.fill, boxShadow: '0 0 0 1px color-mix(in srgb, var(--green-deep) 45%, transparent)' }}>
      {m.kind === 'ghost'
        ? <span style={{ color: P.ghost.ink[colorway], display: 'grid', placeItems: 'center' }}><Icon name="more" size={P.ghost.glyph * S} /></span>
        : <span style={{ color: P.mini.ink[colorway], font: P.mini.font.replace(/(\d+)px/, (_, n) => `${Number(n) * S}px`).replace('sans', 'var(--mu-sans)') }}>✓</span>}
    </div>
  ) : exploded ? (
    <>
      <div className="xr-face is-flat" data-ib-kind="tool" style={{ width: W, height: H, borderRadius: (m.radius + 6) * S, transform: 'translateZ(0.5px)', background: 'linear-gradient(#2b2b2e, #1f1f21)' }} />
      <Exploded layers={m.latched ? DOWN : UP} on={m.latched ? m.down : m.up} fill={grad(m.latched ? down.fill : up.fill)} shadows={m.latched ? down.shadows : up.shadows} x={x0} y={x0} w={w} h={w} r={r} z0={4} gap={20} focus={focus} scale={S} />
    </>
  ) : (
    <>
      <div className="xr-face is-flat" data-ib-kind="tool" style={{ width: W, height: H, borderRadius: (m.radius + 6) * S, transform: 'translateZ(0.5px)', background: 'linear-gradient(#2b2b2e, #1f1f21)', boxShadow: '0 0 0 1px rgba(0,0,0,.4)' }} />
      <IsoCap x={x0} y={x0} w={w} h={w} r={r} z={z} wall={WALL} fill={fill} shadow={shadow} wallTone="#18181a" transition={press}>
        <span className="xr-ib-glyph" style={{ color: P.tool.ink, display: 'grid', placeItems: 'center' }}><Icon name="select" size={m.glyph * S} /></span>
        {m.latched && <span className="xr-led" style={{ top: P.led.inset * S, right: P.led.inset * S, width: led, height: led, background: lamp.fill, boxShadow: scalePx(lamp.shadows.join(', '), S) }} />}
      </IsoCap>
      {spot === 'shape' && (
        <svg className="xr-dims" viewBox={`-40 -40 ${W + 80} ${H + 80}`} style={{ width: W + 80, height: H + 80, left: -40, top: -40, transform: `translateZ(${top + 1}px)` }} aria-hidden>
          <path d={`M${x0 - 18} ${x0}V${x0 + w}M${x0 - 24} ${x0}H${x0 - 12}M${x0 - 24} ${x0 + w}H${x0 - 12}`} />
          <text x={x0 - 28} y={x0 + w / 2} textAnchor="end" dominantBaseline="middle">{m.size}</text>
          {r > 2 && <path d={`M${x0 + r} ${x0}A${r} ${r} 0 0 0 ${x0} ${x0 + r}`} className="is-arc" />}
          <text x={x0 + r + 6} y={x0 - 8}>r {m.radius}</text>
        </svg>
      )}
    </>
  );

  const Zl = exploded ? 4 + ((m.latched ? DOWN : UP).length - 1) * 20 : top;
  const anchors: Record<Spot, [number, number, number]> = tool ? {
    press: [x0 + w * 0.85, x0 + w * 0.85, top - 2],
    states: [x0 + w - P.led.inset * S - led / 2, x0 + P.led.inset * S + led / 2, top + 1],
    shape: [x0 + r * 0.3, x0 + w - r * 0.3, top],
    surface: [W * 0.1, H * 0.9, 0.5],
    light: [x0 + w * 0.35, x0 + 2, top],
    layers: [x0 + w * 0.3, x0 + w * 0.3, Zl],
  } : {
    press: [fx + fw * 0.85, fy + fh * 0.85, 0.5],
    states: [fx + fw * 0.85, fy + fh * 0.15, 0.5],
    shape: [fx + fw * 0.15, fy + fh * 0.5, 0.5],
    surface: [fx + fw * 0.5, fy + fh, 0.5],
    light: [fx + fw * 0.35, fy, 0.5],
    layers: [fx + fw * 0.3, fy + fh * 0.3, 0.5],
  };

  const real = (
    <span data-mu-colorway="graphite" className="material-frost-graphite inline-flex rounded-pill p-6">
      <IconButton variant="tool" label="Select" icon={<Icon name="select" size={16} />} pressed={m.latched} onClick={() => set({ latched: !m.latched })} />
    </span>
  );

  // the card holds the real icon button to handle; the model above reads the same values
  const card = <IconButtonSpecimenCard spot={spot} m={m} set={set} focus={setFocus} onPress={setTap} />;

  return (
    <HintLayer>
      <XrayFrame
        xray={xray} setXray={setXray} spots={SPOTS} side={SIDE} spot={spot} setSpot={setSpot}
        solid={<div style={{ zoom: 2.4 }} onClick={(e) => e.stopPropagation()}>{real}</div>}
        W={W} H={H} scene={scene} anchors={anchors}
        sun={spot === 'light' && tool ? { deg: m.lightDeg, k: m.lightK, z: top + 120 } : undefined}
        onReset={() => setM(INITIAL)} deps={[spot, m, tap]}
        card={card}
      />
    </HintLayer>
  );
}
