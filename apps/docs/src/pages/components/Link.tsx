import * as React from 'react';
import { useDialKit } from 'dialkit';
import { Link } from '@unlocalhosted/metalui';
import { type SpringName } from '../../../../../packages/metalui/src/motion/springs.generated';
import { SPRING_NAMES, springVars } from '../../ui/springTuning';
import reactSource from '../../../../../packages/metalui/src/components/link/link.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import agentSource from '../../../../../packages/metalui/src/components/link/link.agent.md?raw';
import { ComponentPage } from '../../ui/ComponentPage';

/* ─────────────────────────────────────────────────────────
 * NUDGE TUNER: the page's DialKit panel
 *
 *   nudge    how far the external arrow moves toward where it goes
 *   spring   the spring it moves on
 *   rest     how strong the underline is at rest
 * ───────────────────────────────────────────────────────── */

function Paragraph({ label }: { label: string }) {
  return (
    <p className="m-0 max-w-[440px] type-lead text-ink" aria-label={label}>
      Export the region as a PDF, then read <Link href="#export">the export guide</Link> for paper sizes, or see how{' '}
      <Link href="https://www.w3.org/WAI/WCAG22/Understanding/use-of-color" external>links stay visible without colour</Link>.
    </p>
  );
}

function NudgeTuner() {
  const d = useDialKit('Link nudge', {
    nudge: [2, 0, 6],
    spring: { type: 'select', options: SPRING_NAMES, default: 'part' },
    rest: [0.3, 0, 1],
  });
  const vars = {
    ...springVars('part', d.spring as SpringName),
    '--mu-r-link-out-nudge': `${d.nudge}px`,
    '--mu-r-link-underline-ink': `color-mix(in srgb, currentColor ${Math.round(d.rest * 100)}%, transparent)`,
  } as React.CSSProperties;
  return <div data-testid="link-nudge-tuner" style={vars}><Paragraph label="Tuned paragraph" /></div>;
}

export default function LinkPage() {
  return (
    <ComponentPage
      title="Link"
      lede="An inline link in text. It is always underlined, so colour never carries it alone; hovered, the line darkens, and an external link's arrow nudges toward where it goes."
      play={{ lede: 'Hover the links, or Tab to them.', caption: 'in a sentence · external', node: <Paragraph label="Example paragraph" /> }}
      more={[{ id: 'nudge', title: 'Tune the nudge', lede: 'The Link nudge panel sets how far the external arrow moves, its spring, and how strong the underline is at rest.', node: <NudgeTuner /> }]}
      usage={`<p>
  Read <Link href="/guides/export">the export guide</Link>, or see{' '}
  <Link href="https://www.w3.org/WAI/" external>the accessibility notes</Link>.
</p>

// With a router: keep the look, use its link
<Link render={<RouterLink to="/guides/export" />}>the export guide</Link>`}
      sources={[
        { id: 'react', label: 'React', code: reactSource },
        { id: 'css', label: 'CSS', code: cssSource },
        { id: 'agent', label: 'Agent guide', code: agentSource },
      ]}
      rules={[
        { id: 'LK1', title: 'Always underlined', body: 'Colour alone never marks a link; the hairline is always there.', origin: 'WCAG 1.4.1' },
        { id: 'LK2', title: 'Say where it goes', body: '"the export guide", never "click here".', origin: 'Ours' },
        { id: 'LK3', title: 'Leaving is marked', body: 'External links carry the arrow and say they open a new tab.', origin: 'Ours' },
      ]}
    />
  );
}
