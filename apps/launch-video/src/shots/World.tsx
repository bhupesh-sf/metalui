import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { react } from '../motion';
import { FPS, frameAt } from '../time';
import { Camera, Drop, Grade, LookProvider, Table, cameraAt, mixLook, punch, useLook, type Impact, type Pose } from '../film/stage';
import { END, HEAVY, HOPS, K, PIECES } from './Opener';
import { FOUNDATION_PIECES, FOUNDATIONS_AT } from './Foundations';
import { ASSEMBLE, CLICK, PART_PIECES, PARTS_AT, fogAt, pointerAt } from './Parts';
import { IconAct } from '../film/parts';

/* ─────────────────────────────────────────────────────────
 * THE OPENING (video bars 1-4): one table, one camera
 *
 *   bars 1-2   the opener: a sunrise on a lone key, then the kit rains down (Opener.tsx)
 *   3.90s      as the last jump settles, the camera whips across the table to the right
 *   4.05s      bar 3: it arrives as the arcade readout slams down; the foundations land one per
 *              kick, each the component it shapes, named (Foundations.tsx)
 *   bars 3-4   the camera closes in slowly on them in full sun
 * ───────────────────────────────────────────────────────── */

const FX = FOUNDATIONS_AT.x;
const PX = PARTS_AT.x;
const B = (bar: number, beat: number) => frameAt(bar, beat);
const START: Pose = { x: 0, y: 70, z: 1150, tilt: 34, orbit: -16 }; // the key and "Introducing" under it
const MOVES = [
  { at: K[1] - 16, frames: 56, pose: { x: 0, y: -40, z: 640, orbit: -12 } },
  { at: K[3] - 16, frames: 64, pose: { x: 0, y: 90, z: 200, tilt: 40, orbit: -7 } },
  { at: K[5] - 16, frames: 70, pose: { x: 0, y: 140, z: 60, tilt: 44, orbit: -2 } },
  { at: K[7] - 12, frames: END - K[7] - 6, pose: { x: 20, y: 150, z: 90, tilt: 47, orbit: 3 } },
  // The whip: across the table in 16 frames, arriving on the downbeat of bar 3.
  { at: END - 16, frames: 16, pose: { x: FX, y: 260, z: -120, tilt: 42, orbit: 0 } },
  { at: END + 2, frames: frameAt(5) - END - 2 - 16, pose: { x: FX + 20, y: 280, z: -10, tilt: 40, orbit: -3 } },
  // The second whip: on to the parts, arriving on the downbeat of bar 5.
  { at: frameAt(5) - 16, frames: 16, pose: { x: PX, y: 50, z: 380, tilt: 40, orbit: 2 } },
  // Closer as the parts become one, then slowly in on the button through the dropout.
  { at: B(6, 1), frames: ASSEMBLE - B(6, 1), pose: { x: PX, y: 40, z: 520, tilt: 38, orbit: 0 } },
  { at: B(7, 1), frames: B(9, 1) - B(7, 1), pose: { x: PX + 40, y: 30, z: 860, tilt: 33, orbit: -4 } },
];

// The foundations hop with their heavy neighbours, like the kit does.
const F_HEAVY = FOUNDATION_PIECES.filter((p) => p.fall === 'heavy');
const F_HOPS = Object.fromEntries(
  FOUNDATION_PIECES.map((p) => [
    p.id,
    F_HEAVY.filter((h) => h !== p && p.at < h.at && Math.hypot(h.x - p.x, h.y - p.y) < 520).map((h) => ({ at: h.at, height: 12 + 20 * (1 - Math.hypot(h.x - p.x, h.y - p.y) / 520), frames: 13 })),
  ]),
);

// Every landing ripples the grid, the harder the thing the bigger the wave; the key's press on kick 1
// sends the first one.
const WEIGHT = { heavy: 1, key: 0.8, light: 0.5 } as const;
const IMPACTS: Impact[] = [
  { x: 0, y: 0, at: K[0], strength: 0.8 },
  ...PIECES.filter((p) => p.at !== null).map((p) => ({ x: p.x, y: p.y, at: p.at!, strength: p.id === 'badge' ? 1.6 : p.id.startsWith('bit') ? 0.3 : WEIGHT[p.fall] })),
  ...FOUNDATION_PIECES.map((p) => ({ x: p.x, y: p.y, at: p.at, strength: WEIGHT[p.fall] })),
  ...PART_PIECES.filter((p) => p.at !== null).map((p) => ({ x: p.x, y: p.y, at: p.at!, strength: WEIGHT[p.fall] })),
  { x: PX, y: 0, at: ASSEMBLE, strength: 1.4 },
  { x: PX, y: 0, at: CLICK, strength: 0.6 },
];
// The pumping synths of bars 5-6: the table breathes in on every kick and out over the beat.
const PUMP = [5, 6].flatMap((bar) => [1, 2, 3, 4].map((beat) => frameAt(bar, beat)));
// Dots only where the camera looks: around the kit, and around the foundations.
const AREAS = [
  { x: 0, y: 40, w: 3000, h: 2000 },
  { x: FX, y: 220, w: 2600, h: 1900 },
  { x: PX, y: 0, w: 2400, h: 1600 },
];

export function World() {
  const frame = useCurrentFrame();
  const pose = cameraAt(frame, START, MOVES);
  const breathe = punch(frame, PUMP);
  const pointer = pointerAt(frame);
  const fog = fogAt(frame);
  const jolt = punch(frame, [...HEAVY.map((h) => h.at!), ...F_HEAVY.map((h) => h.at)]) + 1.2 * punch(frame, [K[4]]) + 1.4 * punch(frame, [K[7]]) + punch(frame, [ASSEMBLE]) - 0.9 * breathe;
  // The sunrise: dawn on the lone key, full sun once the kit is down, and full sun from bar 3 on.
  const landed = K.filter((k) => frame >= k).length;
  const sun = frame >= END ? 1 : Math.min(1, landed / 8 + (frame >= K[7] ? 0.2 * (1 - react(frame, K[7], 'surface')) : 0));
  const base = useLook();
  const look = base.dawn ? mixLook(base.dawn, base, sun) : base;
  const power = Math.min(1, 0.5 + 0.5 * sun + 0.05 * jolt);

  return (
    <LookProvider value={look}>
      <AbsoluteFill data-mu-colorway="bone" style={{ background: look.sky }}>
        <Camera pose={pose} jolt={jolt}>
          <Table light={{ x: pose.x, y: 0 }} power={power} frame={frame} fps={FPS} impacts={IMPACTS} areas={AREAS}>
            {PIECES.map((p) => (
              <Drop key={p.id} frame={frame} at={p.at} x={p.x} y={p.y} fall={p.fall} zoom={p.zoom} size={p.size} turn={p.turn} spin={p.spin} hops={HOPS[p.id]}>
                {p.draw(frame)}
              </Drop>
            ))}
            {FOUNDATION_PIECES.map((p) => (
              <Drop key={p.id} frame={frame} at={p.at} x={p.x} y={p.y} fall={p.fall} zoom={p.zoom} size={p.size} hops={F_HOPS[p.id]}>
                {p.draw(frame)}
              </Drop>
            ))}
            {/* The dropout: the canvas fogs out around the button, on the table, so the button and the
                pointer stay clear above it. */}
            {fog > 0 && <div style={{ position: 'absolute', left: PX - 2600, top: -1900, width: 5200, height: 3800, transform: 'translateZ(0.5px)', background: `radial-gradient(420px 380px at 2600px 1900px, rgba(255,255,255,0) 0%, rgba(255,255,255,${fog}) 100%)` }} />}
            {PART_PIECES.map((p) => (
              <Drop key={p.id} frame={frame} at={p.at} x={p.x} y={p.y} fall={p.fall} zoom={p.zoom} size={p.size} move={p.move} from={p.from} until={p.until} hops={p.hops}>
                {p.draw(frame)}
              </Drop>
            ))}
            {pointer.visible && (
              // The select pointer, hovering over the table, playing its act into the click.
              // (Positioned outside the zoom: zoom scales an element's own left and top too.)
              <div style={{ position: 'absolute', left: pointer.x, top: pointer.y, transform: 'translateZ(90px)' }}>
                {/* White with a dark edge, like a real cursor: it reads over the white canvas and the dark cap. */}
                <div style={{ zoom: 5, color: '#fff', filter: 'drop-shadow(0 0 0.6px #111) drop-shadow(0 0 0.6px #111) drop-shadow(0 4px 4px rgba(0,0,0,.25))' }}>
                  <IconAct name="select" t={pointer.act} size={28} />
                </div>
              </div>
            )}
          </Table>
        </Camera>
        <Grade power={power} />
      </AbsoluteFill>
    </LookProvider>
  );
}
