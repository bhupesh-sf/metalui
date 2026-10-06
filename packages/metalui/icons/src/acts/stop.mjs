import { actor, ease, end, light, motion, pose, spring, T } from '../motion.mjs';

/* ── STOP / the block is set down and everything halts ───────
 * Verb, object   stop what is running (a reply, a recording). The disc is the key; the square
 *                is the stop block, set down hard in its middle.
 * Invariant      a level square on the centre of its disc; it never turns (turned it would be a
 *                diamond), never leaves the disc, and the disc never moves off its place.
 * Causal parts   cause: the block, lifted and brought down onto its seat. Receiver: the block
 *                itself, squashing along the blow and widening; then the disc, heavier, a beat
 *                later. Payoff: a ring that closes in on the block: whatever was moving has
 *                come to the centre and stopped.
 * Neighbours     not Send (no arrow, nothing leaves), not Rectangle (it sits on a key), not
 *                Pause (one block, not two bars), not Record (a square, not a dot).
 * Forbidden      axial shrink as the action, a spin, a flashing key.
 *
 *    0ms  rest
 *  140ms  the block is lifted 1.4
 *  220ms  set down hard: .4 past its seat, squashed .88 tall and 1.08 wide
 *  240ms  the disc takes the blow a beat later (.97 tall, 1.02 wide)
 *  230ms  a faint ring closes in round the block, fading by 450
 *  220ms+ the block recovers on the part spring, the disc on the object spring
 *  ~850ms exact rest
 * ────────────────────────────────────────────────────────── */
const block = spring(220, { y: 0.4, sx: 1.08, sy: 0.88 }, {}, 'part');
const disc = spring(240, { sx: 1.02, sy: 0.97 }, {}, 'object');
const D = Math.max(end(block), end(disc));
const fin = (frames) => (end(frames) === D ? frames : [...frames, pose(D, T())]);
export const act = {
  body: `<g data-part="disc"><path class="f" style="--duo:.12" d="M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 1 1 0-17Z"/></g><g data-part="block"><rect class="f" style="--duo:.24" x="8.6" y="8.6" width="6.8" height="6.8" rx="1.6"/></g><circle class="ac" data-part="halt" opacity="0" cx="12" cy="12" r="5.6" style="stroke-width:calc(var(--sw) * .5)"/>`,
  study: motion(D, 'The block is lifted and set down hard in the middle of the key; everything closes in on it and stops.', ['Lift', 'Set down', 'Halt'], [
    actor('block', '12px 15.4px', [
      pose(0, T(), ease.smooth),
      pose(140, T({ y: -1.4 }), ease.accelerate),
      ...fin(block),
    ]),
    actor('disc', '12px 20.5px', [
      pose(0, T(), ease.linear),
      pose(230, T(), ease.smooth),
      ...fin(disc),
    ]),
    actor('halt', '12px 12px', [
      light(0, 0, 'scale(1.1)'), light(210, 0, 'scale(1.1)', ease.settle),
      light(250, 0.6, 'scale(1)', ease.smooth), light(450, 0, 'scale(.8)'), light(D, 0, 'scale(1.1)'),
    ]),
  ]),
  shape: 'Disc r8.5, tinted .12 (Send\'s key), with a 6.8 square r1.6 tinted .24 on its centre, so Send and Stop morph by the mark alone. Motion (study): the block is lifted 1.4 and set down hard, .4 past its seat, squashing .88 and widening 1.08 on the part spring; the disc takes the blow a beat later on the object spring; a faint ring closes in round the block.',
};
