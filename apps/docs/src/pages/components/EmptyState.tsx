import * as React from 'react';
import { useDialKit } from 'dialkit';
import { Attachment, Button, EmptyState, Message, Thread } from '@unlocalhosted/metalui';
import { NoteIcon, RegionIcon } from '@unlocalhosted/metalui/icons';
import { type SpringName } from '../../../../../packages/metalui/src/motion/springs.generated';
import { SPRING_NAMES, springVars } from '../../ui/springTuning';
import reactSource from '../../../../../packages/metalui/src/components/empty-state/empty-state.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import agentSource from '../../../../../packages/metalui/src/components/empty-state/empty-state.agent.md?raw';
import { ComponentPage } from '../../ui/ComponentPage';

/* ─────────────────────────────────────────────────────────
 * ARRIVAL TUNER: the page's DialKit panel
 *
 *   spring   the spring the empty state rises on
 *   rise     how far below it starts
 *   empty    clear the place to watch it arrive
 * ───────────────────────────────────────────────────────── */

const FILES = ['Tram map.pdf', 'Receipt.png', 'Itinerary.docx'];

function Place({ label }: { label: string }) {
  const [files, setFiles] = React.useState(FILES);
  return (
    <div role="region" aria-label={label} className="grid w-full max-w-[360px] gap-12">
      {files.length === 0 ? (
        <EmptyState
          icon={<RegionIcon size={24} />}
          title="No files in this region"
          description="Drop files onto the region, or attach them from here."
          action={<Button cap="primary" onClick={() => setFiles(FILES)}>Attach files</Button>}
        />
      ) : files.map((f) => <Attachment key={f} name={f} size={1_200_000} onRemove={() => setFiles((all) => all.filter((x) => x !== f))} />)}
    </div>
  );
}

function ArrivalTuner() {
  const d = useDialKit('Empty arrival', {
    spring: { type: 'select', options: SPRING_NAMES, default: 'settle' },
    rise: [6, 0, 24],
    slow: [1, 1, 10],
  });
  const vars = { ...springVars('settle', d.spring as SpringName, d.slow), '--mu-motion-nest': `${d.rise}px` } as React.CSSProperties;
  return <div data-testid="empty-arrival-tuner" className="flex w-full justify-center" style={vars}><Place label="Tuned region" /></div>;
}

/* WELCOME: a new chat's greeting is an empty state in the thread; its starter prompts are compact Buttons
 * in the action row. Pressing one sends it; the reply ends with follow-ups, the same Buttons in a row under
 * the message. The Welcome panel sets how many prompts and whether the greeting says what it can do. */
const PROMPTS = ['Summarise this board', 'Plan next week', 'Draft a release note', 'Find what is overdue'];
const FOLLOW_UPS = ['Make it shorter', 'Add the dates'];

function Welcome() {
  const d = useDialKit('Welcome', { prompts: [3, 1, 4], description: true });
  const [sent, setSent] = React.useState<string[]>([]);
  const send = (words: string) => setSent((all) => [...all, words]);
  const prompts = PROMPTS.slice(0, Math.round(d.prompts));
  return (
    <div data-testid="welcome" className="flex h-[360px] w-full max-w-[520px] flex-col justify-self-center rounded-card recipe-well-field">
      <Thread aria-label="New chat" className="min-h-0 flex-1" pinKey={sent.length}>
        {sent.length === 0 ? (
          <EmptyState
            key="welcome"
            icon={<NoteIcon size={24} />}
            title="What are we making?"
            description={d.description ? 'Ask about your boards, notes and plans.' : undefined}
            action={prompts.map((p) => <Button key={p} size="compact" onClick={() => send(p)}>{p}</Button>)}
          />
        ) : sent.flatMap((words, i) => [
          <Message key={`u${i}`} from="user">{words}</Message>,
          <Message key={`a${i}`} from="assistant" model="Fast">Here is a first pass at “{words.toLowerCase()}”.</Message>,
        ])}
        {sent.length > 0 && (
          <div key="follow-ups" role="group" aria-label="Follow-ups" className="flex flex-wrap gap-8">
            {FOLLOW_UPS.map((p) => <Button key={p} size="compact" onClick={() => send(p)}>{p}</Button>)}
          </div>
        )}
      </Thread>
      <div className="flex justify-end p-8">
        <Button size="compact" disabled={sent.length === 0} onClick={() => setSent([])}>New chat</Button>
      </div>
    </div>
  );
}

export default function EmptyStatePage() {
  return (
    <ComponentPage
      title="Empty state"
      lede="A place with nothing in it yet. It says what would be here and how to start, with the one action that starts it, and it rises in when the last thing leaves rather than snapping."
      play={{ lede: 'Remove the files one by one and watch the empty state arrive; attach them again.', caption: 'a region of files · and a compact one', node: (
        <div className="grid w-full justify-items-center gap-32">
          <Place label="Region files" />
          <div className="w-full max-w-[360px] rounded-card recipe-well-field">
            <EmptyState compact title="No comments" action={<Button size="compact">Comment</Button>} />
          </div>
        </div>
      ) }}
      more={[{ id: 'welcome', title: 'Welcome a new chat', lede: 'An empty thread is an empty state: a greeting, what it can do, and starter prompts as compact buttons. Press one to send it; the reply ends with follow-ups in the same buttons. The Welcome panel sets how many prompts and the description.', node: <Welcome /> }, { id: 'arrival', title: 'Tune the arrival', lede: 'The Empty arrival panel swaps the spring the empty state rises on, sets how far below it starts, and stretches time.', node: <ArrivalTuner /> }]}
      usage={`{notes.length === 0 ? (
  <EmptyState
    icon={<NoteIcon size={24} />}
    title="No notes yet"
    description="Write anywhere on the canvas to start one."
    action={<Button cap="primary" onClick={newNote}>New note</Button>}
  />
) : notes.map((n) => <Note key={n.id} {...n} />)}`}
      sources={[
        { id: 'react', label: 'React', code: reactSource },
        { id: 'css', label: 'CSS', code: cssSource },
        { id: 'agent', label: 'Agent guide', code: agentSource },
      ]}
      rules={[
        { id: 'ES1', title: 'Say how to start', body: 'What would be here, and the one action that begins it.', origin: 'Ours' },
        { id: 'ES2', title: 'It arrives, it does not snap', body: 'When the last thing leaves, the empty state rises in on the settle spring.', origin: 'Transitions T9' },
        { id: 'ES3', title: 'Not an error, not loading', body: 'Errors say what went wrong; loading shows a skeleton.', origin: 'Ours' },
      ]}
    />
  );
}
