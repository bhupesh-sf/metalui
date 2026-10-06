import * as React from 'react';
import { useDialKit } from 'dialkit';
import { BranchPicker, Markdown, Message, MessageActions } from '@unlocalhosted/metalui';
import reactSource from '../../../../../packages/metalui/src/components/branch-picker/branch-picker.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import swiftSource from '../../../../../swift/Sources/MetalUI/Components/MetalBranchPicker.swift?raw';
import agentSource from '../../../../../packages/metalui/src/components/branch-picker/branch-picker.agent.md?raw';
import { ComponentPage } from '../../ui/ComponentPage';

/* ─────────────────────────────────────────────────────────
 * BRANCH PICKER PAGE · which of a message's replies is showing
 *
 *   play      a reply written twice: the picker says 2 / 2; previous and next move between the takes;
 *             Retry writes a third (it streams, the footer leaves) and lands on it, 3 / 3
 *   edited    the person's turn sent twice, the same picker under it, "Version"
 *   tune      DialKit: how many takes the reply starts with, and what a branch is called
 * ───────────────────────────────────────────────────────── */

const TAKES = [
  'High water at Belém is at **14:02**, 3.4 m.',
  'The next high tide at Belém is **14:02** today (3.4 m); the one after is at 02:31.',
  'Belém: high water **14:02** (3.4 m), low water 20:10 (0.9 m).',
  'High tide is at **14:02**. Bring a jacket: the wind turns at the change of tide.',
];

function Reply({ start = 2, label }: { start?: number; label?: string }) {
  const [count, setCount] = React.useState(start);
  const [take, setTake] = React.useState(start);
  const [writing, setWriting] = React.useState(false);
  React.useEffect(() => { setCount(start); setTake(start); }, [start]);
  React.useEffect(() => {
    if (!writing) return;
    const t = window.setTimeout(() => setWriting(false), 1400);
    return () => window.clearTimeout(t);
  }, [writing]);
  const text = TAKES[(take - 1) % TAKES.length];
  const retry = () => { setCount((n) => n + 1); setTake(count + 1); setWriting(true); };
  return (
    <div className="grid w-full max-w-[520px] gap-16">
      <Message from="user">When is high tide at Belém today?</Message>
      <Message
        from="assistant"
        model="Fast"
        status={writing ? 'writing' : 'done'}
        footer={!writing && (
          <>
            <BranchPicker index={take} count={count} onIndexChange={setTake} label={label} />
            <MessageActions copy={text} onRetry={retry} />
          </>
        )}
      >
        <Markdown streaming={writing} pace={40}>{text}</Markdown>
      </Message>
    </div>
  );
}

function Edited() {
  const versions = ['When is high tide at Belém?', 'When is high tide at Belém today, and how high?'];
  const [v, setV] = React.useState(2);
  return (
    <div className="grid w-full max-w-[520px]">
      <Message from="user" footer={<BranchPicker index={v} count={versions.length} onIndexChange={setV} label="Version" />}>
        {versions[v - 1]}
      </Message>
    </div>
  );
}

/* BRANCH PICKER TUNER: the page's DialKit panel. How many takes the reply starts with (1 hides the
 * picker) and what a branch is called. */
function Tuner() {
  const d = useDialKit('Branch picker', {
    takes: [2, 1, 4, 1],
    label: { type: 'select', options: ['Reply', 'Version', 'Answer'], default: 'Reply' },
  });
  return (
    <div data-testid="branch-picker-tuner" className="grid w-full justify-items-center">
      <Reply start={Math.round(d.takes)} label={d.label} />
    </div>
  );
}

export default function BranchPickerPage() {
  return (
    <ComponentPage
      capture="branch-picker"
      title="Branch picker"
      lede="Which of a message's replies is showing, and the way to the others: previous, 2 / 3, next, in the reply's footer."
      play={{ lede: 'Move between the two takes. Retry writes a third and lands on it; the count turns on the drum.', caption: 'previous · next · retry', wide: true, node: <div className="flex w-full justify-center"><Reply /></div> }}
      more={[
        { id: 'edited', title: 'An edited turn', lede: 'The person sent their question twice; the same picker under their turn moves between the versions.', node: <div className="flex w-full justify-center"><Edited /></div> },
        { id: 'tune', title: 'Tune the picker', lede: 'The Branch picker panel sets how many takes the reply starts with (one hides the picker) and what a branch is called.', node: <Tuner /> },
      ]}
      usage={`<Message from="assistant" status={status} footer={settled && (
  <>
    <BranchPicker index={take + 1} count={takes.length} onIndexChange={(i) => setTake(i - 1)} />
    <MessageActions copy={takes[take]} onRetry={retry} />
  </>
)}>
  <Markdown streaming={!settled}>{takes[take]}</Markdown>
</Message>`}
      sources={[
        { id: 'react', label: 'React', code: reactSource },
        { id: 'css', label: 'CSS', code: cssSource },
        { id: 'swift', label: 'SwiftUI', code: swiftSource },
        { id: 'agent', label: 'Agent guide', code: agentSource },
      ]}
      rules={[
        { id: 'BP1', title: 'Retry keeps the old take', body: 'A new take is added and shown; the earlier ones stay one key away.', origin: 'assistant-ui BranchPicker' },
        { id: 'BP2', title: 'The count turns', body: 'The number turns on the drum, so moving reads as moving; a polite status says “Reply 3 of 3”.', origin: 'Ours' },
        { id: 'BP3', title: 'Focus never falls off', body: 'A key that turns off at an end hands focus to the other key first.', origin: 'Ours' },
        { id: 'BP4', title: 'One reply, no picker', body: 'Under two takes nothing is drawn.', origin: 'Ours' },
      ]}
    />
  );
}
