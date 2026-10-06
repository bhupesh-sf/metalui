import { actor, ease, end, light, motion, pose, spring, T } from '../motion.mjs';

/* ── SAVE / the disk is pushed home and its shutter catches ───
 * Verb, object   keep this. The disk is where it is kept; the shutter is what opens as it seats.
 * Invariant      a square disk with its corner cut at the top right, a shutter on its top edge
 *                and a label on its bottom edge; the disk only travels straight down and back,
 *                and the shutter never leaves the top edge.
 * Causal parts   cause: the disk, pushed down into the drive. Receiver: the shutter, which is
 *                caught and slides open as the disk seats, then springs shut. Payoff: a click at
 *                the cut corner as it catches.
 * Neighbours     not Document (no folded page, no lines of text), not Download (no arrow), not
 *                Archive (no box), not a floppy shaking.
 * Forbidden      a whole-glyph pulse, a check mark (MOT-14: the act is a gesture, not a claim
 *                that anything was saved).
 *
 *    0ms  rest
 *  140ms  the disk is pushed 1.2 down, gathering speed
 *  200ms  it seats: .4 past, squashed .96 tall; the shutter is caught and slides 1 right
 *  210ms  the click opens at the cut corner
 *  200ms+ the disk comes back on the object spring, the shutter shuts on the part spring
 *  ~850ms exact rest
 * ────────────────────────────────────────────────────────── */
const disk = spring(200, { y: 1.6, sy: 0.96 }, {}, 'object');
const shutter = spring(260, { x: 1 }, {}, 'part');
const D = Math.max(end(disk), end(shutter));
const fin = (frames) => (end(frames) === D ? frames : [...frames, pose(D, T())]);
export const act = {
  body: `<g data-part="disk"><path class="f" style="--duo:.1" d="M6.4 4.5h9.2l3.9 3.9v9.2a1.9 1.9 0 0 1-1.9 1.9H6.4a1.9 1.9 0 0 1-1.9-1.9V6.4a1.9 1.9 0 0 1 1.9-1.9Z"/><path d="M8.5 19.5v-4.3h7v4.3"/><g data-part="shutter"><path d="M8.5 4.5v3.4h5.6V4.5"/></g></g><path class="ac" data-part="click" opacity="0" d="M19.6 5.6l1-1M20.2 7.6h1.2" style="stroke-width:calc(var(--sw) * .7)"/>`,
  study: motion(D, 'The disk is pushed home; as it seats the shutter catches and slides open, then springs shut.', ['Push', 'Seat', 'Shut'], [
    actor('disk', '12px 19.5px', [
      pose(0, T(), ease.accelerate),
      pose(140, T({ y: 1.2 }), ease.strike),
      ...fin(disk),
    ]),
    actor('shutter', '11.3px 6.2px', [
      pose(0, T(), ease.linear),
      pose(190, T(), ease.strike),
      pose(260, T({ x: 1 }), ease.linear),
      ...fin(shutter).slice(1),
    ]),
    actor('click', '19.6px 6.6px', [
      light(0, 0, 'scale(.6)'), light(190, 0, 'scale(.6)', ease.settle),
      light(230, 0.9, 'scale(1)', ease.smooth), light(430, 0, 'scale(1.3)'), light(D, 0, 'scale(.6)'),
    ]),
  ]),
  shape: 'A 15 × 15 disk with its top-right corner cut 3.9 and r1.9 corners, tinted .1; a 5.6 shutter hanging from the top edge and a 7 label standing on the bottom edge. Motion (study): the disk is pushed 1.2 down and seats .4 past on the object spring, squashing .96; the shutter is caught and slides 1 right, then springs shut on the part spring; a click opens at the cut corner.',
};
