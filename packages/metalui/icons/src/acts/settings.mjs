import { actor, ease, end, light, motion, pose, spring, T } from '../motion.mjs';

/* ── SETTINGS / the gear is turned a notch and springs back ───
 * Verb, object   change how this works. The gear is the mechanism inside; the hub is its axle.
 * Invariant      a six-tooth gear on its hub, centred; it only turns about the hub (at most 30°,
 *                half a tooth, so it never reads as a free spin) and never leaves its axle.
 * Causal parts   cause: the gear, wound back and turned forward against a detent. Receiver: the
 *                hub, the axle, which takes the turn and gives (.9) at the catch. Payoff: a click
 *                outside the top tooth where it meets the detent, half a tooth round.
 * Neighbours     not Sun (rays are separate strokes, no hub), not Flower (petals, no teeth), not
 *                Filter (a funnel), not Sliders (Filter and Sort do the narrowing and ordering).
 * Forbidden      a free spin, a loop, a whole-glyph wobble.
 *
 *    0ms  rest
 *  140ms  wound back 8° (anticlockwise)
 *  280ms  turned forward to 30° and caught by the detent; the hub gives .9; the click opens
 *  280ms+ the gear springs back home on the hinge spring, the hub on the part spring
 *  ~900ms exact rest
 * ────────────────────────────────────────────────────────── */
// The outline: five points a tooth (its tip's middle and shoulders at RO, root shoulders at RI), joined by a
// Catmull-Rom curve so tips and roots are round and nothing is sharp; from the top, clockwise.
const RO = 8, RI = 6.1, TIP = 8, ROOT = 13; // half-widths in degrees
const f = (n) => +n.toFixed(2);
const at = (deg, r) => [12 + r * Math.sin((deg * Math.PI) / 180), 12 - r * Math.cos((deg * Math.PI) / 180)];
const pts = Array.from({ length: 6 }, (_, k) => k * 60).flatMap((c) => [at(c, RO), at(c + TIP, RO), at(c + 30 - ROOT, RI), at(c + 30 + ROOT, RI), at(c + 60 - TIP, RO)]);
const n = pts.length;
const gear = `M${f(pts[0][0])} ${f(pts[0][1])}` + pts.map((p1, i) => {
  const p0 = pts[(i - 1 + n) % n], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
  const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
  return `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
}).join('') + 'Z';
const turn = spring(280, { r: 30 }, {}, 'hinge', { still: 0.6 });
const hub = spring(290, { sx: 0.9, sy: 0.9 }, {}, 'part');
const D = Math.max(end(turn), end(hub));
const fin = (frames) => (end(frames) === D ? frames : [...frames, pose(D, T())]);
export const act = {
  body: `<g data-part="gear"><path class="f" style="--duo:.12" d="${gear}"/></g><g data-part="hub"><path d="M12 9.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 1 1 0-5Z"/></g><path class="ac" data-part="click" opacity="0" d="M15.95 3.14l.32-.73M17.7 4.15l.47-.64" style="stroke-width:calc(var(--sw) * .7)"/>`,
  study: motion(D, 'The gear is wound back and turned forward a notch against a detent, clicks, and springs back home.', ['Wind back', 'Turn', 'Return'], [
    actor('gear', '12px 12px', [
      pose(0, T(), ease.smooth),
      pose(140, T({ r: -8 }), ease.strike),
      ...fin(turn),
    ]),
    actor('hub', '12px 12px', [
      pose(0, T(), ease.linear),
      pose(270, T(), ease.strike),
      ...fin(hub),
    ]),
    actor('click', '16.9px 3.3px', [
      light(0, 0, 'scale(.6)'), light(260, 0, 'scale(.6)', ease.settle),
      light(300, 0.85, 'scale(1)', ease.smooth), light(500, 0, 'scale(1.3)'), light(D, 0, 'scale(.6)'),
    ]),
  ]),
  shape: 'A six-tooth gear, tips at r8 and roots at r6.1, five points a tooth joined by a Catmull-Rom curve so tips and roots are round, tinted .12, on a 2.5 hub ring. Motion (study): wound back 8°, turned forward to 30° (half a tooth) against a detent and sprung back home on the hinge spring; the hub gives .9 at the catch on the part spring; a click opens where the top tooth meets the detent.',
};
