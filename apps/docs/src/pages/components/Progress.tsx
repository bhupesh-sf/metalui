import * as React from 'react';
import { useDialKit } from 'dialkit';
import { Button, Progress } from '@unlocalhosted/metalui';
import { type SpringName } from '../../../../../packages/metalui/src/motion/springs.generated';
import { SPRING_NAMES, springVars } from '../../ui/springTuning';
import reactSource from '../../../../../packages/metalui/src/components/progress/progress.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import agentSource from '../../../../../packages/metalui/src/components/progress/progress.agent.md?raw';
import { ComponentPage } from '../../ui/ComponentPage';

/* ─────────────────────────────────────────────────────────
 * FILL TUNER: the page's DialKit panel
 *
 *   step     the value jumps by the step; the edge follows on the fill spring
 *   sweep    the unknown segment's width and loop time
 * Springs are the system's classes; slow stretches every duration.
 * ───────────────────────────────────────────────────────── */

function FillTuner() {
  const [value, setValue] = React.useState(30);
  const d = useDialKit('Progress fill', {
    fill: { type: 'select', options: SPRING_NAMES, default: 'settle' },
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
  const [value, setValue] = React.useState(40);
  const [running, setRunning] = React.useState(false);
  React.useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const step = 7 + Math.round(Math.random() * 9);
      setValue((v) => Math.min(100, v + step));
    }, 450);
    return () => clearInterval(id);
  }, [running]);
  React.useEffect(() => { if (value >= 100) setRunning(false); }, [value]);
  return (
    <ComponentPage
      title="Progress"
      lede="How far a task has come, in the switch's sunk track and green fill. Each new value moves the edge on the settle spring and never past what is done; when the amount is unknown, a lit segment sweeps across."
      play={{ lede: 'Run the export and watch the edge follow each step.', caption: running ? 'running' : value >= 100 ? 'done' : 'known · unknown', node: (
        <div className="grid w-full max-w-[420px] gap-24">
          <Progress value={value} label="Exporting 12 photos" showValue />
          <Progress value={null} label="Syncing this canvas" />
          <div className="flex gap-8">
            <Button onClick={() => { setValue(0); setRunning(true); }}>Run export</Button>
            <Button onClick={() => { setRunning(false); setValue(40); }}>Reset</Button>
          </div>
        </div>
      ) }}
      more={[{ id: 'fill', title: 'Tune the fill', lede: 'The Progress fill panel swaps the spring the edge rides, the step, and the unknown segment\'s size and loop, and stretches time.', node: <FillTuner /> }]}
      sources={[
        { id: 'react', label: 'React', code: reactSource },
        { id: 'css', label: 'CSS', code: cssSource },
        { id: 'agent', label: 'Agent guide', code: agentSource },
      ]}
      rules={[
        { id: 'PR1', title: 'Never claim more than is done', body: 'The edge settles onto each value with no overshoot.', origin: 'Ours' },
        { id: 'PR2', title: 'Say what is in progress', body: '"Exporting 12 photos", not "Loading…".', origin: 'Ours' },
        { id: 'PR3', title: 'Unknown is honest', body: 'If you cannot estimate, sweep; do not fake a percentage.', origin: 'Ours' },
      ]}
    />
  );
}
