// dip: a nib dips into its well and springs back up, tapping the well's rim. Verb: make. Invariant: the
// nib moves along one line into the well and back to where it was. Causal parts: the nib (the well is a
// cut and never moves). Forbidden: a tap before the nib reaches the ink.
import { T, spring, pose, actor, ease, strike, mechanism } from '../mechanism.mjs';

const DEPTH = 10;                                     // units into the well
const DOWN = 110;                                     // ms: in the ink by 110, on the accelerate curve
const nib = [pose(0, T(), ease.accelerate), pose(DOWN, T({ y: DEPTH }), ease.strike), ...spring(DOWN, { y: DEPTH }, {}, 'release').slice(1)];

export const dip = mechanism('dip', {
  mode: 'momentary',
  caption: 'The nib dips into its well and springs back up, with a soft tap on the well.',
  stages: ['Dip', 'Touch', 'Lift'],
  slots: { nib: 'actor', well: 'cut', lamp: 'lamp' },
  spring: 'release',
  duration: nib[nib.length - 1].at,
  tracks: [actor('nib', 'tip', nib)],
  cues: [strike(DOWN, 'well', { level: 0.3 })],       // a soft tap, in the well's own material
  states: { writing: { hold: 'nib', pose: { y: 6 } } },
  reduced: ['lamp', 'sound'],
});
