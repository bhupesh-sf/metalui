'use client';

import * as React from 'react';
import {
  BranchPicker, Button, IconButton, Markdown, Message, MessageActions, Popover, PromptInput, Thread, Tooltip,
} from '@unlocalhosted/metalui';
import { CloseIcon, ExternalIcon, SidebarIcon, UndoIcon } from '@unlocalhosted/metalui/icons';

/* ─────────────────────────────────────────────────────────
 * CHAT PANEL · an assistant beside the work, docked or floating (Thread, Message, BranchPicker,
 * MessageActions, PromptInput, Popover)
 *
 *   docked    the work on the left; a column at the right edge: a header (Assistant, Float, Close),
 *             the thread, the composer. Nothing is covered and focus is never trapped: Tab moves
 *             from the work into the column and back
 *   floating  the work takes the width; an Assistant key sits at the bottom corner and the same
 *             conversation opens in a popover above it (the popover's rise on the surface spring):
 *             at once when Float is pressed, then from the key; ⎋ or a press outside closes it, and
 *             the conversation is kept
 *   closed    docked and closed: the column goes, the Assistant key comes back
 *
 *   send      the person's turn lands at the foot (Thread); the reply thinks (the lamp breathes,
 *             "Thinking"), then writes (Markdown streams); its footer fades in when it settles
 *   takes     Retry writes the last reply again as a new take; the BranchPicker in its footer says
 *             "2 / 2" and moves between them (the count on the drum)
 *   ghost     the composer offers the end of a sentence it knows in grey (Textarea's ghost): Tab
 *             takes it, ⎋ lets it go
 *   checkpoint a note between rules in the thread ("Checkpoint · before the tide question") with
 *             Restore: the turns after it go and the note says "Restored to this checkpoint"
 *
 * Reduce Motion: nothing slides or lands; the reply arrives at once; the popover fades.
 * Layout follows the block's own width (a container): under 34rem the docked column takes the width
 * and the work steps aside until it is closed.
 * ───────────────────────────────────────────────────────── */

const TIMING = {
  think: 700,   // ms before a reply's first word
  write: 1200,  // ms a reply streams before it settles
};

const SIZE = {
  height: 560,  // px, the block
  column: 360,  // px, the docked column
  popup: 380,   // px, the floating panel's width
  popupHeight: 460,
};

const ENDINGS: [string, string][] = [
  ['Can you', ' make it shorter?'],
  ['What about', ' low tide?'],
];

const REPLIES: Record<string, string[]> = {
  tide: [
    'High water at Belém is at **14:02** today, 3.4 m.',
    'The next high tide at Belém is **14:02** (3.4 m); the one after is at 02:31.',
    'Belém: high water **14:02** (3.4 m), low water 20:10 (0.9 m).',
  ],
  shorter: ['High tide **14:02**.', 'Belém, **14:02**, 3.4 m.'],
  low: ['Low water at Belém is at **20:10**, 0.9 m.', 'The next low tide is **20:10** (0.9 m).'],
  other: ['I can only answer about the tides in this sample.', 'This sample knows the tides at Belém, nothing else.'],
};

/* ── Data ──────────────────────────────────────────────────── */

type Status = 'waiting' | 'writing' | 'done';
type Turn =
  | { id: number; role: 'user'; text: string }
  | { id: number; role: 'assistant'; topic: string; takes: number; take: number; status: Status }
  | { id: number; role: 'checkpoint'; label: string; restored?: boolean };

const OPENING: Turn[] = [
  { id: 1, role: 'checkpoint', label: 'before the tide question' },
  { id: 2, role: 'user', text: 'When is high tide at Belém today?' },
  { id: 3, role: 'assistant', topic: 'tide', takes: 2, take: 2, status: 'done' },
];

const topicOf = (text: string) => (/short/i.test(text) ? 'shorter' : /low/i.test(text) ? 'low' : /tide|water/i.test(text) ? 'tide' : 'other');
const words = (t: Extract<Turn, { role: 'assistant' }>) => REPLIES[t.topic][(t.take - 1) % REPLIES[t.topic].length];

/** The conversation: its turns, sending, takes and checkpoints. Kept by the block, so docking and floating share it. */
function useConversation() {
  const [turns, setTurns] = React.useState<Turn[]>(OPENING);
  const seq = React.useRef(OPENING.length + 1);
  const live = turns.find((t) => t.role === 'assistant' && t.status !== 'done') as Extract<Turn, { role: 'assistant' }> | undefined;

  // A live reply thinks, then writes, then settles.
  React.useEffect(() => {
    if (!live) return;
    const t = window.setTimeout(() => {
      setTurns((all) => all.map((x) => (x.id === live.id && x.role === 'assistant' ? { ...x, status: x.status === 'waiting' ? 'writing' : 'done' } : x)));
    }, live.status === 'waiting' ? TIMING.think : TIMING.write);
    return () => window.clearTimeout(t);
  }, [live]);

  const update = (id: number, change: (t: Turn) => Turn) => setTurns((all) => all.map((t) => (t.id === id ? change(t) : t)));
  return {
    turns,
    busy: !!live,
    sent: [...turns].reverse().find((t) => t.role === 'user')?.id,
    send: (text: string) => setTurns((all) => [
      ...all,
      { id: seq.current++, role: 'user', text },
      { id: seq.current++, role: 'assistant', topic: topicOf(text), takes: 1, take: 1, status: 'waiting' },
    ]),
    retry: (id: number) => update(id, (t) => (t.role === 'assistant' ? { ...t, takes: t.takes + 1, take: t.takes + 1, status: 'waiting' } : t)),
    pick: (id: number, take: number) => update(id, (t) => (t.role === 'assistant' ? { ...t, take } : t)),
    restore: (id: number) => setTurns((all) => [...all.slice(0, all.findIndex((t) => t.id === id)), { id, role: 'checkpoint', label: (all.find((t) => t.id === id) as Extract<Turn, { role: 'checkpoint' }>).label, restored: true }]),
  };
}

type Conversation = ReturnType<typeof useConversation>;

/** The ghost: after a pause, the end of a sentence it knows. */
function useSuggestion(text: string) {
  const [suggestion, setSuggestion] = React.useState('');
  React.useEffect(() => {
    const t = window.setTimeout(() => {
      const next = ENDINGS.find(([end]) => text.endsWith(end))?.[1];
      if (next) setSuggestion(next);
    }, 400);
    return () => window.clearTimeout(t);
  }, [text]);
  return [suggestion, () => setSuggestion('')] as const;
}

/* ── The conversation, wherever it is shown ────────────────── */

function Chat({ chat, well }: { chat: Conversation; well?: React.Ref<HTMLTextAreaElement> }) {
  const [draft, setDraft] = React.useState('');
  const [suggestion, dismiss] = useSuggestion(draft);
  const last = [...chat.turns].reverse().find((t) => t.role === 'assistant')?.id;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Thread className="min-h-0 flex-1" pinKey={chat.sent} aria-label="Conversation">
        {chat.turns.map((t) => {
          if (t.role === 'user') return <Message key={t.id} from="user">{t.text}</Message>;
          if (t.role === 'checkpoint') {
            return (
              <Message key={t.id} from="system">
                <span className="inline-flex flex-wrap items-center justify-center gap-8">
                  {t.restored ? `Restored to this checkpoint (${t.label})` : `Checkpoint · ${t.label}`}
                  {!t.restored && <Button size="compact" icon={<UndoIcon />} disabled={chat.busy} onClick={() => chat.restore(t.id)}>Restore</Button>}
                </span>
              </Message>
            );
          }
          const text = words(t);
          const settled = t.status === 'done';
          return (
            <Message
              key={t.id}
              from="assistant"
              status={t.status}
              footer={settled && (
                <>
                  <BranchPicker index={t.take} count={t.takes} onIndexChange={(i) => chat.pick(t.id, i)} />
                  <MessageActions copy={text} onRetry={t.id === last ? () => chat.retry(t.id) : undefined} retryDisabled={chat.busy} />
                </>
              )}
            >
              {t.status !== 'waiting' && <Markdown streaming={t.status === 'writing'} pace={30}>{text}</Markdown>}
            </Message>
          );
        })}
      </Thread>
      <PromptInput
        ref={well}
        className="m-12 mt-4"
        placeholder="Ask about the tides…"
        hint={null}
        value={draft}
        onValueChange={setDraft}
        onSend={(text) => { chat.send(text); setDraft(''); }}
        busy={chat.busy}
        suggestion={suggestion}
        onSuggestionDismiss={dismiss}
      />
    </div>
  );
}

function Head({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <header className="flex items-center gap-4 px-16 pt-12 pb-4">
      <h2 className="m-0 flex-1 type-heading text-ink">Assistant</h2>
      {children}
      <Tooltip label="Close the assistant"><IconButton label="Close the assistant" icon={<CloseIcon />} onClick={onClose} /></Tooltip>
    </header>
  );
}

/* ── The block ─────────────────────────────────────────────── */

export interface ChatPanelProps {
  /** Where the assistant opens: docked beside the work, or floating from a launcher key. */
  mode?: 'docked' | 'floating';
  className?: string;
}

/** An assistant beside the work: docked as a column, or floating in a popover from a launcher key. */
export function ChatPanel({ mode: initial = 'docked', className }: ChatPanelProps) {
  const chat = useConversation();
  const [mode, setMode] = React.useState(initial);
  const [open, setOpen] = React.useState(initial === 'docked');
  React.useEffect(() => { setMode(initial); setOpen(initial === 'docked'); }, [initial]);
  const docked = mode === 'docked' && open;
  const well = React.useRef<HTMLTextAreaElement>(null);


  return (
    <section aria-label="Chat panel" className={`@container/block relative flex w-full overflow-hidden rounded-surface-radius-hero recipe-surface-raise ${className ?? ''}`} style={{ height: SIZE.height }}>
      <article className="min-w-0 flex-1 overflow-auto px-28 py-24 @max-[34rem]/block:data-docked:hidden" data-docked={docked ? '' : undefined}>
        <h2 className="m-0 type-title text-ink">Harbour walk, Saturday</h2>
        <p className="type-body text-ink2">Meet at the Belém tower at noon. The path along the river floods at high water, so we walk out before the tide turns and back along the upper road.</p>
        <p className="type-body text-ink2">Bring a jacket: the wind turns with the tide. Lunch at the kiosk by the lighthouse.</p>
      </article>

      {docked && (
        <aside aria-label="Assistant" className="flex w-[var(--chat-column)] flex-none flex-col border-l border-rule @max-[34rem]/block:w-full @max-[34rem]/block:border-l-0" style={{ '--chat-column': `${SIZE.column}px` } as React.CSSProperties}>
          <Head onClose={() => setOpen(false)}>
            <Tooltip label="Float the assistant"><IconButton label="Float the assistant" icon={<ExternalIcon />} onClick={() => setMode('floating')} /></Tooltip>
          </Head>
          <Chat chat={chat} />
        </aside>
      )}

      {!docked && (
        <div className="absolute right-16 bottom-16">
          {mode === 'floating'
            ? (
              <Popover open={open} onOpenChange={setOpen}>
                <Popover.Trigger><Button>Assistant</Button></Popover.Trigger>
                <Popover.Content side="top" align="end" aria-label="Assistant" initialFocus={well} className="flex max-w-none! flex-col p-0!" style={{ width: `min(${SIZE.popup}px, calc(100vw - 32px))`, height: SIZE.popupHeight }}>
                  <Head onClose={() => setOpen(false)}>
                    <Tooltip label="Dock to the side"><IconButton label="Dock to the side" icon={<SidebarIcon />} onClick={() => { setMode('docked'); setOpen(true); }} /></Tooltip>
                  </Head>
                  <Chat chat={chat} well={well} />
                </Popover.Content>
              </Popover>
            )
            : <Button onClick={() => setOpen(true)}>Assistant</Button>}
        </div>
      )}
    </section>
  );
}
