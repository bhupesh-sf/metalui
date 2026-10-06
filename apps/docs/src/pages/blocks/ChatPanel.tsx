import * as React from 'react';
import { useDialKit } from 'dialkit';
import { type SpringName } from '../../../../../packages/metalui/src/motion/springs.generated';
import { ChatPanel } from '../../blocks/chat-panel/chat-panel';
import source from '../../blocks/chat-panel/chat-panel.tsx?raw';
import { BlockPage } from '../../ui/BlockPage';
import { SPRING_NAMES, springVars } from '../../ui/springTuning';

/* ─────────────────────────────────────────────────────────
 * CHAT PANEL TUNER: the page's DialKit panel
 *
 *   mode     where the assistant opens: docked or floating
 *   land     the spring a sent message lands on
 *   slow     stretches spring time, to watch the popover rise and a message land
 * ───────────────────────────────────────────────────────── */

function Tuned() {
  const d = useDialKit('Chat panel', {
    mode: { type: 'select', options: ['docked', 'floating'], default: 'floating' },
    land: { type: 'select', options: SPRING_NAMES, default: 'object' },
    slow: [1, 1, 10],
  });
  const vars = springVars('object', d.land as SpringName, d.slow) as React.CSSProperties;
  return <div data-testid="chat-panel-tuner" className="w-full" style={vars}><ChatPanel mode={d.mode === 'docked' ? 'docked' : 'floating'} /></div>;
}

export default function ChatPanelPage() {
  return (
    <BlockPage
      title="Chat panel"
      lede="An assistant beside the work: the conversation docked as a column at the edge, or floating above a corner key. Replies keep their takes, a checkpoint takes the thread back, and the composer offers the end of your sentence."
      play={{
        lede: 'Ask about the tides. Retry a reply and move between its takes; type “Can you” and press Tab for the grey words; Restore the checkpoint. Float the assistant with the key in its header, and dock it again from the popover.',
        caption: 'live block · sample replies',
        node: <ChatPanel />,
      }}
      usage={{
        file: 'src/components/metalui/screens/chat-panel/chat-panel.tsx',
        code: `import { ChatPanel } from '@/components/metalui/screens/chat-panel/chat-panel';

export function Notes() {
  return <ChatPanel mode="docked" />;
}

// Replace REPLIES with your model in useConversation's send() and retry(); restore() should roll your
// agent back to the checkpoint's state. useSuggestion is where your completion request goes.`,
      }}
      registry="block-chat-panel"
      madeOf={[
        { label: 'Thread', to: '/components/thread' },
        { label: 'Message', to: '/components/message' },
        { label: 'Markdown', to: '/components/markdown' },
        { label: 'Branch picker', to: '/components/branch-picker' },
        { label: 'Message actions', to: '/components/message-actions' },
        { label: 'Prompt input', to: '/components/prompt-input' },
        { label: 'Textarea (ghost text)', to: '/components/textarea' },
        { label: 'Popover', to: '/components/popover' },
        { label: 'Icon button', to: '/components/icon-button' },
        { label: 'Button', to: '/components/button' },
      ]}
      more={[{ id: 'tune', title: 'Tune it', lede: 'The Chat panel panel opens it docked or floating, swaps the spring a message lands on, and stretches time.', node: <Tuned /> }]}
      source={source}
      rules={[
        { id: 'U1', title: 'An assistant beside the work', body: 'Notes, a document, a dashboard: the person keeps working and asks on the side.', origin: 'Use it for' },
        { id: 'N1', title: 'A chat app', body: 'When the conversation is the work, give it the page: a Sidebar of past chats (Conversation list) and the thread.', origin: 'Not for' },
        { id: 'D1', title: 'Docked, not modal', body: 'A column at the edge covers nothing and traps no focus: Tab goes from the work to the assistant and back. That is why it is not a Sheet.', origin: 'Decision' },
        { id: 'D2', title: 'Floating keeps the conversation', body: 'The popover closes on ⎋ or a press outside; the thread is the block’s, so it is all there when it opens again.', origin: 'Decision' },
        { id: 'D3', title: 'A checkpoint is a note with one action', body: 'A system message between rules with Restore; after it, the note says where the thread went back to.', origin: 'Decision' },
        { id: 'K1', title: 'Tab in the composer', body: 'With grey words showing, Tab takes them and ⎋ lets them go; otherwise Tab moves on as always.', origin: 'Keyboard' },
        { id: 'A1', title: 'Named places', body: 'The column is a complementary landmark named Assistant; the popover is named Assistant; the thread is a log.', origin: 'Accessibility' },
        { id: 'R1', title: 'It measures itself', body: 'Under 34rem the docked column takes the block’s width and the work steps aside until it is closed.', origin: 'Responsive' },
      ]}
    />
  );
}
