import { actor, ease, end, light, motion, pose, spring, T } from '../motion.mjs';

/* ── DOWNLOAD / the arrow comes down onto the floor ───────────
 * Verb, object   bring this down to you. The disc is the place it lands; the floor bar is here,
 *                your device; the arrow is what arrives.
 * Invariant      an arrow pointing down at a floor bar, in its disc; the arrow only travels along
 *                its axis and never turns up (Upload is the same disc with the bar overhead and
 *                the arrow rising to it); the disc never moves.
 * Causal parts   cause: the arrow, drawn up and dropped onto the floor. Receiver: the floor bar,
 *                struck from above, squashing and widening. Payoff: two puffs beside the floor as
 *                it lands.
 * Neighbours     not Send (Send's arrow points up and has no bar), not Upload (bar overhead), not
 *                Share (no open box), not Save (no disk).
 * Forbidden      an arrow falling through the floor, a whole-glyph bounce, a check.
 *
 *    0ms  rest
 *  150ms  the arrow is drawn up 1
 *  230ms  it drops 1.2 onto the floor bar, squashed .9 along its shaft
 *  240ms  the floor takes it (.7 tall, 1.1 wide); the puffs open beside it
 *  230ms+ the arrow comes back up on the part spring, the floor on the part spring a beat behind
 *  ~700ms exact rest
 * ────────────────────────────────────────────────────────── */
const arrow = spring(230, { y: 1.2, sy: 0.9 }, {}, 'part');
const floor = spring(240, { sx: 1.1, sy: 0.7 }, {}, 'part');
const D = Math.max(end(arrow), end(floor));
const fin = (frames) => (end(frames) === D ? frames : [...frames, pose(D, T())]);
export const act = {
  body: `<path class="f" style="--duo:.1" d="M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 1 1 0-17Z"/><g data-part="arrow"><path d="M12 6.9v7.6M9 11.5l3 3 3-3"/></g><path data-part="floor" d="M8.6 17h6.8"/><path class="ac" data-part="puff" opacity="0" d="M7.2 16.2l-.8-.5M16.8 16.2l.8-.5" style="stroke-width:calc(var(--sw) * .7)"/>`,
  study: motion(D, 'The arrow is drawn up and comes down onto the floor, which takes it.', ['Draw up', 'Come down', 'Land'], [
    actor('arrow', '12px 14.5px', [
      pose(0, T(), ease.smooth),
      pose(150, T({ y: -1 }), ease.strike),
      ...fin(arrow),
    ]),
    actor('floor', '12px 17px', [
      pose(0, T(), ease.linear),
      pose(225, T(), ease.strike),
      ...fin(floor),
    ]),
    actor('puff', '12px 16.2px', [
      light(0, 0, 'scale(.6)'), light(220, 0, 'scale(.6)', ease.settle),
      light(255, 0.85, 'scale(1)', ease.smooth), light(450, 0, 'scale(1.4)'), light(D, 0, 'scale(.6)'),
    ]),
  ]),
  shape: 'Disc r8.5, tinted .1; a 7.6 arrow pointing down (3 arms) over a 6.8 floor bar at 17. Upload is the same disc with the bar overhead and the arrow rising, so the two morph by their marks; Send is the disc with an arrow and no bar. (A tray at the bottom, the first draft, scored 2.03 mean strain against the set; the disc scores 1.4.) Motion (study): the arrow is drawn up 1 and comes down 1.2 onto the floor, squashing .9; the floor squashes .7 and widens 1.1 under it on the part spring; puffs open beside it.',
};
