import { actor, ease, end, motion, pose, spring, T } from '../motion.mjs';

/* ── MINUS / one is taken off, and the bar is set back ────────
 * Verb, object   take one away (less, decrement, remove from). Plus's sibling on the same
 *                tile: where Plus sets an upright into the bar, Minus lifts the bar off its
 *                seat, as if one were taken from it, and sets it back down.
 * Invariant      a level bar on its tile; the bar only ever tilts 5° while it is held up,
 *                never turns further, never leaves the tile, and nothing ever crosses it,
 *                so a plus never shows. The tile never moves off its place.
 * Causal parts   cause: the bar, pried up off its seat (its right end leads, a 5° tilt) and
 *                set back down onto the tile. Receiver: the bar, which lands past its seat and
 *                widens under the contact. Payoff: the tile, heavier, takes the weight a beat
 *                later and gives under it. No accent: rays under the bar read as a face or a
 *                bench at 16 px, and beads off its ends are Plus's payoff.
 * Neighbours     not Plus (no upright, ever), not Zoom Out (no lens), not Equals (one bar, no
 *                trace left where it was), not Collapse (the tile keeps its size).
 * Forbidden      axial shrink/grow as the action, a spin, a whole-tile pulse, a sliding bar.
 *
 *    0ms  rest
 *  160ms  the bar is pried up 1.8, tilting 5° (its right end lifts first)
 *  220ms  held at the top of the lift, 2 up
 *  320ms  set down: it lands .5 past its seat and widens (1.08) on the tile
 *  335ms  the tile takes the weight a beat later (.96 tall, 1.02 wide)
 *  320ms+ the bar recovers on the part spring, the tile on the object spring
 *  915ms  exact rest
 * ────────────────────────────────────────────────────────── */
const bar = spring(320, { y: 0.5, sx: 1.08 }, {}, 'part');
const tile = spring(335, { sx: 1.02, sy: 0.96 }, {}, 'object');
const D = Math.max(end(bar), end(tile));
const fin = (frames) => (end(frames) === D ? frames : [...frames, pose(D, T())]);
export const act = {
  body: `<g data-part="tile"><rect class="f" style="--duo:.12" x="4.5" y="4.5" width="15" height="15" rx="3.5"/></g><path data-part="bar" d="M8.8 12h6.4"/>`,
  study: motion(D, 'The bar is pried up off its tile, as if one were taken from it, and set back down; the tile takes its weight.', ['Lift', 'Set down', 'Seat'], [
    actor('bar', '12px 12px', [
      pose(0, T(), ease.smooth),
      pose(160, T({ y: -1.8, r: -5 }), ease.smooth),
      pose(220, T({ y: -2, r: -5 }), ease.accelerate),
      ...fin(bar),
    ]),
    actor('tile', '12px 12px', [
      pose(0, T(), ease.linear),
      pose(325, T(), ease.smooth),
      ...fin(tile),
    ]),
  ]),
  shape: 'Plus\'s tile (15 × 15 r3.5, tinted .12) with its crossbar alone, 6.4 on the centre, so Plus and Minus are one object with or without the upright and morph by the upright alone. Motion (study): the bar is pried up 2, tilting 5°, and set back down past its seat, widening 1.08 on the part spring; the tile takes the weight a beat later on the object spring.',
};
