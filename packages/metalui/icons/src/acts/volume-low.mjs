import { actor, ease, end, motion, pose, spring, T } from '../motion.mjs';

/* ── VOLUME LOW / the cone nudges and throws one small wave ───
 * Verb, object   quiet: turn the sound down. The speaker is the body; the one wave is the little
 *                sound it throws.
 * Invariant      a speaker facing right with one short arc on its mouth's centre; the speaker
 *                only draws back and pushes along its axis, the arc only travels out along it.
 * Causal parts   cause: the speaker, which draws back a little and nudges forward. Receiver: the
 *                wave, thrown a short way out. Payoff: the wave at its furthest, then home.
 * Neighbours     not Volume high (two waves, a bigger throw), not Bell, not Send.
 * Forbidden      a pulse of the whole glyph, a ripple loop.
 *
 *    0ms  rest
 *  140ms  the speaker draws back .5; the wave holds, clear of the cone
 *  140ms+ the speaker nudges forward and settles on the part spring
 *  200ms  the wave is thrown 1.1 out and comes home on the part spring
 *  ~900ms exact rest
 * ────────────────────────────────────────────────────────── */
const speaker = spring(140, { x: -0.5, sx: 0.97 }, {}, 'part');
const near = spring(200, { x: 1.1 }, {}, 'part');
const D = Math.max(end(speaker), end(near));
const fin = (frames) => (end(frames) === D ? frames : [...frames, pose(D, T())]);
export const act = {
  body: `<g data-part="speaker"><path class="f" style="--duo:.14" d="M13 5.4v13.2l-4.6-3.8H5.6a1.2 1.2 0 0 1-1.2-1.2v-3.2a1.2 1.2 0 0 1 1.2-1.2h2.8Z"/></g><g data-part="near"><path d="M14.61 9.71a2.8 2.8 0 0 1 0 4.59"/></g>`,
  study: motion(D, 'The speaker nudges and throws its one small wave out; it comes home.', ['Draw back', 'Nudge', 'Throw'], [
    actor('speaker', '4.4px 12px', [
      pose(0, T(), ease.accelerate),
      ...fin(speaker),
    ]),
    actor('near', '13px 12px', [
      pose(0, T(), ease.smooth),
      pose(140, T(), ease.strike),
      ...fin(near),
    ]),
  ]),
  shape: 'The Volume high speaker (a 4 × 5.6 box with corners 1.2 and a cone 13.2 tall at x 13, tinted .14) with its near arc only: r2.8 over ±55° on the mouth\'s centre (13, 12). Motion (study): the speaker draws back .5 and nudges forward on the part spring; the arc is thrown 1.1 out and comes home.',
};
