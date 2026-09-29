import type { ReactNode } from 'react';
import { Button, DotDisplay, IconButton, Kbd, Label, SelectionFrame, SizeReadout, StatusBadge, Surface, Switch, type DotInk } from '@unlocalhosted/metalui';
import events from '../events.generated.json';
import { FPS, at, frameAt } from '../time';
import type { Fall } from '../film/stage';
import { IconAct, actTime } from '../film/parts';

/* ─────────────────────────────────────────────────────────
 * SHOT 2 · FOUNDATIONS (video bars 3-4), on the same table as the opener
 *
 *   4.05s  bar 3   the camera has whipped across the table; the arcade readout slams down on the
 *                  downbeat. Every blip reveals the next pixels of a row of invaders (drawn for
 *                  this film) and adds to the score; they march a dot on every kick
 *   kicks          eight foundations land, one per kick, each as the real component it shapes,
 *                  with its name engraved under it: bone and graphite as caps, the accent key, the
 *                  live badge, space measured between two keys, radius in a selection frame,
 *                  the three type faces, and a switch that flips on the part spring
 * ───────────────────────────────────────────────────────── */

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

export const KICKS = [3, 4].flatMap((bar) => [1, 2, 3, 4].map((beat) => frameAt(bar, beat)));
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

/** The arcade readout: a bone plate with the dot display sunk into it and the score. */
export function ReadoutPlate({ frame }: { frame: number }) {
  const { dots, score } = displayAt(frame);
  return (
    <Surface material="raise" radius="hero" style={{ padding: 12, width: 700 }}>
      <div className="material-well" style={{ borderRadius: 14, padding: 10, position: 'relative', display: 'grid', justifyItems: 'center' }}>
        <DotDisplay cols={COLS} rows={ROWS} dots={dots} inks={INKS} />
        <span className="type-pixel text-ink" style={{ position: 'absolute', left: 16, top: 8 }}>{String(score).padStart(4, '0')}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 4px 0' }}>
        <Label variant="engraved">Foundations</Label>
        <Label variant="small">Score · one per blip</Label>
      </div>
    </Surface>
  );
}

/** A foundation, shown by the component it shapes, its name engraved under it. */
/** Captions read at one size across the row whatever the specimen's zoom: pass the piece's zoom. */
const CAPTION_ZOOM = 3;
function Specimen({ caption, zoom = CAPTION_ZOOM, children }: { caption: string; zoom?: number; children: ReactNode }) {
  return (
    <div style={{ display: 'grid', justifyItems: 'center', gap: 10 }}>
      <div style={{ minHeight: 64, display: 'grid', placeItems: 'center' }}>{children}</div>
      <Label variant="engraved" style={{ zoom: CAPTION_ZOOM / zoom }}>{caption}</Label>
    </div>
  );
}

export interface FoundationPiece {
  id: string;
  at: number;
  fall: Fall;
  x: number;
  y: number;
  zoom: number;
  size: [number, number];
  draw: (frame: number) => ReactNode;
}

/** Where the foundations sit on the table: to the right of the opener's kit. */
export const FOUNDATIONS_AT = { x: 2400, y: 0 };
const X = FOUNDATIONS_AT.x;
const K2 = KICKS; // the eight kicks of bars 3-4
const AND = (i: number) => Math.round((K2[i] + (K2[i + 1] ?? frameAt(5))) / 2);

export const FOUNDATION_PIECES: FoundationPiece[] = [
  { id: 'readout', at: K2[0], fall: 'heavy', x: X, y: -170, zoom: 1.5, size: [820, 330], draw: (f) => <ReadoutPlate frame={f} /> },
  { id: 'bone', at: K2[0], fall: 'light', x: X - 600, y: 230, zoom: 3.0, size: [200, 120], draw: () => <Specimen zoom={3.0} caption="Buttons"><Button cap="standard">Continue</Button></Specimen> },
  { id: 'graphite', at: K2[1], fall: 'light', x: X - 200, y: 230, zoom: 2.4, size: [320, 120], draw: () => <Specimen zoom={2.4} caption="Colour"><div style={{ display: 'flex', gap: 8 }}><Button cap="standard">Bone</Button><div data-mu-colorway="graphite"><Button cap="standard">Graphite</Button></div></div></Specimen> },
  {
    // Three tools, each playing its act on the beat after the one before.
    id: 'icons', at: K2[2], fall: 'light', x: X + 200, y: 230, zoom: 2.4, size: [300, 150], draw: (f) => (
      <Specimen zoom={2.4} caption="Icons">
        <div style={{ display: 'flex', gap: 6 }}>
          {(['select', 'pen', 'rectangle'] as const).map((name, k) => (
            <IconButton key={name} variant="tool" label={name} icon={<IconAct name={name} t={actTime(f, K2[3 + k])} size={20} />} />
          ))}
        </div>
      </Specimen>
    ),
  },
  { id: 'live', at: K2[3], fall: 'light', x: X + 600, y: 230, zoom: 3.0, size: [200, 110], draw: () => <Specimen zoom={3.0} caption="Status"><StatusBadge led="live">Live</StatusBadge></Specimen> },
  {
    id: 'space', at: K2[4], fall: 'light', x: X - 600, y: 580, zoom: 2.7, size: [260, 130], draw: () => (
      <Specimen zoom={2.7} caption="Spacing">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Kbd>⌘</Kbd>
          <SizeReadout value="16" unit="px" />
          <Kbd>K</Kbd>
        </div>
      </Specimen>
    ),
  },
  {
    id: 'radius', at: K2[5], fall: 'heavy', x: X - 200, y: 580, zoom: 2.7, size: [220, 150], draw: () => (
      <Specimen zoom={2.7} caption="Radius">
        <div style={{ position: 'relative', width: 96, height: 60 }}>
          <Surface material="raise" style={{ position: 'absolute', inset: 0, borderRadius: 14 }} />
          <SelectionFrame state="selected" radius={14} readout={false} entrance={false} />
        </div>
      </Specimen>
    ),
  },
  {
    id: 'type', at: K2[6], fall: 'light', x: X + 200, y: 580, zoom: 2.7, size: [220, 150], draw: () => (
      <Specimen zoom={2.7} caption="Typography">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, color: 'var(--mu-ink)' }}>
          <span style={{ font: '600 34px/1 "Geist Variable", sans-serif', letterSpacing: -0.8 }}>Aa</span>
          <span style={{ font: '500 22px/1 "Martian Mono Variable", monospace' }}>Aa</span>
          <span className="type-pixel">Aa</span>
        </div>
      </Specimen>
    ),
  },
  { id: 'spring', at: K2[7], fall: 'light', x: X + 600, y: 580, zoom: 3.3, size: [180, 110], draw: (f) => <Specimen zoom={3.3} caption="Motion"><Switch checked={f >= AND(7) - 6} aria-label="spring" /></Specimen> },
];
