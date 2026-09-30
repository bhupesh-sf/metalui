import * as React from 'react';
import { useDialKit } from 'dialkit';
import { Checkbox, CheckboxGroup } from '@unlocalhosted/metalui';
import { type SpringName } from '../../../../../packages/metalui/src/motion/springs.generated';
import { SPRING_NAMES, springVars } from '../../ui/springTuning';
import { tokens } from '../../lib/tokens';
import { CheckboxXray } from '../../ui/xray/CheckboxXray';
import reactSource from '../../../../../packages/metalui/src/components/checkbox/checkbox.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import agentSource from '../../../../../packages/metalui/src/components/checkbox/checkbox.agent.md?raw';
import { ComponentPage } from '../../ui/ComponentPage';

/* ─────────────────────────────────────────────────────────
 * TICK TUNER: the page's DialKit panel
 *
 *   beat      the pen waits, then touches down
 *   down      the short leg, easing into the corner
 *   pace      the dwell at the corner, where the pen turns
 *   spring    the long leg up and out; its overshoot is the tail running past the tip
 *   bend      the mixed dash bending into the tick (and back)
 *   withdraw  unticking: the route drawn back, then the key goes light
 * Springs are the system's mass classes, never free numbers; slow stretches every
 * duration so the pen's route can be read by eye.
 * ───────────────────────────────────────────────────────── */

const TICK = tokens.recipes.checkbox.props.tick;
const ms = (v: string) => parseFloat(v);
const PARTS = ['photos', 'links', 'voice'];

function TickTuner() {
  const d = useDialKit('Checkbox tick', {
    spring: { type: 'select', options: SPRING_NAMES, default: 'part' },
    bend: { type: 'select', options: SPRING_NAMES, default: 'settle' },
    beat: [ms(TICK.delay), 0, 200],
    down: [ms(TICK.down), 0, 400],
    pace: [ms(TICK.pace), 0, 200],
    withdraw: [ms(TICK.withdraw), 0, 600],
    slow: [1, 1, 10],
    tick: { type: 'action', label: 'Tick and untick' },
    all: { type: 'action', label: 'Mixed and all' },
  }, {
    onAction: (action) => {
      if (action === 'tick') setDone((v) => !v);
      if (action === 'all') setParts((v) => (v.length === PARTS.length ? ['photos'] : PARTS));
    },
  });
  const [done, setDone] = React.useState(false);
  const [parts, setParts] = React.useState<string[]>(['photos']);
  const vars = {
    ...springVars('part', d.spring as SpringName, d.slow),
    ...springVars('settle', d.bend as SpringName, d.slow),
    '--mu-r-checkbox-tick-delay': `${d.beat * d.slow}ms`,
    '--mu-r-checkbox-tick-down': `${d.down * d.slow}ms`,
    '--mu-r-checkbox-tick-pace': `${d.pace * d.slow}ms`,
    '--mu-r-checkbox-tick-withdraw': `${d.withdraw * d.slow}ms`,
  } as React.CSSProperties;
  return (
    <div data-testid="checkbox-tick-tuner" className="flex flex-wrap items-start gap-40" style={{ ...vars, zoom: 2.5, font: '500 13px/20px var(--sans)' }}>
      <label className="flex items-center gap-8"><Checkbox checked={done} onCheckedChange={setDone} aria-label="Tuned task" /><span>send the poster</span></label>
      <CheckboxGroup aria-label="Tuned export" value={parts} onValueChange={setParts} allValues={PARTS}>
        <CheckboxGroup.Parent>Everything</CheckboxGroup.Parent>
        <CheckboxGroup.Item value="photos">Photos</CheckboxGroup.Item>
        <CheckboxGroup.Item value="links">Links</CheckboxGroup.Item>
        <CheckboxGroup.Item value="voice">Voice notes</CheckboxGroup.Item>
      </CheckboxGroup>
    </div>
  );
}

export default function CheckboxPage() {
  const [done, setDone] = React.useState(false);
  return (
    <ComponentPage
      title={"Checkbox"}
      lede={"The small hole in the margin of a task. Tick it and a dark key fills the hole and a pen draws the tick on: down into the corner, then up and out. It can also be half done, or only suggested."}
      play={{ lede: "Tick the first task. The other two show the half-done and suggested looks.", caption: "rest \u00b7 done \u00b7 doing \u00b7 suggested", node: (
          <div className="flex flex-col gap-14" style={{ font: '500 15px/22px var(--sans)', zoom: 1.2 }}>
            <label className="flex items-center gap-10"><Checkbox checked={done} onCheckedChange={setDone} aria-label="Call the printer" /><span style={done ? { color: 'var(--ink3)', textDecoration: 'line-through' } : undefined}>call the printer about paper</span></label>
            <label className="flex items-center gap-10"><Checkbox doing aria-label="Pick the typeface" /><span>pick the typeface</span></label>
            <label className="flex items-center gap-10"><Checkbox ghost aria-label="Book the venue" /><span>book the venue</span></label>
          </div>
        ) }}
      more={[{ id: 'tick', title: 'Tune the tick', lede: 'The Checkbox tick panel sets the pen\'s beat, its pace into and at the corner, the spring that throws the long leg, the bend from dash to tick and the withdraw, and stretches time. Tick the task, or take the group from mixed to all.', node: <TickTuner /> }]}
      xray={<CheckboxXray />}
      sources={[
        { id: 'react', label: "React", code: reactSource },
        { id: 'css', label: "CSS", code: cssSource },
        { id: 'agent', label: "Agent guide", code: agentSource },
      ]}
      rules={[
        { id: "CB1", title: "Only a person ticks it", body: "Ticking is always someone's own action, and it can be undone.", origin: 'Ours' },
        { id: "CB2", title: "Suggested is only an outline", body: "A task the app guessed never looks like a task you wrote.", origin: 'Ours' },
        { id: "CB3", title: "Give it a name", body: "Its accessible name is the task's text.", origin: 'Ours' },
      ]}
    />
  );
}
