import { frameAt } from '../time';
import type { Pose } from '../film/stage';
import { BUILD_AT } from './Build';
import { DROP1_AT } from './Components';
import { FOUNDATIONS_AT } from './Foundations';
import { PARTS_AT } from './Parts';

/* ─────────────────────────────────────────────────────────
 * SHOT 10 · THE FINAL CHORUS: A TOUR OF EVERYTHING (video bars 25-28)
 *
 *   bar 25.1   the selection snaps shut round the x-ray bench: the drop, the loudest bars of the film
 *   each bar   the camera travels back across the whole table, one place a bar, landing on the
 *              downbeat: the x-ray, the objects, the components, the foundations, and on the
 *              downbeat of bar 29 the opener's kit, where the install happens
 *   downbeats  everything on the table jumps together, all of it at once, and the grid ripples
 *              where the camera lands; a smaller jump on every beat 3
 * ───────────────────────────────────────────────────────── */

const B = (bar: number, beat: number) => frameAt(bar, beat);

/** Where the camera lands on each downbeat of the tour. */
export const TOUR: { bar: number; at: { x: number; y: number } }[] = [
  { bar: 26, at: { x: DROP1_AT.x, y: 0 } },
  { bar: 27, at: { x: PARTS_AT.x, y: 0 } },
  { bar: 28, at: { x: FOUNDATIONS_AT.x, y: 220 } },
  { bar: 29, at: { x: 0, y: 160 } },
];

/** The tour's camera: one move a bar, easing to land on the next downbeat, the orbit swinging. */
export const TOUR_MOVES: { at: number; frames: number; pose: Partial<Pose> }[] = TOUR.map((stop, i) => ({
  at: B(stop.bar - 1, 1) + 6,
  frames: B(stop.bar, 1) - B(stop.bar - 1, 1) - 6,
  pose: { x: stop.at.x, y: stop.at.y, z: 60, tilt: 44, orbit: i % 2 ? -6 : 6 },
}));

/** Everything jumps on the chorus: big on each downbeat, small on each beat 3. */
export const DANCE = [25, 26, 27, 28].flatMap((bar) => [
  { at: B(bar, 1), height: 46, frames: 18 },
  { at: B(bar, 3), height: 22, frames: 12 },
]);

/** The grid ripples where the camera is on each downbeat of the tour. */
export const TOUR_IMPACTS = [{ x: BUILD_AT.x, y: 0, at: B(25, 1), strength: 2.4 }, ...TOUR.slice(0, 3).map((s) => ({ x: s.at.x, y: s.at.y, at: B(s.bar, 1), strength: 1.6 }))];
