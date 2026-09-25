import * as React from 'react';
import { SuggestionChip } from '@unlocalhosted/metalui';
import { tokens } from '../../lib/tokens';
import { Exploded, IsoCap, XrayFrame, aim, capTop, scalePx, tones, useStateLayers, type LayerDef, type SpotDef } from './kit';
import { HintLayer } from '../edit';
import { ChipSpecimenCard } from './ChipSpecimens';

/* ─────────────────────────────────────────────────────────
 * X-RAY · SUGGESTION CHIP
 *
 *   solid     a chip asking "Track as mood?" with its confidence and ✓ ×
 *   x-ray     a thin frosted pill standing low on the page, text and buttons on top
 *   card      the real chip, handled (ChipSpecimens): the question and how sure it is,
 *             its line and arrival, ✓ and ×, frost and the green line, height and the
 *             space on the left, and a switch per layer. The bench reads the same model.
 * ───────────────────────────────────────────────────────── */

const P = tokens.recipes.chip.props.suggestion as { height: number; 'pad-left': number; 'pad-right': number; gap: number; ink: Record<string, string> };
const S = 3;
/** How see-through the frost is: the alpha of the recipe's suggestion background. */
const FROST = Number((tokens.recipes.chip.layers as { part: string; prop: string; value: string }[]).find((l) => l.part === 'suggestion' && l.prop === 'background')!.value.match(/,\s*([\d.]+)\)$/)![1]);

export type Spot = 'type' | 'states' | 'press' | 'surface' | 'shape' | 'layers';
const SPOTS: SpotDef<Spot>[] = [
  { id: 'type', title: 'Type', word: 'The question' },
  { id: 'states', title: 'States', word: 'Quiet until you look' },
  { id: 'press', title: 'Answer', word: 'Yes or no' },
  { id: 'surface', title: 'Surface', word: 'Frost and a green line' },
  { id: 'shape', title: 'Shape', word: 'Size and spacing' },
  { id: 'layers', title: 'Layers', word: 'What it is made of' },
];
const SIDE: Record<Spot, ['left' | 'right', number]> = {
  surface: ['left', 0.2], type: ['left', 0.48], shape: ['left', 0.76],
  states: ['right', 0.2], layers: ['right', 0.48], press: ['right', 0.76],
};

export const LAYERS: LayerDef[] = [
  { name: 'Frost', why: 'A see-through light fill. The page shows through a little, so the chip feels like it floats over the text, not part of it.' },
  { name: 'Green line', why: 'A thin green outline. Green means "the app suggests this". You can tell a suggestion from your own writing at a glance.' },
  { name: 'Inner glow', why: 'A soft light just inside the edge, so the frost looks like soft plastic.' },
  { name: 'Top light', why: 'A thin bright line on the top left edge. It shows the chip is raised a little.' },
  { name: 'Rim', why: 'A very thin dark outline under the green line, so the edge stays sharp.' },
  { name: 'Contact', why: 'A small shadow right under the chip.' },
  { name: 'Drop', why: 'A soft shadow a little lower. The chip floats just above the page.' },
];

export interface Model {
  label: string; conf: number; host: boolean; frost: number;
  h: number; padL: number; on: boolean[];
}
export const INITIAL: Model = { label: 'Track as mood?', conf: 0.8, host: false, frost: FROST, h: P.height, padL: P['pad-left'], on: LAYERS.map(() => true) };
/** Questions the agent guide gives as examples; the chip shows one at a time. */
export const QUESTIONS = ['Track as mood?', 'Task?', 'Date friday?', 'Move to Done?'];

export function ChipXray({ startOpen = false }: { startOpen?: boolean }) {
  const [xray, setXray] = React.useState(startOpen);
  const [spot, setSpot] = React.useState<Spot>('states');
  const [m, setM] = React.useState<Model>(INITIAL);
  const [gone, setGone] = React.useState<null | 'yes' | 'no'>(null);
  const [arrive, setArrive] = React.useState(0);
  const [focus, setFocus] = React.useState<string | null>(null);
  const set = React.useCallback((p: Partial<Model>) => setM((o) => ({ ...o, ...p })), []);
  const rec = useStateLayers('chip', '', 'suggestion');
  const cw = rec.colorway;
  const t = tones(cw);

  const measure = React.useRef<HTMLSpanElement>(null);
  const [textW, setTextW] = React.useState(110);
  React.useLayoutEffect(() => { if (measure.current) setTextW(measure.current.offsetWidth); }, [m.label, m.conf]);
  const BTN = 18;
  const Wp = m.padL + textW + P.gap * 2 + BTN * 2 + P.gap + P['pad-right'];
  const W = Wp * S, H = m.h * S, R = H / 2;

  const frostFill = m.on[0] ? rec.fill.replace(/,\s*[\d.]+\)$/, `, ${m.frost})`) : 'transparent';
  // the specimen's own shadow stack: the recipe's layers, unscaled, the ones switched on
  const specimenShadow = rec.shadows.filter((_, i) => m.on[i + 1]).join(', ') || 'none';
  const shadows = rec.shadows.map((v, i) => (m.on[i + 1] ? aim(v, 0, 1) : null)).filter(Boolean).join(', ') || 'none';
  const z = 3;
  const top = capTop(z, 3);
  const exploded = spot === 'layers';
  const ink = P.ink[cw];
  const answer = (a: 'yes' | 'no') => { setGone(a); window.setTimeout(() => { setGone(null); setArrive((n) => n + 1); }, 900); };

  const face = (
    <span className="xr-chipface" style={{ paddingLeft: m.padL * S, paddingRight: P['pad-right'] * S, gap: P.gap * S, color: ink, fontSize: 11.5 * S }}>
      <span>{m.label}</span>
      <span className="xr-chipconf" style={{ fontSize: 9 * S }}>{m.conf.toFixed(2)}</span>
      <span className="xr-chipbtn" style={{ width: BTN * S, height: 16 * S, fontSize: 11 * S, color: spot === 'press' ? '#3FB97A' : undefined }}>✓</span>
      <span className="xr-chipbtn" style={{ width: BTN * S, height: 16 * S, fontSize: 11 * S }}>×</span>
    </span>
  );

  const scene = exploded ? (
    <Exploded layers={LAYERS} on={m.on} fill={frostFill} shadows={rec.shadows} w={W} h={H} r={R} z0={3} gap={18} focus={focus} scale={S} />
  ) : (
    <>
      <span className="xr-floortext" style={{ top: H + 26, fontSize: 15 * S }}>slept 6h · mood 3</span>
      <div key={arrive} className={['xr-chipwrap', m.host ? '' : 'is-quiet', gone ? `is-${gone}` : '', arrive ? 'is-arriving' : ''].join(' ')}>
        {m.on[6] && <div className="xr-shadow" style={{ width: W, height: H, borderRadius: R, filter: 'blur(6px)', opacity: 0.14, transform: 'translate(4px, 8px)' }} />}
        <IsoCap w={W} h={H} r={R} z={z} wall={3} fill={frostFill} shadow={scalePx(shadows, S)} wallTone={t.wall}>{face}</IsoCap>
      </div>
      {spot === 'shape' && (
        <svg className="xr-dims" viewBox={`-40 -40 ${W + 80} ${H + 80}`} style={{ width: W + 80, height: H + 80, left: -40, top: -40, transform: `translateZ(${top + 1}px)` }} aria-hidden>
          <path d={`M-18 0V${H}M-24 0H-12M-24 ${H}H-12`} />
          <text x="-28" y={H / 2} textAnchor="end" dominantBaseline="middle">{m.h}</text>
          <path d={`M0 ${H + 16}H${m.padL * S}M0 ${H + 10}V${H + 22}M${m.padL * S} ${H + 10}V${H + 22}`} />
          <text x={(m.padL * S) / 2} y={H + 34} textAnchor="middle">{m.padL}</text>
          <path d={`M${W - P['pad-right'] * S} ${H + 16}H${W}M${W} ${H + 10}V${H + 22}`} />
          <text x={W - 4} y={H + 34} textAnchor="middle">{P['pad-right']}</text>
        </svg>
      )}
    </>
  );

  const anchors: Record<Spot, [number, number, number]> = {
    type: [m.padL * S + 30, H * 0.5, top + 1],
    states: [W * 0.55, 2, top],
    press: [W - P['pad-right'] * S - BTN * S * 1.5, H * 0.5, top + 1],
    surface: [W * 0.15, 2, top],
    shape: [R * 0.4, H - 2, top],
    layers: exploded ? [W * 0.85, H * 0.3, 3 + (LAYERS.length - 1) * 18] : [W * 0.7, H * 0.8, top],
  };

  const real = gone ? <span className="eng">{gone === 'yes' ? 'accepted · undo' : 'dismissed · won’t ask again'}</span> : <SuggestionChip label={m.label} confidence={m.conf} hostHovered={m.host} onAccept={() => answer('yes')} onDismiss={() => answer('no')} />;

  const card = <ChipSpecimenCard spot={spot} m={m} set={set} focus={setFocus} fill={frostFill} shadow={specimenShadow} gone={gone} answer={answer} arrive={() => setArrive((n) => n + 1)} />;

  return (
    <>
      <span ref={measure} aria-hidden className="xr-measure" style={{ font: '500 11.5px/20px var(--sans)', letterSpacing: '-0.18px' }}>{m.label}<span style={{ font: '400 9px var(--mono)', marginLeft: 2 }}>{m.conf.toFixed(2)}</span></span>
      <HintLayer><XrayFrame
        xray={xray} setXray={setXray} spots={SPOTS} side={SIDE} spot={spot} setSpot={setSpot}
        solid={<div style={{ zoom: 2.4 }} onClick={(e) => e.stopPropagation()}>{real}</div>}
        W={W} H={H} scene={scene} anchors={anchors}
        onReset={() => setM(INITIAL)} deps={[spot, m, gone]}
        card={card}
      /></HintLayer>
    </>
  );
}
