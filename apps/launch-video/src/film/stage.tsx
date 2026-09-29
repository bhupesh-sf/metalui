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

export const LOOKS: Record<'studio' | 'golden' | 'clay', Look> = {
  studio: { sky: '#120c09', mid: '#3b2a1e', far: '#150e0a', pool: '#9a7048', shadow: '40 20 8', glow: 'rgba(255,170,90,.16)', vignette: 'rgba(40,18,6,.55)' },
  golden: { sky: '#c9a383', mid: '#efdcc4', far: '#caa98a', pool: '#fff5e4', shadow: '130 76 34', glow: 'rgba(255,196,130,.28)', vignette: 'rgba(150,80,30,.35)' },
  clay: { sky: '#5e2f2a', mid: '#e39a73', far: '#86463a', pool: '#ffd1a8', shadow: '120 44 20', glow: 'rgba(255,150,100,.24)', vignette: 'rgba(90,30,15,.45)' },
};

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
 * An object on the table at (x, y), standing up toward the camera. `at` is the frame it touches
 * down on; before that it falls from `height`, turning a little, and isn't drawn before it launches.
 */
export function Drop({ frame, at, x, y, height = 900, turn = -10, mass = 'object', zoom = 1, size = [180, 130], children }: {
  frame: number; at: number | null; x: number; y: number; height?: number; turn?: number; mass?: Mass; zoom?: number;
  /** The object's footprint on the table (px, as drawn), which its contact shadow matches. */
  size?: [number, number];
  children: ReactNode;
}) {
  const v = at === null ? 1 : land(frame, at, mass);
  if (v <= 0) return null;
  // The table stops the fall: height never goes below zero. The spring's overshoot past 1 is the
  // impact instead, a brief squash that recovers as the spring settles.
  const h = height * Math.max(0, 1 - v);
  const squash = v > 1 ? 1 - Math.min(0.08, (v - 1) * 0.9) : 1;
  const near = Math.max(0, Math.min(1, 1 - h / height));
  return (
    <div style={{ position: 'absolute', left: x, top: y, transformStyle: 'preserve-3d' }}>
      {/* The contact shadow, on the table: wide and faint while it's high, tight and dark as it lands. */}
      <div
        style={{
          position: 'absolute', left: '50%', top: '50%', width: size[0], height: size[1], borderRadius: '30%',
          transform: `translate(-50%, -50%) scale(${1 + 0.5 * (1 - near)})`,
          background: 'radial-gradient(closest-side, rgb(var(--film-shadow) / .6), rgb(var(--film-shadow) / 0))',
          opacity: 0.7 * near ** 3, filter: `blur(${4 + 20 * (1 - near)}px)`, // no shadow before its object is near
        }}
      />
      <div
        style={{
          position: 'absolute', left: 0, top: 0, transformStyle: 'preserve-3d',
          transform: `translate(-50%, -50%) translateZ(${h + 1}px) rotateZ(${turn * (1 - Math.min(1, v))}deg) scale(${2 - squash}, ${squash})`,
        }}
      >
        <div style={{ zoom }}>{children}</div>
      </div>
    </div>
  );
}
