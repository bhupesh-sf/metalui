import { createContext, useContext, type CSSProperties, type ReactNode } from 'react';
import { AbsoluteFill } from 'remotion';
import { land, react, type Mass } from '../motion';

/**
 * The film's motion at film scale. The library's motion is interface-sized (a 1 px press, a 4 px
 * lift); a frame of video needs mass you can see. So objects live on a table in real perspective,
 * fall onto it with the object spring and touch down on the beat, and a camera moves over it.
 *
 *   Camera   a pose (truck x, pedestal y, dolly z, tilt, orbit) that eases between poses written in
 *            frames; a camera has no mass, so it eases rather than springs, and it takes a jolt
 *            from every heavy landing (punch)
 *   Table    the plane the kit rests on, seen from above at the camera's tilt
 *   Drop     an object falling onto the table: it touches down exactly on its frame, overshoots
 *            into the surface and settles, its contact shadow tightening as it arrives
 */
export interface Pose {
  /** The point on the table the camera looks at, in table units. */
  x: number;
  y: number;
  /** Dolly: toward the table (px); 0 is the resting distance. */
  z: number;
  /** How far the table is tipped away (deg), and turned (deg). */
  tilt: number;
  orbit: number;
}

export interface Shot {
  at: number;
  pose: Partial<Pose>;
}

const ease = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** The camera's pose at a frame: each move eases from where the camera is to its pose over `hold`. */
export function cameraAt(frame: number, start: Pose, moves: (Shot & { frames: number })[]): Pose {
  let pose = { ...start };
  for (const m of moves) {
    const t = ease((frame - m.at) / m.frames);
    if (t <= 0) continue;
    const to = { ...pose, ...m.pose };
    pose = Object.fromEntries(Object.keys(pose).map((k) => [k, pose[k as keyof Pose] + (to[k as keyof Pose] - pose[k as keyof Pose]) * t])) as unknown as Pose;
  }
  return pose;
}

/** A jolt that decays with the release spring: the camera feeling each heavy landing. 0 at rest. */
export function punch(frame: number, hits: number[]): number {
  let v = 0;
  for (const h of hits) if (frame >= h) v += 1 - react(frame, h, 'release');
  return v;
}

/** A look-at camera: it turns around the point it looks at, so that point stays centre frame. */
export function Camera({ pose, jolt = 0, children, style }: { pose: Pose; jolt?: number; children: ReactNode; style?: CSSProperties }) {
  const s = 1 + 0.012 * jolt;
  return (
    <AbsoluteFill style={{ perspective: 2000, perspectiveOrigin: '50% 50%', overflow: 'hidden', ...style }}>
      <div
        style={{
          position: 'absolute', left: '50%', top: '52%', width: 0, height: 0, transformStyle: 'preserve-3d',
          transform: `translateY(${5 * jolt}px) translateZ(${pose.z}px) scale(${s}) rotateX(${pose.tilt}deg) rotateZ(${pose.orbit}deg) translate(${-pose.x}px, ${-pose.y}px)`,
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
}

/** A look: the table's light and colour, the tint of its shadows and the grade over the frame. */
export interface Look {
  /** Behind the table, where the frame runs past it. */
  sky: string;
  /** The table unlit: near, far. */
  mid: string;
  far: string;
  /** The pool of light at full power. */
  pool: string;
  /** Shadows take the light's colour (r g b), never black. */
  shadow: string;
  /** A warm lift over the whole frame (screen), and the corners' fall-off (multiply). */
  glow: string;
  vignette: string;
}

export const LOOKS: Record<'studio' | 'golden' | 'clay' | 'sunlit' | 'dawn', Look> = {
  studio: { sky: '#120c09', mid: '#3b2a1e', far: '#150e0a', pool: '#9a7048', shadow: '40 20 8', glow: 'rgba(255,170,90,.16)', vignette: 'rgba(40,18,6,.55)' },
  golden: { sky: '#c9a383', mid: '#efdcc4', far: '#caa98a', pool: '#fff5e4', shadow: '130 76 34', glow: 'rgba(255,196,130,.28)', vignette: 'rgba(150,80,30,.35)' },
  dawn: { sky: '#8f4a3e', mid: '#d58a68', far: '#9b5243', pool: '#ffc796', shadow: '120 48 30', glow: 'rgba(255,170,120,.30)', vignette: 'rgba(120,40,24,.40)' },
  sunlit: { sky: '#f3a877', mid: '#f7c49b', far: '#ec9a6c', pool: '#fff3dc', shadow: '176 78 36', glow: 'rgba(255,226,170,.38)', vignette: 'rgba(214,96,44,.22)' },
  clay: { sky: '#5e2f2a', mid: '#e39a73', far: '#86463a', pool: '#ffd1a8', shadow: '120 44 20', glow: 'rgba(255,150,100,.24)', vignette: 'rgba(90,30,15,.45)' },
};

const hexMix = (a: string, b: string, t: number) => {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
};

/** A look between two: the hex colours blend, the rest follow the second past halfway. */
export function mixLook(a: Look, b: Look, t: number): Look {
  const out = {} as Look;
  for (const k of Object.keys(a) as (keyof Look)[]) out[k] = a[k].startsWith('#') && b[k].startsWith('#') ? hexMix(a[k], b[k], t) : t < 0.5 ? a[k] : b[k];
  if (!a.shadow.startsWith('#')) out.shadow = a.shadow.split(' ').map((v, i) => Math.round(+v + (+b.shadow.split(' ')[i] - +v) * t)).join(' ');
  return out;
}

const LookContext = createContext<Look>(LOOKS.studio);
export const LookProvider = LookContext.Provider;
export const useLook = () => useContext(LookContext);

/**
 * The table everything lands on. `power` (0..1) is how lit it is: the pool of light widens and
 * brightens with it, so a scene can gather light as it builds. Table units are px.
 */
export function Table({ children, light = { x: 0, y: 0 }, power = 1 }: { children: ReactNode; light?: { x: number; y: number }; power?: number }) {
  const look = useLook();
  const r = 700 + 520 * power;
  const at = `${2400 + light.x}px ${1600 + light.y}px`;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, transformStyle: 'preserve-3d', ['--film-shadow' as string]: look.shadow }}>
      <div style={{ position: 'absolute', left: -2400, top: -1600, width: 4800, height: 3200, background: `radial-gradient(1500px 1100px at ${at}, ${look.mid} 0%, ${look.far} 70%, ${look.sky} 100%)` }} />
      <div style={{ position: 'absolute', left: -2400, top: -1600, width: 4800, height: 3200, opacity: power, background: `radial-gradient(${r}px ${r * 0.72}px at ${at}, ${look.pool} 0%, transparent 100%)` }} />
      {children}
    </div>
  );
}

/** The grade over the whole frame: a warm lift from the light's side and the corners falling off. */
export function Grade({ power = 1 }: { power?: number }) {
  const look = useLook();
  return (
    <>
      <AbsoluteFill style={{ background: `radial-gradient(90% 80% at 30% 20%, ${look.glow}, transparent 70%)`, mixBlendMode: 'screen', opacity: 0.6 + 0.4 * power }} />
      <AbsoluteFill style={{ background: `radial-gradient(75% 70% at 50% 48%, transparent 55%, ${look.vignette})`, mixBlendMode: 'multiply' }} />
    </>
  );
}

/**
 * How a thing falls, by what it is. Every fall touches down on its frame; they differ in character.
 *   heavy   drops straight on the object spring, squashes on impact and jolts the camera; its
 *           neighbours hop when it lands
 *   light   tumbles as it falls (the part spring) and bounces twice before it rests
 *   key     flips end over end on the way down and lands face up
 */
export type Fall = 'heavy' | 'light' | 'key';

const FALLS: Record<Fall, { height: number; mass: Mass; bounces: number[] }> = {
  heavy: { height: 1050, mass: 'object', bounces: [] },
  light: { height: 760, mass: 'part', bounces: [46, 14] },
  key: { height: 950, mass: 'object', bounces: [22] },
};

/** A hop: up and down on a parabola, `height` px over `frames`, starting at `at`. 0 outside it. */
export function hop(frame: number, at: number, height: number, frames: number): number {
  const t = (frame - at) / frames;
  return t <= 0 || t >= 1 ? 0 : height * 4 * t * (1 - t);
}

/** Bounces after a landing: each the height given, each shorter, one straight after the other. */
function bouncesAfter(frame: number, at: number, heights: number[]): number {
  let start = at;
  for (const h of heights) {
    const frames = Math.round(13 * Math.sqrt(h / 46));
    const v = hop(frame, start, h, frames);
    if (frame < start + frames) return v;
    start += frames;
  }
  return 0;
}

/**
 * An object on the table at (x, y), standing up toward the camera. `at` is the frame it touches
 * down on (null: already there). `hops` are extra lifts on other frames: sympathy with a heavy
 * neighbour's landing, or everything jumping together on a beat.
 */
export function Drop({ frame, at, x, y, fall = 'heavy', turn = -10, spin = 1, zoom = 1, size = [180, 130], hops = [], children }: {
  frame: number; at: number | null; x: number; y: number; fall?: Fall; turn?: number;
  /** Which way a light thing tumbles or a key flips (1 or -1). */
  spin?: number;
  zoom?: number;
  /** The object's footprint on the table (px, as drawn), which its contact shadow matches. */
  size?: [number, number];
  hops?: { at: number; height: number; frames: number }[];
  children: ReactNode;
}) {
  const f = FALLS[fall];
  const v = at === null ? 1 : land(frame, at, f.mass);
  if (v <= 0) return null;
  // The table stops the fall: the spring's overshoot past 1 is the impact, a squash, never a sink.
  const falling = f.height * Math.max(0, 1 - v);
  const lift = falling + (at === null ? 0 : bouncesAfter(frame, at, f.bounces)) + hops.reduce((a, h) => a + hop(frame, h.at, h.height, h.frames), 0);
  const squash = v > 1 && lift < 1 ? 1 - Math.min(0.08, (v - 1) * 0.9) : 1;
  const air = Math.min(1, lift / f.height);
  const left = 1 - Math.min(1, v); // how much of the fall is still to come
  const tumble = fall === 'light' ? `rotateX(${spin * 300 * left}deg) rotateY(${spin * 200 * left}deg)` : fall === 'key' ? `rotateX(${spin * 360 * left}deg)` : '';
  return (
    <div style={{ position: 'absolute', left: x, top: y, transformStyle: 'preserve-3d' }}>
      {/* The contact shadow: wide and faint while it's high, tight and dark on the table. */}
      <div
        style={{
          position: 'absolute', left: '50%', top: '50%', width: size[0], height: size[1], borderRadius: '30%',
          transform: `translate(-50%, -50%) scale(${1 + 0.5 * air})`,
          background: 'radial-gradient(closest-side, rgb(var(--film-shadow) / .6), rgb(var(--film-shadow) / 0))',
          opacity: 0.7 * (1 - air) ** 3, filter: `blur(${4 + 20 * air}px)`,
        }}
      />
      <div
        style={{
          position: 'absolute', left: 0, top: 0, transformStyle: 'preserve-3d',
          transform: `translate(-50%, -50%) translateZ(${lift + 1}px) rotateZ(${turn * left}deg) ${tumble} scale(${2 - squash}, ${squash})`,
        }}
      >
        <div style={{ zoom }}>{children}</div>
      </div>
    </div>
  );
}

/** A ring of light pulsing out across the table from (x, y) at a hit. */
export function Ring({ frame, at, x, y, colour = 'rgba(255,236,200,.9)', reach = 900 }: { frame: number; at: number; x: number; y: number; colour?: string; reach?: number }) {
  const t = (frame - at) / 34;
  if (t < 0 || t > 1) return null;
  const r = reach * (1 - (1 - t) ** 3);
  return (
    <div style={{ position: 'absolute', left: x - r, top: y - r, width: 2 * r, height: 2 * r, borderRadius: '50%', border: `${10 * (1 - t) + 2}px solid ${colour}`, opacity: 0.8 * (1 - t), filter: 'blur(3px)' }} />
  );
}

/** Dust in a sunbeam: motes drifting up and across the light, twinkling. Screen space, seeded. */
export function Motes({ frame, count = 46, beam = 1 }: { frame: number; count?: number; beam?: number }) {
  const rand = (i: number, k: number) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <AbsoluteFill style={{ background: 'linear-gradient(118deg, transparent 18%, rgba(255,236,196,.20) 34%, rgba(255,236,196,.08) 52%, transparent 64%)', mixBlendMode: 'screen', opacity: beam }} />
      {Array.from({ length: count }, (_, i) => {
        const x = (rand(i, 1) * 1.2 - 0.1 + frame * (0.0006 + rand(i, 2) * 0.0008)) % 1.1;
        const y = (1.05 - ((rand(i, 3) + frame * (0.0005 + rand(i, 4) * 0.0007)) % 1.1));
        const size = 2 + rand(i, 5) * 5;
        const twinkle = 0.35 + 0.65 * Math.abs(Math.sin(frame * (0.05 + rand(i, 6) * 0.08) + i));
        // Motes show where the beam is: brightest along its diagonal.
        const inBeam = Math.max(0, 1 - Math.abs(x * 1920 * 0.55 - y * 1080 * 0.85 + 180 - 420) / 520);
        return <div key={i} style={{ position: 'absolute', left: `${x * 100}%`, top: `${y * 100}%`, width: size, height: size, borderRadius: '50%', background: 'rgba(255,244,222,.95)', filter: `blur(${size > 5 ? 1.5 : 0.5}px)`, opacity: beam * twinkle * (0.25 + 0.75 * inBeam) }} />;
      })}
    </AbsoluteFill>
  );
}
