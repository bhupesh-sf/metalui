import { actor, ease, end, light, motion, pose, spring, T } from '../motion.mjs';

/* ── FOLDER / its front is tipped open and drops shut ─────────
 * Verb, object   a folder (a branch that holds things, closed). The front is the pocket; the
 *                back with its tab is what the folder is filed by.
 * Invariant      a closed folder: a tab on the back, the front over it; the front only tips
 *                about its bottom edge (its hinge), the back only moves with what lands on it.
 * Causal parts   cause: the front, tipped open about its hinge (.76 tall) and let go. Receiver:
 *                the back, which takes the front as it drops shut (.4 down, a beat later).
 *                Payoff: a page's edge shows inside while it is open.
 * Neighbours     not Folder open (the front tipped forward, a parallelogram), not Document (a
 *                page, a folded corner), not Board or Layout (no tab), not Tag (a pointed end).
 * Forbidden      a page flying out, a wobble, a whole-glyph bounce.
 *
 *    0ms  rest
 *  200ms  the front is tipped open to .88 about its hinge; a page's edge shows inside
 *  280ms  let go: it drops shut past its seat (1.04) and settles on the hinge spring
 *  300ms  the back takes it, .4 down, on the part spring
 *  ~900ms exact rest
 * ────────────────────────────────────────────────────────── */
const shut = spring(300, { sy: 1.04 }, {}, 'hinge');
const back = spring(310, { y: 0.4 }, {}, 'part');
const D = Math.max(end(shut), end(back));
const fin = (frames) => (end(frames) === D ? frames : [...frames, pose(D, T())]);
export const act = {
  body: `<g data-part="back"><path d="M4 11.2V6.6a1.2 1.2 0 0 1 1.2-1.2h2.9l1.4 1.4h9.3a1.2 1.2 0 0 1 1.2 1.2v3.2"/></g><g data-part="front"><path class="f" style="--duo:.12" d="M5.2 10h13.6a1.2 1.2 0 0 1 1.2 1.2v6.2a1.6 1.6 0 0 1-1.6 1.6H5.6a1.6 1.6 0 0 1-1.6-1.6v-6.2a1.2 1.2 0 0 1 1.2-1.2Z"/></g><path class="ac" data-part="page" opacity="0" d="M7.4 9h9.2" />`,
  study: motion(D, 'The front is tipped open about its hinge, a page showing inside, and drops shut; the back takes it.', ['Tip open', 'Drop', 'Settle'], [
    actor('front', '12px 19px', [
      pose(0, T(), ease.smooth),
      pose(200, T({ sy: 0.88 }), ease.linear),
      pose(220, T({ sy: 0.88 }), ease.accelerate),
      ...fin(shut),
    ]),
    actor('back', '12px 11.2px', [
      pose(0, T(), ease.linear),
      pose(290, T(), ease.strike),
      ...fin(back),
    ]),
    actor('page', '12px 9px', [
      light(0, 0, 'translate(0px,1.5px)'), light(80, 0, 'translate(0px,1.5px)', ease.settle),
      light(200, 0.8, 'translate(0px,0px)', ease.accelerate), light(290, 0, 'translate(0px,1.5px)'), light(D, 0, 'translate(0px,1.5px)'),
    ]),
  ]),
  shape: 'A front 16 × 9 (top corners r1.2, bottom r1.6) from 10 to 19, tinted .12; the back an open wire standing on its top corners: its sides up to 6.8, a tab 2.9 wide at 5.4 stepping down 1.4 to the back\'s top edge. Folder open is the same back carried down behind its front and the front tipped forward, so the two morph by the front. Motion (study): the front is tipped open to .88 about its hinge and drops shut past its seat on the hinge spring; the back takes it .4 on the part spring; a page\'s edge shows inside while it is open.',
};
