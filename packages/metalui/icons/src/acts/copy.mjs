import { actor, ease, end, light, motion, pose, spring, T } from '../motion.mjs';

/* ── COPY / the copy is laid on the original and pulled off ───
 * Verb, object   copy this (to the clipboard). The back sheet is the original; the front sheet,
 *                the body, is the copy you take away.
 * Invariant      two portrait sheets offset on the diagonal, the copy in front at the upper right;
 *                the original never moves, and the copy only travels along that diagonal and back.
 * Causal parts   cause: the copy, laid back onto the original and pressed. Receiver: the copy
 *                itself, which takes the impression as a light passes down it. Payoff: that
 *                light, then the copy pulled off .5 past its place and settling.
 * Neighbours     not Duplicate (two full squares and a plus: a second object on the canvas, not
 *                a copy taken away), not Paste (a clipboard with a clip), not Document (one page).
 * Forbidden      a sheet flying off, a whole-glyph pulse, a check (MOT-14: copying is a gesture,
 *                the Copied state is the morph to Check).
 *
 *    0ms  rest
 *  160ms  the copy is laid back 1.2 down the diagonal onto the original and pressed (.96)
 *  180ms  held there, a light passes down the copy (it rides with the copy), gone by 400
 *  440ms  pulled off: .5 past its place on the object spring
 *  ~800ms exact rest
 * ────────────────────────────────────────────────────────── */
const sheet = spring(440, { x: 0.5, y: -0.5 }, {}, 'object');
const D = end(sheet);
export const act = {
  body: `<path d="M5 9.6V18a2.4 2.4 0 0 0 2.4 2.4h7.4"/><g data-part="sheet"><path class="f" style="--duo:.12" d="M10.8 4.4H16a2.4 2.4 0 0 1 2.4 2.4v8A2.4 2.4 0 0 1 16 17.2h-5.2a2.4 2.4 0 0 1-2.4-2.4v-8a2.4 2.4 0 0 1 2.4-2.4Z"/></g><path class="ac" data-part="light" opacity="0" d="M10.6 7.4h5.6" style="stroke-width:calc(var(--sw) * .6)"/>`,
  study: motion(D, 'The copy is laid back on the original and pressed; a light passes down it and it is pulled off into place.', ['Lay on', 'Take', 'Pull off'], [
    actor('sheet', '13.4px 10.8px', [
      pose(0, T(), ease.smooth),
      pose(160, T({ x: -1.2, y: 1.2, sx: 0.96, sy: 0.96 }), ease.linear),
      pose(360, T({ x: -1.2, y: 1.2, sx: 0.96, sy: 0.96 }), ease.strike),
      ...sheet,
    ]),
    actor('light', '13.4px 7.4px', [
      light(0, 0, 'translate(-1.2px,1.2px)'), light(170, 0, 'translate(-1.2px,1.2px)', ease.smooth),
      light(210, 0.7, 'translate(-1.2px,2px)', ease.linear), light(350, 0.5, 'translate(-1.2px,6.8px)', ease.smooth),
      light(400, 0, 'translate(-1.2px,7.4px)'), light(D, 0, 'translate(-1.2px,1.2px)'),
    ]),
  ]),
  shape: 'Two portrait sheets 10 × 12.8, r2.4, offset 3.4 across and 3.2 down: the copy in front at the upper right, tinted .12, and the original behind at the lower left as an L of its left and bottom edges ending clear of the copy (no clearance, no plus: Duplicate\'s original is at the upper left and whole). With the original at the upper left (the first draft) the mean strain was 1.65, and 1.61 at a wider offset; here 1.55. Motion (study): the copy is laid back 1.2 onto the original and pressed .96; a light passes down it; it is pulled off .5 past its place on the object spring.',
};
