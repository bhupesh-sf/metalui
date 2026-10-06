import { actor, ease, end, light, motion, pose, spring, T } from '../motion.mjs';

/* ── ATTACH / the clip slides onto a sheet and bites ──────────
 * Verb, object   attach a file. The paper clip is what holds one thing to another.
 * Invariant      a three-leg paper clip on the diagonal, its long loop to the upper right; it
 *                only travels along its own legs (a clip slides on, it doesn't swing), and only
 *                ever tips 4° as it bites.
 * Causal parts   cause: the clip, drawn back and slid down onto a sheet. Receiver: the sheet,
 *                unseen at rest, whose edge shows under the legs as the clip takes hold. Payoff:
 *                that edge, appearing at the bite and fading.
 * Neighbours     not Link (one wire, not two rings), not Edit (no pen point, no note under it),
 *                not Paste (no clipboard).
 * Forbidden      a swinging clip, a spin, a whole-glyph bounce.
 *
 *    0ms  rest
 *  160ms  the clip is drawn back 1.6 along its legs (up and right)
 *  240ms  slid down onto the sheet .5 past its seat, tipping 4° as it bites; the sheet's edge
 *         shows under its legs
 *  240ms+ the clip settles on the part spring; the edge fades by 520
 *  ~620ms exact rest
 * ────────────────────────────────────────────────────────── */
const clip = spring(240, { x: -0.354, y: 0.354, r: -4 }, {}, 'part');
const D = end(clip);
export const act = {
  body: `<g data-part="clip"><path d="M14.05 9.95L7.69 16.31A1.6 1.6 0 0 1 5.42 14.05L13.27 6.20A3.2 3.2 0 0 1 17.80 10.73L8.46 20.06"/></g><path class="ac" data-part="sheet" opacity="0" d="M5.21 12.57L11.43 18.79" style="stroke-width:calc(var(--sw) * .6)"/>`,
  study: motion(D, 'The clip is drawn back and slid onto a sheet; the sheet\'s edge shows under it as it bites.', ['Draw back', 'Slide on', 'Bite'], [
    actor('clip', '12px 12px', [
      pose(0, T(), ease.smooth),
      pose(160, T({ x: 1.131, y: -1.131 }), ease.strike), // 1.6 back along its legs
      ...clip,
    ]),
    actor('sheet', '12px 12px', [
      light(0, 0, 'scale(.8)'), light(220, 0, 'scale(.8)', ease.settle),
      light(260, 0.55, 'scale(1)', ease.smooth), light(520, 0, 'scale(1.05)'), light(D, 0, 'scale(.8)'),
    ]),
  ]),
  shape: 'A three-leg paper clip on the diagonal (legs 3.2 apart, a 3.2 top bend and a 1.6 inner bend, 48u of wire), its long loop to the upper right, centred on the grid. One wire and no tint: like Check and Close it is a light exception to the grammar\'s body rule (K4), kept because a clip on a card read as a bag or an edit pen. Motion (study): the clip is drawn back 1.6 along its legs and slid on .5 past its seat, tipping 4° as it bites, on the part spring; a sheet\'s edge shows under its legs at the bite and fades.',
};
