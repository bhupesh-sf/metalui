import type { ReactNode } from 'react';
import { Folder, Label, LinkCard, Surface, WeatherTile, type FolderHue, type FolderPeek } from '@unlocalhosted/metalui';
import { frameAt } from '../time';
import type { Fall } from '../film/stage';
import { DROP1_AT } from './Components';

/* ─────────────────────────────────────────────────────────
 * SHOT 7 · DROP 1: OBJECTS (video bars 13-16), where the fill's whip landed
 *
 *   bar 13.1   the biggest hit so far: the whole table of objects slams down at once, four folders
 *              in four colours, a weather tile and a link card, the biggest ripple and jolt yet
 *   kicks      objects hold a person's stuff, so the rain is cards: one lands in the middle on
 *              every kick, and on the next kick the one before hops along an arc into a folder.
 *              The folder opens as it comes, and on the landing the card joins its peeks and its
 *              count goes up
 *   bar 16.4   everything jumps together at the end of the phrase
 * ───────────────────────────────────────────────────────── */

const DX = DROP1_AT.x;
const B = (bar: number, beat: number, step = 0) => frameAt(bar, beat, step);
const BEAT = B(13, 2) - B(13, 1);

/** The drop: everything lands on the downbeat of bar 13. */
export const DROP1 = B(13, 1);
export const DROP1_END = B(16, 4);

interface Home {
  id: string;
  name: string;
  hue: FolderHue;
  x: number;
  y: number;
  count: number;
}

const FOLDERS: Home[] = [
  { id: 'f-amber', name: 'Ideas', hue: 'amber', x: DX - 470, y: -220, count: 4 },
  { id: 'f-blue', name: 'Launch', hue: 'blue', x: DX + 470, y: -220, count: 9 },
  { id: 'f-green', name: 'Photos', hue: 'green', x: DX - 470, y: 250, count: 23 },
  { id: 'f-violet', name: 'Notes', hue: 'violet', x: DX + 470, y: 250, count: 12 },
];

// The cards that rain: each a picture, landing in the middle on a kick and flying home on the next.
const THUMBS = [
  'linear-gradient(135deg, #ffb07a, #ff6b3d)',
  'linear-gradient(135deg, #9cc2ff, #2457f2)',
  'linear-gradient(135deg, #b8f0cf, #3fb97a)',
  'linear-gradient(135deg, #d9c8ff, #8f6ef0)',
  'linear-gradient(135deg, #ffe39c, #e4a52e)',
  'linear-gradient(135deg, #ffc1cf, #e0506f)',
  'linear-gradient(135deg, #c6f1ff, #3fa7d6)',
  'linear-gradient(135deg, #f1f1ee, #b9b9b4)',
];
const KICKS = [B(13, 2), B(13, 3), B(13, 4), B(14, 1), B(14, 2), B(14, 3), B(14, 4), B(15, 1)];
const SPOTS: [number, number][] = [[-120, -40], [140, 40], [-60, 60], [100, -60], [-140, 30], [120, -20], [0, 70], [-40, -60]];

const CARDS = KICKS.map((at, i) => ({ id: `card-${i}`, at, home: FOLDERS[i % FOLDERS.length], arrive: at + BEAT, thumb: THUMBS[i], x: DX + SPOTS[i][0], y: SPOTS[i][1] }));

export interface ObjectPiece {
  id: string;
  at: number;
  fall: Fall;
  x: number;
  y: number;
  zoom: number;
  size: [number, number];
  turn?: number;
  move?: { to: { x: number; y: number }; at: number; arc?: number };
  until?: number;
  draw: (frame: number) => ReactNode;
}

/** A folder's contents at a frame: the cards that have arrived, its count, and whether it's open. */
function folderAt(home: Home, frame: number) {
  const mine = CARDS.filter((c) => c.home === home);
  const arrived = mine.filter((c) => frame >= c.arrive);
  const coming = mine.some((c) => frame >= c.arrive - Math.round(BEAT / 2) && frame < c.arrive + 4);
  const peeks: FolderPeek[] = arrived.slice(-3).map((c) => ({ id: c.id, thumb: c.thumb }));
  return { peeks, count: home.count + arrived.length, open: coming };
}

/** A card: a raised plate with its picture, the thing a person keeps. */
function Card({ thumb }: { thumb: string }) {
  return (
    <Surface material="raise" radius="card" style={{ width: 64, height: 50, padding: 4 }}>
      <div style={{ width: '100%', height: '100%', borderRadius: 7, background: thumb }} />
    </Surface>
  );
}

export const OBJECT_PIECES: ObjectPiece[] = [
  ...FOLDERS.map((h): ObjectPiece => ({
    id: h.id, at: DROP1, fall: 'heavy', x: h.x, y: h.y, zoom: 1.4, size: [290, 210], turn: h.x < DX ? 8 : -8,
    draw: (f) => {
      const s = folderAt(h, f);
      return <Folder name={h.name} count={s.count} hue={h.hue} peeks={s.peeks} open={s.open} />;
    },
  })),
  { id: 'o-weather', at: DROP1, fall: 'heavy', x: DX, y: -330, zoom: 1.4, size: [260, 260], draw: () => <WeatherTile kind="clear" temp="24°" name="Sunny" meta="Launch day" clock={11} running={false} aria-label="Launch day, sunny, 24°" /> },
  { id: 'o-link', at: DROP1, fall: 'heavy', x: DX, y: 360, zoom: 1.2, size: [360, 200], draw: () => <LinkCard href="https://metalui.dev/components" /> },
  ...CARDS.map((c): ObjectPiece => ({
    id: c.id, at: c.at, fall: 'light', x: c.x, y: c.y, zoom: 2.4, size: [170, 130], turn: (c.x - DX) / 6,
    move: { to: { x: c.home.x, y: c.home.y - 40 }, at: c.arrive, arc: 260 }, until: c.arrive,
    draw: () => <Card thumb={c.thumb} />,
  })),
];

/** The place's name, printed on the canvas above the set from the drop on. */
export function ObjectsTitle() {
  return <Label variant="engraved">Objects · they hold your stuff</Label>;
}
