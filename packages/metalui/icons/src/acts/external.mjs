import { actor, ease, end, light, motion, pose, spring, T } from '../motion.mjs';

/* ── EXTERNAL / the arrow leaves through the open corner ──────
 * Verb, object   go somewhere else (a link that opens another site or window). The frame is
 *                here, this page; its open corner is the way out; the arrow is you, leaving.
 * Invariant      an arrow pointing up and right out of a frame's open top-right corner; it only
 *                travels along its own diagonal and never turns, and the frame stays put.
 * Causal parts   cause: the arrow, drawn back into the frame and thrown out of the corner.
 *                Receiver: the frame, which gives a little against the push. Payoff: a streak
 *                behind the arrow's tail as it goes.
 * Neighbours     not Share (an arrow up out of an open tray, straight up), not Send (an upright
 *                arrow on a disc), not Link (two links), not Upload (a bar overhead).
 * Forbidden      an arrow flying off the glyph, a spin, a whole-glyph bounce.
 *
 *    0ms  rest
 *  150ms  the arrow is drawn back 1 along its diagonal, into the frame
 *  230ms  thrown out 1.6 past rest along its diagonal; the frame gives .3; the
 *         streak shows behind the tail
 *  230ms+ the arrow comes back on the part spring, the frame on the object spring
 *  ~800ms exact rest
 * ────────────────────────────────────────────────────────── */
const u = Math.SQRT1_2;
const along = (d) => ({ x: d * u, y: -d * u });
const arrow = spring(230, along(1.6), {}, 'part');
const frame = spring(240, { x: -0.3 * u, y: 0.3 * u }, {}, 'object');
const D = Math.max(end(arrow), end(frame));
const SHAFT = 'M11.4 12.6 19.4 4.6';
const fin = (frames) => (end(frames) === D ? frames : [...frames, pose(D, T())]);
export const act = {
  defs: `<mask id="&-m" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24"><rect width="24" height="24" fill="#fff" stroke="none"/><g data-part="arrow"><path d="${SHAFT}" fill="none" stroke="#000" stroke-width="3.7"/></g></mask>`,
  body: `<g data-part="frame"><path class="f" style="--duo:.1" mask="url(#&-m)" d="M6.9 7.5h7.2a2.4 2.4 0 0 1 2.4 2.4v7.2a2.4 2.4 0 0 1-2.4 2.4H6.9a2.4 2.4 0 0 1-2.4-2.4V9.9a2.4 2.4 0 0 1 2.4-2.4Z"/></g><g data-part="arrow"><path d="${SHAFT}"/><path d="M14.2 4.6h5.2v5.2"/></g><path class="ac" data-part="streak" opacity="0" d="M9.6 14.4 8.4 15.6" style="stroke-width:calc(var(--sw) * .7)"/>`,
  study: motion(D, 'The arrow is drawn back into the frame and thrown out of its open corner; the frame gives behind it.', ['Draw back', 'Leave', 'Settle'], [
    actor('arrow', '15.4px 8.6px', [
      pose(0, T(), ease.smooth),
      pose(150, T(along(-1)), ease.strike),
      ...fin(arrow),
    ]),
    actor('frame', '12px 12px', [
      pose(0, T(), ease.linear),
      pose(225, T(), ease.strike),
      ...fin(frame),
    ]),
    actor('streak', '9px 15px', [
      light(0, 0, 'scale(.6)'), light(210, 0, 'scale(.6)', ease.settle),
      light(250, 0.8, 'scale(1)', ease.smooth), light(450, 0, 'scale(1.3)'), light(D, 0, 'scale(.6)'),
    ]),
  ]),
  shape: 'A 14 frame r2.4, tinted .1, open at its top-right corner (a chord-closed wire); an arrow 11.3 long on the diagonal, its head (5.2 arms) out past the corner. Motion (study): the arrow is drawn back 1 into the frame and thrown out 1.6 along its diagonal on the part spring; the frame gives .3 behind it on the object spring; a streak shows behind the tail.',
};
