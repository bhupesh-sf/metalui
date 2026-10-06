import * as React from 'react';
import { useDialKit } from 'dialkit';
import { Button, Chip, CodeBlock, splitFences, type CodeDiagnostic, type CodeRange } from '@unlocalhosted/metalui';
import { type SpringName } from '../../../../../packages/metalui/src/motion/springs.generated';
import { SPRING_NAMES, springVars } from '../../ui/springTuning';
import reactSource from '../../../../../packages/metalui/src/components/code-block/code-block.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import swiftSource from '../../../../../swift/Sources/MetalUI/Components/MetalCodeBlock.swift?raw';
import agentSource from '../../../../../packages/metalui/src/components/code-block/code-block.agent.md?raw';
import { ComponentPage } from '../../ui/ComponentPage';

/* ─────────────────────────────────────────────────────────
 * CODE BLOCK PAGE · code to read, copy and point at
 *
 *   play      a file whose lines you pick by their numbers, then reference in a chat
 *   reply     an AI reply streaming: Markdown split at its fences, the code landing row by row
 *   change    a diff fence, and a unified patch with two gutters
 *   problem   a type error under its line, with "Fix with AI" that fixes it
 *   tune      DialKit: look, numbers, start, wrap, max lines, highlight, focus, the arrival spring
 * ───────────────────────────────────────────────────────── */

const POSTER = `import { print } from './press';

export interface Poster {
  size: 'A2' | 'A3';
  stock: "matte" | "gloss"; // not both
  weight: number;
}

export async function run(poster: Poster) {
  const copies = 120;
  await print(poster, { copies });
  return copies;
}`;

function Pick() {
  const [sent, setSent] = React.useState<CodeRange | null>(null);
  return (
    <div className="grid w-full max-w-[560px] gap-12">
      <CodeBlock code={POSTER} lang="ts" label="poster.ts" selectable onReference={setSent} />
      <div className="flex min-h-28 items-center gap-8 type-meta text-ink3" aria-live="polite">
        {sent ? <Chip>poster.ts · {sent.start === sent.end ? sent.start : `${sent.start}–${sent.end}`}</Chip> : 'Pick lines by their numbers, then reference them.'}
      </div>
    </div>
  );
}

const REPLY = `Pass the copies through instead of fixing them at 120:

\`\`\`ts
export async function run(poster: Poster, copies = 120) {
  await print(poster, { copies });
  return copies;
}
\`\`\`

Then call it with the run you need:

\`\`\`ts
await run(poster, 40);
\`\`\``;

/** Writes the reply a few characters a frame, only while it writes. */
function useWriter(text: string, perFrame: number) {
  const [n, setN] = React.useState(text.length);
  const writing = n < text.length;
  React.useEffect(() => {
    if (!writing) return;
    const t = setInterval(() => setN((k) => Math.min(text.length, k + perFrame)), 16);
    return () => clearInterval(t);
  }, [writing, text, perFrame]);
  return { shown: text.slice(0, n), writing, write: () => setN(0) };
}

function Reply({ perFrame = 3 }: { perFrame?: number }) {
  const { shown, writing, write } = useWriter(REPLY, perFrame);
  return (
    <div className="grid w-full max-w-[560px] gap-12">
      <div data-testid="reply" className="grid gap-10 rounded-plate p-16 material-stage">
        {splitFences(shown).map((part, i) =>
          part.kind === 'text'
            ? part.text.trim() && <p key={i} className="m-0 type-doc-prose text-ink">{part.text.trim()}</p>
            : <CodeBlock key={i} look="ghost" code={part.code} lang={part.lang} streaming={part.open && writing} maxLines={8} />,
        )}
      </div>
      <div><Button onClick={write} disabled={writing}>{writing ? 'Writing…' : 'Write the reply'}</Button></div>
    </div>
  );
}

const DIFF = `--- a/poster.ts
+++ b/poster.ts
-export async function run(poster: Poster) {
-  const copies = 120;
+export async function run(poster: Poster, copies = 120) {
   await print(poster, { copies });`;

const PATCH = `@@ -9,5 +9,4 @@ export interface Poster {
 export async function run(poster: Poster) {
-  const copies = 120;
+  const copies = poster.size === 'A2' ? 80 : 120;
   await print(poster, { copies });
-  return copies;
+  return { copies };
 }`;

function Change() {
  return (
    <div className="grid w-full max-w-[560px] gap-20">
      <CodeBlock code={DIFF} lang="diff" label="A diff fence" />
      <CodeBlock code={PATCH} lang="diff" label="poster.ts" numbers />
    </div>
  );
}

const BROKEN = `const poster: Poster = {
  size: 'A1',
  stock: 'matte',
  weight: 170,
};
await run(poster);`;
const FIXED = BROKEN.replace("'A1'", "'A2'");

function Problem() {
  const [fixed, setFixed] = React.useState(false);
  const diagnostics: CodeDiagnostic[] = fixed ? [] : [
    { line: 2, severity: 'error', message: `Type '"A1"' is not assignable to type '"A2" | "A3"'.`, action: { label: 'Fix with AI', onAction: () => setFixed(true) } },
    { line: 4, severity: 'warning', message: 'weight is unused by print().' },
    { line: 6, severity: 'note', message: 'run() prints 120 copies by default.' },
  ];
  return (
    <div className="grid w-full max-w-[560px] gap-12">
      <CodeBlock code={fixed ? FIXED : BROKEN} lang="ts" label="order.ts" numbers diagnostics={diagnostics} highlight={fixed ? [2] : undefined} />
      {fixed && <div><Button size="compact" onClick={() => setFixed(false)}>Break it again</Button></div>}
    </div>
  );
}

const LONG = `${POSTER}

// A long line wraps under its own start when wrap is on; otherwise the body scrolls sideways to show it all.
export const order = { poster: { size: 'A2', stock: 'matte', weight: 170 }, copies: 120, paper: 'Munken Pure', finish: 'uncoated' };

export function cost(copies: number) {
  return copies * 0.42;
}`;

/* TUNER: the page's DialKit panel. Look, numbers from a start line, wrap and a max height; a highlighted line and a
 * focused range; the spring a streamed row lands on. */
function Tuner() {
  const d = useDialKit('Code block', {
    look: { type: 'select', options: ['framed', 'ghost'], default: 'framed' },
    numbers: true,
    start: [1, 1, 400],
    wrap: false,
    maxLines: [12, 4, 24],
    highlight: true,
    focus: false,
    arrive: { type: 'select', options: SPRING_NAMES, default: 'settle' },
    slow: [1, 1, 10],
  });
  const s = Math.round(d.start);
  const vars = springVars('settle', d.arrive as SpringName, d.slow) as React.CSSProperties;
  return (
    <div data-testid="code-block-tuner" className="grid w-full max-w-[560px]" style={vars}>
      <CodeBlock
        code={LONG}
        lang="ts"
        label="poster.ts"
        look={d.look as 'framed' | 'ghost'}
        numbers={d.numbers}
        start={s}
        wrap={d.wrap}
        maxLines={Math.round(d.maxLines)}
        highlight={d.highlight ? [s + 9] : undefined}
        focus={d.focus ? [[s + 8, s + 12]] : undefined}
      />
    </div>
  );
}

export default function CodeBlockPage() {
  return (
    <ComponentPage
      capture="code-block"
      title="Code block"
      lede="Code to read and copy in the flow: on a docs page, in a README, in an AI reply. Pick lines by their numbers to point at them, see a change as a diff, see a problem under its line, and watch code arrive while a reply streams. The code card is the same code placed on the canvas."
      play={{ lede: 'Click a line number, ⇧-click another to pick a range (or Tab to the numbers and use ↑ ↓, Space and ⇧). The label names what you picked; Copy copies only those lines; the attach key references them.', caption: 'a file · lines picked by number', node: <Pick /> }}
      more={[
        { id: 'reply', title: 'In a reply', lede: 'An AI reply arrives as Markdown: splitFences cuts it at its fences, and a fence still open is a block still streaming. New rows fade up on the settle spring, a caret blinks after the last character, and copy waits until the code is done.', node: <div className="flex w-full justify-center"><Reply /></div> },
        { id: 'change', title: 'A change', lede: 'A diff fence: added lines on a green band with a green sign, removed on a red one. A unified patch with hunks and numbers shows two gutters, old and new, each blank where its side has no line.', node: <div className="flex w-full justify-center"><Change /></div> },
        { id: 'problem', title: 'A problem', lede: 'Diagnostics sit under their line: a lamp in the gutter (red for an error, amber for a warning, none for a note), the word, the message and one action. Fix with AI fixes it here.', node: <div className="flex w-full justify-center"><Problem /></div> },
        { id: 'tune', title: 'Tune it', lede: 'The Code block panel switches the look, the numbers and the line they start from, wraps long lines, stops the body at a number of lines, highlights a line and focuses a range (hover the block to bring the rest back), and swaps the spring a streamed row lands on.', node: <div className="flex w-full justify-center"><Tuner /></div> },
      ]}
      usage={`<CodeBlock code={source} lang="ts" label="poster.ts" numbers selectable onReference={addToChat} />

// Highlighted on the server (Shiki), split into rows here
<CodeBlock code={source} html={highlighted} />

// An AI reply while it streams
{splitFences(markdown).map((part) => part.kind === 'code'
  ? <CodeBlock look="ghost" code={part.code} lang={part.lang} streaming={part.open} />
  : <Markdown text={part.text} />)}`}
      sources={[
        { id: 'react', label: 'React', code: reactSource },
        { id: 'css', label: 'CSS', code: cssSource },
        { id: 'swift', label: 'SwiftUI', code: swiftSource },
        { id: 'agent', label: 'Agent guide', code: agentSource },
      ]}
      rules={[
        { id: 'CB1', title: 'Copy what you see', body: 'Copy takes the code as written, or only the picked lines; never the numbers, signs of a gutter, or the notes under a line. While a reply is still writing, copy waits.', origin: 'Ours' },
        { id: 'CB2', title: 'Point with the numbers', body: 'Lines are picked by their numbers, not by turning code into a list: the code stays text, and the system’s own selection still works across it.', origin: 'Ours' },
        { id: 'CB3', title: 'The host highlights', body: 'Pass html from Shiki or any highlighter; the block splits it into rows. Without it, a light tint in the colorway’s syntax inks. No highlighter ships in the package.', origin: 'Ours' },
        { id: 'CB4', title: 'A problem says its word', body: 'An error is a red lamp and the word Error, a warning amber and Warning, a note no lamp and Note. Colour is never the only cue.', origin: 'Library' },
      ]}
    />
  );
}
