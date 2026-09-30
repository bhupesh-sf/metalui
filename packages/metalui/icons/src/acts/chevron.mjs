import { actor, ease, end, light, motion, pose, spring, T } from '../motion.mjs';

/* ── CHEVRON / it points the way, and folds on its hinge ──────
 * Verb, object   this way (open, next, more). Two arms hinged at the point; the point is
 *                pushed the way it points, and the arms fold behind it like a hinge closing.
 * Invariant      one chevron pointing down (its direction comes from the turn, never from
 *                the act); the arms stay joined at the point, stay mirror images of each
 *                other, and never fold past 10° either way, so it never becomes a caret-up,
 *                a check or a line.
 * Causal parts   cause: the chevron, drawn back against its point and thrust toward it.
 *                Receiver: the arms, heavier than the point, which open as it draws back and
 *                fold in behind it on the thrust, a beat late, on the hinge spring. Payoff: an
 *                echo of the chevron carries on the way it points and fades.
 * Neighbours     not Arrow (no shaft), not Check (both arms equal, never a tick), not Close
 *                (one point, never crossed), not a double chevron (the echo is faint and gone).
 * Forbidden      a spin or rotation of the whole glyph, a bounce in place, a scale pulse.
 *
 *    0ms  rest
 *  150ms  drawn back 1.2 against its point; the arms open 6° (flatter)
 *  290ms  thrust 1.6 past rest toward its point; the arms fold 10° in (sharper), landing at 310
 *  300ms  the echo leaves just past the point and carries on to 4.4 below it, fading by 480
 *  290ms+ the point returns on the part spring; the arms, heavier, on the hinge spring
 *  n ms   exact rest
 * ────────────────────────────────────────────────────────── */
const push = spring(290, { y: 1.6 }, {}, 'part');
const foldL = spring(310, { r: 10 }, {}, 'hinge', { still: 0.5 });
const foldR = spring(310, { r: -10 }, {}, 'hinge', { still: 0.5 });
const D = Math.max(end(push), end(foldL), end(foldR));
const fin = (frames) => (end(frames) === D ? frames : [...frames, pose(D, T())]);
const V = '12px 14.8px'; // the hinge: where the arms meet
export const act = {
  body: `<g data-part="point"><path data-part="left" d="M6.4 9.2 12 14.8"/><path data-part="right" d="M17.6 9.2 12 14.8"/></g><path class="ac" data-part="echo" opacity="0" d="M6.4 9.2 12 14.8l5.6-5.6" style="stroke-width:calc(var(--sw) * .7)"/>`,
  study: motion(D, 'The chevron is drawn back and thrust the way it points; its arms fold in behind the point like a hinge, and an echo carries on.', ['Draw back', 'Thrust', 'Fold and settle'], [
    actor('point', V, [
      pose(0, T(), ease.accelerate),
      pose(150, T({ y: -1.2 }), ease.strike),
      ...fin(push),
    ]),
    actor('left', V, [
      pose(0, T(), ease.smooth),
      pose(150, T({ r: -6 }), ease.strike),
      pose(260, T({ r: -2 }), ease.accelerate),
      ...fin(foldL),
    ]),
    actor('right', V, [
      pose(0, T(), ease.smooth),
      pose(150, T({ r: 6 }), ease.strike),
      pose(260, T({ r: 2 }), ease.accelerate),
      ...fin(foldR),
    ]),
    actor('echo', V, [
      light(0, 0, T()), light(290, 0, T({ y: 2.6 }), ease.settle),
      light(320, 0.6, T({ y: 3.2 }), ease.smooth), light(480, 0, T({ y: 4.4 })), light(D, 0, T()),
    ]),
  ]),
  shape: 'Two arms 7.9 long at right angles, hinged at the point (12, 14.8), spanning 6.4 to 17.6 and 9.2 to 14.8, centred on the grid so a quarter turn about (12, 12) points it any way: one glyph for down (as drawn), up, left and right. Motion (study): drawn back 1.2 with the arms opening 6°, then thrust 1.6 toward the point on the part spring while the arms fold 10° in behind it on the hinge spring, a beat late; a faint echo leaves just past the point and carries on the way it points.',
};
