// turn: a ring turns to a value, clicking through its detents; taken, it turns one detent and back,
// a shutter. Verb: take. Invariant: the ring turns about its own centre and nothing else moves; a value
// is an angle. Causal parts: the ring (the glass never turns). Forbidden: a scrape (a ring turns clean);
// a click between detents.
import { mechanism, detent } from '../mechanism.mjs';

export const turn = mechanism('turn', {
  mode: 'held',
  caption: 'The ring turns to the value, clicking at every eighth of a turn; taken, it clicks round one and back.',
  stages: ['Grip', 'Turn', 'Click'],
  slots: { ring: 'actor', lamp: 'lamp' },
  spring: 'part',                      // a light ring: it overshoots a little past a detent and settles
  held: {
    drive: 'number',
    slot: 'ring',
    from: { r: -180 }, to: { r: 180 }, // the value's range is one whole turn
    detents: 8,                        // a click every 45°
    stagger: 0,
    wall: 0.3,
    impactFull: 2, scrapeFull: 3,
    tickMin: 0.1, tickGap: 40,
    step: 240,
    pulse: 600,                        // ms: an act (taken) turns it a detent round, and back at half of this
    pulseBy: 0.125,                    // one detent: an eighth of the turn
  },
  cues: [detent('ring', 0.3)],         // no scrape: a ring turns clean
  states: { taken: { hold: 'ring', pose: { r: 45 } } },
  reduced: ['lamp', 'sound'],
});
