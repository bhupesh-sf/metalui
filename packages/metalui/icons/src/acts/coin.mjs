import { actor, ease, end, light, motion, pose, spring, T } from '../motion.mjs';

/* ── COIN / it is flipped and lands ───────────────────────────
 * Verb, object   money (an amount, a price, spending). The coin stands on its edge, turned a
 *                little so its thickness shows: that edge is what makes a disc a coin.
 * Invariant      one coin, upright, its face and its edge together (one rigid body); it only
 *                travels straight up and down and turns about its own upright axis.
 * Causal parts   cause: the coin, tossed 2.4 and turned edge-on at the top of its flight.
 *                Receiver: the coin again, landing on its edge and squashed (object spring).
 *                Payoff: a clink either side of its foot as it lands.
 * Neighbours     not Info or Clock (a disc with marks, no edge), not Ellipse (no edge), not
 *                Database (a stack of three), not Spent (a card).
 * Forbidden      a free spin, a roll across the grid, a currency sign (it names no currency).
 *
 *    0ms  rest
 *  120ms  it dips .5 (the thumb under it)
 *  300ms  at the top of its toss, 2.4 up, turned edge-on (.2 wide)
 *  470ms  lands on its edge, .3 past and squashed (1.06 wide, .92 tall); the clink opens
 *  ~1000ms exact rest
 * ────────────────────────────────────────────────────────── */
const land = spring(470, { y: 0.3, sx: 1.06, sy: 0.92 }, {}, 'object');
const D = end(land);
export const act = {
  body: `<g data-part="coin"><path class="f" style="--duo:.14" d="M11 3.8a5.6 8.2 0 1 1 0 16.4 5.6 8.2 0 1 1 0-16.4Z"/><path d="M11 3.8h2.4a5.6 8.2 0 0 1 0 16.4h-2.4"/></g><path class="ac" data-part="clink" opacity="0" d="M6.8 20.9l-1 .5M17.2 20.9l1 .5" style="stroke-width:calc(var(--sw) * .7)"/>`,
  study: motion(D, 'The coin is flipped: tossed up, turned edge-on at the top, and it lands on its edge with a clink.', ['Dip', 'Toss', 'Land'], [
    actor('coin', '12px 20.2px', [
      pose(0, T(), ease.smooth),
      pose(120, T({ y: 0.5, sy: 0.96 }), ease.settle),
      pose(300, T({ y: -2.4, sx: 0.2 }), ease.accelerate),
      ...land,
    ]),
    actor('clink', '12px 21.1px', [
      light(0, 0, 'scale(.7)'), light(460, 0, 'scale(.7)', ease.settle),
      light(500, 0.85, 'scale(1)', ease.smooth), light(700, 0, 'scale(1.25)'), light(D, 0, 'scale(.7)'),
    ]),
  ]),
  shape: 'A coin standing on its edge, turned so its thickness shows: the face an ellipse 11.2 × 16.4 about 10.6/12, tinted .14, and the edge an open wire 2.8 behind it on the right (its top and bottom on the face\'s). Motion (study): it dips .5, is tossed 2.4 and turned edge-on (.2 wide) at the top, and lands on its edge .3 past, squashed, on the object spring; a clink opens either side of its foot.',
};
