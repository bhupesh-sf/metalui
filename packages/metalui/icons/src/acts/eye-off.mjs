import { actor, ease, end, light, motion, pose, spring, T } from '../motion.mjs';

/* ── EYE-OFF / the bar is slid across and the eye shuts ───────
 * Verb, object   hide this (a password, a layer). The eye is what would see; the bar across it
 *                is the shutter that stops it.
 * Invariant      Eye's lids with no iris (nothing is seen), behind one diagonal bar whose
 *                clearance cuts them; the bar only slides along its own diagonal, and the lids
 *                only close about their own centre line.
 * Causal parts   cause: the bar, drawn back and slid home across the eye. Receiver: the eye,
 *                which peeks open as the bar is drawn back and shuts as it lands, then reopens
 *                behind it. Payoff: a stop at the bar's foot as it lands.
 * Neighbours     not Eye (no bar, no iris), not Close or Block (a bar across an eye, not a cross or an
 *                empty ring), not Search (no lids).
 * Forbidden      the bar drawn on and off (its clearance would snap), a spin, a whole-glyph
 *                pulse.
 *
 *    0ms  rest
 *  160ms  the bar is drawn back 1.4 up its diagonal; the eye peeks open (1.06 tall)
 *  240ms  slid home .5 past its seat; the lids shut to .5 and the stop shows at its foot
 *  240ms+ the bar settles on the part spring, the lids reopen on the hinge spring
 *  ~900ms exact rest
 * ────────────────────────────────────────────────────────── */
const u = Math.SQRT1_2;
const along = (d) => ({ x: d * u, y: d * u });
const bar = spring(240, along(0.5), {}, 'part');
const lids = spring(250, { sy: 0.5 }, {}, 'hinge');
const D = Math.max(end(bar), end(lids));
const fin = (frames) => (end(frames) === D ? frames : [...frames, pose(D, T())]);
const BAR = 'M4.6 4.6 19.4 19.4';
export const act = {
  defs: `<mask id="&-m" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24"><rect width="24" height="24" fill="#fff" stroke="none"/><g data-part="bar"><path d="${BAR}" fill="none" stroke="#000" stroke-width="3.7"/></g></mask>`,
  body: `<g mask="url(#&-m)"><g data-part="lids"><path class="f" style="--duo:.1" d="M12 6.8a9.55 9.55 0 0 1 8.5 5.2 9.55 9.55 0 0 1-17 0A9.55 9.55 0 0 1 12 6.8Z"/></g></g><g data-part="bar"><path d="${BAR}"/></g><path class="ac" data-part="stop" opacity="0" d="M20.7 18.3l.7-.3M18.3 20.7l-.3.7" style="stroke-width:calc(var(--sw) * .7)"/>`,
  study: motion(D, 'The bar is drawn back and slid home across the eye; the eye shuts behind it and opens again.', ['Draw back', 'Slide home', 'Reopen'], [
    actor('bar', '12px 12px', [
      pose(0, T(), ease.smooth),
      pose(160, T(along(-1.4)), ease.strike),
      ...fin(bar),
    ]),
    actor('lids', '12px 12px', [
      pose(0, T(), ease.smooth),
      pose(160, T({ sy: 1.06 }), ease.strike),
      ...fin(lids),
    ]),
    actor('stop', '19.4px 19.4px', [
      light(0, 0, 'scale(.6)'), light(230, 0, 'scale(.6)', ease.settle),
      light(270, 0.85, 'scale(1)', ease.smooth), light(470, 0, 'scale(1.3)'), light(D, 0, 'scale(.6)'),
    ]),
  ]),
  shape: 'Eye\'s lids (17 × 10.4, tinted .1) with no iris, behind a bar from 4.6/4.6 to 19.4/19.4 that casts its clearance (1 each side) onto them: from Eye the iris opens and stretches into the bar (.64 each way). Keeping the iris under the bar cost a second clearance (K6) and scored .89. Motion (study): the bar is drawn back 1.4 up its diagonal as the eye peeks open 1.06, then slid home .5 past its seat on the part spring; the eye shuts to .5 and reopens on the hinge spring; a stop shows at the bar\'s foot.',
};
