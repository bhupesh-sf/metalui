import { actor, ease, end, light, motion, pose, spring, T } from '../motion.mjs';

/* ── FILTER / the funnel is shaken and the drop sifts in it ──
 * Verb, object   show only what matches. The funnel is the filter; the drop in its bowl is what
 *                is being sifted.
 * Invariant      a funnel, wide side up, with one drop in its bowl; the funnel never tips (tipped
 *                it would pour) and only moves up and down its own axis, and the drop only
 *                travels straight up and down that axis, inside the bowl.
 * Causal parts   cause: the funnel, jerked down once and back, as a sieve is shaken. Receiver:
 *                the drop, which lags the jerk, is tossed up by the funnel coming back and falls
 *                back into the bowl, squashing. Payoff: a splash either side of it as it lands.
 * Neighbours     not Sort (no arrows), not Settings (no teeth), not a glass or a goblet (a spout,
 *                no foot), not Download (nothing arrives from outside).
 * Forbidden      a funnel that tips or shakes side to side, a stream of drops, a drop falling
 *                out of the glyph.
 *
 *    0ms  rest
 *  140ms  the funnel is jerked down .8; the drop lags, only .2 down
 *  220ms  the funnel snaps back .3 past rest (object spring); the drop is tossed up
 *  300ms  the drop's peak, 1.1 up, clear of the rim
 *  420ms  it falls back into the bowl .3 past its place, squashed (.86 tall, 1.12 wide); the
 *         splash opens beside it
 *  420ms+ the drop settles on the part spring
 *  ~900ms exact rest
 * ────────────────────────────────────────────────────────── */
const funnel = spring(220, { y: -0.3 }, {}, 'object');
const drop = spring(420, { y: 0.3, sx: 1.12, sy: 0.86 }, {}, 'part');
const D = Math.max(end(funnel), end(drop));
const fin = (frames) => (end(frames) === D ? frames : [...frames, pose(D, T())]);
export const act = {
  body: `<g data-part="funnel"><path class="f" style="--duo:.12" d="M5.6 4.6h12.8a1.2 1.2 0 0 1 .9 2l-4.9 5.5v4.6l-4.8 0v-4.6L4.7 6.6a1.2 1.2 0 0 1 .9-2Z"/></g><g data-part="drop"><circle class="s" cx="12" cy="8.4" r="1.3"/></g><path class="ac" data-part="splash" opacity="0" d="M9.8 9.5h-.6M14.2 9.5h.6" style="stroke-width:calc(var(--sw) * .7)"/>`,
  study: motion(D, 'The funnel is shaken down once; the drop in its bowl is tossed up and falls back in.', ['Shake', 'Toss', 'Land'], [
    actor('funnel', '12px 10.6px', [
      pose(0, T(), ease.accelerate),
      pose(140, T({ y: 0.8 }), ease.strike),
      ...fin(funnel),
    ]),
    actor('drop', '12px 9.7px', [
      pose(0, T(), ease.smooth),
      pose(140, T({ y: 0.2 }), ease.settle),
      pose(300, T({ y: -1.1 }), ease.accelerate),
      ...fin(drop),
    ]),
    actor('splash', '12px 9.5px', [
      light(0, 0, 'scale(.6)'), light(410, 0, 'scale(.6)', ease.settle),
      light(450, 0.85, 'scale(1)', ease.smooth), light(650, 0, 'scale(1.4)'), light(D, 0, 'scale(.6)'),
    ]),
  ]),
  shape: 'A funnel 15.6 wide, tinted .12, its rim at 4.6 with r1.2 shoulders, narrowing to a 4.8 spout from 12.1 to 16.7; a drop bead r1.3 in its bowl at 8.4. (The first draft had the drop under the spout; with the spout it read as an exclamation mark.) Motion (study): the funnel is jerked down .8 and snaps back .3 past rest on the object spring; the drop lags, is tossed 1.1 up and falls back into the bowl .3 past its place, squashing .86, on the part spring; a splash opens beside it.',
};
