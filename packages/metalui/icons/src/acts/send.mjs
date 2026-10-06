import { actor, ease, end, light, motion, pose, spring, T } from '../motion.mjs';

/* ── SEND / the arrow pushes off the disc's floor and launches ─
 * Verb, object   send this message. The disc is the key you send from; the arrow is what goes.
 * Invariant      an upright arrow on its disc, pointing up; it only ever travels along its own
 *                axis (it never tilts, never turns down), and it never touches the rim.
 * Causal parts   cause: the arrow, crouching on its tail and pushing off. Receiver: the disc,
 *                whose floor gives under the push and springs back. Payoff: two puffs of air
 *                under the tail as it launches.
 * Neighbours     not Upload (no tray, nothing reached), not Share (no open tray, the arrow
 *                never leaves the key), not Stop (Stop's square sits where the arrow stands).
 * Forbidden      a paper plane flying off, a whole-key bounce, a pulse.
 *
 *    0ms  rest
 *  150ms  the arrow crouches 1.2 on its tail, squashed .88; the disc floor gives (.96 tall)
 *  230ms  push-off: the arrow strikes 1.6 up, stretched 1.04 (its head stays .65 clear of the rim);
 *         the puffs open under the tail
 *  230ms+ the arrow comes back down on the part spring, the disc on the object spring
 *  ~850ms exact rest
 * ────────────────────────────────────────────────────────── */
const arrow = spring(230, { y: -1.6, sy: 1.04 }, {}, 'part');
const disc = spring(235, { sx: 1.02, sy: 0.96 }, {}, 'object');
const D = Math.max(end(arrow), end(disc));
const fin = (frames) => (end(frames) === D ? frames : [...frames, pose(D, T())]);
export const act = {
  body: `<g data-part="disc"><path class="f" style="--duo:.12" d="M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 1 1 0-17Z"/></g><g data-part="arrow"><path d="M12 7.8v8.4M8.4 11.4 12 7.8l3.6 3.6"/></g><path class="ac" data-part="puff" opacity="0" d="M10.6 18.2l-.7.8M13.4 18.2l.7.8" style="stroke-width:calc(var(--sw) * .7)"/>`,
  study: motion(D, 'The arrow crouches on the disc, pushes off its floor and launches; the floor springs back.', ['Crouch', 'Launch', 'Land'], [
    actor('arrow', '12px 16.2px', [
      pose(0, T(), ease.accelerate),
      pose(150, T({ y: 1.2, sy: 0.88 }), ease.strike),
      ...fin(arrow),
    ]),
    actor('disc', '12px 20.5px', [
      pose(0, T(), ease.accelerate),
      pose(150, T({ sx: 1.02, sy: 0.96 }), ease.linear),
      ...fin(disc),
    ]),
    actor('puff', '12px 18.2px', [
      light(0, 0, 'scale(.5)'), light(200, 0, 'scale(.5)', ease.settle),
      light(250, 0.9, 'scale(1)', ease.smooth), light(470, 0, 'scale(1.5)'), light(D, 0, 'scale(.5)'),
    ]),
  ]),
  shape: 'Disc r8.5, tinted .12, with an upright arrow 8.4 long (head 3.6 each way) on its centre, so Send and Stop are one key that morphs by its mark. Motion (study): the arrow crouches 1.2 on its tail and pushes off the disc floor, striking 1.6 up and stretching 1.04 while its head stays clear of the rim; the floor gives .96 and springs back on the object spring; two puffs open under the tail.',
};
