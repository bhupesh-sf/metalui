import * as React from 'react';
import { useDialKit } from 'dialkit';
import { type SpringName } from '../../../../../packages/metalui/src/motion/springs.generated';
import { AiComposer } from '../../blocks/ai-composer/ai-composer';
import source from '../../blocks/ai-composer/ai-composer.tsx?raw';
import { BlockPage } from '../../ui/BlockPage';
import { SPRING_NAMES, springVars } from '../../ui/springTuning';

/* ─────────────────────────────────────────────────────────
 * COMPOSER TUNER: the page's DialKit panel
 *
 *   land     the spring a sent message lands on
 *   pace     scales how fast words arrive (words a second)
 *   think    scales the wait before the first word
 *   slow     stretches spring time, to watch a message land
 * ───────────────────────────────────────────────────────── */

function Tuned() {
  const d = useDialKit('Composer', {
    land: { type: 'select', options: SPRING_NAMES, default: 'object' },
    pace: [1, 0.25, 3],
    think: [1, 0, 4],
    slow: [1, 1, 10],
  });
  const vars = springVars('object', d.land as SpringName, d.slow) as React.CSSProperties;
  return <div data-testid="composer-tuner" className="w-full" style={vars}><AiComposer pace={d.pace} think={d.think} /></div>;
}

export default function AiComposerPage() {
  return (
    <BlockPage
      title="AI composer"
      lede="A chat thread with a composer at its foot: write, attach files, pick a model and send; the reply streams in word by word, and you can stop it, copy it or ask for another take."
      play={{
        lede: 'Type and press ↩ (⇧↩ for a new line), attach a file with +, switch the model, and press Stop while a reply is writing. Scroll up during a reply to read back; Jump to latest brings you down again.',
        caption: 'live block · sample replies',
        node: <AiComposer />,
      }}
      usage={{
        file: 'src/blocks/ai-composer.tsx',
        code: `import { AiComposer } from '@/blocks/ai-composer';

export function Help() {
  return <AiComposer />;
}

// Replace REPLIES (the sample takes) with your model: in send(), start the request and append
// each chunk to the reply's words; stop() should also abort the request. MODELS lists the
// choices in the Select, with the pace the samples stream at.`,
      }}
      madeOf={[
        { label: 'Textarea', to: '/components/textarea' },
        { label: 'Attachment', to: '/components/attachment' },
        { label: 'Select', to: '/components/select' },
        { label: 'Button', to: '/components/button' },
        { label: 'Icon button', to: '/components/icon-button' },
        { label: 'Tooltip', to: '/components/tooltip' },
        { label: 'Scroll area', to: '/components/scroll-area' },
        { label: 'Skeleton', to: '/components/skeleton' },
        { label: 'LED', to: '/components/led' },
        { label: 'The drum', to: '/foundations/transitions' },
        { label: 'Icons (morph)', to: '/icons' },
      ]}
      more={[{ id: 'tune', title: 'Tune it', lede: 'The Composer panel swaps the spring a message lands on, scales the pace and the thinking time, and stretches time.', node: <Tuned /> }]}
      source={source}
      rules={[
        { id: 'U1', title: 'Talking to an assistant', body: 'A support helper, a writing assistant, a coding agent: anything that answers in prose, a little at a time.', origin: 'Use it for' },
        { id: 'U2', title: 'Asking with files', body: 'When the question comes with documents, images or logs to read.', origin: 'Use it for' },
        { id: 'N1', title: 'A search box', body: 'One line, instant results: that is a search field with a list, not a thread.', origin: 'Not for' },
        { id: 'N2', title: 'Chat between people', body: 'People do not stream word by word or get stopped; a thread of people needs names, avatars and read state.', origin: 'Not for' },
        { id: 'K1', title: '↩ and ⇧↩', body: 'In the message, ↩ sends and ⇧↩ starts a new line. While an input method is composing, ↩ is left to it.', origin: 'Keyboard' },
        { id: 'K2', title: '⎋', body: 'While a reply is writing, ⎋ in the message stops it, as Stop does.', origin: 'Keyboard' },
        { id: 'K3', title: 'Tab', body: 'Moves through the thread (it scrolls with the arrow keys), each reply\'s Copy and Retry, the files, attach, the model and Send.', origin: 'Keyboard' },
        { id: 'A1', title: 'The thread is a log', body: 'New messages are announced politely; a reply is busy while it writes, so it is read once, whole, not word by word.', origin: 'Accessibility' },
        { id: 'A2', title: 'Everything has a name', body: 'The composer is a named group, the message field is labelled, the icon-only attach key has a name and a tooltip, and each file\'s remove key says which file.', origin: 'Accessibility' },
        { id: 'A3', title: 'Waiting is said in words', body: 'The lamp that breathes while the model thinks sits beside "Thinking"; "Writing", "Stopped" follow.', origin: 'Accessibility' },
        { id: 'M1', title: 'The message lands', body: 'A sent message rises one nest onto the thread on the object spring; the send key morphs to a square and turns to Stop on the drum.', origin: 'Motion' },
        { id: 'M2', title: 'The reply itself waits', body: 'No spinner: the reply\'s own header breathes and one skeleton line holds the place of its first words.', origin: 'Motion' },
        { id: 'M3', title: 'The thread follows only when you are there', body: 'At the foot it follows the words; scrolled up it stays put and offers Jump to latest.', origin: 'Motion' },
        { id: 'M4', title: 'Reduce Motion', body: 'Nothing slides or lands; the reply arrives a phrase at a time without a caret; Jump to latest jumps.', origin: 'Motion' },
        { id: 'R1', title: 'It measures itself', body: 'The block is a container: under 28rem the gutters narrow, your messages may take the full width and the ⇧↩ hint steps aside.', origin: 'Responsive' },
      ]}
    />
  );
}
