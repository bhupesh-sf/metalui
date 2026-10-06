import { actor, ease, end, light, motion, pose, spring, T } from '../motion.mjs';

/* ── INFO / the i stands up and puts its dot up ───────────────
 * Verb, object   know this (a note worth reading, not a demand). The disc is the notice; the i
 *                on it is what it says.
 * Invariant      a lower-case i (a dot over a stem) upright in its disc; the stem only gives
 *                along its own length about its foot, the dot only travels up and down its line,
 *                and the disc never moves.
 * Causal parts   cause: the stem, which crouches and springs up. Receiver: the dot, thrown up
 *                1.6 and landing back on its seat. Payoff: two short ticks either side of the
 *                dot at the top of its throw: here.
 * Neighbours     not Warning (a triangle, the dot under the stem), not Help (a question mark),
 *                not Clock (hands from the centre), not Note (a page).
 * Forbidden      a pulse of the disc, a spin, a bounce of the whole glyph.
 *
 *    0ms  rest
 *  130ms  the stem crouches to .82 about its foot
 *  210ms  springs up 1.08 (part spring); the dot leaves
 *  340ms  the dot at the top of its throw (1.6 up); the ticks open
 *  460ms  it lands on its seat, .3 past and squashed (part spring)
 *  ~900ms exact rest
 * ────────────────────────────────────────────────────────── */
const stem = spring(210, { sy: 1.08 }, {}, 'part');
const dot = spring(460, { y: 0.3, sx: 1.15, sy: 0.85 }, {}, 'part');
const D = Math.max(end(stem), end(dot));
const fin = (frames) => (end(frames) === D ? frames : [...frames, pose(D, T())]);
export const act = {
  body: `<path class="f" style="--duo:.1" d="M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 1 1 0-17Z"/><g data-part="stem"><path d="M12 11v5.6"/></g><g data-part="dot"><circle class="s" cx="12" cy="7.9" r="1.2"/></g><path class="ac" data-part="ticks" opacity="0" d="M9.3 6.6l-.8-.5M14.7 6.6l.8-.5" style="stroke-width:calc(var(--sw) * .7)"/>`,
  study: motion(D, 'The stem crouches and springs up, throwing its dot; ticks open at the top of the throw and the dot lands back on its seat.', ['Crouch', 'Throw', 'Land'], [
    actor('stem', '12px 16.6px', [
      pose(0, T(), ease.smooth),
      pose(130, T({ sy: 0.82 }), ease.strike),
      ...fin(stem),
    ]),
    actor('dot', '12px 7.9px', [
      pose(0, T(), ease.linear),
      pose(200, T(), ease.settle),
      pose(340, T({ y: -1.6 }), ease.accelerate),
      ...fin(dot),
    ]),
    actor('ticks', '12px 6.3px', [
      light(0, 0, 'scale(.6)'), light(300, 0, 'scale(.6)', ease.settle),
      light(350, 0.85, 'scale(1)', ease.smooth), light(560, 0, 'scale(1.3)'), light(D, 0, 'scale(.6)'),
    ]),
  ]),
  shape: 'A disc r8.5 (Clock\'s face), tinted .1; a stem from 11 to 16.6 and a dot bead r1.2 at 7.9 on the centre line, a lower-case i. Warning is the same marks in a triangle, the dot under the stem, so the two morph by the body and the dot. Motion (study): the stem crouches .82 about its foot and springs up on the part spring, throwing the dot 1.6; ticks open beside it at the top; it lands .3 past its seat, squashed, on the part spring.',
};
