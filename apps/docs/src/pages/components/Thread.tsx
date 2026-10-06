import * as React from 'react';
import { useDialKit } from 'dialkit';
import { Avatar, Button, Message, Thread, type MessageStatus } from '@unlocalhosted/metalui';
import { type SpringName } from '../../../../../packages/metalui/src/motion/springs.generated';
import { SPRING_NAMES, springVars } from '../../ui/springTuning';
import reactSource from '../../../../../packages/metalui/src/components/thread/thread.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import swiftSource from '../../../../../swift/Sources/MetalUI/Components/MetalThread.swift?raw';
import agentSource from '../../../../../packages/metalui/src/components/thread/thread.agent.md?raw';
import { ComponentPage } from '../../ui/ComponentPage';

/* ─────────────────────────────────────────────────────────
 * THREAD PAGE · a conversation that stays with the newest message
 *
 *   play      Ask sends a question and a reply writes word by word: the thread follows; scroll up
 *             while it writes and it stays put, Jump to latest rises; Ask again from up there and
 *             the thread comes back to the foot (pinKey)
 *   grouped   a support chat with avatars: consecutive replies grouped, a system line between
 *   tune      DialKit: the arrival's and the jump key's springs, time stretched, the reply's pace
 * ───────────────────────────────────────────────────────── */

type Turn =
  | { id: number; from: 'user'; text: string }
  | { id: number; from: 'assistant'; words: string[]; shown: number; status: MessageStatus };

const QUESTIONS = ['What changed in the spring tokens?', 'And for Reduce Motion?', 'Shorter, please.'];
const ANSWERS = [
  'Every spring now carries its own duration beside its curve, so a component that reads the duration token stays in step when the curve is tuned. Nothing in your code needs to change unless you hard-coded a duration next to a spring; replace it with the token and it follows from now on.\n\nThe docs show each spring on the Motion page with its curve, its duration and a specimen you can press.',
  'Under Reduce Motion every travel token is zero: nothing slides, lands or spreads. Crossfades stay, so a label still changes and a lamp still lights; the change happens in place instead of in motion.',
  'Springs ship with their durations; Reduce Motion stops travel and keeps the fades.',
];
const OPENING: Turn[] = [
  { id: 1, from: 'user', text: 'Can you summarise the release?' },
  { id: 2, from: 'assistant', words: 'Three things changed: springs carry their durations, icons gained send, stop, attach and retry, and every component now ships as its own module, so one import ships one component.'.split(' '), shown: Infinity, status: 'done' },
];

/** A conversation with a pretend assistant: Ask sends the next question, and the reply writes at `pace` words a second. */
function useConversation(pace: number) {
  const [turns, setTurns] = React.useState<Turn[]>(OPENING);
  const seq = React.useRef(OPENING.length + 1);
  const asked = React.useRef(0);
  const live = turns.find((t): t is Extract<Turn, { from: 'assistant' }> => t.from === 'assistant' && (t.status === 'waiting' || t.status === 'writing'));
  React.useEffect(() => {
    if (!live) return;
    const t = window.setTimeout(() => setTurns((all) => all.map((x) => {
      if (x.id !== live.id || x.from !== 'assistant') return x;
      if (x.status === 'waiting') return { ...x, status: 'writing', shown: 1 };
      const shown = x.shown + 1;
      return { ...x, shown, status: shown >= x.words.length ? 'done' : 'writing' };
    })), live.status === 'waiting' ? 600 : 1000 / pace);
    return () => window.clearTimeout(t);
  }, [live, pace]);
  const ask = () => {
    const i = asked.current++ % QUESTIONS.length;
    setTurns((all) => [...all,
      { id: seq.current++, from: 'user', text: QUESTIONS[i] },
      { id: seq.current++, from: 'assistant', words: ANSWERS[i].split(' '), shown: 0, status: 'waiting' }]);
  };
  const sent = [...turns].reverse().find((t) => t.from === 'user')?.id;
  return { turns, ask, busy: !!live, sent, reset: () => setTurns(OPENING) };
}

/** Messages as the thread's own children: each a row it can land. */
function turnsOf(turns: Turn[]) {
  return turns.map((t) => (t.from === 'user'
    ? <Message key={t.id} from="user">{t.text}</Message>
    : (
      <Message key={t.id} from="assistant" model="Fast" status={t.status}>
        {t.status !== 'waiting' && t.words.slice(0, t.shown).join(' ')}
      </Message>
    )));
}

function Playground({ pace = 14, style }: { pace?: number; style?: React.CSSProperties }) {
  const { turns, ask, busy, sent, reset } = useConversation(pace);
  return (
    <div className="grid w-full max-w-[560px] gap-16" style={style}>
      <div className="flex h-[380px] flex-col overflow-hidden rounded-surface-radius-hero recipe-surface-raise">
        <Thread className="min-h-0 flex-1" pinKey={sent}>
          {turnsOf(turns)}
        </Thread>
      </div>
      <div className="flex gap-8">
        <Button size="compact" cap="primary" disabled={busy} onClick={ask}>Ask</Button>
        <Button size="compact" disabled={busy} onClick={reset}>Start over</Button>
      </div>
    </div>
  );
}

/* ── a support chat: avatars, grouped replies, a system line ── */

function Support() {
  const at = (h: number, m: number) => new Date(2026, 9, 6, h, m);
  const ana = <Avatar name="Ana Rocha" size="small" label="" />;
  const me = <Avatar name="Rui Matos" size="small" label="" />;
  return (
    <div className="flex h-[500px] w-full max-w-[560px] flex-col overflow-hidden rounded-surface-radius-hero recipe-surface-raise">
      <Thread className="min-h-0 flex-1" aria-label="Support chat">
        <Message key="s1" from="system">Ana joined the conversation</Message>
        <Message key="m1" from="user" avatar={me} time={at(14, 2)}>My export to PDF stops at page 12.</Message>
        <Message key="m2" from="user" avatar={me} grouped>It's the Alfama board, 40 pages.</Message>
        <Message key="m3" from="assistant" name="Ana Rocha" avatar={ana} time={at(14, 4)}>Thanks, I can see the export. Page 13 has a photo larger than the export allows.</Message>
        <Message key="m4" from="assistant" name="Ana Rocha" avatar={ana} grouped>I've raised the limit for your team; try it again now.</Message>
        <Message key="m5" from="assistant" name="Ana Rocha" avatar={ana} grouped footer={<span className="type-meta text-ink3">Seen</span>}>If it stops again, send me the page number.</Message>
        <Message key="s2" from="system">Model changed to Thorough</Message>
        <Message key="m6" from="assistant" model="Thorough" status="stopped">The export finished: 40 pages, 18 MB. I stopped before</Message>
      </Thread>
    </div>
  );
}

/* THREAD TUNER: the page's DialKit panel. land swaps the arrival's spring (object), jump the way back's
 * (settle); slow stretches both; pace is the pretend reply's words a second. */
function Tuner() {
  const d = useDialKit('Thread', {
    land: { type: 'select', options: SPRING_NAMES, default: 'object' },
    jump: { type: 'select', options: SPRING_NAMES, default: 'settle' },
    slow: [1, 1, 10],
    pace: [14, 2, 40],
  });
  const vars = { ...springVars('object', d.land as SpringName, d.slow), ...springVars('settle', d.jump as SpringName, d.slow) } as React.CSSProperties;
  return <div data-testid="thread-tuner" className="flex w-full justify-center"><Playground pace={d.pace} style={vars} /></div>;
}

export default function ThreadPage() {
  return (
    <ComponentPage
      capture="thread"
      title="Thread"
      lede="A conversation that scrolls, newest at the foot: it stays with a reply while it writes, lets you scroll up to read, and offers Jump to latest to come back."
      play={{ lede: 'Press Ask: your question rises from below and the reply writes with the thread following it. Scroll up while it writes and the thread stays put; Jump to latest brings you back. Ask from up there and sending takes you to the foot.', caption: 'a conversation', wide: true, node: <div className="flex w-full justify-center"><Playground /></div> }}
      more={[
        { id: 'support', title: 'Avatars, groups and system lines', lede: 'Consecutive turns from one speaker are grouped: no header, the avatar\'s column kept, the gap closed. A system line sits between rules.', node: <div className="flex w-full justify-center"><Support /></div> },
        { id: 'tune', title: 'Tune the thread', lede: 'The Thread panel swaps the arrival\'s and the jump key\'s springs, stretches time and sets the reply\'s pace.', node: <Tuner /> },
      ]}
      usage={`<Thread className="min-h-0 flex-1" pinKey={lastSentId}>
  {messages.map((m) => (
    <Message key={m.id} from={m.from} status={m.status}>{m.text}</Message>
  ))}
</Thread>`}
      sources={[
        { id: 'react', label: 'React', code: reactSource },
        { id: 'css', label: 'CSS', code: cssSource },
        { id: 'swift', label: 'SwiftUI', code: swiftSource },
        { id: 'agent', label: 'Agent guide', code: agentSource },
      ]}
      rules={[
        { id: 'TH1', title: 'Follow only at the foot', body: 'The thread follows new words while you are at the foot; once you scroll up it never pulls you down.', origin: 'Ours' },
        { id: 'TH2', title: 'Sending comes back', body: 'pinKey changes when the person sends, so their question and its reply are always in view.', origin: 'Ours' },
        { id: 'TH3', title: 'News rises from below', body: 'A conversation grows down, so a new turn rises one nest from under the fold.', origin: 'Ours' },
      ]}
    />
  );
}
