import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Button, Checkbox, Folder, Key, Swatch, Switch, WeatherTile } from '@unlocalhosted/metalui';
import { GADGETS } from '@unlocalhosted/metalui/gadgets';
import tokens from '../../../../tokens/tokens.json';
import { frameAt } from '../time';
import { land, react } from '../motion';
import { Camera, Drop, Grade, Table, cameraAt, punch, useLook, type Pose } from '../film/stage';

/**
 * Shot 1, the opener (video bars 1-2). The kick plays alone under a drone: eight hits.
 *
 *   frame one     already lit: a close look at one key, in raking light, waiting
 *   kick 1        the key goes down on the kick (the part spring, contact on the beat) and comes
 *                 back up on the off-beat
 *   kicks 2-8     a real component falls onto the table on each kick, touching down on the beat
 *                 with the object spring: switch, checkbox, swatch, button, weather, folder, and a
 *                 last key. Each does its one thing on the off-beat after it lands: the switch
 *                 flips, the checkbox ticks, the button goes down
 *   the camera    starts close on the key and pulls back and round as the kit grows, so every new
 *                 object lands in view; each landing jolts it
 */
const K = [1, 2].flatMap((bar) => [1, 2, 3, 4].map((beat) => frameAt(bar, beat)));
const OFF = (i: number) => Math.round((K[i] + (K[i + 1] ?? frameAt(3))) / 2); // the and after kick i
const END = frameAt(3);

// Close on the key, tipped low; then back and round as the kit grows, to hold all of it.
const START: Pose = { x: 0, y: 0, z: 1150, tilt: 34, orbit: -16 };
const MOVES = [
  { at: K[1] - 16, frames: 56, pose: { x: 60, y: -20, z: 760, orbit: -12 } },
  { at: K[3] - 16, frames: 64, pose: { x: 20, y: 0, z: 420, tilt: 40, orbit: -7 } },
  { at: K[5] - 16, frames: 70, pose: { x: 60, y: 10, z: 160, tilt: 44, orbit: -2 } },
  { at: K[7] - 12, frames: END - K[7] + 12, pose: { x: 80, y: 20, z: 240, tilt: 46, orbit: 3 } },
];

/** A key's press, as the library's key draws it (tokens: gadgets.key.press), stepped by frame. */
function PressedKey({ id, down, glyph, accent }: { id: string; down: number; glyph: string; accent?: boolean }) {
  const [dy, sx, sy] = GADGETS.key.press as unknown as [number, number, number];
  return (
    <div id={id}>
      <style>{`#${id} [data-part="key.face"]{transform-box:fill-box;transform-origin:center;transform:translateY(${dy * down}px) scale(${1 + (sx - 1) * down},${1 + (sy - 1) * down})}`}</style>
      <Key glyph={glyph} accent={accent} size={150} />
    </div>
  );
}

export function Opener() {
  const frame = useCurrentFrame();
  const pose = cameraAt(frame, START, MOVES);
  const jolt = punch(frame, K);
  const look = useLook();
  // The light gathers as the kit does: a glimmer on the lone key, full once all eight have landed,
  // and a lift on each landing.
  const landed = K.filter((k) => frame >= k).length;
  const power = Math.min(1, 0.45 + 0.55 * (landed / 8) + 0.06 * jolt);

  // The first key: down on kick 1, up on the off-beat. The last: down on the downbeat of bar 3.
  const key1 = Math.max(0, land(frame, K[0], 'part') - (frame >= OFF(0) ? react(frame, OFF(0), 'release') : 0));
  const switchOn = frame >= OFF(1);
  const ticked = frame >= OFF(2);
  const pressed = frame >= OFF(4) && frame < K[5];

  return (
    <AbsoluteFill data-mu-colorway="bone" style={{ background: look.sky }}>
      <Camera pose={pose} jolt={jolt}>
        <Table light={{ x: 60, y: 0 }} power={power}>
          <Drop frame={frame} at={null} x={0} y={0} zoom={1.7} size={[250, 250]}>
            <PressedKey id="k1" down={key1} glyph="⌘" />
          </Drop>
          <Drop frame={frame} at={K[1]} x={300} y={-150} zoom={3} size={[150, 90]}>
            <Switch checked={switchOn} aria-label="switch" />
          </Drop>
          <Drop frame={frame} at={K[2]} x={330} y={140} zoom={4.4} size={[120, 120]}>
            <Checkbox checked={ticked} aria-label="checkbox" />
          </Drop>
          <Drop frame={frame} at={K[3]} x={-310} y={-170} zoom={2.1} turn={12} size={[180, 180]}>
            <Swatch hex={tokens.shared.orange} label="ACCENT" />
          </Drop>
          <Drop frame={frame} at={K[4]} x={40} y={300} zoom={2.8} size={[240, 110]}>
            <Button cap="primary" className={pressed ? 'recipe-button-primary-pressed' : undefined}>Ship it</Button>
          </Drop>
          <Drop frame={frame} at={K[5]} x={-380} y={210} zoom={1.5} turn={-14} size={[270, 270]}>
            <WeatherTile kind="clear" temp="21°" name="Clear" meta="Lisbon" clock={10} running={false} aria-label="Lisbon, clear, 21°" />
          </Drop>
          <Drop frame={frame} at={K[6]} x={40} y={-330} zoom={1.5} turn={10} height={1100} size={[300, 200]}>
            <Folder name="Launch" count={12} hue="amber" />
          </Drop>
          <Drop frame={frame} at={K[7]} x={560} y={0} zoom={1.6} height={1200} size={[240, 240]}>
            <PressedKey id="k2" down={frame >= END - 4 ? land(frame, END, 'part') : 0} glyph="↩" accent />
          </Drop>
        </Table>
      </Camera>
      <Grade power={power} />
    </AbsoluteFill>
  );
}
