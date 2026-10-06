import * as React from 'react';
import { useDialKit } from 'dialkit';
import { Gantt, Switcher, ToastProvider, useToast, type GanttScale, type GanttTask } from '@unlocalhosted/metalui';
import { type SpringName } from '../../../../../packages/metalui/src/motion/springs.generated';
import { SPRING_NAMES, springVars } from '../../ui/springTuning';
import reactSource from '../../../../../packages/metalui/src/components/gantt/gantt.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import swiftSource from '../../../../../swift/Sources/MetalUI/Components/MetalGantt.swift?raw';
import agentSource from '../../../../../packages/metalui/src/components/gantt/gantt.agent.md?raw';
import { ComponentPage } from '../../ui/ComponentPage';

/* ─────────────────────────────────────────────────────────
 * GANTT PAGE
 *
 *   playground  a print studio's autumn catalogue: drag a bar, pull an end, or Tab to one and use the
 *               arrows; the press check is booked and won't move; today's line runs through it. The
 *               Gantt panel: the scale, progress, the save's wait and failure, the springs it lifts and
 *               lands on, and slow motion
 *   more        a save that fails and puts the dates back with a toast; the same plan by day, week and
 *               month (the host's Switcher is the zoom)
 * ───────────────────────────────────────────────────────── */

const day = (n: number) => {
  const t = new Date();
  return new Date(t.getFullYear(), t.getMonth(), t.getDate() + n);
};

/** The plan, relative to today so the now line always runs through it. */
const plan = (): GanttTask[] => [
  { id: 'brief', name: 'Brief and budget', start: day(-12), end: day(-8), progress: 100 },
  { id: 'shoot', name: 'Product shoot', start: day(-7), end: day(-2), progress: 100 },
  { id: 'layout', name: 'Layout', start: day(-3), end: day(6), progress: 55 },
  { id: 'copy', name: 'Copy and translation', start: day(0), end: day(9), progress: 20 },
  { id: 'proof', name: 'Proofs to client', start: day(10), end: day(10), milestone: true },
  { id: 'press', name: 'Press check', start: day(13), end: day(14), progress: 0, locked: true },
  { id: 'print', name: 'Print and bind', start: day(15), end: day(22), progress: 0 },
  { id: 'ship', name: 'Ship to shops', start: day(24), end: day(24), milestone: true },
];

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

interface PlanProps {
  id: string;
  scale?: GanttScale;
  progress?: boolean;
  save?: { ms: number; fails: () => boolean };
  className?: string;
}

/** The catalogue's plan, with its save and its toasts. */
function Catalogue({ id, scale = 'day', progress = true, save, className = 'h-[420px]' }: PlanProps) {
  const [tasks, setTasks] = React.useState(plan);
  const toast = useToast();
  const shown = React.useMemo(() => (progress ? tasks : tasks.map(({ progress: _, ...t }) => t)), [tasks, progress]);
  const commit = React.useCallback(async (next: GanttTask[], previous: GanttTask[]) => {
    if (!save) return;
    await wait(save.ms);
    const moved = next.find((t, i) => t.start.getTime() !== previous[i]?.start.getTime() || t.end.getTime() !== previous[i]?.end.getTime());
    if (save.fails()) {
      toast.show({ title: `Couldn’t move ${moved?.name ?? 'the task'}`, sub: 'it’s back where it was', tone: 'error', timeout: 4000 });
      throw new Error('The save did not reach the server.');
    }
  }, [save, toast]);
  return (
    <div data-testid={id} className="w-full">
      <Gantt
        aria-label="Autumn catalogue"
        tasks={shown}
        onTasksChange={(next) => setTasks((all) => next.map((n) => ({ ...n, progress: all.find((t) => t.id === n.id)?.progress })))}
        onTasksCommit={commit}
        scale={scale}
        locale="en-US"
        className={`w-full ${className}`}
      />
    </div>
  );
}

function Playground() {
  const d = useDialKit('Gantt', {
    scale: { type: 'select', options: ['day', 'week', 'month'], default: 'day' },
    progress: true,
    wait: [0, 0, 3000],
    fails: false,
    lift: { type: 'select', options: SPRING_NAMES, default: 'surface' },
    land: { type: 'select', options: SPRING_NAMES, default: 'object' },
    slow: [1, 1, 10],
  });
  const save = React.useMemo(() => (d.wait || d.fails ? { ms: d.wait, fails: () => d.fails } : undefined), [d.wait, d.fails]);
  const vars = { ...springVars('surface', d.lift as SpringName, d.slow), ...springVars('object', d.land as SpringName, d.slow) } as React.CSSProperties;
  return (
    <div className="w-full" style={vars}>
      <Catalogue id="gantt-play" scale={d.scale as GanttScale} progress={d.progress} save={save} />
    </div>
  );
}

/** The first save fails: a toast says so and the dates go back. */
function FailsOnce() {
  const tries = React.useRef(0);
  const save = React.useMemo(() => ({ ms: 700, fails: () => ++tries.current === 1 }), []);
  return <Catalogue id="gantt-fails" save={save} className="h-[360px]" />;
}

const SCALES = [{ value: 'day', label: 'Days' }, { value: 'week', label: 'Weeks' }, { value: 'month', label: 'Months' }];

/** The host's zoom: a Switcher over the scale. */
function Zoom() {
  const [scale, setScale] = React.useState<GanttScale>('week');
  return (
    <div className="grid w-full gap-12">
      <Switcher aria-label="Scale" value={scale} onValueChange={(v) => setScale(v as GanttScale)} options={SCALES} />
      <Catalogue id="gantt-zoom" scale={scale} className="h-[360px]" />
    </div>
  );
}

export default function GanttPage() {
  return (
    <ToastProvider>
      <ComponentPage
        title="Gantt"
        lede="A plan laid out against dates. Pick a bar up and it rises and follows your hand while a recess, snapped to whole days, shows where it will land; pull an end to make it longer or shorter. Keys do the same a day at a time, out loud."
        play={{ wide: true, lede: 'Drag a bar along its row, or pull either end. Or Tab to one: left and right move it a day, Shift with them moves its end, Alt and Shift its start, up and down go to the next task. The press check is booked and won’t move. The Gantt panel changes the scale, hides progress, makes the save slow or fail, and swaps the springs.', caption: 'lift on surface · the recess, snapped to days · land on object · ends a day at a time · keys, said politely · today’s line', node: <Playground /> }}
        more={[
          { id: 'rollback', title: 'When the save fails', lede: 'The first move here fails: the chart waits while the save is out, then the dates go back and the toast says so. Move it again and it holds.', node: <FailsOnce /> },
          { id: 'zoom', title: 'Days, weeks and months', lede: 'The scale is how wide a day is and what the header counts; the bars keep their dates. The zoom is the host’s: here a Switcher.', node: <Zoom /> },
        ]}
        usage={`const [tasks, setTasks] = React.useState<GanttTask[]>(plan);

<Gantt
  aria-label="Autumn catalogue"
  tasks={tasks}
  onTasksChange={setTasks}
  onTasksCommit={async (next, previous) => {
    try { await save(next); }
    catch (e) { toast.show({ title: 'Couldn’t move it', tone: 'error' }); throw e; } // puts the dates back
  }}
  scale="week"
/>`}
        sources={[
          { id: 'react', label: 'React', code: reactSource },
          { id: 'css', label: 'CSS', code: cssSource },
          { id: 'swift', label: 'SwiftUI', code: swiftSource },
          { id: 'agent', label: 'Agent guide', code: agentSource },
        ]}
        rules={[
          { id: 'GT1', title: 'Show where it lands', body: 'While a bar follows the hand, its slot, snapped to whole days, is a recess on its row; letting go never surprises.', origin: 'Ours' },
          { id: 'GT2', title: 'Every drag has keys', body: 'Left and right move a bar a day, Shift its end, Alt and Shift its start, and each step is said in a polite status.', origin: 'WCAG 2.1.1' },
          { id: 'GT3', title: 'One save per gesture', body: 'A drop commits once; a burst of keys commits once after a pause or when focus leaves, so a save never fires per arrow.', origin: 'Ours' },
          { id: 'GT4', title: 'A failed save goes back', body: 'onTasksCommit gets the plan before the change; a rejection puts the dates back and the host says why in a toast.', origin: 'Kanban' },
          { id: 'GT5', title: 'Done looks like done', body: 'A bar’s progress is Progress’s own well and fill, so a share done reads the same as everywhere else in the app.', origin: 'Ours' },
        ]}
      />
    </ToastProvider>
  );
}
