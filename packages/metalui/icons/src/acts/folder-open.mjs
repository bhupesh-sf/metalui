import { actor, ease, end, light, motion, pose, spring, T } from '../motion.mjs';

/* ── FOLDER OPEN / a page is lifted out and put back ──────────
 * Verb, object   an open folder (a branch showing what it holds). The front lies tipped
 *                forward; what was inside is reachable.
 * Invariant      an open folder: the back with its tab, the front tipped forward over its
 *                bottom edge; the front only tips about that edge, the back never moves.
 * Causal parts   cause: a page, lifted 1.9 out of the folder and put back. Receiver: the front,
 *                which tips further open (.86) to let it out and takes it back (part spring).
 *                Payoff: the page's edge itself, shown above the front only while it is out.
 * Neighbours     not Folder (the front closed flat), not Download or Inbox (a tray, an arrow),
 *                not Board (no tab), not Document (a page alone).
 * Forbidden      the folder flapping, the page flying away, a whole-glyph bounce.
 *
 *    0ms  rest
 *  140ms  the front tips further open (.86); the page rises out of it
 *  320ms  the page at the top of its lift, 1.9 up
 *  480ms  put back: it sinks out of sight; the front comes back up past its seat (1.03)
 *  ~1000ms exact rest
 * ────────────────────────────────────────────────────────── */
const front = spring(480, { sy: 1.03 }, {}, 'part');
const D = Math.max(end(front), 900);
const fin = (frames) => (end(frames) === D ? frames : [...frames, pose(D, T())]);
export const act = {
  body: `<g data-part="back"><path d="M4 13V6.6a1.2 1.2 0 0 1 1.2-1.2h2.9l1.4 1.4h9.3a1.2 1.2 0 0 1 1.2 1.2v2"/></g><g data-part="front"><path class="f" style="--duo:.12" d="M6.96 10H18.5A1.2 1.2 0 0 1 19.68 11.46L18.28 17.75A1.6 1.6 0 0 1 16.72 19H5.99A1.6 1.6 0 0 1 4.43 17.05L5.79 10.94A1.2 1.2 0 0 1 6.96 10Z"/></g><path class="ac" data-part="page" opacity="0" d="M8.2 10.4h8.6" />`,
  study: motion(D, 'A page is lifted out of the open folder, the front tipping further to let it out, and put back.', ['Lift out', 'Hold', 'Put back'], [
    actor('front', '12px 19px', [
      pose(0, T(), ease.smooth),
      pose(140, T({ sy: 0.86 }), ease.linear),
      pose(400, T({ sy: 0.86 }), ease.accelerate),
      ...fin(front),
    ]),
    actor('page', '12px 10.4px', [
      light(0, 0, 'translate(0px,1px)'), light(60, 0, 'translate(0px,1px)', ease.settle),
      light(320, 0.85, 'translate(0px,-1.9px)', ease.accelerate), light(470, 0, 'translate(0px,1px)'), light(D, 0, 'translate(0px,1px)'),
    ]),
  ]),
  shape: 'Folder\'s back carried down behind the front\'s left edge (from 13), its tab at 5.4; the front tipped forward over its bottom edge, a parallelogram from 10 to 19 leaning 2 right (corners r1.2 top, r1.6 bottom), tinted .12, its top edge meeting the back\'s right side. Motion (study): the front tips further open (.86) and a page rises 1.9 out of the folder, then sinks back as the front comes up past its seat on the part spring.',
};
