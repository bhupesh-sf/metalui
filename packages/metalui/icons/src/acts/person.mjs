import { actor, ease, end, light, motion, pose, spring, T } from '../motion.mjs';

/* ── PERSON / looks up and nods: it's them ────────────────────
 * Verb, object   someone: assign to them, their profile. The disc is their portrait; the head
 *                and shoulders are them.
 * Invariant      a head over shoulders inside the disc; the head only lifts and tips about the
 *                neck, never leaves the shoulders' line of sight, and the disc never moves.
 * Causal parts   cause: the head, which looks up and nods. Receiver: the shoulders, heavier,
 *                which rise with it a beat later and settle. Payoff: a ring opens round the
 *                head as it comes back: here they are.
 * Neighbours     not Me (no screen, no trend), not Group/People (one figure), not Avatar
 *                initials (a figure, not letters).
 * Forbidden      a whole-figure bounce, a wave of an arm that isn't drawn, a pulse.
 *
 *    0ms  rest
 *  170ms  the head looks up: lifted .9 and tipped back 8° about the neck
 *  220ms  the shoulders rise .5 a beat later
 *  300ms  the nod: the head comes down .5 past rest, tipped 4° forward; the ring opens
 *  300ms+ the head settles on the part spring, the shoulders on the object spring
 *  ~900ms exact rest
 * ────────────────────────────────────────────────────────── */
const head = spring(300, { y: 0.5, r: 4 }, {}, 'part');
const shoulders = spring(320, { y: 0.3 }, {}, 'object');
const D = Math.max(end(head), end(shoulders));
const fin = (frames) => (end(frames) === D ? frames : [...frames, pose(D, T())]);
export const act = {
  body: `<path class="f" style="--duo:.1" d="M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 1 1 0-17Z"/><path data-part="head" d="M12 6.3a2.9 2.9 0 1 1 0 5.8 2.9 2.9 0 1 1 0-5.8Z"/><path data-part="shoulders" d="M6.6 18.4c1.1-2.4 3.1-3.8 5.4-3.8s4.3 1.4 5.4 3.8"/><circle class="ac" data-part="here" opacity="0" cx="12" cy="9.2" r="4.4" style="stroke-width:calc(var(--sw) * .45)"/>`,
  study: motion(D, 'The figure looks up and nods; its shoulders follow, and a ring opens round its head.', ['Look up', 'Nod', 'Here'], [
    actor('head', '12px 12.1px', [
      pose(0, T(), ease.smooth),
      pose(170, T({ y: -0.9, r: -8 }), ease.strike),
      ...fin(head),
    ]),
    actor('shoulders', '12px 18.4px', [
      pose(0, T(), ease.linear),
      pose(60, T(), ease.smooth),
      pose(220, T({ y: -0.5 }), ease.accelerate),
      ...fin(shoulders),
    ]),
    actor('here', '12px 9.2px', [
      light(0, 0, 'scale(1)'), light(270, 0, 'scale(1)', ease.settle),
      light(320, 0.6, 'scale(1.06)', ease.smooth), light(560, 0, 'scale(1.3)'), light(D, 0, 'scale(1)'),
    ]),
  ]),
  shape: 'Portrait disc r8.5, tinted .1; head a 2.9 ring at 12/9.2; shoulders an arc from 6.6/18.4 to 17.4/18.4 rising to 14.6, its ends on the disc\'s line. Motion (study): the head looks up .9 and tips back 8° about the neck, then nods .5 past rest on the part spring; the shoulders rise .5 a beat later on the object spring; a ring opens round the head.',
};
