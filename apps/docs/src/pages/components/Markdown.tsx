import * as React from 'react';
import { useDialKit } from 'dialkit';
import { Button, Markdown, Message } from '@unlocalhosted/metalui';
import reactSource from '../../../../../packages/metalui/src/components/markdown/markdown.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import swiftSource from '../../../../../swift/Sources/MetalUI/Components/MetalMarkdown.swift?raw';
import agentSource from '../../../../../packages/metalui/src/components/markdown/markdown.agent.md?raw';
import { ComponentPage } from '../../ui/ComponentPage';

/* ─────────────────────────────────────────────────────────
 * MARKDOWN PAGE · an answer's text, set as it arrives
 *
 *   play      Write the reply: chunks arrive in bursts (every 300 ms), Markdown paces them out a word
 *             at a time with the caret; a list, a table and a fence take form as they stream
 *   blocks    every block at rest: headings, lists nested, a quote, a table, inline marks, a fence
 *   held      a reply held mid-stream: the caret, a half-arrived bold already bold
 *   tune      DialKit: the pace, the burst size
 * ───────────────────────────────────────────────────────── */

const REPLY = `## Spring tokens, in short

Springs now ship **with their durations**, so tuning a curve retimes every component that uses it.

- Components read \`--mu-spring-settle-d\` beside the curve
- Reduce Motion sets every *travel* to zero
  - labels still change
  - nothing slides

| Spring | Duration | Overshoot |
|:--|--:|:-:|
| settle | 440 ms | none |
| object | 620 ms | small |

\`\`\`ts
el.animate(frames, { duration: springOf(el, 'settle').ms });
\`\`\`

Read more in the [motion notes](#blocks).`;

const BLOCKS = `# Release notes

### What changed

1. Durations travel with their springs
2. Hard-coded times can go:
   - replace them with the token
   - or delete them

> Nothing to change in your code unless you wrote a duration next to a spring.

---

Inline: **bold**, *italic*, ~~struck~~, \`code\`, and [a link](https://metalui.dev). A link to anything but the web, mail or this site stays text: [run](javascript:run).

| Token | Use |
|---|---|
| \`--mu-spring-settle\` | most things that come to rest |
| \`--mu-spring-object\` | things with a body |

\`\`\`swift
withMetalAnimation(.settle) { open.toggle() }
\`\`\``;

/** Arrives in bursts, like a network stream: `burst` words every 300 ms. */
function useBursts(text: string, burst: number) {
  const words = React.useMemo(() => text.split(/(?<=\s)/), [text]);
  const [n, setN] = React.useState(words.length);
  const streaming = n < words.length;
  React.useEffect(() => {
    if (!streaming) return;
    const t = window.setTimeout(() => setN((k) => Math.min(words.length, k + burst)), 300);
    return () => window.clearTimeout(t);
  }, [streaming, n, burst, words.length]);
  return { arrived: words.slice(0, n).join(''), streaming, start: () => setN(0) };
}

function Stream({ pace = 30, burst = 6 }: { pace?: number; burst?: number }) {
  const { arrived, streaming, start } = useBursts(REPLY, burst);
  return (
    <div className="grid w-full max-w-[560px] gap-16">
      <Message from="assistant" model="Fast" status={streaming ? 'writing' : 'done'}>
        <Markdown streaming={streaming} pace={pace}>{arrived}</Markdown>
      </Message>
      <div><Button onClick={start} disabled={streaming}>Write the reply</Button></div>
    </div>
  );
}

/* MARKDOWN TUNER: the page's DialKit panel. The pace (words a second) Markdown reveals at, the size of the
 * bursts the stream arrives in. */
function Tuner() {
  const d = useDialKit('Markdown', {
    pace: [30, 4, 80],
    burst: [6, 1, 40],
  });
  return (
    <div data-testid="markdown-tuner" className="grid w-full max-w-[560px] gap-16 justify-self-center">
      <Stream pace={d.pace} burst={d.burst} />
    </div>
  );
}

export default function MarkdownPage() {
  return (
    <ComponentPage
      capture="markdown"
      title="Markdown"
      lede="An answer's text, set as it arrives: headings, lists, tables and quotes as it streams, every fence in a code block, a caret after the last word."
      play={{ lede: 'Write the reply: it arrives in bursts, and Markdown paces the words out with a caret. The list, the table and the code take form as they stream.', caption: 'a reply streaming', wide: true, node: <div className="flex w-full justify-center"><Stream /></div> }}
      more={[
        { id: 'blocks', title: 'Every block', lede: 'Headings, nested lists, a quote, a rule, inline marks, a table and a fence, at rest.', node: <div className="flex w-full justify-center"><div className="w-full max-w-[560px]"><Markdown>{BLOCKS}</Markdown></div></div> },
        { id: 'held', title: 'Mid-stream', lede: 'Held while it writes: the caret after the last word, and a bold that has only begun to arrive already reads bold.', node: <div className="flex w-full justify-center"><div className="w-full max-w-[560px]"><Markdown streaming>{'The release note is nearly done, and the last line is **half bold'}</Markdown></div></div> },
        { id: 'tune', title: 'Tune the stream', lede: 'The Markdown panel sets the pace words are revealed at and the size of the bursts they arrive in.', node: <Tuner /> },
      ]}
      usage={`<Message from="assistant" status={done ? 'done' : 'writing'}>
  <Markdown streaming={!done} pace={30}>{arrived}</Markdown>
</Message>`}
      sources={[
        { id: 'react', label: 'React', code: reactSource },
        { id: 'css', label: 'CSS', code: cssSource },
        { id: 'swift', label: 'SwiftUI', code: swiftSource },
        { id: 'agent', label: 'Agent guide', code: agentSource },
      ]}
      rules={[
        { id: 'MD1', title: 'Never HTML from the source', body: 'Markdown is turned into real elements; what isn\'t understood is shown as text, and only web, mail and relative links become links.', origin: 'Ours' },
        { id: 'MD2', title: 'Pace what arrived, never invent a wait', body: 'The pace smooths bursts while a reply streams. When it ends, everything that arrived shows at once.', origin: 'Ours' },
        { id: 'MD3', title: 'Code goes to the code block', body: 'A fence is a Code block, streaming while it is open, with its own caret and copy.', origin: 'Ours' },
      ]}
    />
  );
}
