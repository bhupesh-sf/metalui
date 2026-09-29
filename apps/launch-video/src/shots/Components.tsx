import type { ReactNode } from 'react';
import { Button, Checkbox, Field, Label, Slider, StatusBadge, Switch, Switcher, TabList, Tabs, ToolButton, Toolbar } from '@unlocalhosted/metalui';
import { frameAt } from '../time';
import type { Fall } from '../film/stage';
import { IconAct, actTime } from '../film/parts';
import { PARTS_AT } from './Parts';

/* ─────────────────────────────────────────────────────────
 * SHOTS 5-6 · COMPONENTS, THEN THE FILL (video bars 9-12), around the new button
 *
 *   bar 9.1    the verse slams in: the fog is gone, the latched button springs up, and the library
 *              rains down around it, two components a kick, each named
 *   off-beats  every component does its job on the "and" after it lands: the switch flips, the
 *              box ticks, the slider steps across its detents a sixteenth at a time, tabs and the
 *              day/week/month switcher move a beat at a time, a field types, a status goes live,
 *              and a toolbar's tools latch one per beat, each glyph playing its act
 *   bar 11.4   everything jumps together at the end of the phrase
 *   bar 12     the fill (song bar 16): a stop on the sixth sixteenth freezes it all; on the hole of
 *              beat 3 the whole set lifts off the table, holding its breath; the swoosh of beat 4
 *              whips the camera away to drop 1
 * ───────────────────────────────────────────────────────── */

const CX = PARTS_AT.x;
const B = (bar: number, beat: number, step = 0) => frameAt(bar, beat, step);
const SIXTEENTH = (B(9, 2) - B(9, 1)) / 4;
const BEAT = B(9, 2) - B(9, 1);
const AND = (bar: number, beat: number) => B(bar, beat, 2);

/** The verse's first downbeat: the button releases and the rain starts. */
export const SLAM = B(9, 1);
/** The fill's moments (bar 12): the stop, the hole, the swoosh. */
export const FILL = { stop: B(12, 2, 1), hole: B(12, 3), swoosh: B(12, 4) };
/**
 * The rave (bars 10.3-11.3): once everything has landed, the set dances on every beat, a hop in a
 * wave from left to right and a rock that swaps sides, and the theme flips each beat, bone to
 * graphite and back, the table going dark with it. It lands back on bone for the phrase's jump.
 */
export const RAVE_BEATS = [B(10, 3), B(10, 4), B(11, 1), B(11, 2), B(11, 3)];
const RAVE_END = B(11, 4);
export const raveTheme = (f: number): 'bone' | 'graphite' => {
  const k = RAVE_BEATS.filter((b) => f >= b).length;
  return f < RAVE_END && k % 2 === 1 ? 'graphite' : 'bone';
};
/** A piece's dance: the wave reaches it by where it stands, up to a sixteenth late across the set. */
export const raveOf = (x: number) => {
  const late = Math.round(((x - CX + 700) / 1400) * SIXTEENTH);
  return {
    hops: RAVE_BEATS.map((b) => ({ at: b + late, height: 80, frames: 16 })),
    sway: RAVE_BEATS.map((b, i) => ({ at: b + late, deg: i % 2 ? -10 : 10, frames: Math.round(BEAT * 0.9) })),
  };
};

/** The set's name above it; through the rave it names the theme, so every flip says what it is. */
export function ComponentsTitle({ frame }: { frame: number }) {
  const rave = frame >= RAVE_BEATS[0] && frame < RAVE_END;
  const text = !rave ? 'Components · you operate them' : raveTheme(frame) === 'graphite' ? 'Dark theme' : 'Light theme';
  return <Label variant="engraved">{text}</Label>;
}

/** Where the fill's whip goes: drop 1's part of the table. */
export const DROP1_AT = { x: CX + 3400, y: 0 };

/** Sixteenths or beats since a frame, for things that step on the grid. */
const steps = (f: number, from: number, size: number) => (f < from ? -1 : Math.floor((f - from) / size));

export interface ComponentPiece {
  id: string;
  at: number;
  fall: Fall;
  x: number;
  y: number;
  zoom: number;
  size: [number, number];
  draw: (frame: number) => ReactNode;
}

/** A component, named under it. At this layer the names are the categories. */
function Named({ name, zoom, children }: { name: string; zoom: number; children: ReactNode }) {
  return (
    <div style={{ display: 'grid', justifyItems: 'center', gap: 10 }}>
      <div style={{ minHeight: 30, display: 'grid', placeItems: 'center' }}>{children}</div>
      <Label variant="engraved" style={{ zoom: 4.0 / zoom }}>{name}</Label>
    </div>
  );
}

const TABS = [{ value: 'code', label: 'Code' }, { value: 'design', label: 'Design' }, { value: 'docs', label: 'Docs' }];
const VIEWS = [{ value: 'day', label: 'Day' }, { value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }];
const TYPED = 'Ship the launch';
const TOOLS = [
  { name: 'select', label: 'Select' },
  { name: 'note', label: 'Note' },
  { name: 'draw', label: 'Draw' },
  { name: 'tidy', label: 'Tidy' },
] as const;
const noop = () => {};

export const COMPONENT_PIECES: ComponentPiece[] = [
  // Kick 1: the slam.
  { id: 'c-switch', at: B(9, 1), fall: 'light', x: CX - 660, y: -110, zoom: 3.6, size: [170, 110], draw: (f) => <Named zoom={3.6} name="Switch"><Switch checked={steps(f, AND(9, 1), 2 * BEAT) % 2 === 0} aria-label="Switch" /></Named> },
  { id: 'c-check', at: B(9, 1), fall: 'light', x: CX + 660, y: -110, zoom: 4.4, size: [120, 120], draw: (f) => <Named zoom={4.4} name="Checkbox"><Checkbox checked={f >= AND(9, 1) && steps(f, AND(9, 1), 4 * BEAT) % 2 === 0} aria-label="Checkbox" /></Named> },
  // Kick 2
  {
    id: 'c-slider', at: B(9, 2), fall: 'heavy', x: CX - 560, y: 370, zoom: 2.8, size: [300, 110], draw: (f) => {
      // A detent a sixteenth, up the track and back.
      const n = Math.max(0, steps(f, AND(9, 2), SIXTEENTH));
      const v = 20 + 5 * (Math.floor(n / 16) % 2 === 0 ? n % 16 : 16 - (n % 16));
      return <Named zoom={2.8} name="Slider"><div style={{ width: 150 }}><Slider.Root value={v} min={0} max={100} step={5} onValueChange={noop}><Slider.Track /><Slider.Marks at={[0.2, 0.5, 0.8]} /><Slider.Knob aria-label="Amount" /></Slider.Root></div></Named>;
    },
  },
  { id: 'c-tabs', at: B(9, 2), fall: 'light', x: CX + 620, y: 160, zoom: 2.6, size: [300, 110], draw: (f) => <Named zoom={2.6} name="Tabs"><Tabs value={TABS[Math.max(0, steps(f, AND(9, 2), BEAT)) % 3].value}><TabList aria-label="Sections" items={TABS} /></Tabs></Named> },
  // Kick 3
  { id: 'c-switcher', at: B(9, 3), fall: 'heavy', x: CX, y: -380, zoom: 2.8, size: [300, 110], draw: (f) => <Named zoom={2.8} name="Switcher"><Switcher aria-label="View" value={VIEWS[(1 + Math.max(0, steps(f, AND(9, 3), BEAT))) % 3].value} options={VIEWS} /></Named> },
  {
    id: 'c-field', at: B(9, 3), fall: 'heavy', x: CX, y: 380, zoom: 2.4, size: [360, 110], draw: (f) => (
      <Named zoom={2.4} name="Field">
        <Field style={{ width: 200 }}>
          <Field.Input aria-label="Launch" readOnly value={TYPED.slice(0, Math.max(0, 1 + steps(f, AND(9, 3), SIXTEENTH)))} placeholder="Type a title" />
        </Field>
      </Named>
    ),
  },
  // Kick 4
  { id: 'c-status', at: B(9, 4), fall: 'light', x: CX - 640, y: 150, zoom: 3.0, size: [220, 100], draw: (f) => <Named zoom={3.0} name="Status"><StatusBadge led={f >= AND(9, 4) ? 'live' : 'waiting'}>{f >= AND(9, 4) ? 'Live' : 'Syncing'}</StatusBadge></Named> },
  {
    id: 'c-toolbar', at: B(9, 4), fall: 'heavy', x: CX + 600, y: -360, zoom: 2.3, size: [320, 110], draw: (f) => {
      // One tool latches a beat, its glyph playing its act as it does.
      const k = Math.max(0, steps(f, B(10, 1), BEAT)) % TOOLS.length;
      const since = f < B(10, 1) ? -1 : B(10, 1) + Math.floor((f - B(10, 1)) / BEAT) * BEAT;
      return (
        <Named zoom={2.3} name="Toolbar">
          <Toolbar aria-label="Tools">
            {TOOLS.map((t, i) => (
              <ToolButton key={t.name} label={t.label} pressed={since >= 0 && i === k} icon={<IconAct name={t.name} t={since >= 0 && i === k ? actTime(f, since) : 0} size={16} />} />
            ))}
          </Toolbar>
        </Named>
      );
    },
  },
  // Kick 5: two buttons, the dark cap and the red one, each going down on its off-beat.
  { id: 'c-primary', at: B(10, 1), fall: 'heavy', x: CX - 600, y: -360, zoom: 2.8, size: [320, 120], draw: (f) => <Named zoom={2.8} name="Button"><Button cap="primary" className={f >= AND(10, 1) && f < B(10, 2) ? 'recipe-button-primary-pressed' : undefined}>Continue</Button></Named> },
  { id: 'c-danger', at: B(10, 2), fall: 'heavy', x: CX + 600, y: 380, zoom: 2.7, size: [300, 120], draw: (f) => <Named zoom={2.7} name="Button"><Button cap="destructive" className={f >= AND(10, 2) && f < B(10, 3) ? 'recipe-button-destructive-pressed' : undefined}>Delete</Button></Named> },
];

/** Everything in the set: the new button and the rain around it, for the phrase's jump and the fill. */
export const SET_AT = { x: CX, y: 0 };
