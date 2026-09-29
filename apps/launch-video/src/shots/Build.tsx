import type { CSSProperties, ReactNode } from 'react';
import { Button, Label, Lasso, Led, SelectionFrame, Switch, type ButtonCap } from '@unlocalhosted/metalui';
import { CornerArc, GestureGlyph, type Gesture } from '../../../docs/src/ui/edit';
import tokens from '../../../../tokens/tokens.json';
import edit from '../../music/edit.json';
import cues from '../cues.generated.json';
import { FPS, frameAt } from '../time';
import { contactFrames, land, react, sweep } from '../motion';
import { Drop } from '../film/stage';
import { actTime } from '../film/parts';
import { DROP1_AT } from './Components';

/* ─────────────────────────────────────────────────────────
 * SHOTS 8-9 · X-RAY: TUNE IT BY HAND, THEN THE GAP (video bars 17-24), on the next part of the table
 *
 * One real Button on the x-ray's green bench, and the select pointer handling it. Nothing is a
 * slider: every value changes by grabbing the component, the way the docs' x-rays work. The build's
 * snare roll doubles every two bars, and each act takes one rate, so the handling speeds up with it.
 *
 *   bar 17     the button slams onto the bench, its readouts land under it; the pointer comes in
 *   bar 18     quarters: it grabs the right end and pulls. The padding catches on its tokens
 *              (compact, then out, then back to the default): the LED lights on each catch
 *   bars 19-20 eighths: the top-left corner. Pushed in, the pill squares off a step a hit, lands
 *              square, then pulls back round to the pill
 *   bar 21     eighths: it clicks the x-ray's Layers callout, and the button comes apart into the six
 *              layers it is made of, one lifting off the bench an eighth: drop shadow, contact shadow,
 *              rim, fill, inner glow, top light, each named
 *   bar 22     eighths: the readouts become the layers' switches, and it flicks them off one an eighth;
 *              each slab goes to a ghost as its switch goes off, then they all come back on
 *   bar 23.1   the stack slams back down into one button, and the gap starts
 *   bars 23-24 the gap: the pointer drags a lasso round the whole bench as the roll peaks;
 *              on the silent last beat everything holds still
 *   bar 25     the box snaps shut into a selection round it: the drop
 * ───────────────────────────────────────────────────────── */

export const BUILD_AT = { x: DROP1_AT.x + 3400, y: 0 };
const X = BUILD_AT.x;
const B = (bar: number, beat: number, step = 0) => frameAt(bar, beat, step);
export const BUILD = B(17, 1);
export const SILENT = B(24, 4);
export const DROP2 = B(25, 1);

/** Every hit of the build's snare roll, in frames: the same rule the music pipeline plays it by. */
const ROLL_HITS = (() => {
  const piece = edit.pieces.find((p) => 'times' in p) as unknown as { layers: { type: string; beats: number[]; rate: number[] }[] };
  const run = cues.runs.find((r) => r.times > 1)!;
  const roll = piece.layers.find((l) => l.type === 'roll')!;
  const [r0, r1] = roll.rate;
  const levels = Array.from({ length: Math.log2(r1 / r0) + 1 }, (_, k) => r0 * 2 ** k);
  const span = roll.beats[1] - roll.beats[0];
  const per = span / levels.length;
  const hits: number[] = [];
  levels.forEach((rate, k) => {
    for (let j = 0; j < Math.round(per * rate); j++) hits.push(Math.round((run.videoStart + (roll.beats[0] + k * per + j / rate) * cues.beatSeconds) * FPS));
  });
  return hits;
})();
const hitsIn = (from: number, to: number) => ROLL_HITS.filter((h) => h >= from && h < to);

/** How hard the roll is going: 0 until its last level, 1 at its peak (for a little camera shake), 0 again once it stops. */
export const rollIntensity = (f: number) => (f >= SILENT ? 0 : sweep(f, B(21, 1), SILENT) ** 2); // still from the silent beat on

/* ───────────────────────── the button's real options ───────────────────────── */

const P = tokens.recipes.button.props;
const H = Number(P.self.height); // 32: this cap's one size
const PAD = Number(P.self.pad); // 15: the default padding, half the height less one
const PAD_COMPACT = Number(P.compact.pad); // 11
const PAD_TOKENS = [PAD_COMPACT, PAD];
const PILL = H / 2;
const CAP: ButtonCap = 'primary'; // the dark cap: it reads on the white canvas

/**
 * The layers the button is made of, bottom to top, from its recipe (the primary cap in bone): the
 * two outer shadows and the rim under the fill, the two inner lights over it. `k` brightens a
 * layer on its own slab, where it has no button around it to be seen against.
 */
const RECIPE = (tokens.recipes.button.layers as { part: string; prop: string; value: string; colorway?: string; state?: string }[])
  .filter((l) => l.part === 'primary' && (l.colorway ?? 'bone') === 'bone' && !l.state);
const FILL = RECIPE.find((l) => l.prop === 'background')!.value;
const SH = RECIPE.filter((l) => l.prop === 'shadow').map((l) => l.value);
const LAYERS: { name: string; fill?: string; shadow?: string; k: number; glass: 'clear' | 'dark' }[] = [
  { name: 'Drop shadow', shadow: SH[4], k: 2.2, glass: 'clear' },
  { name: 'Contact shadow', shadow: SH[3], k: 2.5, glass: 'clear' },
  { name: 'Rim', shadow: SH[2], k: 1.4, glass: 'clear' },
  { name: 'Fill', fill: FILL, k: 1, glass: 'clear' },
  { name: 'Inner glow', shadow: SH[0], k: 5, glass: 'dark' },
  { name: 'Top light', shadow: SH[1], k: 3, glass: 'dark' },
];
const scalePx = (v: string, k: number) => v.replace(/(-?[\d.]+)px/g, (_, n) => `${(Number(n) * k).toFixed(2)}px`);
const alphaK = (v: string, k: number) => v.replace(/rgba\(([^)]*),\s*([\d.]+)\)/g, (_, rgb, a) => `rgba(${rgb},${Math.min(1, Number(a) * k).toFixed(3)})`);
const LABEL = 'Launch';
const LABEL_W = 44; // the label's width at the button's size, for where its ends are

/** The specimen's scale on the table, and the readouts' and tag's. */
const ZOOM = 6;
const SMALL = 3.6;
const READOUTS_Y = 380;
const TAG_Y = -270;

/** A value that steps on the roll's hits: each hit rides the part spring to its next value. */
function stepped(frame: number, hits: number[], values: number[], start: number) {
  let v = start;
  for (let i = 0; i < hits.length && i < values.length; i++) {
    if (frame < hits[i]) break;
    v += (values[i] - v) * Math.min(1.08, react(frame, hits[i], 'part'));
  }
  return v;
}
/** The last hit at or before a frame, if any. */
const lastHit = (frame: number, hits: number[]) => hits.filter((h) => h <= frame).pop();

// The acts, each on its bars of the roll.
const PAD_HITS = hitsIn(B(18, 1), B(19, 1)); // quarters
const PAD_VALUES = [PAD_COMPACT, 18, 24, PAD]; // in to compact, out, further, back to the default
const CORNER_HITS = hitsIn(B(19, 2), B(21, 1)); // eighths, after a beat to grab
const CORNER_VALUES = [14, 12, 10, 8, 6, 4, 2, 0, 3, 6, 9, 12, PILL];
const EXPLODE_HITS = hitsIn(B(21, 1), B(22, 1)).filter((_, i) => i % 2 === 0).slice(0, LAYERS.length); // eighths
const SWITCH_HITS = hitsIn(B(22, 1), B(23, 1)).filter((_, i) => i % 2 === 0); // eighths: six off, then all on
/** The order the switches go off in: top to bottom, as the list reads. */
const OFF_ORDER = [5, 4, 3, 2, 1, 0];
const ALL_ON = SWITCH_HITS[LAYERS.length];
export const COLLAPSE_AT = B(23, 1);

type Act = 'rest' | 'pad' | 'corners' | 'layers' | 'lasso';
const actAt = (f: number): Act => (f < B(17, 4) ? 'rest' : f < B(19, 1) ? 'pad' : f < B(21, 1) ? 'corners' : f < COLLAPSE_AT ? 'layers' : 'lasso');

/** Which layers are switched on at a frame. */
const layersOn = (f: number) => LAYERS.map((_, i) => {
  if (ALL_ON !== undefined && f >= ALL_ON) return true;
  const k = OFF_ORDER.indexOf(i);
  return SWITCH_HITS[k] === undefined || f < SWITCH_HITS[k];
});
/** How far each layer has lifted off the bench (table px), up on its hit, down together on the collapse. */
const liftOf = (f: number, i: number) => {
  const at = EXPLODE_HITS[LAYERS.length - 1 - i]; // the top layer first
  if (at === undefined || f < at) return 0;
  const up = Math.min(1.06, react(f, at, 'part')) * (55 + i * 70);
  return f < COLLAPSE_AT ? up : up * Math.max(0, 1 - land(f, COLLAPSE_AT, 'object'));
};
/** Whether the button is shown as its layers (from the first lift until the stack has landed). */
const exploded = (f: number) => EXPLODE_HITS[0] !== undefined && f >= EXPLODE_HITS[0] && f < COLLAPSE_AT + contactFrames('object');

/** Everything the bench shows at a frame. */
export function xrayAt(frame: number) {
  const act = actAt(frame);
  const pad = stepped(frame, PAD_HITS, PAD_VALUES, PAD);
  const radius = stepped(frame, CORNER_HITS, CORNER_VALUES, PILL);
  const cap = CAP;
  const padShown = Math.round(pad);
  const radShown = Math.round(radius);
  return {
    act, cap,
    pad, radius,
    padShown, radShown,
    padOnToken: PAD_TOKENS.includes(padShown) && Math.abs(pad - padShown) < 0.3,
    radOnToken: (radShown === PILL || radShown === 0) && Math.abs(radius - radShown) < 0.3,
    /** The button's half-width on the table, for where its ends are. */
    half: ((2 * pad + LABEL_W) / 2) * ZOOM,
  };
}

/* ───────────────────────── the pointer ───────────────────────── */

/** The Layers callout, left of the button, and where each layer's switch sits in the list under it. */
const CALLOUT = { x: X - 700, y: 0 };
const switchAt = (i: number) => { const row = LAYERS.length - 1 - i; return { x: X - 400 + (row % 3) * 400, y: READOUTS_Y - 70 + Math.floor(row / 3) * 105 }; };

/** The lasso's box round the bench, in table units. */
const BOX = { x: X - 820, y: -470, w: 1640, h: 1010 };
const LASSO = { from: B(23, 1), to: SILENT };
const lassoGrow = (f: number) => { const t = Math.min(1, Math.max(0, (Math.min(f, SILENT) - LASSO.from) / (LASSO.to - LASSO.from))); return 1 - (1 - t) ** 2; };

/** Where the pointer's tip is for each act, and when it grabs (for its act). */
function targetOf(f: number): { x: number; y: number } {
  const s = xrayAt(f);
  switch (s.act) {
    case 'rest': return { x: X + 760, y: 520 };
    case 'pad': return { x: X + s.half - 10, y: 8 };
    case 'corners': { const k = s.radius * ZOOM * 0.3; return { x: X - s.half + k + 6, y: -(H / 2) * ZOOM + k + 6 }; }
    case 'layers': {
      // the callout first, then each switch as it goes off
      const k = SWITCH_HITS.filter((h) => f >= h).length;
      if (k === 0) return { x: CALLOUT.x + 10, y: CALLOUT.y + 10 };
      const at = switchAt(OFF_ORDER[Math.min(k, LAYERS.length) - 1]);
      return { x: at.x + 70, y: at.y + 8 };
    }
    case 'lasso': { const e = lassoGrow(f); return { x: BOX.x + 40 + (BOX.w - 40) * e, y: BOX.y + 40 + (BOX.h - 40) * e }; }
  }
}
const GRABS = [B(17, 4), B(19, 1), B(21, 1), ...SWITCH_HITS.slice(0, LAYERS.length), B(23, 1)];

/** The select pointer: it glides to each act's handle over a beat, then works it. */
export function xrayPointer(frame: number) {
  const BEAT = B(17, 2) - B(17, 1);
  const start = B(17, 3);
  // the next grab, and how long the glide to it takes: a beat, or less when grabs come faster
  const i = GRABS.findIndex((g) => g > frame);
  const move = i < 0 ? undefined : GRABS[i];
  const glide = move === undefined ? BEAT : Math.min(BEAT, i > 0 ? move - GRABS[i - 1] : BEAT);
  let at = targetOf(frame);
  if (move !== undefined && frame >= move - glide) {
    // gliding in to the next handle from where it was when the glide began
    const from = targetOf(move - glide - 1);
    const to = targetOf(move);
    const t = (frame - (move - glide)) / glide;
    const e = 1 - (1 - t) ** 3;
    at = { x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e };
  }
  const grab = GRABS.filter((g) => g <= frame).pop();
  return { visible: frame >= start && frame < DROP2 + 30, x: at.x, y: at.y, act: grab === undefined ? 0 : actTime(frame, grab) };
}

/* ───────────────────────── the pieces ───────────────────────── */

// The edit layer's CSS is written against the docs' short names; the film maps them to the tokens.
const EDIT_VARS = {
  '--mono': 'var(--mu-mono)', '--ink': 'var(--mu-ink)', '--ink3': 'var(--mu-ink3)',
  '--well': 'var(--mu-well)', '--well-top': 'var(--mu-well-top)', '--well-bot': 'var(--mu-well-bot)',
  '--spring-part': 'var(--mu-spring-part)', '--spring-part-d': 'var(--mu-spring-part-d)',
  '--spring-release': 'var(--mu-spring-release)', '--spring-release-d': 'var(--mu-spring-release-d)',
  '--green-deep': 'var(--mu-green-deep)',
} as CSSProperties;

const GUIDE = 'var(--mu-presence-guide)';

/** A readout: a small well, an engraved label, the value rolling in on a change, an LED on a token. */
function Readout({ label, value, before, since, unit = 'pt', lit, live }: { label: string; value: string; before: string; since: number; unit?: string; lit: boolean; live: boolean }) {
  const t = Math.min(1, since / 7);
  const rolling = value !== before && t < 1;
  return (
    <span className="ed-readout" style={{ boxShadow: live ? `var(--well), 0 0 0 1.5px ${GUIDE}` : undefined }}>
      <b className="eng">{label}</b>
      <span className="ed-val">
        <span style={{ display: 'inline-grid', overflow: 'hidden', height: '1em', verticalAlign: 'bottom' }}>
          {rolling && <span style={{ gridArea: '1/1', transform: `translateY(${-100 * t}%)`, opacity: 1 - t }}>{before}</span>}
          <span style={{ gridArea: '1/1', transform: rolling ? `translateY(${100 * (1 - t)}%)` : undefined }}>{value}</span>
        </span>
        {unit && <small>{unit}</small>}
      </span>
      <Led kind={lit ? 'live' : 'off'} size="small" />
    </span>
  );
}

/** The hint tag, in the tooltip's look, above the component: a gesture, what it changes, the live value. */
function Tag({ gesture, title, value }: { gesture: Gesture; title: string; value: string }) {
  return (
    <div className="ed-tag mu-tooltip recipe-tooltip text-tooltip-ink type-tooltip rounded-tooltip-radius" style={{ position: 'relative', left: 0, top: 0, animation: 'none' }}>
      <span className="ed-tag-ico"><GestureGlyph g={gesture} /></span>
      <b>{title}</b>
      <span className="ed-tag-val">{value}</span>
    </div>
  );
}

/** The specimen: the real Button at the values the pointer has set, with only the handle it works drawn. */
function Specimen({ frame }: { frame: number }) {
  const s = xrayAt(frame);
  const lean = s.act === 'pad' ? 'right' : s.act === 'corners' ? 'corner' : null;
  return (
    <div style={{ position: 'relative', opacity: exploded(frame) ? 0 : 1 }}>
      <Button
        cap={s.cap}
        style={{ paddingLeft: s.pad, paddingRight: s.pad, borderRadius: s.radius, width: 2 * s.pad + LABEL_W, justifyContent: 'center' }}
      >
        {LABEL}
      </Button>
      {/* the right end, as a hairline just inside the real edge, curves included */}
      {lean === 'right' && <i style={{ position: 'absolute', inset: 1.2, borderRadius: Math.max(0, s.radius - 1.2), border: `1.1px solid transparent`, borderRightColor: GUIDE, pointerEvents: 'none' }} />}
      {lean === 'corner' && (
        <span style={{ position: 'absolute', left: 0, top: 0 }}>
          <CornerArc r={s.radius} on />
        </span>
      )}
    </div>
  );
}

/**
 * The button as its layers: each a slab at the button's own size and shape, lifted off the bench,
 * showing only what that layer adds, named beside it. A layer switched off is a ghost.
 */
function Layers({ frame }: { frame: number }) {
  if (!exploded(frame)) return null;
  const s = xrayAt(frame);
  const on = layersOn(frame);
  const W = (2 * s.pad + LABEL_W) * ZOOM, Hh = H * ZOOM, R = s.radius * ZOOM;
  return (
    <div style={{ position: 'absolute', left: X, top: 0, transformStyle: 'preserve-3d' }}>
      {LAYERS.map((l, i) => {
        const z = 1 + liftOf(frame, i);
        const lit = on[i];
        const glass = l.glass === 'dark' ? 'rgba(37,37,40,.5)' : 'rgba(255,255,255,.14)';
        return (
          <div key={l.name} style={{ position: 'absolute', left: -W / 2, top: -Hh / 2, width: W, height: Hh, transform: `translateZ(${z}px)`, opacity: lit ? 1 : 0.22 }}>
            <div
              style={{
                position: 'absolute', inset: 0, borderRadius: R,
                background: l.fill ?? glass,
                boxShadow: l.shadow ? alphaK(scalePx(l.shadow, ZOOM), l.k) : undefined,
                outline: `3px ${lit ? 'solid' : 'dashed'} rgb(46 160 110 / ${l.fill ? 0.5 : 0.85})`, outlineOffset: -1.5,
                display: 'grid', placeItems: 'center', color: '#fff', font: `500 ${12.5 * ZOOM}px/1 var(--mu-sans, system-ui)`,
              }}
            >
              {l.fill ? LABEL : null}
            </div>
            {liftOf(frame, i) > 30 && frame < COLLAPSE_AT && <div style={{ position: 'absolute', left: W + 40, top: Hh / 2, transform: 'translateY(-50%)', whiteSpace: 'nowrap' }}>
              <div style={{ zoom: 3.6 }}><Label variant="engraved">{l.name}</Label></div>
            </div>}
          </div>
        );
      })}
    </div>
  );
}

/** The x-ray's Layers callout: a round plate with the layers glyph, lit green once it is clicked. */
function Callout({ frame }: { frame: number }) {
  const lit = frame >= B(21, 1) && frame < COLLAPSE_AT;
  const pop = frame >= B(21, 1) ? react(frame, B(21, 1), 'part') : 0;
  return (
    <div style={{ position: 'absolute', left: CALLOUT.x, top: CALLOUT.y, transform: `translate(-50%, -50%) scale(${1 + 0.08 * Math.sin(Math.PI * Math.min(1, pop))})` }}>
      <div style={{ width: 150, height: 150, borderRadius: '50%', display: 'grid', placeItems: 'center', background: lit ? '#3fb97a' : '#fbfbf9', color: lit ? '#fff' : '#2a2c30', boxShadow: '0 10px 30px -8px rgba(40,50,70,.35), inset 0 1px 0 rgba(255,255,255,.8)' }}>
        <svg width="62" height="62" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m12 4 8 4-8 4-8-4 8-4Z" /><path d="m4 12 8 4 8-4" /><path d="m4 16 8 4 8-4" />
        </svg>
      </div>
    </div>
  );
}

/** The layers' switches, in the readouts' place while the button is apart: a row and a switch a layer. */
function Switches({ frame }: { frame: number }) {
  const on = layersOn(frame);
  return (
    <>
      {LAYERS.map((l, i) => {
        const at = switchAt(i);
        return (
          <div key={l.name} style={{ position: 'absolute', left: at.x, top: at.y, transform: 'translate(-50%, -50%)' }}>
            <div style={{ zoom: 2.3 }}>
              <span className="ed-readout" style={{ gap: 12, boxShadow: !on[i] ? `var(--well), 0 0 0 1.5px ${GUIDE}` : undefined }}>
                <b className="eng" style={{ whiteSpace: 'nowrap' }}>{l.name}</b>
                <Switch size="small" checked={on[i]} aria-label={l.name} />
              </span>
            </div>
          </div>
        );
      })}
    </>
  );
}

/** The bench under the specimen: the x-ray's green grid, fading out at its edges. */
function Bench({ frame }: { frame: number }) {
  const on = Math.min(1, Math.max(0, (frame - BUILD) / 10));
  const line = 'rgb(46 160 110 / .22)';
  return (
    <div
      style={{
        position: 'absolute', left: X - 900, top: -520, width: 1800, height: 1120, opacity: on,
        backgroundImage: `linear-gradient(${line} 1.5px, transparent 1.5px), linear-gradient(90deg, ${line} 1.5px, transparent 1.5px)`,
        backgroundSize: '60px 60px', backgroundPosition: '-1px -1px',
        maskImage: 'radial-gradient(closest-side, #000 55%, transparent 100%)',
        WebkitMaskImage: 'radial-gradient(closest-side, #000 55%, transparent 100%)',
      }}
    />
  );
}

/** The place's name, on the canvas above the bench. */
function XrayTitle() {
  return <Label variant="engraved">X-ray · tune it by hand</Label>;
}

export const XRAY_LANDS = [B(17, 1), B(17, 3), COLLAPSE_AT];

/** The whole bench: the grid, the button, its readouts, the tag, the title, and the lasso. */
export function Xray({ frame, hops }: { frame: number; hops: { at: number; height: number; frames: number }[] }) {
  const s = xrayAt(frame);
  const was = xrayAt(frame - 7);
  const hitOf = (hits: number[]) => { const h = lastHit(frame, hits); return h === undefined ? 99 : frame - h; };
  const tag: { g: Gesture; title: string; value: string } | null =
    s.act === 'pad' ? { g: 'sides', title: 'Padding', value: `${s.padShown}pt` }
    : s.act === 'corners' ? { g: 'corner', title: 'Corners', value: `${s.radShown}pt` }
    : null;
  return (
    <div style={{ ...EDIT_VARS, transformStyle: 'preserve-3d' }}>
      <Bench frame={frame} />
      {frame >= BUILD && (
        <div style={{ position: 'absolute', left: X, top: -560, transform: 'translate(-50%, -50%)', opacity: s.act === 'layers' ? 0 : 1 }}>
          <div style={{ zoom: 5.5 }}><XrayTitle /></div>
        </div>
      )}
      <Drop frame={frame} at={B(17, 1)} x={X} y={0} fall="heavy" zoom={ZOOM} size={[2 * s.half + 40, H * ZOOM]} turn={0} hops={hops}>
        <Specimen frame={frame} />
      </Drop>
      {s.act === 'layers' ? <Switches frame={frame} /> : <Drop frame={frame} at={B(17, 3)} x={X} y={READOUTS_Y} fall="heavy" zoom={SMALL} size={[900, 120]} turn={0} hops={hops}>
        <div className="ed-readouts" style={{ flexWrap: 'nowrap' }}>
          <Readout label="padding" value={`${s.padShown}`} before={`${was.padShown}`} since={hitOf(PAD_HITS)} lit={s.padOnToken} live={s.act === 'pad'} />
          <Readout label="corners" value={`${s.radShown}`} before={`${was.radShown}`} since={hitOf(CORNER_HITS)} lit={s.radOnToken} live={s.act === 'corners'} />
        </div>
      </Drop>}
      <Layers frame={frame} />
      {frame >= B(20, 3) && frame < COLLAPSE_AT + 30 && <Callout frame={frame} />}
      {tag && (
        <div style={{ position: 'absolute', left: X, top: TAG_Y, transform: 'translateZ(40px)' }}>
          <div style={{ zoom: 4.4 }}><Tag gesture={tag.g} title={tag.title} value={tag.value} /></div>
        </div>
      )}
      <Selection frame={frame} />
    </div>
  );
}

/* ───────────────────────── the gap ───────────────────────── */


/** The gap: the pointer drags a lasso over the bench through bars 23-24, then it snaps into a selection on the drop. */
export function Selection({ frame }: { frame: number }): ReactNode {
  if (frame < LASSO.from) return null;
  if (frame >= DROP2) {
    return (
      <div style={{ position: 'absolute', left: BOX.x, top: BOX.y }}>
        <div style={{ position: 'relative', width: BOX.w / 2.4, height: BOX.h / 2.4, zoom: 2.4 }}>
          <SelectionFrame state="selected" radius={28} readout={false} entrance={false} />
        </div>
      </div>
    );
  }
  const e = lassoGrow(frame);
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, zoom: 2.4 }}>
      <Lasso rect={{ x: BOX.x / 2.4, y: BOX.y / 2.4, width: (BOX.w * e) / 2.4, height: (BOX.h * e) / 2.4 }} count={e > 0.6 ? 3 : e > 0.3 ? 1 : 0} />
    </div>
  );
}
