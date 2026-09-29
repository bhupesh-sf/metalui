import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Label } from '@unlocalhosted/metalui';
import { react } from '../motion';
import { FPS, frameAt } from '../time';
import { Camera, Drop, Grade, LOOKS, LookProvider, Table, cameraAt, mixLook, punch, useLook, type Impact, type Pose } from '../film/stage';
import { END, HEAVY, HOPS, K, PIECES } from './Opener';
import { FOUNDATION_PIECES, FOUNDATIONS_AT } from './Foundations';
import { ASSEMBLE, CLICK, PART_PIECES, PARTS_AT, fogAt, pointerAt } from './Parts';
import { IconAct } from '../film/parts';
import { COMPONENT_PIECES, ComponentsTitle, DROP1_AT, FILL, SET_AT, SLAM, raveOf, raveTheme } from './Components';
import { DROP1, DROP1_END, OBJECT_PIECES, ObjectsTitle } from './Objects';
import { BUILD_AT, COLLAPSE_AT, DROP2, SILENT, XRAY_LANDS, Xray, rollIntensity, xrayPointer } from './Build';
import { DANCE, FIRE_FRONT, TOUR_IMPACTS, TOUR_MOVES } from './Finale';
import { Address, COLLAPSE, FINAL_HIT, INSTALL, INSTALL_PIECES } from './Install';

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
  { at: B(7, 1), frames: B(9, 1) - B(7, 1) - 4, pose: { x: PX + 40, y: 30, z: 860, tilt: 33, orbit: -4 } },
  // The slam: back out fast as the button springs up and the library rains down around it.
  { at: SLAM - 4, frames: 18, pose: { x: PX, y: 10, z: 110, tilt: 44, orbit: 0 } },
  { at: B(10, 1), frames: FILL.swoosh - B(10, 1), pose: { x: PX + 10, y: 10, z: 150, tilt: 42, orbit: 3 } },
  // The fill's swoosh: away to drop 1, arriving on the downbeat of bar 13.
  { at: FILL.swoosh, frames: B(13, 1) - FILL.swoosh, pose: { x: DROP1_AT.x, y: 0, z: 200, tilt: 40, orbit: 0 } },
  // Drop 1: in hard on the slam, then round the set as the cards fly home.
  { at: DROP1 + 2, frames: 28, pose: { x: DROP1_AT.x, y: 0, z: 240, tilt: 44, orbit: -5 } },
  { at: B(14, 1), frames: B(17, 1) - B(14, 1) - 16, pose: { x: DROP1_AT.x + 20, y: 0, z: 300, tilt: 41, orbit: 6 } },
  // On to the build, then in slowly through eight bars of it.
  { at: B(17, 1) - 16, frames: 16, pose: { x: BUILD_AT.x, y: 30, z: 130, tilt: 42, orbit: -3 } },
  { at: B(17, 2), frames: B(21, 1) - B(17, 2), pose: { x: BUILD_AT.x, y: 70, z: 320, tilt: 40, orbit: 4 } },
  // The layers: up and back, to see the button come apart into a stack.
  { at: B(21, 1), frames: 24, pose: { x: BUILD_AT.x, y: -40, z: 110, tilt: 47, orbit: 9 } },
  // The stack slams down, and in again through the gap.
  { at: COLLAPSE_AT, frames: 10, pose: { x: BUILD_AT.x, y: 60, z: 300, tilt: 41, orbit: 4 } },
  { at: COLLAPSE_AT + 10, frames: SILENT - COLLAPSE_AT - 10, pose: { x: BUILD_AT.x, y: 70, z: 380, tilt: 40, orbit: 4 } },
  // The drop: the selection snaps shut and the camera kicks back.
  { at: DROP2, frames: 6, pose: { x: BUILD_AT.x, y: 20, z: 200, tilt: 44, orbit: 0 } },
  // The final chorus: back across the whole table, a place a bar, landing on the downbeats.
  ...TOUR_MOVES,
  // Install: the title and the tabs and field under it.
  { at: INSTALL + 4, frames: 30, pose: { x: 0, y: 430, z: 170, tilt: 42, orbit: -2 } },
  { at: COLLAPSE, frames: FINAL_HIT - COLLAPSE, pose: { x: 0, y: 310, z: 520, tilt: 40, orbit: 0 } },
  // The final hit: in on the title, and hold.
  { at: FINAL_HIT, frames: 40, pose: { x: 0, y: 330, z: 900, tilt: 30, orbit: -3 } },
];

// The collapse: on the last lift the kit is thrown clear of the title, outer ring first, a beat
// a ring, so the final hit lands on the title alone on the grid.
const TITLE = { x: 0, y: 290 };
const collapseOf = (p: { x: number; y: number; id: string }) => {
  if (p.id === 'badge' || p.id === 'intro') return undefined;
  const d = Math.hypot(p.x - TITLE.x, p.y - TITLE.y) || 1;
  const ring = Math.min(3, Math.floor(d / 260));
  const out = 1 + 1400 / d;
  return { to: { x: TITLE.x + (p.x - TITLE.x) * out, y: TITLE.y + (p.y - TITLE.y) * out }, at: frameAt(33, 4 - ring), arc: 220 };
};

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
  { x: PX, y: 0, at: SLAM, strength: 1.8 },
  ...COMPONENT_PIECES.map((p) => ({ x: p.x, y: p.y, at: p.at, strength: WEIGHT[p.fall] })),
  { x: DROP1_AT.x, y: 0, at: DROP1, strength: 2.4 },
  ...OBJECT_PIECES.filter((p) => p.at !== DROP1).map((p) => ({ x: p.x, y: p.y, at: p.at, strength: 0.4 })),
  ...OBJECT_PIECES.filter((p) => p.move).map((p) => ({ x: p.move!.to.x, y: p.move!.to.y, at: p.move!.at, strength: 0.7 })),
  ...XRAY_LANDS.map((at) => ({ x: BUILD_AT.x, y: 0, at, strength: 1.2 })),
  { x: BUILD_AT.x, y: 0, at: DROP2, strength: 2.4, fire: FIRE_FRONT }, // the drop sets the grid alight, the fire keeping pace with the tour
  ...TOUR_IMPACTS,
  ...INSTALL_PIECES.map((p) => ({ x: p.x, y: p.y, at: p.at, strength: 1 })),
  { x: 0, y: 290, at: FINAL_HIT, strength: 3 },
];

// The set around the button: heavy landings make neighbours hop, everything jumps at the end of the
// phrase, and through the fill's hole the whole set lifts off the table, holding its breath.
const PHRASE_END = frameAt(11, 4);
const SET_HOPS = (x: number, y: number, at: number | null) => [
  ...COMPONENT_PIECES.filter((h) => h.fall === 'heavy' && (at === null || h.at > at) && Math.hypot(h.x - x, h.y - y) < 700).map((h) => ({ at: h.at, height: 10 + 24 * (1 - Math.hypot(h.x - x, h.y - y) / 700), frames: 13 })),
  { at: PHRASE_END, height: 60, frames: 20 },
  { at: FILL.hole, height: 150, frames: 2 * (frameAt(12, 4) - frameAt(12, 3)) },
];
// The pumping synths of bars 5-6: the table breathes in on every kick and out over the beat.
const PUMP = [5, 6].flatMap((bar) => [1, 2, 3, 4].map((beat) => frameAt(bar, beat)));
// Dots only where the camera looks: around the kit, and around the foundations.
const SEEN = 3600;

// The dot grid: one continuous sheet round where the camera looks, on the table's own lattice (40 px),
// so it never ends between places, its dots never slide, and a fire can run the whole table.
const GRID = { w: 5600, h: 3200 };
const gridAround = (p: { x: number; y: number }) => ({ x: Math.round(p.x / 80) * 80, y: Math.round((p.y - 200) / 80) * 80, ...GRID });

export function World() {
  const now = useCurrentFrame();
  // The fill's stop: the picture holds for a sixteenth, like the music.
  const frame = now >= FILL.stop && now < FILL.stop + Math.round((frameAt(12, 3) - frameAt(12, 2)) / 4) ? FILL.stop : now >= SILENT && now < DROP2 ? SILENT : now;
  const still = cameraAt(frame, START, MOVES);
  // The roll's last bars shake the camera a little, more as it peaks.
  const shake = rollIntensity(frame);
  const pose = { ...still, x: still.x + 7 * shake * Math.sin(frame * 1.9), y: still.y + 5 * shake * Math.cos(frame * 2.3) };
  const breathe = punch(frame, PUMP);
  const pointer = pointerAt(frame);
  const xray = xrayPointer(frame);
  const fog = fogAt(frame);
  const jolt = punch(frame, [...HEAVY.map((h) => h.at!), ...F_HEAVY.map((h) => h.at)]) + 1.2 * punch(frame, [K[4]]) + 1.4 * punch(frame, [K[7]]) + punch(frame, [ASSEMBLE]) + 1.3 * punch(frame, [SLAM]) + 2 * punch(frame, [DROP1]) + punch(frame, XRAY_LANDS) + 2 * punch(frame, [DROP2]) + punch(frame, INSTALL_PIECES.map((p) => p.at)) + 2.4 * punch(frame, [FINAL_HIT]) + punch(frame, COMPONENT_PIECES.filter((p) => p.fall === 'heavy').map((p) => p.at)) - 0.9 * breathe;
  // The sunrise: dawn on the lone key, full sun once the kit is down, and full sun from bar 3 on.
  const landed = K.filter((k) => frame >= k).length;
  const sun = frame >= END ? 1 : Math.min(1, landed / 8 + (frame >= K[7] ? 0.2 * (1 - react(frame, K[7], 'surface')) : 0));
  const base = useLook();
  // the rave flips the theme on the beat: the components' colorway and the table with it
  const theme = raveTheme(frame);
  const look = theme === 'graphite' ? LOOKS.night : base.dawn ? mixLook(base.dawn, base, sun) : base;
  const power = Math.min(1, 0.5 + 0.5 * sun + 0.05 * jolt);

  // Only what the camera can see is drawn: every place is a whip apart (3400), so a piece further
  // than SEEN from where the camera looks is off the frame, and drawing it costs a frame for nothing.
  const seen = (p: { x: number }) => Math.abs(p.x - pose.x) < SEEN;

  return (
    <LookProvider value={look}>
      <AbsoluteFill data-mu-colorway={theme} style={{ background: look.sky }}>
        <Camera pose={pose} jolt={jolt}>
          <Table light={{ x: pose.x, y: 0 }} power={power} frame={frame} fps={FPS} impacts={IMPACTS} areas={[gridAround(pose)]}>
            {PIECES.filter(seen).map((p) => (
              <Drop key={p.id} frame={frame} at={p.at} x={p.x} y={p.y} fall={p.fall} zoom={p.zoom} size={p.size} turn={p.turn} spin={p.spin} move={collapseOf(p)} hops={[...(HOPS[p.id] ?? []), ...DANCE, ...(p.id === 'badge' ? [{ at: FINAL_HIT, height: 70, frames: 18 }] : [])]}>
                {p.draw(frame)}
              </Drop>
            ))}
            {FOUNDATION_PIECES.filter(seen).map((p) => (
              <Drop key={p.id} frame={frame} at={p.at} x={p.x} y={p.y} fall={p.fall} zoom={p.zoom} size={p.size} hops={[...(F_HOPS[p.id] ?? []), ...DANCE]}>
                {p.draw(frame)}
              </Drop>
            ))}
            {/* The dropout: the canvas fogs out around the button, on the table, so the button and the
                pointer stay clear above it. */}
            {fog > 0 && <div style={{ position: 'absolute', left: PX - 2600, top: -1900, width: 5200, height: 3800, transform: 'translateZ(0.5px)', background: `radial-gradient(420px 380px at 2600px 1900px, rgba(255,255,255,0) 0%, rgba(255,255,255,${fog}) 100%)` }} />}
            {PART_PIECES.filter(seen).map((p) => (
              <Drop key={p.id} frame={frame} at={p.at} x={p.x} y={p.y} fall={p.fall} zoom={p.zoom} size={p.size} move={p.move} from={p.from} until={p.until} hops={p.id === 'component' ? [...(p.hops ?? []), ...SET_HOPS(p.x, p.y, null), ...raveOf(p.x).hops, ...DANCE] : p.hops} sway={p.id === 'component' ? raveOf(p.x).sway : undefined}>
                {p.draw(frame)}
              </Drop>
            ))}
            {COMPONENT_PIECES.filter(seen).map((p) => (
              <Drop key={p.id} frame={frame} at={p.at} x={p.x} y={p.y} fall={p.fall} zoom={p.zoom} size={p.size} hops={[...SET_HOPS(p.x, p.y, p.at), ...raveOf(p.x).hops, ...DANCE]} sway={raveOf(p.x).sway}>
                {p.draw(frame)}
              </Drop>
            ))}
            {frame >= SLAM && Math.abs(pose.x - SET_AT.x) < SEEN && (
              <div style={{ position: 'absolute', left: SET_AT.x, top: -690, transform: 'translate(-50%, -50%)' }}>
                <div style={{ zoom: 7 }}><ComponentsTitle frame={frame} /></div>
              </div>
            )}
            {frame >= DROP1 && (
              <div style={{ position: 'absolute', left: DROP1_AT.x, top: -540, transform: 'translate(-50%, -50%)' }}>
                <div style={{ zoom: 5.5 }}><ObjectsTitle /></div>
              </div>
            )}
            {OBJECT_PIECES.filter(seen).map((p) => (
              <Drop key={p.id} frame={frame} at={p.at} x={p.x} y={p.y} fall={p.fall} zoom={p.zoom} size={p.size} turn={p.turn} move={p.move} until={p.until} hops={[{ at: DROP1_END, height: 70, frames: 20 }, ...DANCE]}>
                {p.draw(frame)}
              </Drop>
            ))}
            {seen(BUILD_AT) && <Xray frame={frame} hops={DANCE} />}
            {INSTALL_PIECES.filter(seen).map((p) => (
              <Drop key={p.id} frame={frame} at={p.at} x={p.x} y={p.y} fall={p.fall} zoom={p.zoom} size={p.size} move={{ to: { x: p.x, y: p.y + 1500 }, at: COLLAPSE, arc: 200 }}>
                {p.draw(frame)}
              </Drop>
            ))}
            {frame >= FINAL_HIT && (
              <div style={{ position: 'absolute', left: 0, top: 420, transform: 'translate(-50%, -50%)' }}>
                <div style={{ zoom: 4 }}><Address /></div>
              </div>
            )}
            {xray.visible && (
              <div style={{ position: 'absolute', left: xray.x, top: xray.y, transform: 'translateZ(90px)' }}>
                <div style={{ zoom: 5, color: '#fff', filter: 'drop-shadow(0 0 0.6px #111) drop-shadow(0 0 0.6px #111) drop-shadow(0 4px 4px rgba(0,0,0,.25))' }}>
                  <IconAct name="select" t={xray.act} size={28} />
                </div>
              </div>
            )}
            {pointer.visible && now < SLAM && (
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
