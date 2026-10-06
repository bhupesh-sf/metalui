import { actor, ease, end, light, motion, pose, spring, T } from '../motion.mjs';

/* ── UPLOAD / the arrow is pushed up to the ceiling ───────────
 * Verb, object   put this up there (a server, the cloud). The disc is the place; the bar overhead
 *                is where it goes; the arrow is what is sent up to it.
 * Invariant      an arrow pointing up at a ceiling bar, in its disc; the arrow only travels along
 *                its axis and never turns down (Download is the same disc with the bar below and
 *                the arrow coming down onto it); the disc never moves.
 * Causal parts   cause: the arrow, crouching and pushing up. Receiver: the ceiling bar, struck from
 *                below, squashing and widening. Payoff: two puffs under the arrow's tail as it
 *                pushes off.
 * Neighbours     not Send (Send has no bar: it launches, it doesn't reach), not Download, not
 *                Share (no open box).
 * Forbidden      an arrow passing through the ceiling, a whole-glyph bounce, a check.
 *
 *    0ms  rest
 *  150ms  the arrow crouches .9, squashed .9
 *  230ms  it pushes up 1.2 to the ceiling bar, stretched 1.04; the puffs open under its tail
 *  240ms  the ceiling takes it (.7 tall, 1.1 wide)
 *  230ms+ the arrow comes back on the part spring, the ceiling on the part spring a beat behind
 *  ~700ms exact rest
 * ────────────────────────────────────────────────────────── */
const arrow = spring(230, { y: -1.2, sy: 1.04 }, {}, 'part');
const ceiling = spring(240, { sx: 1.1, sy: 0.7 }, {}, 'part');
const D = Math.max(end(arrow), end(ceiling));
const fin = (frames) => (end(frames) === D ? frames : [...frames, pose(D, T())]);
export const act = {
  body: `<path class="f" style="--duo:.1" d="M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 1 1 0-17Z"/><path data-part="ceiling" d="M8.6 7h6.8"/><g data-part="arrow"><path d="M12 9.5v7.6M9 12.5l3-3 3 3"/></g><path class="ac" data-part="puff" opacity="0" d="M10.5 18.2l-.7.6M13.5 18.2l.7.6" style="stroke-width:calc(var(--sw) * .7)"/>`,
  study: motion(D, 'The arrow crouches and pushes up to the ceiling, which takes it.', ['Crouch', 'Push up', 'Reach'], [
    actor('arrow', '12px 17.1px', [
      pose(0, T(), ease.accelerate),
      pose(150, T({ y: 0.9, sy: 0.9 }), ease.strike),
      ...fin(arrow),
    ]),
    actor('ceiling', '12px 7px', [
      pose(0, T(), ease.linear),
      pose(225, T(), ease.strike),
      ...fin(ceiling),
    ]),
    actor('puff', '12px 18.2px', [
      light(0, 0, 'scale(.6)'), light(200, 0, 'scale(.6)', ease.settle),
      light(245, 0.85, 'scale(1)', ease.smooth), light(450, 0, 'scale(1.4)'), light(D, 0, 'scale(.6)'),
    ]),
  ]),
  shape: 'Download\'s disc (r8.5, tinted .1) with the bar overhead at 7 and a 7.6 arrow rising to it (3 arms). Motion (study): the arrow crouches .9 and pushes up 1.2 to the ceiling, stretching 1.04; the ceiling squashes .7 and widens 1.1 on the part spring; puffs open under the tail.',
};
