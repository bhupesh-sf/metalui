import * as React from 'react';
import { useDialKit } from 'dialkit';
import { Button, Spinner } from '@unlocalhosted/metalui';
import reactSource from '../../../../../packages/metalui/src/components/spinner/spinner.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import agentSource from '../../../../../packages/metalui/src/components/spinner/spinner.agent.md?raw';
import { ComponentPage } from '../../ui/ComponentPage';

/* ─────────────────────────────────────────────────────────
 * TURN TUNER: the page's DialKit panel
 *
 *   delay   the beat before it shows (remount to see it)
 *   turn    one turn, constant speed
 *   tail    how much of the ring the arc's tail covers
 * ───────────────────────────────────────────────────────── */

function TurnTuner() {
  const [key, setKey] = React.useState(0);
  const d = useDialKit('Spinner turn', {
    delay: [400, 0, 1200],
    turn: [900, 400, 2400],
    tail: [0.72, 0.2, 0.95],
    ring: [2.5, 1.5, 4],
    remount: { type: 'action', label: 'Start again' },
  }, {
    onAction: (action) => { if (action === 'remount') setKey((k) => k + 1); },
  });
  const vars = {
    '--mu-r-spinner-self-delay': `${d.delay}ms`,
    '--mu-r-spinner-self-turn': `${d.turn}ms`,
    '--mu-r-spinner-self-tail': String(d.tail),
    '--mu-r-spinner-self-ring': `${d.ring}px`,
  } as React.CSSProperties;
  return (
    <div data-testid="spinner-turn-tuner" className="flex items-center justify-center gap-24" style={{ ...vars, zoom: 2 }}>
      <Spinner key={`r${key}`} label="Tuned" />
      <Spinner key={`s${key}`} size="small" label="Tuned small" />
    </div>
  );
}

export default function SpinnerPage() {
  const [saving, setSaving] = React.useState<'quick' | 'slow' | null>(null);
  const [saved, setSaved] = React.useState(false);
  const save = (which: 'quick' | 'slow', ms: number) => {
    setSaved(false);
    setSaving(which);
    setTimeout(() => { setSaving(null); setSaved(true); }, ms);
  };
  return (
    <ComponentPage
      title="Spinner"
      lede="Steady work in a small space. It waits a beat before it shows, so a quick save never flashes it; then a green arc turns at a constant speed in a sunk well."
      play={{ lede: 'Save quickly and nothing flickers; save slowly and the spinner arrives.', caption: saving ? 'saving' : saved ? 'saved' : 'regular · small · in a button', node: (
        <div className="grid justify-items-center gap-20">
          <div className="flex items-center gap-16">
            <Spinner label="Loading preview" />
            <Spinner size="small" label="Loading row" />
          </div>
          <div className="flex gap-8" aria-busy={saving != null}>
            <Button onClick={() => save('quick', 250)} disabled={saving != null}>
              {saving === 'quick' && <Spinner size="small" label="Saving" />}
              Quick save
            </Button>
            <Button cap="primary" onClick={() => save('slow', 2200)} disabled={saving != null}>
              {saving === 'slow' && <Spinner size="small" label="Saving" />}
              {saving === 'slow' ? 'Saving' : 'Slow save'}
            </Button>
          </div>
        </div>
      ) }}
      more={[{ id: 'turn', title: 'Tune the turn', lede: 'The Spinner turn panel sets the beat before it shows, the time of a turn, the tail and the ring. Start again to see the beat.', node: <TurnTuner /> }]}
      sources={[
        { id: 'react', label: 'React', code: reactSource },
        { id: 'css', label: 'CSS', code: cssSource },
        { id: 'agent', label: 'Agent guide', code: agentSource },
      ]}
      rules={[
        { id: 'SP1', title: 'Wait a beat', body: 'It shows only after 400 ms, so quick work never flashes it.', origin: 'Ours' },
        { id: 'SP2', title: 'Steady turns steadily', body: 'A constant linear turn: work in progress has no spring.', origin: 'Ours' },
        { id: 'SP3', title: 'Where the work is', body: 'In the button that started it or beside the thing loading, never in a corner.', origin: 'Ours' },
      ]}
    />
  );
}
