import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { renderGadgetSvg, validateGadget, type GadgetSpec } from '@unlocalhosted/metalui/gadgets';
import stepRow from '../gadgets/step-row.gadget.json';
import { frameAt } from '../time';
import { mix, react, sweep } from '../motion';

/**
 * Shot 1, count-in (video bars 1-2). The kick plays alone under a drone; a bone step row counts it.
 *
 *   before bar 1   black: the pickup is silent
 *   each kick      one step lights, on the kick's own frame (a lamp has no mass, so it doesn't
 *                  anticipate); the lamps flare and settle back over the beat with the release spring
 *   the room       the plate is drawn in the room's light and its lamps over it at full strength,
 *                  so a lit step burns bright on a plate still in the dark
 *   first kick     the status lamp comes on: the row is live
 *   the drone      the room's light comes up from a glimmer to full across the two bars, and the camera
 *                  closes in at a constant rate; neither is an object, so neither springs
 *
 * The row is the library's own gadget renderer, drawn fresh each frame at that frame's pose.
 */
const spec = (() => {
  const v = validateGadget(stepRow);
  if (!v.ok) throw new Error(`step-row.gadget.json: ${v.problems.map((p) => p.message).join('; ')}`);
  return v.spec as GadgetSpec;
})();

const KICKS = [1, 2].flatMap((bar) => [1, 2, 3, 4].map((beat) => frameAt(bar, beat)));
const END = frameAt(3);

export function CountIn() {
  const frame = useCurrentFrame();
  const lit = KICKS.filter((k) => frame >= k).length;
  const last = KICKS[lit - 1];
  // The bloom of the latest kick: full on its frame, gone as the release spring settles.
  const bloom = last === undefined ? 0 : 1 - react(frame, last, 'release');
  // The drone: a glimmer when the power comes on, full light by the end of the shot.
  const light = lit === 0 ? 0 : mix(0.3, 1, sweep(frame, KICKS[0], END));
  const scale = mix(0.94, 1, sweep(frame, KICKS[0], END));

  const pose = { state: lit ? 'filling' : 'rest', value: lit, host: 'graphite' as const, tier: 'full' as const, size: 1560 };
  const room = renderGadgetSvg(spec, { ...pose, id: 'count-in' });
  const lamps = renderGadgetSvg(spec, { ...pose, id: 'count-in-light' });

  return (
    <AbsoluteFill data-mu-colorway="graphite" style={{ background: 'var(--mu-page-dark)', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'grid', transform: `scale(${scale})` }}>
        <div style={{ gridArea: '1 / 1', filter: `brightness(${light * (1 + 0.06 * bloom)})` }} dangerouslySetInnerHTML={{ __html: room }} />
        <div className="emissive" style={{ gridArea: '1 / 1', filter: `brightness(${1 + 0.2 * bloom})` }} dangerouslySetInnerHTML={{ __html: lamps }} />
      </div>
    </AbsoluteFill>
  );
}
