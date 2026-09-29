import * as React from 'react';
import { useDialKit } from 'dialkit';
import { CheckboxGroup } from '@unlocalhosted/metalui';
import reactSource from '../../../../../packages/metalui/src/components/checkbox-group/checkbox-group.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import agentSource from '../../../../../packages/metalui/src/components/checkbox-group/checkbox-group.agent.md?raw';
import { ComponentPage } from '../../ui/ComponentPage';

/* ─────────────────────────────────────────────────────────
 * CASCADE TUNER: the page's DialKit panel
 *
 *   cascade  the time between one row and the next when the parent ticks them
 *   draw     how long each tick takes to draw
 * ───────────────────────────────────────────────────────── */

const KINDS = [
  { value: 'notes', label: 'Notes' },
  { value: 'photos', label: 'Photos' },
  { value: 'links', label: 'Links' },
  { value: 'drawings', label: 'Drawings' },
  { value: 'voice', label: 'Voice memos' },
];
const ALL = KINDS.map((k) => k.value);

function Include({ label }: { label: string }) {
  const [value, setValue] = React.useState<string[]>(['notes']);
  return (
    <div role="group" aria-label={label}>
      <CheckboxGroup value={value} onValueChange={setValue} allValues={ALL}>
        <CheckboxGroup.Parent>Everything</CheckboxGroup.Parent>
        {KINDS.map((k) => <CheckboxGroup.Item key={k.value} value={k.value}>{k.label}</CheckboxGroup.Item>)}
      </CheckboxGroup>
    </div>
  );
}

function CascadeTuner() {
  const d = useDialKit('Checkbox cascade', {
    cascade: [30, 0, 150],
    draw: [220, 60, 800],
  });
  const vars = { '--mu-r-checkbox-group-self-cascade': `${d.cascade}ms`, '--mu-r-checkbox-tick-draw': `${d.draw}ms` } as React.CSSProperties;
  return <div data-testid="checkbox-cascade-tuner" className="flex justify-center" style={{ ...vars, zoom: 1.4 }}><Include label="Tuned export contents" /></div>;
}

export default function CheckboxGroupPage() {
  return (
    <ComponentPage
      title="Checkbox group"
      lede="Several independent choices in a form. Tick the parent and its rows tick in a cascade from the top; clear it and they clear together, because letting go is quicker than taking."
      play={{ lede: 'Tick Everything, clear it, or tick a few and watch the parent go half.', caption: 'a parent and five items', node: (
        <div className="flex justify-center" style={{ zoom: 1.3 }}>
          <Include label="Export contents" />
        </div>
      ) }}
      more={[{ id: 'cascade', title: 'Tune the cascade', lede: 'The Checkbox cascade panel sets the time between rows and how long each tick draws.', node: <CascadeTuner /> }]}
      sources={[
        { id: 'react', label: 'React', code: reactSource },
        { id: 'css', label: 'CSS', code: cssSource },
        { id: 'agent', label: 'Agent guide', code: agentSource },
      ]}
      rules={[
        { id: 'CG1', title: 'The parent acts on all, visibly', body: 'Its rows tick in order from the top, so you see the one choice reach every row.', origin: 'Ours' },
        { id: 'CG2', title: 'Clearing is instant', body: 'Letting go is quicker than taking: every row clears together.', origin: 'Ours' },
        { id: 'CG3', title: 'A parent only for a real "all"', body: 'Add one when everything-or-nothing is a common choice.', origin: 'Ours' },
      ]}
    />
  );
}
