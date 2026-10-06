import { actor, ease, end, motion, pose, spring, T } from '../motion.mjs';

/* ── VOLUME HIGH / the cone pumps and throws two waves ────────
 * Verb, object   loud: turn the sound up. The speaker is the body; the waves are the sound it
 *                throws, the near one first and the far one a beat behind.
 * Invariant      a speaker facing right with two arcs on its mouth's centre; the speaker only
 *                draws back and pushes along its own axis, the arcs only travel out along it and
 *                come home (never turning, never scaling: a scaling arc reads as a loading ring).
 * Causal parts   cause: the speaker, which draws back and pumps forward. Receiver: the near
 *                wave, thrown out by the push; the far wave, heavier, lagging it. Payoff: the far
 *                wave at its furthest, a beat after the cone lands.
 * Neighbours     not Volume low (one wave, a shorter throw), not Bell (no hanging bell, no
 *                clapper), not Podcast (no rings around a mic), not Send (nothing leaves).
 * Forbidden      a pulse of the whole glyph, a ripple loop, waves that fade in and out on a timer.
 *
 *    0ms  rest
 *  140ms  the speaker draws back .8 (squashed .95 along its axis); the waves hold, clear of the cone
 *  140ms+ the speaker pumps forward and settles on the part spring
 *  200ms  the near wave is thrown .8 out (never onto the far one) and comes home on the part spring
 *  220ms  the far wave, lagging, is thrown 1.6 out and comes home on the object spring
 *  ~1s    exact rest
 * ────────────────────────────────────────────────────────── */
const speaker = spring(140, { x: -0.8, sx: 0.95 }, {}, 'part');
const near = spring(200, { x: 0.8 }, {}, 'part');
const far = spring(220, { x: 1.6 }, {}, 'object');
const D = Math.max(end(speaker), end(near), end(far));
const fin = (frames) => (end(frames) === D ? frames : [...frames, pose(D, T())]);
export const act = {
  body: `<g data-part="speaker"><path class="f" style="--duo:.14" d="M13 5.4v13.2l-4.6-3.8H5.6a1.2 1.2 0 0 1-1.2-1.2v-3.2a1.2 1.2 0 0 1 1.2-1.2h2.8Z"/></g><g data-part="near"><path d="M14.61 9.71a2.8 2.8 0 0 1 0 4.59"/></g><g data-part="far"><path d="M16.21 7.41a5.6 5.6 0 0 1 0 9.17"/></g>`,
  study: motion(D, 'The speaker pumps and throws its two waves out; the far one lags and both come home.', ['Draw back', 'Pump', 'Throw'], [
    actor('speaker', '4.4px 12px', [
      pose(0, T(), ease.accelerate),
      ...fin(speaker),
    ]),
    actor('near', '13px 12px', [
      pose(0, T(), ease.smooth),
      pose(140, T(), ease.strike),
      ...fin(near),
    ]),
    actor('far', '13px 12px', [
      pose(0, T(), ease.smooth),
      pose(140, T(), ease.smooth),
      pose(200, T(), ease.strike),
      ...fin(far),
    ]),
  ]),
  shape: 'A speaker facing right: a 4 × 5.6 box (corners 1.2) from x 4.4 and a cone opening to 13.2 tall at x 13, one tinted (.14) ring started at the cone\'s top; two arcs on the mouth\'s centre (13, 12), r2.8 and r5.6, each over ±55°. Volume low is the same speaker with the near arc only, so the pair morphs by one mark. Motion (study): the speaker draws back .8 and pumps forward on the part spring; the near arc is thrown .8 out, the far arc 1.6 a beat later on the object spring; all come home.',
};
