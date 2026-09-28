import * as React from 'react';
import { Row, Switch } from '@unlocalhosted/metalui';
import { tokens } from '../../lib/tokens';
import { aim, useRecipeLayers, useStateLayers, type LayerDef } from './kit';
import { STEP_AT, Outline, Readout, blip, clamp, summon, useHandle, useOnLand, useSpecimenZoom, useStepMotion, type Seg } from '../edit';
import type { SwitchSize, SwitchXrayModel } from './SwitchXray';
import './switch-specimens.css';

type Spot = 'states' | 'shape' | 'well' | 'press' | 'light' | 'layers';
type Props = {
  spot: Spot; m: SwitchXrayModel; set: (patch: Partial<SwitchXrayModel>) => void;
  focus: (name: string | null) => void;
  trackOff: LayerDef[]; trackOn: LayerDef[]; thumbLayers: LayerDef[];
};
// This file reads the recipe itself. SwitchXray imports this module, so loading a
// value from SwitchXray here would leave the page blank on a circular import.
const P = tokens.recipes.switch.props;
const SIZES = { regular: { width: P.self.width, height: P.self.height }, small: { width: P.small.width, height: P.small.height } };
const GAP_TOKEN = P.self.pad;
const STRETCH_TOKEN = P.thumb.stretch;
const SMALL_ZOOM = 1.5;
const round = (v: number) => Number(v.toFixed(1));
const at = (v: number, token: number) => v === token ? { at: token, name: 'recipe value' } : undefined;

function useFaces(m: SwitchXrayModel) {
  const off = useStateLayers('switch', '');
  const on = useStateLayers('switch', 'on');
  const thumb = useRecipeLayers('switch', 'thumb');
  const make = (fill: string, shadows: string[], enabled: boolean[]) => ({
    fill: enabled[0] ? fill.replace('linear-gradient(', `linear-gradient(${180 + m.lightDeg}deg, `) : 'transparent',
    shadow: shadows.map((s, i) => enabled[i + 1] ? aim(s, m.lightDeg, m.lightK) : null).filter(Boolean).join(', ') || 'none',
  });
  const a = make(off.fill, off.shadows, m.layers.trackOff);
  const b = make(on.fill, on.shadows, m.layers.trackOn);
  const c = make(`linear-gradient(${thumb.stops.join(', ')})`, thumb.shadows, m.layers.thumb);
  return { trackOff: a, trackOn: b, thumb: c };
}

function Specimen({ spot, m, set, focus, trackOff, trackOn, thumbLayers }: Props) {
  const [wellRef, z] = useSpecimenZoom();
  // a switch is small, so it is shown larger; not in the light card, where the sun's arc must fit the well
  const zoom = z * (spot === 'light' ? 1 : SMALL_ZOOM);
  const [active, setActive] = React.useState<string | null>(null);
  const [peek, setPeek] = React.useState<string | null>(null);
  const [lean, setLean] = React.useState(0);
  const [sizeLean, setSizeLean] = React.useState<SwitchSize | null>(null);
  const dragged = React.useRef(false);
  const root = React.useRef<HTMLButtonElement>(null);
  const sunRef = React.useRef<HTMLSpanElement>(null);
  const [lightPeek, setLightPeek] = React.useState(false);
  const sizeEl = React.useRef<HTMLSpanElement>(null);
  const gapEl = React.useRef<HTMLSpanElement>(null);
  const segs = React.useRef<Partial<Record<Seg, SVGPathElement | null>>>({});
  const motion = useStepMotion();
  const faces = useFaces(m);
  const { width, height } = SIZES[m.size];
  const thumb = height - m.gap * 2;
  const travel = width - height;
  const minGap = GAP_TOKEN / 2, maxGap = GAP_TOKEN * 2;
  const maxStretch = STRETCH_TOKEN * 2;
  const show = (name: string) => (yes: boolean) => setPeek(yes ? name : null);
  const stepSize = (d: number) => {
    const next: SwitchSize = d > 0 ? 'regular' : 'small';
    if (next !== m.size) { motion.stepped(); set({ size: next }); }
  };
  const gap = (v: number, catchToken = true) => {
    const n = round(clamp(v, minGap, maxGap));
    set({ gap: catchToken && Math.abs(n - GAP_TOKEN) <= 0.35 ? GAP_TOKEN : n });
  };
  const stretch = (v: number, catchToken = true) => {
    const n = round(clamp(v, 0, maxStretch));
    set({ stretch: catchToken && Math.abs(n - STRETCH_TOKEN) <= 0.6 ? STRETCH_TOKEN : n });
  };
  const thumbHandle = useHandle({
    zoom,
    hint: () => active === 'Stretch'
      ? { gesture: 'press', title: 'Stretch', value: `${m.stretch}pt` }
      : { gesture: 'flip', title: 'State', value: active === 'State' && lean > 0.2 ? `→ ${m.on ? 'off' : 'on'}` : undefined, how: 'drag across to switch; pull down to stretch' },
    keyHint: () => ({ gesture: 'flip', title: 'State', value: m.on ? 'on' : 'off', keys: [{ k: 'Space', say: 'switch' }, { k: '↑↓', say: 'stretch' }] }),
    start: () => { dragged.current = false; return { axis: '' as '' | 'x' | 'y', on: m.on, stretch: m.stretch, flipped: false }; },
    move: (s, dx, dy) => {
      if (!s.axis && Math.abs(dx) + Math.abs(dy) > 1.2) s.axis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
      if (s.axis === 'x') {
        dragged.current = true; setActive('State');
        const toward = s.on ? -1 : 1;
        const nextLean = clamp(dx * toward / (travel / 2), 0, 1);
        if (nextLean >= 1 && !s.flipped) { s.flipped = true; set({ on: !s.on }); setLean(0); }
        else if (!s.flipped) setLean(nextLean);
      } else if (s.axis === 'y') {
        dragged.current = true; setActive('Stretch'); stretch(s.stretch + dy / 3);
      }
    },
    end: () => { setActive(null); setLean(0); },
    step: (d) => stretch(m.stretch + d, false), axis: 'y', over: show('State'),
  });
  const sizeHandle = useHandle({
    zoom, hint: () => ({ gesture: 'steps', title: 'Size', value: active === 'Size' ? sizeLean ? `→ ${sizeLean}` : m.size : undefined, how: m.size === 'regular' ? 'drag down for small' : 'drag up for regular' }),
    keyHint: () => ({ gesture: 'steps', title: 'Size', value: m.size, keys: [{ k: '↑↓', say: 'step' }] }),
    start: () => { motion.held(); return { size: m.size, traveled: 0 }; },
    move: (s, _dx, dy) => {
      setActive('Size');
      const toward = s.size === 'regular' ? 1 : -1;
      const amount = (dy - s.traveled) * toward;
      if (amount >= STEP_AT) { const next = s.size === 'regular' ? 'small' : 'regular'; s.size = next; s.traveled = dy; motion.stepped(); set({ size: next }); setSizeLean(null); }
      else setSizeLean(amount > 2 ? (s.size === 'regular' ? 'small' : 'regular') : null);
    },
    end: () => { setActive(null); setSizeLean(null); motion.let(); },
    step: stepSize, axis: 'y', over: show('Size'), grab: () => blip(segs.current.top),
  });
  const gapHandle = useHandle({
    zoom, hint: () => ({ gesture: 'sides', title: 'Gap', value: active === 'Gap' ? `${m.gap}pt` : undefined, how: 'drag right for more space' }),
    keyHint: () => ({ gesture: 'sides', title: 'Gap', value: `${m.gap}pt`, keys: [{ k: '←→', say: 'change' }] }),
    start: () => m.gap, move: (start, dx) => { setActive('Gap'); gap(start + dx / 2); }, end: () => setActive(null),
    step: (d) => gap(m.gap + d * 0.1, false), axis: 'x', over: show('Gap'), grab: () => blip(segs.current.right),
  });
  useOnLand(active === 'Gap' && m.gap === GAP_TOKEN ? 'gap' : undefined, () => blip(segs.current.right));
  const shown: Seg[] = active === 'Size' || peek === 'Size' ? ['top'] : active === 'Gap' || peek === 'Gap' ? ['right'] : spot === 'shape' ? ['top'] : spot === 'well' ? ['right'] : [];
  const vars = {
    ['--mu-r-switch-self-pad' as string]: `${m.gap}px`,
    ['--mu-r-switch-thumb-size' as string]: `${thumb}px`,
    ['--mu-r-switch-small-thumb' as string]: `${thumb}px`,
    ['--mu-r-switch-thumb-travel' as string]: `${travel}px`,
    ['--mu-r-switch-small-travel' as string]: `${travel}px`,
    ['--mu-r-switch-thumb-stretch' as string]: `${m.stretch}px`,
    ['--mu-r-switch-self-background' as string]: faces.trackOff.fill,
    ['--mu-r-switch-self-shadow' as string]: faces.trackOff.shadow,
    ['--mu-r-switch-self-on-background' as string]: faces.trackOn.fill,
    ['--mu-r-switch-self-on-shadow' as string]: faces.trackOn.shadow,
    ['--mu-r-switch-thumb-background' as string]: faces.thumb.fill,
    ['--mu-r-switch-thumb-shadow' as string]: faces.thumb.shadow,
    transition: active === 'Gap' ? 'none' : `${motion.transition}, background var(--spring-settle-d) var(--spring-settle), box-shadow var(--spring-settle-d) var(--spring-settle)`,
  } as React.CSSProperties;
  const light = spot === 'light';
  return <>
    <p>{{
      states: 'The thumb shows whether the setting is on. Drag it across to switch it.',
      shape: 'The switch has two sizes. Drag its top edge to change size.',
      well: 'The thumb sits inside the track. Drag the right end to change the gap around it.',
      press: 'The thumb stretches when pressed. Hold it and pull down to set the stretch.',
      light: 'Light falls on the track and thumb. Drag the sun around them to move it.',
      layers: 'The track and thumb are made of layers. Turn each one off to see its work.',
    }[spot]}</p>
    <div ref={wellRef} className={`ed-specimen${light ? ' is-light' : ''}`}>
      <div className={light ? 'ed-lightbox ed-switch-lightbox' : ''} data-hint-anchor={light ? '' : undefined} style={{ zoom }}>
        <div className="ed-box ed-sw" data-hint-anchor={!light ? '' : undefined} data-live={active ?? undefined} data-shown={active === 'State' || active === 'Stretch' || peek === 'State' || peek === 'Stretch' ? 'thumb' : shown.join(' ')} data-lean={sizeLean ?? undefined}>
          <Switch ref={root} size={m.size} aria-label="Sync this canvas" checked={m.on}
            onCheckedChange={(value) => { if (dragged.current) { dragged.current = false; return; } set({ on: value }); }}
            style={vars} {...((spot === 'states' || spot === 'press') ? thumbHandle : {})} />
          <div className="ed-overlay">
            {(spot === 'states' || spot === 'press') && <i className="ed-sw-ghost" style={{ left: m.gap + (m.on ? 0 : travel), top: m.gap, width: thumb, height: thumb, opacity: lean }} />}
            {spot === 'shape' && sizeLean && <i className="ed-sw-size-lean" style={{ width: SIZES[sizeLean].width, height: SIZES[sizeLean].height, left: (width - SIZES[sizeLean].width) / 2, top: (height - SIZES[sizeLean].height) / 2 }} />}
            {(spot === 'shape' || spot === 'well') && <Outline W={width} h={height} r={height / 2} on={active === 'Size' || peek === 'Size' ? ['top'] : active === 'Gap' || peek === 'Gap' ? ['right'] : []} only={shown} segs={segs} />}
            {spot === 'shape' && <span ref={sizeEl} className="ed-edge is-y" style={{ top: -3 }} role="slider" tabIndex={0} aria-label="Size" aria-valuetext={m.size} aria-valuenow={height} aria-valuemin={SIZES.small.height} aria-valuemax={SIZES.regular.height} {...sizeHandle} />}
            {spot === 'well' && <span ref={gapEl} className="ed-edge is-x" style={{ right: -3 }} role="slider" tabIndex={0} aria-label="Gap" aria-valuenow={m.gap} aria-valuemin={minGap} aria-valuemax={maxGap} {...gapHandle} />}
          </div>
        </div>
        {light && <LightHandle m={m} set={set} zoom={zoom} sunRef={sunRef} readoutPeek={lightPeek} />}
      </div>
    </div>
    {spot === 'states' && <div className="ed-layers"><Row.Root variant="list" className="ed-layer"><Row.Text>On</Row.Text><Row.Trail><Switch size="small" aria-label="On" checked={m.on} onCheckedChange={(on) => set({ on })} /></Row.Trail></Row.Root></div>}
    {spot === 'shape' && <div className="ed-readouts"><Readout label="Size" value={`${width}×${height}`} unit="" snap={{ at: height, name: m.size }} peek={show('Size')} pick={() => summon(sizeEl.current)} scrub={stepSize} /></div>}
    {spot === 'well' && <div className="ed-readouts"><Readout label="Gap" value={`${m.gap}`} snap={at(m.gap, GAP_TOKEN)} peek={show('Gap')} pick={() => summon(gapEl.current)} scrub={(d) => gap(m.gap + d * 0.1, false)} /></div>}
    {spot === 'press' && <div className="ed-readouts"><Readout label="Stretch" value={`${m.stretch}`} snap={at(m.stretch, STRETCH_TOKEN)} peek={show('Stretch')} pick={() => summon(root.current)} scrub={(d) => stretch(m.stretch + d, false)} /></div>}
    {light && <LightReadouts m={m} set={set} peek={setLightPeek} sunRef={sunRef} />}
    {spot === 'layers' && <div className="ed-layers">{([
      [m.on ? 'trackOn' : 'trackOff', m.on ? trackOn : trackOff], ['thumb', thumbLayers],
    ] as const).flatMap(([group, list]) => list.map((layer, i) => {
      const enabled = m.layers[group][i];
      const toggle = (value: boolean) => set({ layers: { ...m.layers, [group]: m.layers[group].map((v, j) => j === i ? value : v) } });
      return <Row.Root key={`${group}-${layer.name}`} variant="list" className="ed-layer" data-off={enabled ? undefined : ''}
        onPointerEnter={() => focus(layer.name)} onPointerLeave={() => focus(null)}
        onClick={(e) => { if (!(e.target as HTMLElement).closest('.mu-switch')) toggle(!enabled); }}>
        <Row.Text>{layer.name}</Row.Text><Row.Trail><Switch size="small" aria-label={layer.name} checked={enabled} onCheckedChange={toggle} onFocus={() => focus(layer.name)} onBlur={() => focus(null)} /></Row.Trail>
      </Row.Root>;
    }))}</div>}
  </>;
}

function LightHandle({ m, set, zoom, sunRef, readoutPeek }: { m: SwitchXrayModel; set: Props['set']; zoom: number; sunRef: React.RefObject<HTMLSpanElement | null>; readoutPeek: boolean }) {
  const [live, setLive] = React.useState(false);
  const [peek, setPeek] = React.useState(false);
  const radius = tokens.recipes.switch.props.self.width;
  const reach = (k: number) => radius * (1.35 - k * 0.35);
  const pos = (deg: number, k: number) => ({ x: Math.sin(deg * Math.PI / 180) * reach(k), y: -Math.cos(deg * Math.PI / 180) * reach(k) });
  const p = pos(m.lightDeg, m.lightK);
  const handle = useHandle({
    zoom, hint: () => ({ gesture: 'corner', title: 'Light', value: live ? `${m.lightDeg}° · ${Math.round(m.lightK * 100)}%` : undefined, how: 'drag around; move closer for stronger light' }),
    keyHint: () => ({ gesture: 'corner', title: 'Light', value: `${m.lightDeg}° · ${Math.round(m.lightK * 100)}%`, keys: [{ k: '←→', say: 'turn' }, { k: '↑↓', say: 'strength' }] }),
    start: () => p, move: (s, dx, dy) => {
      setLive(true); const x = s.x + dx, y = s.y + dy;
      set({ lightDeg: clamp(Math.round(Math.atan2(x, -y) * 180 / Math.PI / 5) * 5, -90, 90), lightK: clamp(round((1.35 - Math.hypot(x, y) / radius) / 0.35), 0, 1.5) });
    }, end: () => setLive(false),
    step: (d, e) => e.key === 'ArrowUp' || e.key === 'ArrowDown' ? set({ lightK: clamp(round(m.lightK + d * 0.1), 0, 1.5) }) : set({ lightDeg: clamp(m.lightDeg + d * 5, -90, 90) }),
    axis: 'both', over: setPeek,
  });
  useOnLand(live && m.lightDeg === 0 && m.lightK === 1 ? 'light' : undefined, () => blip(sunRef.current));
  return <><svg className="ed-orbit ed-switch-orbit" width={reach(0) * 2 + 2} height={reach(0) + 1} viewBox={`${-reach(0) - 1} ${-reach(0) - 1} ${reach(0) * 2 + 2} ${reach(0) + 1}`} aria-hidden><path d={`M${-reach(0)} 0A${reach(0)} ${reach(0)} 0 0 1 ${reach(0)} 0`} /></svg>
    <span ref={sunRef} className="ed-sun ed-switch-sun" data-lit={live || peek || readoutPeek ? '' : undefined} style={{ translate: `${p.x}px ${p.y}px` }} role="slider" tabIndex={0} aria-label="Light" aria-valuetext={`${m.lightDeg} degrees, ${Math.round(m.lightK * 100)} percent`} aria-valuenow={m.lightDeg} aria-valuemin={-90} aria-valuemax={90} {...handle} /></>;
}

function LightReadouts({ m, set, peek, sunRef }: { m: SwitchXrayModel; set: Props['set']; peek: (on: boolean) => void; sunRef: React.RefObject<HTMLSpanElement | null> }) {
  return <div className="ed-readouts"><Readout label="Light direction" value={m.lightDeg === 0 ? 'top' : `${Math.abs(m.lightDeg)}`} unit={m.lightDeg === 0 ? '' : m.lightDeg < 0 ? '° left' : '° right'} snap={at(m.lightDeg, 0)} peek={peek} pick={() => summon(sunRef.current)} scrub={(d) => set({ lightDeg: clamp(m.lightDeg + d * 5, -90, 90) })} /><Readout label="Light strength" value={`${Math.round(m.lightK * 100)}`} unit="%" snap={at(m.lightK, 1)} peek={peek} pick={() => summon(sunRef.current)} scrub={(d) => set({ lightK: clamp(round(m.lightK + d * 0.1), 0, 1.5) })} /></div>;
}

export function SwitchSpecimenCard(props: Props) { return <Specimen {...props} />; }
