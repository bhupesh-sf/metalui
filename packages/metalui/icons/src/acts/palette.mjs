import { actor, ease, end, light, motion, pose, spring, T } from '../motion.mjs';

/* ── PALETTE / it is lifted and each colour is dabbed ─────────
 * Verb, object   choose how things look (a colorway, a theme). The board is the palette in your
 *                hand; the beads are its paints.
 * Invariant      a palette with its thumb notch at the lower right and three paints; the board
 *                only tips a little about its notch, and every paint stays on its spot.
 * Causal parts   cause: the board, lifted toward you on your thumb. Receiver: the paints, each
 *                dabbed in turn (pressed flat and springing back). Payoff: a glint where the
 *                last one is taken.
 * Neighbours     not Colour picker (no dropper), not Brush (nothing is painted), not Cookie
 *                (the notch is a thumb hole's edge, the beads sit in a row of wells).
 * Forbidden      a spin, beads popping out of the board, a rainbow.
 *
 *    0ms  rest
 *  160ms  the board tips back 5° about its notch, rising .6
 *  180ms  the first paint is dabbed (.78 tall, 1.12 wide), 260ms the second, 340ms the third
 *  360ms  the glint opens at the third
 *  160ms+ each paint recovers on the part spring, the board on the object spring
 *  ~1000ms exact rest
 * ────────────────────────────────────────────────────────── */
const dab = (at) => spring(at, { sx: 1.12, sy: 0.78 }, {}, 'part');
const p1 = dab(180), p2 = dab(260), p3 = dab(340);
const board = spring(200, { y: -0.6, r: -5 }, {}, 'object');
const D = Math.max(end(p1), end(p2), end(p3), end(board));
const fin = (frames) => (end(frames) === D ? frames : [...frames, pose(D, T())]);
const wait = (at) => [pose(0, T(), ease.linear), pose(at - 60, T(), ease.strike)];
export const act = {
  body: `<g data-part="board"><path class="f" style="--duo:.12" d="M12 3.6c4.8 0 8.5 3.3 8.5 7.6 0 2.5-1.9 3.9-4.1 3.9-1.4 0-2.3.6-2.3 1.8 0 .8.6 1.1.6 1.8 0 1.1-1 1.7-2.6 1.7-4.8 0-8.5-3.8-8.5-8.6S7.2 3.6 12 3.6Z"/><g data-part="p1"><circle class="s" cx="8" cy="12" r="1.35"/></g><g data-part="p2"><circle class="s" cx="10" cy="8" r="1.35"/></g><g data-part="p3"><circle class="s" cx="14.4" cy="7.6" r="1.35"/></g></g><circle class="ac" data-part="glint" opacity="0" cx="14.4" cy="7.6" r="2.8" style="stroke-width:calc(var(--sw) * .45)"/>`,
  study: motion(D, 'The palette is lifted on its thumb and each paint is dabbed in turn.', ['Lift', 'Dab', 'Settle'], [
    actor('board', '16.5px 16.8px', [
      pose(0, T(), ease.smooth),
      pose(160, T({ y: -0.6, r: -5 }), ease.linear),
      ...fin(board),
    ]),
    actor('p1', '8px 12px', [...wait(180), ...fin(p1)]),
    actor('p2', '10px 8px', [...wait(260), ...fin(p2)]),
    actor('p3', '14.4px 7.6px', [...wait(340), ...fin(p3)]),
    actor('glint', '14.4px 7.6px', [
      light(0, 0, 'scale(.9)'), light(330, 0, 'scale(.9)', ease.settle),
      light(370, 0.6, 'scale(1)', ease.smooth), light(580, 0, 'scale(1.35)'), light(D, 0, 'scale(.9)'),
    ]),
  ]),
  shape: 'Palette 16.9 × 16.8, tinted .12, its thumb notch at the lower right; three paint beads r1.35 in an arc on the upper left. Motion (study): the board tips back 5° about its notch and rises .6 on the object spring; the paints are dabbed in turn (flattened .78, widened 1.12) and spring back on the part spring; a glint opens at the last.',
};
