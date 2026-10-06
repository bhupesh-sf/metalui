import * as React from 'react';
import { useDialKit } from 'dialkit';
import { DirectionProvider, Slider, Surface, type SliderOrientation, type SliderSize, type SliderTone } from '@unlocalhosted/metalui';
import { SunIcon, VolumeHighIcon, VolumeLowIcon, ZoomInIcon, ZoomOutIcon } from '@unlocalhosted/metalui/icons';
import { SliderXray } from '../../ui/xray/SliderXray';
import { SPRING_NAMES, springVars } from '../../ui/springTuning';
import type { SpringName } from '../../../../../packages/metalui/src/motion/springs.generated';
import reactSource from '../../../../../packages/metalui/src/components/slider/slider.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import swiftSource from '../../../../../swift/Sources/MetalUI/Components/MetalSlider.swift?raw';
import agentSource from '../../../../../packages/metalui/src/components/slider/slider.agent.md?raw';
import { ComponentPage } from '../../ui/ComponentPage';

/* ─────────────────────────────────────────────────────────
 * SLIDER PAGE · real sliders on a plain plate (never on the dotted stage, so labels stay clear)
 *
 *   playground   a zoom slider: glyphs at the ends, the value beside it on the drum
 *   sizes        compact, regular and large: groove and knob together
 *   scale        notches at every step and labelled ticks, all on the knob's travel
 *   width        full width of its container by default, or a set width
 *   kinds        a range, detents, a centred balance, the ink tone, the bubble
 *   vertical     a mixer's faders
 *   rtl          the same slider in a right-to-left page: it mirrors, and refuses toward the left
 *   states       hover lifts the knob, pressing presses it, a key past an end is refused; disabled
 *   tune         a DialKit panel: kind, orientation, size, width, glyphs, value, bubble, tone,
 *                detents, scale and the jump's spring
 * ───────────────────────────────────────────────────────── */

const PLATE = 'box-border flex w-full flex-col gap-20 px-28 py-24';
const plate = (width: number): React.CSSProperties => ({ width, maxWidth: '100%' });
const ROW = 'grid grid-cols-[72px_1fr] items-center gap-16 max-[520px]:grid-cols-1 max-[520px]:gap-8';
const NAME = 'type-meta text-ink2';
/** A row whose slider has ticks under it: the name lines up with the groove, not the ticks. */
const ROW_TOP = `${ROW} items-start`;
const NAME_TOP = `${NAME} flex h-[22px] items-center`;

const percent = (v: number) => `${v}%`;

/** Zoom, as a canvas would offer it: a quarter to double, in fives. */
function Zoom({ size, width }: { size?: SliderSize; width?: number | string }) {
  const [zoom, setZoom] = React.useState(100);
  return (
    <Slider
      aria-label="Zoom"
      value={zoom}
      min={25}
      max={200}
      step={5}
      largeStep={25}
      onValueChange={setZoom}
      size={size}
      width={width}
      startIcon={<ZoomOutIcon />}
      endIcon={<ZoomInIcon />}
      showValue
      format={percent}
    />
  );
}

function Sizes() {
  const [v, setV] = React.useState({ compact: 30, regular: 50, large: 70 });
  return (
    <Surface material="raise" radius="card" className={PLATE} style={plate(520)}>
      {(['compact', 'regular', 'large'] as const).map((size) => (
        <div key={size} className={ROW}>
          <span className={NAME}>{size}</span>
          <Slider aria-label={`Brightness, ${size}`} size={size} value={v[size]} min={0} max={100} onValueChange={(n) => setV((o) => ({ ...o, [size]: n }))} showValue format={percent} />
        </div>
      ))}
    </Surface>
  );
}

const QUALITY = ['Draft', 'Low', 'Fair', 'Good', 'High', 'Best'];

function Scale() {
  const [q, setQ] = React.useState(3);
  const [t, setT] = React.useState(20);
  return (
    <Surface material="raise" radius="card" className={PLATE} style={plate(520)}>
      <div className={ROW_TOP}>
        <span className={NAME_TOP}>Quality</span>
        <Slider aria-label="Export quality" value={q} min={0} max={5} step={1} largeStep={1} onValueChange={setQ} marks={[1, 2, 3, 4]} ticks={[0, 5].map((n) => ({ value: n, label: QUALITY[n] }))} format={(n) => QUALITY[n]} showValue />
      </div>
      <div className={ROW_TOP}>
        <span className={NAME_TOP}>Warmth</span>
        <Slider aria-label="Warmth" value={t} min={0} max={40} step={1} largeStep={5} onValueChange={setT} ticks={[0, 10, 20, 30, 40].map((n) => ({ value: n, label: `${n}°` }))} format={(n) => `${n}°`} />
      </div>
    </Surface>
  );
}

function Widths() {
  const [a, setA] = React.useState(60);
  const [b, setB] = React.useState(60);
  return (
    <Surface material="raise" radius="card" className={PLATE} style={plate(520)}>
      <div className={ROW}>
        <span className={NAME}>full</span>
        <Slider aria-label="Volume, full width" value={a} min={0} max={100} onValueChange={setA} />
      </div>
      <div className={ROW}>
        <span className={NAME}>width 200</span>
        <Slider aria-label="Volume, 200 wide" width={200} value={b} min={0} max={100} onValueChange={setB} />
      </div>
    </Surface>
  );
}

const money = (v: number) => `$${v}`;
const pan = (v: number) => (v === 0 ? 'C' : v < 0 ? `L${-v}` : `R${v}`);
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const GRID = [4, 8, 12, 16, 24, 32];

/** The kinds: a range, detents, a centred slider, the ink tone and the bubble, each on a real job. */
function Kinds() {
  const [price, setPrice] = React.useState<[number, number]>([40, 160]);
  const [grid, setGrid] = React.useState(2);
  const [balance, setBalance] = React.useState(-20);
  const [time, setTime] = React.useState(84);
  const [opacity, setOpacity] = React.useState(70);
  return (
    <Surface material="raise" radius="card" className={PLATE} style={plate(560)} data-testid="slider-kinds">
      <div className={ROW_TOP}>
        <span className={NAME_TOP}>range</span>
        <Slider aria-label="Price" value={price} min={0} max={200} step={5} largeStep={25} onValueChange={setPrice} showValue format={money} ticks={[0, 100, 200].map((n) => ({ value: n, label: money(n) }))} />
      </div>
      <div className={ROW}>
        <span className={NAME}>detents</span>
        <Slider aria-label="Grid size" value={grid} min={0} max={GRID.length - 1} step={1} largeStep={1} onValueChange={setGrid} detents showValue format={(i) => `${GRID[i]} px`} />
      </div>
      <div className={ROW}>
        <span className={NAME}>centred</span>
        <Slider aria-label="Balance" value={balance} min={-50} max={50} step={1} largeStep={10} onValueChange={setBalance} origin={0} showValue format={pan} />
      </div>
      <div className={ROW}>
        <span className={NAME}>ink</span>
        <Slider aria-label="Position" tone="ink" value={time} min={0} max={240} step={1} largeStep={15} onValueChange={setTime} showValue format={clock} />
      </div>
      <div className={ROW}>
        <span className={NAME}>bubble</span>
        <Slider aria-label="Opacity" bubble value={opacity} min={0} max={100} onValueChange={setOpacity} format={percent} />
      </div>
    </Surface>
  );
}

const CHANNELS = ['Voice', 'Music', 'Effects'];

/** Vertical: a mixer's faders, the minimum at the bottom. */
function Faders() {
  const [v, setV] = React.useState([70, 45, 85]);
  return (
    <Surface material="raise" radius="card" className="box-border flex w-fit max-w-full gap-40 px-40 py-24" data-testid="slider-faders">
      {CHANNELS.map((name, i) => (
        <div key={name} className="flex flex-col items-center gap-8">
          <Slider
            orientation="vertical"
            aria-label={name}
            value={v[i]}
            min={0}
            max={100}
            onValueChange={(n) => setV((o) => o.map((x, j) => (j === i ? n : x)))}
            showValue
            bubble
            format={percent}
            ticks={i === 0 ? [0, 50, 100].map((n) => ({ value: n, label: n })) : undefined}
          />
          <span className={NAME}>{name}</span>
        </div>
      ))}
    </Surface>
  );
}

/** Right to left: the page says dir="rtl" and Base UI's DirectionProvider turns the arrows. */
function RightToLeft() {
  const [v, setV] = React.useState(100);
  return (
    <DirectionProvider direction="rtl">
      <div dir="rtl" data-testid="slider-rtl">
        <Surface material="raise" radius="card" className={PLATE} style={plate(460)}>
          <Slider aria-label="Brightness, right to left" value={v} min={0} max={100} onValueChange={setV} endIcon={<SunIcon />} showValue format={percent} ticks={[0, 50, 100].map((n) => ({ value: n, label: n }))} />
        </Surface>
      </div>
    </DirectionProvider>
  );
}

function States() {
  const [a, setA] = React.useState(100);
  return (
    <Surface material="raise" radius="card" className={PLATE} style={plate(520)}>
      <div className={ROW}>
        <span className={NAME}>at the end</span>
        <Slider aria-label="Volume, at the end" value={a} min={0} max={100} onValueChange={setA} startIcon={<VolumeLowIcon />} endIcon={<VolumeHighIcon />} showValue format={percent} />
      </div>
      <div className={ROW}>
        <span className={NAME}>disabled</span>
        <Slider aria-label="Volume, disabled" disabled value={35} min={0} max={100} onValueChange={() => undefined} showValue format={percent} />
      </div>
    </Surface>
  );
}

/** The DialKit panel: every choice the slider really has, and the jump's spring. */
function Tuner() {
  const d = useDialKit('Slider', {
    kind: { type: 'select', options: ['single', 'range', 'centred'], default: 'single' },
    orientation: { type: 'select', options: ['horizontal', 'vertical'], default: 'horizontal' },
    size: { type: 'select', options: ['compact', 'regular', 'large'], default: 'regular' },
    width: [360, 160, 640],
    icons: true,
    value: true,
    bubble: false,
    tone: { type: 'select', options: ['green', 'ink'], default: 'green' },
    detents: false,
    marks: false,
    ticks: true,
    jump: { type: 'select', options: SPRING_NAMES, default: 'part' },
    slow: [1, 1, 10],
  });
  const [v, setV] = React.useState(40);
  const [r, setR] = React.useState<[number, number]>([20, 70]);
  const centred = d.kind === 'centred';
  const common = {
    'aria-label': 'Tuned',
    min: centred ? -50 : 0,
    max: centred ? 50 : 100,
    step: d.detents ? 10 : 1,
    largeStep: 10,
    size: d.size as SliderSize,
    orientation: d.orientation as SliderOrientation,
    startIcon: d.icons ? <ZoomOutIcon /> : undefined,
    endIcon: d.icons ? <ZoomInIcon /> : undefined,
    showValue: d.value,
    bubble: d.bubble,
    tone: d.tone as SliderTone,
    detents: d.detents,
    format: percent,
    marks: d.marks ? [10, 20, 30, 40, 50, 60, 70, 80, 90].map((n) => (centred ? n - 50 : n)) : undefined,
    ticks: d.ticks ? [0, 25, 50, 75, 100].map((n) => (centred ? n - 50 : n)).map((n) => ({ value: n, label: n })) : undefined,
  };
  return (
    <div data-testid="slider-tuner" style={springVars('part', d.jump as SpringName, d.slow) as React.CSSProperties}>
      <Surface material="raise" radius="card" className={PLATE} style={plate(d.width + 56)}>
        {d.kind === 'range' ? (
          <Slider {...common} value={r} onValueChange={setR} />
        ) : (
          <Slider {...common} value={centred ? v - 50 : v} origin={centred ? 0 : undefined} onValueChange={(n) => setV(centred ? n + 50 : n)} />
        )}
      </Surface>
    </div>
  );
}

export default function SliderPage() {
  return (
    <ComponentPage
      title="Slider"
      lede="A metal knob in a long groove, with a green fill up to the knob. Click the groove and the knob jumps there on a spring; drag it and it follows your finger. The knob never leaves the groove."
      play={{ lede: "Click anywhere on the groove, drag the knob, or use the arrow keys (Shift for bigger steps). At either end its glyph plays.", node: (
        <Surface material="raise" radius="card" className={PLATE} style={plate(460)}>
          <Zoom />
        </Surface>
      ) }}
      more={[
        { id: 'sizes', title: 'Sizes', lede: 'Compact, regular and large set the groove and the knob together. Regular is the default.', node: <Sizes /> },
        { id: 'scale', title: 'Marks and ticks', lede: 'Marks are notches in the groove at steps or events; ticks carry a label. Both sit on the knob\'s travel, so the knob lands exactly on them.', node: <Scale /> },
        { id: 'states', title: 'States', lede: 'Point at the groove and the knob lifts; press or drag and it presses down. Focus the top slider and push → past the end: it will not go, and says so with a small nudge. A disabled slider dims and takes no pointer or keys.', node: <States /> },
        { id: 'kinds', title: 'Kinds', lede: 'Two knobs choose a span. Detents click the knob from stop to stop, even while you drag. A centred slider grows its fill from zero, either way. The ink tone is for a slider that is not an amount you set, like a place in a song. The bubble shows the value over the knob while you drag it.', node: <Kinds /> },
        { id: 'vertical', title: 'Vertical', lede: 'A fader for a tall, narrow place. The minimum is at the bottom and ↑ raises it; the value sits on top, ticks hang to the side, and the bubble stands beside the knob while you drag.', node: <Faders /> },
        { id: 'rtl', title: 'Right to left', lede: 'On a right-to-left page the slider mirrors: the minimum is on the right and ← raises it. Focus it and press ← at the end: it nudges left, toward the end you pushed.', node: <RightToLeft /> },
        { id: 'width', title: 'Width', lede: 'A slider fills its container. Give it a width when it sits beside other controls.', node: <Widths /> },
        { id: 'tune', title: 'Tune it', lede: 'The Slider panel steps through its kinds, orientation, sizes, tone and parts, sets the width, and swaps the spring a jump rides (a drag never springs, unless the slider has detents).', node: <Tuner /> },
      ]}
      xray={<SliderXray />}
      capture="slider"
      usage={`const [zoom, setZoom] = React.useState(100);

<Slider
  aria-label="Zoom"
  value={zoom} min={25} max={200} step={5}
  onValueChange={setZoom}
  startIcon={<ZoomOutIcon />} endIcon={<ZoomInIcon />}
  showValue format={(v) => \`\${v}%\`}
/>`}
      sources={[
        { id: 'react', label: "React", code: reactSource },
        { id: 'css', label: "CSS", code: cssSource },
        { id: 'swift', label: "SwiftUI", code: swiftSource },
        { id: 'agent', label: "Agent guide", code: agentSource },
      ]}
      rules={[
        { id: "SL1", title: "A jump springs, a drag does not", body: "When you drag, your hand is already moving the knob, so a spring would only lag behind it.", origin: 'Ours' },
        { id: "SL2", title: "Marks mean something", body: "A notch in the groove is a step or an event, and a tick has a label. Never scatter them for texture: the knob is what you look at.", origin: 'Ours' },
        { id: "SL3", title: "Say the value in words", body: "Give the knob a value text a person would say, like a date and a time, or a format like 40%.", origin: 'Ours' },
        { id: "SL4", title: "Labels you can read", body: "Tick labels are plain small type at ink2 on a plain surface, never engraved type on a busy backdrop.", origin: 'Ours' },
        { id: "SL5", title: "The groove holds the knob", body: "The knob travels inside the groove and stops flush at its ends, even when a jump overshoots.", origin: 'Ours' },
        { id: "SL6", title: "Green is an amount you set", body: "Use the ink tone when the fill is not an amount someone chose, like the place in a song.", origin: 'Ours' },
        { id: "SL7", title: "A detent is felt", body: "Detents are for a few stops you can feel, 24 at most. With more, use a plain slider.", origin: 'Ours' },
      ]}
    />
  );
}
