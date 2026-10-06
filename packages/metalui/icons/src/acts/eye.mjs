import { actor, ease, motion, pose, light, T } from '../motion.mjs';

/* ── EYE / it looks one way, then the other, and blinks ───────
 * Verb, object   show this (a password, a hidden layer). The lids are the eye; the iris is
 *                where it looks.
 * Invariant      an open eye, level, its iris inside the lids; the iris only travels side to
 *                side within them, and the lids only close about the eye's own centre line.
 * Causal parts   cause: the iris, which looks left, then right. Receiver: the lids, which narrow
 *                as it looks and close once as it comes back. Payoff: rays over the upper lid as
 *                it opens wide again: it sees.
 * Neighbours     not Eye-off (no bar across), not Search (a lens on a handle, no lids), not
 *                Target (rings, no lids), not Preview (no frame).
 * Forbidden      a spinning iris, a wink of one lid, a whole-glyph pulse.
 *
 *    0ms  rest
 *  170ms  the iris looks left 1.6; the lids narrow .9
 *  400ms  it looks right 1.6
 *  560ms  back to the centre as the lids close (.3 tall), the iris with them
 *  660ms  open, 1.03 past; three short rays open over the upper lid
 *  900ms  exact rest
 * ────────────────────────────────────────────────────────── */
const D = 900;
const lid = [[0, 1, ease.smooth], [170, 0.9, ease.smooth], [400, 0.9, ease.accelerate], [560, 0.3, ease.settle], [700, 1.03, ease.smooth], [800, 1, ease.linear], [D, 1]];
const iris = [[0, 0, 1, ease.smooth], [170, -1.6, 0.9, ease.smooth], [280, -1.6, 0.9, ease.smooth], [400, 1.6, 0.9, ease.accelerate], [560, 0, 0.3, ease.settle], [700, 0, 1.03, ease.smooth], [800, 0, 1, ease.linear], [D, 0, 1]];
export const act = {
  body: `<g data-part="lids"><path class="f" style="--duo:.1" d="M12 6.8a9.55 9.55 0 0 1 8.5 5.2 9.55 9.55 0 0 1-17 0A9.55 9.55 0 0 1 12 6.8Z"/></g><g data-part="iris"><path class="f" style="--duo:.3" d="M12 9.2a2.8 2.8 0 1 1 0 5.6 2.8 2.8 0 1 1 0-5.6Z"/></g><path class="ac" data-part="rays" opacity="0" d="M12 4.7V3.5M8.2 5.5l-.6-.9M15.8 5.5l.6-.9" style="stroke-width:calc(var(--sw) * .7)"/>`,
  study: motion(D, 'The eye looks one way, then the other, and blinks; it opens wide and rays open over it.', ['Look', 'Look back', 'Blink'], [
    actor('lids', '12px 12px', lid.map(([at, sy, e]) => pose(at, T({ sy }), e))),
    actor('iris', '12px 12px', iris.map(([at, x, sy, e]) => pose(at, T({ x, sy }), e))),
    actor('rays', '12px 5.5px', [
      light(0, 0, 'scale(.7)'), light(640, 0, 'scale(.7)', ease.settle),
      light(690, 0.9, 'scale(1)', ease.smooth), light(860, 0, 'scale(1.1)'), light(D, 0, 'scale(.7)'),
    ]),
  ]),
  shape: 'Lids a lens 17 × 10.4 (two arcs r9.55 meeting in sharp corners at 3.5 and 20.5), tinted .1; an iris ring r2.8 tinted .3 on the centre. Eye-off is the same eye behind a bar, so the two morph by the bar alone. Motion (study): the iris looks left 1.6 and right 1.6 as the lids narrow .9, then the lids close to .3 and open 1.03 about the centre line with the iris; rays open over the upper lid.',
};
