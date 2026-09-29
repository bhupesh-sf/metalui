import { Lasso, SelectionFrame } from '@unlocalhosted/metalui';
import { renderGadgetSvg, validateGadget, type GadgetSpec } from '@unlocalhosted/metalui/gadgets';
import counterSpec from '../../../../packages/metalui/src/gadgets/fixtures/counter-drum.gadget.json';
import needleSpec from '../../../../packages/metalui/src/gadgets/fixtures/needle-gauge.gadget.json';
import cellsSpec from '../../../../packages/metalui/src/gadgets/fixtures/cell-grid.gadget.json';
import badgeSpec from '../../../../packages/metalui/src/gadgets/fixtures/glass-badge.gadget.json';
import edit from '../../music/edit.json';
import cues from '../cues.generated.json';
import { FPS, frameAt, meter } from '../time';
import { sweep } from '../motion';
import type { Fall } from '../film/stage';
import { DROP1_AT } from './Components';

/* ─────────────────────────────────────────────────────────
 * SHOTS 8-9 · THE BUILD, THEN THE GAP (video bars 17-24), on the next part of the table
 *
 *   bar 17     four of the library's gadgets land, two a kick, and each measures the build:
 *                the counter drum counts every hit of the snare roll (it speeds up as the
 *                roll doubles every two bars), the needle gauge reads the edit's loudness,
 *                the cell grid fills as the build goes on, the glass badge glows with the riser
 *   bars 17-22 the camera closes in slowly; the roll's last bars shake it a little
 *   bars 23-24 the gap: a lasso draws a box round the whole set as the roll peaks, counting what it
 *              will select; on the silent last beat everything holds still
 *   bar 25     the box snaps shut into a selection round the set: the drop
 * ───────────────────────────────────────────────────────── */

export const BUILD_AT = { x: DROP1_AT.x + 3400, y: 0 };
const X = BUILD_AT.x;
const B = (bar: number, beat: number, step = 0) => frameAt(bar, beat, step);
export const BUILD = B(17, 1);
export const SILENT = B(24, 4);
export const DROP2 = B(25, 1);

const spec = (s: unknown) => {
  const v = validateGadget(s);
  if (!v.ok) throw new Error(v.problems.map((p) => p.message).join('; '));
  return v.spec as GadgetSpec;
};
const COUNTER = spec(counterSpec);
const NEEDLE = spec(needleSpec);
const CELLS = spec(cellsSpec);
const BADGE = spec(badgeSpec);

/** Every hit of the build's snare roll, in frames: the same rule the music pipeline plays it by. */
const ROLL_HITS = (() => {
  const piece = edit.pieces.find((p) => 'times' in p) as unknown as { layers: { type: string; beats: number[]; rate: number[] }[] };
  const run = cues.runs.find((r) => r.times > 1)!;
  const roll = piece.layers.find((l) => l.type === 'roll')!;
  const [r0, r1] = roll.rate;
  const levels = Array.from({ length: Math.log2(r1 / r0) + 1 }, (_, k) => r0 * 2 ** k);
  const span = roll.beats[1] - roll.beats[0];
  const per = span / levels.length;
  const hits: number[] = [];
  levels.forEach((rate, k) => {
    for (let j = 0; j < Math.round(per * rate); j++) hits.push(Math.round((run.videoStart + (roll.beats[0] + k * per + j / rate) * cues.beatSeconds) * FPS));
  });
  return hits;
})();

export interface BuildPiece {
  id: string;
  name: string;
  at: number;
  fall: Fall;
  x: number;
  y: number;
  zoom: number;
  size: [number, number];
  svg: (frame: number) => string;
}

const draw = (g: GadgetSpec, id: string, state: string | undefined, value: number) => renderGadgetSvg(g, { state, value, host: 'bone', tier: 'full', size: 400, id });

export const BUILD_PIECES: BuildPiece[] = [
  { id: 'g-counter', name: 'Counter drum', at: B(17, 1), fall: 'heavy', x: X - 430, y: -210, zoom: 1.05, size: [360, 360], svg: (f) => draw(COUNTER, 'g-counter', 'rest', ROLL_HITS.filter((h) => f >= h).length) },
  { id: 'g-needle', name: 'Needle gauge', at: B(17, 1), fall: 'heavy', x: X + 430, y: -210, zoom: 1.05, size: [360, 360], svg: (f) => draw(NEEDLE, 'g-needle', undefined, 40 * Math.min(1, meter('loud', f) * 1.05)) },
  { id: 'g-cells', name: 'Cell grid', at: B(17, 2), fall: 'heavy', x: X - 430, y: 260, zoom: 1.05, size: [360, 360], svg: (f) => draw(CELLS, 'g-cells', undefined, sweep(f, B(17, 2), SILENT)) },
  { id: 'g-badge', name: 'Glass badge', at: B(17, 2), fall: 'heavy', x: X + 430, y: 260, zoom: 1.05, size: [360, 360], svg: (f) => draw(BADGE, 'g-badge', undefined, 0.08 + 0.92 * sweep(f, B(21, 1), SILENT)) },
];

/** How hard the roll is going: 0 until its last level, 1 at its peak (for a little camera shake). */
export const rollIntensity = (f: number) => sweep(f, B(21, 1), SILENT) ** 2;

/** The set's box in table units, for the lasso and the selection it becomes. */
const BOX = { x: X - 720, y: -480, w: 1440, h: 1000 };

/** The gap: the lasso grows over the set through bars 23-24, then snaps into a selection on the drop. */
export function Selection({ frame }: { frame: number }) {
  if (frame < B(23, 1)) return null;
  if (frame >= DROP2) {
    return (
      <div style={{ position: 'absolute', left: BOX.x, top: BOX.y }}>
        <div style={{ position: 'relative', width: BOX.w / 2.4, height: BOX.h / 2.4, zoom: 2.4 }}>
          <SelectionFrame state="selected" radius={28} readout={false} entrance={false} />
        </div>
      </div>
    );
  }
  const t = Math.min(1, (Math.min(frame, SILENT) - B(23, 1)) / (SILENT - B(23, 1)));
  const e = 1 - (1 - t) ** 2;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, zoom: 2.4 }}>
      <Lasso rect={{ x: BOX.x / 2.4, y: BOX.y / 2.4, width: (BOX.w * e) / 2.4, height: (BOX.h * e) / 2.4 }} count={Math.round(4 * e)} />
    </div>
  );
}
