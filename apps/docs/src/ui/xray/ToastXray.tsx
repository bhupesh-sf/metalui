import * as React from 'react';
import { Button, Kbd, ToastProvider, toastParts as T, useToast } from '@unlocalhosted/metalui';
import { tokens } from '../../lib/tokens';
import { Exploded, IsoCap, Proof, XrayFrame, capTop, scalePx, tones, useRecipeLayers, type LayerDef, type SpotDef } from './kit';
import { HintLayer } from '../edit';
import { ToastSpecimenCard } from './ToastSpecimens';

/* ─────────────────────────────────────────────────────────
 * X-RAY · TOAST
 *
 *   solid     a toast: "Moved 3 blocks · undo it" with an Undo cap and its ⌘Z key
 *   x-ray     a dark glass pill floating near the bottom of the page; a lighter Undo cap
 *             stands on it, with a small key pressed into the cap
 *   card      the real toast, handled (ToastSpecimens): pull it down to where it rises
 *             from, widen the space before the detail, press Undo, drag either end
 *             for its spacing, lift it; switches for the detail, Undo and each layer
 * ───────────────────────────────────────────────────────── */

type Ink = { bone: string; graphite: string };
const R = tokens.recipes.toast as { props: { self: { height: number; 'pad-left': number; 'pad-right': number; gap: number; ink: Ink; rise: number; scale: string }; text: { gap: number }; sub: { ink: Ink }; undo: { height: number; 'pad-left': number; 'pad-right': number; gap: number }; kbd: { ink: Ink } } };
const P = R.props;
const S = 2.4;

export type Spot = 'states' | 'type' | 'press' | 'shape' | 'shadow' | 'layers';
const SPOTS: SpotDef<Spot>[] = [
  { id: 'states', title: 'Timing', word: 'Coming and going' },
  { id: 'type', title: 'Type', word: 'What happened' },
  { id: 'press', title: 'Undo', word: 'The way back' },
  { id: 'shape', title: 'Shape', word: 'Size and spacing' },
  { id: 'shadow', title: 'Shadow', word: 'Floating' },
  { id: 'layers', title: 'Layers', word: 'What it is made of' },
];
const SIDE: Record<Spot, ['left' | 'right', number]> = {
  states: ['left', 0.2], type: ['left', 0.48], shape: ['left', 0.76],
  layers: ['right', 0.2], press: ['right', 0.48], shadow: ['right', 0.76],
};

export const PILL: LayerDef[] = [
  { name: 'Dark glass', why: 'A dark, slightly see-through fill. It is the same glass as the toolbar, so you know it belongs to the app, not to your page.' },
  { name: 'Inner glow', why: 'A faint light just inside the edge.' },
  { name: 'Top light', why: 'A soft bright edge along the top left.' },
  { name: 'Bottom shade', why: 'A soft dark edge along the bottom right.' },
  { name: 'Rim', why: 'A thin dark outline.' },
  { name: 'Contact', why: 'A small shadow.' },
  { name: 'Near shadow', why: 'A bigger soft shadow.' },
  { name: 'Far shadow', why: 'A very big soft shadow. The toast floats over everything on the page.' },
];
// the cap's names differ from the pill's, so pointing at one lights only its own slice
export const UNDO: LayerDef[] = [
  { name: 'Cap fill', why: 'The Undo cap is lighter than the glass, so it stands out as the one thing you can press.' },
  { name: 'Cap top light', why: 'A thin bright line on top. It shows the cap is raised.' },
  { name: 'Cap rim', why: 'A thin dark outline around the cap.' },
];

export interface Model {
  undo: boolean; sub: boolean; padL: number; padR: number; textGap: number;
  rise: number; scale: number; lift: number; pill: boolean[]; cap: boolean[];
}
export const INITIAL: Model = {
  undo: true, sub: true, padL: P.self['pad-left'], padR: P.self['pad-right'], textGap: P.text.gap,
  rise: P.self.rise, scale: Number(P.self.scale), lift: 1, pill: PILL.map(() => true), cap: UNDO.map(() => true),
};

function RealToast({ undo, sub }: { undo: boolean; sub: boolean }) {
  const toast = useToast();
  return <Button onClick={() => toast.show({ title: 'Moved 3 blocks', sub: sub ? 'undo it any time' : undefined, undo: undo ? () => {} : undefined })}>Show a real toast</Button>;
}

export function ToastXray({ startOpen = false }: { startOpen?: boolean }) {
  const [xray, setXray] = React.useState(startOpen);
  const [spot, setSpot] = React.useState<Spot>('states');
  const [m, setM] = React.useState<Model>(INITIAL);
  const { fill: BG, shadows: SH, colorway } = useRecipeLayers('toast');
  const { fill: UNDO_BG, shadows: UNDO_SH } = useRecipeLayers('toast', 'undo');
  const { fill: KBD_BG } = useRecipeLayers('toast', 'kbd');
  const [cycle, setCycle] = React.useState(0);
  const [held, setHeld] = React.useState(false); // the toast held where it rises from
  const [pressed, setPressed] = React.useState(false);
  const [focus, setFocus] = React.useState<string | null>(null);
  const set = React.useCallback((p: Partial<Model>) => setM((o) => ({ ...o, ...p })), []);

  const measure = React.useRef<HTMLSpanElement>(null);
  const [tw, setTw] = React.useState(160);
  React.useLayoutEffect(() => { if (measure.current) setTw(measure.current.offsetWidth); }, [m.sub]);
  const undoW = P.undo['pad-left'] + 32 + P.undo.gap + 26 + P.undo['pad-right'];
  const Wp = m.padL + tw + (m.undo ? P.self.gap + undoW + m.padR : m.padL);
  const W = Wp * S, H = P.self.height * S;
  const z = 6 + m.lift * 20, top = capTop(z, 3);
  const ux = (m.padL + tw + P.self.gap) * S, uy = ((P.self.height - P.undo.height) / 2) * S;
  const exploded = spot === 'layers';
  const pillShadow = scalePx(SH.slice(0, 4).filter((_, i) => m.pill[i + 1]).join(', ') || 'none', S);
  const undoShadow = scalePx(UNDO_SH.filter((_, i) => m.cap[i + 1]).join(', ') || 'none', S);

  const text = (
    <span className="xr-toasttext" style={{ fontSize: 13 * S, gap: m.textGap * S }}>
      Moved 3 blocks{m.sub && <span style={{ color: P.sub.ink[colorway] }}>· undo it any time</span>}
    </span>
  );

  const scene = exploded ? (
    <>
      <Exploded layers={PILL} on={m.pill} fill={BG} shadows={SH} w={W} h={H} r={H / 2} z0={4} gap={14} focus={focus} scale={S} />
      {m.undo && <Exploded layers={UNDO} on={m.cap} fill={UNDO_BG} shadows={UNDO_SH} x={ux} y={uy} w={undoW * S} h={P.undo.height * S} r={(P.undo.height * S) / 2} z0={4 + PILL.length * 14 + 10} gap={14} focus={focus} scale={S} />}
    </>
  ) : (
    <div key={cycle} className={cycle && !held ? 'xr-toastwrap ed-toast-benchin' : 'xr-toastwrap'} data-held={held ? '' : undefined}
      style={{ ['--rise' as string]: `${m.rise * S}px`, ['--from' as string]: m.scale, transform: held ? `translate3d(0, ${m.rise * S}px, 0) scale(${m.scale})` : undefined }}>
      {m.pill[7] && <div className="xr-shadow" style={{ width: W, height: H, borderRadius: H / 2, filter: `blur(${10 + m.lift * 10}px)`, opacity: 0.3, transform: `translate(${m.lift * 8}px, ${m.lift * 18}px)` }} />}
      <IsoCap w={W} h={H} r={H / 2} z={z} wall={3} fill={m.pill[0] ? BG : 'transparent'} shadow={pillShadow} wallTone={tones(colorway).wall}>
        <span style={{ position: 'absolute', left: m.padL * S, top: 0, height: H, display: 'flex', alignItems: 'center', color: P.self.ink[colorway] }}>{text}</span>
      </IsoCap>
      {m.undo && (
        <div className="xr-thumb" style={{ transform: `translateZ(${top}px)` }}>
          <IsoCap x={ux} y={uy} w={undoW * S} h={P.undo.height * S} r={(P.undo.height * S) / 2} z={pressed ? 0.2 : 1.6} wall={2} fill={m.cap[0] ? UNDO_BG : 'transparent'} shadow={undoShadow} wallTone={tones(colorway).wall} transition="transform 50ms linear">
            <span className="xr-undoface" style={{ fontSize: 12.5 * S, gap: P.undo.gap * S, paddingLeft: P.undo['pad-left'] * S, paddingRight: P.undo['pad-right'] * S, color: P.self.ink[colorway] }}>
              Undo<i style={{ font: `500 ${10 * S}px/1 var(--mono)`, color: P.kbd.ink[colorway], background: KBD_BG, borderRadius: 999, padding: `${3 * S}px ${6 * S}px`, boxShadow: `inset 0 ${S}px ${1.5 * S}px rgba(0,0,0,${colorway === 'graphite' ? 0.5 : 0.14})` }}>⌘Z</i>
            </span>
          </IsoCap>
        </div>
      )}
    </div>
  );

  const anchors: Record<Spot, [number, number, number]> = {
    states: [W * 0.05, H * 0.5, top],
    type: [(m.padL + 40) * S, H * 0.5, top + 1],
    press: [m.undo ? ux + undoW * S * 0.5 : W * 0.9, H * 0.4, m.undo ? top + 4 : top],
    shape: [H * 0.15, H * 0.85, top],
    shadow: [W * 0.8, H + 24, 0],
    layers: exploded ? [W * 0.3, H * 0.3, 4 + (PILL.length - 1) * 14] : [W * 0.97, H * 0.5, top],
  };

  const replay = () => setCycle((n) => n + 1);
  const card = (
    <>
      <ToastSpecimenCard spot={spot} m={m} set={set} focus={setFocus} hold={setHeld} replay={replay} press={setPressed} />
      <Proof><ToastProvider><RealToast undo={m.undo} sub={m.sub} /></ToastProvider></Proof>
    </>
  );

  return (
    <HintLayer>
      <span ref={measure} aria-hidden className="xr-measure" style={{ font: '500 13px/1 var(--sans)', letterSpacing: '-0.012em' }}>Moved 3 blocks{m.sub ? ' · undo it any time' : ''}</span>
      <XrayFrame
        xray={xray} setXray={setXray} spots={SPOTS} side={SIDE} spot={spot} setSpot={setSpot}
        solid={<div style={{ zoom: 1.6 }}><ToastStill /></div>}
        W={W} H={H} scene={scene} anchors={anchors}
        onReset={() => setM(INITIAL)} deps={[spot, m, tw, pressed]}
        card={card}
      />
    </HintLayer>
  );
}

/** A still of the toast, drawn with its own classes (the live one lives in a portal). */
export function ToastStill() {
  return (
    <div className={T.TOAST} style={{ display: 'inline-flex' }}>
      <span className={T.TEXT}>Moved 3 blocks<span className={T.SUB}>· undo it any time</span></span>
      <span className={T.UNDO}>Undo <Kbd surface="plain" className={T.KEY}>⌘Z</Kbd></span>
    </div>
  );
}
