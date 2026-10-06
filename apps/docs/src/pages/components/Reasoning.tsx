import * as React from 'react';
import { useDialKit } from 'dialkit';
import { Button, Message, Reasoning, Timeline, type TimelineEvent } from '@unlocalhosted/metalui';
import { RetryIcon } from '@unlocalhosted/metalui/icons';
import reactSource from '../../../../../packages/metalui/src/components/reasoning/reasoning.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import swiftSource from '../../../../../swift/Sources/MetalUI/Components/MetalReasoning.swift?raw';
import agentSource from '../../../../../packages/metalui/src/components/reasoning/reasoning.agent.md?raw';
import { ComponentPage } from '../../ui/ComponentPage';

/* ─────────────────────────────────────────────────────────
 * REASONING PAGE · the assistant's thinking, open while it thinks and folded once it answers
 *
 *   play      Ask again: the fold opens on "Thinking" (amber, breathing) and the thought arrives word by
 *             word; then the answer writes and the fold shuts to "Thought for 3 s"
 *   steps     an agent's chain of thought: a Timeline inside the fold, with the row's own words
 *   history   restored from history: folded, its duration given
 *   tune      DialKit: streaming, a duration, a label, steps instead of prose
 * ───────────────────────────────────────────────────────── */

const THOUGHT = 'The person wants the note shorter, not different. Keep the two facts: springs carry their durations, and Reduce Motion crossfades. Drop the history of why.'.split(' ');
const ANSWER = 'Springs now carry their durations. Under Reduce Motion, changes crossfade in place.'.split(' ');

function Lifecycle() {
  const [phase, setPhase] = React.useState<'thinking' | 'writing' | 'done'>('done');
  const [thought, setThought] = React.useState(THOUGHT.length);
  const [said, setSaid] = React.useState(ANSWER.length);
  React.useEffect(() => {
    if (phase === 'done') return;
    const t = window.setTimeout(() => {
      if (phase === 'thinking') {
        if (thought < THOUGHT.length) setThought(thought + 1);
        else { setPhase('writing'); setSaid(1); }
        return;
      }
      if (said < ANSWER.length) setSaid(said + 1);
      else setPhase('done');
    }, phase === 'thinking' ? 110 : 80);
    return () => window.clearTimeout(t);
  }, [phase, thought, said]);
  // Each ask is a new reply, so a new Reasoning (the last one's open or shut was the person's).
  const [asked, setAsked] = React.useState(0);
  const ask = () => { setAsked(asked + 1); setThought(0); setSaid(0); setPhase('thinking'); };
  return (
    <div className="grid w-full max-w-[520px] gap-20">
      <Message from="user">Make the release note shorter.</Message>
      <Message
        from="assistant"
        model="Thorough"
        status={phase === 'thinking' ? 'waiting' : phase === 'writing' ? 'writing' : 'done'}
        footer={phase === 'done' && <Button size="compact" icon={<RetryIcon />} onClick={ask}>Ask again</Button>}
      >
        <div className="grid gap-8">
          {/* Before the first ask the reply is history: its duration is given. After, it is measured. */}
          <Reasoning key={asked} streaming={phase === 'thinking'} duration={asked ? undefined : 3000}>
            {THOUGHT.slice(0, thought).join(' ')}
          </Reasoning>
          {said > 0 && phase !== 'thinking' && <span>{ANSWER.slice(0, said).join(' ')}</span>}
        </div>
      </Message>
    </div>
  );
}

const STEPS: TimelineEvent[] = [
  { id: 'read', title: 'Read the release note', description: '412 words, 6 sections', state: 'done' },
  { id: 'find', title: 'Found what changed', description: 'Springs carry durations; Reduce Motion crossfades', state: 'done' },
  { id: 'cut', title: 'Cutting the history', state: 'running' },
  { id: 'check', title: 'Check the links', state: 'planned' },
];

function Steps() {
  return (
    <div className="grid w-full max-w-[520px]">
      <Message from="assistant" model="Thorough" status="writing">
        <Reasoning label="Working · 4 steps" defaultOpen>
          <Timeline aria-label="Steps" events={STEPS} />
        </Reasoning>
      </Message>
    </div>
  );
}

function History() {
  return (
    <div className="grid w-full max-w-[520px]">
      <Message from="assistant" model="Thorough">
        <div className="grid gap-8">
          <Reasoning duration={4200}>Three headlines, each under six words, none repeating "motion".</Reasoning>
          <span>1. Every spring, on time</span>
        </div>
      </Message>
    </div>
  );
}

/* REASONING TUNER: the page's DialKit panel. Streaming (the fold follows it until you press the row), a
 * duration in seconds (0: measured), the row's own words, and steps in place of prose. */
function Tuner() {
  const d = useDialKit('Reasoning', {
    streaming: false,
    seconds: [4, 0, 90],
    label: false,
    steps: false,
  });
  return (
    <div data-testid="reasoning-tuner" className="grid w-full max-w-[520px] justify-self-center">
      <Reasoning streaming={d.streaming} duration={d.seconds ? d.seconds * 1000 : undefined} label={d.label ? 'Worked for 12 s · 4 steps' : undefined}>
        {d.steps ? <Timeline aria-label="Steps" events={STEPS} /> : 'A thought, in the answer\'s margin: quieter type beside an engraved rule.'}
      </Reasoning>
    </div>
  );
}

export default function ReasoningPage() {
  return (
    <ComponentPage
      capture="reasoning"
      title="Reasoning"
      lede="The assistant's thinking inside its reply: open while it thinks, the amber lamp breathing, and folded to “Thought for 4 s” once the answer starts."
      play={{ lede: 'Press Ask again: the fold opens on Thinking and the thought arrives in it; when the answer starts it shuts and says how long it thought. Press the row to read the thought again.', caption: 'thinking, then answering', wide: true, node: <div className="flex w-full justify-center"><Lifecycle /></div> }}
      more={[
        { id: 'steps', title: 'Steps', lede: 'An agent\'s chain of thought is a Timeline in the fold: each step pending, running, done or failed, with its detail under it.', node: <div className="flex w-full justify-center"><Steps /></div> },
        { id: 'history', title: 'From history', lede: 'A reply read back later is folded, its duration given by the host.', node: <div className="flex w-full justify-center"><History /></div> },
        { id: 'tune', title: 'Tune reasoning', lede: 'The Reasoning panel sets streaming, a duration, the row\'s own words and steps in place of prose.', node: <Tuner /> },
      ]}
      usage={`<Message from="assistant" status={status}>
  <Reasoning streaming={thinking}>{thought}</Reasoning>
  {answer}
</Message>

<Reasoning label="Worked for 12 s · 4 steps">
  <Timeline aria-label="Steps" events={steps} />
</Reasoning>`}
      sources={[
        { id: 'react', label: 'React', code: reactSource },
        { id: 'css', label: 'CSS', code: cssSource },
        { id: 'swift', label: 'SwiftUI', code: swiftSource },
        { id: 'agent', label: 'Agent guide', code: agentSource },
      ]}
      rules={[
        { id: 'RS1', title: 'Open while it thinks, folded once it answers', body: 'The thought is worth watching while nothing else is happening, and in the way once the answer is.', origin: 'Ours' },
        { id: 'RS2', title: 'The person\'s choice holds', body: 'Once someone opens or shuts the fold, streaming stops moving it.', origin: 'Ours' },
        { id: 'RS3', title: 'Nothing ticks while it thinks', body: 'The seconds are measured once, when the thinking ends; the word says Thinking until then.', origin: 'Ours' },
      ]}
    />
  );
}
