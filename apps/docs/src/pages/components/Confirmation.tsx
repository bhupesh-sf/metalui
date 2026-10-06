import * as React from 'react';
import { useDialKit } from 'dialkit';
import { Button, Confirmation, Message, ToolCall, type ConfirmationDecision } from '@unlocalhosted/metalui';
import { RetryIcon } from '@unlocalhosted/metalui/icons';
import reactSource from '../../../../../packages/metalui/src/components/confirmation/confirmation.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import swiftSource from '../../../../../swift/Sources/MetalUI/Components/MetalConfirmation.swift?raw';
import agentSource from '../../../../../packages/metalui/src/components/confirmation/confirmation.agent.md?raw';
import { ComponentPage } from '../../ui/ComponentPage';

/* ─────────────────────────────────────────────────────────
 * CONFIRMATION PAGE · the agent asks before it acts, and the answer stays in the thread
 *
 *   play      the agent wants to move three files: Allow runs the queued call; Deny leaves it; Ask again
 *   hold      a destructive request: Delete is held to confirm, a tap shows the hint
 *   tune      DialKit: destructive, the decision, a time, verbs for the answers
 * ───────────────────────────────────────────────────────── */

const FILES = 'drafts/old-note.md, drafts/old-note-2.md and drafts/scratch.md';

function Lifecycle() {
  const [decision, setDecision] = React.useState<ConfirmationDecision>();
  const [at, setAt] = React.useState<Date>();
  const [run, setRun] = React.useState<'queued' | 'running' | 'done'>('queued');
  React.useEffect(() => {
    if (run !== 'running') return;
    const t = window.setTimeout(() => setRun('done'), 1200);
    return () => window.clearTimeout(t);
  }, [run]);
  const decide = (d: ConfirmationDecision) => {
    setDecision(d);
    setAt(new Date());
    if (d === 'allowed') setRun('running');
  };
  return (
    <div className="grid w-full max-w-[520px] gap-12">
      <Message from="assistant" model="Fast" status={decision ? 'done' : 'waiting'}>
        <div className="grid gap-8">
          <span>I'll move the three old drafts to the archive.</span>
          <Confirmation title="Move 3 files to the archive?" decision={decision} time={at} onDecide={decide}>{FILES}</Confirmation>
          {decision !== 'denied' && (
            <ToolCall name="move_files" status={run} summary="3 files → archive/" input={{ to: 'archive/', files: 3 }} result={run === 'done' ? 'Moved 3 files.' : undefined} duration={1200} />
          )}
        </div>
      </Message>
      <div className="flex gap-8">
        <Button size="compact" icon={<RetryIcon />} disabled={!decision} onClick={() => { setDecision(undefined); setRun('queued'); }}>Ask again</Button>
      </div>
    </div>
  );
}

function Hold() {
  const [decision, setDecision] = React.useState<ConfirmationDecision>();
  return (
    <div className="grid w-full max-w-[520px] gap-12">
      <Message from="assistant" model="Fast">
        <Confirmation title="Delete 3 files?" destructive allowLabel="Delete" denyLabel="Keep" holdHint="Hold to delete" decision={decision} onDecide={setDecision}>
          They are deleted for good, not moved to the past.
        </Confirmation>
      </Message>
      <div className="flex gap-8">
        <Button size="compact" icon={<RetryIcon />} disabled={!decision} onClick={() => setDecision(undefined)}>Ask again</Button>
      </div>
    </div>
  );
}

/* CONFIRMATION TUNER: the page's DialKit panel. Destructive (held), the decision kept, a time, and
 * verbs for the answers. */
function Tuner() {
  const d = useDialKit('Confirmation', {
    destructive: false,
    decision: { type: 'select', options: ['asking', 'allowed', 'denied'], default: 'asking' },
    time: true,
    verbs: false,
  });
  return (
    <div data-testid="confirmation-tuner" className="grid w-full max-w-[520px] justify-self-center">
      <Confirmation
        title={d.destructive ? 'Delete 3 files?' : 'Move 3 files to the archive?'}
        destructive={d.destructive}
        decision={d.decision === 'asking' ? undefined : (d.decision as ConfirmationDecision)}
        time={d.time ? new Date(2026, 9, 6, 9, 41) : undefined}
        allowLabel={d.verbs ? (d.destructive ? 'Delete' : 'Move') : undefined}
        denyLabel={d.verbs ? 'Keep' : undefined}
      >
        {FILES}
      </Confirmation>
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <ComponentPage
      capture="confirmation"
      title="Confirmation"
      lede="The agent asks before it acts, with Deny and Allow. Once answered, it recedes to a quiet record of what was decided, kept in the thread."
      play={{ lede: 'Allow and the queued call runs; Deny and it never does. Either way the question stays, now saying what was decided. Ask again to start over.', caption: 'asked, then answered', wide: true, node: <div className="flex w-full justify-center"><Lifecycle /></div> }}
      more={[
        { id: 'hold', title: 'Can\'t be undone', lede: 'A destructive request holds to confirm: press and hold Delete while the fill runs across it. A tap only shows the hint.', node: <div className="flex w-full justify-center"><Hold /></div> },
        { id: 'tune', title: 'Tune a confirmation', lede: 'The Confirmation panel sets destructive, the decision, a time and verbs for the answers.', node: <Tuner /> },
      ]}
      usage={`<Confirmation title="Delete 3 files?" destructive decision={answer} onDecide={keep}>
  drafts/old-note.md, drafts/old-note-2.md and drafts/scratch.md
</Confirmation>`}
      sources={[
        { id: 'react', label: 'React', code: reactSource },
        { id: 'css', label: 'CSS', code: cssSource },
        { id: 'swift', label: 'SwiftUI', code: swiftSource },
        { id: 'agent', label: 'Agent guide', code: agentSource },
      ]}
      rules={[
        { id: 'CF1', title: 'The answer stays', body: 'A decided confirmation keeps its question and says what was decided, so the thread reads back true.', origin: 'Ours' },
        { id: 'CF2', title: 'Hold what can\'t be undone', body: 'A destructive yes is held for the hold time; a tap only shows the hint.', origin: 'Ours' },
        { id: 'CF3', title: 'Never on a timer', body: 'The agent waits for the person; nothing denies by itself.', origin: 'Ours' },
      ]}
    />
  );
}
