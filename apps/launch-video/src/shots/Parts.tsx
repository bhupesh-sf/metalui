import type { ReactNode } from 'react';
import { IconButton, Label, Led, Surface, Well } from '@unlocalhosted/metalui';
import { frameAt } from '../time';
import type { Fall } from '../film/stage';
import { IconAct, actTime } from '../film/parts';

/* ─────────────────────────────────────────────────────────
 * SHOTS 3-4 · PARTS, THEN THE DROPOUT (video bars 5-8), further along the same table
 *
 *   bar 5      the camera has whipped here on the downbeat. The pumping synths make the table
 *              breathe on every kick, and the parts of one control land a beat apart, spread
 *              like an exploded drawing, each named: a well, a keycap, a glyph, an LED
 *   bar 6.1    the label lands
 *   bar 6.3    the five parts hop along arcs into one place and snap together with one clack:
 *              they are a tool button now, the real component
 *   bar 6.4    its pen glyph plays its act: the component is alive
 *   bars 7-8   the bass drains away: the rest of the canvas fogs out and the camera closes in
 *   bar 8      the library's select pointer glides in and plays its act; its click lands on the
 *              last sixteenth of the bar and the button goes down and holds, for the verse to
 *              release on the downbeat of bar 9
 * ───────────────────────────────────────────────────────── */

export const PARTS_AT = { x: 5200, y: 0 };
const PX = PARTS_AT.x;
const B = (bar: number, beat: number, step = 0) => frameAt(bar, beat, step);

/** The five parts meet here, on the third beat of bar 6. */
export const ASSEMBLE = B(6, 3);
/** The pointer's click: the last sixteenth of bar 8; the button springs up on the verse's downbeat. */
export const CLICK = B(8, 4, 3);
/** The select act's click comes this far into it (the icon catalog: its click track peaks at 340 ms). */
const CLICK_IN_ACT = Math.round(0.34 * 60);

export interface PartPiece {
  id: string;
  at: number | null;
  fall: Fall;
  x: number;
  y: number;
  zoom: number;
  size: [number, number];
  move?: { to: { x: number; y: number }; at: number; arc?: number };
  from?: number;
  until?: number;
  hops?: { at: number; height: number; frames: number }[];
  draw: (frame: number) => ReactNode;
}

/** A part, named under it: the parts layer's own categories. */
function Part({ caption, zoom, children }: { caption: string; zoom: number; children: ReactNode }) {
  return (
    <div style={{ display: 'grid', justifyItems: 'center', gap: 8 }}>
      <div style={{ minHeight: 44, display: 'grid', placeItems: 'center' }}>{children}</div>
      <Label variant="engraved" style={{ zoom: 3.2 / zoom }}>{caption}</Label>
    </div>
  );
}

const TO = { x: PX, y: 0 };
const into = (arc: number) => ({ to: TO, at: ASSEMBLE, arc });

const RAW: PartPiece[] = [
  { id: 'part-well', at: B(5, 1), fall: 'heavy', x: PX - 640, y: 20, zoom: 4.6, size: [220, 200], move: into(80), until: ASSEMBLE, draw: () => <Part zoom={4.6} caption="Well"><Well variant="track" radius="field" style={{ width: 52, height: 52 }} /></Part> },
  { id: 'part-cap', at: B(5, 2), fall: 'light', x: PX - 320, y: 20, zoom: 4.6, size: [220, 220], move: into(140), until: ASSEMBLE, draw: () => <Part zoom={4.6} caption="Keycap"><div data-mu-colorway="graphite"><Surface material="graphite-plain" radius="card" style={{ width: 40, height: 40 }} /></div></Part> },
  { id: 'part-glyph', at: B(5, 3), fall: 'light', x: PX, y: 20, zoom: 4.6, size: [180, 180], move: into(200), until: ASSEMBLE, draw: () => <Part zoom={4.6} caption="Glyph"><IconAct name="pen" t={0} size={26} /></Part> },
  { id: 'part-led', at: B(5, 4), fall: 'light', x: PX + 300, y: 20, zoom: 4.6, size: [150, 150], move: into(160), until: ASSEMBLE, draw: () => <Part zoom={4.6} caption="LED"><div style={{ zoom: 2.4 }}><Led kind="live" /></div></Part> },
  { id: 'part-label', at: B(6, 1), fall: 'light', x: PX + 620, y: 20, zoom: 4.6, size: [200, 150], move: into(100), until: ASSEMBLE, draw: () => <Part zoom={4.6} caption="Label"><Label variant="engraved" style={{ fontSize: 14 }}>Pen</Label></Part> },
  {
    // The parts are one: a real tool button, popping as they snap; latched on the click.
    id: 'component', at: null, fall: 'heavy', x: PX, y: 0, zoom: 4.2, size: [260, 260], from: ASSEMBLE, hops: [{ at: ASSEMBLE, height: 46, frames: 16 }, { at: B(9, 1), height: 90, frames: 20 }],
    draw: (f) => (
      <div style={{ display: 'grid', justifyItems: 'center', gap: 10 }}>
        <IconButton variant="tool" label="Pen" pressed={f >= CLICK && f < B(9, 1)} icon={<IconAct name="pen" t={actTime(f, B(6, 4))} size={20} />} />
        <Label variant="engraved" style={{ zoom: 3 / 4.2 }}>Icon</Label>
      </div>
    ),
  },
];

/** Every part already down hops when the next one lands, the nearer the higher. */
export const PART_PIECES: PartPiece[] = RAW.map((p) => ({
  ...p,
  hops: [
    ...(p.hops ?? []),
    ...RAW.filter((q) => q.at !== null && p.at !== null && q.at > p.at && q.at < ASSEMBLE && Math.abs(q.x - p.x) < 700).map((q) => ({ at: q.at!, height: 12 + 26 * (1 - Math.abs(q.x - p.x) / 700), frames: 13 })),
  ],
}));

/** The select pointer for the click: where it hovers over the table, and how far into its act. */
export function pointerAt(frame: number) {
  const start = B(7, 3);
  const arrive = CLICK - CLICK_IN_ACT;
  const t = Math.max(0, Math.min(1, (frame - start) / (arrive - start)));
  const e = 1 - (1 - t) ** 3; // glides in and slows as it arrives
  return {
    visible: frame >= start,
    // The pointer's tip is its top-left: it arrives with the tip on the button's face.
    x: PX + 520 - 545 * e,
    y: 420 - 455 * e,
    act: actTime(frame, arrive),
  };
}

/** How fogged the rest of the canvas is: nothing until the bass drains in bar 7, most of it by bar 8. */
export const fogAt = (frame: number) => (frame >= B(9, 1) ? 0 : Math.max(0, Math.min(1, (frame - B(7, 1)) / (B(8, 1) - B(7, 1)))) * 0.88); // gone on the verse's slam
