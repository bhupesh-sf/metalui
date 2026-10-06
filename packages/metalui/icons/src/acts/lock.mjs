import { actor, ease, end, light, motion, pose, spring, T } from '../motion.mjs';

/* ── LOCK / the shackle is pushed home and clicks shut ────────
 * Verb, object   lock this (or: it is locked, private). The case is the lock; the shackle is
 *                what closes it; the keyhole says it opens only with a key.
 * Invariant      a padlock, shackle closed into its case; the shackle only travels straight up
 *                and down its own legs (it never swings open: that is Unlock), and the case
 *                stays level.
 * Causal parts   cause: the shackle, lifted and pushed home. Receiver: the case, which takes
 *                the push (squashed .96, a beat later). Payoff: a click either side of the
 *                shackle's shoulders as it catches.
 * Neighbours     not Unlock (the shackle swung open), not Bag or Briefcase (a handle, no
 *                keyhole), not Save (a disk), not Shield (no case).
 * Forbidden      a shake, a refusal ring-down (this is locking, not a locked thing refusing),
 *                a whole-glyph bounce.
 *
 *    0ms  rest
 *  150ms  the shackle is lifted 1.4 out of the case
 *  230ms  pushed home .4 past its seat, squashed .92 tall; the clicks open
 *  245ms  the case takes it (.96 tall, 1.02 wide)
 *  230ms+ the shackle on the part spring, the case on the object spring
 *  ~850ms exact rest
 * ────────────────────────────────────────────────────────── */
const shackle = spring(230, { y: 0.4, sy: 0.92 }, {}, 'part');
const kase = spring(245, { sx: 1.02, sy: 0.96 }, {}, 'object');
const D = Math.max(end(shackle), end(kase));
const fin = (frames) => (end(frames) === D ? frames : [...frames, pose(D, T())]);
export const act = {
  body: `<g data-part="shackle"><path d="M8.2 10.6V7.6a3.8 3.8 0 0 1 7.6 0v3"/></g><g data-part="case"><path class="f" style="--duo:.12" d="M7.4 10.6h9.2a2.4 2.4 0 0 1 2.4 2.4v4.6a2.4 2.4 0 0 1-2.4 2.4H7.4A2.4 2.4 0 0 1 5 17.6V13a2.4 2.4 0 0 1 2.4-2.4Z"/><circle class="s" cx="12" cy="15.3" r="1.3"/></g><path class="ac" data-part="click" opacity="0" d="M6.4 7.4l-.9-.5M17.6 7.4l.9-.5" style="stroke-width:calc(var(--sw) * .7)"/>`,
  study: motion(D, 'The shackle is lifted and pushed home into the case, which takes it, and it clicks shut.', ['Lift', 'Push home', 'Catch'], [
    actor('shackle', '12px 10.6px', [
      pose(0, T(), ease.smooth),
      pose(150, T({ y: -1.4 }), ease.accelerate),
      ...fin(shackle),
    ]),
    actor('case', '12px 20px', [
      pose(0, T(), ease.linear),
      pose(235, T(), ease.strike),
      ...fin(kase),
    ]),
    actor('click', '12px 7.4px', [
      light(0, 0, 'scale(.6)'), light(220, 0, 'scale(.6)', ease.settle),
      light(260, 0.85, 'scale(1)', ease.smooth), light(460, 0, 'scale(1.3)'), light(D, 0, 'scale(.6)'),
    ]),
  ]),
  shape: 'A case 14 × 9.4 r2.4 from 10.6 to 20, tinted .12, with a keyhole bead r1.3 at its centre; a shackle 7.6 wide (r3.8) standing on its top edge, legs 3 long, its crown at 3.8. Motion (study): the shackle is lifted 1.4 and pushed home .4 past its seat, squashing .92, on the part spring; the case takes it a beat later (.96 tall, 1.02 wide) on the object spring; a click opens beside its shoulders.',
};
