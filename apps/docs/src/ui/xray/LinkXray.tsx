import * as React from 'react';
import { Icon } from '@unlocalhosted/metalui/icons';
import { XrayFrame, type SpotDef } from './kit';
import { HintLayer } from '../edit';
import { LINK_INITIAL, LinkSpecimenCard, Specimen, type LinkModel, type LinkSpot, type LinkState } from './LinkSpecimens';

/* ─────────────────────────────────────────────────────────
 * X-RAY · LINK
 *
 *   solid     the link in a sentence
 *   x-ray     the words lie on the page; the line is its own layer under them, at the
 *             offset, weight and strength of the model; hovered it rises, over a tint plate;
 *             pressed the words and the line sink and dim; standalone carries its chevron
 *   card      the real link, handled (LinkSpecimens): drag it through its states and kinds,
 *             drag its line, its rise, and press it for the sink. The bench reads the same model.
 * ───────────────────────────────────────────────────────── */

const S = 4;
const FONT = 15, LINE_H = 22;
const WORDS = 'the export guide';

const SPOTS: SpotDef<LinkSpot>[] = [
  { id: 'states', title: 'States', word: 'What a link can be' },
  { id: 'shape', title: 'Line', word: 'The engraved hairline' },
  { id: 'slide', title: 'Hover', word: 'The line rises' },
  { id: 'press', title: 'Press', word: 'The words sink' },
  { id: 'surface', title: 'Kinds', word: 'Inline, quiet, on its own' },
];
const SIDE: Record<LinkSpot, ['left' | 'right', number]> = {
  states: ['left', 0.28], shape: ['left', 0.68],
  slide: ['right', 0.2], press: ['right', 0.5], surface: ['right', 0.8],
};

export function LinkXray({ startOpen = false }: { startOpen?: boolean }) {
  const [xray, setXray] = React.useState(startOpen);
  const [spot, setSpot] = React.useState<LinkSpot>('states');
  const [m, setM] = React.useState<LinkModel>(LINK_INITIAL);
  const [pressed, setPressed] = React.useState(false);
  const set = React.useCallback((p: Partial<LinkModel>) => setM((o) => ({ ...o, ...p })), []);

  // the words' box at the bench's scale: its width, and where its content box ends (the line sits under it)
  const measure = React.useRef<HTMLSpanElement>(null);
  const [box, setBox] = React.useState({ w: 120 * S, bottom: LINE_H * S * 0.8 });
  React.useLayoutEffect(() => {
    const el = measure.current; if (!el) return;
    setBox({ w: el.offsetWidth, bottom: el.offsetTop + el.offsetHeight });
  }, []);

  // what the bench shows: the hover card holds it hovered, the press card pressed while held
  const state: LinkState = spot === 'slide' ? 'hover' : spot === 'press' ? (pressed ? 'pressed' : 'rest') : spot === 'surface' ? 'rest' : m.state;
  const kind = spot === 'surface' ? m.kind : 'inline';
  const hover = state === 'hover';
  const lined = state !== 'current' && state !== 'disabled' && (kind !== 'quiet' || hover);
  const sink = state === 'pressed' ? m.travel * S : 0;
  const ink = state === 'disabled' ? 'var(--ink3)' : state === 'visited' ? 'var(--ink2)' : 'var(--ink)';
  const lineInk = hover || state === 'loading' ? ink : state === 'visited' ? `color-mix(in srgb, var(--ink3) ${m.rest * 100}%, transparent)` : `color-mix(in srgb, ${ink} ${m.rest * 100}%, transparent)`;
  const thick = (hover ? m.hoverThickness : m.thickness) * S;
  const restY = box.bottom + m.offset * S;
  const rise = hover ? m.rise * S : 0;
  const lineY = restY - rise;
  const chevron = kind === 'standalone';
  const W = box.w + (chevron ? 22 * S : 0), H = LINE_H * S;
  // the line is its own layer: lifted off the page while you look at it
  const lift = spot === 'shape' ? 26 : 6;
  const wordsZ = 10 - sink, lineZ = lift - sink;

  const scene = (
    <>
      {hover && <div className="xr-face is-flat xr-link-tint" style={{ width: box.w + 4 * S, height: box.bottom, left: -2 * S, borderRadius: 3 * S, transform: 'translateZ(2px)', background: `color-mix(in srgb, var(--ink) ${m.tint}%, transparent)` }} />}
      {state === 'focus' && <div className="xr-face xr-link-ring" style={{ width: box.w + 4 * S, height: H, left: -2 * S, borderRadius: 2 * S, transform: 'translateZ(3px)' }} />}
      <div className="xr-face xr-link-words" style={{ width: W, height: H, color: ink, opacity: state === 'pressed' ? m.dim : 1, transform: `translateZ(${wordsZ}px)` }}>
        <span style={{ font: `400 ${FONT * S}px/${H}px var(--sans)` }}>{WORDS}</span>
        {chevron && <Icon name="chevron" turn={270} size={16 * S} />}
      </div>
      {lined && (
        <div className="xr-face xr-link-line" style={{ width: box.w, height: Math.max(thick, 2), top: restY, borderRadius: thick, background: lineInk, opacity: state === 'pressed' ? m.dim : 1, transform: `translate3d(0, ${-rise}px, ${lineZ}px)` }}>
          {state === 'loading' && <i className="xr-link-run" />}
        </div>
      )}
      {spot === 'shape' && (
        <svg className="xr-dims" viewBox={`-40 0 ${W + 80} ${H + 80}`} style={{ width: W + 80, height: H + 80, left: -40, top: 0, transform: `translateZ(${lineZ}px)` }} aria-hidden>
          <path d={`M-20 ${box.bottom}V${restY}M-26 ${box.bottom}H-14M-26 ${restY}H-14`} />
          <text x={0} y={restY + 40}>{m.offset} under · {m.thickness} thick</text>
        </svg>
      )}
    </>
  );

  const anchors: Record<LinkSpot, [number, number, number]> = {
    states: [box.w * 0.3, H * 0.35, wordsZ],
    shape: [box.w * 0.2, lineY, lineZ],
    slide: [box.w * 0.75, lineY, lineZ],
    press: [box.w * 0.5, H * 0.45, wordsZ],
    surface: [W - (chevron ? 10 * S : box.w * 0.1), H * 0.45, wordsZ],
  };

  const solid = <p className="m-0 type-lead text-ink" style={{ zoom: 2, cursor: 'zoom-in' }}>Read <Specimen m={m} state={m.state} />.</p>;

  return (
    <HintLayer>
      {/* clipped to nothing: at the bench's scale the words are wider than a phone */}
      <span className="xr-measure" aria-hidden style={{ font: `400 ${FONT * S}px/${H}px var(--sans)`, width: 0, height: 0, overflow: 'hidden' }}><span ref={measure}>{WORDS}</span></span>
      <XrayFrame
        xray={xray} setXray={setXray} spots={SPOTS} side={SIDE} spot={spot} setSpot={setSpot}
        solid={solid} W={W} H={H} scene={scene} anchors={anchors}
        onReset={() => setM(LINK_INITIAL)} deps={[spot, m, pressed, box]}
        card={<LinkSpecimenCard spot={spot} m={m} set={set} setPressed={setPressed} />}
      />
    </HintLayer>
  );
}
