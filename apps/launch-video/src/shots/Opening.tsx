import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { frameAt } from '../time';
import { react } from '../motion';
import { Camera, Drop, Grade, LookProvider, Motes, Ring, Table, cameraAt, mixLook, punch, useLook, type Pose } from '../film/stage';
import { END, HEAVY, HOPS, K, PIECES } from './Opener';
import { FOUNDATION_PIECES, FOUNDATIONS_AT } from './Foundations';

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
const START: Pose = { x: 0, y: 0, z: 1150, tilt: 34, orbit: -16 };
const MOVES = [
  { at: K[1] - 16, frames: 56, pose: { x: 0, y: -40, z: 640, orbit: -12 } },
  { at: K[3] - 16, frames: 64, pose: { x: 0, y: 0, z: 240, tilt: 40, orbit: -7 } },
  { at: K[5] - 16, frames: 70, pose: { x: 0, y: 0, z: 40, tilt: 44, orbit: -2 } },
  { at: K[7] - 12, frames: END - K[7] - 6, pose: { x: 20, y: 30, z: 110, tilt: 47, orbit: 3 } },
  // The whip: across the table in 16 frames, arriving on the downbeat of bar 3.
  { at: END - 16, frames: 16, pose: { x: FX, y: 260, z: -120, tilt: 42, orbit: 0 } },
  { at: END + 2, frames: frameAt(5) - END - 2, pose: { x: FX + 20, y: 280, z: -10, tilt: 40, orbit: -3 } },
];

// The foundations hop with their heavy neighbours, like the kit does.
const F_HEAVY = FOUNDATION_PIECES.filter((p) => p.fall === 'heavy');
const F_HOPS = Object.fromEntries(
  FOUNDATION_PIECES.map((p) => [
    p.id,
    F_HEAVY.filter((h) => h !== p && p.at < h.at && Math.hypot(h.x - p.x, h.y - p.y) < 520).map((h) => ({ at: h.at, height: 12 + 20 * (1 - Math.hypot(h.x - p.x, h.y - p.y) / 520), frames: 13 })),
  ]),
);

export function Opening() {
  const frame = useCurrentFrame();
  const pose = cameraAt(frame, START, MOVES);
  const jolt = punch(frame, [...HEAVY.map((h) => h.at!), ...F_HEAVY.map((h) => h.at)]) + 1.4 * punch(frame, [K[7]]);
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
          <Table light={{ x: pose.x, y: 0 }} power={power}>
            <Ring frame={frame} at={K[0]} x={0} y={0} />
            <Ring frame={frame} at={K[7]} x={230} y={90} reach={1500} colour="rgba(255,244,214,.95)" />
            <Ring frame={frame} at={END} x={FX} y={-170} reach={1300} colour="rgba(255,244,214,.9)" />
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
          </Table>
        </Camera>
        <Motes frame={frame} beam={1 - 0.5 * sun} />
        <Grade power={power} />
      </AbsoluteFill>
    </LookProvider>
  );
}
