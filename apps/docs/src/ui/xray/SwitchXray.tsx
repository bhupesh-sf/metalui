import * as React from 'react';
import { Switch } from '@unlocalhosted/metalui';
import { tokens } from '../../lib/tokens';
import { HintLayer } from '../edit';
import { Exploded, IsoCap, IsoTray, XrayFrame, aim, scalePx, tones, useRecipeLayers, useStateLayers, type LayerDef, type SpotDef } from './kit';
import { SwitchSpecimenCard } from './SwitchSpecimens';

type Spot = 'states' | 'shape' | 'well' | 'press' | 'light' | 'layers';
export type SwitchSize = 'regular' | 'small';
export interface SwitchXrayModel {
  on: boolean; size: SwitchSize; gap: number; stretch: number;
  lightDeg: number; lightK: number;
  layers: { trackOff: boolean[]; trackOn: boolean[]; thumb: boolean[] };
}

const RECIPE = tokens.recipes.switch;
const P = RECIPE.props;
const SCALE = 5;
const SPOTS: SpotDef<Spot>[] = [
  { id: 'states', title: 'State', word: 'On or off' },
  { id: 'shape', title: 'Size', word: 'Two real sizes' },
  { id: 'well', title: 'Gap', word: 'Space around the thumb' },
  { id: 'press', title: 'Stretch', word: 'The thumb under a press' },
  { id: 'light', title: 'Light', word: 'Where the light comes from' },
  { id: 'layers', title: 'Layers', word: 'Track and thumb materials' },
];
const SIDE: Record<Spot, ['left' | 'right', number]> = {
  light: ['left', 0.2], states: ['left', 0.48], shape: ['left', 0.76],
  layers: ['right', 0.2], press: ['right', 0.48], well: ['right', 0.76],
};
const TRACK_OFF: LayerDef[] = [
  { name: 'Track fill', why: 'The plain well is darker at the top.' },
  { name: 'Inner shadow', why: 'A shadow makes the track sink into the page.' },
  { name: 'Edge', why: 'A fine edge keeps the track clear.' },
  { name: 'Bottom light', why: 'Light catches the far lip of the well.' },
];
const TRACK_ON: LayerDef[] = [
  { name: 'Green fill', why: 'Green shows that the setting is on.' },
  { name: 'Green shadow', why: 'A shadow keeps the green track sunk.' },
  { name: 'Inner light', why: 'Soft light rounds the inside of the track.' },
];
const THUMB: LayerDef[] = [
  { name: 'Thumb fill', why: 'The thumb is a raised cap.' },
  { name: 'Inner glow', why: 'A soft glow rounds the cap.' },
  { name: 'Top light', why: 'The top catches the light.' },
  { name: 'Rim', why: 'A fine line separates the thumb from the track.' },
  { name: 'Contact', why: 'A close shadow seats the thumb in the track.' },
  { name: 'Drop', why: 'A wider shadow lifts the thumb from the well.' },
];
const INITIAL: SwitchXrayModel = {
  on: false, size: 'regular', gap: P.self.pad, stretch: P.thumb.stretch,
  lightDeg: 0, lightK: 1,
  layers: { trackOff: TRACK_OFF.map(() => true), trackOn: TRACK_ON.map(() => true), thumb: THUMB.map(() => true) },
};

export function SwitchXray({ startOpen = false }: { startOpen?: boolean }) {
  const [xray, setXray] = React.useState(startOpen);
  const [spot, setSpot] = React.useState<Spot>('states');
  const [m, setM] = React.useState<SwitchXrayModel>(INITIAL);
  const [focus, setFocus] = React.useState<string | null>(null);
  const set = React.useCallback((patch: Partial<SwitchXrayModel>) => setM((old) => ({ ...old, ...patch })), []);
  const off = useStateLayers('switch', '');
  const on = useStateLayers('switch', 'on');
  const thumbRecipe = useRecipeLayers('switch', 'thumb');
  const track = m.on ? on : off;
  const trackOn = m.on ? m.layers.trackOn : m.layers.trackOff;
  const trackDefs = m.on ? TRACK_ON : TRACK_OFF;
  const face = (fill: string, shadows: string[], enabled: boolean[]) => ({
    fill: enabled[0] ? fill.replace('linear-gradient(', `linear-gradient(${180 + m.lightDeg}deg, `) : 'transparent',
    shadow: shadows.map((v, i) => enabled[i + 1] ? aim(v, m.lightDeg, m.lightK) : null).filter(Boolean).join(', ') || 'none',
  });
  const well = face(track.fill, track.shadows, trackOn);
  const thumb = face(`linear-gradient(${thumbRecipe.stops.join(', ')})`, thumbRecipe.shadows, m.layers.thumb);
  const spec = m.size === 'regular' ? P.self : P.small;
  const w = spec.width * SCALE, h = spec.height * SCALE, gap = m.gap * SCALE;
  const d = (spec.height - m.gap * 2) * SCALE;
  const travel = (spec.width - spec.height) * SCALE;
  const x = gap + (m.on ? travel : 0);
  const t = tones(off.colorway);
  const exploded = spot === 'layers';
  const scene = exploded ? <>
    <Exploded layers={trackDefs} on={trackOn} fill={well.fill} shadows={track.shadows} w={w} h={h} r={h / 2} z0={1} gap={14} focus={focus} scale={SCALE} />
    <Exploded layers={THUMB} on={m.layers.thumb} fill={thumb.fill} shadows={thumbRecipe.shadows} x={x} y={gap} w={d} h={d} r={d / 2} z0={trackDefs.length * 14 + 20} gap={14} focus={focus} scale={SCALE} />
  </> : <>
    <IsoTray w={w} h={h} r={h / 2} fill={well.fill} shadow={scalePx(well.shadow, SCALE)} colorway={off.colorway} />
    <IsoCap x={x} y={gap} w={d} h={d} r={d / 2} z={10} wall={5} fill={thumb.fill} shadow={scalePx(thumb.shadow, SCALE)} wallTone={t.wall} />
    {(spot === 'shape' || spot === 'well' || spot === 'press') && <svg className="xr-dims" viewBox={`-40 -40 ${w + 80} ${h + 80}`} style={{ width: w + 80, height: h + 80, left: -40, top: -40, transform: 'translateZ(35px)' }} aria-hidden>
      {spot === 'shape' && <><path d={`M-18 0V${h}M-24 0H-12M-24 ${h}H-12`} /><text x="-28" y={h / 2} dominantBaseline="middle" textAnchor="end">{spec.height}</text></>}
      {spot === 'well' && <><path d={`M${w - gap} ${h / 2}H${w}`} /><text x={w + 8} y={h / 2} dominantBaseline="middle">{m.gap}</text></>}
      {spot === 'press' && <><path d={`M${x + d} ${gap + d / 2}h${m.stretch * SCALE}`} /><text x={x + d + m.stretch * SCALE + 8} y={gap + d / 2} dominantBaseline="middle">{m.stretch}</text></>}
    </svg>}
  </>;
  const top = exploded ? (trackDefs.length + THUMB.length) * 14 + 20 : 17;
  const anchors: Record<Spot, [number, number, number]> = {
    states: [x + d / 2, gap + d / 2, top], shape: [w * 0.25, 1, 6],
    well: [w - gap, h / 2, 6], press: [x + d, gap + d / 2, top],
    light: [w * 0.35, 0, 8], layers: [x + d * 0.7, gap + d * 0.4, top],
  };
  return <HintLayer><XrayFrame
    xray={xray} setXray={setXray} spots={SPOTS} side={SIDE} spot={spot} setSpot={setSpot}
    solid={<div style={{ zoom: 3 }}><Switch aria-label="Sync this canvas" checked={m.on} onCheckedChange={(value) => set({ on: value })} size={m.size} /></div>}
    W={w} H={h} scene={scene} anchors={anchors}
    sun={spot === 'light' ? { deg: m.lightDeg, k: m.lightK, z: top + 100 } : undefined}
    onReset={() => setM(INITIAL)} deps={[spot, m]}
    card={<SwitchSpecimenCard spot={spot} m={m} set={set} focus={setFocus} trackOff={TRACK_OFF} trackOn={TRACK_ON} thumbLayers={THUMB} />}
  /></HintLayer>;
}
