import * as React from 'react';
import { useDialKit } from 'dialkit';
import { Markdown, Message, MessageActions, type MessageFeedback } from '@unlocalhosted/metalui';
import reactSource from '../../../../../packages/metalui/src/components/message-actions/message-actions.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import swiftSource from '../../../../../swift/Sources/MetalUI/Components/MetalMessageActions.swift?raw';
import agentSource from '../../../../../packages/metalui/src/components/message-actions/message-actions.agent.md?raw';
import { ComponentPage } from '../../ui/ComponentPage';

/* ─────────────────────────────────────────────────────────
 * MESSAGE ACTIONS PAGE · the keys that act on a message
 *
 *   play      a reply with Copy, Retry and the thumbs: Copy turns to Copied; Bad asks why, and a reason
 *             says Thanks; Retry writes the reply again (it streams, and the keys fade back in)
 *   edit      the person's turn with Copy and Edit: Edit turns it into a well, ↩ saves
 *   tune      DialKit: which keys show, reasons on or off, Retry disabled
 * ───────────────────────────────────────────────────────── */

const TAKES = [
  'Springs now ship with their durations, so tuning a curve retimes every component that uses it.',
  'Tune a curve once; every component that uses it keeps time with it.',
];
const REASONS = ['Not accurate', 'Too long', 'Off topic', 'Other'];

function Reply({ keys = { copy: true, retry: true, feedback: true }, reasons = true, retryDisabled = false }: { keys?: { copy: boolean; retry: boolean; feedback: boolean }; reasons?: boolean; retryDisabled?: boolean }) {
  const [take, setTake] = React.useState(0);
  const [writing, setWriting] = React.useState(false);
  const [feedback, setFeedback] = React.useState<MessageFeedback>(null);
  const [said, setSaid] = React.useState('');
  React.useEffect(() => {
    if (!writing) return;
    const t = window.setTimeout(() => setWriting(false), 1500);
    return () => window.clearTimeout(t);
  }, [writing]);
  const text = TAKES[take % TAKES.length];
  return (
    <div className="grid w-full max-w-[520px] gap-12">
      <Message
        from="assistant"
        model="Fast"
        status={writing ? 'writing' : 'done'}
        footer={!writing && (
          <MessageActions
            copy={keys.copy ? text : undefined}
            onRetry={keys.retry ? () => { setTake((n) => n + 1); setFeedback(null); setWriting(true); } : undefined}
            retryDisabled={retryDisabled}
            feedback={keys.feedback ? feedback : undefined}
            onFeedback={keys.feedback ? (f, reason) => { setFeedback(f); setSaid(reason ? `Bad: ${reason}` : f ? (f === 'up' ? 'Good' : 'Bad') : 'Cleared'); } : undefined}
            reasons={reasons ? REASONS : undefined}
          />
        )}
      >
        <Markdown streaming={writing} pace={40}>{text}</Markdown>
      </Message>
      <p data-testid="feedback" className="m-0 type-meta text-ink3">{said ? `Feedback: ${said}` : 'No feedback yet.'}</p>
    </div>
  );
}

function Edit() {
  const [text, setText] = React.useState('Can you draft a release note for the spring token change?');
  const [editing, setEditing] = React.useState(false);
  return (
    <div className="grid w-full max-w-[520px]">
      <Message from="user" footer={!editing && <MessageActions copy={text} onEdit={() => setEditing(true)} />}>
        {editing
          ? <input aria-label="Edit message" autoFocus defaultValue={text} className="w-full bg-transparent outline-none" onKeyDown={(e) => { if (e.key === 'Enter') { setText(e.currentTarget.value); setEditing(false); } if (e.key === 'Escape') setEditing(false); }} />
          : text}
      </Message>
    </div>
  );
}

/* MESSAGE ACTIONS TUNER: the page's DialKit panel. Which keys show (Copy, Retry, the thumbs), the reasons
 * after Bad, and Retry disabled (another reply writing). */
function Tuner() {
  const d = useDialKit('Message actions', {
    copy: true,
    retry: true,
    feedback: true,
    reasons: true,
    retryDisabled: false,
  });
  return (
    <div data-testid="message-actions-tuner" className="grid w-full justify-items-center">
      <Reply keys={{ copy: d.copy, retry: d.retry, feedback: d.feedback }} reasons={d.reasons} retryDisabled={d.retryDisabled} />
    </div>
  );
}

export default function MessageActionsPage() {
  return (
    <ComponentPage
      capture="message-actions"
      title="Message actions"
      lede="The keys that act on a message, in its footer: copy it, write it again, edit what you said, and say how it went."
      play={{ lede: 'Copy turns to Copied. Bad asks what went wrong, and a reason says Thanks. Retry writes the reply again, and the keys fade back in once it settles.', caption: 'copy, judge, retry', wide: true, node: <div className="flex w-full justify-center"><Reply /></div> }}
      more={[
        { id: 'edit', title: 'Edit what you said', lede: 'Under the person\'s turn: Copy and Edit. Edit hands the turn to the host, here a well where ↩ saves and ⎋ cancels.', node: <div className="flex w-full justify-center"><Edit /></div> },
        { id: 'tune', title: 'Tune the actions', lede: 'The Message actions panel picks the keys, turns the reasons after Bad on or off, and disables Retry.', node: <Tuner /> },
      ]}
      usage={`<Message from="assistant" status={status} footer={settled && (
  <MessageActions
    copy={markdown}
    onRetry={retry}
    feedback={feedback}
    onFeedback={(f, reason) => save(f, reason)}
    reasons={['Not accurate', 'Too long', 'Other']}
  />
)}>
  <Markdown streaming={!settled}>{markdown}</Markdown>
</Message>`}
      sources={[
        { id: 'react', label: 'React', code: reactSource },
        { id: 'css', label: 'CSS', code: cssSource },
        { id: 'swift', label: 'SwiftUI', code: swiftSource },
        { id: 'agent', label: 'Agent guide', code: agentSource },
      ]}
      rules={[
        { id: 'MA1', title: 'Keys come after the answer', body: 'Pass the actions once a reply settles; Message fades its footer in, so nothing offers to copy half an answer.', origin: 'Ours' },
        { id: 'MA2', title: 'Bad is the thumb turned over', body: 'One glyph, two faces: the keys read as a pair, and the chosen one stays latched.', origin: 'Ours' },
        { id: 'MA3', title: 'A reason is a word, not a form', body: 'After Bad, a few reasons as keys; one press sends it and says Thanks.', origin: 'prompt-kit FeedbackBar' },
      ]}
    />
  );
}
