import { actor, ease, end, light, motion, pose, spring, T } from '../motion.mjs';

/* ── WARNING / the mark is struck into the sign ───────────────
 * Verb, object   mind this (act soon, or it will cost you). The triangle is the sign; the
 *                exclamation mark on it is the alarm.
 * Invariant      an exclamation mark (a stem over a dot) upright in a triangle standing on its
 *                base; the mark only travels up and down its own line, and the sign only gives
 *                about its base.
 * Causal parts   cause: the mark, lifted and struck down into the sign. Receiver: the sign,
 *                which takes the blow a beat later (.95 tall). Payoff: two alarm lines open off
 *                its upper sides as it is struck.
 * Neighbours     not Info (a disc, the dot over the stem), not Sync error (a cloud), not
 *                Delta or Play (no mark), not Bell (a bell rings; this is struck once).
 * Forbidden      a shake, a flashing loop, a whole-glyph bounce.
 *
 *    0ms  rest
 *  140ms  the mark is lifted 1
 *  230ms  struck down .5 past its seat, squashed .9 (part spring); the alarm lines open
 *  245ms  the sign takes it about its base (.95 tall, 1.02 wide; object spring)
 *  ~850ms exact rest
 * ────────────────────────────────────────────────────────── */
const mark = spring(230, { y: 0.5, sy: 0.9 }, {}, 'part');
const sign = spring(245, { sx: 1.02, sy: 0.95 }, {}, 'object');
const D = Math.max(end(mark), end(sign));
const fin = (frames) => (end(frames) === D ? frames : [...frames, pose(D, T())]);
export const act = {
  body: `<g data-part="sign"><path class="f" style="--duo:.12" d="M12 5.2A2.4 2.4 0 0 1 14.11 6.44L19.9 17.03A1.6 1.6 0 0 1 18.5 19.4H5.5A1.6 1.6 0 0 1 4.1 17.03L9.89 6.44A2.4 2.4 0 0 1 12 5.2Z"/></g><g data-part="mark"><path d="M12 9v4.4"/><circle class="s" cx="12" cy="16.2" r="1.2"/></g><path class="ac" data-part="alarm" opacity="0" d="M6.2 8.6l-1.1-.5M17.8 8.6l1.1-.5" style="stroke-width:calc(var(--sw) * .7)"/>`,
  study: motion(D, 'The mark is lifted and struck down into the sign, which takes the blow; alarm lines open off its sides.', ['Lift', 'Strike', 'Take'], [
    actor('mark', '12px 16.2px', [
      pose(0, T(), ease.smooth),
      pose(140, T({ y: -1 }), ease.accelerate),
      ...fin(mark),
    ]),
    actor('sign', '12px 19.4px', [
      pose(0, T(), ease.linear),
      pose(235, T(), ease.strike),
      ...fin(sign),
    ]),
    actor('alarm', '12px 8.4px', [
      light(0, 0, 'scale(.7)'), light(220, 0, 'scale(.7)', ease.settle),
      light(260, 0.85, 'scale(1)', ease.smooth), light(470, 0, 'scale(1.2)'), light(D, 0, 'scale(.7)'),
    ]),
  ]),
  shape: 'A triangle on its base, 15.8 wide and 14.2 tall (apex corner r2.4, base corners r1.6), tinted .12; an exclamation mark on the centre line, a stem from 9 to 13.4 and a dot bead r1.2 at 16.2. Info is the same marks in a disc, so the two morph by the body and the dot. Motion (study): the mark is lifted 1 and struck down .5 past its seat, squashing .9, on the part spring; the sign takes the blow about its base a beat later (.95 tall, 1.02 wide) on the object spring; alarm lines open off its upper sides.',
};
