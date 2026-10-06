import { actor, ease, end, light, motion, pose, spring, T } from '../motion.mjs';

/* ── THUMB / the thumb is cocked and flicked up: good ─────────
 * Verb, object   say this reply was good. The fist is the hand that answers; the thumb is the
 *                answer, raised off it. Turned 180° (MorphPair turn, rotationEffect) it is the
 *                thumbs-down, so nothing in it has a top or a light of its own.
 * Invariant      a fist on its cuff with the thumb standing off its top; the fist and the cuff
 *                never move off their place, and the thumb only turns about its root on the fist.
 * Causal parts   cause: the thumb, cocked over the fist and flicked back up. Receiver: the fist,
 *                which is squeezed while the thumb presses into it and lets go as it is thrown.
 *                Payoff: two short rays either side of the tip as it stands (mirror-symmetric,
 *                so they read the same turned over).
 * Neighbours     not Check (a hand, not a mark), not Pin (no needle, nothing driven in), not
 *                Person (no head; the fist is a block on a cuff).
 * Forbidden      a whole-hand bounce, a wave, a scale pulse, a like-heart.
 *
 *    0ms  rest
 *  150ms  the thumb is cocked 28° over the fist and down .4; the fist squeezes (1.02 wide, .96 tall)
 *  260ms  the flick: the thumb is thrown back past upright to −10°, lifted .6; the fist lets go
 *  280ms  two rays open either side of the tip, gone by 480
 *  260ms+ the thumb settles on the hinge spring, the fist on the release spring
 *  ~860ms exact rest
 * ────────────────────────────────────────────────────────── */
const flick = spring(260, { y: -0.6, r: -10 }, {}, 'hinge');
const grip = spring(250, { sx: 1.02, sy: 0.96 }, {}, 'release');
const D = Math.max(end(flick), end(grip));
const fin = (frames) => (end(frames) === D ? frames : [...frames, pose(D, T())]);
export const act = {
  body: `<path d="M4.2 9.8v9.8"/>`
    + `<g data-part="fist"><path class="f" style="--duo:.12" d="M9.2 9h7.8a2.4 2.4 0 0 1 2.4 2.4v6.6a2.4 2.4 0 0 1-2.4 2.4H9.2a2.4 2.4 0 0 1-2.4-2.4v-6.6A2.4 2.4 0 0 1 9.2 9Z"/></g>`
    + `<g data-part="thumb"><path d="M9.2 9l1.6-4.2a1.8 1.8 0 0 1 3.4.6L13.8 9"/></g>`
    + `<path class="ac" data-part="rays" opacity="0" d="M9.7 3.9l-1-.6M14.9 3.9l1-.6" style="stroke-width:calc(var(--sw) * .7)"/>`,
  study: motion(D, 'The thumb is cocked over the fist, then flicked back up past upright and stands; the fist lets go of it.', ['Cock', 'Flick', 'Stand'], [
    actor('thumb', '11.5px 9px', [
      pose(0, T(), ease.accelerate),
      pose(150, T({ y: 0.4, r: 28 }), ease.strike),
      ...fin(flick),
    ]),
    actor('fist', '13.1px 20.4px', [
      pose(0, T(), ease.smooth),
      pose(150, T({ sx: 1.02, sy: 0.96 }), ease.linear),
      ...fin(grip),
    ]),
    actor('rays', '12.3px 3.6px', [
      light(0, 0, 'scale(.5)'), light(260, 0, 'scale(.5)', ease.settle),
      light(300, 0.9, 'scale(1)', ease.smooth), light(480, 0, 'scale(1.3)'), light(D, 0, 'scale(.5)'),
    ]),
  ]),
  shape: 'A fist 12.6 × 11.4, r2.4, tinted .12; the cuff one upright wire 2.6 to its left; the thumb an open wire standing off the fist\'s top, root 9.2–13.8, leaning a little left, tip r1.8 at y3. With the cuff drawn as a capsule ring and the fist right of centre (the first draft) the mean strain was 1.78; a wire cuff and the fist moved left to sit on the centre bring it to 1.49. The glyph is centred on (12, 12) within .3, so the thumbs-down is the same drawing turned 180° about the centre. Motion (study): the thumb is cocked 28° over the fist, which squeezes, then flicked back past upright to −10° on the hinge spring; two mirror-symmetric rays open either side of the tip.',
};
