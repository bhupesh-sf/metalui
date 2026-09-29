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
  /** The table's own base, instead of the mid-to-far fall-off (a hue sweep, say). */
  surface?: string;
  /** The material's texture: a paper grain, or a design canvas's dot grid. */
  pattern?: 'grain' | 'dots';
  /** Light with a shape: a window's panes falling across the table, in this colour. */
  gobo?: string;
  /** The same place before the sun is up, for a sunrise into this look. */
  dawn?: Look;
}

const workbenchDawn: Look = { sky: '#b98a73', mid: '#e3c3aa', far: '#c29a80', pool: '#ffd6ad', shadow: '84 74 110', glow: 'rgba(255,180,120,.30)', vignette: 'rgba(110,60,40,.28)', pattern: 'grain', gobo: 'rgba(255,196,130,.55)' };
const canvasDawn: Look = { sky: '#c6a58c', mid: '#ead6c2', far: '#cfb29a', pool: '#ffdcb6', shadow: '72 76 120', glow: 'rgba(255,184,124,.28)', vignette: 'rgba(110,70,50,.25)', pattern: 'dots', gobo: 'rgba(255,200,140,.5)' };
const SWEEP = 'linear-gradient(112deg, #ffe39c 0%, #ffc49a 30%, #f9a5b0 62%, #c7b5f3 100%)';

export const LOOKS: Record<'white' | 'studio' | 'golden' | 'clay' | 'sunlit' | 'dawn' | 'workbench' | 'canvas' | 'sweep', Look> = {
  // A white design canvas with a dot grid: the components bring all the colour.
  white: { sky: '#ececea', mid: '#ffffff', far: '#f1f1ef', pool: '#ffffff', shadow: '64 72 92', glow: 'rgba(255,255,255,0)', vignette: 'rgba(40,44,52,.07)', pattern: 'dots' },
  workbench: { sky: '#e6d7c4', mid: '#f4ece1', far: '#e0cfbb', pool: '#fffaf0', shadow: '64 82 124', glow: 'rgba(255,214,150,.28)', vignette: 'rgba(110,90,70,.16)', pattern: 'grain', gobo: 'rgba(255,228,176,.6)', dawn: workbenchDawn },
  canvas: { sky: '#ece3d5', mid: '#f8f3ea', far: '#e7dccc', pool: '#fffcf5', shadow: '60 76 128', glow: 'rgba(255,210,150,.24)', vignette: 'rgba(100,80,60,.14)', pattern: 'dots', gobo: 'rgba(255,232,186,.5)', dawn: canvasDawn },
  sweep: { sky: '#d6c3ef', mid: '#ffd8b2', far: '#e8b6cb', pool: '#fffaf0', shadow: '92 70 150', glow: 'rgba(255,232,196,.22)', vignette: 'rgba(120,80,140,.16)', pattern: 'grain', surface: SWEEP, dawn: { sky: '#b58fbf', mid: '#f2b996', far: '#cf8fa5', pool: '#ffd1ad', shadow: '92 60 130', glow: 'rgba(255,190,150,.26)', vignette: 'rgba(110,50,90,.24)', pattern: 'grain', surface: SWEEP } },
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
  const out: Look = { ...(t < 0.5 ? a : b), dawn: undefined };
  const colours = ['sky', 'mid', 'far', 'pool', 'glow', 'vignette'] as const;
  for (const k of colours) out[k] = a[k].startsWith('#') && b[k].startsWith('#') ? hexMix(a[k], b[k], t) : t < 0.5 ? a[k] : b[k];
  out.shadow = a.shadow.split(' ').map((v, i) => Math.round(+v + (+b.shadow.split(' ')[i] - +v) * t)).join(' ');
  return out;
}

const LookContext = createContext<Look>(LOOKS.studio);
export const LookProvider = LookContext.Provider;
export const useLook = () => useContext(LookContext);

/**
 * The table everything lands on. `power` (0..1) is how lit it is: the pool of light widens and
 * brightens with it, so a scene can gather light as it builds. Table units are px.
 */
const GRAIN = `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .45  0 0 0 0 .38  0 0 0 0 .3  0 0 0 .55 0"/></filter><rect width="240" height="240" filter="url(#n)"/></svg>')}")`;

/** Something hitting the table: where, when, and how hard (1 a heavy landing). */
export interface Impact {
  x: number;
  y: number;
  at: number;
  strength: number;
  /** A drop that sets the grid alight: a burning front runs out from here instead of a ripple. */
  fire?: boolean;
}

const DOT = { pitch: 40, radius: 2.2, ink: '60 66 78', alpha: 0.26 };
const WAVE = { speed: 1150, width: 90, life: 1.1, swell: 2.2, push: 12, darken: 0.55 }; // px/s, px, s
/**
 * Fire: a front runs out at `speed`, ragged by `ragged` (tongues, not a ring). Each dot it reaches
 * flares over `flare`, then burns down over `life`, through yellow, orange and red to an ember,
 * swelling by `swell`, flickering by `flicker` and rising `rise` px while it burns.
 */
const FIRE = { start: 250, speed: 2500, ragged: 0.08, flare: 0.06, life: 2.2, swell: 3.6, flicker: 0.35, rise: 18, reach: 14000 }; // starts as a burst; a little faster than a place a bar, so each set is alight as the camera lands
const HEAT_LEVELS = 8;
/** Heat (0-1) as a colour: ember red at the bottom, white-yellow at the top. */
// Saturated, never white-hot: the canvas is white, so the hottest a dot gets is a deep orange.
const HEAT_STOPS: [number, [number, number, number]][] = [[0, [96, 22, 20]], [0.3, [190, 28, 24]], [0.55, [240, 60, 18]], [0.8, [255, 110, 10]], [1, [255, 158, 0]]];
function heatColour(h: number) {
  let i = 0;
  while (i < HEAT_STOPS.length - 2 && h > HEAT_STOPS[i + 1][0]) i++;
  const [h0, c0] = HEAT_STOPS[i], [h1, c1] = HEAT_STOPS[i + 1];
  const t = Math.min(1, Math.max(0, (h - h0) / (h1 - h0)));
  return `rgb(${c0.map((v, k) => Math.round(v + (c1[k] - v) * t)).join(' ')})`;
}
/** A steady hash in [0, 1): the same dot and frame give the same flicker in every render. */
const hash = (a: number, b: number, c = 0) => { const v = Math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43758.5453; return v - Math.floor(v); };

/**
 * The dot grid, and the ripple a landing sends through it: a ring runs out from the impact at WAVE.speed,
 * and as it passes a dot, the dot swells, darkens and is pushed outward, then settles as the ring
 * fades over WAVE.life. Drawn only in the areas near the camera, and as a few paths rather than a
 * node per dot: dots are grouped by how hard the ring is on them (LEVELS steps, too fine to see), and
 * each group is one path, so a frame costs a dozen nodes, not thousands.
 */
const LEVELS = 12;
/** The grid's edges fade out, so a sheet of dots never ends in a hard line. */
const EDGE = 'linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent), linear-gradient(transparent, #000 12%, #000 88%, transparent)';
const REACH = 2600; // how far from the camera's x an area can be and still be in frame

function RippleDots({ frame, fps, impacts, areas, near }: { frame: number; fps: number; impacts: Impact[]; areas: { x: number; y: number; w: number; h: number }[]; near: number }) {
  const all = impacts.map((i) => ({ ...i, t: (frame - i.at) / fps }));
  const live = all.filter((i) => !i.fire && i.t >= 0 && i.t < WAVE.life);
  // a fire burns for as long as its front takes to cross an area, and its last dots to cool
  const fires = all.filter((i) => i.fire && i.t >= 0 && i.t < FIRE.reach / FIRE.speed + FIRE.life);
  return (
    <>
      {areas.map((a, n) => {
        if (Math.abs(a.x - near) > a.w / 2 + REACH) return null;
        const x0 = a.x - a.w / 2, y0 = a.y - a.h / 2;
        const paths: string[] = Array.from({ length: LEVELS + 1 }, () => '');
        const burning: string[] = Array.from({ length: HEAT_LEVELS + 1 }, () => '');
        for (let y = y0; y <= a.y + a.h / 2; y += DOT.pitch) {
          for (let x = x0; x <= a.x + a.w / 2; x += DOT.pitch) {
            let g = 0, px = 0, py = 0;
            for (const i of live) {
              const dx = x - i.x, dy = y - i.y, d = Math.hypot(dx, dy) || 1;
              const ring = WAVE.speed * i.t;
              const k = Math.exp(-(((d - ring) / WAVE.width) ** 2)) * (1 - i.t / WAVE.life) ** 2 * i.strength;
              g += k;
              px += (dx / d) * WAVE.push * k;
              py += (dy / d) * WAVE.push * k;
            }
            let heat = 0;
            for (const i of fires) {
              const dx = x - i.x, dy = y - i.y;
              // the front is ragged: tongues by direction, and a little per dot
              const tongue = 1 + FIRE.ragged * (Math.sin(Math.atan2(dy, dx) * 7 + i.x) * 0.6 + (hash(x, y) - 0.5) * 0.8);
              const age = i.t - Math.max(0, Math.hypot(dx, dy) * tongue - FIRE.start) / FIRE.speed;
              if (age <= 0 || age >= FIRE.life) continue;
              const h = age < FIRE.flare ? age / FIRE.flare : (1 - (age - FIRE.flare) / (FIRE.life - FIRE.flare)) ** 1.6;
              heat = Math.max(heat, h * Math.min(1, i.strength / 2));
            }
            const cx = x + px - x0, cy = y + py - y0;
            const arc = (ax: number, ay: number, r: number) => `M${(ax - r).toFixed(1)} ${ay.toFixed(1)}a${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${(2 * r).toFixed(2)} 0a${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${(-2 * r).toFixed(2)} 0`;
            if (heat > 0.04) {
              const flick = 1 - FIRE.flicker * hash(x, y, frame);
              const hl = Math.round(Math.min(1, heat * flick) * HEAT_LEVELS);
              const r = DOT.radius * (1 + FIRE.swell * heat * flick);
              burning[hl] += arc(cx, cy - FIRE.rise * heat * flick, r);
              continue;
            }
            const level = Math.round((Math.min(1.5, g) / 1.5) * LEVELS);
            const r = DOT.radius * (1 + WAVE.swell * (level / LEVELS) * 1.5);
            paths[level] += arc(cx, cy, r);
          }
        }
        const hot = burning.slice(Math.round(HEAT_LEVELS * 0.45)).join('');
        return (
          <div key={n} style={{ position: 'absolute', left: 0, top: 0 }}>
          {hot && (
            // the light the burning dots throw on the table round them
            <svg width={a.w + 1} height={a.h + 1} style={{ position: 'absolute', left: x0, top: y0, overflow: 'visible', filter: 'blur(9px)', opacity: 0.75, maskImage: EDGE, WebkitMaskImage: EDGE, maskComposite: 'intersect', WebkitMaskComposite: 'source-in' }}>
              <path d={hot} fill="rgb(255 120 20)" />
            </svg>
          )}
          <svg width={a.w + 1} height={a.h + 1} style={{ position: 'absolute', left: x0, top: y0, overflow: 'visible', maskImage: EDGE, WebkitMaskImage: EDGE, maskComposite: 'intersect', WebkitMaskComposite: 'source-in' }}>
            {paths.map((d, level) => d && <path key={level} d={d} fill={`rgb(${DOT.ink} / ${Math.min(0.9, DOT.alpha + WAVE.darken * (level / LEVELS) * 1.5)})`} />)}
            {burning.map((d, hl) => d && <path key={`f${hl}`} d={d} fill={heatColour(hl / HEAT_LEVELS)} />)}
          </svg>
          </div>
        );
      })}
    </>
  );
}

export function Table({ children, light = { x: 0, y: 0 }, power = 1, frame = 0, fps = 60, impacts = [], areas = [{ x: 0, y: 0, w: 2600, h: 1800 }] }: {
  children: ReactNode; light?: { x: number; y: number }; power?: number;
  /** For a rippling dot grid: the frame, the impacts, and where to draw dots (table units). */
  frame?: number; fps?: number; impacts?: Impact[]; areas?: { x: number; y: number; w: number; h: number }[];
}) {
  const look = useLook();
  const r = 700 + 520 * power;
  // The lit planes follow the light (the camera's x): their edges fall off to the sky colour long
  // before they end, so they only need to cover the frame, and a plane the width of the whole table
  // costs every frame a huge layer to paint.
  const plane = { position: 'absolute' as const, left: light.x - 3500, top: -2000, width: 7000, height: 4000 };
  const at = `3500px ${2000 + light.y}px`;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, transformStyle: 'preserve-3d', ['--film-shadow' as string]: look.shadow }}>
      <div style={{ ...plane, background: look.surface ?? `radial-gradient(1500px 1100px at ${at}, ${look.mid} 0%, ${look.far} 70%, ${look.sky} 100%)` }} />
      {look.surface && <div style={{ ...plane, background: `radial-gradient(1700px 1200px at ${at}, transparent 45%, ${look.sky} 100%)` }} />}
      {look.pattern === 'grain' && <div style={{ ...plane, backgroundImage: GRAIN, backgroundSize: '240px', backgroundPosition: `${3500 - light.x}px 0`, opacity: 0.35, mixBlendMode: 'multiply' }} />}
      {look.pattern === 'dots' && <RippleDots frame={frame} fps={fps} impacts={impacts} areas={areas} near={light.x} />}
      <div style={{ ...plane, opacity: power, background: `radial-gradient(${r}px ${r * 0.72}px at ${at}, ${look.pool} 0%, transparent 100%)`, mixBlendMode: look.surface ? 'soft-light' : 'normal' }} />
      {look.gobo && (
        // A window's six panes, thrown long across the table by a low sun from the upper left.
        <div style={{ position: 'absolute', left: -1180 + light.x, top: -820 + light.y, width: 2100, height: 1500, transform: 'rotate(-24deg) skewX(-18deg)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 110, filter: 'blur(26px)', mixBlendMode: 'screen', opacity: 0.3 + 0.45 * power }}>
          {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} style={{ background: look.gobo }} />)}
        </div>
      )}
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
export function Drop({ frame, at, x, y, fall = 'heavy', turn = -10, spin = 1, zoom = 1, size = [180, 130], hops = [], move, from, until, children }: {
  frame: number; at: number | null; x: number; y: number; fall?: Fall; turn?: number;
  /** Which way a light thing tumbles or a key flips (1 or -1). */
  spin?: number;
  zoom?: number;
  /** The object's footprint on the table (px, as drawn), which its contact shadow matches. */
  size?: [number, number];
  hops?: { at: number; height: number; frames: number }[];
  /** A later trip across the table: an arc `arc` px high, touching down at `to` exactly on frame `at`. */
  move?: { to: { x: number; y: number }; at: number; arc?: number };
  /** Only on the table from this frame (a thing that appears, say where parts become one). */
  from?: number;
  /** Gone from this frame on (the parts, once they are one). */
  until?: number;
  children: ReactNode;
}) {
  if ((from !== undefined && frame < from) || (until !== undefined && frame >= until)) return null;
  const f = FALLS[fall];
  const v = at === null ? 1 : land(frame, at, f.mass);
  if (v <= 0) return null;
  let travel = 0;
  if (move) {
    // The trip: launched early by the spring's time to contact, so it lands on its frame.
    const t = Math.min(1, Math.max(0, land(frame, move.at, 'object')));
    x += (move.to.x - x) * t;
    y += (move.to.y - y) * t;
    travel = (move.arc ?? 120) * 4 * t * (1 - t);
  }
  // The table stops the fall: the spring's overshoot past 1 is the impact, a squash, never a sink.
  const falling = f.height * Math.max(0, 1 - v);
  const lift = falling + travel + (at === null ? 0 : bouncesAfter(frame, at, f.bounces)) + hops.reduce((a, h) => a + hop(frame, h.at, h.height, h.frames), 0);
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
