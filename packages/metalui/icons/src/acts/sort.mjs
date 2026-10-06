import { actor, ease, end, light, motion, pose, spring, T } from '../motion.mjs';

/* ── SORT / the two arrows pass each other and change places ──
 * Verb, object   put these in order. The disc is the key; the arrows are the two directions an
 *                order can run, up and down.
 * Invariant      one arrow up on the left, one down on the right, side by side in their disc;
 *                each only travels along its own axis and never turns, and the disc never moves.
 * Causal parts   cause: the up arrow, pushed up. Receiver: the down arrow, which answers a beat
 *                later, pushed down: the two pass each other like rows changing places. Payoff:
 *                two puffs under the up arrow's tail as it pushes off.
 * Neighbours     not Download or Upload (one arrow and a bar), not Retry or Synced (a loop),
 *                not Filter (a funnel), not a swap (arrows side by side, not head to tail).
 * Forbidden      the arrows turning over, a spin, a whole-key bounce.
 *
 *    0ms  rest
 *  140ms  the up arrow crouches .8, squashed .9 along its shaft
 *  220ms  it strikes 1.1 up, stretched 1.04
 *  280ms  the down arrow answers, 1.1 down (it crouched .8 up from 60)
 *  230ms  the puffs open under the up arrow's tail
 *  220ms+ each comes back on the part spring
 *  ~800ms exact rest
 * ────────────────────────────────────────────────────────── */
const up = spring(220, { y: -1.1, sy: 1.04 }, {}, 'part');
const down = spring(280, { y: 1.1, sy: 1.04 }, {}, 'part');
const D = Math.max(end(up), end(down));
const fin = (frames) => (end(frames) === D ? frames : [...frames, pose(D, T())]);
export const act = {
  body: `<path class="f" style="--duo:.1" d="M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 1 1 0-17Z"/><g data-part="up"><path d="M7.2 10 9.4 7.8l2.2 2.2M9.4 7.8v8.6"/></g><g data-part="down"><path d="M14.6 7.6v8.6M12.4 14l2.2 2.2 2.2-2.2"/></g><path class="ac" data-part="puff" opacity="0" d="M8.5 17.6l-.4.4M10.3 17.6l.4.4" style="stroke-width:calc(var(--sw) * .7)"/>`,
  study: motion(D, 'The up arrow is pushed up and the down arrow answers, pushed down: they pass like rows changing places.', ['Crouch', 'Pass', 'Settle'], [
    actor('up', '9.4px 12px', [
      pose(0, T(), ease.accelerate),
      pose(140, T({ y: 0.8, sy: 0.9 }), ease.strike),
      ...fin(up),
    ]),
    actor('down', '14.6px 12px', [
      pose(0, T(), ease.linear),
      pose(60, T(), ease.accelerate),
      pose(200, T({ y: -0.8, sy: 0.9 }), ease.strike),
      ...fin(down),
    ]),
    actor('puff', '9.4px 17.6px', [
      light(0, 0, 'scale(.5)'), light(200, 0, 'scale(.5)', ease.settle),
      light(250, 0.85, 'scale(1)', ease.smooth), light(450, 0, 'scale(1.4)'), light(D, 0, 'scale(.5)'),
    ]),
  ]),
  shape: 'Disc r8.5, tinted .1 (the key of Send, Download and Upload), holding an up arrow at 9.4 and a down arrow at 14.6, each 8.6 long with 2.2 arms, their heads at opposite ends so they pass without touching. Five parts, one over K2: as harpoons (one arm each, four parts) the pair read as a 1 and an N at 16 px, so the full heads stay; the disc keeps it next to Download and Upload (.39 each way). Motion (study): the up arrow crouches .8 and strikes 1.1 up; the down arrow answers 60 ms later, 1.1 down; each comes back on the part spring; two puffs open under the up arrow\'s tail.',
};
