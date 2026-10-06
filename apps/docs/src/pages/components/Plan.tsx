import * as React from 'react';
import { useDialKit } from 'dialkit';
import { Button, Message, Plan, type PlanTask, type PlanTaskState } from '@unlocalhosted/metalui';
import { RetryIcon } from '@unlocalhosted/metalui/icons';
import reactSource from '../../../../../packages/metalui/src/components/plan/plan.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import swiftSource from '../../../../../swift/Sources/MetalUI/Components/MetalPlan.swift?raw';
import agentSource from '../../../../../packages/metalui/src/components/plan/plan.agent.md?raw';
import { ComponentPage } from '../../ui/ComponentPage';

/* ─────────────────────────────────────────────────────────
 * PLAN PAGE · the agent's to-do list, ticking off as it works
 *
 *   play      Run the plan: each step queues, runs (the ring after the show delay) and is checked off;
 *             the head counts "3 of 4" and its track fills. Fail it while a step runs
 *   nested    a step with its own tasks, and a detail line under a step
 *   tune      DialKit: one step's state, a detail line, nested tasks, the title
 * ───────────────────────────────────────────────────────── */

const STEPS = ['Read the release notes', 'Search the docs for springs', 'Draft the summary', 'Check the links'];

function steps(at: number, failed: boolean): PlanTask[] {
  return STEPS.map((title, i) => ({
    id: String(i),
    title,
    state: i < at ? 'done' : i === at ? (failed ? 'failed' : 'running') : i === at + 1 && !failed ? 'queued' : 'pending',
    description: failed && i === at ? 'The docs index is rebuilding. Try again in a minute.' : undefined,
  }));
}

function Lifecycle() {
  // at: the step running now (STEPS.length when every step is done).
  const [at, setAt] = React.useState(STEPS.length);
  const [failed, setFailed] = React.useState(false);
  const running = at < STEPS.length && !failed;
  React.useEffect(() => {
    if (!running) return;
    const t = window.setTimeout(() => setAt((n) => n + 1), 1400);
    return () => window.clearTimeout(t);
  }, [running, at]);
  return (
    <div className="grid w-full max-w-[520px] gap-12">
      <Message from="assistant" model="Thorough" status={running ? 'writing' : 'done'}>
        <Plan tasks={steps(at, failed)} />
      </Message>
      <div className="flex gap-8">
        <Button size="compact" icon={<RetryIcon />} disabled={running} onClick={() => { setFailed(false); setAt(0); }}>Run the plan</Button>
        <Button size="compact" disabled={!running} onClick={() => setFailed(true)}>Fail</Button>
      </div>
    </div>
  );
}

const NESTED: PlanTask[] = [
  { id: 'a', title: 'Gather the sources', state: 'done', description: 'Found 6 pages and 2 changelog entries.' },
  {
    id: 'b', title: 'Write the migration guide', state: 'running', tasks: [
      { id: 'b1', title: 'Springs', state: 'done' },
      { id: 'b2', title: 'Tokens', state: 'running' },
      { id: 'b3', title: 'Icons', state: 'queued' },
    ],
  },
  { id: 'c', title: 'Open a pull request', state: 'pending' },
];

/* PLAN TUNER: the page's DialKit panel. One step's state, a detail line under it, its own tasks, the title. */
function Tuner() {
  const d = useDialKit('Plan', {
    state: { type: 'select', options: ['pending', 'queued', 'running', 'done', 'failed'], default: 'running' },
    detail: true,
    nested: true,
    title: { type: 'text', default: 'Plan' },
  });
  const tasks: PlanTask[] = [
    { id: '1', title: 'Read the brief', state: 'done' },
    {
      id: '2', title: 'Sketch three layouts', state: d.state as PlanTaskState,
      description: d.detail ? 'Grid, list and a canvas.' : undefined,
      tasks: d.nested ? [{ id: '2a', title: 'Grid', state: 'done' }, { id: '2b', title: 'List', state: 'pending' }] : undefined,
    },
    { id: '3', title: 'Pick one with the team', state: 'pending' },
  ];
  return (
    <div data-testid="plan-tuner" className="grid w-full max-w-[520px] justify-self-center">
      <Plan title={d.title || 'Plan'} tasks={tasks} />
    </div>
  );
}

export default function PlanPage() {
  return (
    <ComponentPage
      capture="plan"
      title="Plan"
      lede="The agent's to-do list: what it said it would do, and how far it has got. Each step wears the same lamps and words as a tool call, so the plan and the calls that carry it out never disagree."
      play={{ lede: 'Press Run the plan: each step waits its turn (amber, Queued), runs (the ring) and is checked off while the head counts up. Fail it while a step runs.', caption: 'a plan, run step by step', wide: true, node: <div className="flex w-full justify-center"><Lifecycle /></div> }}
      more={[
        { id: 'nested', title: 'Tasks under a step', lede: 'A step holds its own tasks beside a rule, their marks under its words; a detail line says what a step found. The head counts the steps.', node: <div className="flex w-full justify-center"><div className="w-full max-w-[520px]"><Plan title="Migration" tasks={NESTED} /></div></div> },
        { id: 'tune', title: 'Tune a plan', lede: 'The Plan panel sets one step\'s state, a detail line, its own tasks and the title.', node: <Tuner /> },
      ]}
      usage={`<Plan
  tasks={[
    { id: 'read', title: 'Read the release notes', state: 'done' },
    { id: 'search', title: 'Search the docs', state: 'running' },
    { id: 'draft', title: 'Draft the summary', state: 'queued' },
  ]}
/>`}
      sources={[
        { id: 'react', label: 'React', code: reactSource },
        { id: 'css', label: 'CSS', code: cssSource },
        { id: 'swift', label: 'SwiftUI', code: swiftSource },
        { id: 'agent', label: 'Agent guide', code: agentSource },
      ]}
      rules={[
        { id: 'PL1', title: 'The tool call\'s words', body: 'Queued is amber, running the ring, failed red; done is the check. A plan never invents a state of its own.', origin: 'Ours' },
        { id: 'PL2', title: 'Count steps, not tasks', body: 'The head says how many steps are done; a step\'s own tasks are its business.', origin: 'Ours' },
        { id: 'PL3', title: 'Checked, not operated', body: 'The ticks are the agent\'s. The person reads a plan; they don\'t tick it.', origin: 'Ours' },
      ]}
    />
  );
}
