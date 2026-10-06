import { actor, ease, light, motion, pose, T, trace } from '../motion.mjs';

/* ── RETRY / the arrow backs up round the loop and goes again ─
 * Verb, object   try again. The loop is the attempt; the arrowhead is where it has got to.
 * Invariant      the arrowhead is always the tip of the loop (it rides the drawn end exactly) and
 *                always points the way it travels, clockwise; the face never moves.
 * Causal parts   cause: the arrowhead, a pen tip, backing up round the loop and setting off again.
 *                Receiver: the loop, which erases behind it and is drawn again in front of it.
 *                Payoff: the head is carried a little past the end into the gap and pulled back;
 *                a tick marks the end it reached.
 * Neighbours     not Redo (no hook, it goes all the way round), not Synced (no core, no
 *                satellite), not Undo (clockwise, forward), not a loading spinner (one pass).
 * Forbidden      a free spin, a loop that repeats, an arrow that turns against its direction.
 *
 * The loop is 302.4° of a 7.4 circle from the top, clockwise; the head rides its end, so at a drawn
 * share k the head is turned 302.4 × (k − 1)°. Both are linear in angle, so it stays on the tip.
 *    0ms  rest
 *   40ms  the head starts back; the loop erases behind it (backing up to .45 of the loop, so the
 *         loop never vanishes)
 *  260ms  backed up to the bottom (the loop a little under half drawn): the attempt is undone
 *  320ms  it sets off again, drawing, gathering then braking
 *  700ms  arrives at the end of the loop
 *  760ms  carried 7° on into the gap; the tick opens at the end
 *  860ms  pulled back onto the end of the loop
 * 1000ms  exact rest
 * ────────────────────────────────────────────────────────── */
const D = 1000;
const SPAN = 302.4;
const at = (k) => T({ r: +(SPAN * (k - 1)).toFixed(3) });
export const act = {
  body: `<path class="f" style="--duo:.06" data-part="loop" pathLength="1" d="M12 4.6A7.4 7.4 0 1 1 5.75 8.03"/><path data-part="head" d="M3.27 8.83 5.75 8.03 6.09 10.62"/><circle class="ac" data-part="tick" opacity="0" cx="5.75" cy="8.03" r="2.6" style="stroke-width:calc(var(--sw) * .45)"/>`,
  study: motion(D, 'The arrowhead backs up round the loop, erasing it, and goes again, drawing it.', ['Back up', 'Go again', 'Arrive'], [
    actor('loop', '12px 12px', [
      trace(0, 1, ease.linear), trace(40, 1, 'cubic-bezier(.4,0,.6,1)'), trace(260, 0.45, ease.linear),
      trace(320, 0.45, 'cubic-bezier(.45,0,.25,1)'), trace(700, 1, ease.linear), trace(D, 1),
    ]),
    actor('head', '12px 12px', [
      pose(0, at(1), ease.linear), pose(40, at(1), 'cubic-bezier(.4,0,.6,1)'), pose(260, at(0.45), ease.linear),
      pose(320, at(0.45), 'cubic-bezier(.45,0,.25,1)'), pose(700, at(1), ease.settle),
      pose(760, T({ r: 7 }), ease.smooth), pose(860, T({ r: -0.8 }), ease.settle), pose(D, at(1)),
    ]),
    actor('tick', '5.75px 8.03px', [
      light(0, 0, 'scale(.5)'), light(690, 0, 'scale(.5)', ease.settle),
      light(740, 0.85, 'scale(.9)', ease.smooth), light(940, 0, 'scale(1.5)'), light(D, 0, 'scale(.5)'),
    ]),
  ]),
  shape: 'A 7.4 loop, tinted .06, drawn 302.4° clockwise from the top so its gap sits at the upper left; an open arrowhead (2.6 arms) rides its end, pointing on clockwise. Motion (study): the head backs up round the loop to a little under half, erasing it, then goes again drawing it, is carried 7° into the gap and pulled back onto the end; a tick opens where it arrives.',
};
