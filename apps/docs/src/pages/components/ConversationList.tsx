import * as React from 'react';
import { useDialKit } from 'dialkit';
import { Button, ConversationList, EmptyState, Sidebar, ToastProvider, useToast, type Conversation } from '@unlocalhosted/metalui';
import { PinIcon, PlusIcon } from '@unlocalhosted/metalui/icons';
import reactSource from '../../../../../packages/metalui/src/components/conversation-list/conversation-list.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import swiftSource from '../../../../../swift/Sources/MetalUI/Components/MetalConversationList.swift?raw';
import agentSource from '../../../../../packages/metalui/src/components/conversation-list/conversation-list.agent.md?raw';
import { ComponentPage } from '../../ui/ComponentPage';

/* ─────────────────────────────────────────────────────────
 * CONVERSATION LIST PAGE · past chats in a sidebar
 *
 *   play      a sidebar of chats grouped by day; choose one, rename it (QuickEdit in a popover, a
 *             600 ms save), pin it (a host action), delete it (the row leaves, the list closes up,
 *             a toast offers Undo and it lands back); New chat lands a row at the top of Today
 *   loading   skeleton rows, then the chats arrive
 *   tune      DialKit: loading, the save's time, a failing save, no chats at all
 * ───────────────────────────────────────────────────────── */

const H = 3_600_000;
const D = 24 * H;

function seed(now: number): Conversation[] {
  return [
    { id: 'tides', title: 'High tide at Belém today', time: now - 0.4 * H },
    { id: 'release', title: 'Release note for the spring tokens', time: now - 3 * H },
    { id: 'ferry', title: 'Ferry times from Cais do Sodré', time: now - D - H },
    { id: 'pastry', title: 'Where to find pastéis de nata near Alfama, and which ones are worth the queue', time: now - 3 * D },
    { id: 'tiles', title: 'Azulejo patterns for the hallway', time: now - 5 * D, pinned: true },
    { id: 'budget', title: 'Trip budget in euros', time: now - 12 * D },
    { id: 'trams', title: 'Tram 28 route and stops', time: now - 45 * D },
  ];
}

const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

function Chats({ loading = false, save = 600, fail = false, none = false }: { loading?: boolean; save?: number; fail?: boolean; none?: boolean }) {
  const toast = useToast();
  const [now] = React.useState(() => Date.now());
  const [chats, setChats] = React.useState(() => (none ? [] : seed(now)));
  const [open, setOpen] = React.useState<string | null>('tides');
  const made = React.useRef(0);
  React.useEffect(() => { setChats(none ? [] : seed(now)); }, [none, now]);
  const title = chats.find((c) => c.id === open)?.title;
  const newChat = () => {
    const id = `new-${(made.current += 1)}`;
    setChats((list) => [{ id, title: 'New chat', time: Date.now() }, ...list]);
    setOpen(id);
  };
  return (
    <div className="flex h-[440px] w-full max-w-[720px] overflow-hidden rounded-card recipe-well-field">
      <Sidebar aria-label="Chats">
        <Sidebar.Header>
          <Button size="compact" icon={<PlusIcon />} onClick={newChat}>New chat</Button>
        </Sidebar.Header>
        <ConversationList
          aria-label="Chats"
          conversations={chats}
          current={open}
          onSelect={setOpen}
          loading={loading}
          empty={<EmptyState compact title="No chats yet" description="Start one with New chat." />}
          onRename={async (id, next) => {
            await wait(save);
            if (fail) throw new Error('offline');
            setChats((list) => list.map((c) => (c.id === id ? { ...c, title: next } : c)));
          }}
          actions={[{ label: 'Pin', icon: <PinIcon />, onSelect: (id) => setChats((list) => list.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c))) }]}
          onDelete={(id) => {
            const gone = chats.find((c) => c.id === id);
            setChats((list) => list.filter((c) => c.id !== id));
            if (open === id) setOpen(null);
            if (gone) toast.show({ title: `Deleted “${gone.title}”`, undo: () => setChats((list) => [...list, gone]) });
          }}
        />
      </Sidebar>
      <main className="grid flex-1 content-start gap-8 p-24">
        <p data-testid="open-chat" className="m-0 type-title text-ink">{title ?? 'No chat open'}</p>
        <p className="m-0 type-body text-ink2">The conversation opens here.</p>
      </main>
    </div>
  );
}

function Loading() {
  const [loading, setLoading] = React.useState(true);
  return (
    <div className="grid w-full justify-items-center gap-16">
      <Chats loading={loading} />
      <Button size="compact" onClick={() => setLoading((l) => !l)}>{loading ? 'Arrive' : 'Load again'}</Button>
    </div>
  );
}

/* CONVERSATION LIST TUNER: the page's DialKit panel. Loading on or off, how long a rename's save takes
 * and whether it fails, and a list with no chats at all. */
function Tuner() {
  const d = useDialKit('Conversation list', {
    loading: false,
    save: [600, 0, 3000, 50],
    fail: false,
    empty: false,
  });
  return (
    <div data-testid="conversation-list-tuner" className="flex w-full justify-center">
      <Chats loading={d.loading} save={d.save} fail={d.fail} none={d.empty} />
    </div>
  );
}

export default function ConversationListPage() {
  return (
    <ToastProvider>
      <ComponentPage
        capture="conversation-list"
        title="Conversation list"
        lede="Your past conversations beside the thread: grouped by day, the open one marked, renamed and deleted where they stand."
        play={{ lede: 'Choose a chat. Its More key renames it (the title saves for a moment), pins it, or deletes it: the row leaves, the list closes up, and Undo brings it back. New chat lands at the top of Today.', caption: 'choose · rename · pin · delete · new', wide: true, node: <div className="flex w-full justify-center"><Chats /></div> }}
        more={[
          { id: 'loading', title: 'Loading', lede: 'While the chats are on their way, skeleton lines stand where the rows will be; they fade in only after a beat, so a fast load never flashes them.', node: <Loading /> },
          { id: 'tune', title: 'Tune the list', lede: 'The Conversation list panel turns loading on, sets how long a rename takes to save and whether it fails, and empties the list.', node: <Tuner /> },
        ]}
        usage={`<Sidebar aria-label="Chats">
  <Sidebar.Header>
    <Button size="compact" icon={<PlusIcon />} onClick={newChat}>New chat</Button>
  </Sidebar.Header>
  <ConversationList
    aria-label="Chats"
    conversations={chats}       // { id, title, time, pinned? }[]
    current={open}
    onSelect={setOpen}
    onRename={(id, title) => save(id, { title })}
    onDelete={(id) => remove(id)} // offer Undo in a toast
    loading={!chats}
  />
</Sidebar>`}
        sources={[
          { id: 'react', label: 'React', code: reactSource },
          { id: 'css', label: 'CSS', code: cssSource },
          { id: 'swift', label: 'SwiftUI', code: swiftSource },
          { id: 'agent', label: 'Agent guide', code: agentSource },
        ]}
        rules={[
          { id: 'CL1', title: 'Grouped by when you last spoke', body: 'Today, Yesterday, the last week, the last month, then by month; pinned chats first.', origin: 'Ant Design X Conversations' },
          { id: 'CL2', title: 'Rename where it stands', body: 'QuickEdit in a popover by the row: off until changed, holds while it saves, says Renamed.', origin: 'Ours' },
          { id: 'CL3', title: 'Delete, then Undo', body: 'No dialog: the row leaves, the list closes up, and a toast offers Undo.', origin: 'Ours' },
          { id: 'CL4', title: 'The open chat is the current place', body: 'The sidebar\'s lifted highlight sits under it and glides to the next one chosen, as for any sidebar item.', origin: 'Ours' },
        ]}
      />
    </ToastProvider>
  );
}
