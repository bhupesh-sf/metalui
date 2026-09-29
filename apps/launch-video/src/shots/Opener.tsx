import type { ReactNode } from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Button, Checkbox, Folder, Kbd, Key, Led, Swatch, Switch, WeatherTile } from '@unlocalhosted/metalui';
import { GADGETS } from '@unlocalhosted/metalui/gadgets';
import tokens from '../../../../tokens/tokens.json';
import { frameAt } from '../time';
import { land, react } from '../motion';
import { Camera, Drop, Grade, LookProvider, Motes, Ring, Table, cameraAt, mixLook, punch, useLook, type Fall, type Pose } from '../film/stage';

/* ─────────────────────────────────────────────────────────
 * SHOT 1 · THE OPENER (video bars 1-2, 142 bpm, a beat is 0.42 s)
 *
 *   0.00s  sunrise: a lone key under a sunbeam, dust drifting in the light
 *   0.67s  KICK 1  the key goes down; a ring of light pulses out across the table
 *   1.09s  KICK 2  two things land: a red folder (heavy) and a switch (light); the key hops
 *          ...     two per kick, heavy and light: heavy drops straight, jolts the camera and makes
 *                  its neighbours hop; light tumbles and bounces twice; keys flip end over end.
 *                  Each does its one thing on the off-beat after: switches flip, checkboxes tick,
 *                  keys press. Small parts (lamps, keycaps) rain on the off-beats.
 *   3.64s  KICK 8  the hero lands, a big accent return key: every object jumps at once and the
 *                  light blooms to full sun
 *   4.05s  bar 3   foundations
 *
 * Colour is a sunrise: the light starts deep apricot on the lone key and blooms to butter-cream as
 * the kit gathers. The objects carry the saturated colour; the table stays a warm mid-tone so bone
 * pieces still read against it.
 * ───────────────────────────────────────────────────────── */

const K = [1, 2].flatMap((bar) => [1, 2, 3, 4].map((beat) => frameAt(bar, beat)));
const END = frameAt(3);
const OFF = (i: number) => Math.round((K[i] + (K[i + 1] ?? END)) / 2); // the "and" after kick i

interface Piece {
  id: string;
  at: number | null;
  fall: Fall;
  x: number;
  y: number;
  zoom: number;
  size: [number, number];
  turn?: number;
  spin?: number;
  draw: (frame: number) => ReactNode;
}

/** A key's press, as the library draws it (tokens: gadgets.key.press), stepped by frame. */
function PressedKey({ id, down, glyph, accent, size = 150 }: { id: string; down: number; glyph: string; accent?: boolean; size?: number }) {
  const [dy, sx, sy] = GADGETS.key.press as unknown as [number, number, number];
  return (
    <div id={id}>
      <style>{`#${id} [data-part="key.face"]{transform-box:fill-box;transform-origin:center;transform:translateY(${dy * down}px) scale(${1 + (sx - 1) * down},${1 + (sy - 1) * down})}`}</style>
      <Key glyph={glyph} accent={accent} size={size} />
    </div>
  );
}

/** Down on `at`, back up on `up` (the part spring there, the release spring back). */
const press = (frame: number, at: number, up: number) => Math.max(0, land(frame, at, 'part') - (frame >= up ? react(frame, up, 'release') : 0));

const BITS: { x: number; y: number; i: number; zoom: number; size: [number, number]; draw: () => ReactNode }[] = [
  { x: 150, y: -170, i: 1, zoom: 7, size: [60, 60], draw: () => <Led kind="live" /> },
  { x: -300, y: -60, i: 2, zoom: 2.6, size: [80, 80], draw: () => <Kbd>⌥</Kbd> },
  { x: 520, y: 470, i: 3, zoom: 7, size: [60, 60], draw: () => <Led kind="waiting" /> },
  { x: -620, y: -420, i: 4, zoom: 2.6, size: [80, 80], draw: () => <Kbd>⎋</Kbd> },
  { x: 480, y: -320, i: 5, zoom: 7, size: [60, 60], draw: () => <Led kind="link" /> },
  { x: -380, y: 480, i: 6, zoom: 2.6, size: [80, 80], draw: () => <Kbd>⌫</Kbd> },
];

const PIECES: Piece[] = [
  // The hero, there from frame one.
  { id: 'cmd', at: null, fall: 'heavy', x: 0, y: 0, zoom: 1.5, size: [230, 230], draw: (f) => <PressedKey id="k-cmd" down={press(f, K[0], OFF(0))} glyph="⌘" /> },
  // Kick 2
  { id: 'folder-red', at: K[1], fall: 'heavy', x: -470, y: -250, zoom: 1.2, size: [260, 180], turn: 12, draw: () => <Folder name="Ideas" count={7} hue="red" /> },
  { id: 'switch', at: K[1], fall: 'light', x: 360, y: -200, zoom: 2.6, size: [140, 90], draw: (f) => <Switch checked={f >= OFF(1)} aria-label="switch" /> },
  // Kick 3
  { id: 'check', at: K[2], fall: 'light', x: 400, y: 160, zoom: 3.8, size: [100, 100], spin: -1, draw: (f) => <Checkbox checked={f >= OFF(2)} aria-label="checkbox" /> },
  { id: 'swatch-blue', at: K[2], fall: 'light', x: -380, y: 80, zoom: 1.7, size: [150, 150], turn: -16, draw: () => <Swatch hex={tokens.shared.blue} label="BLUE" /> },
  // Kick 4
  { id: 'button', at: K[3], fall: 'heavy', x: 40, y: 330, zoom: 2.4, size: [260, 100], draw: (f) => <Button cap="primary" className={f >= OFF(3) && f < K[4] ? 'recipe-button-primary-pressed' : undefined}>Ship it</Button> },
  { id: 'key-a', at: K[3], fall: 'key', x: -170, y: -380, zoom: 1, size: [150, 150], draw: (f) => <PressedKey id="k-a" down={press(f, K[4], OFF(4))} glyph="A" size={140} /> },
  // Kick 5
  { id: 'weather', at: K[4], fall: 'heavy', x: -560, y: 330, zoom: 1.25, size: [230, 230], turn: -12, draw: () => <WeatherTile kind="clear" temp="24°" name="Sunny" meta="Lisbon" clock={10} running={false} aria-label="Lisbon, sunny, 24°" /> },
  { id: 'swatch-green', at: K[4], fall: 'light', x: 620, y: -30, zoom: 1.6, size: [140, 140], turn: 18, spin: -1, draw: () => <Swatch hex={tokens.shared.green} label="LIVE" /> },
  // Kick 6
  { id: 'folder-blue', at: K[5], fall: 'heavy', x: 250, y: -400, zoom: 1.15, size: [250, 170], turn: -8, draw: () => <Folder name="Launch" count={12} hue="blue" /> },
  { id: 'switch-2', at: K[5], fall: 'light', x: -700, y: -40, zoom: 2.4, size: [130, 80], draw: (f) => <Switch checked={f >= OFF(5)} aria-label="switch" /> },
  // Kick 7
  { id: 'folder-violet', at: K[6], fall: 'heavy', x: 660, y: 320, zoom: 1.1, size: [240, 160], turn: 10, draw: () => <Folder name="Play" count={4} hue="violet" /> },
  { id: 'key-shift', at: K[6], fall: 'key', x: -200, y: 190, zoom: 1, size: [150, 150], spin: -1, draw: (f) => <PressedKey id="k-shift" down={press(f, K[7], OFF(7))} glyph="⇧" size={140} /> },
  // Kick 8: the hero lands.
  { id: 'return', at: K[7], fall: 'heavy', x: 230, y: 90, zoom: 1.35, size: [240, 240], draw: (f) => <PressedKey id="k-ret" down={press(f, END - 6, END + 20)} glyph="↩" accent /> },
  // Small parts rain on the off-beats.
  ...BITS.map((b, n): Piece => ({ id: `bit-${n}`, at: OFF(b.i), fall: 'light', x: b.x, y: b.y, zoom: b.zoom, size: b.size, spin: n % 2 ? 1 : -1, draw: b.draw })),
];

const HEAVY = PIECES.filter((p) => p.fall === 'heavy' && p.at !== null);

/** Everything already down within reach of a heavy landing hops, the nearer the higher; everything
 *  already down jumps together when the hero lands. */
function hopsFor(p: Piece) {
  const out: { at: number; height: number; frames: number }[] = [];
  for (const h of HEAVY) {
    if (h === p || (p.at !== null && p.at >= h.at!)) continue;
    const d = Math.hypot(h.x - p.x, h.y - p.y);
    if (h.at === K[7]) out.push({ at: K[7], height: 70, frames: 22 });
    else if (d < 480) out.push({ at: h.at!, height: 10 + 26 * (1 - d / 480), frames: 13 });
  }
  return out;
}
const HOPS = Object.fromEntries(PIECES.map((p) => [p.id, hopsFor(p)]));

// Close on the key, low; then back and round as the kit grows, to hold all of it.
const START: Pose = { x: 0, y: 0, z: 1150, tilt: 34, orbit: -16 };
const MOVES = [
  { at: K[1] - 16, frames: 56, pose: { x: 0, y: -40, z: 640, orbit: -12 } },
  { at: K[3] - 16, frames: 64, pose: { x: 0, y: 0, z: 240, tilt: 40, orbit: -7 } },
  { at: K[5] - 16, frames: 70, pose: { x: 0, y: 0, z: 40, tilt: 44, orbit: -2 } },
  { at: K[7] - 12, frames: END - K[7] + 12, pose: { x: 20, y: 30, z: 110, tilt: 47, orbit: 3 } },
];

export function Opener() {
  const frame = useCurrentFrame();
  const pose = cameraAt(frame, START, MOVES);
  const jolt = punch(frame, HEAVY.map((h) => h.at!)) + 1.4 * punch(frame, [K[7]]);
  // The sunrise: dawn on the lone key, full sun once the kit is down, a lift on every landing.
  const landed = K.filter((k) => frame >= k).length;
  const sun = Math.min(1, landed / 8 + (frame >= K[7] ? 0.2 * (1 - react(frame, K[7], 'surface')) : 0));
  // The film's look, risen into from its own dawn.
  const base = useLook();
  const look = base.dawn ? mixLook(base.dawn, base, sun) : base;
  const power = Math.min(1, 0.5 + 0.5 * sun + 0.05 * jolt);

  return (
    <LookProvider value={look}>
      <AbsoluteFill data-mu-colorway="bone" style={{ background: look.sky }}>
        <Camera pose={pose} jolt={jolt}>
          <Table light={{ x: 0, y: 0 }} power={power}>
            <Ring frame={frame} at={K[0]} x={0} y={0} />
            <Ring frame={frame} at={K[7]} x={230} y={90} reach={1500} colour="rgba(255,244,214,.95)" />
            {PIECES.map((p) => (
              <Drop key={p.id} frame={frame} at={p.at} x={p.x} y={p.y} fall={p.fall} zoom={p.zoom} size={p.size} turn={p.turn} spin={p.spin} hops={HOPS[p.id]}>
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
