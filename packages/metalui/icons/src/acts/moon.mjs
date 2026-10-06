import { actor, ease, end, light, motion, pose, spring, T } from '../motion.mjs';

/* ── MOON / it rocks like a cradle and a star comes out ───────
 * Verb, object   night: the dark colorway, sleep, a quiet hour. The crescent is the moon; the
 *                star in its hollow says it is night, not a bitten disc or a C.
 * Invariant      a crescent opening to the upper right with a star bead in its hollow; the
 *                crescent only turns about its own middle, and the star only gives in place.
 * Causal parts   cause: the crescent, tipped back and let go, rocking home on the hinge spring.
 *                Receiver: the star, which brightens (1.35) as the crescent swings under it.
 *                Payoff: a second star twinkles out above it.
 * Neighbours     not Sun (a disc with rays), not Cookie or Pie (a round bite, no horns), not
 *                Late night (the life set's moon and sparkle), not Offline (a cloud).
 * Forbidden      a spin, a float, a whole-glyph pulse, a loop.
 *
 *    0ms  rest
 *  190ms  the crescent tips back 14° about its middle
 *  190ms+ let go: it rocks home on the hinge spring
 *  280ms  the star brightens to 1.35, back on the part spring; a second star twinkles out
 *  ~1000ms exact rest
 * ────────────────────────────────────────────────────────── */
const rock = spring(190, { r: -14 }, {}, 'hinge', { still: 0.6 });
const star = spring(280, { sx: 1.35, sy: 1.35 }, {}, 'part');
const D = Math.max(end(rock), end(star));
const fin = (frames) => (end(frames) === D ? frames : [...frames, pose(D, T())]);
export const act = {
  body: `<g data-part="crescent"><path class="f" style="--duo:.14" d="M11 4.47A6.4 6.4 0 0 0 19.4 13.74 7.6 7.6 0 1 1 11 4.47Z"/></g><g data-part="star"><circle class="s" cx="16.9" cy="7.4" r="1.15"/></g><path class="ac" data-part="twinkle" opacity="0" d="M20.2 2.9v1.6M19.4 3.7H21" style="stroke-width:calc(var(--sw) * .7)"/>`,
  study: motion(D, 'The crescent is tipped back and rocks home like a cradle; its star brightens and a second one twinkles out.', ['Tip back', 'Rock', 'Twinkle'], [
    actor('crescent', '11.6px 12.6px', [
      pose(0, T(), ease.accelerate),
      ...fin(rock),
    ]),
    actor('star', '16.9px 7.4px', [
      pose(0, T(), ease.linear),
      pose(240, T(), ease.strike),
      ...fin(star),
    ]),
    actor('twinkle', '20.2px 3.7px', [
      light(0, 0, 'scale(.4)'), light(290, 0, 'scale(.4)', ease.settle),
      light(380, 0.85, 'scale(1)', ease.smooth), light(640, 0, 'scale(.6)'), light(D, 0, 'scale(.4)'),
    ]),
  ]),
  shape: 'A crescent opening to the upper right: a disc r8.2 about the centre less a disc r6.8 about 16.6/8, two arcs meeting in sharp horns at 11.2/3.8 and 20/13.9, tinted .14; a star bead r1.15 in its hollow at 16.9/7.4. Sun is a disc with rays on the same centre. Motion (study): the crescent is tipped back 14° about its middle and rocks home on the hinge spring; the star brightens to 1.35 on the part spring as it swings under it; a second star twinkles out above.',
};
