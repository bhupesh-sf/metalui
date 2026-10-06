import { actor, ease, end, light, motion, pose, spring, T } from '../motion.mjs';

/* ── SIDEBAR / the rail is slid shut and springs back open ────
 * Verb, object   show or hide the sidebar. The window is the app; the divider is the rail's
 *                edge, and the two rows are what the rail holds.
 * Invariant      a window with a rail down its left side; the window never moves, the divider
 *                only slides along the window's width and stays upright.
 * Causal parts   cause: the divider, slid shut toward the window's edge. Receiver: the rows,
 *                which fold away (fade, .9 left) as it passes over them. Payoff: the divider
 *                springs back open past its seat and the rows come back behind it.
 * Neighbours     not Layout (panels in a grid), not Board (no rail), not Calendar (rings on top,
 *                a grid of days), not Document (a page).
 * Forbidden      the window sliding, a bounce, a flicker of the rows.
 *
 *    0ms  rest
 *  120ms  the rows fold away (fade, .9 left)
 *  240ms  the divider is slid shut, 3.6 left
 *  330ms  let go: it springs back open on the part spring, past its seat
 *  420ms  the rows come back behind it
 *  ~900ms exact rest
 * ────────────────────────────────────────────────────────── */
const open = spring(330, { x: -3.6 }, {}, 'part');
const D = Math.max(end(open), 760);
const fin = (frames) => (end(frames) === D ? frames : [...frames, pose(D, T())]);
export const act = {
  body: `<path class="f" style="--duo:.08" d="M5.9 5h12.2a2.4 2.4 0 0 1 2.4 2.4v9.2a2.4 2.4 0 0 1-2.4 2.4H5.9a2.4 2.4 0 0 1-2.4-2.4V7.4A2.4 2.4 0 0 1 5.9 5Z"/><g data-part="divider"><path d="M10 5v14"/></g><g data-part="rows"><path d="M5.8 8.8h1.6M5.8 11.6h1.6"/></g>`,
  study: motion(D, 'The rail\'s edge is slid shut over its rows and springs back open; the rows come back behind it.', ['Slide shut', 'Let go', 'Reopen'], [
    actor('divider', '10px 12px', [
      pose(0, T(), ease.smooth),
      pose(240, T({ x: -3.6 }), ease.linear),
      ...fin(open),
    ]),
    actor('rows', '6.6px 10.2px', [
      light(0, 1, T(), ease.smooth), light(120, 0, T({ x: -0.9 }), ease.linear),
      light(420, 0, T({ x: -0.9 }), ease.settle), light(600, 1, T()), light(D, 1, T()),
    ]),
  ]),
  shape: 'A window 17 × 14 r2.4, tinted .08, a divider standing on its top and bottom edges at 10, and two short rows in the rail (1.6 long at 5.8, on 8.8 and 11.6). Motion (study): the rows fold away as the divider is slid 3.6 toward the window\'s left edge; let go, it springs back open past its seat on the part spring and the rows come back behind it.',
};
