import * as React from 'react';
import { useDialKit } from 'dialkit';
import { Field, FormField, NumberField, SwapText, Well, haptic, useReducedMotion } from '@unlocalhosted/metalui';
import { SPRINGS, type SpringName } from '../../../../../packages/metalui/src/motion/springs.generated';
import { SPRING_NAMES, springVars } from '../../ui/springTuning';
import reactSource from '../../../../../packages/metalui/src/components/number-field/number-field.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import swiftSource from '../../../../../swift/Sources/MetalUI/Components/MetalNumberField.swift?raw';
import agentSource from '../../../../../packages/metalui/src/components/number-field/number-field.agent.md?raw';
import { ComponentPage } from '../../ui/ComponentPage';

const COLUMN = 'grid w-full max-w-[360px] gap-16';
const ROW = 'flex flex-wrap items-end gap-16';
const NOTE = 'm-0 type-meta text-ink3';

/* ─────────────────────────────────────────────────────────
 * DRUM TUNER: the page's DialKit panel
 *
 *   turn     the drum's spring and its travel (one grid step)
 *   refusal  the spring of the shake past a limit
 * Springs are the system's classes; slow stretches every duration.
 * ───────────────────────────────────────────────────────── */

function DrumTuner() {
  const [value, setValue] = React.useState<number | null>(3);
  const d = useDialKit('Number drum', {
    turn: { type: 'select', options: SPRING_NAMES, default: 'settle' },
    refusal: { type: 'select', options: SPRING_NAMES, default: 'refusal' },
    travel: [4, 0, 12],
    slow: [1, 1, 10],
    up: { type: 'action', label: 'Step up' },
    down: { type: 'action', label: 'Step down' },
  }, {
    onAction: (action) => {
      const key = action === 'up' ? 'ArrowUp' : action === 'down' ? 'ArrowDown' : null;
      const input = document.querySelector<HTMLInputElement>('[data-testid=number-drum-tuner] input');
      if (key && input) { input.focus(); input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true })); }
    },
  });
  const vars = {
    ...springVars('settle', d.turn as SpringName, d.slow),
    ...springVars('refusal', d.refusal as SpringName, d.slow),
    '--mu-motion-step': `${d.travel}px`,
  } as React.CSSProperties;
  return (
    <div data-testid="number-drum-tuner" className="flex justify-center" style={{ ...vars, zoom: 1.6 }}>
      <NumberField label="Tuned copies" value={value} onValueChange={setValue} min={1} max={9} />
    </div>
  );
}

/* Sizes: each number field beside a Field of the same size, so the wells sit level. */
function Sizes() {
  return (
    <div className="grid gap-20">
      {(['large', 'regular', 'compact'] as const).map((size) => (
        <div key={size} className="flex items-center gap-12" data-testid={`nf-size-${size}`}>
          <Field size={size} style={{ width: 200 }}><Field.Input defaultValue="Poster, A2" aria-label={`Name (${size})`} /></Field>
          <NumberField size={size} aria-label={`Copies (${size})`} defaultValue={2} min={1} max={50} smallStep={1} />
        </div>
      ))}
    </div>
  );
}

function Steps() {
  return (
    <div className={COLUMN}>
      <NumberField label="Opacity" defaultValue={80} min={0} max={100} smallStep={0.1} largeStep={10} unit="%" />
      <p className={NOTE}>Hold ⌥ for tenths or ⇧ for tens with the pointer over the field (or while you are in it): the keycaps say the step they will take. The arrow keys take the same modifiers.</p>
    </div>
  );
}

function Units() {
  return (
    <div className={ROW}>
      <NumberField label="Width" defaultValue={240} min={0} max={4000} unit="px" />
      <NumberField label="Rotation" defaultValue={45} min={-180} max={180} step={15} unit="°" />
      <NumberField label="Price" defaultValue={1200} min={0} step={50} largeStep={500} size="regular" format={{ style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }} locale="de-DE" />
    </div>
  );
}

function SoftLimits() {
  const [seats, setSeats] = React.useState<number | null>(140);
  return (
    <div className={COLUMN}>
      <NumberField label="Seats" value={seats} onValueChange={setSeats} min={1} max={100} allowOutOfRange />
      <p className={NOTE}>Type 140 and leave the field: it stays, says the limit, and the form won't take it. + is out, − takes it back to 100.</p>
    </div>
  );
}

function Defaults() {
  const [size, setSize] = React.useState<number | null>(18);
  return (
    <div className={COLUMN}>
      <NumberField label="Font size" value={size} onValueChange={setSize} defaultValue={16} min={8} max={72} unit="pt" />
      <p className={NOTE}>Off its default (16), the changed mark hangs before the label. Double-click the label, or ⌘-click a keycap, and it turns back.</p>
    </div>
  );
}

const LAYERS = [{ name: 'Sky', opacity: 100 }, { name: 'Haze', opacity: 40 }, { name: 'Grain', opacity: 15 }];

function Mixed() {
  const [layers, setLayers] = React.useState(LAYERS);
  const values = new Set(layers.map((l) => l.opacity));
  const clamp = (n: number) => Math.min(100, Math.max(0, n));
  return (
    <div className={COLUMN}>
      <NumberField
        label="Opacity (3 layers)"
        unit="%"
        min={0}
        max={100}
        smallStep={1}
        mixed={values.size > 1}
        value={values.size > 1 ? null : layers[0].opacity}
        onStep={(amount) => setLayers((ls) => ls.map((l) => ({ ...l, opacity: clamp(l.opacity + amount) })))}
        onValueChange={(v) => v != null && setLayers((ls) => ls.map((l) => ({ ...l, opacity: v })))}
      />
      <ul className="m-0 p-0 list-none grid gap-4 type-readout text-ink2" data-testid="nf-layers">
        {layers.map((l) => <li key={l.name}>{l.name} <span className="text-ink">{l.opacity}%</span></li>)}
      </ul>
      <button type="button" className="justify-self-start type-meta text-ink3 underline bg-transparent border-0 p-0 cursor-pointer" onClick={() => setLayers(LAYERS)}>Put the layers back</button>
    </div>
  );
}

function Inspector() {
  return (
    <Well variant="field" radius="region" className="grid grid-cols-2 gap-8 p-12 w-max" data-testid="nf-inspector">
      <NumberField kind="inspector" size="compact" label="X" aria-label="X" defaultValue={120} />
      <NumberField kind="inspector" size="compact" label="Y" aria-label="Y" defaultValue={48} />
      <NumberField kind="inspector" size="compact" label="W" aria-label="Width" defaultValue={320} min={0} />
      <NumberField kind="inspector" size="compact" label="H" aria-label="Height" defaultValue={200} min={0} />
      <NumberField kind="inspector" size="compact" label="∠" aria-label="Rotation" defaultValue={0} min={-180} max={180} unit="°" />
      <NumberField kind="inspector" size="compact" label="R" aria-label="Corner radius" defaultValue={8} min={0} max={64} />
    </Well>
  );
}

function Wheel() {
  return (
    <div className={COLUMN}>
      <NumberField label="Zoom" defaultValue={100} min={10} max={400} step={10} unit="%" allowWheelScrub />
      <p className={NOTE}>Click into the field first: the wheel steps it only while it has focus, so scrolling the page past it never changes it.</p>
    </div>
  );
}

function Arithmetic() {
  return (
    <div className={COLUMN}>
      <NumberField label="Width" defaultValue={240} min={0} max={4000} unit="px" />
      <FormField name="gutter">
        <NumberField label="Gutter" defaultValue={12} min={0} max={96} unit="px" />
        <FormField.Description>Inside a form field the readback sits under the control, above the description.</FormField.Description>
      </FormField>
      <p className={NOTE}>Type +10, *2, /3 or =8*12 and the result shows under the field; Enter (or leaving) commits it, Esc puts the value back. What isn't a number shakes.</p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
 * THUMBWHEEL (a prototype, not a kind): a detented wheel standing out of the well's end
 *
 *   wheel    a cylinder seen side-on, taller than the well, half sunk into its end; its ridges
 *            ride the turn (each ridge at R·sin θ, fading as it turns away)
 *   detent   one ridge per step; a heavier ridge every largeStep; a haptic per detent
 *   drag     up or down on the wheel: it follows the finger, then settles on the nearest detent
 *            on the part spring; ↑ ↓ on the focused wheel step it
 *   value    the digits turn on the drum, the way the value went
 * Reduce Motion: the wheel snaps to its detent; the drum crossfades.
 * The DialKit panel "Thumbwheel" tunes the detent pitch, the drag distance per detent and the spring.
 * ───────────────────────────────────────────────────────── */

function Thumbwheel({ label, value, onValue, min, max, step, largeStep, unit }: { label: string; value: number; onValue: (n: number) => void; min: number; max: number; step: number; largeStep: number; unit: string }) {
  const d = useDialKit('Thumbwheel', {
    pitch: [18, 8, 40],
    drag: [10, 4, 30],
    spring: { type: 'select', options: SPRING_NAMES, default: 'part' },
    ridges: [9, 5, 15],
  });
  const reduced = useReducedMotion();
  const index = (value - min) / step;
  const [angle, setAngle] = React.useState(index * d.pitch);
  const anim = React.useRef({ frame: 0, v: 0, x: index * d.pitch });
  const drag = React.useRef<{ y: number; from: number; at: number } | null>(null);
  const [down, setDown] = React.useState(false);
  const [dir, setDir] = React.useState<'up' | 'down'>('up');
  const heavy = Math.max(1, Math.round(largeStep / step));

  const settleTo = React.useCallback((target: number) => {
    const a = anim.current;
    cancelAnimationFrame(a.frame);
    if (reduced) { a.x = target; a.v = 0; setAngle(target); return; }
    const { stiffness, damping } = SPRINGS[d.spring as SpringName];
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.032, (now - last) / 1000);
      last = now;
      a.v += (-stiffness * (a.x - target) - damping * a.v) * dt;
      a.x += a.v * dt;
      if (Math.abs(a.x - target) < 0.05 && Math.abs(a.v) < 0.5) { a.x = target; a.v = 0; setAngle(target); return; }
      setAngle(a.x);
      a.frame = requestAnimationFrame(tick);
    };
    a.frame = requestAnimationFrame(tick);
  }, [reduced, d.spring]);
  React.useEffect(() => () => cancelAnimationFrame(anim.current.frame), []);

  // A value from elsewhere (the keyboard, a reset) turns the wheel to its detent.
  React.useEffect(() => { if (!drag.current) settleTo(index * d.pitch); }, [index, d.pitch, settleTo]);

  const setIndex = (i: number) => {
    const next = Math.min(max, Math.max(min, min + Math.round(i) * step));
    if (next === value) return false;
    setDir(next > value ? 'up' : 'down');
    haptic('detent');
    onValue(next);
    return true;
  };

  const ridges = [];
  const span = Math.ceil(d.ridges / 2);
  const centre = Math.round(angle / d.pitch);
  for (let k = centre - span; k <= centre + span; k++) {
    const theta = ((k * d.pitch - angle) * Math.PI) / 180;
    if (Math.abs(theta) >= Math.PI / 2) continue;
    // Drag up turns the wheel's face up: a higher ridge comes from below.
    const y = -Math.sin(theta) * 20;
    const strong = k % heavy === 0;
    ridges.push(<span key={k} className="absolute left-[2px] right-[2px] h-px rounded-full" style={{ top: `calc(50% + ${y}px)`, opacity: Math.cos(theta) * (strong ? 0.9 : 0.45), background: 'var(--mu-ink2)', height: strong ? 2 : 1, transform: `scaleX(${0.75 + 0.25 * Math.cos(theta)})` }} />);
  }

  return (
    <div className="grid gap-6">
      <span className="type-ui text-ink">{label}</span>
      <div className="relative flex items-center" style={{ width: 132 }}>
        <Well variant="field" className={`flex items-center justify-center h-32 w-full rounded-[11px] pr-16 ${dir === 'down' ? 'swap-down' : ''}`}>
          <span className="type-lead tabular-nums text-ink"><SwapText value={String(value)} /></span>
          <span className="field-affix type-lead ml-3">{unit}</span>
        </Well>
        <span
          role="slider"
          tabIndex={0}
          aria-label={label}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-valuetext={`${value}${unit}`}
          data-testid="nf-thumbwheel"
          className="absolute right-[-7px] top-1/2 -translate-y-1/2 h-[44px] w-[18px] rounded-[6px] overflow-hidden cursor-ns-resize touch-none outline-none focus-visible:focus-ring recipe-button-compact"
          style={{ background: 'linear-gradient(var(--mu-well-bot), var(--mu-cap-bg, #f4f3ef) 30%, var(--mu-cap-bg, #f4f3ef) 70%, var(--mu-well-bot))', boxShadow: down ? 'var(--mu-well)' : undefined }}
          onKeyDown={(e) => {
            const by = e.shiftKey ? heavy : 1;
            if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { e.preventDefault(); setIndex(index + by); }
            if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { e.preventDefault(); setIndex(index - by); }
          }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            cancelAnimationFrame(anim.current.frame);
            // The drag starts from the detent the value is on, even if the wheel is still settling onto it.
            anim.current.x = index * d.pitch;
            drag.current = { y: e.clientY, from: index * d.pitch, at: index };
            setDown(true);
          }}
          onPointerMove={(e) => {
            const g = drag.current;
            if (!g) return;
            // Up turns the value up; the wheel follows the finger, the value lands on detents.
            const turned = ((g.y - e.clientY) / d.drag) * d.pitch;
            const lo = -index * d.pitch + g.from - d.pitch / 2;
            const hi = ((max - min) / step - index) * d.pitch + g.from + d.pitch / 2;
            const x = Math.min(g.from + hi - g.from, Math.max(g.from + lo - g.from, g.from + turned));
            anim.current.x = x;
            setAngle(x);
            const at = Math.round(x / d.pitch);
            if (at !== g.at) { g.at = at; setIndex(at); }
          }}
          onPointerUp={() => {
            drag.current = null;
            setDown(false);
            settleTo(Math.round(anim.current.x / d.pitch) * d.pitch);
          }}
        >
          {ridges}
        </span>
      </div>
    </div>
  );
}

function ThumbwheelPrototype() {
  const [zoom, setZoom] = React.useState(100);
  const [scrubbed, setScrubbed] = React.useState<number | null>(100);
  return (
    <div className="grid gap-20">
      <div className={ROW}>
        <Thumbwheel label="Zoom (thumbwheel)" value={zoom} onValue={setZoom} min={10} max={400} step={10} largeStep={50} unit="%" />
        <NumberField label="Zoom (scrub the label)" value={scrubbed} onValueChange={setScrubbed} min={10} max={400} step={10} largeStep={50} unit="%" />
      </div>
      <p className={NOTE}>A prototype to compare, not a kind you can use: drag the wheel up or down (or focus it and press ↑ ↓), then drag the label of the field beside it. Each detent is one step of 10; the heavier ridges are every 50.</p>
    </div>
  );
}

export default function NumberFieldPage() {
  const [copies, setCopies] = React.useState<number | null>(2);
  return (
    <ComponentPage
      title="Number field"
      lede="A number you step, scrub or type. Each step turns the value one drum step: plus rolls up, minus rolls down. Drag the label to scrub; press an arrow past the limit and only the digits shake."
      play={{ lede: 'Press the keycaps, hold them, use ↑ ↓, or drag the label sideways. Hold ⌥ or ⇧ over a field to see the fine and coarse steps; double-click a label to put it back.', caption: 'copies 1–20 · columns 1–12 · disabled · invalid', node: (
        <div className="flex flex-wrap items-end justify-center gap-32" style={{ zoom: 1.3 }}>
          <NumberField label="Copies" value={copies} onValueChange={setCopies} defaultValue={2} min={1} max={20} smallStep={1} />
          <NumberField label="Columns" defaultValue={12} min={1} max={12} smallStep={1} />
          <NumberField label="Locked" defaultValue={4} disabled />
          <NumberField label="Seats" defaultValue={0} min={0} max={8} invalid />
        </div>
      ) }}
      capture="number-field"
      more={[
        { id: 'sizes', title: 'Sizes', lede: 'Large, regular and compact are Field\'s heights and radii, so a number sits level with the fields beside it. The keycaps are concentric with the well.', node: <Sizes /> },
        { id: 'steps', title: 'Fine and coarse steps, shown', lede: '⌥ steps fine and ⇧ coarse, with the keycaps, the arrows and the scrub. While either is held over the field, the keycaps\' legends turn on the drum to the step they will take, so the step size is never a hidden rule.', node: <Steps /> },
        { id: 'units', title: 'Units printed, not typed', lede: 'A unit is engraved after the value in ink3, like Field\'s suffix: it says what the number means without being part of it. Typing "12px" is understood. Currency and locale come from format.', node: <Units /> },
        { id: 'soft', title: 'Soft limits while typing', lede: 'With allowOutOfRange, a typed value past a limit is kept: the invalid ring shows and the limit is said under the field until the value changes. The keys and the scrub still stop at the limit.', node: <SoftLimits /> },
        { id: 'default', title: 'Back to default', lede: 'Double-click the label or ⌘-click a keycap and the value turns back to its default on the drum. While it is off its default the field carries the shared changed mark, so you can see what you touched.', node: <Defaults /> },
        { id: 'mixed', title: 'Mixed', lede: 'For a selection whose values differ, the field says "Mixed". A step adds to each item from its own value (onStep gives the amount; applying it is the host\'s job); typing a number sets them all.', node: <Mixed /> },
        { id: 'inspector', title: 'Inspector', lede: 'For tight panels: no keycaps, and a letter or glyph engraved at the well\'s start is the scrub handle, with the resize cursor. Regular and compact only.', node: <Inspector /> },
        { id: 'wheel', title: 'Wheel, only when asked', lede: 'allowWheelScrub lets the wheel step the value, and only while the field has focus.', node: <Wheel /> },
        { id: 'arithmetic', title: 'Arithmetic, read back', lede: 'Typing +10, *2 or =8*12 shows the result under the field in the shared readback line before it commits on Enter or blur.', node: <Arithmetic /> },
        { id: 'thumbwheel', title: 'Thumbwheel (prototype)', lede: 'A detented wheel standing out of the well\'s end, one detent per step and a heavier one at each large step, for values set by feel. Built to compare with scrubbing; it does not ship (see the agent guide for why).', node: <ThumbwheelPrototype /> },
        { id: 'drum', title: 'Tune the drum', lede: 'The Number drum panel swaps the drum and refusal springs, sets the drum\'s travel, and stretches time. Step up to 9 and past it.', node: <DrumTuner /> },
      ]}
      usage={`<NumberField label="Width" defaultValue={240} min={0} max={4000} unit="px" />
<NumberField kind="inspector" size="compact" label="W" aria-label="Width" defaultValue={320} />`}
      sources={[
        { id: 'react', label: 'React', code: reactSource },
        { id: 'css', label: 'CSS', code: cssSource },
        { id: 'swift', label: 'SwiftUI', code: swiftSource },
        { id: 'agent', label: 'Agent guide', code: agentSource },
      ]}
      rules={[
        { id: 'NF1', title: 'The drum turns the way the number went', body: 'Up for more, down for less, one grid step on the settle spring.', origin: 'Ours' },
        { id: 'NF2', title: 'Give it a range', body: 'At a limit the keycap disables; an arrow or a scrub past it shakes only the digits.', origin: 'Ours' },
        { id: 'NF3', title: 'Typing is a draft', body: 'No drum while typing; Enter or leaving commits it, Esc puts it back. Arithmetic is read back before it commits.', origin: 'Figma' },
        { id: 'NF4', title: 'Steps you can see', body: 'A modifier that changes the step changes the keycaps\' legends while it is held.', origin: 'Ours' },
        { id: 'NF5', title: 'The unit is engraved', body: 'A unit lives in the well in ink3, never typed and never outside the well.', origin: 'Geist' },
      ]}
    />
  );
}
