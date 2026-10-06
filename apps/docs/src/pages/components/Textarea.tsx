import * as React from 'react';
import { useDialKit } from 'dialkit';
import { Field, Textarea } from '@unlocalhosted/metalui';
import { type SpringName } from '../../../../../packages/metalui/src/motion/springs.generated';
import { SPRING_NAMES, springVars } from '../../ui/springTuning';
import reactSource from '../../../../../packages/metalui/src/components/textarea/textarea.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import agentSource from '../../../../../packages/metalui/src/components/textarea/textarea.agent.md?raw';
import { ComponentPage } from '../../ui/ComponentPage';

/* ─────────────────────────────────────────────────────────
 * GROWTH TUNER: the page's DialKit panel
 *
 *   add line  the well grows one line on the grow spring
 *   clear     it shrinks back to min rows on the same spring
 *   refuse    a write past the limit: only the counter shakes
 * Springs are the system's classes; slow stretches every duration.
 * ───────────────────────────────────────────────────────── */

/** Regular and compact, each under a field of its size: the text and the inset line up. */
function Sizes() {
  return (
    <div className="grid w-full max-w-[640px] grid-cols-2 gap-20 max-sm:grid-cols-1">
      {(['regular', 'compact'] as const).map((size) => (
        <div key={size} className="grid content-start gap-8">
          <Field size={size}><Field.Input aria-label={`Name, ${size}`} defaultValue="Rui Almeida" /></Field>
          <Textarea size={size} aria-label={`Bio, ${size}`} defaultValue="Prints, plans and the odd poster." minRows={2} maxLength={160} countFrom={0} />
        </div>
      ))}
    </div>
  );
}

const LINES = ['Pick up the prints on Thursday.', 'Ask about the matte paper.', 'Two copies of the plan, one folded.', 'Bring the old negatives back.'];

function GrowthTuner() {
  const [text, setText] = React.useState(LINES[0]);
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const d = useDialKit('Textarea growth', {
    grow: { type: 'select', options: SPRING_NAMES, default: 'settle' },
    refusal: { type: 'select', options: SPRING_NAMES, default: 'refusal' },
    slow: [1, 1, 10],
    minRows: [3, 1, 6],
    maxRows: [8, 3, 14],
    limit: [160, 40, 400],
    addLine: { type: 'action', label: 'Add a line' },
    clear: { type: 'action', label: 'Clear' },
    refuse: { type: 'action', label: 'Write past the limit' },
  }, {
    onAction: (action) => {
      if (action === 'addLine') setText((t) => (t ? `${t}\n` : '') + LINES[t.split('\n').length % LINES.length]);
      if (action === 'clear') setText('');
      if (action === 'refuse') {
        setText((t) => t.padEnd(d.limit, '.').slice(0, d.limit));
        requestAnimationFrame(() => ref.current?.dispatchEvent(new KeyboardEvent('keydown', { key: 'x', bubbles: true, cancelable: true })));
      }
    },
  });
  const grow = d.grow as SpringName;
  const refusal = d.refusal as SpringName;
  const vars = {
    ...springVars('settle', grow, d.slow),
    ...springVars('refusal', refusal, d.slow),
  } as React.CSSProperties;
  return (
    <div data-testid="textarea-growth-tuner" className="w-full max-w-[420px]" style={vars}>
      <Textarea ref={ref} aria-label="Tuned note" value={text} onChange={(e) => setText(e.target.value)} minRows={d.minRows} maxRows={d.maxRows} maxLength={d.limit} />
    </div>
  );
}

export default function TextareaPage() {
  const [note, setNote] = React.useState('');
  return (
    <ComponentPage
      title="Textarea"
      lede="Several lines of text in a well that grows with what you write. Each new line settles the well one line taller; near a limit a counter appears, and writing past it shakes only the counter."
      play={{ lede: 'Write a few lines, then keep going past the limit.', caption: 'grows · limit 120 · invalid · disabled', node: (
        <div className="grid w-full max-w-[440px] gap-20">
          <Textarea aria-label="Note" placeholder="Write a note…" value={note} onChange={(e) => setNote(e.target.value)} maxLength={120} />
          <Textarea aria-label="Invalid note" invalid defaultValue="This needs a date." minRows={2} />
          <Textarea aria-label="Disabled note" disabled defaultValue="Read only for now." minRows={2} />
        </div>
      ) }}
      more={[{ id: 'sizes', title: 'Beside fields', lede: 'Field’s sizes: regular and compact write in the ui role at the field’s padding and radius, so a bio sits level with name and email. Here the counter shows from the start (countFrom 0).', node: <Sizes /> }, { id: 'growth', title: 'Tune the growth', lede: 'The Textarea growth panel swaps the grow and refusal springs, changes the rows and the limit, and stretches time. Add lines and watch the well settle; write past the limit and only the counter answers.', node: <GrowthTuner /> }]}
      usage={`<Textarea aria-label="Note" placeholder="Write a note…" maxLength={280} />`}
      sources={[
        { id: 'react', label: 'React', code: reactSource },
        { id: 'css', label: 'CSS', code: cssSource },
        { id: 'agent', label: 'Agent guide', code: agentSource },
      ]}
      rules={[
        { id: 'TA1', title: 'The well grows, the page does not jump', body: 'Height follows the text on the settle spring: growing to new content, with no overshoot.', origin: 'Ours' },
        { id: 'TA2', title: 'A refusal is local', body: 'Past the limit only the counter shakes; the text is never trimmed or changed.', origin: 'Ours' },
        { id: 'TA3', title: 'Count only near the end', body: 'The counter appears at 80 % of the limit, where it starts to matter. A form that states its limit up front shows it from the start (countFrom 0).', origin: 'Ours' },
        { id: 'TA4', title: 'Same size as the fields beside it', body: 'In a form of regular or compact fields, the textarea takes that size: one type role and one inset down the column.', origin: 'Ours' },
      ]}
    />
  );
}
