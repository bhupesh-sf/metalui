import * as React from 'react';
import { IconButton, Tooltip, TooltipProvider } from '@unlocalhosted/metalui';
import { Icon } from '@unlocalhosted/metalui/icons';
import { tokens } from '../../lib/tokens';
import { Exploded, IsoCap, XrayFrame, capTop, scalePx, useRecipeLayers, type LayerDef, type SpotDef } from './kit';
import { HintLayer } from '../edit';
import { TooltipSpecimenCard } from './TooltipSpecimens';

/* ─────────────────────────────────────────────────────────
 * X-RAY · TOOLTIP
 *
 *   solid     a tool cap; point at it and its tooltip shows
 *   x-ray     the cap on the page, and the label floating above it, high over everything
 *   card      the real tooltip beside a real tool, changed by handling it (TooltipSpecimens):
 *             Timing   point at the tools; the wait is a readout (its tokens: a name, a note)
 *             Type     show the key (switch)
 *             Place    drag the label to another side (steps); its near edge sets the gap
 *             Shape    its right end sets the space on the sides, its corner rounds it; long note (switch)
 *             Shadow   drag the label up to float it higher
 *             Layers   a switch per layer
 * ───────────────────────────────────────────────────────── */

type Ink = { bone: string; graphite: string };
const R = tokens.recipes.tooltip as { props: { self: { 'max-width': number; 'pad-y': number; 'pad-x': number; radius: number; ink: Ink }; key: { ink: Ink } } };
const P = R.props;
const TL = tokens.recipes['icon-button'].layers as { part: string; prop: string; value: string; state?: string }[];
const TOOL_BG = TL.find((l) => l.part === 'tool' && l.prop === 'background' && !l.state)!.value;
const TOOL_SH = TL.filter((l) => l.part === 'tool' && l.prop === 'shadow' && !l.state).map((l) => l.value);
const S = 3;

type Spot = 'states' | 'type' | 'surface' | 'shape' | 'shadow' | 'layers';
const SPOTS: SpotDef<Spot>[] = [
  { id: 'states', title: 'Timing', word: 'When it shows' },
  { id: 'type', title: 'Type', word: 'Name and key' },
  { id: 'surface', title: 'Place', word: 'Where it goes' },
  { id: 'shape', title: 'Shape', word: 'Size and wrapping' },
  { id: 'shadow', title: 'Shadow', word: 'Floating highest' },
  { id: 'layers', title: 'Layers', word: 'What it is made of' },
];
const SIDE: Record<Spot, ['left' | 'right', number]> = {
  type: ['left', 0.2], shape: ['left', 0.48], surface: ['left', 0.76],
  layers: ['right', 0.2], shadow: ['right', 0.48], states: ['right', 0.76],
};

export const LAYERS: LayerDef[] = [
  { name: 'Dark glass', why: 'The same dark glass as the toolbar. Tooltips name tools, so they are made of the same stuff.' },
  { name: 'Inner glow', why: 'A faint light just inside the edge.' },
  { name: 'Top light', why: 'A soft bright edge along the top left.' },
  { name: 'Bottom shade', why: 'A soft dark edge along the bottom right.' },
  { name: 'Rim', why: 'A thin dark outline.' },
  { name: 'Contact', why: 'A small shadow.' },
  { name: 'Near shadow', why: 'A bigger soft shadow.' },
  { name: 'Far shadow', why: 'A very big soft shadow. It floats high, above menus and toasts.' },
];

export type Side = 'top' | 'bottom' | 'left' | 'right';
export interface Model { side: Side; gap: number; long: boolean; showKey: boolean; padX: number; radius: number; lift: number; delay: number; on: boolean[] }
export const INITIAL: Model = { side: 'top', gap: tokens.tooltip.gap, long: false, showKey: true, padX: P.self['pad-x'], radius: P.self.radius, lift: 1, delay: tokens.tooltip['delay-ms'], on: LAYERS.map(() => true) };

export function TooltipXray({ startOpen = false }: { startOpen?: boolean }) {
  const [xray, setXray] = React.useState(startOpen);
  const [spot, setSpot] = React.useState<Spot>('states');
  const [m, setM] = React.useState<Model>(INITIAL);
  const { fill: BG, shadows: SH, colorway } = useRecipeLayers('tooltip');
  // is the specimen's tooltip showing? The Timing card reports its real one; every other card holds it open
  const [shown, setShown] = React.useState(true);
  const [focus, setFocus] = React.useState<string | null>(null);
  const set = React.useCallback((p: Partial<Model>) => setM((o) => ({ ...o, ...p })), []);
  React.useEffect(() => { if (spot !== 'states') setShown(true); }, [spot]);

  const measure = React.useRef<HTMLSpanElement>(null);
  const [tw, setTw] = React.useState(60);
  const text = m.long ? 'Made from a message you sent · 2 days ago' : 'SELECT';
  React.useLayoutEffect(() => { if (measure.current) setTw(Math.min(P.self['max-width'] - m.padX * 2, measure.current.offsetWidth)); }, [text, m.showKey, m.padX]);
  const lines = m.long && measure.current && measure.current.offsetWidth > P.self['max-width'] - m.padX * 2 ? 2 : 1;
  const TW = tw + m.padX * 2, TH = 14.5 * lines + P.self['pad-y'] * 2;
  const CAP = 38;
  // the cap and the label, laid out for the side the label sits on
  const across = m.side === 'left' || m.side === 'right';
  const Wp = across ? CAP + m.gap + TW + 20 : Math.max(TW, CAP) + 20;
  const Hp = across ? Math.max(TH, CAP) + 20 : CAP + m.gap + TH + 10;
  const W = Wp * S, H = Hp * S;
  const capX = (across ? (m.side === 'left' ? 10 + TW + m.gap : 10) : (Wp - CAP) / 2) * S;
  const capY = (across ? (Hp - CAP) / 2 : m.side === 'top' ? TH + m.gap : 0) * S;
  const tipX = (across ? (m.side === 'left' ? 10 : 10 + CAP + m.gap) : (Wp - TW) / 2) * S;
  const tipY = (across ? (Hp - TH) / 2 : m.side === 'top' ? 0 : CAP + m.gap) * S;
  // the point on the label's edge that faces the cap
  const near: [number, number] = m.side === 'top' ? [tipX + TW * S / 2, tipY + TH * S] : m.side === 'bottom' ? [tipX + TW * S / 2, tipY] : m.side === 'left' ? [tipX + TW * S, tipY + TH * S / 2] : [tipX, tipY + TH * S / 2];
  const capTopZ = capTop(0.5, 4);
  const tipZ = 60 + m.lift * 40;
  const exploded = spot === 'layers';
  const shadow = scalePx(SH.slice(0, 4).filter((_, i) => m.on[i + 1]).join(', ') || 'none', S);

  const label = (
    <span className="xr-tipface" style={{ padding: `0 ${m.padX * S}px`, fontSize: 10 * S, lineHeight: 1.45, color: P.self.ink[colorway], whiteSpace: lines > 1 ? 'normal' : 'nowrap' }}>
      {text}{m.showKey && !m.long && <span style={{ color: P.key.ink[colorway] }}> · V</span>}
    </span>
  );

  const scene = (
    <>
      <IsoCap x={capX} y={capY} w={CAP * S} h={CAP * S} r={15 * S} z={0.5} wall={4} fill={TOOL_BG} shadow={scalePx(TOOL_SH.join(', '), S)} wallTone="#141416">
        <span style={{ color: '#D6D6D8', display: 'grid' }}><Icon name="select" size={16 * S} /></span>
      </IsoCap>
      {exploded ? (
        <Exploded layers={LAYERS} on={m.on} fill={BG} shadows={SH} x={tipX} y={tipY} w={TW * S} h={TH * S} r={m.radius * S} z0={20} gap={16} focus={focus} scale={S} />
      ) : (
        <>
          <i className="xr-stem" style={{ left: near[0], top: near[1], height: tipZ, transform: `translateZ(${capTopZ}px) rotateX(90deg)`, opacity: shown ? 1 : 0 }} />
          <div className={['xr-tipwrap', shown ? 'is-shown' : ''].join(' ')} style={{ transform: `translateZ(${tipZ}px)` }}>
            {m.on[7] && <div className="xr-shadow" style={{ left: tipX, top: tipY, width: TW * S, height: TH * S, borderRadius: m.radius * S, filter: `blur(${8 + m.lift * 8}px)`, opacity: 0.3 * Math.min(1, m.lift), transform: `translate(${m.lift * 10}px, ${m.lift * 22}px) translateZ(${-m.lift * 30}px)` }} />}
            <div className="xr-face" style={{ left: tipX, top: tipY, width: TW * S, height: TH * S, borderRadius: m.radius * S, background: m.on[0] ? BG : 'transparent', boxShadow: shadow }}>{label}</div>
          </div>
        </>
      )}
    </>
  );

  const anchors: Record<Spot, [number, number, number]> = {
    states: [capX + CAP * S * 0.8, capY + CAP * S * 0.8, capTopZ],
    type: [tipX + TW * S * 0.4, tipY + TH * S * 0.5, exploded ? 20 : tipZ],
    surface: [near[0], near[1], exploded ? 20 : tipZ],
    shape: [tipX + 4, tipY + TH * S - 4, exploded ? 20 : tipZ],
    shadow: [tipX + TW * S, tipY + TH * S, exploded ? 20 : tipZ - 10],
    layers: [tipX + TW * S * 0.9, tipY + 4, exploded ? 20 + (LAYERS.length - 1) * 16 : tipZ],
  };

  const solid = (
    <TooltipProvider>
      <span className="inline-flex gap-8 rounded-pill p-6 material-frost-graphite" data-mu-colorway="graphite">
        <Tooltip label="Select" shortcut="V" side={m.side}><IconButton variant="tool" label="Select" icon={<Icon name="select" size={16} />} /></Tooltip>
        <Tooltip label="Note" shortcut="N" side={m.side}><IconButton variant="tool" label="Note" icon={<Icon name="note" size={16} />} /></Tooltip>
      </span>
    </TooltipProvider>
  );

  const card = <TooltipSpecimenCard spot={spot} m={m} set={set} focus={setFocus} setShown={setShown} />;

  return (
    <HintLayer>
      <span ref={measure} aria-hidden className="xr-measure" style={{ font: '500 10px/1.45 var(--mono)', letterSpacing: '.05em' }}>{text}{m.showKey && !m.long ? ' · V' : ''}</span>
      <XrayFrame
        xray={xray} setXray={setXray} spots={SPOTS} side={SIDE} spot={spot} setSpot={setSpot}
        solid={<div style={{ zoom: 2 }} onClick={(e) => e.stopPropagation()}>{solid}</div>}
        W={W} H={H} scene={scene} anchors={anchors}
        onReset={() => setM(INITIAL)} deps={[spot, m, shown, tw]}
        card={card}
      />
    </HintLayer>
  );
}
