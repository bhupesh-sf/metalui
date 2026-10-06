import * as React from 'react';
import { useDialKit } from 'dialkit';
import { Attachment, Avatar, Button, Message, Thread, type MessageFrom, type MessageStatus } from '@unlocalhosted/metalui';
import { RetryIcon } from '@unlocalhosted/metalui/icons';
import reactSource from '../../../../../packages/metalui/src/components/message/message.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import swiftSource from '../../../../../swift/Sources/MetalUI/Components/MetalMessage.swift?raw';
import agentSource from '../../../../../packages/metalui/src/components/message/message.agent.md?raw';
import { ComponentPage } from '../../ui/ComponentPage';

/* ─────────────────────────────────────────────────────────
 * MESSAGE PAGE · one turn of a conversation, every way it is said
 *
 *   play      a reply goes through its states: Ask → Thinking (amber, a skeleton line) → Writing
 *             (green) → done, and Copy fades in under it; Stop leaves it Stopped; Fail says Failed
 *   sides     the person's turn on a plate at the end (with files and a time), the assistant's on the page
 *   grouped   consecutive turns with avatars, and a system line
 *   tune      DialKit: who speaks, the state, a model, an avatar, a time, grouped, a footer
 * ───────────────────────────────────────────────────────── */

const ANSWER = 'Springs now ship with their durations, so tuning a curve retimes every component that uses it. Under Reduce Motion nothing travels; changes crossfade in place.'.split(' ');

function Lifecycle() {
  const [status, setStatus] = React.useState<MessageStatus>('done');
  const [shown, setShown] = React.useState(ANSWER.length);
  React.useEffect(() => {
    if (status !== 'waiting' && status !== 'writing') return;
    const t = window.setTimeout(() => {
      if (status === 'waiting') { setStatus('writing'); setShown(1); return; }
      if (shown + 1 >= ANSWER.length) { setShown(ANSWER.length); setStatus('done'); return; }
      setShown(shown + 1);
    }, status === 'waiting' ? 900 : 90);
    return () => window.clearTimeout(t);
  }, [status, shown]);
  const busy = status === 'waiting' || status === 'writing';
  return (
    <div className="grid w-full max-w-[520px] gap-20">
      <Message from="user">Make the release note shorter.</Message>
      <Message
        from="assistant"
        model="Fast"
        status={status}
        footer={!busy && <Button size="compact" icon={<RetryIcon />} onClick={() => { setStatus('waiting'); setShown(0); }}>Retry</Button>}
      >
        {status !== 'waiting' && ANSWER.slice(0, shown).join(' ')}
      </Message>
      <div className="flex gap-8">
        <Button size="compact" disabled={!busy} onClick={() => setStatus('stopped')}>Stop</Button>
        <Button size="compact" disabled={!busy} onClick={() => setStatus('failed')}>Fail</Button>
      </div>
    </div>
  );
}

function Sides() {
  return (
    <div className="grid w-full max-w-[520px] gap-20">
      <Message from="user" time={new Date(2026, 9, 6, 9, 41)} attachments={<Attachment name="brief.pdf" size={120_000} />}>
        Here's the brief. Can you draft three headlines?
      </Message>
      <Message from="assistant" model="Thorough" time={new Date(2026, 9, 6, 9, 41)} status="done">
        {'1. Every spring, on time\n2. Motion that keeps its word\n3. Tune a curve, keep the beat'}
      </Message>
    </div>
  );
}

function Grouped() {
  const ana = <Avatar name="Ana Rocha" size="small" label="" />;
  const rui = <Avatar name="Rui Matos" size="small" label="" />;
  return (
    // In a Thread, which closes the gap before a grouped turn.
    <div className="flex h-[340px] w-full max-w-[560px] flex-col">
      <Thread className="min-h-0 flex-1" aria-label="Grouped turns">
        <Message key="s" from="system">Ana joined the conversation</Message>
        <Message key="1" from="user" avatar={rui} time={new Date(2026, 9, 6, 14, 2)}>My export stops at page 12.</Message>
        <Message key="2" from="user" avatar={rui} grouped>It's the Alfama board.</Message>
        <Message key="3" from="assistant" name="Ana Rocha" avatar={ana} time={new Date(2026, 9, 6, 14, 4)}>Page 13 has a photo larger than the export allows.</Message>
        <Message key="4" from="assistant" name="Ana Rocha" avatar={ana} grouped>I've raised the limit; try it again now.</Message>
      </Thread>
    </div>
  );
}

/* MESSAGE TUNER: the page's DialKit panel. Every prop of one specimen: who speaks, its state, a model, an
 * avatar, a time, grouped (no header), and a footer (which fades in when it appears). */
function Tuner() {
  const d = useDialKit('Message', {
    from: { type: 'select', options: ['assistant', 'user', 'system'], default: 'assistant' },
    status: { type: 'select', options: ['none', 'waiting', 'writing', 'done', 'stopped', 'failed'], default: 'writing' },
    model: true,
    avatar: false,
    time: true,
    grouped: false,
    footer: true,
  });
  const from = d.from as MessageFrom;
  const status = d.status === 'none' ? undefined : (d.status as MessageStatus);
  return (
    <div data-testid="message-tuner" className="grid w-full max-w-[520px] justify-self-center">
      <Message
        from={from}
        status={status}
        model={d.model ? 'Fast' : undefined}
        avatar={d.avatar ? <Avatar name={from === 'user' ? 'Rui Matos' : 'Assistant'} size="small" label="" /> : undefined}
        time={d.time ? new Date(2026, 9, 6, 9, 41) : undefined}
        grouped={d.grouped}
        footer={d.footer && <span className="type-meta text-ink3">{from === 'user' ? 'Sent' : 'Copy · Retry go here'}</span>}
      >
        {from === 'system' ? 'Model changed to Fast' : status === 'waiting' ? null : 'A turn of the conversation, as it reads in the thread.'}
      </Message>
    </div>
  );
}

export default function MessagePage() {
  return (
    <ComponentPage
      capture="message"
      title="Message"
      lede="One turn of a conversation: the person's on a plate at the end, the assistant's on the page at the start, with a header whose lamp and word say how a reply is going."
      play={{ lede: 'Press Retry: the reply thinks (amber, a skeleton line where the words will stand), then writes (green), then settles and Retry fades back in. Stop or Fail it while it writes.', caption: 'a reply\'s states', wide: true, node: <div className="flex w-full justify-center"><Lifecycle /></div> }}
      more={[
        { id: 'sides', title: 'Both sides', lede: 'The person\'s turn sits at the end on a raised plate, with its files above it and its time in the header; the assistant\'s reads on the page, its model after its name.', node: <div className="flex w-full justify-center"><Sides /></div> },
        { id: 'grouped', title: 'Avatars, groups and system lines', lede: 'A turn that follows one from the same speaker drops its header and keeps its avatar\'s column empty. A system line sits between rules.', node: <div className="flex w-full justify-center"><Grouped /></div> },
        { id: 'tune', title: 'Tune a message', lede: 'The Message panel sets every prop of one turn: who speaks, the state, a model, an avatar, a time, grouped and a footer.', node: <Tuner /> },
      ]}
      usage={`<Message from="user" attachments={<Attachment name="brief.pdf" size={120000} />}>
  Draft three headlines.
</Message>
<Message from="assistant" model="Fast" status="writing" footer={settled && <CopyButton />}>
  {words}
</Message>
<Message from="system">Model changed to Thorough</Message>`}
      sources={[
        { id: 'react', label: 'React', code: reactSource },
        { id: 'css', label: 'CSS', code: cssSource },
        { id: 'swift', label: 'SwiftUI', code: swiftSource },
        { id: 'agent', label: 'Agent guide', code: agentSource },
      ]}
      rules={[
        { id: 'MS1', title: 'A lamp has a word', body: 'Thinking, Writing, Stopped and Failed are written beside the lamp; colour never says a state alone.', origin: 'Ours' },
        { id: 'MS2', title: 'The person on a plate, the answer on the page', body: 'The plate says "you said this"; an answer reads as text, the way a reader reads.', origin: 'Ours' },
        { id: 'MS3', title: 'Actions come after', body: 'The footer fades in once a reply settles, so nothing offers to copy half an answer.', origin: 'Ours' },
      ]}
    />
  );
}
