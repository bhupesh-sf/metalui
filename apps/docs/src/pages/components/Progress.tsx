import * as React from 'react';
import { useDialKit } from 'dialkit';
import { Button, Progress, Surface, SwapText, type ProgressShape, type ProgressSize, type ProgressState } from '@unlocalhosted/metalui';
import { MorphIcon, UndoIcon, type MorphIconName } from '@unlocalhosted/metalui/icons';
import { type SpringName } from '../../../../../packages/metalui/src/motion/springs.generated';
import { SPRING_NAMES, springVars } from '../../ui/springTuning';
import reactSource from '../../../../../packages/metalui/src/components/progress/progress.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import swiftSource from '../../../../../swift/Sources/MetalUI/Components/MetalProgress.swift?raw';
import agentSource from '../../../../../packages/metalui/src/components/progress/progress.agent.md?raw';
import { ComponentPage } from '../../ui/ComponentPage';
import { Stage } from '../../ui/doc';

/* ─────────────────────────────────────────────────────────
 * PROGRESS PAGE · a task's progress, every state and shape in a real host
 *
 *   play     an export: Run export becomes Cancel while it runs (download → close), Reset drains the
 *            fill back on the release spring and turns the value to 0 % on the drum; at the end the
 *            head turns to "Exported 12 photos" with a check
 *   states   running, paused, failed, complete side by side; the Progress states panel scrubs the value
 *            and flips the state, shape and size of the specimen above them
 *   shapes   slim along a card's edge, the ring in a key, steps for a setup, buffered for a film
 *   sizes    compact in a row, regular in a dialog
 *   fill     the Progress fill panel swaps the spring, the step and the unknown segment
 * ───────────────────────────────────────────────────────── */

const PHOTOS = 12;
const PLATE = 'box-border grid w-full gap-12 p-16';

/* ───────────────────────── the playground ───────────────────────── */

type Run = 'idle' | 'running' | 'complete' | 'cancelled';

function ExportRun() {
  const [done, setDone] = React.useState(5);
  const [run, setRun] = React.useState<Run>('idle');
  React.useEffect(() => {
    if (run !== 'running') return;
    const id = window.setInterval(() => setDone((n) => Math.min(PHOTOS, n + 1)), 420);
    return () => window.clearInterval(id);
  }, [run]);
  React.useEffect(() => { if (run === 'running' && done >= PHOTOS) setRun('complete'); }, [run, done]);
  const running = run === 'running';
  const label = { idle: 'Export 12 photos', running: 'Exporting 12 photos', complete: 'Exported 12 photos', cancelled: 'Export cancelled' }[run];
  const glyph: MorphIconName = run === 'complete' ? 'check' : 'download';
  return (
    <div className="grid w-full max-w-[420px] gap-24" data-testid="progress-play">
      <Progress value={Math.round((done / PHOTOS) * 100)} state={run === 'complete' ? 'complete' : 'running'} icon={<MorphIcon name={glyph} />} label={label} showValue data-testid="progress-export" />
      <Progress value={null} label="Syncing this canvas" />
      <div className="flex gap-8">
        <Button
          icon={<MorphIcon name={running ? 'close' : 'download'} />}
          onClick={() => {
            if (running) { setRun('cancelled'); setDone(0); return; }
            setDone(0);
            setRun('running');
          }}
        >
          <SwapText value={running ? 'Cancel' : 'Run export'} />
        </Button>
        <Button icon={<UndoIcon />} onClick={() => { setRun('idle'); setDone(0); }}>Reset</Button>
      </div>
    </div>
  );
}

/* ───────────────────────── states ───────────────────────── */

const STATES: ProgressState[] = ['running', 'paused', 'failed', 'complete'];

/** One state in the strip: its glyph, its words and its one action. */
function StateCell({ state, value, size }: { state: ProgressState; value: number; size: ProgressSize }) {
  const done = Math.round((value / 100) * PHOTOS);
  const left = Math.max(1, Math.round((PHOTOS - done) * 2.5));
  const face: Record<ProgressState, { glyph: MorphIconName; label: string; detail?: string; action?: { glyph: MorphIconName; words: string } }> = {
    running: { glyph: 'download', label: 'Exporting 12 photos', detail: `${done} of ${PHOTOS} · about ${left} s`, action: { glyph: 'close', words: 'Cancel' } },
    paused: { glyph: 'download', label: 'Export paused', detail: `${done} of ${PHOTOS}`, action: { glyph: 'download', words: 'Resume' } },
    failed: { glyph: 'sync-error', label: 'Couldn’t export: the disk is full', detail: `${done} of ${PHOTOS}`, action: { glyph: 'retry', words: 'Try again' } },
    complete: { glyph: 'check', label: 'Exported 12 photos', detail: `${PHOTOS} of ${PHOTOS}` },
  };
  const f = face[state];
  return (
    <div className="grid content-start gap-12" data-testid={`progress-state-${state}`}>
      <Progress value={value} state={state} size={size} icon={<MorphIcon name={f.glyph} />} label={f.label} detail={f.detail} />
      <div className="flex h-[28px] items-center">
        {f.action && <Button size="compact" icon={<MorphIcon name={f.action.glyph} />}>{f.action.words}</Button>}
      </div>
    </div>
  );
}

function StatesStrip() {
  const d = useDialKit('Progress states', {
    value: [64, 0, 100],
    state: { type: 'select', options: STATES, default: 'running' },
    shape: { type: 'select', options: ['bar', 'slim', 'ring'], default: 'bar' },
    size: { type: 'select', options: ['regular', 'compact'], default: 'regular' },
    steps: [0, 0, 6],
    buffer: [0, 0, 100],
    detail: true,
  });
  const state = d.state as ProgressState;
  const shape = d.shape as ProgressShape;
  const size = d.size as ProgressSize;
  const steps = d.steps >= 2 ? Math.round(d.steps) : undefined;
  const value = steps ? (d.value / 100) * steps : d.value;
  const done = Math.round((d.value / 100) * PHOTOS);
  const glyph: MorphIconName = state === 'complete' ? 'check' : state === 'failed' ? 'sync-error' : 'download';
  const label = { running: 'Exporting 12 photos', paused: 'Export paused', failed: 'Couldn’t export', complete: 'Exported 12 photos' }[state];
  return (
    <Stage caption="Scrub the value and flip the state, shape and size in the Progress states panel; the strip below holds each state still.">
      <div className="grid w-full max-w-[640px] justify-items-center gap-32">
        <div className="grid w-full max-w-[360px] justify-items-center" data-testid="progress-specimen">
          <Progress
            value={value}
            state={state}
            shape={shape}
            size={size}
            steps={steps}
            buffer={d.buffer > 0 ? (d.buffer / 100) * (steps ?? 100) : undefined}
            icon={<MorphIcon name={glyph} />}
            label={label}
            detail={d.detail && !steps ? `${done} of ${PHOTOS} · about ${Math.max(1, Math.round((PHOTOS - done) * 2.5))} s` : undefined}
            showValue
            className={shape === 'ring' ? undefined : 'w-full'}
          />
        </div>
        <div className="grid w-full grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-x-32 gap-y-24">
          {STATES.map((s) => <StateCell key={s} state={s} value={d.value} size={size} />)}
        </div>
      </div>
    </Stage>
  );
}

/* ───────────────────────── shapes ───────────────────────── */

function useTicking(every: number, step: number) {
  const [v, setV] = React.useState(0);
  const [on, setOn] = React.useState(false);
  React.useEffect(() => {
    if (!on) return;
    const id = window.setInterval(() => setV((x) => (x >= 100 ? 100 : Math.min(100, x + step))), every);
    return () => window.clearInterval(id);
  }, [on, every, step]);
  React.useEffect(() => { if (v >= 100) setOn(false); }, [v]);
  return { v, on, start: () => { setV(0); setOn(true); } };
}

function SlimCard() {
  const t = useTicking(300, 9);
  return (
    <Surface material="raise" radius="card" className="relative box-border grid w-[300px] max-w-full gap-8 overflow-hidden p-16" data-testid="progress-slim">
      <span className="type-ui text-ink">Harbour survey.pdf</span>
      <span className="type-meta text-ink2"><SwapText value={t.on ? 'Uploading…' : t.v >= 100 ? 'Uploaded · 2.4 MB' : '2.4 MB'} /></span>
      <Button size="compact" className="justify-self-start" onClick={t.start} disabled={t.on}>Upload</Button>
      <Progress shape="slim" value={t.v} state={t.v >= 100 ? 'complete' : 'running'} label="Uploading Harbour survey.pdf" className="absolute inset-x-0 bottom-0 [&_.mu-progress-well]:rounded-none" />
    </Surface>
  );
}

function RingKey() {
  const t = useTicking(260, 7);
  const finished = !t.on && t.v >= 100;
  return (
    <Button
      onClick={t.start}
      data-testid="progress-ring-key"
      icon={t.on || finished ? <Progress shape="ring" value={t.v} state={finished ? 'complete' : 'running'} label="Uploading harbour.jpg" /> : <MorphIcon name="upload" />}
    >
      <SwapText value={t.on ? `Uploading ${t.v}%` : finished ? 'Uploaded' : 'Upload photo'} />
    </Button>
  );
}

function StepsSetup() {
  const [step, setStep] = React.useState(1);
  const words = ['Sign in', 'Choose folders', 'Copy notes', 'Turn on sync'];
  return (
    <div className="grid w-[300px] max-w-full gap-12" data-testid="progress-steps">
      <Progress value={step} steps={4} state={step >= 4 ? 'complete' : 'running'} label={step >= 4 ? 'Sync is set up' : words[step]} showValue />
      <div className="flex gap-8">
        <Button size="compact" onClick={() => setStep((s) => Math.min(4, s + 1))} disabled={step >= 4}>Next step</Button>
        <Button size="compact" icon={<UndoIcon />} onClick={() => setStep(0)}>Start over</Button>
      </div>
    </div>
  );
}

function BufferedFilm() {
  return (
    <div className="grid w-[300px] max-w-full gap-12" data-testid="progress-buffered">
      <Progress value={28} buffer={61} label="Harbour walk.mov" detail="0:42 of 2:30" size="compact" />
    </div>
  );
}

function Shapes() {
  return (
    <Stage caption="Upload on the card and in the key; step through the setup.">
      <div className="grid w-full justify-items-center gap-32">
        <div className="flex flex-wrap items-center justify-center gap-32"><SlimCard /><RingKey /></div>
        <div className="flex flex-wrap items-start justify-center gap-32"><StepsSetup /><BufferedFilm /></div>
      </div>
    </Stage>
  );
}

/* ───────────────────────── sizes ───────────────────────── */

function Sizes() {
  return (
    <Stage caption="Compact sits in a row or a toast; regular in a dialog or on its own.">
      <div className="grid w-full max-w-[640px] grid-cols-[repeat(auto-fit,minmax(260px,1fr))] items-start gap-24">
        <Surface material="raise" radius="card" className={PLATE} data-testid="progress-compact">
          <div className="flex items-center justify-between gap-12">
            <span className="type-ui text-ink">tide-tables-2026.csv</span>
            <span className="type-meta text-ink3">1.1 MB</span>
          </div>
          <Progress value={46} size="compact" label="Copying" detail="46%" />
        </Surface>
        <Surface material="raise" radius="card" className={PLATE} data-testid="progress-regular">
          <span className="type-ui text-ink">Export Lisbon, spring</span>
          <Progress value={64} icon={<MorphIcon name="download" />} label="Exporting 12 photos" detail="8 of 12 · about 20 s" />
          <Button size="compact" className="justify-self-end" icon={<MorphIcon name="close" />}>Cancel</Button>
        </Surface>
      </div>
    </Stage>
  );
}

/* ───────────────────────── the fill tuner ───────────────────────── */

function FillTuner() {
  const [value, setValue] = React.useState(30);
  const d = useDialKit('Progress fill', {
    fill: { type: 'select', options: SPRING_NAMES, default: 'settle' },
    drain: { type: 'select', options: SPRING_NAMES, default: 'release' },
    slow: [1, 1, 10],
    step: [20, 1, 60],
    segment: [0.32, 0.1, 0.6],
    sweep: [1400, 600, 4000],
    advance: { type: 'action', label: 'Advance' },
    reset: { type: 'action', label: 'Back to 0' },
  }, {
    onAction: (action) => {
      if (action === 'advance') setValue((v) => Math.min(100, v + d.step));
      if (action === 'reset') setValue(0);
    },
  });
  const vars = {
    ...springVars('settle', d.fill as SpringName, d.slow),
    ...springVars('release', d.drain as SpringName, d.slow),
    '--mu-r-progress-segment-ratio': String(d.segment),
    '--mu-r-progress-segment-sweep': `${d.sweep * d.slow}ms`,
  } as React.CSSProperties;
  return (
    <div data-testid="progress-fill-tuner" className="grid w-full max-w-[420px] gap-24" style={vars}>
      <Progress value={value} label="Tuned export" showValue />
      <Progress value={null} label="Tuned sync" />
    </div>
  );
}

export default function ProgressPage() {
  return (
    <ComponentPage
      title="Progress"
      lede="How far a task has come, in the switch's sunk track and green fill. The edge rises on the settle spring and never past what is done, and drains back when the task is reset or cancelled; it holds and dims when paused, stops in red when it fails, and turns its head to the result when it completes."
      play={{ lede: 'Run the export: the key becomes Cancel while it runs. Cancel or Reset and the fill drains back to 0 %.', caption: 'running · cancel · reset · complete', node: <ExportRun /> }}
      capture="progress"
      more={[
        { id: 'states', title: 'End states', lede: 'Complete finishes the fill, then turns the head to a check and the result. Failed stops where it was, in red, with sync-error and Try again. Paused holds and dims, with Resume. Cancelled drains back, as in the playground. Colour never says it alone: the glyph and the words change with it.', node: <StatesStrip /> },
        { id: 'shapes', title: 'Shapes', lede: 'Slim has no head and runs along an edge, under a toolbar or a card. The ring is the spinner’s ring with a value, for a key or an avatar, and draws the check when done. Steps splits the track into one well per known step. Buffered shows a lighter fill ahead, for media.', node: <Shapes /> },
        { id: 'sizes', title: 'Sizes', lede: 'Regular for a dialog or a page; compact, with a thinner track and the meta type, for a row or a toast.', node: <Sizes /> },
        { id: 'fill', title: 'Tune the fill', lede: 'The Progress fill panel swaps the springs the edge rises and drains on, the step, and the unknown segment\'s size and loop, and stretches time.', node: <FillTuner /> },
      ]}
      usage={`<Progress value={done} icon={<MorphIcon name={failed ? 'sync-error' : 'download'} />}
  label="Exporting 12 photos" detail="8 of 12 · about 20 s" state={failed ? 'failed' : 'running'} />
<Progress value={step} steps={4} label="Copy notes" showValue />   // Step 3 of 4
<Progress shape="ring" value={uploaded} label="Uploading harbour.jpg" />`}
      sources={[
        { id: 'react', label: 'React', code: reactSource },
        { id: 'css', label: 'CSS', code: cssSource },
        { id: 'swift', label: 'SwiftUI', code: swiftSource },
        { id: 'agent', label: 'Agent guide', code: agentSource },
      ]}
      rules={[
        { id: 'PR1', title: 'Never claim more than is done', body: 'The edge settles onto each value with no overshoot.', origin: 'Ours' },
        { id: 'PR2', title: 'Say what is in progress', body: '"Exporting 12 photos", not "Loading…". When you can count, say so: "8 of 12 · about 20 s".', origin: 'Ours' },
        { id: 'PR3', title: 'Unknown is honest', body: 'If you cannot estimate, sweep; do not fake a percentage.', origin: 'Ours' },
        { id: 'PR4', title: 'Back means back', body: 'Reset and Cancel drain the fill to empty on the release spring; the value turns back to 0 %. Nothing jumps.', origin: 'Ours' },
        { id: 'PR5', title: 'An end is said three ways', body: 'Ink, glyph and words change together: green and a check, red and sync-error, dim and Resume. Colour never carries a state alone.', origin: 'Ours' },
        { id: 'PR6', title: 'Finish, then celebrate', body: 'Complete lets the fill land before the head turns to its result.', origin: 'Ours' },
      ]}
    />
  );
}
