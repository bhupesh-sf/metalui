import { actor, ease, light, motion, pose, T } from '../motion.mjs';

/* ── BELL / it swings on its loop and the clapper strikes ─────
 * Verb, object   notify, get your attention. The bell hangs from its loop; the clapper inside
 *                is what makes the sound.
 * Invariant      a bell hanging from one point at its top; it only swings about that point (at
 *                most 10°, so its rim stays in the live area), and the clapper always hangs
 *                under its mouth.
 * Causal parts   cause: the bell, swung about its loop. Receiver: the clapper, heavier and free,
 *                lagging the swing and meeting the rim on the way back. Payoff: a sound arc on
 *                the side it strikes, then on the other.
 * Neighbours     not Alarm (no feet, no clock face), not Notification dot (a bell, not a badge),
 *                not Volume (no cone, no waves off a speaker).
 * Forbidden      a shake of the whole glyph, a free spin, a pulse.
 *
 *    0ms  rest
 *  120ms  swung 10° (clockwise) about the loop; the clapper lags at 4°
 *  260ms  back past rest to −8°; the clapper, still going the first way, meets the rim at 9°:
 *         the first arc opens on the right
 *  400ms  +6°, the clapper −7°: the second arc on the left
 *  520ms  −3.5°, 640ms +1.6°, 760ms −.6° (the hinge's ring-down)
 *  900ms  exact rest
 * ────────────────────────────────────────────────────────── */
const D = 900;
const swing = [[0, 0, ease.smooth], [120, 10, ease.smooth], [260, -8, ease.smooth], [400, 6, ease.smooth], [520, -3.5, ease.smooth], [640, 1.6, ease.smooth], [760, -0.6, ease.settle], [D, 0]];
const clap = [[0, 0, ease.smooth], [120, 4, ease.smooth], [260, 9, ease.strike], [400, -7, ease.strike], [520, 4, ease.smooth], [640, -2, ease.smooth], [780, 0.6, ease.settle], [D, 0]];
export const act = {
  body: `<g data-part="bell"><path class="f" style="--duo:.12" d="M12 4.6c3 0 5.3 2.5 5.3 5.5v3.3l1.5 3.1H5.2l1.5-3.1v-3.3c0-3 2.3-5.5 5.3-5.5Z"/><path d="M12 2.9v1.7"/></g><g data-part="clapper"><circle class="s" cx="12" cy="19" r="1.35"/></g><path class="ac" data-part="ring-r" opacity="0" d="M20.2 7.6a6.4 6.4 0 0 1 1 3.4" style="stroke-width:calc(var(--sw) * .7)"/><path class="ac" data-part="ring-l" opacity="0" d="M3.8 7.6a6.4 6.4 0 0 0-1 3.4" style="stroke-width:calc(var(--sw) * .7)"/>`,
  study: motion(D, 'The bell swings on its loop and the clapper, lagging, strikes the rim on each side.', ['Swing', 'Strike', 'Ring down'], [
    actor('bell', '12px 2.9px', swing.map(([at, r, e]) => pose(at, T({ r }), e))),
    actor('clapper', '12px 2.9px', clap.map(([at, r, e]) => pose(at, T({ r }), e))),
    actor('ring-r', '19px 9.3px', [
      light(0, 0, 'scale(.7)'), light(240, 0, 'scale(.7)', ease.settle),
      light(280, 0.9, 'scale(1)', ease.smooth), light(480, 0, 'scale(1.3)'), light(D, 0, 'scale(.7)'),
    ]),
    actor('ring-l', '5px 9.3px', [
      light(0, 0, 'scale(.7)'), light(380, 0, 'scale(.7)', ease.settle),
      light(420, 0.7, 'scale(1)', ease.smooth), light(620, 0, 'scale(1.3)'), light(D, 0, 'scale(.7)'),
    ]),
  ]),
  shape: 'Bell 10.6 wide at the shoulder, flaring to 13.6 at the rim (16.5), tinted .12, hung from a 1.7 loop at 12/2.9; a clapper bead r1.35 under its mouth. Motion (study): the bell swings about its loop 10°, −8°, 6° and rings down; the clapper lags, meets the rim on each return, and a sound arc opens on that side.',
};
