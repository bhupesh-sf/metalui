import type { CSSProperties, ReactNode } from 'react';
import { Button, Label, Lasso, Led, SelectionFrame, type ButtonCap } from '@unlocalhosted/metalui';
import { CornerArc, GestureGlyph, type Gesture } from '../../../docs/src/ui/edit';
import tokens from '../../../../tokens/tokens.json';
import edit from '../../music/edit.json';
import cues from '../cues.generated.json';
import { FPS, frameAt } from '../time';
import { react, sweep } from '../motion';
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
 *   bar 21     eighths: it scrubs the kind readout; the button snaps through its real caps
 *              (standard, primary, destructive), never between them
 *   bar 22     sixteenths: it presses the button on every hit; down on the hit, up on the release
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

/** How hard the roll is going: 0 until its last level, 1 at its peak (for a little camera shake). */
export const rollIntensity = (f: number) => sweep(f, B(21, 1), SILENT) ** 2;

/* ───────────────────────── the button's real options ───────────────────────── */

const P = tokens.recipes.button.props;
const H = Number(P.self.height); // 32: this cap's one size
const PAD = Number(P.self.pad); // 15: the default padding, half the height less one
const PAD_COMPACT = Number(P.compact.pad); // 11
const PAD_TOKENS = [PAD_COMPACT, PAD];
const PILL = H / 2;
const CAPS: ButtonCap[] = ['primary', 'destructive', 'standard']; // the dark cap first: it reads on the white canvas
/** The caps the kind scrub steps through, a hit each: round all three twice, ending on the dark cap for the press. */
const KIND_SEQ: ButtonCap[] = ['destructive', 'standard', 'primary', 'destructive', 'standard', 'primary', 'destructive', 'primary'];
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
const KIND_HITS = hitsIn(B(21, 1), B(22, 1)).filter((_, i) => i % 2 === 0); // every other sixteenth: eighths
const PRESS_HITS = hitsIn(B(22, 1), B(23, 1)); // sixteenths

type Act = 'rest' | 'pad' | 'corners' | 'kind' | 'press' | 'lasso';
const actAt = (f: number): Act => (f < B(17, 4) ? 'rest' : f < B(19, 1) ? 'pad' : f < B(21, 1) ? 'corners' : f < B(22, 1) ? 'kind' : f < B(23, 1) ? 'press' : 'lasso');

/** Everything the bench shows at a frame. */
export function xrayAt(frame: number) {
  const act = actAt(frame);
  const pad = stepped(frame, PAD_HITS, PAD_VALUES, PAD);
  const radius = stepped(frame, CORNER_HITS, CORNER_VALUES, PILL);
  const kinds = KIND_HITS.filter((h) => frame >= h).length;
  const cap = kinds === 0 ? CAPS[0] : KIND_SEQ[Math.min(kinds, KIND_SEQ.length) - 1];
  const pressHit = lastHit(frame, PRESS_HITS);
  // down on a hit, up on the next sixteenth: the press, then the release spring
  const pressed = act === 'press' && pressHit !== undefined && PRESS_HITS.indexOf(pressHit) % 2 === 0;
  const padShown = Math.round(pad);
  const radShown = Math.round(radius);
  return {
    act, cap, pressed,
    pad, radius,
    padShown, radShown,
    padOnToken: PAD_TOKENS.includes(padShown) && Math.abs(pad - padShown) < 0.3,
    radOnToken: (radShown === PILL || radShown === 0) && Math.abs(radius - radShown) < 0.3,
    /** The button's half-width on the table, for where its ends are. */
    half: ((2 * pad + LABEL_W) / 2) * ZOOM,
  };
}

/* ───────────────────────── the pointer ───────────────────────── */

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
    case 'kind': return { x: X + 250, y: READOUTS_Y - 6 - 14 * ((KIND_HITS.filter((h) => f >= h).length % 2)) };
    case 'press': return { x: X + 30, y: 10 + (s.pressed ? 10 : 0) };
    case 'lasso': { const e = lassoGrow(f); return { x: BOX.x + 40 + (BOX.w - 40) * e, y: BOX.y + 40 + (BOX.h - 40) * e }; }
  }
}
const GRABS = [B(17, 4), B(19, 1), B(21, 1), B(22, 1), B(23, 1)];

/** The select pointer: it glides to each act's handle over a beat, then works it. */
export function xrayPointer(frame: number) {
  const BEAT = B(17, 2) - B(17, 1);
  const start = B(17, 3);
  const move = GRABS.filter((g) => g <= frame + BEAT).pop();
  let at = targetOf(frame);
  if (move !== undefined && frame < move) {
    // gliding in to the next handle: from where it was a beat before the grab
    const from = targetOf(move - BEAT - 1);
    const to = targetOf(move);
    const t = (frame - (move - BEAT)) / BEAT;
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
  // the press: down on its hit, back up on the release spring on the next one
  const hit = lastHit(frame, PRESS_HITS);
  const sink = s.act !== 'press' || hit === undefined ? 0 : s.pressed ? Math.min(1, react(frame, hit, 'part')) : 1 - react(frame, hit, 'release');
  return (
    <div style={{ position: 'relative', transform: `translateY(${2.2 * sink}px) scale(${1 - 0.03 * sink})` }}>
      <Button
        cap={s.cap}
        className={s.pressed ? `recipe-button-${s.cap}-pressed` : undefined}
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

export const XRAY_LANDS = [B(17, 1), B(17, 3)];

/** The whole bench: the grid, the button, its readouts, the tag, the title, and the lasso. */
export function Xray({ frame, hops }: { frame: number; hops: { at: number; height: number; frames: number }[] }) {
  const s = xrayAt(frame);
  const was = xrayAt(frame - 7);
  const hitOf = (hits: number[]) => { const h = lastHit(frame, hits); return h === undefined ? 99 : frame - h; };
  const tag: { g: Gesture; title: string; value: string } | null =
    s.act === 'pad' ? { g: 'sides', title: 'Padding', value: `${s.padShown}pt` }
    : s.act === 'corners' ? { g: 'corner', title: 'Corners', value: `${s.radShown}pt` }
    : s.act === 'kind' ? { g: 'steps', title: 'Kind', value: s.cap }
    : s.act === 'press' ? { g: 'press', title: 'Press', value: s.pressed ? 'down' : 'up' }
    : null;
  return (
    <div style={EDIT_VARS}>
      <Bench frame={frame} />
      {frame >= BUILD && (
        <div style={{ position: 'absolute', left: X, top: -560, transform: 'translate(-50%, -50%)' }}>
          <div style={{ zoom: 5.5 }}><XrayTitle /></div>
        </div>
      )}
      <Drop frame={frame} at={B(17, 1)} x={X} y={0} fall="heavy" zoom={ZOOM} size={[2 * s.half + 40, H * ZOOM]} turn={0} hops={hops}>
        <Specimen frame={frame} />
      </Drop>
      <Drop frame={frame} at={B(17, 3)} x={X} y={READOUTS_Y} fall="heavy" zoom={SMALL} size={[900, 120]} turn={0} hops={hops}>
        <div className="ed-readouts" style={{ flexWrap: 'nowrap' }}>
          <Readout label="padding" value={`${s.padShown}`} before={`${was.padShown}`} since={hitOf(PAD_HITS)} lit={s.padOnToken} live={s.act === 'pad'} />
          <Readout label="corners" value={`${s.radShown}`} before={`${was.radShown}`} since={hitOf(CORNER_HITS)} lit={s.radOnToken} live={s.act === 'corners'} />
          <Readout label="kind" value={s.cap} before={was.cap} since={hitOf(KIND_HITS)} unit="" lit live={s.act === 'kind'} />
        </div>
      </Drop>
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
