import { actor, ease, end, motion, pose, spring, T } from '../motion.mjs';
import { rays } from '../life-geo.mjs';

/* ── SUN / it gathers itself and flares ───────────────────────
 * Verb, object   day: the light colorway, brightness. The disc is the sun; the rays are the
 *                light it throws.
 * Invariant      a disc on the centre with eight rays around it, always upright; the disc only
 *                gathers and swells about its centre, the rays only move out and in along their
 *                own lines (never turning: a turning sun is a loading spinner).
 * Causal parts   cause: the disc, which gathers (.84) and swells back. Receiver: the rays,
 *                thrown out 1.1 as it swells and drawn home on the part spring. Payoff: the
 *                flare itself, the rays at their furthest a beat after the disc lets go.
 * Neighbours     not Settings (a gear's teeth are one outline, with a hub), not Brightness
 *                (short rays on a half disc), not Moon (a crescent), not Sunny (the life set's).
 * Forbidden      a spin of the rays, a loop, a whole-glyph pulse.
 *
 *    0ms  rest
 *  160ms  the disc gathers to .84; the rays draw in .94
 *  160ms+ the disc swells back on the object spring
 *  250ms  the rays flare out to 1.1 and come home on the part spring
 *  ~900ms exact rest
 * ────────────────────────────────────────────────────────── */
const disc = spring(160, { sx: 0.84, sy: 0.84 }, {}, 'object');
const flare = spring(250, { sx: 1.1, sy: 1.1 }, {}, 'part');
const D = Math.max(end(disc), end(flare));
const fin = (frames) => (end(frames) === D ? frames : [...frames, pose(D, T())]);
export const act = {
  body: `<g data-part="disc"><path class="f" style="--duo:.2" d="M12 6a6 6 0 1 1 0 12 6 6 0 1 1 0-12Z"/></g><g data-part="rays"><path d="${rays(12, 12, 8.4, 9.8, 8, 90)}"/></g>`,
  study: motion(D, 'The disc gathers itself and swells back, flaring its rays out; they come home.', ['Gather', 'Flare', 'Settle'], [
    actor('disc', '12px 12px', [
      pose(0, T(), ease.accelerate),
      ...fin(disc),
    ]),
    actor('rays', '12px 12px', [
      pose(0, T(), ease.smooth),
      pose(160, T({ sx: 0.94, sy: 0.94 }), ease.strike),
      ...fin(flare),
    ]),
  ]),
  shape: 'A disc r6 on the centre, tinted .2, and eight rays from r8.4 to r9.8, the first straight up. Nine parts, five over K2: a sun with fewer rays reads as a target or a crosshair at 16 px, so the rays stay (documented, like Sort). Moon is a crescent on the same centre. Motion (study): the disc gathers to .84 and swells back on the object spring; the rays draw in .94 and flare out to 1.1 as it swells, home on the part spring.',
};
