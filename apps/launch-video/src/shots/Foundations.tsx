import type { ReactNode } from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { DotDisplay, Label, Surface, Swatch, type DotInk } from '@unlocalhosted/metalui';
import tokens from '../../../../tokens/tokens.json';
import events from '../events.generated.json';
import { FPS, at, frameAt } from '../time';
import { land, mix, sweep } from '../motion';

/**
 * Shot 2, foundations (video bars 3-4). Arcade blips scatter over the kick; the track is
 * PartyInvaders, so the display plays the arcade.
 *
 *   the blips     a bone readout plate holds a dot display with a row of invaders on it (drawn for
 *                 this film, not the arcade's). Every blip reveals the next pixels of the row,
 *                 left to right, and adds to the score; a pixel lights darkest and settles a shade
 *                 each sixteenth, never tweened. By the end of bar 4 the row is whole.
 *   the kicks     the invaders march a dot and change pose on every kick, the arcade's own gait;
 *                 and eight foundation tokens land, one per kick, on the part spring: four colours
 *                 as swatches (the tokens' own hexes), then space, radius, type and spring
 *   the cut       hard, on the downbeat of bar 3, where the blips come in; the room stays lit where
 *                 the count-in left it and the camera keeps closing in at a constant rate
 */
const COLS = 78;
const ROWS = 14;
const SIXTEENTH = (at(3, 2) - at(3)) / 4;

// Three invaders, each 11 x 8 in two poses. Drawn for this film.
const SPRITES: [string[], string[]][] = [
  [
    ['....XXX....', '..XXXXXXX..', '.XX.XXX.XX.', '.XXXXXXXXX.', '...XX.XX...', '..XX...XX..', '.XX.....XX.', '...........'],
    ['....XXX....', '..XXXXXXX..', '.XX.XXX.XX.', '.XXXXXXXXX.', '...XX.XX...', '..X.X.X.X..', '.X.......X.', '...........'],
  ],
  [
    ['...XXXXX...', '.XXXXXXXXX.', 'XX..XXX..XX', 'XXXXXXXXXXX', 'XXXX...XXXX', '.XX.XXX.XX.', 'X.........X', '...........'],
    ['...XXXXX...', '.XXXXXXXXX.', 'XX..XXX..XX', 'XXXXXXXXXXX', 'XXXX...XXXX', '..X.XXX.X..', '.X.......X.', '...........'],
  ],
  [
    ['.X.......X.', '..X.....X..', '..XXXXXXX..', '.XX.XXX.XX.', 'XXXXXXXXXXX', 'X.XXXXXXX.X', '..XX...XX..', '...........'],
    ['.X.......X.', 'X.X.....X.X', 'X.XXXXXXX.X', 'XXX.XXX.XXX', '.XXXXXXXXX.', '..XXXXXXX..', '.X.......X.', '...........'],
  ],
];
const SPRITE_X = [17, 37, 57]; // left edges before the first march, clear of the score
const SPRITE_Y = 3;

// Inks: unlit; just lit (the darkest ink on a bone well), then a shade down each sixteenth to the
// settled colour; the ground line.
const INKS: DotInk[] = ['off', 'moon', 'sun', ['sun', 0.9], ['sun', 0.82], 'hz'];

const KICKS = [3, 4].flatMap((bar) => [1, 2, 3, 4].map((beat) => frameAt(bar, beat)));
const BLIPS = events.blips.map((b) => ({ frame: Math.round(b.t * FPS), t: b.t }));

// Every pixel either pose uses, ordered left to right: the order the blips reveal them in, an equal
// share per blip.
const PIXELS = SPRITES.flatMap(([a, b], s) => {
  const seen: { key: string; x: number; y: number }[] = [];
  for (let y = 0; y < a.length; y++) for (let x = 0; x < a[y].length; x++) {
    if (a[y][x] === 'X' || b[y][x] === 'X') seen.push({ key: `${s}:${x}:${y}`, x: SPRITE_X[s] + x, y });
  }
  return seen;
}).sort((p, q) => p.x - q.x || p.y - q.y);
const PER_BLIP = Math.ceil(PIXELS.length / BLIPS.length);

function displayAt(frame: number): { dots: number[]; score: number } {
  const now = frame / FPS;
  const dots = new Array<number>(COLS * ROWS).fill(0);
  const heard = BLIPS.filter((b) => frame >= b.frame);
  const steps = KICKS.filter((k) => frame >= k).length;
  const revealed = new Map<string, number>();
  heard.forEach((b, i) => {
    for (const p of PIXELS.slice(i * PER_BLIP, (i + 1) * PER_BLIP)) revealed.set(p.key, b.t);
  });
  SPRITES.forEach((poses, s) => {
    poses[steps % 2].forEach((line, y) => {
      [...line].forEach((c, x) => {
        const t = revealed.get(`${s}:${x}:${y}`);
        if (c !== 'X' || t === undefined) return;
        const col = SPRITE_X[s] + x + steps; // a dot to the right per kick
        if (col < COLS) dots[(SPRITE_Y + y) * COLS + col] = Math.min(4, 1 + Math.floor((now - t) / SIXTEENTH));
      });
    });
  });
  for (let c = 0; c < COLS; c++) dots[(ROWS - 1) * COLS + c] = 5;
  return { dots, score: heard.length * 10 };
}

/** A token landing on its kick: up from one content step (8), defocused by half its travel. */
function Landing({ at: kick, children }: { at: number; children: ReactNode }) {
  const frame = useCurrentFrame();
  const v = land(frame, kick, 'part');
  if (v <= 0) return <div style={{ visibility: 'hidden' }}>{children}</div>;
  return (
    <div style={{ transform: `translateY(${8 * (1 - v)}px)`, filter: `blur(${Math.max(0, 4 * (1 - v))}px)`, opacity: Math.min(1, v * 2.5) }}>
      {children}
    </div>
  );
}

/** A non-colour token, built the swatch's way: its size, radius and label, on a raised plate. */
function Chip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Surface material="raise-sm" className="size-swatch-size rounded-swatch-radius" style={{ position: 'relative', display: 'grid', placeItems: 'center' }}>
      <div style={{ marginBottom: 10 }}>{children}</div>
      <span className="absolute left-swatch-label-x bottom-swatch-label-y type-swatch-label whitespace-nowrap text-swatch-label-ink-dark">{label}</span>
    </Surface>
  );
}

// The part spring, as the tokens sample it: the curve every part in the library moves on.
const SPRING = tokens.springs.part.css.replace(/^linear\(|\)$/g, '').split(',').map(Number);
function SpringGlyph({ drawn }: { drawn: number }) {
  const n = Math.max(2, Math.round(SPRING.length * drawn));
  const pts = SPRING.slice(0, n).map((v, i) => `${(i / (SPRING.length - 1)) * 34},${22 - v * 16}`).join(' ');
  return (
    <svg width={34} height={24} viewBox="0 0 34 24" style={{ overflow: 'visible' }}>
      <line x1={0} y1={6} x2={34} y2={6} stroke="var(--mu-ink3)" strokeWidth={0.75} strokeDasharray="1.5 2" />
      <polyline points={pts} fill="none" stroke="var(--mu-ink2)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// The tokens' own values (tokens.json), not copies: the surface of each colorway, the accent, live.
const COLOURS = [
  { name: 'BONE', hex: tokens.colorways.bone.s },
  { name: 'GRAPHITE', hex: tokens.colorways.graphite.s },
  { name: 'ACCENT', hex: tokens.shared.orange },
  { name: 'LIVE', hex: tokens.shared.green },
];

export function Foundations() {
  const frame = useCurrentFrame();
  const scale = mix(1, 1.03, sweep(frame, frameAt(3), frameAt(5)));
  const { dots, score } = displayAt(frame);
  // The spring draws itself in the half beat after its chip lands, before the shot cuts away.
  const springDrawn = sweep(frame, KICKS[7], (KICKS[7] + frameAt(5)) / 2);
  const row: ReactNode[] = [
    ...COLOURS.map((c) => <Swatch key={c.name} hex={c.hex} label={c.name} />),
    <Chip key="space" label="SPACE">
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ width: 9, height: 9, background: 'var(--mu-ink2)', borderRadius: 2 }} />
        <svg width={16} height={9} viewBox="0 0 16 9"><path d="M1 1.5v6M15 1.5v6M1 4.5h14" stroke="var(--mu-ink3)" strokeWidth={1} fill="none" /></svg>
        <div style={{ width: 9, height: 9, background: 'var(--mu-ink2)', borderRadius: 2 }} />
      </div>
    </Chip>,
    <Chip key="radius" label="RADIUS">
      <div style={{ width: 24, height: 24, borderTop: '2.5px solid var(--mu-ink2)', borderLeft: '2.5px solid var(--mu-ink2)', borderTopLeftRadius: 14 }} />
    </Chip>,
    <Chip key="type" label="TYPE">
      <span style={{ font: '600 24px/1 "Geist Variable", sans-serif', color: 'var(--mu-ink)', letterSpacing: -0.5 }}>Aa</span>
    </Chip>,
    <Chip key="spring" label="SPRING">
      <SpringGlyph drawn={springDrawn} />
    </Chip>,
  ];
  return (
    <AbsoluteFill data-mu-colorway="graphite" style={{ background: 'var(--mu-page-dark)', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ zoom: 2.55, transform: `scale(${scale})` }}>
        <div data-mu-colorway="bone" style={{ display: 'grid', gap: 18 }}>
          <Surface material="raise" radius="hero" style={{ padding: 12 }}>
            <div className="material-well" style={{ borderRadius: 14, padding: 10, position: 'relative', display: 'grid', justifyItems: 'center' }}>
              <DotDisplay cols={COLS} rows={ROWS} dots={dots} inks={INKS} />
              <span className="type-pixel text-ink" style={{ position: 'absolute', left: 16, top: 8 }}>{String(score).padStart(4, '0')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 4px 0' }}>
              <Label variant="engraved">Foundations</Label>
              <Label variant="small">Score · one per blip</Label>
            </div>
          </Surface>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between' }}>
            {row.map((t, i) => (
              <Landing key={i} at={KICKS[i]}>{t}</Landing>
            ))}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}
